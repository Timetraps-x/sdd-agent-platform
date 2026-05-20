import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { doctor } from '../doctor/doctor.js';
import { graphTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { inspectWavePlan } from './wave-plan.js';

test('wave planner builds dependency waves and separates file overlaps', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-valid-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('W1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('W2', [], ['./src/a.ts'], [])}\n${graphTaskMarkdown('W3', ['W1'], ['src/c.ts'], [])}`);

    const plan = await inspectWavePlan(root, { branch: 'master', capabilityId: 'native-file-edit' });

    assert.equal(plan.version, 'phase-3.10-wave-planner-v1');
    assert.equal(plan.valid, true);
    assert.deepEqual(plan.waves.map((wave) => wave.tasks.map((task) => task.taskId)), [['W1'], ['W2', 'W3']]);
    assert.equal(plan.manualGates.length, 0);
    assert.equal(plan.blockedTasks.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave planner routes manual gates and downstream blocked tasks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-manual-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('DB1', [], ['db/schema.sql'], ['database'])}\n${graphTaskMarkdown('APP1', ['DB1'], ['src/app.ts'], [])}`);

    const plan = await inspectWavePlan(root, { branch: 'master', capabilityId: 'native-file-edit' });

    assert.equal(plan.valid, false);
    assert.deepEqual(plan.manualGates.map((gate) => gate.taskId), ['DB1']);
    assert.deepEqual(plan.blockedTasks.map((gate) => gate.taskId), ['APP1']);
    assert.match(plan.blockedTasks[0]?.reasons.join(' ') ?? '', /depends on non-plannable task\(s\): DB1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave planner blocks graph diagnostics', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-blocked-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('M1', ['M404'], ['src/m1.ts'], [])}`);

    const plan = await inspectWavePlan(root, { branch: 'master', capabilityId: 'native-file-edit' });

    assert.equal(plan.valid, false);
    assert.deepEqual(plan.blockedTasks.map((gate) => gate.taskId), ['M1']);
    assert.equal(plan.diagnostics.some((diagnostic) => /unknown task M404/.test(diagnostic.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports wave planner contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'wave_planner_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.10-wave-planner-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
