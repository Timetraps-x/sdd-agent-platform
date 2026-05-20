import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { readRunEvents } from '../run-state/events.js';
import { createRun, readRunState } from '../run-state/run-state.js';
import { evaluateLifecycleDecisionGate, recordLifecycleDecision } from './decision-gate.js';
import { renderLifecycleDecisionGate } from './rendering.js';
import { extractLifecycleRiskSignalsFromText } from './risk-signals.js';

test('lifecycle decision gate allows direct only through conservative whitelist', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    estimated_change_size: 'tiny',
    task_count_estimate: 1,
    file_count_estimate: 1,
    impact_confidence: 'high',
    risk_tags: [],
    reversibility: 'reversible',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    requires_agents: false,
    handoff_count: 0,
    artifact_dependency: false,
    runtime_recovery_need: false,
    orchestration_uncertainty: 'low'
  }, new Date('2026-05-01T00:00:00.000Z'));

  assert.equal(result.record.decision.profile, 'direct');
  assert.equal(result.record.decision.confidence, 'high');
  assert.equal(result.record.decision.hard_gate_hits.length, 0);
  assert.equal(result.record.decision.human_checkpoint_required, false);
  assert.equal(result.record.decision.skipped_stages.includes('full-spec'), true);
});

test('lifecycle hard gates force full profile for contract and state risks', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    impact_confidence: 'high',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    reversibility: 'reversible',
    affected_contracts: ['public-api'],
    risk_tags: ['state-machine']
  });

  assert.equal(result.record.decision.profile, 'full');
  assert.equal(result.record.decision.hard_gate_hits.includes('api_schema_contract'), true);
  assert.equal(result.record.decision.hard_gate_hits.includes('state_machine_concurrency_liveness'), true);
  assert.equal(result.record.decision.required_stages.includes('verify'), true);
});

test('lifecycle database risk forces full hard gate and human checkpoint', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    impact_confidence: 'high',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    reversibility: 'reversible',
    risk_tags: ['database']
  });

  assert.equal(result.record.decision.profile, 'full');
  assert.equal(result.record.decision.hard_gate_hits.includes('database_or_data_loss'), true);
  assert.equal(result.record.decision.human_checkpoint_required, true);
  assert.equal(result.checkpointRequired, true);
});

test('Phase 5.1 lifecycle risk extraction maps Chinese hard-gate text', () => {
  const extraction = extractLifecycleRiskSignalsFromText('三线程状态流转，并发更新，SQL 拼接，数据一致性风险');
  const categories = extraction.evidence.map((item) => item.category);
  const result = evaluateLifecycleDecisionGate(extraction.signals);
  const rendered = renderLifecycleDecisionGate(result);

  assert.equal(extraction.source, 'from_text');
  assert.equal(extraction.riskTags.includes('state-machine'), true);
  assert.equal(extraction.riskTags.includes('concurrency'), true);
  assert.equal(extraction.riskTags.includes('database'), true);
  assert.equal(categories.includes('state_machine'), true);
  assert.equal(categories.includes('concurrency'), true);
  assert.equal(categories.includes('sql'), true);
  assert.equal(categories.includes('database_data_loss'), true);
  assert.equal(result.record.decision.profile, 'full');
  assert.equal(result.record.decision.hard_gate_hits.includes('state_machine_concurrency_liveness'), true);
  assert.equal(result.record.decision.hard_gate_hits.includes('database_or_data_loss'), true);
  assert.equal(result.autonomyCeiling, 'full_sdd_with_checkpoint');
  assert.equal(rendered.includes('Lifecycle checkpoint is required.'), true);
  assert.equal(rendered.includes('Why:'), true);
  assert.equal(rendered.includes('Next:'), true);
});

test('lifecycle checkpoint triggers are recorded without executing workflow', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    impact_confidence: 'high',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    reversibility: 'reversible',
    policy_hits: ['git_commit'],
    permission_required: ['dependency_install'],
    human_checkpoint_required: true
  });

  assert.equal(result.record.decision.profile, 'compact');
  assert.equal(result.record.decision.human_checkpoint_required, true);
  assert.equal(result.record.decision.hard_gate_hits.includes('policy_or_permission_checkpoint'), true);
  assert.match(result.boundaries.join('\n'), /must not execute Phase 1.8 task implementation loop/);
});

test('lifecycle research gate handles unscoutable unknown impact', () => {
  const result = evaluateLifecycleDecisionGate({
    impact_confidence: 'low',
    can_scout_impact: false
  });

  assert.equal(result.record.decision.profile, 'research');
  assert.equal(result.record.decision.confidence, 'low');
  assert.equal(result.record.decision.hard_gate_hits.includes('low_impact_confidence_unscoutable'), true);
  assert.equal(result.record.decision.required_stages[0], 'research');
});

test('lifecycle decision gate emits canonical Phase 1.3 contract id for new records', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    impact_confidence: 'high',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    reversibility: 'reversible'
  });

  assert.equal(result.record.contract, 'sdd-lifecycle-decision-v1');
  assert.equal(result.record.version, '1.3.0');
});

test('recordLifecycleDecision persists command gate output to run state and events', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-lifecycle-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const result = evaluateLifecycleDecisionGate({
      intent_clarity: 'high',
      acceptance_clarity: 'high',
      impact_confidence: 'high',
      validation_clarity: 'clear',
      validation_available: true,
      validation_cost: 'cheap',
      reversibility: 'reversible',
      risk_tags: ['database']
    }, new Date('2026-05-01T00:00:00.000Z'));

    await recordLifecycleDecision(root, state.runId, result.record);
    const restored = await readRunState(root, state.runId);
    const events = await readRunEvents(root, state.runId);
    assert.equal(restored.lifecycleDecision?.decision.profile, 'full');
    assert.equal(restored.lifecycleDecision?.decision.hard_gate_hits.includes('database_or_data_loss'), true);
    assert.equal(restored.lifecycleDecision?.decision.human_checkpoint_required, true);
    assert.equal(events.some((event) => /Lifecycle decision recorded by Phase 1.7 command gate/.test(event.summary ?? '')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
