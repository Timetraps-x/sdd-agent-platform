import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { ingestArtifactResult } from '../artifacts/ingestion.js';
import { renderSddResultArtifactTemplate } from '../artifacts/templates.js';
import { initProject } from '../config/init-project.js';
import { getProjectStatus } from '../status/project-status.js';
import { createDelegationRecord } from '../delegation/validation.js';
import { doctor } from '../doctor/doctor.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { appendEvent, readRunEvents } from '../run-state/events.js';
import { listInvocationLedgerEntries } from '../run-state/invocation-ledger.js';
import { inspectRun } from '../run-state/inspect-run.js';
import { queryLocalRunIndex } from '../run-state/run-index.js';
import { createRun, listRuns, readRunState, writeRunState } from '../run-state/run-state.js';
import { applySyncBack } from '../sync-back/apply.js';
import { inspectSyncBack } from '../sync-back/inspect.js';
import { hashTestDocument, validResultArtifact, validTaskMarkdown, validTrustEvidence, writeBranchDocs } from '../test-support/fixtures.js';
import { bindTestRunState } from '../test-support/run-state.js';
import { getRuntimeStorePath } from '../runtime-paths.js';
import { runGoalVerify } from './goal-verify.js';

const execFileAsync = promisify(execFile);

test('runGoalVerify blocks when acceptance evidence is missing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verify-gap-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md'));

    const result = await runGoalVerify(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });
    const restored = await readRunState(root, state.runId);
    const coverage = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'acceptance-coverage-T1.md'), 'utf8');

    assert.equal(result.status, 'BLOCKED');
    assert.equal(restored.status, 'blocked');
    assert.equal(result.gaps.some((gap) => gap.field === 'acceptance_coverage'), true);
    assert.match(coverage, /No policy-backed acceptance evidence/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runGoalVerify blocks when validator artifact only includes generated acceptance mapping', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verify-template-pass-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    const validationTemplate = await renderSddResultArtifactTemplate(root, {
      branch: 'feature',
      taskId: 'T1',
      agent: 'validator',
      artifactPath: 'artifacts/validation-T1.md'
    });
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', validationTemplate);

    const result = await runGoalVerify(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });

    assert.equal(result.status, 'BLOCKED');
    assert.deepEqual(result.acceptanceCoverage.map((item) => item.status), ['REFERENCED_ONLY']);
    assert.equal(result.gaps.some((gap) => gap.field === 'acceptance_coverage'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runGoalVerify blocks source evidence without invocation ledger corroboration', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verify-ledger-gap-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    const weakEvidence = `\n\`\`\`sdd-evidence\ncontract: sdd-evidence-v1\nversion: 1.0.0\ntask: T1\nacceptance: AC-1\nstatus: PASS\nclaim: Validation proves AC-1.\nsource_artifact: artifacts/validation-T1.md\nevidence_refs:\n  - command:npm run missing\n  - material:external-corpus\nprovenance_refs:\n  - artifact:artifacts/validation-T1.md\n  - material:external-corpus\npolicy_refs:\n  - acceptance-policy-v1:require-source-evidence\n\`\`\`\n`;
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${weakEvidence}`);

    const result = await runGoalVerify(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });

    assert.equal(result.status, 'BLOCKED');
    assert.deepEqual(result.acceptanceCoverage.map((item) => item.status), ['BLOCKED']);
    assert.equal(result.acceptanceCoverage[0].issueCodes?.includes('MISSING_COMMAND_OUTPUT'), true);
    assert.equal(result.acceptanceCoverage[0].issueCodes?.includes('MISSING_MATERIAL_REFERENCE'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runGoalVerify fails closed for cross-partition admitted evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verify-partition-scope-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    const boundState = await readRunState(root, state.runId);
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      expectedArtifact: 'artifacts/validation-T1.md'
    });
    await writeRunState(root, { ...boundState, delegations: { ...boundState.delegations, [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);
    await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/validation-T1.md' });
    const db = new DatabaseSync(getRuntimeStorePath(root));
    try {
      db.prepare('UPDATE evidence_claims SET partition = ? WHERE run_id = ?').run('other', state.runId);
    } finally {
      db.close();
    }

    const result = await runGoalVerify(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });
    const report = await doctor(root, { latestOnly: true, branch: 'feature' });

    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.gaps.some((gap) => gap.field === 'runtime_scope'), true);
    assert.deepEqual(result.acceptanceCoverage.map((item) => item.status), ['BLOCKED']);
    assert.equal(report.checks.some((check) => check.check === 'runtime_partition_scope' && check.level === 'FAIL'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('runGoalVerify maps validation evidence to acceptance and writes sync-back proposal', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verify-pass-'));
  try {
    await initProject(root);
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', 'feature'], { cwd: root });
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);

    const result = await runGoalVerify(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });
    const restored = await readRunState(root, state.runId);
    const coverage = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'acceptance-coverage-T1.md'), 'utf8');
    const proposal = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'sync-back-proposal.md'), 'utf8');
    const events = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'events.jsonl'), 'utf8');
    const tasksBeforeSyncBack = await readFile(path.join(root, 'specs', 'feature', 'tasks.md'), 'utf8');

    assert.equal(result.status, 'PASS');
    assert.equal(result.standardStatus, 'PASS');
    assert.equal(restored.phase, 'verify');
    assert.equal(restored.validation.status, 'pass');
    assert.deepEqual(result.acceptanceCoverage.map((item) => item.status), ['PASS']);
    assert.deepEqual(result.acceptanceCoverage.map((item) => item.acceptance), ['AC-1']);
    assert.match(coverage, /Acceptance Mapping/);
    assert.match(coverage, /AC-1/);
    assert.match(proposal, /status: verified/);
    assert.equal(restored.syncBack.proposalDigest, hashTestDocument(proposal));
    assert.equal(restored.syncBack.sourceVerifyStatus, 'PASS');
    assert.match(events, /Phase 1.9 goal-level verify PASS/);
    assert.match(tasksBeforeSyncBack, /status: pending/);

    const runs = await listRuns(root);
    const inspection = await inspectRun(root, state.runId);
    const status = await getProjectStatus(root, { branch: 'feature' });
    const syncBack = await inspectSyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });

    assert.equal(runs[0].runId, state.runId);
    assert.equal(runs[0].validationStatus, 'pass');
    assert.equal(runs[0].syncBackStatus, 'proposed');
    assert.equal(inspection.summary.runId, state.runId);
    assert.equal(inspection.validation.status, 'pass');
    assert.equal(inspection.syncBack.status, 'proposed');
    assert.equal(inspection.eventCount > 0, true);
    assert.equal(inspection.recentEvents.length > 0, true);
    assert.equal(inspection.taskRunEvidence.version, 'phase-5.3-task-run-evidence-v1');
    assert.equal(inspection.taskRunEvidence.runId, state.runId);
    assert.equal(inspection.taskRunEvidence.validation.status, 'pass');
    assert.equal(inspection.taskRunEvidence.syncBackProposal, 'artifacts/sync-back-proposal.md');
    assert.equal(inspection.invocationLedger.some((entry) => entry.kind === 'artifact_hash' && entry.ref === 'artifacts/sync-back-proposal.md'), true);
    assert.equal(inspection.taskRunEvidence.invocationLedger.some((entry) => entry.kind === 'artifact_hash' && entry.ref === 'artifacts/sync-back-proposal.md'), true);
    assert.equal(status.latestRun?.runId, state.runId);
    assert.equal(status.tasks.pending, 1);
    assert.equal(status.recommendedNextCommand, 'sdd sync-back inspect --branch feature --task T1');
    assert.equal(syncBack.status, 'ready');
    assert.equal(syncBack.markdownStatus, 'pending');
    assert.match(syncBack.proposal ?? '', /status: verified/);
    assert.equal(syncBack.proposalDigest, restored.syncBack.proposalDigest);
    assert.equal(syncBack.proposalDigestValid, true);
    assert.equal(syncBack.applyPolicy.mode, 'direct');
    assert.equal(syncBack.applyPolicy.requiresApproval, false);

    const ledgerBeforeRerun = await listInvocationLedgerEntries(root, state.runId);
    await runGoalVerify(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });
    const ledgerAfterRerun = await listInvocationLedgerEntries(root, state.runId);
    assert.equal(ledgerAfterRerun.filter((entry) => entry.kind === 'artifact_hash').length, ledgerBeforeRerun.filter((entry) => entry.kind === 'artifact_hash').length);
    assert.equal(ledgerAfterRerun.filter((entry) => entry.kind === 'command' && entry.status === 'declared').length, ledgerBeforeRerun.filter((entry) => entry.kind === 'command' && entry.status === 'declared').length);

    const applied = await applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });
    const tasksAfterSyncBack = await readFile(path.join(root, 'specs', 'feature', 'tasks.md'), 'utf8');
    const appliedState = await readRunState(root, state.runId);
    const appliedEvents = await readRunEvents(root, state.runId);

    assert.equal(applied.applied, true);
    assert.match(tasksAfterSyncBack, /status: completed/);
    assert.match(tasksAfterSyncBack, /Sync-back applied from run `run-1`/);
    assert.match(tasksAfterSyncBack, /sync-back-proposal\.md/);
    assert.equal(appliedState.syncBack.status, 'applied');
    assert.equal(appliedEvents.some((event) => event.event === 'sync_back_applied'), true);

    const postApplyIndex = await queryLocalRunIndex(root, { runId: state.runId });
    const postApplyDoctor = await doctor(root, { latestOnly: true });
    const postApplyStatus = await getProjectStatus(root, { branch: 'feature' });

    assert.equal(postApplyIndex.runs[0]?.syncBackStatus, 'applied');
    assert.equal(appliedState.documentSnapshot.tasksHash, postApplyStatus.documents.tasksHash);
    assert.deepEqual(postApplyStatus.latestRunStaleReasons, []);
    assert.equal(postApplyDoctor.checks.some((check) => check.check === 'local_run_index' && check.level === 'WARN'), false);

    const repeated = await applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });
    const repeatedTasks = await readFile(path.join(root, 'specs', 'feature', 'tasks.md'), 'utf8');

    assert.equal(repeated.applied, false);
    assert.equal(repeatedTasks.match(/Sync-back applied from run `run-1`/g)?.length, 1);

    const reverified = await runGoalVerify(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });
    const reverifiedState = await readRunState(root, state.runId);
    const reverifiedProposal = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'sync-back-proposal.md'), 'utf8');
    assert.equal(reverified.status, 'PASS');
    assert.equal(reverifiedState.syncBack.status, 'applied');
    assert.equal(reverifiedState.syncBack.proposalDigest, hashTestDocument(reverifiedProposal));

    await writeRunState(root, { ...appliedState, documentSnapshot: restored.documentSnapshot });
    const legacyAppliedStatus = await getProjectStatus(root, { branch: 'feature' });
    assert.deepEqual(legacyAppliedStatus.latestRunStaleReasons, []);

    await writeFile(path.join(root, 'specs', 'feature', 'tasks.md'), `${repeatedTasks}\n<!-- external edit after apply -->\n`, 'utf8');
    const externalEditTime = new Date(Date.now() + 5000);
    await utimes(path.join(root, 'specs', 'feature', 'tasks.md'), externalEditTime, externalEditTime);
    const externallyChangedStatus = await getProjectStatus(root, { branch: 'feature' });
    assert.equal(
      externallyChangedStatus.latestRunStaleReasons.some((reason) => reason.includes('Run snapshot for tasks.md')),
      true
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
