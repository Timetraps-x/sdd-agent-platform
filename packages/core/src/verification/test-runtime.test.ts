import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { validResultArtifact, validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { listRuntimeTestRuns } from '../storage/runtime-store.js';
import { readRunState } from '../run-state/run-state.js';
import { readArtifact, writeArtifact } from '../run-state/artifacts.js';
import { listInvocationLedgerEntries } from '../run-state/invocation-ledger.js';
import { writeVerifyContract } from './verify-contract.js';
import { renderSddTestResult, runSddTest } from './test-runtime.js';
import { runGoalVerify } from './goal-verify.js';
import { inspectSyncBack } from '../sync-back/inspect.js';
import { routeSddTask } from '../router/route-sdd-task.js';
import { doctor } from '../doctor/doctor.js';

function mappedValidationTaskMarkdown(taskId: string, command: string): string {
  return `# Tasks

### ${taskId}: Mapped validation task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
plan_refs:
  - "§4 Target Design Overview"
affected_files:
  - docs/${taskId.toLowerCase()}.md
validation:
  - ${command} => AC-1
risk: []
\`\`\`

#### Boundary

Stay in validation runtime fixtures only.

#### Acceptance

- AC-1: Parser behavior is covered.
`;
}

function sourceBoundaryMappedValidationTaskMarkdown(taskId: string, command: string): string {
  return mappedValidationTaskMarkdown(taskId, command).replace(
    `docs/${taskId.toLowerCase()}.md`,
    'packages/core/src/index.ts'
  );
}

function directSafeTaskMarkdown(taskId: string): string {
  return validTaskMarkdown(taskId, []).replace('packages/core/src/index.ts', `docs/${taskId.toLowerCase()}.md`);
}

test('runSddTest captures command output and indexes test evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-pass-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', directSafeTaskMarkdown('T1'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    const result = await runSddTest(root, {
      branch: 'feature',
      taskId: 'T1',
      commands: ['node -e "process.stdout.write(\'ok\')"']
    });

    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.commandStatus, 'PASS');
    assert.equal(result.evidenceCoverage, 'missing');
    assert.equal(result.policyJudgment, 'BLOCKED');
    assert.equal(result.syncBackReady, false);
    assert.equal(result.steps.length, 1);
    assert.equal(result.validationArtifact, 'artifacts/validation-T1.md');
    assert.equal(result.indexArtifact, 'artifacts/test-index-T1.json');

    const state = await readRunState(root, result.runId);
    assert.equal(state.phase, 'test');
    assert.equal(state.validation.status, 'blocked');
    assert.equal(state.validation.evidence.includes('artifacts/validation-T1.md'), true);

    const validation = await readArtifact(root, result.runId, 'validation-T1.md');
    assert.match(validation, /```sdd-result/);
    assert.doesNotMatch(validation, /```sdd-evidence/);
    assert.match(validation, /not explicitly mapped/);
    const ledger = await listInvocationLedgerEntries(root, result.runId);
    assert.equal(ledger.some((entry) => entry.kind === 'command' && entry.ref === 'node -e "process.stdout.write(\'ok\')"' && entry.status === 'pass'), true);

    const reviewArtifact = await writeArtifact(root, result.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    const verify = await runGoalVerify(root, {
      branch: 'feature',
      taskId: 'T1',
      runId: result.runId,
      reviewArtifact: reviewArtifact.runRelativePath,
      validationArtifact: result.validationArtifact ?? undefined
    });
    assert.equal(verify.status, 'BLOCKED');
    assert.deepEqual(verify.acceptanceCoverage.map((item) => item.status), ['MISSING']);

    const testRuns = await listRuntimeTestRuns(root, result.runId);
    assert.equal(testRuns.length, 1);
    assert.equal(testRuns[0].status, 'BLOCKED');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSddTest executes argv commands without shell and records argv evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-argv-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', directSafeTaskMarkdown('T1'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    const result = await runSddTest(root, {
      branch: 'feature',
      taskId: 'T1',
      commandInputs: [{ argv: [process.execPath, '-e', 'process.stdout.write(process.argv[1])', 'literal;not-shell'] }]
    });

    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.commandStatus, 'PASS');
    assert.equal(result.steps[0].shell, false);
    assert.deepEqual(result.steps[0].argv, [process.execPath, '-e', 'process.stdout.write(process.argv[1])', 'literal;not-shell']);

    const output = await readArtifact(root, result.runId, 'test-T1-001.log');
    assert.match(output, /literal;not-shell/);
    assert.match(output, /- shell: false/);
    const index = JSON.parse(await readArtifact(root, result.runId, 'test-index-T1.json')) as { steps: Array<{ argv: string[]; shell: boolean }> };
    assert.equal(index.steps[0].shell, false);
    assert.deepEqual(index.steps[0].argv, [process.execPath, '-e', 'process.stdout.write(process.argv[1])', 'literal;not-shell']);
    const ledger = await listInvocationLedgerEntries(root, result.runId);
    const commandEntry = ledger.find((entry) => entry.kind === 'command' && entry.status === 'pass');
    assert.equal(commandEntry?.metadata.shell, false);
    assert.equal(commandEntry?.metadata.argv, JSON.stringify([process.execPath, '-e', 'process.stdout.write(process.argv[1])', 'literal;not-shell']));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSddTest creates missing verify contract before executing commands', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-create-verify-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', mappedValidationTaskMarkdown('T1', 'node -e "process.stdout.write(\'ok\')"'));

    const result = await runSddTest(root, {
      branch: 'feature',
      taskId: 'T1',
      commands: ['node -e "process.stdout.write(\'ok\')"']
    });
    const verify = await readFile(path.join(root, 'specs', 'feature', 'verify.md'), 'utf8');

    assert.equal(result.verifyContractStatus, 'PASS');
    assert.equal(result.verifyContractAction, 'created');
    assert.equal(result.status, 'PASS');
    assert.match(verify, /author_role: verification-designer/);
    assert.match(verify, /independent_from_roles:\n  - task-planner\n  - implementer/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSddTest refreshes stale verify contract before executing commands', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-refresh-verify-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', mappedValidationTaskMarkdown('T1', 'node -e "process.stdout.write(\'ok\')"'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    await writeFile(path.join(root, 'specs', 'feature', 'tasks.md'), `${mappedValidationTaskMarkdown('T1', 'node -e "process.stdout.write(\'ok\')"')}\n<!-- changed after verify -->\n`, 'utf8');

    const result = await runSddTest(root, {
      branch: 'feature',
      taskId: 'T1',
      commands: ['node -e "process.stdout.write(\'ok\')"']
    });
    const verify = await readFile(path.join(root, 'specs', 'feature', 'verify.md'), 'utf8');

    assert.equal(result.verifyContractStatus, 'PASS');
    assert.equal(result.verifyContractAction, 'refreshed');
    assert.equal(result.commandStatus, 'PASS');
    assert.equal(result.steps.length, 1);
    assert.equal(result.status, 'PASS');
    assert.match(verify, /\| T1 \|/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSddTest produces validator evidence accepted by goal verify', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-verify-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', mappedValidationTaskMarkdown('T1', 'node -e "process.stdout.write(\'ok\')"'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    const result = await runSddTest(root, {
      branch: 'feature',
      taskId: 'T1',
      commands: ['node -e "process.stdout.write(\'ok\')"']
    });
    const reviewArtifact = await writeArtifact(root, result.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    const verify = await runGoalVerify(root, {
      branch: 'feature',
      taskId: 'T1',
      runId: result.runId,
      reviewArtifact: reviewArtifact.runRelativePath,
      validationArtifact: result.validationArtifact ?? undefined
    });

    assert.equal(verify.status, 'PASS');
    assert.equal(verify.acceptanceCoverage.every((item) => item.status === 'PASS'), true);
    assert.equal(result.evidenceCoverage, 'complete');
    assert.equal(result.policyJudgment, 'PASS');
    assert.equal(result.syncBackReady, true);
    assert.match(result.next, /^sdd sync-back inspect /);
    const testState = await readRunState(root, result.runId);
    assert.equal(testState.syncBack.status, 'proposed');
    assert.equal(testState.syncBack.proposalPath, 'artifacts/sync-back-proposal.md');
    const syncBack = await inspectSyncBack(root, { runId: result.runId, branch: 'feature', taskId: 'T1' });
    assert.equal(syncBack.status, 'ready');
    assert.equal(syncBack.proposalDigestValid, true);
    assert.deepEqual(verify.plannedCommands, ['node -e "process.stdout.write(\'ok\')"']);
    assert.deepEqual(verify.executedCommands, ['node -e "process.stdout.write(\'ok\')"']);
    const coverage = await readArtifact(root, result.runId, 'acceptance-coverage-T1.md');
    assert.match(coverage, /## Planned Validation Commands/);
    assert.match(coverage, /## Executed Runtime Commands/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSddTest records failing commands without promoting verification pass', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-fail-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', directSafeTaskMarkdown('T1'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    const result = await runSddTest(root, {
      branch: 'feature',
      taskId: 'T1',
      commands: ['node -e "process.exit(2)"']
    });

    assert.equal(result.status, 'FAIL');
    assert.equal(result.steps[0].exitCode, 2);
    const state = await readRunState(root, result.runId);
    assert.equal(state.status, 'failed');
    assert.equal(state.validation.status, 'fail');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSddTest blocks source-boundary validation before command execution', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-source-gate-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', sourceBoundaryMappedValidationTaskMarkdown('SOURCE', 'node -e "process.stdout.write(\'should-not-run\')"'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    const result = await runSddTest(root, {
      branch: 'feature',
      taskId: 'SOURCE',
      commands: ['node -e "process.stdout.write(\'should-not-run\')"']
    });

    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.lifecycleGate, 'review-before-test');
    assert.equal(result.commandStatus, 'BLOCKED');
    assert.equal(result.steps.length, 0);
    assert.match(result.primaryReason, /source, runtime state, API\/schema/);
    assert.match(result.primaryReason, /review before validation/);
    assert.match(result.next, /reviewer inspect affected files and validation commands/);
    const rendered = renderSddTestResult(result);
    assert.match(rendered, /Blocked before validation commands ran\./);
    assert.match(rendered, /Why:\n- Task SOURCE touches source, runtime state, API\/schema/);
    assert.match(rendered, /Next:\n- Have a reviewer inspect affected files and validation commands for SOURCE/);
    const ledger = await listInvocationLedgerEntries(root, result.runId);
    assert.equal(ledger.some((entry) => entry.kind === 'command'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSddTest allows source-boundary validation after reviewer checkpoint passes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-source-review-pass-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', sourceBoundaryMappedValidationTaskMarkdown('SOURCE', 'node -e "process.stdout.write(\'ok\')"'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    const blocked = await runSddTest(root, {
      branch: 'feature',
      taskId: 'SOURCE',
      commands: ['node -e "process.stdout.write(\'ok\')"']
    });
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.lifecycleGate, 'review-before-test');
    assert.equal(blocked.steps.length, 0);

    await writeArtifact(root, blocked.runId, 'review-SOURCE.md', validResultArtifact('reviewer', 'SOURCE', 'PASS', 'artifacts/review-SOURCE.md'));
    const result = await runSddTest(root, {
      branch: 'feature',
      taskId: 'SOURCE',
      runId: blocked.runId,
      commands: ['node -e "process.stdout.write(\'ok\')"']
    });

    assert.equal(result.status, 'PASS');
    assert.equal(result.lifecycleGate, 'review-before-test');
    assert.equal(result.commandStatus, 'PASS');
    assert.equal(result.steps.length, 1);
    assert.match(result.next, /^sdd sync-back inspect /);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSddTest replaces stale blocked handoff after retry pass', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-handoff-retry-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', sourceBoundaryMappedValidationTaskMarkdown('SOURCE', 'node -e "process.stdout.write(\'ok\')"'));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    const blocked = await runSddTest(root, {
      branch: 'feature',
      taskId: 'SOURCE',
      commands: ['node -e "process.stdout.write(\'ok\')"']
    });
    assert.equal(blocked.status, 'BLOCKED');

    await writeArtifact(root, blocked.runId, 'review-SOURCE.md', validResultArtifact('reviewer', 'SOURCE', 'PASS', 'artifacts/review-SOURCE.md'));
    const passed = await runSddTest(root, {
      branch: 'feature',
      taskId: 'SOURCE',
      runId: blocked.runId,
      commands: ['node -e "process.stdout.write(\'ok\')"']
    });
    const report = await doctor(root, { latestOnly: true, branch: 'feature' });

    const handoffCheck = report.checks.find((check) => check.check === 'workflow_handoff_state');

    assert.equal(passed.status, 'PASS');
    assert.notEqual(handoffCheck?.level, 'FAIL');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('runSddTest blocks downstream validation until dependencies are completed', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-runtime-dependencies-'));
  try {
    await initProject(root);
    const dep2 = mappedValidationTaskMarkdown('DEP2', 'node -e "process.stdout.write(\'should-not-run\')"')
      .replace('depends_on: []', 'depends_on:\n  - DEP1');
    await writeBranchDocs(root, 'feature', `# Tasks\n\n${validTaskMarkdown('DEP1', [])}\n${dep2}`);
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    const blockedRoute = await routeSddTask(root, { branch: 'feature', taskId: 'DEP2', approved: true });
    const blocked = await runSddTest(root, { branch: 'feature', taskId: 'DEP2', approved: true });

    assert.equal(blockedRoute.category, 'blocked');
    assert.match(blockedRoute.blockedReason ?? '', /DEP2 depends on DEP1, but DEP1 status is pending/);
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.steps.length, 0);
    assert.equal(blocked.commandStatus, 'BLOCKED');
    assert.match(blocked.gaps.join('\n'), /DEP2 depends on DEP1, but DEP1 status is pending/);

    await writeBranchDocs(root, 'feature', `# Tasks\n\n${validTaskMarkdown('DEP1', []).replace('status: pending', 'status: completed')}\n${dep2}`);
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option', force: true });
    const readyRoute = await routeSddTask(root, { branch: 'feature', taskId: 'DEP2' });
    const ready = await runSddTest(root, { branch: 'feature', taskId: 'DEP2' });

    assert.notEqual(readyRoute.category, 'blocked');
    assert.equal(readyRoute.blockedReason, null);
    assert.equal(ready.steps.length, 1);
    assert.equal(ready.status, 'PASS');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});