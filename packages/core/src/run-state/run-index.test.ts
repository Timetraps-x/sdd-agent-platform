import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { createDelegationRecord } from '../delegation/validation.js';
import { validResultArtifact } from '../test-support/fixtures.js';
import { writeArtifact } from './artifacts.js';
import { appendEvent } from './events.js';
import { createRun, writeRunState } from './run-state.js';
import { inspectLocalRunIndex, queryLocalRunIndex, rebuildLocalRunIndex } from './run-index.js';

test('local run index rebuilds and queries derived run evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-local-run-index-'));
  try {
    await initProject(root);
    const run = await createRun(root, { runId: 'run-index' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-implementer-001',
      task: 'T1',
      agent: 'implementer',
      expectedArtifact: 'artifacts/implementer-T1.md'
    });
    await writeArtifact(root, run.runId, 'implementer-T1.md', validResultArtifact('implementer', 'T1', 'PASS', 'artifacts/implementer-T1.md'));
    await writeRunState(root, {
      ...run,
      status: 'completed',
      currentTask: 'T1',
      tasks: { T1: { status: 'completed' } },
      delegations: { [delegation.delegationId]: { ...delegation, status: 'COMPLETED', terminalEventAt: '2026-05-07T00:00:00.000Z' } },
      artifacts: [{ path: 'artifacts/implementer-T1.md', kind: 'sdd-result', task: 'T1', agent: 'implementer', createdAt: '2026-05-07T00:00:00.000Z' }]
    });
    await appendEvent(root, run.runId, { event: 'wave_executor_started', runId: run.runId });

    const index = await rebuildLocalRunIndex(root);
    const queried = await queryLocalRunIndex(root, { taskId: 'T1', status: 'completed', artifact: 'artifacts/implementer-T1.md' });
    const inspection = await inspectLocalRunIndex(root);

    assert.equal(index.contract, 'phase-3.13-local-run-index-v1');
    assert.deepEqual(index.runs.map((entry) => entry.runId), ['run-index']);
    assert.deepEqual(index.tasks.map((entry) => `${entry.runId}:${entry.taskId}:${entry.status}`), ['run-index:T1:completed']);
    assert.equal(index.delegations.length, 1);
    assert.equal(index.artifacts[0]?.path, 'artifacts/implementer-T1.md');
    assert.equal(index.waves[0]?.lastEvent, 'wave_executor_started');
    assert.deepEqual(queried.runs.map((entry) => entry.runId), ['run-index']);
    assert.equal(inspection.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
