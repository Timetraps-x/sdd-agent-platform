import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { doctor } from '../doctor/doctor.js';
import { graphTaskMarkdown, harnessTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { inspectTaskGraph } from './task-graph.js';

test('task graph planner builds dependency and file overlap graph', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-graph-valid-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('G1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('G2', ['G1'], ['./src/a.ts', 'src/b.ts'], ['security'])}`);

    const graph = await inspectTaskGraph(root, { branch: 'master' });

    assert.equal(graph.version, 'phase-3.9-task-graph-planner-v1');
    assert.equal(graph.valid, true);
    assert.equal(graph.nodes.length, 2);
    assert.deepEqual(graph.dependencyEdges, [{ from: 'G1', to: 'G2', type: 'depends_on', files: [] }]);
    assert.deepEqual(graph.fileOverlapEdges, [{ from: 'G1', to: 'G2', type: 'file_overlap', files: ['src/a.ts'] }]);
    assert.deepEqual(graph.summary.highRiskTasks, ['G2']);
    assert.deepEqual(graph.summary.validationCommands, ['npm test']);
    assert.equal(graph.contract, 'phase-5.3-task-graph-v1');
    assert.deepEqual(graph.nodes[1].agentFit, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('task graph parses Phase 5.3 harness metadata fields', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase53-task-graph-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${harnessTaskMarkdown('H1')}`);

    const graph = await inspectTaskGraph(root, { branch: 'master' });
    const node = graph.nodes[0];

    assert.equal(graph.contract, 'phase-5.3-task-graph-v1');
    assert.deepEqual(node.fileOwnership, ['packages/core/src/index.ts']);
    assert.deepEqual(node.agentFit, ['implementer', 'validator']);
    assert.deepEqual(node.verificationAvailability, ['unit-test', 'cli-smoke']);
    assert.equal(node.autonomy, 'foreground_write');
    assert.deepEqual(node.allowedAgents, ['implementer', 'validator']);
    assert.deepEqual(node.requiredArtifacts, ['artifacts/implementer-H1.md', 'artifacts/validation-H1.md']);
    assert.equal(node.gapState, 'none');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('task graph planner blocks missing dependency and cycle diagnostics', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-graph-blocked-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('C1', ['C2'], ['src/c1.ts'], [])}\n${graphTaskMarkdown('C2', ['C1'], ['src/c2.ts'], [])}\n${graphTaskMarkdown('M1', ['M404'], ['src/m1.ts'], [])}`);

    const graph = await inspectTaskGraph(root, { branch: 'master' });

    assert.equal(graph.valid, false);
    assert.equal(graph.diagnostics.some((diagnostic) => /unknown task M404/.test(diagnostic.message)), true);
    assert.equal(graph.diagnostics.some((diagnostic) => /Task dependency cycle detected: C1 -> C2 -> C1|Task dependency cycle detected: C2 -> C1 -> C2/.test(diagnostic.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports task graph planner contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-graph-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'task_graph_planner_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.9-task-graph-planner-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
