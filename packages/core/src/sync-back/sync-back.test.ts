import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { initProject } from '../config/init-project.js';
import { getProjectStatus } from '../status/project-status.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { queryLocalRunIndex, rebuildLocalRunIndex } from '../run-state/run-index.js';
import { createRun } from '../run-state/run-state.js';
import { graphTaskMarkdown, taskMarkdownWithFiles, validResultArtifact, validTaskMarkdown, validTrustEvidence, writeBranchDocs } from '../test-support/fixtures.js';
import { bindTestRunState, markTestRunReadyForSyncBack } from '../test-support/run-state.js';
import { runGoalVerify } from '../verification/goal-verify.js';
import { runSingleTaskLoop } from '../verification/single-task-loop.js';
import { applySyncBack } from './apply.js';
import { inspectSyncBack } from './inspect.js';

const execFileAsync = promisify(execFile);

test('sync-back inspect blocks modified proposal digest', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-digest-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, state.runId, 'T1');
    await writeFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'sync-back-proposal.md'), 'status: verified\nmodified: true\n', 'utf8');

    const syncBack = await inspectSyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.status, 'blocked');
    assert.equal(syncBack.proposalDigestValid, false);
    assert.equal(syncBack.reasons.some((reason) => reason.includes('digest changed')), true);
    await assert.rejects(
      () => applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' }),
      /digest changed/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync-back apply requires approval for risky complex tasks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-approval-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', `# Tasks\n\n${graphTaskMarkdown('T1', [], ['packages/core/src/index.ts'], ['database'])}`);
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'Graph output is inspectable.', 'artifacts/validation-T1.md')}`);

    await runGoalVerify(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });

    const syncBack = await inspectSyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.status, 'ready');
    assert.equal(syncBack.applyPolicy.mode, 'confirm');
    assert.equal(syncBack.applyPolicy.requiresApproval, true);
    assert.equal(syncBack.applyPolicy.reasons.some((reason) => reason.includes('risk tags')), true);
    await assert.rejects(
      () => applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' }),
      /--approved/
    );

    const applied = await applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1', approved: true });
    const tasksAfterSyncBack = await readFile(path.join(root, 'specs', 'feature', 'tasks.md'), 'utf8');

    assert.equal(applied.applied, true);
    assert.match(tasksAfterSyncBack, /status: completed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync-back apply rejects blocked runs and reports inspect reasons', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-blocked-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS_WITH_GAPS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);

    await runSingleTaskLoop(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });

    const syncBack = await inspectSyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.status, 'blocked');
    assert.equal(syncBack.reasons.some((reason) => reason.includes('Run status is blocked')), true);
    assert.equal(syncBack.reasons.some((reason) => reason.includes('validation status is pass_with_gaps')), true);
    await assert.rejects(
      () => applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' }),
      /Cannot apply sync-back for run-1/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.5 resolves latest eligible run by partition and task without run id', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase65-resolver-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature-a', validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'packages/core/src/a.ts'));
    await writeBranchDocs(root, 'feature-b', validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'packages/core/src/b.ts'));
    const runA = await createRun(root, { runId: 'run-a' });
    await bindTestRunState(root, runA.runId, 'feature-a', 'T1');
    await markTestRunReadyForSyncBack(root, runA.runId, 'T1');
    const runB = await createRun(root, { runId: 'run-b' });
    await bindTestRunState(root, runB.runId, 'feature-b', 'T1');
    await markTestRunReadyForSyncBack(root, runB.runId, 'T1');

    const index = await rebuildLocalRunIndex(root);
    const featureA = await inspectSyncBack(root, { branch: 'feature-a', taskId: 'T1' });
    const featureB = await inspectSyncBack(root, { branch: 'feature-b', taskId: 'T1' });
    const queried = await queryLocalRunIndex(root, { partition: 'feature-a', taskId: 'T1' });

    assert.deepEqual(index.latestByPartitionTask.map((entry) => `${entry.partition}:${entry.taskId}:${entry.runId}`).sort(), ['feature-a:T1:run-a', 'feature-b:T1:run-b']);
    assert.equal(featureA.runId, 'run-a');
    assert.equal(featureA.status, 'ready');
    assert.equal(featureB.runId, 'run-b');
    assert.equal(featureB.status, 'ready');
    assert.deepEqual(queried.latestByPartitionTask.map((entry) => entry.runId), ['run-a']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.5 marks changed documents as stale and blocks sync-back apply', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase65-stale-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, state.runId, 'T1');
    await writeFile(path.join(root, 'specs', 'feature', 'tasks.md'), `${validTaskMarkdown('T1', [])}\n<!-- changed after run -->\n`, 'utf8');

    const syncBack = await inspectSyncBack(root, { branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.runId, state.runId);
    assert.equal(syncBack.status, 'blocked');
    assert.equal(syncBack.staleReasons.some((reason) => reason.includes('tasks.md')), true);
    await assert.rejects(
      () => applySyncBack(root, { branch: 'feature', taskId: 'T1' }),
      /Run snapshot/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.5 requires approval before sync-back apply on the wrong Git branch', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase65-wrong-branch-'));
  try {
    await initProject(root);
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', 'other'], { cwd: root });
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, state.runId, 'T1');

    const syncBack = await inspectSyncBack(root, { branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.status, 'ready');
    assert.equal(syncBack.applyPolicy.requiresApproval, true);
    assert.equal(syncBack.applyPolicy.reasons.some((reason) => reason.includes('Current Git branch is other')), true);
    await assert.rejects(
      () => applySyncBack(root, { branch: 'feature', taskId: 'T1' }),
      /--approved/
    );
    const applied = await applySyncBack(root, { branch: 'feature', taskId: 'T1', approved: true });
    assert.equal(applied.applied, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.5 reports active affected file conflicts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase65-affected-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', `# Tasks\n\n${taskMarkdownWithFiles('T1', ['packages/core/src/index.ts'], [])}\n${taskMarkdownWithFiles('T2', ['packages/core/src/index.ts'], [])}`);
    const runA = await createRun(root, { runId: 'run-a' });
    await bindTestRunState(root, runA.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, runA.runId, 'T1');
    const runB = await createRun(root, { runId: 'run-b' });
    await bindTestRunState(root, runB.runId, 'feature', 'T2');
    await markTestRunReadyForSyncBack(root, runB.runId, 'T2');

    const syncBack = await inspectSyncBack(root, { runId: runA.runId, branch: 'feature', taskId: 'T1' });
    const status = await getProjectStatus(root, { branch: 'feature' });

    assert.equal(syncBack.status, 'blocked');
    assert.deepEqual(syncBack.affectedFileConflicts.map((entry) => entry.runId), ['run-b']);
    assert.equal(syncBack.reasons.some((reason) => reason.includes('Affected file packages/core/src/index.ts')), true);
    assert.equal(status.affectedFileConflicts.length > 0, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
