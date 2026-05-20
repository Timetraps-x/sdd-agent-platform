import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { doctor } from '../doctor/doctor.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { createRun, readRunState } from '../run-state/run-state.js';
import { graphTaskMarkdown, validResultArtifact, writeBranchDocs } from '../test-support/fixtures.js';
import { bindTestRunState } from '../test-support/run-state.js';
import { inspectWaveExecutor, runWaveExecutor } from './wave-executor.js';

test('wave executor completes planner-safe waves from supplied artifacts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-complete-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('WX1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('WX2', [], ['src/b.ts'], [])}`);
    const run = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, run.runId, 'master', 'WX1');
    await writeArtifact(root, run.runId, 'implementer-WX1.md', validResultArtifact('implementer', 'WX1', 'PASS', 'artifacts/implementer-WX1.md'));
    await writeArtifact(root, run.runId, 'implementer-WX2.md', validResultArtifact('implementer', 'WX2', 'PASS', 'artifacts/implementer-WX2.md'));

    const result = await runWaveExecutor(root, {
      runId: run.runId,
      artifactPaths: {
        WX1: 'artifacts/implementer-WX1.md',
        WX2: 'artifacts/implementer-WX2.md'
      }
    });
    const state = await readRunState(root, run.runId);
    const inspection = await inspectWaveExecutor(root, run.runId);

    assert.equal(result.version, 'phase-3.12-wave-executor-v1');
    assert.equal(result.status, 'completed');
    assert.equal(result.executedWaves, 1);
    assert.deepEqual(result.taskResults.map((task) => task.taskId).sort(), ['WX1', 'WX2']);
    assert.equal(state.status, 'completed');
    assert.equal(state.phase, 'wave');
    assert.equal(inspection.valid, true);
    assert.equal(inspection.background.terminalDelegations, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave executor blocks manual and blocked planner gates before execution', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-gates-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('DB1', [], ['db/schema.sql'], ['database'])}\n${graphTaskMarkdown('APP1', ['DB1'], ['src/app.ts'], [])}`);

    const result = await runWaveExecutor(root);

    assert.equal(result.status, 'blocked');
    assert.equal(result.executedWaves, 0);
    assert.deepEqual(result.manualGates.map((gate) => gate.taskId), ['DB1']);
    assert.deepEqual(result.blockedTasks.map((gate) => gate.taskId), ['APP1']);
    assert.equal(result.taskResults.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave executor safe-continue finishes current safe wave but does not cross dependency boundary', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-safe-continue-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('WX1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('WX2', [], ['src/b.ts'], [])}\n${graphTaskMarkdown('WX3', ['WX1'], ['src/c.ts'], [])}`);
    const run = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, run.runId, 'master', 'WX1');
    await writeArtifact(root, run.runId, 'implementer-WX2.md', validResultArtifact('implementer', 'WX2', 'PASS', 'artifacts/implementer-WX2.md'));
    await writeArtifact(root, run.runId, 'implementer-WX3.md', validResultArtifact('implementer', 'WX3', 'PASS', 'artifacts/implementer-WX3.md'));

    const result = await runWaveExecutor(root, {
      runId: run.runId,
      strategy: 'safe-continue',
      artifactPaths: {
        WX2: 'artifacts/implementer-WX2.md',
        WX3: 'artifacts/implementer-WX3.md'
      }
    });

    assert.equal(result.status, 'claimed');
    assert.equal(result.executedWaves, 1);
    assert.deepEqual(result.taskResults.map((task) => `${task.taskId}:${task.result.status}`).sort(), ['WX1:claimed', 'WX2:completed']);
    assert.equal(result.taskResults.some((task) => task.taskId === 'WX3'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports wave executor contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'wave_executor_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.12-wave-executor-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
