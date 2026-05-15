import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { createRun, listRuns, readRunState } from './run-state.js';

test('createRun writes state and append-only events', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    await initProject(root);
    const state = await createRun(root);
    const restored = await readRunState(root, state.runId);
    assert.equal(restored.contract, 'phase-1.2-run-state-contract');
    assert.equal(restored.lifecycleDecision?.contract, 'sdd-lifecycle-decision-v1');
    assert.equal(restored.lifecycleDecision?.version, '1.3.0');
    const events = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'events.jsonl'), 'utf8');
    assert.match(events, /run_started/);
    assert.match(events, /lifecycle_decision_recorded/);
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
    await writeFile(path.join(root, '.sdd', 'runs', older.runId, 'state.json'), `${JSON.stringify(olderState, null, 2)}\n`, 'utf8');
    await writeFile(path.join(root, '.sdd', 'runs', newer.runId, 'state.json'), `${JSON.stringify(newerState, null, 2)}\n`, 'utf8');

    const runs = await listRuns(root);

    assert.deepEqual(runs.map((run) => run.runId), ['run-newer', 'run-older']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
