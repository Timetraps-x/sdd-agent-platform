import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import test from 'node:test';

import { STAGE_RUN_CONTRACT_VERSION, WORKFLOW_HANDOFF_CONTRACT_VERSION, LIFECYCLE_RISK_DECISION_CONTRACT_VERSION, type RuntimeRef, type RuntimeScope } from '../contracts.js';
import { initProject } from '../config/init-project.js';
import type { LifecycleRiskDecision } from '../risk.js';
import { recordRuntimeProjectionEnvelope } from '../storage/runtime-store.js';
import type { StageRun, WorkflowHandoff } from './contracts.js';
import { canTransitionStageRun, canTransitionWorkflowHandoff, inspectWorkflowStageHandoff, recordStageRunProjection, recordWorkflowHandoffProjection, readStageRunProjection, readWorkflowHandoffProjection, STAGE_RUNTIME_PRODUCER_VERSION, transitionStageRun, validateStageRun, validateWorkflowHandoff, WORKFLOW_HANDOFF_PROJECTION_TYPE, workflowHandoffScopeKey } from './runtime.js';

const scope: RuntimeScope = { branch: 'master', taskId: 'PHASE8-6', runId: 'run-1' };
const projectionRef: RuntimeRef = { kind: 'projection', ref: 'phase8_lifecycle_risk_decision:master:PHASE8-6:run-1:none' };
const artifactRef: RuntimeRef = { kind: 'artifact', ref: 'artifacts/phase8-stage-handoff-review.md' };
const evidenceRef: RuntimeRef = { kind: 'evidence', ref: 'artifacts/phase8-stage-handoff-validation.md#AC-7' };

async function removeTempRoot(root: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(root, { recursive: true, force: true });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EBUSY' || attempt === 4) {
        throw error;
      }
      await setTimeout(100);
    }
  }
}

test('stage run state machine allows legal transitions and rejects terminal reopen', () => {
  const active = stageRun('active');
  const completed = transitionStageRun(active, 'completed', { updatedAt: '2026-05-18T00:01:00.000Z', outputRefs: [artifactRef] });
  const reopened = transitionStageRun(completed.stageRun, 'active');

  assert.equal(canTransitionStageRun('active', 'completed'), true);
  assert.equal(completed.valid, true);
  assert.equal(completed.stageRun.status, 'completed');
  assert.deepEqual(completed.stageRun.outputRefs, [artifactRef]);
  assert.equal(canTransitionStageRun('completed', 'active'), false);
  assert.equal(reopened.valid, false);
  assert.match(reopened.issues[0], /Illegal stage transition/);
});

test('stage validation rejects subagent lifecycle owners', () => {
  const result = validateStageRun({ ...stageRun('active'), ownerAgent: 'review-subagent' });

  assert.equal(result.valid, false);
  assert.match(result.issues[0], /subagents cannot own lifecycle stages/);
});

test('workflow handoff validation considers source stage risk refs evidence and blockers', () => {
  const valid = validateWorkflowHandoff({
    handoff: handoff('proposed'),
    sourceStageRun: stageRun('completed'),
    lifecycleRiskDecision: riskDecision('compact', 'review-required')
  });
  const blocked = validateWorkflowHandoff({
    handoff: { ...handoff('proposed'), evidenceRefs: [], openQuestions: ['Need acceptance owner.'] },
    sourceStageRun: stageRun('active'),
    lifecycleRiskDecision: riskDecision('blocked', 'blocked')
  });

  assert.equal(valid.valid, true);
  assert.equal(valid.recommendedStatus, 'proposed');
  assert.equal(valid.considered.sourceStageStatus, 'completed');
  assert.equal(blocked.valid, false);
  assert.equal(blocked.recommendedStatus, 'blocked');
  assert.equal(blocked.issues.some((issue) => /only completed or skipped/.test(issue)), true);
  assert.equal(blocked.issues.some((issue) => /Lifecycle risk decision blocks/.test(issue)), true);
  assert.equal(blocked.issues.some((issue) => /no evidence refs/.test(issue)), true);
});

test('workflow handoff state machine accepts proposed handoff and rejects terminal mutation', () => {
  const accepted = canTransitionWorkflowHandoff('proposed', 'accepted');
  const terminal = canTransitionWorkflowHandoff('accepted', 'blocked');

  assert.equal(accepted, true);
  assert.equal(terminal, false);
});

test('stage run and workflow handoff projections can be written read and inspected', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-stage-runtime-'));
  try {
    await initProject(root);
    const stage = stageRun('completed');
    const flow = handoff('accepted');

    const stageWrite = await recordStageRunProjection(root, stage);
    const handoffWrite = await recordWorkflowHandoffProjection(root, flow);
    const restoredStage = await readStageRunProjection(root, scope, 'do');
    const restoredHandoff = await readWorkflowHandoffProjection(root, scope, 'do', 'test');
    const diagnostic = await inspectWorkflowStageHandoff(root, 'master');

    assert.equal(stageWrite.status, 'created');
    assert.equal(handoffWrite.status, 'created');
    assert.equal(restoredStage?.payload.status, 'completed');
    assert.equal(restoredHandoff?.payload.status, 'accepted');
    assert.equal(diagnostic.status, 'fresh');
    assert.equal(diagnostic.latestStageRun?.stage, 'do');
    assert.equal(diagnostic.latestHandoff?.toStage, 'test');
  } finally {
    await removeTempRoot(root);
  }
});

test('workflow handoff diagnostics report blocked rejected and stale projections', async () => {
  const blockedRoot = await mkdtemp(path.join(tmpdir(), 'sdd-stage-runtime-blocked-'));
  const rejectedRoot = await mkdtemp(path.join(tmpdir(), 'sdd-stage-runtime-rejected-'));
  const staleRoot = await mkdtemp(path.join(tmpdir(), 'sdd-stage-runtime-stale-'));
  try {
    await initProject(blockedRoot);
    await recordStageRunProjection(blockedRoot, stageRun('blocked'));
    await recordWorkflowHandoffProjection(blockedRoot, { ...handoff('blocked'), blockingGaps: ['Acceptance evidence missing.'] });
    const blocked = await inspectWorkflowStageHandoff(blockedRoot, 'master');

    await initProject(rejectedRoot);
    await recordStageRunProjection(rejectedRoot, stageRun('completed'));
    await recordWorkflowHandoffProjection(rejectedRoot, handoff('rejected'));
    const rejected = await inspectWorkflowStageHandoff(rejectedRoot, 'master');

    await initProject(staleRoot);
    const staleHandoff = handoff('accepted');
    await recordRuntimeProjectionEnvelope(staleRoot, {
      projectionType: WORKFLOW_HANDOFF_PROJECTION_TYPE,
      scopeKey: workflowHandoffScopeKey(staleHandoff.scope, staleHandoff.fromStage, staleHandoff.toStage),
      inputHash: 'old-handoff-input',
      producer: 'phase8-stage-runtime',
      producerVersion: STAGE_RUNTIME_PRODUCER_VERSION,
      payload: staleHandoff,
      generatedAt: staleHandoff.decidedAt
    });
    const stale = await inspectWorkflowStageHandoff(staleRoot, 'master');

    assert.equal(blocked.status, 'blocked');
    assert.equal(rejected.status, 'rejected');
    assert.equal(stale.status, 'stale');
  } finally {
    await Promise.all([removeTempRoot(blockedRoot), removeTempRoot(rejectedRoot), removeTempRoot(staleRoot)]);
  }
});

function stageRun(status: StageRun['status']): StageRun {
  return {
    contract: STAGE_RUN_CONTRACT_VERSION,
    id: `stage-${status}`,
    scope,
    stage: 'do',
    ownerAgent: 'implementer',
    coMainAgents: ['reviewer'],
    status,
    inputRefs: [projectionRef],
    outputRefs: status === 'completed' ? [artifactRef] : [],
    decisionRefs: [projectionRef],
    blockingReasons: status === 'blocked' ? ['Waiting on acceptance evidence.'] : [],
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: `2026-05-18T00:0${statusOrder(status)}:00.000Z`
  };
}

function handoff(status: WorkflowHandoff['status']): WorkflowHandoff {
  return {
    contract: WORKFLOW_HANDOFF_CONTRACT_VERSION,
    id: `handoff-${status}`,
    scope,
    fromStage: 'do',
    toStage: 'test',
    fromAgent: 'implementer',
    toAgent: 'validator',
    status,
    outputRefs: [artifactRef],
    requiredInputRefs: [projectionRef],
    riskDecisionRef: projectionRef,
    evidenceRefs: [evidenceRef],
    openQuestions: [],
    blockingGaps: status === 'blocked' ? ['Acceptance evidence missing.'] : [],
    createdAt: '2026-05-18T00:10:00.000Z',
    decidedAt: status === 'proposed' ? undefined : '2026-05-18T00:11:00.000Z'
  };
}

function riskDecision(profile: LifecycleRiskDecision['profile'], approvalPolicy: LifecycleRiskDecision['approvalPolicy']): LifecycleRiskDecision {
  return {
    contract: LIFECYCLE_RISK_DECISION_CONTRACT_VERSION,
    scope,
    profile,
    requiredStages: profile === 'blocked' ? [] : ['do', 'test'],
    skippedStages: [],
    blockedStages: profile === 'blocked' ? ['spec', 'plan', 'tasks', 'verifies', 'do', 'test', 'sync-back', 'ship'] : [],
    requiredEvidence: [],
    requiredReviews: [],
    humanCheckpointRequired: approvalPolicy !== 'auto-allow',
    approvalPolicy,
    inputRefs: [projectionRef],
    signalRefs: [],
    policyVersion: 'phase8-risk-kernel-v1',
    inputHash: 'risk-input',
    confidence: profile === 'blocked' ? 'low' : 'high',
    reasons: [],
    generatedAt: '2026-05-18T00:00:00.000Z'
  };
}

function statusOrder(status: StageRun['status']): number {
  return ['pending', 'active', 'completed', 'blocked', 'skipped', 'failed'].indexOf(status) + 1;
}
