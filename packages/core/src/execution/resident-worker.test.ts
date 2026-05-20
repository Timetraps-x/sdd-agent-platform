import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { getProjectStatus } from '../status/project-status.js';
import { doctor } from '../doctor/doctor.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { inspectRun } from '../run-state/inspect-run.js';
import { readRunState } from '../run-state/run-state.js';
import { validResultArtifact, validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { runBackgroundExecutor } from './background-executor.js';
import {
  claimResidentWorkerRuntime,
  heartbeatResidentWorkerRuntime,
  inspectResidentWorkerRuntime,
  listResidentWorkerRuntimes,
  readResidentWorkerRuntimeRecord,
  writeResidentWorkerRuntimeRecord
} from './resident-worker.js';

test('resident worker runtime claim persists run-bound runtime evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-resident-worker-claim-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const result = await claimResidentWorkerRuntime(root, { taskId: 'B1', runtimeId: 'R-B1-implementer-test', leaseSeconds: 60 });
    const runtime = await readResidentWorkerRuntimeRecord(root, result.runId, 'R-B1-implementer-test');
    const list = await listResidentWorkerRuntimes(root, { runId: result.runId });
    const inspection = await inspectRun(root, result.runId);

    assert.equal(result.version, 'phase-6.1-resident-worker-runtime-v1');
    assert.equal(result.status, 'claimed');
    assert.equal(result.delegationId, 'B-B1-implementer-001');
    assert.equal(runtime.runtimeId, 'R-B1-implementer-test');
    assert.equal(runtime.expectedArtifact, 'artifacts/implementer-B1.md');
    assert.equal(list.runtimes.length, 1);
    assert.equal(list.activeRuntimes, 1);
    assert.equal(inspection.workerRuntimes.length, 1);
    assert.equal(inspection.taskRunEvidence.workerRuntimes.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resident worker runtime heartbeat renews lease without completing task', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-resident-worker-heartbeat-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const claimed = await claimResidentWorkerRuntime(root, { taskId: 'B1', runtimeId: 'R-B1-heartbeat', leaseSeconds: 60 });
    const before = claimed.runtime?.leaseExpiresAt;
    const heartbeat = await heartbeatResidentWorkerRuntime(root, { runId: claimed.runId, runtimeId: 'R-B1-heartbeat', leaseSeconds: 120 });
    const runtimeInspection = await inspectResidentWorkerRuntime(root, { runId: claimed.runId, runtimeId: 'R-B1-heartbeat' });
    const state = await readRunState(root, claimed.runId);
    const taskState = state.tasks.B1 as { status?: string } | undefined;

    assert.equal(heartbeat.status, 'active');
    assert.notEqual(heartbeat.leaseExpiresAt, before);
    assert.equal(runtimeInspection.status, 'active');
    assert.equal(state.status, 'running');
    assert.equal(taskState?.status, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resident worker runtime stale lease is visible to status and doctor', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-resident-worker-stale-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const claimed = await claimResidentWorkerRuntime(root, { taskId: 'B1', runtimeId: 'R-B1-stale', leaseSeconds: 60 });
    assert.ok(claimed.runtime);
    await writeResidentWorkerRuntimeRecord(root, {
      ...claimed.runtime,
      status: 'active',
      lastHeartbeatAt: '2000-01-01T00:00:00.000Z',
      leaseExpiresAt: '2000-01-01T00:00:01.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z'
    });

    const list = await listResidentWorkerRuntimes(root, { runId: claimed.runId });
    const status = await getProjectStatus(root, { branch: 'master' });
    const report = await doctor(root);

    assert.equal(list.staleRuntimes, 1);
    assert.equal(list.valid, false);
    assert.equal(status.latestRunEvidence?.workerRuntimes, 1);
    assert.equal(status.latestRunEvidence?.staleWorkerRuntimes, 1);
    assert.equal(report.checks.some((check) => check.check === 'resident_worker_runtime' && check.level === 'WARN' && /stale/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resident worker runtime heartbeat does not reopen terminal delegations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-resident-worker-terminal-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const claimed = await claimResidentWorkerRuntime(root, { taskId: 'B1', runtimeId: 'R-B1-terminal', leaseSeconds: 60 });
    await writeArtifact(root, claimed.runId, 'implementer-B1.md', validResultArtifact('implementer', 'B1', 'PASS', 'artifacts/implementer-B1.md'));
    const completed = await runBackgroundExecutor(root, {
      runId: claimed.runId,
      taskId: 'B1',
      artifactPath: 'artifacts/implementer-B1.md'
    });

    const heartbeat = await heartbeatResidentWorkerRuntime(root, { runId: claimed.runId, runtimeId: 'R-B1-terminal', leaseSeconds: 120 });
    const state = await readRunState(root, claimed.runId);
    const list = await listResidentWorkerRuntimes(root, { runId: claimed.runId });

    assert.equal(completed.status, 'completed');
    assert.equal(heartbeat.status, 'terminal');
    assert.equal(state.delegations['B-B1-implementer-001']?.status, 'COMPLETED');
    assert.equal(list.terminalRuntimes, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
