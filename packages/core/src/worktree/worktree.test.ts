import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { initProject } from '../config/init-project.js';
import { doctor } from '../doctor/doctor.js';
import { readRunEvents } from '../run-state/events.js';
import { createRun, readRunState } from '../run-state/run-state.js';
import { taskMarkdownWithFiles, writeBranchDocs } from '../test-support/fixtures.js';
import { inspectWorktreeIsolation } from './isolation.js';
import { createWorktreeLifecycle, inspectWorktreeLifecycle, keepWorktreeLifecycle, removeWorktreeLifecycle } from './lifecycle.js';

const execFileAsync = promisify(execFile);

test('worktree isolation blocks writable overlapping tasks and allows read-only', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-isolation-overlap-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${taskMarkdownWithFiles('T1', ['packages/core/src/index.ts'], [])}\n${taskMarkdownWithFiles('T2', ['./packages/core/src/index.ts'], [])}`);

    const blocked = await inspectWorktreeIsolation(root, {
      taskId: 'T1',
      capabilityId: 'native-file-edit',
      peerTaskIds: ['T2']
    });
    const readOnly = await inspectWorktreeIsolation(root, {
      taskId: 'T1',
      capabilityId: 'git-local',
      peerTaskIds: ['T2']
    });

    assert.equal(blocked.mode, 'blocked');
    assert.equal(blocked.safeConcurrency, false);
    assert.deepEqual(blocked.overlaps, [{ peerTaskId: 'T2', files: ['packages/core/src/index.ts'] }]);
    assert.equal(blocked.gates.find((gate) => gate.name === 'unsafe_concurrency')?.passed, false);
    assert.equal(readOnly.mode, 'none');
    assert.equal(readOnly.safeConcurrency, true);
    assert.equal(readOnly.capabilitySideEffect, 'read_only');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('worktree isolation marks high-risk writable task as manual or required', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-isolation-risk-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${taskMarkdownWithFiles('T1', ['db/schema.sql'], ['database'])}\n${taskMarkdownWithFiles('T2', ['packages/core/src/index.ts'], ['state-machine'])}`);

    const manual = await inspectWorktreeIsolation(root, { taskId: 'T1', capabilityId: 'native-file-edit' });
    const required = await inspectWorktreeIsolation(root, { taskId: 'T2', capabilityId: 'native-file-edit' });

    assert.equal(manual.mode, 'manual');
    assert.equal(manual.reasons.some((reason) => reason.includes('manual isolation gate')), true);
    assert.equal(required.mode, 'required');
    assert.equal(required.reasons.some((reason) => reason.includes('High-risk writable task')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports worktree isolation contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-isolation-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'worktree_isolation_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.7-worktree-isolation-contract-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('worktree lifecycle creates and removes clean tracked worktree', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-worktree-clean-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${taskMarkdownWithFiles('T1', ['packages/core/src/index.ts'], [])}`);
    await initializeGitRepository(root);
    await createRun(root, { runId: 'run-1' });

    const created = await createWorktreeLifecycle(root, 'run-1', { taskId: 'T1', worktreeId: 'wt-run-1-T1' });
    const createdState = await readRunState(root, 'run-1');
    const createdEvents = await readRunEvents(root, 'run-1');
    const removed = await removeWorktreeLifecycle(root, 'run-1', 'wt-run-1-T1');
    const inspection = await inspectWorktreeLifecycle(root, 'run-1');
    const removedEvents = await readRunEvents(root, 'run-1');

    assert.equal(created.status, 'created');
    assert.equal(created.contract, 'phase-3.8-worktree-lifecycle-v1');
    assert.equal(createdState.worktrees['wt-run-1-T1'].worktreePath, created.worktreePath);
    assert.equal(createdEvents.some((event) => event.event === 'worktree_created'), true);
    assert.equal(removed.status, 'removed');
    assert.equal(inspection.valid, true);
    assert.equal(removedEvents.some((event) => event.event === 'worktree_removed'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('worktree lifecycle refuses dirty remove and can keep for inspection', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-worktree-dirty-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${taskMarkdownWithFiles('T1', ['packages/core/src/index.ts'], [])}`);
    await initializeGitRepository(root);
    await createRun(root, { runId: 'run-1' });

    const created = await createWorktreeLifecycle(root, 'run-1', { taskId: 'T1', worktreeId: 'wt-run-1-T1' });
    await writeFile(path.join(root, created.worktreePath, 'dirty.txt'), 'dirty', 'utf8');
    await assert.rejects(removeWorktreeLifecycle(root, 'run-1', 'wt-run-1-T1'), /Refusing to remove dirty worktree/);
    const kept = await keepWorktreeLifecycle(root, 'run-1', 'wt-run-1-T1', { reason: 'manual inspection' });
    const inspection = await inspectWorktreeLifecycle(root, 'run-1');

    assert.equal(kept.status, 'kept');
    assert.equal(kept.dirty, true);
    assert.equal(inspection.valid, false);
    assert.equal(inspection.issues.some((issue) => issue.field === 'dirty'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports worktree lifecycle contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-worktree-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'worktree_lifecycle_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.8-worktree-lifecycle-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function initializeGitRepository(root: string): Promise<void> {
  await execFileAsync('git', ['-C', root, 'init']);
  await execFileAsync('git', ['-C', root, 'add', '.']);
  await execFileAsync('git', ['-C', root, '-c', 'user.name=sdd-test', '-c', 'user.email=sdd-test@example.com', 'commit', '--allow-empty', '-m', 'init']);
}
