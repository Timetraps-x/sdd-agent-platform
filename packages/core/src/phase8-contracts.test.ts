import assert from 'node:assert/strict';
import test from 'node:test';
import { CODING_FACT_SET_CONTRACT_VERSION, LIFECYCLE_RISK_DECISION_CONTRACT_VERSION, MODEL_PRODUCED_ARTIFACT_CONTRACT_VERSION, RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION, type ModelProducedArtifact, type RuntimeProjectionEnvelope } from './contracts.js';
import type { CodingFactSet } from './coding-facts.js';
import type { LifecycleRiskDecision } from './risk.js';
import type { StageRun, WorkflowHandoff } from './stage-runtime.js';
import type { WorkUnit } from './work-units.js';
import type { SubagentDefinition, SubagentResult } from './subagents.js';
import type { ContextLoadSignal, ContextOffloadDecision } from './context-offload.js';
import type { UnifiedTestEvidenceRun } from './evidence-runtime.js';

const scope = { branch: 'master', taskId: 'PHASE8-1', runId: 'run-1' };
const now = '2026-05-16T00:00:00.000Z';
const projectionRef = { kind: 'projection' as const, ref: 'lifecycle-risk-decision:PHASE8-1' };
const artifactRef = { kind: 'artifact' as const, ref: 'artifacts/phase8-contract-validation.md' };

test('Phase 8 contract objects expose required runtime boundaries', () => {
  const facts: CodingFactSet = {
    contract: CODING_FACT_SET_CONTRACT_VERSION,
    scope,
    request: { intentKnown: true, acceptanceKnown: true, validationKnown: true },
    documents: { specExists: true, planExists: true, tasksExists: true, verifiesExists: false },
    facts: [],
    files: [],
    tests: [],
    runtime: [],
    evidence: [],
    external: [],
    generatedAt: now
  };

  const decision: LifecycleRiskDecision = {
    contract: LIFECYCLE_RISK_DECISION_CONTRACT_VERSION,
    scope,
    profile: 'compact',
    requiredStages: ['tasks', 'verifies', 'do', 'test', 'goal-verify', 'sync-back'],
    skippedStages: [],
    blockedStages: [],
    requiredEvidence: [],
    requiredReviews: [],
    humanCheckpointRequired: false,
    approvalPolicy: 'review-required',
    inputRefs: [],
    signalRefs: [],
    policyVersion: 'phase8-risk-policy-v1',
    inputHash: 'input-hash',
    confidence: 'high',
    reasons: ['contract foundation sample'],
    generatedAt: now
  };

  const stageRun: StageRun = {
    contract: 'sdd-stage-run-v1',
    id: 'stage-1',
    scope,
    stage: 'do',
    ownerAgent: 'implementer',
    coMainAgents: ['reviewer'],
    status: 'active',
    inputRefs: [projectionRef],
    outputRefs: [],
    decisionRefs: [projectionRef],
    blockingReasons: [],
    createdAt: now,
    updatedAt: now
  };

  const handoff: WorkflowHandoff = {
    contract: 'sdd-workflow-handoff-v1',
    id: 'handoff-1',
    scope,
    fromStage: 'do',
    toStage: 'test',
    fromAgent: 'implementer',
    toAgent: 'validator',
    status: 'proposed',
    outputRefs: [artifactRef],
    requiredInputRefs: [projectionRef],
    riskDecisionRef: projectionRef,
    evidenceRefs: [],
    openQuestions: [],
    blockingGaps: [],
    createdAt: now
  };

  assert.equal(facts.contract, 'sdd-coding-fact-set-v1');
  assert.equal(decision.profile, 'compact');
  assert.equal(stageRun.ownerAgent, 'implementer');
  assert.equal(handoff.status, 'proposed');
});

test('lifecycle risk decision keeps agent and subagent selection out of policy output', () => {
  const decision: LifecycleRiskDecision = {
    contract: LIFECYCLE_RISK_DECISION_CONTRACT_VERSION,
    scope,
    profile: 'direct',
    requiredStages: ['test'],
    skippedStages: ['plan'],
    blockedStages: [],
    requiredEvidence: [],
    requiredReviews: [],
    humanCheckpointRequired: false,
    approvalPolicy: 'auto-allow',
    inputRefs: [],
    signalRefs: [],
    policyVersion: 'phase8-risk-policy-v1',
    inputHash: 'input-hash',
    confidence: 'high',
    reasons: [],
    generatedAt: now
  };

  const forbiddenKeys = ['agent', 'agentId', 'ownerAgent', 'team', 'subagent', 'subagents', 'selectedAgent'];
  for (const key of forbiddenKeys) {
    assert.equal(Object.hasOwn(decision, key), false, key);
  }
});

test('work units, subagents, context offload, evidence, and model artifacts stay non-authoritative by default', () => {
  const workUnit: WorkUnit = {
    contract: 'sdd-work-unit-v1',
    id: 'work-1',
    scope,
    stageRunId: 'stage-1',
    type: 'subagent',
    name: 'review-subagent',
    purpose: 'bounded review',
    status: 'pending',
    blocking: false,
    authority: 'non-authoritative',
    requiredBefore: 'never',
    contextRef: artifactRef,
    outputRefs: [],
    evidenceRefs: [],
    createdAt: now
  };

  const subagent: SubagentDefinition = {
    contract: 'sdd-subagent-definition-v1',
    name: 'test-writer',
    description: 'Writes tests under allowed test paths only.',
    promptRef: artifactRef,
    allowedToolRefs: [],
    canEditProduction: false,
    canOwnLifecycle: false,
    allowedWritePaths: ['**/*.test.ts'],
    resultAuthority: 'non-authoritative'
  };

  const modelArtifact: ModelProducedArtifact = {
    contract: MODEL_PRODUCED_ARTIFACT_CONTRACT_VERSION,
    producer: 'subagent',
    authority: 'non-authoritative',
    allowedUse: ['summary', 'diagnostic'],
    forbiddenUse: ['final-risk-decision', 'stage-completion', 'ship-gate-pass'],
    artifactRefs: [artifactRef.ref],
    reviewedByRuntime: false
  };

  const subagentResult: SubagentResult = {
    contract: 'sdd-subagent-result-v1',
    dispatchId: 'dispatch-1',
    status: 'completed',
    authority: 'diagnostic-only',
    summary: 'No production edits attempted.',
    artifactRefs: [artifactRef],
    evidenceRefs: [],
    modelArtifacts: [modelArtifact],
    completedAt: now
  };

  const contextSignal: ContextLoadSignal = {
    contract: 'sdd-context-load-signal-v1',
    scope,
    level: 'high',
    score: 8,
    fileCountScore: 2,
    artifactSizeScore: 2,
    dependencyFanoutScore: 1,
    unknownImpactScore: 1,
    staleEvidenceScore: 1,
    logVolumeScore: 1,
    confidence: 'medium',
    inputRefs: [artifactRef],
    reasons: ['large artifact set'],
    generatedAt: now
  };

  const contextDecision: ContextOffloadDecision = {
    contract: 'sdd-context-offload-decision-v1',
    scope,
    action: 'dispatch-subagent',
    loadSignalRef: projectionRef,
    requiredBefore: 'never',
    inlineRefs: [],
    summarizeRefs: [artifactRef],
    dispatchRefs: [artifactRef],
    blockingReasons: [],
    generatedAt: now
  };

  const evidenceRun: UnifiedTestEvidenceRun = {
    contract: 'sdd-test-evidence-run-v1',
    id: 'evidence-1',
    scope,
    commandStatus: 'PASS',
    evidenceCoverage: 'complete',
    policyJudgment: 'PASS',
    commands: [],
    acceptanceCoverage: [],
    syncBackReady: true,
    gaps: [],
    next: 'sdd sync-back inspect --branch master',
    generatedAt: now
  };

  assert.equal(workUnit.authority, 'non-authoritative');
  assert.equal(subagent.canEditProduction, false);
  assert.equal(subagent.canOwnLifecycle, false);
  assert.equal(subagentResult.authority, 'diagnostic-only');
  assert.equal(contextSignal.level, 'high');
  assert.equal(contextDecision.action, 'dispatch-subagent');
  assert.equal(evidenceRun.policyJudgment, 'PASS');
});

test('projection envelope records deterministic freshness inputs', () => {
  const envelope: RuntimeProjectionEnvelope<{ ok: true }> = {
    contract: RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION,
    projectionType: 'phase8.lifecycle-risk-decision',
    scopeKey: 'master:PHASE8-1',
    id: 'phase8.lifecycle-risk-decision:master:PHASE8-1:input-hash:producer-v1',
    inputHash: 'input-hash',
    producer: 'phase8-contract-test',
    producerVersion: 'producer-v1',
    generatedAt: now,
    payload: { ok: true }
  };

  assert.equal(envelope.contract, 'sdd-runtime-projection-envelope-v1');
  assert.equal(envelope.inputHash, 'input-hash');
  assert.equal(envelope.producerVersion, 'producer-v1');
});
