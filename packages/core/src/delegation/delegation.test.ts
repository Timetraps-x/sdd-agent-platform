import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { doctor } from '../doctor/doctor.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { appendEvent } from '../run-state/events.js';
import { createRun, writeRunState } from '../run-state/run-state.js';
import { inspectDelegationQueueItem, listDelegationQueueItems } from './queue.js';
import { getDelegationStateMachine, validateDelegationStateTransition } from './state-machine.js';
import { createDelegationRecord, isDelegationStale, isDelegationTerminal, validateDelegationRecord } from './validation.js';

test('delegation queue contract derives stable items from run-state delegations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-queue-api-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'queue-run-001' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T001-implementer-001',
      task: 'T001',
      agent: 'implementer',
      expectedArtifact: 'artifacts/implement-T001.md',
      runMode: 'background'
    });
    await writeRunState(root, {
      ...state,
      currentTask: 'T001',
      delegations: { [delegation.delegationId]: delegation }
    });

    const snapshot = await listDelegationQueueItems(root);
    const scopedSnapshot = await listDelegationQueueItems(root, { runId: 'queue-run-001' });
    const item = await inspectDelegationQueueItem(root, 'queue-run-001:D-T001-implementer-001');
    const missing = await inspectDelegationQueueItem(root, 'missing:item');

    assert.equal(snapshot.version, 'phase-3.3-delegation-queue-contract-v1');
    assert.equal(snapshot.items.length, 1);
    assert.equal(scopedSnapshot.items.length, 1);
    assert.equal(item?.id, 'queue-run-001:D-T001-implementer-001');
    assert.equal(item?.taskId, 'T001');
    assert.equal(item?.requestedCapabilityId, 'sdd-cli');
    assert.equal(item?.dedupeKey, 'queue-run-001:T001:implementer');
    assert.equal(item?.statusSource, 'run_state_delegation');
    assert.equal(item?.requiredEvidence.includes('artifacts/implement-T001.md'), true);
    assert.equal(missing, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports delegation queue contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-queue-doctor-'));
  try {
    await initProject(root);
    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'delegation_queue_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.3-delegation-queue-contract-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('delegation state machine exposes allowed transitions and blocks terminal reopen', () => {
  const machine = getDelegationStateMachine();
  const allowed = validateDelegationStateTransition('RUNNING', 'COMPLETED', 'delegation_completed');
  const retry = validateDelegationStateTransition('RECOVERABLE', 'RUNNING', 'delegation_retry_started');
  const terminalReopen = validateDelegationStateTransition('COMPLETED', 'RUNNING', 'delegation_retry_started');
  const wrongEvent = validateDelegationStateTransition('RUNNING', 'COMPLETED', 'delegation_failed');

  assert.equal(machine.version, 'phase-3.4-delegation-state-machine-v1');
  assert.equal(machine.statuses.includes('RECOVERABLE'), true);
  assert.equal(machine.terminalStatuses.includes('COMPLETED'), true);
  assert.equal(machine.transitions.some((transition) => transition.from === 'STALE' && transition.to === 'TIMED_OUT' && transition.event === 'delegation_timeout'), true);
  assert.equal(allowed.valid, true);
  assert.equal(retry.valid, true);
  assert.equal(terminalReopen.valid, false);
  assert.match(terminalReopen.issues.map((issue) => issue.message).join('\n'), /Terminal delegation status COMPLETED cannot transition to RUNNING/);
  assert.equal(wrongEvent.valid, false);
});

test('doctor reports delegation state machine visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-state-machine-doctor-'));
  try {
    await initProject(root);
    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'delegation_state_machine');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.4-delegation-state-machine-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports illegal delegation event transitions', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-state-machine-events-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'state-machine-run-001' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T003-implementer-001',
      task: 'T003',
      agent: 'implementer',
      expectedArtifact: 'artifacts/implement-T003.md'
    });
    await writeRunState(root, {
      ...state,
      delegations: {
        [delegation.delegationId]: { ...delegation, status: 'COMPLETED', terminalEventAt: new Date().toISOString() }
      }
    });
    await appendEvent(root, 'state-machine-run-001', {
      event: 'delegation_started',
      runId: 'state-machine-run-001',
      data: { delegationId: delegation.delegationId }
    });
    await appendEvent(root, 'state-machine-run-001', {
      event: 'delegation_completed',
      runId: 'state-machine-run-001',
      data: { delegationId: delegation.delegationId }
    });
    await appendEvent(root, 'state-machine-run-001', {
      event: 'delegation_started',
      runId: 'state-machine-run-001',
      data: { delegationId: delegation.delegationId }
    });

    const report = await doctor(root, { allRuns: true });
    const check = report.checks.find((item) => item.check === 'delegation_state_transition');

    assert.equal(check?.level, 'FAIL');
    assert.match(check?.message ?? '', /cannot transition COMPLETED -> RUNNING on delegation_started/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('delegation terminal and stale contract checks are explicit', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-delegation-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const running = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md',
      startedAt: '2026-05-01T00:00:00.000Z',
      timeoutSeconds: 60
    });

    assert.equal(isDelegationTerminal(running.status), false);
    assert.equal(isDelegationStale(running, new Date('2026-05-01T00:02:00.000Z')), true);
    const stale = await validateDelegationRecord(root, state.runId, running, new Date('2026-05-01T00:02:00.000Z'));
    assert.equal(stale.valid, false);
    assert.equal(stale.stale, true);
    assert.equal(stale.issues.some((issue) => issue.field === 'status' && /stale/.test(issue.message)), true);

    const completed = { ...running, status: 'COMPLETED' as const, terminalEventAt: '2026-05-01T00:00:30.000Z' };
    await writeArtifact(root, state.runId, 'review-T1.md', `# Review

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: reviewer
task: T1
status: PASS
artifacts:
  - artifacts/review-T1.md
\`\`\`
`);
    const terminal = await validateDelegationRecord(root, state.runId, completed, new Date('2026-05-01T00:02:00.000Z'));
    assert.equal(isDelegationTerminal(completed.status), true);
    assert.equal(terminal.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
