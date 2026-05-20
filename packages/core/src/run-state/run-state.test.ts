import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { readRunEvents } from './events.js';
import { createRun, listRuns, readRunState, writeRunState } from './run-state.js';
import { validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';

test('createRun writes state and append-only events', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    await initProject(root);
    const state = await createRun(root);
    const restored = await readRunState(root, state.runId);
    assert.equal(restored.contract, 'phase-1.2-run-state-contract');
    assert.equal(restored.lifecycleDecision?.contract, 'sdd-lifecycle-decision-v1');
    assert.equal(restored.lifecycleDecision?.version, '1.3.0');
    const events = await readRunEvents(root, state.runId);
    assert.equal(events.some((event) => event.event === 'run_started'), true);
    assert.equal(events.some((event) => event.event === 'lifecycle_decision_recorded'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createRun binds scoped branch task metadata', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-scoped-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));

    const state = await createRun(root, { branch: 'feature', taskId: 'T1' });
    const restored = await readRunState(root, state.runId);

    assert.equal(restored.partition, 'feature');
    assert.equal(restored.gitBranch, 'feature');
    assert.equal(restored.currentTask, 'T1');
    assert.equal(restored.taskId, 'T1');
    assert.deepEqual(restored.affectedFiles, ['packages/core/src/index.ts']);
    assert.match(restored.artifactRoot, /\.sdd[\\/]runs[\\/]feature[\\/]evidence/);
    assert.equal(restored.documentSnapshot.tasksHash !== null, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('listRuns sorts run summaries by updated time descending', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-run-list-'));
  try {
    await initProject(root);
    const older = await createRun(root, { runId: 'run-older' });
    const newer = await createRun(root, { runId: 'run-newer' });
    const olderState = { ...older, updatedAt: '2026-05-01T00:00:00.000Z' };
    const newerState = { ...newer, updatedAt: '2026-05-02T00:00:00.000Z' };
    await writeRunState(root, olderState);
    await writeRunState(root, newerState);

    const runs = await listRuns(root);

    assert.deepEqual(runs.map((run) => run.runId), ['run-newer', 'run-older']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
