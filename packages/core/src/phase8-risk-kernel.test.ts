import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { initProject } from './config/init-project.js';
import type { CodingRiskSignal } from './risk.js';
import { evaluateLifecycleRiskDecision, evaluateLifecycleRiskDecisionForModel, evaluateLifecycleRiskDecisionFromProfile, inspectLifecycleRiskDecisionForModel, LIFECYCLE_RISK_DECISION_PROJECTION_TYPE, LIFECYCLE_RISK_POLICY_VERSION, lifecycleRiskDecisionScopeKey, recordLifecycleRiskDecisionProjection, readLifecycleRiskDecisionProjection, taskRiskProfileToCodingRiskProfile } from './risk.js';
import { buildTaskRiskProfile } from './task-risk-profile.js';
import type { SddTask, SddTaskModel } from './sdd-docs/task-parser.js';
import { recordRuntimeProjectionEnvelope } from './storage/runtime-store.js';

const scope = { branch: 'master', taskId: 'PHASE8-3' };

test('lifecycle risk kernel allows direct for low-risk known work', () => {
  const decision = evaluateLifecycleRiskDecision({
    scope,
    signals: [signal('workflow', 'low', 'high')],
    factSet: knownFacts(),
    generatedAt: '2026-05-01T00:00:00.000Z'
  });

  assert.equal(decision.profile, 'direct');
  assert.deepEqual(decision.requiredStages, ['do', 'test']);
  assert.equal(decision.approvalPolicy, 'auto-allow');
  assert.equal(decision.humanCheckpointRequired, false);
  assert.equal(decision.requiredEvidence.length, 1);
  assert.equal(Object.hasOwn(decision, 'agent'), false);
  assert.equal(Object.hasOwn(decision, 'subagent'), false);
});

test('lifecycle risk kernel selects compact for bounded context and evidence signals', () => {
  const decision = evaluateLifecycleRiskDecision({
    scope,
    signals: [signal('context', 'medium', 'medium'), signal('evidence', 'low', 'high')],
    factSet: knownFacts()
  });

  assert.equal(decision.profile, 'compact');
  assert.deepEqual(decision.requiredStages, ['tasks', 'verifies', 'do', 'test', 'goal-verify', 'sync-back']);
  assert.equal(decision.approvalPolicy, 'review-required');
  assert.equal(decision.requiredReviews.some((review) => review.kind === 'evidence'), true);
});

test('lifecycle risk kernel selects full for source runtime and security risks', () => {
  const profile = taskRiskProfileToCodingRiskProfile(buildTaskRiskProfile({
    id: 'PHASE8-3',
    risk: ['security'],
    affectedFiles: ['packages/core/src/risk/kernel.ts', '.sdd/runtime.sqlite']
  }), scope, '2026-05-01T00:00:00.000Z');
  const decision = evaluateLifecycleRiskDecisionFromProfile(profile, knownFacts(), '2026-05-01T00:00:00.000Z');

  assert.equal(decision.profile, 'full');
  assert.deepEqual(decision.requiredStages, ['spec', 'plan', 'tasks', 'verifies', 'do', 'test', 'goal-verify', 'sync-back']);
  assert.equal(decision.requiredReviews.some((review) => review.kind === 'source-boundary'), true);
  assert.equal(decision.requiredReviews.some((review) => review.kind === 'runtime-state'), true);
  assert.equal(decision.requiredReviews.some((review) => review.kind === 'security'), true);
  assert.equal(decision.approvalPolicy, 'human-required');
});

test('lifecycle risk kernel selects research for low-confidence external impact', () => {
  const decision = evaluateLifecycleRiskDecision({
    scope,
    signals: [signal('external', 'high', 'low')],
    factSet: knownFacts()
  });

  assert.equal(decision.profile, 'research');
  assert.deepEqual(decision.requiredStages, ['spec', 'plan', 'verifies']);
  assert.equal(decision.requiredEvidence.length, 0);
  assert.equal(decision.humanCheckpointRequired, true);
  assert.equal(decision.approvalPolicy, 'human-required');
});

test('lifecycle risk kernel blocks unknown intent or blocked signals first', () => {
  const unknownIntent = evaluateLifecycleRiskDecision({
    scope,
    signals: [signal('workflow', 'low', 'high')],
    factSet: {
      request: { intentKnown: false, acceptanceKnown: true, validationKnown: true },
      documents: { specExists: false, planExists: false, tasksExists: false, verifiesExists: false }
    }
  });
  const blockedSignal = evaluateLifecycleRiskDecision({
    scope,
    signals: [signal('security', 'blocked', 'high'), signal('source', 'high', 'high')],
    factSet: knownFacts()
  });

  assert.equal(unknownIntent.profile, 'blocked');
  assert.deepEqual(unknownIntent.requiredStages, []);
  assert.deepEqual(unknownIntent.blockedStages, ['spec', 'plan', 'tasks', 'verifies', 'do', 'test', 'goal-verify', 'sync-back', 'ship']);
  assert.equal(unknownIntent.approvalPolicy, 'blocked');
  assert.equal(blockedSignal.profile, 'blocked');
  assert.equal(blockedSignal.approvalPolicy, 'blocked');
});

test('lifecycle risk decision projection can be written and read', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase8-risk-kernel-'));
  try {
    await initProject(root);
    const decision = evaluateLifecycleRiskDecision({
      scope,
      signals: [signal('source', 'high', 'high')],
      factSet: knownFacts(),
      inputHash: 'risk-input-a',
      generatedAt: '2026-05-01T00:00:00.000Z'
    });
    const write = await recordLifecycleRiskDecisionProjection(root, decision);
    const restored = await readLifecycleRiskDecisionProjection(root, scope);

    assert.equal(write.status, 'created');
    assert.equal(restored?.projectionType, 'phase8_lifecycle_risk_decision');
    assert.equal(restored?.payload.profile, 'full');
    assert.equal(restored?.payload.inputHash, 'risk-input-a');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('lifecycle risk consumer diagnostic reports missing projections', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase8-risk-diagnostic-missing-'));
  try {
    await initProject(root);
    const diagnostic = await inspectLifecycleRiskDecisionForModel(root, 'master', taskModel());

    assert.equal(diagnostic.status, 'missing');
    assert.equal(diagnostic.profile, null);
    assert.equal(diagnostic.producerVersion, null);
    assert.equal(diagnostic.expectedProducerVersion, LIFECYCLE_RISK_POLICY_VERSION);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('lifecycle risk consumer diagnostic reports stale projections', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase8-risk-diagnostic-stale-'));
  try {
    await initProject(root);
    const model = taskModel();
    const decision = {
      ...evaluateLifecycleRiskDecisionForModel('master', model),
      inputHash: 'old-risk-input'
    };
    await recordLifecycleRiskDecisionProjection(root, decision);
    const diagnostic = await inspectLifecycleRiskDecisionForModel(root, 'master', model);

    assert.equal(diagnostic.status, 'stale');
    assert.equal(diagnostic.inputHash, 'old-risk-input');
    assert.notEqual(diagnostic.inputHash, diagnostic.expectedInputHash);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('lifecycle risk consumer diagnostic reports blocked fresh projections', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase8-risk-diagnostic-blocked-'));
  try {
    await initProject(root);
    const model = taskModel({ specExists: false, tasks: [] });
    const decision = evaluateLifecycleRiskDecisionForModel('master', model);
    await recordLifecycleRiskDecisionProjection(root, decision);
    const diagnostic = await inspectLifecycleRiskDecisionForModel(root, 'master', model);

    assert.equal(diagnostic.status, 'blocked');
    assert.equal(diagnostic.profile, 'blocked');
    assert.equal(diagnostic.approvalPolicy, 'blocked');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('lifecycle risk consumer diagnostic reports incompatible producer versions', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase8-risk-diagnostic-incompatible-'));
  try {
    await initProject(root);
    const model = taskModel();
    const decision = evaluateLifecycleRiskDecisionForModel('master', model);
    await recordRuntimeProjectionEnvelope(root, {
      projectionType: LIFECYCLE_RISK_DECISION_PROJECTION_TYPE,
      scopeKey: lifecycleRiskDecisionScopeKey(decision.scope),
      inputHash: decision.inputHash,
      producer: 'phase8-risk-kernel',
      producerVersion: 'phase8-risk-kernel-v0',
      payload: {
        ...decision,
        policyVersion: 'phase8-risk-kernel-v0'
      },
      generatedAt: '2026-05-01T00:00:00.000Z'
    });
    const diagnostic = await inspectLifecycleRiskDecisionForModel(root, 'master', model);

    assert.equal(diagnostic.status, 'incompatible');
    assert.equal(diagnostic.producerVersion, 'phase8-risk-kernel-v0');
    assert.equal(diagnostic.expectedProducerVersion, LIFECYCLE_RISK_POLICY_VERSION);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function signal(dimension: CodingRiskSignal['dimension'], level: CodingRiskSignal['level'], confidence: CodingRiskSignal['confidence']): CodingRiskSignal {
  return {
    id: `test:${dimension}:${level}:${confidence}`,
    dimension,
    level,
    scope,
    confidence,
    inputRefs: [{ kind: 'task', ref: 'PHASE8-3' }],
    reasons: [`${dimension} ${level} test signal`]
  };
}

function knownFacts() {
  return {
    request: { intentKnown: true, acceptanceKnown: true, validationKnown: true },
    documents: { specExists: true, planExists: true, tasksExists: true, verifiesExists: false }
  };
}

function taskModel(options: { specExists?: boolean; tasks?: SddTask[] } = {}): SddTaskModel {
  const tasks = options.tasks ?? [task()];
  const specExists = options.specExists ?? true;
  return {
    branch: 'master',
    specPath: 'specs/master/spec.md',
    planPath: 'specs/master/plan.md',
    tasksPath: 'specs/master/tasks.md',
    verifyPath: 'specs/master/verify.md',
    documents: {
      specExists,
      planExists: true,
      tasksExists: tasks.length > 0,
      verifyExists: true
    },
    tasks,
    gaps: []
  };
}

function task(): SddTask {
  return {
    id: 'PHASE8-4',
    title: 'Integrate lifecycle risk diagnostics',
    status: 'pending',
    wave: null,
    dependsOn: [],
    affectedFiles: ['packages/core/src/status/project-status.ts'],
    validation: ['npm test'],
    validationCommands: [],
    risk: [],
    acceptanceRefs: [],
    planRefs: [],
    fileOwnership: [],
    agentFit: [],
    verificationAvailability: [],
    autonomy: null,
    allowedAgents: [],
    requiredArtifacts: [],
    gapState: null,
    boundary: null,
    acceptance: [],
    implementationNotes: null,
    rawMetadata: {},
    source: {
      filePath: 'specs/master/tasks.md',
      heading: null,
      lineStart: 1,
      lineEnd: 1
    }
  };
}
