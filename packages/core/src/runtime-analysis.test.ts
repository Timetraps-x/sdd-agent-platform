import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { initProject } from './config/init-project.js';
import { writeArtifact } from './run-state/artifacts.js';
import { createRun } from './run-state/run-state.js';
import { validResultArtifact, validTaskMarkdown, validTrustEvidence, writeBranchDocs } from './test-support/fixtures.js';
import { bindTestRunState } from './test-support/run-state.js';
import { runGoalVerify } from './verification/goal-verify.js';
import { buildRuntimeAnalysisReport } from './runtime-analysis.js';

const execFileAsync = promisify(execFile);

test('runtime analysis report composes workflow runtime evidence and non-authoritative projections', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-analysis-'));
  try {
    await initProject(root);
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', 'feature'], { cwd: root });
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);
    await runGoalVerify(root, {
      runId: state.runId,
      branch: 'feature',
      taskId: 'T1',
      reviewArtifact: 'artifacts/review-T1.md',
      validationArtifact: 'artifacts/validation-T1.md'
    });

    const report = await buildRuntimeAnalysisReport(root, { branch: 'feature', runId: state.runId, taskId: 'T1', profile: 'brief' });

    assert.equal(report.contract, 'phase-7-runtime-analysis-v1');
    assert.equal(report.authoritative, false);
    assert.equal(report.usableForPass, false);
    assert.equal(report.status !== 'PASS', true);
    assert.equal(report.branch, 'feature');
    assert.equal(report.selectedRunId, state.runId);
    assert.equal(report.selectedTaskId, 'T1');
    assert.equal(report.workflow.latestRun?.runId, state.runId);
    assert.equal(report.runIndex.exists, true);
    assert.equal(report.taskGraph.nodes.some((node) => node.taskId === 'T1'), true);
    assert.equal(report.wavePlan.summary.tasks, 1);
    assert.equal(report.runInspection?.summary.runId, state.runId);
    assert.equal(report.evidenceSummary?.runId, state.runId);
    assert.equal(report.evidenceSummary?.authoritative, false);
    assert.equal(report.evidenceSummary?.usableForPass, false);
    assert.equal(report.contextPackage?.taskId, 'T1');
    assert.equal(report.contextPackage?.authoritative, false);
    assert.equal(report.contextPackage?.usableForPass, false);
    assert.equal(report.syncBack?.status, 'ready');
    assert.equal(report.findings.some((finding) => finding.category === 'sync_back' && finding.action?.includes('sdd sync-back apply run-1 --branch feature --task T1')), true);
    assert.equal(report.findings.some((finding) => finding.category === 'evidence' && finding.message.includes('cannot satisfy PASS evidence')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
