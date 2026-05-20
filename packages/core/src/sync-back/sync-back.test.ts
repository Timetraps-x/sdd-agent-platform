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
import { createRun, readRunState, writeRunState } from '../run-state/run-state.js';
import { evaluateLifecycleRiskDecisionForModel, recordLifecycleRiskDecisionProjection } from '../risk.js';
import { graphTaskMarkdown, taskMarkdownWithFiles, validResultArtifact, validTaskMarkdown, validTrustEvidence, writeBranchDocs } from '../test-support/fixtures.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import { bindTestRunState, markTestRunReadyForSyncBack } from '../test-support/run-state.js';
import { runGoalVerify } from '../verification/goal-verify.js';
import { inspectVerifyContract, writeVerifyContract } from '../verification/verify-contract.js';
import { runSingleTaskLoop } from '../verification/single-task-loop.js';
import { createDelegationRecord } from '../delegation/validation.js';
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
    await writeArtifact(root, state.runId, 'sync-back-proposal.md', 'status: verified\nmodified: true\n');

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
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
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
    assert.equal(syncBack.approvalCard.contract, 'sdd-sync-back-approval-card-v1');
    assert.equal(syncBack.approvalCard.status, 'ready');
    assert.equal(syncBack.approvalCard.risk, 'review');
    assert.equal(syncBack.approvalCard.approval.requiresApproval, true);
    assert.equal(syncBack.approvalCard.proposal.digestValid, true);
    assert.match(syncBack.approvalCard.nextAction, /--approved/);
    assert.match(syncBack.approvalCard.nextAction, /Review artifacts\/sync-back-proposal\.md and apply policy/);
    assert.match(syncBack.approvalCard.nextAction, /sdd sync-back apply run-1 --branch feature --task T1 --approved/);
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

test('sync-back gates direct-safe task by task scope instead of branch lifecycle risk', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-task-scope-'));
  try {
    await initProject(root);
    const directTask = validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'docs/t1.md');
    const securityTask = validTaskMarkdown('SECURITY', [])
      .replace('packages/core/src/index.ts', 'packages/core/src/security.ts')
      .replace('risk: []', 'risk:\n  - security');
    await writeBranchDocs(root, 'feature', `${directTask}\n${securityTask}`);
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    const model = await parseSddBranch(root, 'feature');
    await recordLifecycleRiskDecisionProjection(root, evaluateLifecycleRiskDecisionForModel('feature', model));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, state.runId, 'T1');

    const syncBack = await inspectSyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.lifecycleRisk.scopeKey, 'feature:all:none:none');
    assert.notEqual(syncBack.lifecycleRisk.approvalPolicy, 'auto-allow');
    assert.equal(syncBack.status, 'ready');
    assert.equal(syncBack.applyPolicy.mode, 'direct');
    assert.equal(syncBack.applyPolicy.requiresApproval, false);
    assert.equal(syncBack.reasons.some((reason) => reason.includes('Lifecycle risk requires human approval before sync-back')), false);
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
    await bindTestRunState(root, state.runId, 'feature', 'T1');
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
    await writeVerifyContract(root, { branch: 'feature-a', branchSource: 'cli_option' });
    await writeVerifyContract(root, { branch: 'feature-b', branchSource: 'cli_option' });
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

test('sync-back inspect reports stale verify contract as diagnostic without blocking ready task', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-stale-verify-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    await writeFile(path.join(root, 'specs', 'feature', 'tasks.md'), validTaskMarkdown('T1', []).replace('validation:\n  - npm test', 'validation:\n  - npm test\n  - npm run extra'), 'utf8');
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, state.runId, 'T1');

    const syncBack = await inspectSyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.status, 'ready');
    assert.equal(syncBack.verifyContractStatus, 'WARN');
    assert.match(syncBack.staleVerifyRecoveryCommand ?? '', /sdd verifies write --branch feature --force/);
    assert.equal(syncBack.reasons.some((reason) => reason.includes('Verify contract is WARN')), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync-back inspect reports missing verify contract as diagnostic without blocking ready task', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-missing-verify-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, state.runId, 'T1');

    const syncBack = await inspectSyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.status, 'ready');
    assert.equal(syncBack.verifyContractStatus, 'WARN');
    assert.equal(syncBack.verifyContractIssues.some((issue) => issue.field === 'verify.md'), true);
    assert.match(syncBack.staleVerifyRecoveryCommand ?? '', /sdd verifies write --branch feature --force/);
    assert.equal(syncBack.reasons.some((reason) => reason.includes('Verification contract document is missing.')), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync-back apply refreshes stale verify contract when explicitly requested', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-refresh-verify-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    await writeFile(path.join(root, 'specs', 'feature', 'tasks.md'), validTaskMarkdown('T1', []).replace('validation:\n  - npm test', 'validation:\n  - npm test\n  - npm run extra'), 'utf8');
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, state.runId, 'T1');

    const applied = await applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1', refreshVerify: true, approved: true });
    const verify = await readFile(path.join(root, 'specs', 'feature', 'verify.md'), 'utf8');

    assert.equal(applied.applied, true);
    assert.equal(applied.verifyRefreshed, true);
    assert.equal(applied.inspection.status, 'applied');
    assert.match(verify, /npm run extra/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync-back apply refreshes verify contract after tasks writeback', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-post-apply-refresh-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'docs/T1.md'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, state.runId, 'T1');

    const applied = await applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1', refreshVerify: true });
    const verify = await inspectVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    const status = await getProjectStatus(root, { branch: 'feature' });

    assert.equal(applied.applied, true);
    assert.equal(applied.verifyRefreshed, true);
    assert.equal(applied.inspection.status, 'applied');
    assert.equal(verify.status, 'PASS');
    assert.equal(status.gaps.length, 0);
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
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
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
    assert.equal(syncBack.approvalCard.status, 'blocked');
    assert.equal(syncBack.approvalCard.risk, 'blocked');
    assert.deepEqual(syncBack.approvalCard.affectedFileConflicts.map((entry) => entry.runId), ['run-b']);
    assert.equal(syncBack.approvalCard.blockers.some((reason) => reason.includes('Affected file packages/core/src/index.ts')), true);
    assert.equal(syncBack.reasons.some((reason) => reason.includes('Affected file packages/core/src/index.ts')), true);
    assert.equal(status.affectedFileConflicts.length > 0, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync-back ignores superseded failed retry runs for the same task and file', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-retry-conflict-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'docs/retry.md'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    const failed = await createRun(root, { runId: 'run-failed' });
    await bindTestRunState(root, failed.runId, 'feature', 'T1');
    await writeRunState(root, {
      ...await readRunState(root, failed.runId),
      status: 'failed',
      validation: { status: 'fail', commands: ['npm test'], evidence: [] }
    });
    const retry = await createRun(root, { runId: 'run-retry' });
    await bindTestRunState(root, retry.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, retry.runId, 'T1');

    const syncBack = await inspectSyncBack(root, { runId: retry.runId, branch: 'feature', taskId: 'T1' });
    const applied = await applySyncBack(root, { runId: retry.runId, branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.status, 'ready');
    assert.deepEqual(syncBack.affectedFileConflicts, []);
    assert.equal(applied.applied, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync-back ignores foreground non-authoritative observer runs as affected-file conflicts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-foreground-conflict-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'docs/observer.md'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
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
    const main = await createRun(root, { runId: 'run-main' });
    await bindTestRunState(root, main.runId, 'feature', 'T1');
    await markTestRunReadyForSyncBack(root, main.runId, 'T1');

    const syncBack = await inspectSyncBack(root, { runId: main.runId, branch: 'feature', taskId: 'T1' });

    assert.equal(syncBack.status, 'ready');
    assert.deepEqual(syncBack.affectedFileConflicts, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync-back blocks downstream apply until dependencies are completed', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-syncback-dependencies-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', `# Tasks\n\n${validTaskMarkdown('DEP1', [])}\n${validTaskMarkdown('DEP2', ['DEP1']).replace('packages/core/src/index.ts', 'docs/dep2.md')}`);
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    const state = await createRun(root, { runId: 'run-dep2' });
    await bindTestRunState(root, state.runId, 'feature', 'DEP2');
    await markTestRunReadyForSyncBack(root, state.runId, 'DEP2');

    const syncBack = await inspectSyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'DEP2' });

    assert.equal(syncBack.status, 'blocked');
    assert.equal(syncBack.reasons.some((reason) => reason.includes('DEP2 depends on DEP1, but DEP1 status is pending')), true);
    await assert.rejects(
      () => applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'DEP2', approved: true }),
      /DEP2 depends on DEP1/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});