import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { doctor } from '../doctor/doctor.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { readRunState } from '../run-state/run-state.js';
import { validResultArtifact, validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { inspectBackgroundExecutor, runBackgroundExecutor } from './background-executor.js';

test('background executor claims one delegation and persists background run state', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-background-claim-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const result = await runBackgroundExecutor(root, { taskId: 'B1' });
    const state = await readRunState(root, result.runId);
    const inspection = await inspectBackgroundExecutor(root, result.runId);

    assert.equal(result.version, 'phase-3.11-background-executor-v1');
    assert.equal(result.status, 'claimed');
    assert.equal(result.delegationId, 'B-B1-implementer-001');
    assert.equal(state.status, 'running');
    assert.equal(state.phase, 'background');
    assert.equal(state.currentTask, 'B1');
    assert.equal(inspection.runningDelegations, 1);
    assert.equal(inspection.terminalDelegations, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('background executor ingests supplied artifact and reaches terminal state', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-background-ingest-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const claimed = await runBackgroundExecutor(root, { taskId: 'B1' });
    await writeArtifact(root, claimed.runId, 'implementer-B1.md', validResultArtifact('implementer', 'B1', 'PASS', 'artifacts/implementer-B1.md'));

    const completed = await runBackgroundExecutor(root, {
      runId: claimed.runId,
      taskId: 'B1',
      artifactPath: 'artifacts/implementer-B1.md'
    });
    const state = await readRunState(root, claimed.runId);
    const inspection = await inspectBackgroundExecutor(root, claimed.runId);

    assert.equal(completed.status, 'completed');
    assert.equal(completed.ingestion?.delegationStatus, 'COMPLETED');
    assert.equal(state.status, 'completed');
    assert.equal(state.phase, 'background');
    assert.equal(inspection.runningDelegations, 0);
    assert.equal(inspection.terminalDelegations, 1);
    assert.equal(inspection.artifactIngestions.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('claude code subagent worker spawns host process and ingests stdout artifact', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-background-claude-host-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));
    const hostScript = path.join(root, 'fake-claude-host.mjs');
    await writeFile(hostScript, [
      "const prompt = process.argv[2] ?? '';",
      "if (!prompt.includes('Queue item id:')) process.exit(2);",
      "process.stdout.write('# implementer result\\n\\n```sdd-result\\ncontract: sdd-result-v1\\nversion: 1.3.0\\nagent: implementer\\ntask: B1\\nstatus: PASS\\nartifacts:\\n  - artifacts/implementer-B1.md\\n```\\n');"
    ].join('\n'), 'utf8');

    const completed = await runBackgroundExecutor(root, {
      taskId: 'B1',
      workerAdapterId: 'claude-code-subagent-worker',
      timeoutSeconds: 10,
      hostInvocation: { command: process.execPath, args: [hostScript, '{prompt}'] }
    });
    const state = await readRunState(root, completed.runId);
    const inspection = await inspectBackgroundExecutor(root, completed.runId);

    assert.equal(completed.status, 'completed');
    assert.equal(completed.hostInvocation?.exitCode, 0);
    assert.equal(completed.hostInvocation?.artifactPath, 'artifacts/implementer-B1.md');
    assert.equal(completed.ingestion?.delegationStatus, 'COMPLETED');
    assert.equal(state.delegations['B-B1-implementer-001']?.status, 'COMPLETED');
    assert.equal(inspection.terminalDelegations, 1);
    assert.equal(inspection.artifactIngestions.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('background executor blocks invalid artifact evidence instead of completing silently', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-background-invalid-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const claimed = await runBackgroundExecutor(root, { taskId: 'B1' });
    await writeArtifact(root, claimed.runId, 'implementer-B1.md', '# Missing contract\n');

    const blocked = await runBackgroundExecutor(root, {
      runId: claimed.runId,
      taskId: 'B1',
      artifactPath: 'artifacts/implementer-B1.md'
    });
    const state = await readRunState(root, claimed.runId);

    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.issues.length > 0, true);
    assert.equal(state.status, 'blocked');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('background executor requires approval for database manual gate and accepts approved artifact ingestion', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-background-approved-manual-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []).replace('risk: []', 'risk:\n  - database'));

    const blocked = await runBackgroundExecutor(root, { taskId: 'B1' });
    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.issues.some((issue) => issue.field === 'isolation' && /manual isolation gate/.test(issue.message)), true);
    assert.equal(blocked.issues.some((issue) => issue.field === 'governance.confirmation' && /database/.test(issue.message)), true);

    const claimed = await runBackgroundExecutor(root, { taskId: 'B1', approved: true });
    await writeArtifact(root, claimed.runId, 'implementer-B1.md', validResultArtifact('implementer', 'B1', 'PASS', 'artifacts/implementer-B1.md'));
    const completed = await runBackgroundExecutor(root, {
      runId: claimed.runId,
      taskId: 'B1',
      artifactPath: 'artifacts/implementer-B1.md',
      approved: true
    });

    assert.equal(claimed.status, 'claimed');
    assert.equal(completed.status, 'completed');
    assert.equal(completed.ingestion?.delegationStatus, 'COMPLETED');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('background executor blocks manual handoff worker adapters', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-background-manual-worker-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const result = await runBackgroundExecutor(root, { taskId: 'B1', workerAdapterId: 'manual-handoff-worker' });

    assert.equal(result.status, 'blocked');
    assert.equal(result.delegationId, null);
    assert.equal(result.issues.some((issue) => issue.field === 'workerAdapterId' && /manual handoff/.test(issue.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports background executor contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-background-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'background_executor_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.11-background-executor-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
