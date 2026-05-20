import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { initProject } from './config/init-project.js';
import { evaluateLifecycleDecisionGate } from './lifecycle/decision-gate.js';
import { buildTaskRiskProfile } from './task-risk-profile.js';
import { evaluateLifecycleRiskDecisionFromProfile, legacyLifecycleDecisionToRiskDecision, taskRiskProfileToCodingRiskProfile, taskRiskProfileToCodingRiskSignals } from './risk.js';
import { readRuntimeProjectionEnvelope, recordRuntimeProjectionEnvelope, runtimeProjectionStaleness } from './storage/runtime-store.js';

test('Phase 8 projection envelope writes are deterministic and stale-aware', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase8-projection-'));
  try {
    await initProject(root);
    const first = await recordRuntimeProjectionEnvelope(root, {
      projectionType: 'phase8-test-risk',
      scopeKey: 'branch:master',
      inputHash: 'input-a',
      producer: 'phase8-test',
      producerVersion: 'v1',
      generatedAt: '2026-05-01T00:00:00.000Z',
      payload: { status: 'one' }
    });
    const second = await recordRuntimeProjectionEnvelope(root, {
      projectionType: 'phase8-test-risk',
      scopeKey: 'branch:master',
      inputHash: 'input-a',
      producer: 'phase8-test',
      producerVersion: 'v1',
      generatedAt: '2026-05-02T00:00:00.000Z',
      payload: { status: 'one' }
    });

    assert.equal(first.status, 'created');
    assert.equal(first.staleness, 'unknown');
    assert.equal(second.status, 'unchanged');
    assert.equal(second.envelope.id, first.envelope.id);
    assert.equal(second.envelope.generatedAt, '2026-05-01T00:00:00.000Z');
    assert.equal(runtimeProjectionStaleness(second.envelope, { inputHash: 'input-b', producerVersion: 'v1' }), 'stale');
    assert.equal(runtimeProjectionStaleness(second.envelope, { inputHash: 'input-a', producerVersion: 'v2' }), 'incompatible');

    const third = await recordRuntimeProjectionEnvelope(root, {
      projectionType: 'phase8-test-risk',
      scopeKey: 'branch:master',
      inputHash: 'input-b',
      producer: 'phase8-test',
      producerVersion: 'v1',
      generatedAt: '2026-05-03T00:00:00.000Z',
      payload: { status: 'two' }
    });
    const restored = await readRuntimeProjectionEnvelope<{ status: string }>(root, 'phase8-test-risk', 'branch:master');

    assert.equal(third.status, 'updated');
    assert.equal(third.staleness, 'stale');
    assert.equal(restored?.inputHash, 'input-b');
    assert.deepEqual(restored?.payload, { status: 'two' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('legacy task risk profiles map to Phase 8 coding risk signals', () => {
  const scope = { branch: 'master', taskId: 'PHASE8-2' };
  const sourceProfile = buildTaskRiskProfile({
    id: 'PHASE8-2',
    risk: ['security', 'external', 'context', 'token', 'performance'],
    affectedFiles: ['packages/core/src/storage/runtime-store.ts', '.sdd/run-index.json'],
    validation: ['npm test']
  });
  const docsProfile = buildTaskRiskProfile({
    id: 'DOCS-1',
    risk: [],
    affectedFiles: ['specs/master/phase8-spec.md'],
    validation: ['npm run typecheck']
  });

  const sourceSignals = taskRiskProfileToCodingRiskSignals(sourceProfile, scope);
  const docsSignals = taskRiskProfileToCodingRiskSignals(docsProfile, { branch: 'master', taskId: 'DOCS-1' });
  const dimensions = sourceSignals.map((signal) => signal.dimension);
  const docsDimensions = docsSignals.map((signal) => signal.dimension);
  const profile = taskRiskProfileToCodingRiskProfile(sourceProfile, scope, '2026-05-01T00:00:00.000Z');

  assert.equal(dimensions.includes('source'), true);
  assert.equal(dimensions.includes('runtime-state'), true);
  assert.equal(dimensions.includes('security'), true);
  assert.equal(dimensions.includes('external'), true);
  assert.equal(dimensions.includes('context'), true);
  assert.equal(dimensions.includes('performance'), true);
  assert.equal(docsDimensions.includes('workflow'), true);
  assert.equal(docsDimensions.includes('evidence'), true);
  assert.equal(profile.contract, 'sdd-coding-risk-profile-v1');
  assert.equal(profile.level, 'high');
  assert.equal(profile.dimensions.includes('source'), true);
});

test('known external risk stays distinct from unknown external risk', () => {
  const known = buildTaskRiskProfile({
    id: 'KNOWN-EXTERNAL',
    risk: ['external', 'third-party'],
    affectedFiles: ['docs/integration.md'],
    validation: ['npm test']
  });
  const unknown = buildTaskRiskProfile({
    id: 'UNKNOWN-EXTERNAL',
    risk: ['external-unknown'],
    affectedFiles: ['docs/integration.md'],
    validation: ['npm test']
  });
  const knownRisk = taskRiskProfileToCodingRiskProfile(known, { branch: 'master', taskId: 'KNOWN-EXTERNAL' }, '2026-05-01T00:00:00.000Z');
  const unknownRisk = taskRiskProfileToCodingRiskProfile(unknown, { branch: 'master', taskId: 'UNKNOWN-EXTERNAL' }, '2026-05-01T00:00:00.000Z');
  const knownDecision = evaluateLifecycleRiskDecisionFromProfile(knownRisk);
  const unknownDecision = evaluateLifecycleRiskDecisionFromProfile(unknownRisk);

  assert.deepEqual(known.normalizedTags, ['external']);
  assert.equal(known.externalKnown, true);
  assert.equal(known.externalUnknown, false);
  assert.equal(unknown.externalUnknown, true);
  assert.equal(knownRisk.signals.some((signal) => signal.id.endsWith(':external-known') && signal.level === 'medium' && signal.confidence === 'high'), true);
  assert.equal(unknownRisk.signals.some((signal) => signal.id.endsWith(':external-unknown') && signal.level === 'high' && signal.confidence === 'low'), true);
  assert.notEqual(knownDecision.profile, 'research');
  assert.equal(unknownDecision.profile, 'research');
  assert.equal(unknownDecision.approvalPolicy, 'human-required');
});

test('legacy lifecycle decisions map to Phase 8 comparison decisions', () => {
  const legacy = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    impact_confidence: 'high',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    reversibility: 'reversible',
    affected_contracts: ['public-api'],
    risk_tags: ['security']
  }, new Date('2026-05-01T00:00:00.000Z')).record;
  const decision = legacyLifecycleDecisionToRiskDecision(legacy, { branch: 'master', taskId: 'PHASE8-2' }, { inputHash: 'legacy-input' });

  assert.equal(decision.contract, 'sdd-lifecycle-risk-decision-v1');
  assert.equal(decision.profile, 'full');
  assert.equal(decision.requiredStages.includes('test'), true);
  assert.equal(decision.requiredStages.includes('verifies'), true);
  assert.equal(decision.requiredStages.includes('goal-verify'), true);
  assert.equal(decision.requiredEvidence.length, 1);
  assert.equal(decision.requiredReviews.some((review) => review.kind === 'security'), true);
  assert.equal(decision.requiredReviews.some((review) => review.kind === 'source-boundary'), true);
  assert.equal(decision.approvalPolicy, 'review-required');
  assert.equal(decision.reasons[0], 'Mapped from legacy lifecycle decision for comparison only.');
  assert.equal(Object.hasOwn(decision, 'ownerAgent'), false);
  assert.equal(Object.hasOwn(decision, 'subagent'), false);
});
