import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { inspectArtifactResultIngestions } from '../artifacts/ingestion.js';
import { initProject } from '../config/init-project.js';
import { getProjectStatus } from '../status/project-status.js';
import { doctor } from '../doctor/doctor.js';
import { readArtifact, writeArtifact } from '../run-state/artifacts.js';
import { inspectRun } from '../run-state/inspect-run.js';
import { rebuildLocalRunIndex } from '../run-state/run-index.js';
import { readRunEvents } from '../run-state/events.js';
import { createRun, readRunState } from '../run-state/run-state.js';
import { validResultArtifact, validTaskMarkdown, validTrustEvidence, writeBranchDocs } from '../test-support/fixtures.js';
import { bindTestRunState } from '../test-support/run-state.js';
import { renderSingleTaskLoopResult } from './rendering.js';
import { runSingleTaskLoop } from './single-task-loop.js';

const execFileAsync = promisify(execFile);

function stringifyEvents(events: Awaited<ReturnType<typeof readRunEvents>>): string {
  return events.map((event) => `${event.event}\n${event.summary ?? ''}`).join('\n');
}

test('runSingleTaskLoop completes from supplied review and validation artifacts without modifying tasks markdown', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-loop-pass-'));
  try {
    await initProject(root);
    await execFileAsync('git', ['init'], { cwd: root });
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);

    const result = await runSingleTaskLoop(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });
    const restored = await readRunState(root, state.runId);
    const ingestionInspection = await inspectArtifactResultIngestions(root, state.runId);
    await rebuildLocalRunIndex(root);
    const doctorReport = await doctor(root, { latestOnly: true });
    const events = stringifyEvents(await readRunEvents(root, state.runId));
    const tasksMarkdown = await readFile(path.join(root, 'specs', 'feature', 'tasks.md'), 'utf8');

    assert.equal(result.status, 'completed');
    assert.deepEqual(result.acceptedArtifacts, ['artifacts/review-T1.md', 'artifacts/validation-T1.md']);
    assert.equal(restored.status, 'completed');
    assert.equal(restored.currentTask, 'T1');
    assert.equal(restored.syncBack.status, 'proposed');
    assert.equal(restored.syncBack.proposalPath, 'artifacts/sync-back-proposal.md');
    assert.equal(ingestionInspection.valid, true);
    assert.deepEqual(ingestionInspection.records.map((record) => record.delegationId), ['B-T1-reviewer-001', 'B-T1-validator-001']);
    assert.equal(doctorReport.status, 'WARN');
    assert.match(events, /task_selected/);
    assert.match(events, /review_passed/);
    assert.match(events, /validation_passed/);
    assert.match(events, /delegation_started/);
    assert.match(events, /delegation_completed/);
    assert.doesNotMatch(events, /agent_completed/);
    assert.match(tasksMarkdown, /status: pending/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSingleTaskLoop blocks on missing reviewer artifact and creates gap proposal', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-loop-block-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });

    const result = await runSingleTaskLoop(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1'
    });
    const restored = await readRunState(root, state.runId);
    const gapReport = await readArtifact(root, state.runId, 'gap-report-T1.md');
    const proposal = await readArtifact(root, state.runId, 'sync-back-proposal.md');

    assert.equal(result.status, 'blocked');
    assert.equal(result.gaps.some((gap) => gap.field === 'implementer'), false);
    assert.equal(result.gaps.some((gap) => gap.field === 'reviewer'), true);
    const rendered = renderSingleTaskLoopResult(result);

    assert.match(rendered, /^SDD do task result/);
    assert.match(rendered, /status=blocked/);
    assert.match(rendered, /create or validate missing run-relative artifacts/);
    assert.match(rendered, /sdd artifact template artifacts\/review-T1.md --task T1 --agent reviewer --run run-1 --write/);
    assert.match(rendered, /sdd artifact template artifacts\/implement-T1.md --task T1 --agent implementer --run run-1 --write/);
    assert.match(rendered, /sdd artifact template artifacts\/validation-T1.md --task T1 --agent validator --run run-1 --write/);
    assert.match(rendered, /--implement-artifact artifacts\/implement-T1.md/);
    assert.match(rendered, /--validation-artifact artifacts\/validation-T1.md/);
    assert.match(rendered, /physical artifact files belong under branch evidence \.sdd\/runs\/<branchSlug>\/evidence\/artifacts\//);
    assert.match(rendered, /artifact_path_scope=CLI flags use run-relative artifacts\/<file>/);
    assert.equal(restored.status, 'blocked');
    assert.match(gapReport, /reviewer artifact was not supplied/);
    assert.match(proposal, /Proposal only/);
    const events = stringifyEvents(await readRunEvents(root, state.runId));
    assert.match(events, /delegation_failed/);
    assert.doesNotMatch(events, /agent_failed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSingleTaskLoop blocks PASS_WITH_GAPS validation with gap report and blocked sync-back proposal', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-loop-pass-with-gaps-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS_WITH_GAPS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);

    const result = await runSingleTaskLoop(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });
    const restored = await readRunState(root, state.runId);
    const gapReport = await readArtifact(root, state.runId, 'gap-report-T1.md');
    const proposal = await readArtifact(root, state.runId, 'sync-back-proposal.md');
    const events = stringifyEvents(await readRunEvents(root, state.runId));

    assert.equal(result.status, 'blocked');
    assert.equal(restored.status, 'blocked');
    assert.equal(restored.validation.status, 'pass_with_gaps');
    assert.equal(result.gaps.some((gap) => gap.field === 'validation_gaps'), true);
    assert.match(gapReport, /Validator returned PASS_WITH_GAPS/);
    assert.match(proposal, /status: blocked/);
    assert.match(proposal, /blocked gap proposal, not task completion/);
    assert.match(events, /gap_created/);
    assert.match(events, /gap_escalated/);
    assert.doesNotMatch(events, /run_completed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSingleTaskLoop persists agent and team evidence records', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase60-execution-records-'));
  try {
    await initProject(root);

    const result = await runSingleTaskLoop(root, { taskId: 'ONBOARDING-1', branch: 'master' });
    const inspection = await inspectRun(root, result.runId);
    const status = await getProjectStatus(root, { branch: 'master' });
    const report = await doctor(root);

    assert.equal(result.status, 'blocked');
    assert.equal(result.routeDecision.teamMode.decision, 'enabled');
    assert.equal(result.routeDecision.teamMode.activation, 'auto');
    assert.equal(result.routeDecision.teamMode.mode, 'review-lite');
    assert.equal(result.routeDecision.teamMode.costClass, 'low');
    assert.equal(inspection.agentExecutions.length, 2);
    const implementerRecord = inspection.agentExecutions.find((record) => record.status === 'skipped' && record.profile === 'implementer');
    const reviewerRecord = inspection.agentExecutions.find((record) => record.status === 'blocked' && record.profile === 'reviewer');
    assert.ok(implementerRecord);
    assert.ok(reviewerRecord);
    assert.equal(implementerRecord.toolPermission?.profile, 'implementer');
    assert.equal(implementerRecord.routeDecision.recommendedProfile, 'implementer');
    assert.equal(reviewerRecord.toolPermission?.profile, 'reviewer');
    assert.equal(reviewerRecord.routeDecision.recommendedProfile, 'reviewer');
    assert.match(reviewerRecord.routeId, /^[a-f0-9]{16}$/);
    assert.equal(inspection.teamSessions.length, 1);
    const teamSession = inspection.teamSessions[0];
    assert.ok(teamSession);
    assert.equal(teamSession.status, 'blocked');
    assert.equal(teamSession.teamMode.activation, 'auto');
    assert.equal(teamSession.teamMode.mode, 'review-lite');
    assert.equal(teamSession.teamMode.costClass, 'low');
    assert.match(teamSession.teamMode.reason, /review|validation/i);
    assert.equal(inspection.taskRunEvidence.teamSessions.length, inspection.teamSessions.length);
    assert.equal(status.latestRunEvidence?.routePreflight, true);
    assert.equal(status.latestRunEvidence?.agentExecutions, 2);
    assert.equal(status.latestRunEvidence?.teamSessions, 1);
    assert.equal(report.checks.some((check) => check.check === 'agent_team_execution_records' && /agent execution record/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
