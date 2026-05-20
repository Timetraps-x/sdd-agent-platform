import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { WORK_UNIT_CONTRACT_VERSION, type RuntimeRef, type RuntimeScope } from '../contracts.js';
import { initProject } from '../config/init-project.js';
import type { WorkUnit } from './contracts.js';
import { canTransitionWorkUnit, recordWorkUnitProjection, readWorkUnitProjection, transitionWorkUnit, validateWorkUnit, workUnitBlocksGate } from './runtime.js';

const scope: RuntimeScope = { branch: 'master', taskId: 'PHASE8-8', runId: 'run-1' };
const contextRef: RuntimeRef = { kind: 'projection', ref: 'sdd-context-package:PHASE8-8' };
const evidenceRef: RuntimeRef = { kind: 'evidence', ref: 'artifacts/phase8-work-unit-validation.md#AC-1' };

test('work unit state machine accepts legal transitions and rejects terminal mutation', () => {
  const running = transitionWorkUnit(workUnit({ status: 'pending' }), 'running');
  const completed = transitionWorkUnit(running.workUnit, 'completed', { completedAt: '2026-05-18T00:01:00.000Z' });
  const reopened = transitionWorkUnit(completed.workUnit, 'running');

  assert.equal(canTransitionWorkUnit('pending', 'running'), true);
  assert.equal(running.valid, true);
  assert.equal(completed.valid, true);
  assert.equal(completed.workUnit.status, 'completed');
  assert.equal(completed.workUnit.completedAt, '2026-05-18T00:01:00.000Z');
  assert.equal(canTransitionWorkUnit('completed', 'running'), false);
  assert.equal(reopened.valid, false);
  assert.match(reopened.issues[0], /Illegal work unit transition/);
});

test('work unit validation enforces lifecycle authority and blocking gates', () => {
  const subagentOwner = validateWorkUnit(workUnit({ type: 'subagent', authority: 'stage-owner', blocking: true, requiredBefore: 'handoff' }));
  const coMainOwner = validateWorkUnit(workUnit({ type: 'co-main-agent', authority: 'stage-owner', blocking: true, requiredBefore: 'handoff' }));
  const nonBlockingGate = validateWorkUnit(workUnit({ blocking: false, requiredBefore: 'handoff' }));
  const blockingWithoutGate = validateWorkUnit(workUnit({ blocking: true, requiredBefore: 'never' }));

  assert.equal(subagentOwner.valid, false);
  assert.equal(subagentOwner.issues.some((issue) => /Subagent work units must be non-authoritative/.test(issue)), true);
  assert.equal(coMainOwner.valid, false);
  assert.equal(coMainOwner.issues.some((issue) => /Only main-agent work units/.test(issue)), true);
  assert.equal(nonBlockingGate.valid, false);
  assert.equal(blockingWithoutGate.valid, false);
});

test('work unit blocking gate semantics distinguish blocking and non-blocking work', () => {
  assert.equal(workUnitBlocksGate(workUnit({ blocking: true, requiredBefore: 'handoff', status: 'running' }), 'handoff'), true);
  assert.equal(workUnitBlocksGate(workUnit({ blocking: true, requiredBefore: 'handoff', status: 'completed' }), 'handoff'), false);
  assert.equal(workUnitBlocksGate(workUnit({ blocking: false, requiredBefore: 'never', status: 'running' }), 'handoff'), false);
});

test('work unit projections can be written and read', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-work-unit-runtime-'));
  try {
    await initProject(root);
    const unit = workUnit({ status: 'running', blocking: true, requiredBefore: 'handoff' });

    const write = await recordWorkUnitProjection(root, unit);
    const restored = await readWorkUnitProjection(root, scope, unit.id);

    assert.equal(write.status, 'created');
    assert.equal(restored?.payload.id, unit.id);
    assert.equal(restored?.payload.status, 'running');
    assert.equal(restored?.payload.requiredBefore, 'handoff');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function workUnit(overrides: Partial<WorkUnit> = {}): WorkUnit {
  return {
    contract: WORK_UNIT_CONTRACT_VERSION,
    id: 'wu-phase8-8',
    scope,
    stageRunId: 'stage-do',
    type: 'main-agent',
    name: 'implement phase8 runtime',
    purpose: 'Record bounded runtime work without transferring lifecycle ownership.',
    status: 'pending',
    blocking: true,
    authority: 'stage-owner',
    requiredBefore: 'stage-output',
    contextRef,
    outputRefs: [],
    evidenceRefs: [evidenceRef],
    createdAt: '2026-05-18T00:00:00.000Z',
    ...overrides
  };
}
