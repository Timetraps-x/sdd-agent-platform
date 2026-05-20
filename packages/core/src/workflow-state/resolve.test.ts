import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { createRun, readRunState, writeRunState } from '../run-state/run-state.js';
import { validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { bindTestRunState, markTestRunReadyForSyncBack } from '../test-support/run-state.js';
import { createDelegationRecord } from '../delegation/validation.js';
import { resolveWorkflowState } from './resolve.js';

test('workflow state resolver projects branch docs latest run and next action', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-workflow-state-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const run = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, run.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, run.runId, 'T1');

    const workflow = await resolveWorkflowState(root, { branch: 'feature', taskId: 'T1' });

    assert.equal(workflow.contract, 'phase-7.3-workflow-state-resolver-v1');
    assert.equal(workflow.workflowStatus, 'active');
    assert.equal(workflow.latestRun?.runId, 'run-1');
    assert.deepEqual(workflow.latestRunsByTask.map((entry) => `${entry.partition}:${entry.taskId}:${entry.runId}`), ['feature:T1:run-1']);
    assert.equal(workflow.taskCounts.total, 1);
    assert.equal(workflow.recommendedNextCommand, 'sdd sync-back inspect --branch feature --task T1');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow state resolver reports affected-file conflicts without run-index rebuild', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-workflow-state-conflict-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', `${validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'src/shared.ts')}\n${validTaskMarkdown('T2', []).replace('T1', 'T2').replace('packages/core/src/index.ts', 'src/shared.ts')}`);
    const runA = await createRun(root, { runId: 'run-a' });
    await bindTestRunState(root, runA.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, runA.runId, 'T1');
    const runB = await createRun(root, { runId: 'run-b' });
    await bindTestRunState(root, runB.runId, 'feature', 'T2');
    const archived = await createRun(root, { runId: 'run-c' });
    await writeRunState(root, { ...archived, status: 'archived' });

    const workflow = await resolveWorkflowState(root, { branch: 'feature', taskId: 'T1' });

    assert.deepEqual(workflow.affectedFileConflicts.map((entry) => entry.runId), ['run-b']);
    assert.equal(workflow.blockingReasons.some((reason) => reason.includes('src/shared.ts')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow state ignores superseded failed and foreground observer conflict candidates', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-workflow-state-filtered-conflicts-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'docs/t1.md'));
    const failed = await createRun(root, { runId: 'run-failed' });
    await bindTestRunState(root, failed.runId, 'feature', 'T1');
    await writeRunState(root, {
      ...await readRunState(root, failed.runId),
      status: 'failed',
      validation: { status: 'fail', commands: ['npm test'], evidence: [] }
    });
    const observer = await createRun(root, { runId: 'run-observer' });
    await bindTestRunState(root, observer.runId, 'feature', 'T1');
    const delegation = createDelegationRecord({
      delegationId: 'F-T1-observer-001',
      task: 'T1',
      agent: 'observer',
      runMode: 'foreground',
      blocking: false,
      requiredForPhaseExit: false,
      expectedArtifact: 'artifacts/observer-T1.md'
    });
    await writeRunState(root, {
      ...await readRunState(root, observer.runId),
      status: 'completed',
      phase: 'foreground-subagents',
      delegations: { [delegation.delegationId]: { ...delegation, status: 'COMPLETED', terminalEventAt: new Date().toISOString() } }
    });
    const retry = await createRun(root, { runId: 'run-retry' });
    await bindTestRunState(root, retry.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, retry.runId, 'T1');

    const workflow = await resolveWorkflowState(root, { branch: 'feature', taskId: 'T1' });

    assert.equal(workflow.latestRun?.runId, 'run-retry');
    assert.deepEqual(workflow.affectedFileConflicts, []);
    assert.equal(workflow.blockingReasons.some((reason) => reason.includes('Affected file')), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workflow state resolver surfaces dependency blockers and points next action upstream', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-workflow-state-dependencies-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', `# Tasks\n\n${validTaskMarkdown('DEP1', [])}\n${validTaskMarkdown('DEP2', ['DEP1']).replace('packages/core/src/index.ts', 'docs/dep2.md')}`);

    const workflow = await resolveWorkflowState(root, { branch: 'feature', taskId: 'DEP2' });

    assert.deepEqual(workflow.dependencyBlockers.map((blocker) => `${blocker.taskId}->${blocker.dependencyId}`), ['DEP2->DEP1']);
    assert.equal(workflow.blockingReasons.some((reason) => reason.includes('DEP2 depends on DEP1')), true);
    assert.equal(workflow.recommendedNextCommand, 'sdd tasks inspect DEP1 --branch feature');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});