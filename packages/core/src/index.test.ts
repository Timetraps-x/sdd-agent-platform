import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { access, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';


import {
  appendEvent,
  applyAiToolEntries,
  applySyncBack,
  checkAiToolEntryDrift,
  createDelegationRecord,
  claimResidentWorkerRuntime,
  heartbeatResidentWorkerRuntime,
  createWorktreeLifecycle,
  ingestArtifactResult,
  createRun,
  archiveRun,
  doctor,
  buildContextBuildPackage,
  buildEvidenceSummaryProjection,
  evaluateLifecycleDecisionGate,
  extractLifecycleRiskSignalsFromText,
  evaluateGovernancePolicy,
  getArtifactPath,
  getProjectStatus,
  getDelegationStateMachine,
  getRunRelativeArtifactPath,
  getRuntimeStorePath,
  getInvocationLedgerPath,
  contextBudgetForProfile,
  getSddInstructions,
  initProject,
  inspectRun,
  inspectSddTask,
  inspectToolPluginContract,
  inspectToolCapability,
  inspectSyncBack,
  inspectTaskGraph,
  inspectWavePlan,
  inspectWaveExecutor,
  inspectBackgroundExecutor,
  inspectResidentWorkerRuntime,
  inspectDelegationQueueItem,
  inspectWorkerAdapterContract,
  inspectArtifactResultIngestions,
  inspectWorktreeIsolation,
  inspectWorktreeLifecycle,
  inspectGovernancePolicy,
  keepWorktreeLifecycle,
  isDelegationStale,
  isDelegationTerminal,
  inspectLocalRunIndex,
  listInvocationLedgerEntries,
  listRuns,
  removeWorktreeLifecycle,
  queryLocalRunIndex,
  listToolPluginContracts,
  listToolCapabilities,
  listDelegationQueueItems,
  listWorkerAdapterContracts,
  listResidentWorkerRuntimes,
  parseSddBranch,
  inspectWorkflowGate,
  inspectAgentRegistryEntry,
  inspectQueryStatusContract,
  inspectSkillAgentEvalContract,
  inspectHarnessLearningContract,
  inspectProjectContextPackContract,
  inspectAgentSkillTeamRuntime,
  inspectSkillCapability,
  inspectCapabilitySource,
  inspectExternalAgentPackImport,
  inspectTeamModePolicy,
  listWorkflowGates,
  listAgentRegistry,
  listSkillCapabilities,
  listCapabilitySources,
  parseSddEvidenceMarkdown,
  parseSddResultMarkdown,
  parseSddTasksMarkdown,
  readProjectConfig,
  readRunEvents,
  readRunState,
  readResidentWorkerRuntimeRecord,
  recordLifecycleDecision,
  rebuildLocalRunIndex,
  renderSddResultArtifactTemplate,
  parseContextProfile,
  renderLifecycleDecisionGate,
  renderSingleTaskLoopResult,
  renderTaskGapReport,

  renderDoctorReport,
  runBackgroundExecutor,
  runWaveExecutor,
  runGoalVerify,
  runSingleTaskLoop,
  toArtifactRootRelativePath,
  validateDelegationRecord,
  validateDelegationStateTransition,
  validateSddResultArtifact,
  validateWorkflowGates,
  validateAgentRegistry,
  validateQueryStatusContract,
  validateSkillAgentEvalContract,
  validateHarnessLearningContract,
  validateProjectContextPackContract,
  routeSddTask,
  validateAgentSkillTeamRuntime,
  writeArtifact,
  summarizeCommandOutput,
  validateLogWorkerSummary,
  writeResidentWorkerRuntimeRecord,
  writeRunState
} from './index.js';

const execFileAsync = promisify(execFile);

test('runtime store mirrors run state events artifacts and doctor visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-store-'));
  try {
    await initProject(root);
    const run = await createRun(root, { runId: 'store-run-001' });
    await appendEvent(root, run.runId, { event: 'runtime_store_test_event', runId: run.runId, summary: 'store mirror test' });
    await writeArtifact(root, run.runId, 'validation-T1.md', 'runtime store artifact');

    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const storedRun = db.prepare('SELECT run_id, status FROM runs WHERE run_id = ?').get(run.runId) as { run_id?: string; status?: string } | undefined;
      const storedEvent = db.prepare('SELECT event_name FROM events WHERE run_id = ? AND event_name = ?').get(run.runId, 'runtime_store_test_event') as { event_name?: string } | undefined;
      const storedArtifact = db.prepare('SELECT path FROM artifacts WHERE run_id = ? AND path = ?').get(run.runId, 'artifacts/validation-T1.md') as { path?: string } | undefined;
      assert.equal(storedRun?.run_id, run.runId);
      assert.equal(storedRun?.status, 'created');
      assert.equal(storedEvent?.event_name, 'runtime_store_test_event');
      assert.equal(storedArtifact?.path, 'artifacts/validation-T1.md');
    } finally {
      db.close();
    }

    const report = await doctor(root, { latestOnly: true });
    const runtimeStoreCheck = report.checks.find((check) => check.check === 'runtime_store');
    assert.equal(runtimeStoreCheck?.level, 'PASS');
    assert.match(runtimeStoreCheck?.message ?? '', /phase-6\.11-runtime-store-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime store imports changed legacy run state and events', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-legacy-import-'));
  try {
    await initProject(root);
    const run = await createRun(root, { runId: 'legacy-run-001' });
    const state = await readRunState(root, run.runId);
    const statePath = path.join(root, '.sdd', 'runs', run.runId, 'state.json');
    const legacyIngestion = {
      contract: 'sdd-artifact-result-ingestion-v1' as const,
      runId: run.runId,
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      artifactPath: 'artifacts/validation-T1.md',
      status: 'accepted' as const,
      resultStatus: 'PASS' as const,
      delegationStatus: 'COMPLETED' as const,
      ingestedAt: '2026-01-01T00:00:00.000Z',
      issues: [],
      gaps: []
    };
    await writeFile(statePath, `${JSON.stringify({
      ...state,
      status: 'completed',
      updatedAt: '2026-01-01T00:00:00.000Z',
      artifacts: [{ path: 'artifacts/validation-T1.md', kind: 'validation', task: 'T1', agent: 'validator', createdAt: '2026-01-01T00:00:00.000Z' }],
      artifactIngestions: { 'D-T1-validator-001:artifacts/validation-T1.md': legacyIngestion }
    }, null, 2)}\n`, 'utf8');
    await writeFile(getInvocationLedgerPath(root, run.runId), `${JSON.stringify({
      contract: 'sdd-invocation-ledger-v1',
      version: '1.0.0',
      entryId: 'legacy-ledger-entry-001',
      runId: run.runId,
      taskId: 'T1',
      branch: 'master',
      kind: 'command',
      ref: 'npm test',
      status: 'declared',
      timestamp: '2026-01-01T00:00:00.000Z',
      materialRefs: [],
      metadata: { source: 'legacy-test' }
    })}\n`, 'utf8');
    await appendEvent(root, run.runId, { event: 'legacy_event_after_store', runId: run.runId });

    const importedState = await readRunState(root, run.runId);
    const importedEvents = await readRunEvents(root, run.runId);
    const importedLedger = await listInvocationLedgerEntries(root, run.runId);
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const artifact = db.prepare('SELECT path, status FROM artifacts WHERE run_id = ? AND path = ?').get(run.runId, 'artifacts/validation-T1.md') as { path?: string; status?: string } | undefined;
      const ingestion = db.prepare('SELECT status, result_status FROM artifact_ingestions WHERE run_id = ? AND artifact_path = ?').get(run.runId, 'artifacts/validation-T1.md') as { status?: string; result_status?: string } | undefined;
      const activity = db.prepare('SELECT ref, status FROM activities WHERE run_id = ? AND activity_id = ?').get(run.runId, 'legacy-ledger-entry-001') as { ref?: string; status?: string } | undefined;
      assert.equal(importedState.status, 'completed');
      assert.equal(importedEvents.some((event) => event.event === 'legacy_event_after_store'), true);
      assert.equal(importedLedger.some((entry) => entry.entryId === 'legacy-ledger-entry-001'), true);
      assert.equal(artifact?.status, 'legacy_imported');
      assert.equal(ingestion?.status, 'accepted');
      assert.equal(ingestion?.result_status, 'PASS');
      assert.equal(activity?.ref, 'npm test');
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject creates readable project config', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    const init = await initProject(root);
    assert.equal(init.created, true);
    const config = await readProjectConfig(root);
    assert.equal(config.contract, 'phase-1.2-project-contract');
    assert.equal(config.sdd.docs_language, 'zh-CN');
    assert.equal(config.lifecycle.decision_required, true);
    assert.match(await readFile(init.configPath, 'utf8'), /Project-level SDD document prose language/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject creates starter semantic documents by default', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-docs-'));
  try {
    const init = await initProject(root);
    const spec = await readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8');
    const plan = await readFile(path.join(root, 'specs', 'master', 'plan.md'), 'utf8');
    const tasks = await readFile(path.join(root, 'specs', 'master', 'tasks.md'), 'utf8');
    const branch = await parseSddBranch(root, 'master');
    const status = await getProjectStatus(root, { branch: 'master' });

    assert.equal(init.documents.branch, 'master');
    assert.equal(init.documents.documents.every((document) => document.status === 'created'), true);
    assert.match(spec, /sdd-init-onboarding-spec-v1/);
    assert.match(spec, /## 1\. Objective \/ Customer Value/);
    assert.match(spec, /## 4\. User Stories \/ Scenarios/);
    assert.match(spec, /\| AC-1 \|/);
    assert.match(spec, /Assumptions \/ Dependencies/);
    assert.match(spec, /Risks \/ Hard Gates/);
    assert.match(spec, /项目入门/);
    assert.match(spec, /仓库在第一个真实变更前/);
    assert.match(plan, /sdd-init-onboarding-plan-v1/);
    assert.match(plan, /## 3\. Current State Analysis/);
    assert.match(plan, /## 5\. Architecture \/ Component Design/);
    assert.match(plan, /```plantuml/);
    assert.match(plan, /Risk-driven Plan Requirements/);
    assert.match(plan, /业务背景与技术背景/);
    assert.match(tasks, /sdd-init-onboarding-tasks-v1/);
    assert.match(tasks, /## 1\. Delivery Map/);
    assert.match(tasks, /acceptance_refs:/);
    assert.match(tasks, /plan_refs:/);
    assert.match(tasks, /allowed_agents:/);
    assert.match(tasks, /required_artifacts:/);
    assert.match(tasks, /verification_availability:/);
    assert.match(tasks, /#### Definition of Done/);
    assert.match(tasks, /#### Evidence Expectations/);
    assert.match(tasks, /Allowed scope 仅限/);
    assert.equal(branch.tasks.some((task) => task.id === 'ONBOARDING-1'), true);
    assert.equal(status.documents.specExists, true);
    assert.equal(status.documents.planExists, true);
    assert.equal(status.documents.tasksExists, true);
    assert.equal(status.gaps.some((gap) => gap.type === 'Document Gap'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject falls back to English starter document prose for non-Chinese docs_language', async () => {
  for (const docsLanguage of ['en-US', 'fr-FR']) {
    const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-language-fallback-'));
    try {
      await initProject(root, { scaffoldDocuments: false });
      const configPath = path.join(root, '.sdd', 'project.yml');
      const config = await readFile(configPath, 'utf8');
      await writeFile(configPath, config.replace('docs_language: zh-CN', `docs_language: ${docsLanguage}`), 'utf8');

      await initProject(root);
      const spec = await readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8');
      const plan = await readFile(path.join(root, 'specs', 'master', 'plan.md'), 'utf8');
      const tasks = await readFile(path.join(root, 'specs', 'master', 'tasks.md'), 'utf8');

      assert.match(spec, /# Spec: Project Onboarding/);
      assert.match(spec, /the repository has a visible SDD entrypoint/);
      assert.match(plan, /business and technical context/);
      assert.match(tasks, /Allowed scope is limited/);
      assert.doesNotMatch(`${spec}\n${plan}\n${tasks}`, /项目入门|仓库在第一个真实变更前|业务背景与技术背景|Allowed scope 仅限/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('initProject preserves existing semantic documents by default', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-preserve-'));
  try {
    await mkdir(path.join(root, 'specs', 'master'), { recursive: true });
    await writeFile(path.join(root, 'specs', 'master', 'spec.md'), 'user spec', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'plan.md'), 'user plan', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'tasks.md'), 'user tasks', 'utf8');
    const init = await initProject(root);

    assert.equal(await readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8'), 'user spec');
    assert.equal(await readFile(path.join(root, 'specs', 'master', 'plan.md'), 'utf8'), 'user plan');
    assert.equal(await readFile(path.join(root, 'specs', 'master', 'tasks.md'), 'utf8'), 'user tasks');
    assert.equal(init.documents.documents.every((document) => document.status === 'unchanged'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject force overwrites semantic documents', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-force-'));
  try {
    await mkdir(path.join(root, 'specs', 'master'), { recursive: true });
    await writeFile(path.join(root, 'specs', 'master', 'spec.md'), 'user spec', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'plan.md'), 'user plan', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'tasks.md'), 'user tasks', 'utf8');
    const init = await initProject(root, { force: true });
    const spec = await readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8');
    const plan = await readFile(path.join(root, 'specs', 'master', 'plan.md'), 'utf8');
    const tasks = await readFile(path.join(root, 'specs', 'master', 'tasks.md'), 'utf8');

    assert.match(spec, /sdd-init-onboarding-spec-v1/);
    assert.match(plan, /sdd-init-onboarding-plan-v1/);
    assert.match(tasks, /sdd-init-onboarding-tasks-v1/);
    assert.equal(init.documents.documents.every((document) => document.status === 'overwritten'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject scaffolds custom branch documents', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-branch-'));
  try {
    const init = await initProject(root, { branch: 'feature-x' });
    const status = await getProjectStatus(root, { branch: 'feature-x' });

    assert.equal(init.documents.branch, 'feature-x');
    assert.match(await readFile(path.join(root, 'specs', 'feature-x', 'tasks.md'), 'utf8'), /id: ONBOARDING-1/);
    assert.equal(status.documents.specExists, true);
    assert.equal(status.documents.planExists, true);
    assert.equal(status.documents.tasksExists, true);
    assert.equal(status.gaps.some((gap) => gap.type === 'Document Gap'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('getProjectStatus resolves configured default SDD branch without silent master fallback', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-resolver-'));
  try {
    await initProject(root, { branch: 'feature-x' });
    const config = await readProjectConfig(root);
    const defaultStatus = await getProjectStatus(root);
    const explicitStatus = await getProjectStatus(root, { branch: 'feature-x' });

    assert.equal(config.sdd.default_branch, 'feature-x');
    assert.equal(defaultStatus.context.branch, 'feature-x');
    assert.equal(defaultStatus.context.branchSource, 'project_config');
    assert.equal(defaultStatus.context.specDir, 'specs/feature-x');
    assert.equal(explicitStatus.context.branch, 'feature-x');
    assert.equal(explicitStatus.context.branchSource, 'explicit_option');
    assert.equal(explicitStatus.context.specDir, 'specs/feature-x');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('getProjectStatus resolves concrete project config branch when no default branch is set', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-config-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'config-branch', '# Tasks\n');
    const configPath = path.join(root, '.sdd', 'project.yml');
    const config = await readFile(configPath, 'utf8');
    await writeFile(configPath, config.replace(/  default_branch: master\n/, '').replace('spec_dir: specs/<branch>', 'spec_dir: specs/config-branch'), 'utf8');

    const status = await getProjectStatus(root);

    assert.equal(status.context.branch, 'config-branch');
    assert.equal(status.context.branchSource, 'project_config');
    assert.equal(status.context.specDir, 'specs/config-branch');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.4 getProjectStatus resolves current Git branch before project config default', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-git-'));
  try {
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', 'git-branch'], { cwd: root });
    await initProject(root);
    await writeBranchDocs(root, 'git-branch', '# Tasks\n');

    const status = await getProjectStatus(root);

    assert.equal(status.context.rawBranch, 'git-branch');
    assert.equal(status.context.branch, 'git-branch');
    assert.equal(status.context.partition, 'git-branch');
    assert.equal(status.context.branchSource, 'git_branch');
    assert.equal(status.context.specDir, 'specs/git-branch');
    assert.equal(status.workflowStatus, 'active');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.4 maps slash Git branch names to stable safe partitions', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-git-slash-'));
  const rawBranch = 'feature/login';
  const partition = `feature-login-${createHash('sha256').update(rawBranch).digest('hex').slice(0, 8)}`;
  try {
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', rawBranch], { cwd: root });
    await initProject(root);
    await writeBranchDocs(root, partition, '# Tasks\n');

    const status = await getProjectStatus(root);

    assert.equal(status.context.rawBranch, rawBranch);
    assert.equal(status.context.branch, partition);
    assert.equal(status.context.partition, partition);
    assert.equal(status.context.branchSource, 'git_branch');
    assert.equal(status.context.specDir, `specs/${partition}`);
    assert.equal(status.documents.tasksExists, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.4 marks plan and tasks stale after spec revision hash changes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-spec-revision-stale-'));
  try {
    await initProject(root);
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    const spec = '# Spec\n\nInitial requirement.\n';
    const planTemplate = '# Plan\n\nbased_on_spec_hash: pending\n\nInitial plan.\n';
    const specHash = createHash('sha256').update(spec.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
    const plan = planTemplate.replace('pending', specHash);
    const planHash = createHash('sha256').update(plan.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
    await writeFile(path.join(branchDir, 'spec.md'), spec, 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), plan, 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), `${validTaskMarkdown('T1', [])}\nbased_on_plan_hash: ${planHash}\n`, 'utf8');

    const fresh = await getProjectStatus(root, { branch: 'feature' });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n\nChanged requirement.\n', 'utf8');
    const stale = await getProjectStatus(root, { branch: 'feature' });

    assert.equal(fresh.documents.planStale, false);
    assert.equal(fresh.documents.tasksStale, false);
    assert.equal(stale.documents.planStale, true);
    assert.equal(stale.documents.tasksStale, true);
    assert.equal(stale.gaps.some((gap) => gap.field === 'plan.md' && /stale/.test(gap.message)), true);
    assert.equal(stale.gaps.some((gap) => gap.field === 'tasks.md' && /stale/.test(gap.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('getProjectStatus rejects unresolved branch instead of silently using specs master', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-no-fallback-'));
  try {
    await initProject(root);
    const configPath = path.join(root, '.sdd', 'project.yml');
    const config = await readFile(configPath, 'utf8');
    await writeFile(configPath, config.replace(/  default_branch: master\n/, ''), 'utf8');

    await assert.rejects(() => getProjectStatus(root), /Cannot resolve SDD branch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI status renders context source and keeps next final', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-status-context-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    const status = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'status', '--branch', 'master'], { cwd: root });
    const lines = status.stdout.trim().split(/\r?\n/);

    assert.equal(lines[0], 'SDD status for master');
    assert.match(status.stdout, /decision/);
    assert.match(status.stdout, /evidence/);
    assert.match(status.stdout, /tasks .*gaps=/);
    assert.match(status.stdout, /context raw_branch=master partition=master source=cli_option spec_dir=specs\/master/);
    assert.match(lines[lines.length - 1], /^next /);
    assert.match(status.stdout, /run git init first/);
    assert.doesNotMatch(status.stdout, /项目入门|仓库在第一个真实变更前|业务背景与技术背景|Allowed scope 仅限/);

    await execFileAsync('git', ['init'], { cwd: root });
    const gitStatus = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'status', '--branch', 'master'], { cwd: root });

    assert.match(gitStatus.stdout, /git repository detected/);
    assert.doesNotMatch(gitStatus.stdout, /run git init first/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI tasks list uses configured default SDD branch when branch is omitted', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-tasks-context-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root, { branch: 'feature-x' });

    const result = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'list'], { cwd: root });

    assert.match(result.stdout, /SDD tasks for feature-x/);
    assert.match(result.stdout, /ONBOARDING-1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI status warns when latest run predates current tasks contract', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-status-stale-run-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const run = await createRun(root, { runId: 'run-stale' });
    await bindTestRunState(root, run.runId, 'feature', 'T1');
    const boundRun = await readRunState(root, run.runId);
    const statePath = path.join(root, '.sdd', 'runs', run.runId, 'state.json');
    const staleState = { ...boundRun, status: 'completed', currentTask: 'T1', updatedAt: '2000-01-01T00:00:00.000Z' };
    await writeFile(statePath, `${JSON.stringify(staleState, null, 2)}\n`, 'utf8');

    const staleStatus = await getProjectStatus(root, { branch: 'feature' });
    const staleCli = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'status', '--branch', 'feature'], { cwd: root });

    assert.equal(staleStatus.latestRunEvidence?.tasksChangedAfterRun, true);
    assert.equal(staleStatus.latestRunEvidence?.runUpdatedAt, '2000-01-01T00:00:00.000Z');
    assert.match(staleCli.stdout, /latest_run_evidence may be stale/);

    const appliedState = { ...staleState, syncBack: { ...staleState.syncBack, status: 'applied' as const } };
    await writeFile(statePath, `${JSON.stringify(appliedState, null, 2)}\n`, 'utf8');
    const appliedStatus = await getProjectStatus(root, { branch: 'feature' });
    const appliedCli = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'status', '--branch', 'feature'], { cwd: root });
    assert.deepEqual(appliedStatus.latestRunStaleReasons, []);
    assert.doesNotMatch(appliedCli.stdout, /latest_run_evidence may be stale/);
    assert.match(appliedCli.stdout, /tasks.md changed after sync-back apply/);

    const freshState = { ...staleState, updatedAt: '2999-01-01T00:00:00.000Z' };
    await writeFile(statePath, `${JSON.stringify(freshState, null, 2)}\n`, 'utf8');
    const freshStatus = await getProjectStatus(root, { branch: 'feature' });
    const freshCli = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'status', '--branch', 'feature'], { cwd: root });

    assert.equal(freshStatus.latestRunEvidence?.tasksChangedAfterRun, false);
    assert.doesNotMatch(freshCli.stdout, /latest_run_evidence may be stale/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI init defaults to concise text and keeps json opt-in', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-ux-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    const initText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'init', '--ai', 'none'], { cwd: root });
    const initJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'init', '--ai', 'none', '--json'], { cwd: root });
    const parsed = JSON.parse(initJson.stdout);

    assert.match(initText.stdout, /^SDD init/);
    assert.doesNotMatch(initText.stdout, /^\s*\{/);
    assert.match(initText.stdout, /project-level setup/);
    assert.match(initText.stdout, /next\n- \/sdd:spec/);
    assert.match(initText.stdout, /doctor checks git repository health/);
    assert.equal(parsed.command, 'init');
    assert.equal(parsed.documents.documents.every((document: { status: string }) => document.status === 'skipped'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI tasks inspect defaults to text and keeps json opt-in', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-task-inspect-ux-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const inspectText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'inspect', 'T1', '--branch', 'feature'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'inspect', 'T1', '--branch', 'feature', '--json'], { cwd: root });
    const parsed = JSON.parse(inspectJson.stdout);

    assert.match(inspectText.stdout, /^SDD task T1/);
    assert.match(inspectText.stdout, /boundary: Stay in parser files only/);
    assert.match(inspectText.stdout, /acceptance: Parser behavior is covered/);
    assert.match(inspectText.stdout, /agent_fit:/);
    assert.match(inspectText.stdout, /acceptance_refs: AC-1/);
    assert.match(inspectText.stdout, /plan_refs: §4 Target Design Overview/);
    assert.match(inspectText.stdout, /next\n- sdd do task T1/);
    assert.equal(parsed.task.id, 'T1');
    assert.deepEqual(parsed.task.acceptanceRefs, ['AC-1']);
    assert.deepEqual(parsed.task.planRefs, ['§4 Target Design Overview']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject can skip semantic document scaffold', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-skip-docs-'));
  try {
    const init = await initProject(root, { scaffoldDocuments: false });

    await assert.rejects(readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8'), /ENOENT/);
    assert.equal(init.documents.documents.every((document) => document.status === 'skipped'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject projects managed Claude Code entries by default', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-init-'));
  try {
    const init = await initProject(root);
    const skill = await readFile(path.join(root, '.claude', 'skills', 'sdd', 'SKILL.md'), 'utf8');
    const command = await readFile(path.join(root, '.claude', 'commands', 'sdd.md'), 'utf8');
    const instructionsCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'instructions.md'), 'utf8');

    const specCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'spec.md'), 'utf8');
    const planCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'plan.md'), 'utf8');
    const tasksCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'tasks.md'), 'utf8');
    const doCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'do.md'), 'utf8');
    const verifyCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'verify.md'), 'utf8');

    assert.equal(init.aiTools.length, 1);
    assert.equal(init.aiTools[0].entries.some((entry) => entry.status === 'created'), true);
    assert.match(skill, /sdd_contract: sdd-ai-entry-v1/);
    assert.match(skill, /sdd status/);
    assert.match(command, /sdd_hash: sha256:/);
    assert.match(command, /do not paste or restate full status/);
    assert.match(command, /natural-language intent router/);
    assert.match(command, /CLI\/core output as the source of truth/);
    assert.match(command, /\/sdd:\*/);
    assert.match(command, /ambiguous after status/);
    assert.match(command, /sdd tasks inspect <task_id>/);
    assert.match(command, /sdd sync-back inspect --task <task_id>/);
    assert.match(command, /follow apply_policy/);
    assert.match(command, /workflow_status=not_started/);
    assert.match(command, /workflow branch entry/);
    assert.match(instructionsCommand, /sdd status/);
    assert.match(instructionsCommand, /sdd sync-back inspect/);
    assert.match(instructionsCommand, /omit `--run`/);
    await assert.rejects(access(path.join(root, '.claude', 'commands', 'sdd', 'init.md')), /ENOENT/);
    assert.equal(init.aiTools[0].entries.some((entry) => entry.id === 'sdd-init'), false);
    assert.match(specCommand, /sdd instructions spec --json/);
    assert.match(planCommand, /sdd instructions plan --json/);
    assert.match(tasksCommand, /sdd instructions tasks --json/);
    assert.match(tasksCommand, /sdd tasks format/);
    assert.match(tasksCommand, /acceptance_refs and plan_refs/);
    assert.match(tasksCommand, /required_artifacts, verification_availability, autonomy/);
    assert.match(tasksCommand, /metadata inside the ```sdd-task fenced block/);
    assert.match(specCommand, /workflow partition entry/);
    assert.match(specCommand, /not a technical design/);
    assert.match(planCommand, /Refine the existing SDD plan document/);
    assert.match(planCommand, /deliverable technical solution/);
    assert.match(planCommand, /based_on_spec_hash/);
    assert.match(planCommand, /PlantUML/);
    assert.match(planCommand, /state-machine risk needs a state diagram/);
    assert.match(tasksCommand, /executable evidence contract/);
    assert.match(tasksCommand, /based_on_plan_hash/);
    assert.match(doCommand, /sdd status/);
    assert.match(doCommand, /sdd instructions do --json/);
    assert.match(doCommand, /sdd tasks inspect <task_id>/);
    assert.match(doCommand, /artifacts\/implement-<task_id>\.md/);
    assert.match(doCommand, /--agent implementer/);
    assert.match(doCommand, /sdd do task <task_id>/);
    assert.match(doCommand, /sdd verify task <task_id> --branch <branch>/);
    assert.match(verifyCommand, /sdd status/);
    assert.match(verifyCommand, /latest eligible run/);
    assert.match(verifyCommand, /sdd instructions verify --json/);
    assert.match(verifyCommand, /sdd verify task <task_id> --branch <branch>/);
    assert.match(verifyCommand, /sdd sync-back inspect --branch <branch> --task <task_id>/);
    assert.match(verifyCommand, /confirm-required tasks require human confirmation/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 5.2 workflow gates and agent registry expose inspectable contracts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase52-registry-'));
  try {
    await initProject(root);

    const workflows = await listWorkflowGates(root);
    const agents = await listAgentRegistry(root);
    const doWorkflow = await inspectWorkflowGate(root, 'do');
    const implementer = await inspectAgentRegistryEntry(root, 'implementer');
    const workflowValidation = await validateWorkflowGates(root);
    const agentValidation = await validateAgentRegistry(root);

    assert.equal(workflows.version, 'phase-5.2-workflow-gate-v1');
    assert.equal(agents.version, 'phase-5.2-agent-registry-v1');
    assert.equal(workflows.workflows.some((workflow) => workflow.id === 'do'), true);
    assert.equal(agents.agents.some((agent) => agent.id === 'validator'), true);
    assert.ok(doWorkflow);
    assert.equal(doWorkflow.allowedAgents.includes('implementer'), true);
    assert.equal(doWorkflow.requiredArtifacts.includes('artifacts/validation-<task>.md'), true);
    assert.ok(implementer);
    assert.equal(implementer.autonomyCeiling, 'foreground_write');
    assert.equal(implementer.writeBoundary.includes('declared affected files'), true);
    assert.equal(workflowValidation.valid, true);
    assert.equal(agentValidation.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI exposes Phase 5.2 workflow and agent registry commands', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase52-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);

    const workflow = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'workflow', 'inspect', 'do'], { cwd: root });
    const workflowJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'workflow', 'validate', '--json'], { cwd: root });
    const agent = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agents', 'inspect', 'validator'], { cwd: root });
    const agentJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agents', 'validate', '--json'], { cwd: root });
    const parsedWorkflow = JSON.parse(workflowJson.stdout) as { valid: boolean };
    const parsedAgent = JSON.parse(agentJson.stdout) as { valid: boolean };

    assert.match(workflow.stdout, /Workflow gate do/);
    assert.match(workflow.stdout, /agents=scout,implementer,reviewer,debugger,validator/);
    assert.match(workflow.stdout, /required_artifacts/);
    assert.match(agent.stdout, /Agent validator/);
    assert.match(agent.stdout, /autonomy_ceiling=validation_only/);
    assert.match(agent.stdout, /required_artifact=artifacts\/validation-<task>\.md/);
    assert.equal(parsedWorkflow.valid, true);
    assert.equal(parsedAgent.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6 agent skill team runtime exposes reusable contracts and router decisions', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase60-runtime-'));
  try {
    await initProject(root);

    const runtime = await inspectAgentSkillTeamRuntime(root);
    const validation = await validateAgentSkillTeamRuntime(root);
    const skillCapabilities = await listSkillCapabilities(root);
    const hashlineCapability = await inspectSkillCapability(root, 'host.edit.hashline');
    const sourceCatalog = await listCapabilitySources(root);
    const agencySource = await inspectCapabilitySource(root, 'agency_agents_material');
    const agencyImport = await inspectExternalAgentPackImport(root, 'agency_agents_material');
    const teamDefault = await inspectTeamModePolicy(root);
    const teamEnabled = await inspectTeamModePolicy(root, { taskId: 'ONBOARDING-1', branch: 'master', enabled: true });
    const route = await routeSddTask(root, { taskId: 'ONBOARDING-1', branch: 'master', teamModeEnabled: true });

    assert.equal(runtime.version, 'phase-6.0-agent-skill-team-runtime-v1');
    assert.equal(runtime.teamMode.decision, 'disabled');
    assert.equal(runtime.profiles.some((profile) => profile.id === 'orchestrator'), true);
    assert.equal(runtime.profiles.some((profile) => profile.id === 'security'), true);
    assert.equal(runtime.skillCapabilities.some((capability) => capability.id === 'claude.subagent.researcher'), true);
    assert.equal(validation.valid, true);
    assert.equal(skillCapabilities.capabilities.some((capability) => capability.id === 'external.agency_agents.material'), true);
    assert.ok(hashlineCapability);
    assert.equal(hashlineCapability.reuseDecision, 'reuse_direct');
    assert.equal(sourceCatalog.sources.some((source) => source.id === 'ohmy_team_mode'), true);
    assert.ok(agencySource);
    assert.equal(agencySource.quarantineRequired, true);
    assert.equal(agencyImport.status, 'quarantined');
    assert.equal(agencyImport.checks.some((check) => check.check === 'dangerous_command_scan'), true);
    assert.equal(teamDefault.decision, 'disabled');
    assert.equal(teamDefault.activation, 'off');
    assert.equal(teamDefault.mode, 'off');
    assert.equal(teamEnabled.decision, 'enabled');
    assert.equal(teamEnabled.activation, 'force');
    assert.equal(teamEnabled.mode, 'review-lite');
    assert.equal(route.version, 'phase-6.0-agent-router-v1');
    assert.equal(route.taskId, 'ONBOARDING-1');
    assert.equal(route.recommendedProfile, 'researcher');
    assert.equal(route.requiredCapabilities.includes('context7.docs'), true);
    assert.equal(route.toolPermission?.policy, 'allow');
    assert.equal(route.teamMode.activation, 'force');
    assert.equal(route.teamMode.mode, 'review-lite');
    assert.equal(route.teamMode.costClass, 'low');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6 adaptive team-mode routes choose cost-bounded agent teams automatically', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase60-adaptive-team-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${adaptiveTeamTaskMarkdown('LOW', { allowedAgents: ['implementer'] })}\n${adaptiveTeamTaskMarkdown('REVIEW', { allowedAgents: ['reviewer'], requiredArtifacts: ['artifacts/review-REVIEW.md'] })}\n${adaptiveTeamTaskMarkdown('HIGH', { allowedAgents: ['implementer'], risk: ['database'] })}\n${adaptiveTeamTaskMarkdown('SECURITY', { allowedAgents: ['security'], risk: ['security'] })}`);

    const low = await routeSddTask(root, { taskId: 'LOW', branch: 'master' });
    const review = await routeSddTask(root, { taskId: 'REVIEW', branch: 'master' });
    const high = await routeSddTask(root, { taskId: 'HIGH', branch: 'master' });
    const security = await routeSddTask(root, { taskId: 'SECURITY', branch: 'master' });
    const forced = await routeSddTask(root, { taskId: 'LOW', branch: 'master', teamModeActivation: 'force' });
    const disabled = await routeSddTask(root, { taskId: 'SECURITY', branch: 'master', teamModeActivation: 'off' });

    assert.equal(low.teamMode.activation, 'auto');
    assert.equal(low.teamMode.mode, 'off');
    assert.equal(low.teamMode.enabled, false);
    assert.equal(low.teamMode.costClass, 'none');
    assert.equal(low.teamMode.costRoute, 'downgraded');
    assert.match(low.teamMode.downgradeReason ?? '', /Low-risk task uses no team automation/);
    assert.equal(low.teamMode.trustPolicyEnforced, true);
    assert.equal(review.teamMode.activation, 'auto');
    assert.equal(review.teamMode.mode, 'review-lite');
    assert.equal(review.teamMode.enabled, true);
    assert.equal(review.teamMode.costClass, 'low');
    assert.equal(review.teamMode.costRoute, 'downgraded');
    assert.match(review.teamMode.downgradeReason ?? '', /Low-cost review-lite route/);
    assert.equal(review.teamMode.trustPolicyEnforced, true);
    assert.equal(review.teamMode.maxMembers <= 2, true);
    assert.equal(review.teamMode.waveRecommendation.includes('implementation_review'), true);
    assert.equal(high.teamMode.mode, 'hyperplan');
    assert.equal(high.teamMode.enabled, true);
    assert.equal(high.teamMode.costClass, 'high');
    assert.equal(high.teamMode.costRoute, 'no_downgrade');
    assert.equal(high.teamMode.downgradeReason, null);
    assert.equal(high.teamMode.trustPolicyEnforced, true);
    assert.equal(high.teamMode.maxMembers <= 4, true);
    assert.equal(high.teamMode.waveRecommendation.includes('hyperplan'), true);
    assert.equal(security.teamMode.mode, 'security-research');
    assert.equal(security.teamMode.costClass, 'high');
    assert.equal(security.teamMode.costRoute, 'no_downgrade');
    assert.equal(security.teamMode.downgradeReason, null);
    assert.equal(security.teamMode.trustPolicyEnforced, true);
    assert.equal(security.teamMode.maxMembers <= 3, true);
    assert.equal(security.teamMode.waveRecommendation.includes('security_research'), true);
    assert.equal(forced.teamMode.activation, 'force');
    assert.equal(forced.teamMode.mode, 'review-lite');
    assert.equal(forced.teamMode.costClass, 'low');
    assert.equal(forced.teamMode.costRoute, 'no_downgrade');
    assert.equal(forced.teamMode.downgradeReason, null);
    assert.equal(forced.teamMode.trustPolicyEnforced, true);
    assert.equal(disabled.teamMode.activation, 'off');
    assert.equal(disabled.teamMode.mode, 'off');
    assert.equal(disabled.teamMode.enabled, false);
    assert.equal(disabled.teamMode.costRoute, 'not_applicable');
    assert.equal(disabled.teamMode.trustPolicyEnforced, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('routeSddTask uses derived route cache and opt-in profiling only', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-route-cache-profile-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${adaptiveTeamTaskMarkdown('CACHE', { allowedAgents: ['reviewer'], requiredArtifacts: ['artifacts/review-CACHE.md'] })}`);

    const uncached = await routeSddTask(root, { taskId: 'CACHE', branch: 'master' });
    const first = await routeSddTask(root, { taskId: 'CACHE', branch: 'master', cache: true, profile: true });
    const second = await routeSddTask(root, { taskId: 'CACHE', branch: 'master', cache: true });
    const third = await routeSddTask(root, { taskId: 'CACHE', branch: 'master', cache: true, profile: true });

    assert.equal(uncached.cache, undefined);
    assert.equal(uncached.profile, undefined);
    assert.equal(first.cache?.status, 'stored');
    assert.equal(first.cache?.source, 'content_addressed_derived_route');
    assert.equal(first.cache?.authoritative, false);
    assert.ok(first.profile);
    assert.equal(first.profile.every((span) => span.contract === 'phase-6.9-runtime-profile-v1'), true);
    assert.equal(first.profile.some((span) => span.name === 'route_compute'), true);
    assert.equal(first.teamMode.costRoute, 'downgraded');
    assert.equal(first.teamMode.trustPolicyEnforced, true);
    assert.equal(second.cache?.status, 'hit');
    assert.equal(second.cache?.authoritative, false);
    assert.equal(second.profile, undefined);
    assert.equal(third.cache?.status, 'hit');
    assert.ok(third.profile);
    assert.equal(third.profile.some((span) => span.name === 'route_total'), true);
    assert.equal(third.profile.some((span) => span.name === 'route_compute'), false);

    await writeBranchDocs(root, 'master', `# Tasks\n\n${adaptiveTeamTaskMarkdown('CACHE', { allowedAgents: ['reviewer'], requiredArtifacts: ['artifacts/review-CACHE.md'] })}\n\nCache key invalidation fixture.`);
    const invalidated = await routeSddTask(root, { taskId: 'CACHE', branch: 'master', cache: true });

    assert.equal(invalidated.cache?.status, 'stored');
    assert.notEqual(invalidated.cache?.key, first.cache?.key);
    assert.equal(invalidated.cache?.authoritative, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI exposes Phase 6 runtime, catalog, quarantine, team-mode, and route commands', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase60-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);

    const runtime = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agent-runtime', 'inspect'], { cwd: root });
    const runtimeJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agent-runtime', 'validate', '--json'], { cwd: root });
    const capability = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'skill-capabilities', 'inspect', 'host.edit.hashline'], { cwd: root });
    const source = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'capability-sources', 'inspect', 'ohmy_team_mode'], { cwd: root });
    const pack = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'external-packs', 'inspect', 'agency_agents_material'], { cwd: root });
    const team = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'team-mode', 'inspect'], { cwd: root });
    const route = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'ONBOARDING-1'], { cwd: root });
    const routeForce = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'ONBOARDING-1', '--team-mode'], { cwd: root });
    const routeOff = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'ONBOARDING-1', '--no-team-mode'], { cwd: root });
    const routeProfileCache = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'ONBOARDING-1', '--profile', '--cache'], { cwd: root });
    const parsedRuntime = JSON.parse(runtimeJson.stdout) as { valid: boolean; version: string };

    assert.match(runtime.stdout, /SDD agent\/skill\/team runtime/);
    assert.match(runtime.stdout, /team_mode_default=disabled/);
    assert.equal(parsedRuntime.valid, true);
    assert.equal(parsedRuntime.version, 'phase-6.0-agent-skill-team-runtime-v1');
    assert.match(capability.stdout, /Skill capability host\.edit\.hashline/);
    assert.match(capability.stdout, /reuse_decision=reuse_direct/);
    assert.match(source.stdout, /Capability source ohmy_team_mode/);
    assert.match(source.stdout, /reuse=borrow_mechanism/);
    assert.match(pack.stdout, /status=quarantined/);
    assert.match(pack.stdout, /dangerous_command_scan/);
    assert.match(team.stdout, /decision=disabled mode=off activation=off cost=none/);
    assert.match(route.stdout, /Agent router decision ONBOARDING-1/);
    assert.match(route.stdout, /recommended_profile=researcher/);
    assert.match(route.stdout, /required_capabilities=.*context7\.docs/);
    assert.match(route.stdout, /activation=auto/);
    assert.match(route.stdout, /team_mode_reason=/);
    assert.match(routeForce.stdout, /activation=force/);
    assert.match(routeForce.stdout, /mode=review-lite/);
    assert.match(routeOff.stdout, /team_mode=disabled mode=off activation=off cost=none/);
    assert.match(routeProfileCache.stdout, /route_cache=stored/);
    assert.match(routeProfileCache.stdout, /authoritative=false/);
    assert.match(routeProfileCache.stdout, /trust_policy_enforced=true/);
    assert.match(routeProfileCache.stdout, /profile\n- /);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.3 project agent runtime merges project config and routes by alias and rule', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase63-runtime-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await appendProjectRuntimeConfig(root, phase63ProjectRuntimeConfig());
    await writeBranchDocs(root, 'master', phase63FrontendTaskMarkdown('FRONTEND-1'));

    const runtime = await inspectAgentSkillTeamRuntime(root);
    const validation = await validateAgentSkillTeamRuntime(root);
    const skillCapabilities = await listSkillCapabilities(root);
    const frontendCapability = await inspectSkillCapability(root, 'project.skill.frontend_review');
    const frontendSource = await inspectCapabilitySource(root, 'project_frontend_material');
    const pack = await inspectExternalAgentPackImport(root, 'project_frontend_material');
    const route = await routeSddTask(root, { taskId: 'FRONTEND-1', branch: 'master' });
    const runtimeText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agent-runtime', 'inspect'], { cwd: root });
    const skillListText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'skill-capabilities', 'list'], { cwd: root });
    const sourceListText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'capability-sources', 'list'], { cwd: root });
    const packText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'external-packs', 'inspect', 'project_frontend_material'], { cwd: root });
    const routeText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'FRONTEND-1'], { cwd: root });
    const routeJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'FRONTEND-1', '--json'], { cwd: root });
    const parsedRoute = JSON.parse(routeJson.stdout) as { recommendedProfile: string; routingRuleHits: string[]; resolvedAliases: Array<{ input: string; resolved: string }>; registrySources: Array<{ id: string; origin: string }> };

    assert.equal(validation.valid, true);
    assert.equal(runtime.profiles.some((profile) => profile.id === 'frontend'), true);
    assert.equal(runtime.skillCapabilities.some((capability) => capability.id === 'project.skill.frontend_review'), true);
    assert.equal(runtime.capabilitySources.some((source) => source.id === 'project_frontend_material'), true);
    assert.equal(runtime.registrySources?.some((source) => source.id === 'frontend' && source.origin === 'project_config'), true);
    assert.equal(skillCapabilities.registrySources?.some((source) => source.id === 'project.skill.frontend_review' && source.origin === 'project_config'), true);
    assert.ok(frontendCapability);
    assert.equal(frontendCapability.evidenceType, 'artifact');
    assert.ok(frontendSource);
    assert.equal(frontendSource.quarantineRequired, true);
    assert.equal(pack.status, 'quarantined');
    assert.equal(route.recommendedProfile, 'frontend');
    assert.equal(route.allowedProfiles.includes('frontend'), true);
    assert.equal(route.requiredCapabilities.includes('project.skill.frontend_review'), true);
    assert.equal(route.requiredCapabilities.includes('playwright.browser_validation'), true);
    assert.equal(route.resolvedAliases?.some((alias) => alias.input === 'frontend-dev' && alias.resolved === 'frontend'), true);
    assert.equal(route.routingRuleHits?.includes('frontend-default'), true);
    assert.equal(route.registrySources?.some((source) => source.id === 'frontend' && source.origin === 'project_config'), true);
    assert.equal((route.quarantineWarnings?.length ?? 0) > 0, true);
    assert.equal(route.adapterMapping?.hostAdapter, 'claude_code');
    assert.equal(route.toolPermission?.toolGroups.includes('browser'), true);
    assert.equal(runtimeText.stdout.includes('project_profiles=frontend'), true);
    assert.equal(runtimeText.stdout.includes('routing_rules=frontend-default'), true);
    assert.equal(skillListText.stdout.includes('project.skill.frontend_review'), true);
    assert.equal(skillListText.stdout.includes('origin=project_config'), true);
    assert.equal(sourceListText.stdout.includes('project_frontend_material'), true);
    assert.equal(sourceListText.stdout.includes('origin=project_config'), true);
    assert.equal(packText.stdout.includes('status=quarantined'), true);
    assert.equal(routeText.stdout.includes('recommended_profile=frontend'), true);
    assert.equal(routeText.stdout.includes('alias_resolutions=frontend-dev->frontend:project_config'), true);
    assert.equal(routeText.stdout.includes('routing_rule_hits=frontend-default'), true);
    assert.equal(routeText.stdout.includes('quarantine_warnings'), true);
    assert.equal(parsedRoute.recommendedProfile, 'frontend');
    assert.deepEqual(parsedRoute.routingRuleHits, ['frontend-default']);
    assert.equal(parsedRoute.resolvedAliases.some((alias) => alias.input === 'frontend-dev' && alias.resolved === 'frontend'), true);
    assert.equal(parsedRoute.registrySources.some((source) => source.id === 'project.skill.frontend_review' && source.origin === 'project_config'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.3 invalid agent runtime declarations fail closed', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase63-invalid-runtime-'));
  try {
    await initProject(root);
    await appendProjectRuntimeConfig(root, phase63InvalidProjectRuntimeConfig());

    const validation = await validateAgentSkillTeamRuntime(root);
    const issueText = validation.issues.map((issue) => `${issue.field}: ${issue.message}`).join('\n');

    assert.equal(validation.valid, false);
    assert.match(issueText, /agent_runtime\.aliases\.frontend_dev/);
    assert.match(issueText, /Alias points to unknown profile missing_profile/);
    assert.match(issueText, /bad-rule\.preferProfile/);
    assert.match(issueText, /missing\.capability/);
    assert.match(issueText, /project\.skill\.bad\.evidenceType/);
    assert.match(issueText, /unknown source missing_source/);
    assert.match(issueText, /unsafe_source\.attribution/);
    assert.match(issueText, /Quarantined source cannot be reused directly/);
    assert.match(issueText, /Quarantined source requests prompt import, direct execution, or lifecycle authority/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6 task execution persists agent and team evidence records', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase60-execution-records-'));
  try {
    await initProject(root);

    const result = await runSingleTaskLoop(root, { taskId: 'ONBOARDING-1', branch: 'master' });
    const inspection = await inspectRun(root, result.runId);
    const status = await getProjectStatus(root, { branch: 'master' });
    const report = await doctor(root, { latestOnly: true });

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

test('CLI do task exposes Phase 6 route and persisted evidence visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase60-do-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);

    let doStdout = '';
    try {
      const success = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'do', 'task', 'ONBOARDING-1', '--team-mode'], { cwd: root });
      doStdout = success.stdout;
    } catch (error) {
      const failed = error as { stdout?: string; code?: number };
      assert.equal(failed.code, 1);
      doStdout = failed.stdout ?? '';
    }
    const runId = /- run ([^\s]+) created/.exec(doStdout)?.[1];
    assert.ok(runId);

    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'run', 'inspect', runId], { cwd: root });
    const status = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'status', '--branch', 'master'], { cwd: root });

    assert.match(doStdout, /router category=implementation_review/);
    assert.match(doStdout, /team_mode=enabled mode=review-lite activation=force cost=low/);
    assert.match(doStdout, /agent_execution_records=\.sdd\/runs\//);
    assert.match(doStdout, /team_session_records=\.sdd\/runs\//);
    assert.match(inspect.stdout, /agent_executions=2/);
    assert.match(inspect.stdout, /team_sessions=1/);
    assert.match(inspect.stdout, /mode=review-lite activation=force cost=low/);
    assert.match(status.stdout, /latest_run_evidence route_preflight=true agent_executions=2 team_sessions=1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 5.4 query status contract exposes output boundaries', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase54-query-status-'));
  try {
    await initProject(root);

    const contract = await inspectQueryStatusContract(root);
    const validation = await validateQueryStatusContract(root);

    assert.equal(contract.version, 'phase-5.4-query-status-v1');
    assert.equal(contract.sourceDocument, 'docs/architecture/command-information-architecture.md');
    assert.deepEqual(contract.surfaces.map((surface) => surface.id), ['status', 'doctor', 'run_inspect', 'debug']);
    assert.match(contract.surfaces.find((surface) => surface.id === 'status')?.responsibility ?? '', /recommended next action/);
    assert.match(contract.surfaces.find((surface) => surface.id === 'doctor')?.responsibility ?? '', /Audit project health/);
    assert.match(contract.surfaces.find((surface) => surface.id === 'run_inspect')?.responsibility ?? '', /execution evidence/);
    assert.match(contract.surfaces.find((surface) => surface.id === 'debug')?.responsibility ?? '', /drill-down/);
    assert.equal(validation.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports Phase 5.4 query status contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase54-query-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'query_status_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-5\.4-query-status-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI exposes Phase 5.4 query status commands', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase54-query-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);

    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'query-status', 'inspect'], { cwd: root });
    const validate = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'query-status', 'validate', '--json'], { cwd: root });
    const parsed = JSON.parse(validate.stdout) as { valid: boolean; version: string; surfaces: Array<{ id: string }> };

    assert.match(inspect.stdout, /SDD query status contract/);
    assert.match(inspect.stdout, /status command=sdd status --branch <branch>/);
    assert.match(inspect.stdout, /doctor command=sdd doctor/);
    assert.equal(parsed.valid, true);
    assert.equal(parsed.version, 'phase-5.4-query-status-v1');
    assert.deepEqual(parsed.surfaces.map((surface) => surface.id), ['status', 'doctor', 'run_inspect', 'debug']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 5.5 eval, learning, and context pack contracts validate against ERP trial evidence', async () => {
  const root = process.cwd();

  const evalContract = await inspectSkillAgentEvalContract(root);
  const evalValidation = await validateSkillAgentEvalContract(root);
  const learningContract = await inspectHarnessLearningContract(root);
  const learningValidation = await validateHarnessLearningContract(root);
  const contextPack = await inspectProjectContextPackContract(root);
  const contextValidation = await validateProjectContextPackContract(root);

  assert.equal(evalContract.version, 'phase-5.5-skill-agent-eval-v1');
  assert.equal(evalContract.sourceReport, 'docs/research/real-project-trial-evaluation-20260507.md');
  assert.deepEqual(evalContract.dimensions.map((dimension) => dimension.id), [
    'novel_judgment',
    'risk_identification',
    'task_slicing',
    'agent_evidence',
    'output_concision',
    'verification_executability',
    'autonomy_correctness',
    'agent_fit',
    'verification_availability',
    'gap_closure'
  ]);
  assert.equal(evalValidation.valid, true);
  assert.equal(learningContract.allowedSinks.some((sink) => sink.id === 'project_context_pack'), true);
  assert.equal(learningContract.allowedSinks.some((sink) => sink.id === 'risk_vocabulary'), true);
  assert.equal(learningContract.forbiddenOutputs.includes('self-modifying runtime'), true);
  assert.equal(learningValidation.valid, true);
  assert.equal(contextPack.entryPoint, 'context/memory/MEMORY.md');
  assert.equal(contextPack.runtimeSourcesOfTruth.some((source) => source.includes('.sdd/project.yml')), true);
  assert.equal(contextPack.runtimeSourcesOfTruth.some((source) => source.includes('specs/<branch>')), true);
  assert.equal(contextPack.runtimeSourcesOfTruth.some((source) => source.includes('.sdd/runs')), true);
  assert.equal(contextValidation.valid, true);
});

test('Phase 5.5 validations do not require platform-only assets in user projects', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase55-user-project-'));
  try {
    await initProject(root);

    const evalValidation = await validateSkillAgentEvalContract(root);
    const learningValidation = await validateHarnessLearningContract(root);
    const contextPackValidation = await validateProjectContextPackContract(root);

    assert.equal(evalValidation.valid, true);
    assert.equal(evalValidation.issues.some((issue) => issue.field === 'skillAgentEval.corpus'), false);
    assert.equal(learningValidation.valid, true);
    assert.equal(learningValidation.issues.some((issue) => issue.field === 'harnessLearning.sourceTrial'), false);
    assert.equal(contextPackValidation.valid, true);
    assert.equal(contextPackValidation.issues.some((issue) => issue.field === 'projectContextPack.entryPoint'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports Phase 5.5 contract visibility', async () => {
  const report = await doctor(process.cwd(), { latestOnly: true });

  const evalCheck = report.checks.find((item) => item.check === 'skill_agent_eval_contract');
  const learningCheck = report.checks.find((item) => item.check === 'harness_learning_contract');
  const contextPackCheck = report.checks.find((item) => item.check === 'project_context_pack_contract');

  assert.equal(evalCheck?.level, 'PASS');
  assert.match(evalCheck?.message ?? '', /phase-5\.5-skill-agent-eval-v1/);
  assert.equal(learningCheck?.level, 'PASS');
  assert.match(learningCheck?.message ?? '', /phase-5\.5-harness-learning-v1/);
  assert.equal(contextPackCheck?.level, 'PASS');
  assert.match(contextPackCheck?.message ?? '', /phase-5\.5-project-context-pack-v1/);
});

test('CLI exposes Phase 5.5 eval, learning, and context pack commands', async () => {
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;

  const evalInspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'eval', 'inspect'], { cwd: process.cwd() });
  const evalValidate = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'eval', 'validate', '--json'], { cwd: process.cwd() });
  const learningInspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'learning', 'inspect'], { cwd: process.cwd() });
  const learningValidate = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'learning', 'validate', '--json'], { cwd: process.cwd() });
  const contextPackInspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'context-pack', 'inspect'], { cwd: process.cwd() });
  const contextPackValidate = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'context-pack', 'validate', '--json'], { cwd: process.cwd() });
  const parsedEval = JSON.parse(evalValidate.stdout) as { valid: boolean; version: string; contract: { dimensions: Array<{ id: string }> } };
  const parsedLearning = JSON.parse(learningValidate.stdout) as { valid: boolean; version: string; contract: { allowedSinks: Array<{ id: string }> } };
  const parsedContextPack = JSON.parse(contextPackValidate.stdout) as { valid: boolean; version: string; contract: { entryPoint: string } };

  assert.match(evalInspect.stdout, /SDD skill\/agent eval contract/);
  assert.match(evalInspect.stdout, /risk_identification/);
  assert.equal(parsedEval.valid, true);
  assert.equal(parsedEval.version, 'phase-5.5-skill-agent-eval-v1');
  assert.equal(parsedEval.contract.dimensions.some((dimension) => dimension.id === 'agent_fit'), true);
  assert.match(learningInspect.stdout, /SDD harness learning contract/);
  assert.match(learningInspect.stdout, /generated_entry_guidance/);
  assert.equal(parsedLearning.valid, true);
  assert.equal(parsedLearning.version, 'phase-5.5-harness-learning-v1');
  assert.equal(parsedLearning.contract.allowedSinks.some((sink) => sink.id === 'doctor_check'), true);
  assert.match(contextPackInspect.stdout, /SDD project context pack contract/);
  assert.match(contextPackInspect.stdout, /runtime_sources_of_truth/);
  assert.equal(parsedContextPack.valid, true);
  assert.equal(parsedContextPack.version, 'phase-5.5-project-context-pack-v1');
  assert.equal(parsedContextPack.contract.entryPoint, 'context/memory/MEMORY.md');
});

test('AI entry drift check distinguishes managed drift from user modifications', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-drift-'));
  try {
    await initProject(root);
    const commandPath = path.join(root, '.claude', 'commands', 'sdd.md');
    const original = await readFile(commandPath, 'utf8');
    const oldManagedTemplate = withManagedHash(original.replace('Use SDD as the natural-language intent router for this repository while keeping CLI/core output as the source of truth.', 'Run the SDD workflow entrypoint for this repository.'));
    await writeFile(commandPath, oldManagedTemplate, 'utf8');

    const drift = await checkAiToolEntryDrift(root);
    const driftedEntry = drift[0].entries.find((entry) => entry.id === 'sdd-root');
    assert.equal(driftedEntry?.status, 'drifted');
    assert.equal(driftedEntry?.driftStatus, 'drifted');
    assert.equal(driftedEntry?.manifest.path, '.claude/commands/sdd.md');
    assert.equal(driftedEntry?.manifest.artifactId, 'sdd-root');
    assert.equal(driftedEntry?.manifest.ownership, 'sdd-managed');
    assert.equal(driftedEntry?.manifest.sourceContract, 'sdd-ai-entry-v1');

    const update = await applyAiToolEntries(root);
    assert.equal(update[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'updated'), true);
    const clean = await checkAiToolEntryDrift(root);
    assert.equal(clean[0].entries.every((entry) => entry.status === 'unchanged'), true);

    await writeFile(commandPath, `${await readFile(commandPath, 'utf8')}\nmanual drift\n`, 'utf8');
    const userModified = await checkAiToolEntryDrift(root);
    assert.equal(userModified[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'user-modified'), true);
    const skippedUpdate = await applyAiToolEntries(root);
    assert.equal(skippedUpdate[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'user-modified'), true);
    assert.match(await readFile(commandPath, 'utf8'), /manual drift/);
    const doctorReport = await doctor(root, { latestOnly: true });
    assert.equal(doctorReport.checks.some((check) => check.check === 'ai_entry_sdd-root' && check.level === 'FAIL' && /will not overwrite user-modified/.test(check.action ?? '')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AI entry drift check includes managed entry version', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-version-drift-'));
  try {
    await initProject(root);
    const commandPath = path.join(root, '.claude', 'commands', 'sdd.md');
    const original = await readFile(commandPath, 'utf8');
    await writeFile(commandPath, original.replace('sdd_version: "0.3.0"', 'sdd_version: "0.2.0"'), 'utf8');

    const drift = await checkAiToolEntryDrift(root);
    assert.equal(drift[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'drifted'), true);

    const update = await applyAiToolEntries(root);
    assert.equal(update[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'updated'), true);
    assert.match(await readFile(commandPath, 'utf8'), /sdd_version: "0\.3\.0"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AI entry projection refuses foreign files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-foreign-'));
  try {
    await mkdir(path.join(root, '.claude', 'commands'), { recursive: true });
    await writeFile(path.join(root, '.claude', 'commands', 'sdd.md'), 'user-owned command', 'utf8');
    const init = await initProject(root);
    const foreign = init.aiTools[0].entries.find((entry) => entry.id === 'sdd-root');

    assert.equal(foreign?.status, 'foreign');
    assert.equal(await readFile(path.join(root, '.claude', 'commands', 'sdd.md'), 'utf8'), 'user-owned command');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor renderer summarizes checks with next action', () => {
  const rendered = renderDoctorReport({
    status: 'FAIL',
    checks: [
      { level: 'PASS', check: 'config', message: 'config ok' },
      { level: 'FAIL', check: 'ai_entry', message: 'entry drifted', action: 'Run sdd update' }
    ]
  });

  assert.match(rendered, /^SDD doctor/);
  assert.match(rendered, /checks pass=1 warn=0 fail=1/);
  assert.match(rendered, /\[FAIL\] ai_entry/);
  assert.match(rendered, /next\n- Run sdd update/);
});


test('CLI help groups common workflow commands and links advanced help', async () => {
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const { stdout } = await execFileAsync(process.execPath, ['--import', 'tsx', cliPath, '--help'], {
    cwd: process.cwd()
  });
  const workflow = await execFileAsync(process.execPath, ['--import', 'tsx', cliPath, 'help', 'workflow'], {
    cwd: process.cwd()
  });
  const advanced = await execFileAsync(process.execPath, ['--import', 'tsx', cliPath, 'help', 'advanced'], {
    cwd: process.cwd()
  });

  assert.match(stdout, /Common workflow:/);
  assert.match(stdout, /sdd init \[--force\] \[--ai <mode>\] \[--scaffold-docs\] \[--json\]/);
  assert.match(stdout, /sdd status \[--branch <branch>\] \[--json\|--compact-json\]/);
  assert.match(stdout, /sdd artifact template <path> --task <task_id> --agent <agent> \[--run <run_id> --write\]/);
  assert.match(stdout, /More help:/);
  assert.match(stdout, /init --branch is legacy starter-doc scaffolding/);
  assert.doesNotMatch(stdout, /sdd plugins list \[--json\]/);
  assert.match(workflow.stdout, /sdd workflow help/);
  assert.match(workflow.stdout, /--compact-json prints one-line JSON/);
  assert.match(advanced.stdout, /sdd advanced help/);
  assert.match(advanced.stdout, /sdd plugins list\|inspect \[--json\]/);
  assert.match(advanced.stdout, /sdd init --branch <branch> creates starter docs/);
});

test('tool capability registry lists sorted baseline capabilities and supports inspect', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-capabilities-api-'));
  try {
    await initProject(root);
    const registry = await listToolCapabilities(root);
    const ids = registry.capabilities.map((capability) => capability.id);
    const sortedIds = [...ids].sort((left, right) => left.localeCompare(right));
    const sddCli = await inspectToolCapability(root, 'sdd-cli');
    const missing = await inspectToolCapability(root, 'missing-capability');

    assert.equal(registry.version, 'phase-3.1-tool-capability-registry-v1');
    assert.deepEqual(ids, sortedIds);
    assert.deepEqual(ids, [
      'artifact-run-hygiene',
      'browser-ui-check',
      'git-local',
      'governance-policy',
      'hashline-edit',
      'native-file-edit',
      'sdd-cli',
      'validation-command'
    ]);
    assert.equal(sddCli?.id, 'sdd-cli');
    assert.equal(sddCli?.forbiddenUses.includes('background write orchestration'), true);
    assert.equal(missing, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports capability registry visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-capabilities-doctor-'));
  try {
    await initProject(root);
    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'capability_registry');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.1-tool-capability-registry-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI capabilities list and inspect registry declarations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-capabilities-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    const list = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'capabilities', 'list'], { cwd: root });
    const listJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'capabilities', 'list', '--json'], { cwd: root });
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'capabilities', 'inspect', 'sdd-cli'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'capabilities', 'inspect', 'sdd-cli', '--json'], { cwd: root });
    const parsedList = JSON.parse(listJson.stdout) as { capabilities: Array<{ id: string }> };
    const parsedInspect = JSON.parse(inspectJson.stdout) as { id: string; forbiddenUses: string[] };

    assert.match(list.stdout, /sdd-cli category=runtime side_effect=command_execution/);
    assert.equal(parsedList.capabilities.some((capability) => capability.id === 'sdd-cli'), true);
    assert.match(inspect.stdout, /Capability sdd-cli/);
    assert.match(inspect.stdout, /forbidden_uses/);
    assert.equal(parsedInspect.id, 'sdd-cli');
    assert.equal(parsedInspect.forbiddenUses.includes('background write orchestration'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('tool plugin contracts list sorted baseline mappings and support inspect', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-plugins-api-'));
  try {
    await initProject(root);
    const [capabilities, plugins] = await Promise.all([
      listToolCapabilities(root),
      listToolPluginContracts(root)
    ]);
    const capabilityIds = new Set(capabilities.capabilities.map((capability) => capability.id));
    const ids = plugins.contracts.map((contract) => contract.id);
    const sortedIds = [...ids].sort((left, right) => left.localeCompare(right));
    const sddCliRuntime = await inspectToolPluginContract(root, 'sdd-cli-runtime');
    const missing = await inspectToolPluginContract(root, 'missing-plugin');

    assert.equal(plugins.version, 'phase-3.2-tool-plugin-loading-contract-v1');
    assert.deepEqual(ids, sortedIds);
    assert.deepEqual(ids, [
      'artifact-run-hygiene-tools',
      'browser-ui-check-adapter',
      'git-local-inspection',
      'hashline-edit-adapter',
      'native-file-edit-adapter',
      'sdd-cli-runtime',
      'validation-command-runner'
    ]);
    assert.equal(plugins.contracts.every((contract) => capabilityIds.has(contract.capabilityId)), true);
    assert.equal(sddCliRuntime?.capabilityId, 'sdd-cli');
    assert.equal(sddCliRuntime?.forbiddenUses.includes('dynamic plugin execution'), true);
    assert.equal(missing, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports plugin loading contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-plugins-doctor-'));
  try {
    await initProject(root);
    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'plugin_loading_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.2-tool-plugin-loading-contract-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI plugins list and inspect loading contract declarations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-plugins-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    const list = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'plugins', 'list'], { cwd: root });
    const listJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'plugins', 'list', '--json'], { cwd: root });
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'plugins', 'inspect', 'sdd-cli-runtime'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'plugins', 'inspect', 'sdd-cli-runtime', '--json'], { cwd: root });
    const parsedList = JSON.parse(listJson.stdout) as { contracts: Array<{ id: string; capabilityId: string }> };
    const parsedInspect = JSON.parse(inspectJson.stdout) as { id: string; capabilityId: string; forbiddenUses: string[] };

    assert.match(list.stdout, /sdd-cli-runtime capability=sdd-cli entry=cli load_mode=static_manifest/);
    assert.equal(parsedList.contracts.some((contract) => contract.id === 'sdd-cli-runtime' && contract.capabilityId === 'sdd-cli'), true);
    assert.match(inspect.stdout, /Plugin contract sdd-cli-runtime/);
    assert.match(inspect.stdout, /asset_path=dist\/packages\/cli\/src\/main\.js/);
    assert.equal(parsedInspect.id, 'sdd-cli-runtime');
    assert.equal(parsedInspect.capabilityId, 'sdd-cli');
    assert.equal(parsedInspect.forbiddenUses.includes('dynamic plugin execution'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('delegation queue contract derives stable items from run-state delegations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-queue-api-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'queue-run-001' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T001-implementer-001',
      task: 'T001',
      agent: 'implementer',
      expectedArtifact: 'artifacts/implement-T001.md',
      runMode: 'background'
    });
    await writeRunState(root, {
      ...state,
      currentTask: 'T001',
      delegations: { [delegation.delegationId]: delegation }
    });

    const snapshot = await listDelegationQueueItems(root);
    const scopedSnapshot = await listDelegationQueueItems(root, { runId: 'queue-run-001' });
    const item = await inspectDelegationQueueItem(root, 'queue-run-001:D-T001-implementer-001');
    const missing = await inspectDelegationQueueItem(root, 'missing:item');

    assert.equal(snapshot.version, 'phase-3.3-delegation-queue-contract-v1');
    assert.equal(snapshot.items.length, 1);
    assert.equal(scopedSnapshot.items.length, 1);
    assert.equal(item?.id, 'queue-run-001:D-T001-implementer-001');
    assert.equal(item?.taskId, 'T001');
    assert.equal(item?.requestedCapabilityId, 'sdd-cli');
    assert.equal(item?.dedupeKey, 'queue-run-001:T001:implementer');
    assert.equal(item?.statusSource, 'run_state_delegation');
    assert.equal(item?.requiredEvidence.includes('artifacts/implement-T001.md'), true);
    assert.equal(missing, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports delegation queue contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-queue-doctor-'));
  try {
    await initProject(root);
    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'delegation_queue_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.3-delegation-queue-contract-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI queue list and inspect derived delegation items', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-queue-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'queue-run-002' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T002-reviewer-001',
      task: 'T002',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T002.md',
      runMode: 'background'
    });
    await writeRunState(root, {
      ...state,
      currentTask: 'T002',
      delegations: { [delegation.delegationId]: delegation }
    });

    const list = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'queue', 'list'], { cwd: root });
    const listJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'queue', 'list', '--json'], { cwd: root });
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'queue', 'inspect', 'queue-run-002:D-T002-reviewer-001'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'queue', 'inspect', 'queue-run-002:D-T002-reviewer-001', '--json'], { cwd: root });
    const parsedList = JSON.parse(listJson.stdout) as { items: Array<{ id: string; requestedCapabilityId: string }> };
    const parsedInspect = JSON.parse(inspectJson.stdout) as { id: string; taskId: string; requestedCapabilityId: string };

    assert.match(list.stdout, /queue-run-002:D-T002-reviewer-001 task=T002 agent=reviewer status=RUNNING capability=sdd-cli/);
    assert.equal(parsedList.items.some((item) => item.id === 'queue-run-002:D-T002-reviewer-001' && item.requestedCapabilityId === 'sdd-cli'), true);
    assert.match(inspect.stdout, /Queue item queue-run-002:D-T002-reviewer-001/);
    assert.match(inspect.stdout, /dedupe_key=queue-run-002:T002:reviewer/);
    assert.equal(parsedInspect.id, 'queue-run-002:D-T002-reviewer-001');
    assert.equal(parsedInspect.taskId, 'T002');
    assert.equal(parsedInspect.requestedCapabilityId, 'sdd-cli');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('delegation state machine exposes allowed transitions and blocks terminal reopen', () => {
  const machine = getDelegationStateMachine();
  const allowed = validateDelegationStateTransition('RUNNING', 'COMPLETED', 'delegation_completed');
  const retry = validateDelegationStateTransition('RECOVERABLE', 'RUNNING', 'delegation_retry_started');
  const terminalReopen = validateDelegationStateTransition('COMPLETED', 'RUNNING', 'delegation_retry_started');
  const wrongEvent = validateDelegationStateTransition('RUNNING', 'COMPLETED', 'delegation_failed');

  assert.equal(machine.version, 'phase-3.4-delegation-state-machine-v1');
  assert.equal(machine.statuses.includes('RECOVERABLE'), true);
  assert.equal(machine.terminalStatuses.includes('COMPLETED'), true);
  assert.equal(machine.transitions.some((transition) => transition.from === 'STALE' && transition.to === 'TIMED_OUT' && transition.event === 'delegation_timeout'), true);
  assert.equal(allowed.valid, true);
  assert.equal(retry.valid, true);
  assert.equal(terminalReopen.valid, false);
  assert.match(terminalReopen.issues.map((issue) => issue.message).join('\n'), /Terminal delegation status COMPLETED cannot transition to RUNNING/);
  assert.equal(wrongEvent.valid, false);
});

test('doctor reports delegation state machine visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-state-machine-doctor-'));
  try {
    await initProject(root);
    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'delegation_state_machine');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.4-delegation-state-machine-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports illegal delegation event transitions', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-state-machine-events-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'state-machine-run-001' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T003-implementer-001',
      task: 'T003',
      agent: 'implementer',
      expectedArtifact: 'artifacts/implement-T003.md'
    });
    await writeRunState(root, {
      ...state,
      delegations: {
        [delegation.delegationId]: { ...delegation, status: 'COMPLETED', terminalEventAt: new Date().toISOString() }
      }
    });
    await appendEvent(root, 'state-machine-run-001', {
      event: 'delegation_started',
      runId: 'state-machine-run-001',
      data: { delegationId: delegation.delegationId }
    });
    await appendEvent(root, 'state-machine-run-001', {
      event: 'delegation_completed',
      runId: 'state-machine-run-001',
      data: { delegationId: delegation.delegationId }
    });
    await appendEvent(root, 'state-machine-run-001', {
      event: 'delegation_started',
      runId: 'state-machine-run-001',
      data: { delegationId: delegation.delegationId }
    });

    const report = await doctor(root, { allRuns: true });
    const check = report.checks.find((item) => item.check === 'delegation_state_transition');

    assert.equal(check?.level, 'FAIL');
    assert.match(check?.message ?? '', /cannot transition COMPLETED -> RUNNING on delegation_started/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI state-machine inspect prints transition contract', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-state-machine-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'state-machine', 'inspect'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'state-machine', 'inspect', '--json'], { cwd: root });
    const parsed = JSON.parse(inspectJson.stdout) as { version: string; transitions: Array<{ from: string; to: string; event: string }> };

    assert.match(inspect.stdout, /Delegation state machine phase-3\.4-delegation-state-machine-v1/);
    assert.match(inspect.stdout, /RUNNING -> COMPLETED event=delegation_completed/);
    assert.equal(parsed.version, 'phase-3.4-delegation-state-machine-v1');
    assert.equal(parsed.transitions.some((transition) => transition.from === 'RUNNING' && transition.to === 'TIMED_OUT' && transition.event === 'delegation_timeout'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('worker adapter contracts list sorted baseline manifests and support inspect', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-workers-api-'));
  try {
    await initProject(root);
    const registry = await listWorkerAdapterContracts(root);
    const ids = registry.adapters.map((adapter) => adapter.id);
    const sortedIds = [...ids].sort((left, right) => left.localeCompare(right));
    const adapter = await inspectWorkerAdapterContract(root, 'claude-code-subagent-worker');
    const missing = await inspectWorkerAdapterContract(root, 'missing-worker');

    assert.equal(registry.version, 'phase-3.5-worker-adapter-contract-v1');
    assert.deepEqual(ids, sortedIds);
    assert.deepEqual(ids, [
      'claude-code-subagent-worker',
      'manual-handoff-worker',
      'sdd-cli-task-worker'
    ]);
    assert.equal(adapter?.capabilityId, 'sdd-cli');
    assert.equal(adapter?.pluginContractId, 'sdd-cli-runtime');
    assert.equal(adapter?.input.stateMachineVersion, 'phase-3.4-delegation-state-machine-v1');
    assert.equal(adapter?.output.requiredEvents.includes('delegation_timeout'), true);
    assert.equal(adapter?.forbiddenUses.includes('bypass Claude Code permission prompts'), true);
    assert.equal(missing, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports worker adapter contract compatibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-workers-doctor-'));
  try {
    await initProject(root);
    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'worker_adapter_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.5-worker-adapter-contract-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI workers list and inspect adapter manifests', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-workers-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    const list = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'workers', 'list'], { cwd: root });
    const listJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'workers', 'list', '--json'], { cwd: root });
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'workers', 'inspect', 'claude-code-subagent-worker'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'workers', 'inspect', 'claude-code-subagent-worker', '--json'], { cwd: root });
    const parsedList = JSON.parse(listJson.stdout) as { adapters: Array<{ id: string; pluginContractId: string }> };
    const parsedInspect = JSON.parse(inspectJson.stdout) as { id: string; capabilityId: string; input: { stateMachineVersion: string } };

    assert.match(list.stdout, /claude-code-subagent-worker kind=claude_code_subagent capability=sdd-cli plugin=sdd-cli-runtime/);
    assert.equal(parsedList.adapters.some((adapter) => adapter.id === 'claude-code-subagent-worker' && adapter.pluginContractId === 'sdd-cli-runtime'), true);
    assert.match(inspect.stdout, /Worker adapter claude-code-subagent-worker/);
    assert.match(inspect.stdout, /permission_prompt=Run a Claude Code\/subagent task/);
    assert.equal(parsedInspect.id, 'claude-code-subagent-worker');
    assert.equal(parsedInspect.capabilityId, 'sdd-cli');
    assert.equal(parsedInspect.input.stateMachineVersion, 'phase-3.4-delegation-state-machine-v1');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

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

test('CLI isolation inspect renders dry-run decision', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-isolation-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${taskMarkdownWithFiles('T1', ['packages/core/src/index.ts'], [])}`);

    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'isolation', 'inspect', 'T1', '--branch', 'master', '--capability', 'native-file-edit'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'isolation', 'inspect', 'T1', '--branch', 'master', '--capability', 'git-local', '--json'], { cwd: root });
    const parsed = JSON.parse(inspectJson.stdout) as { mode: string; capabilitySideEffect: string };

    assert.match(inspect.stdout, /Worktree isolation required for T1/);
    assert.match(inspect.stdout, /safe_concurrency=true capability=native-file-edit side_effect=local_write/);
    assert.equal(parsed.mode, 'none');
    assert.equal(parsed.capabilitySideEffect, 'read_only');
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

test('CLI worktree lifecycle create inspect and remove', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-worktree-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${taskMarkdownWithFiles('T1', ['packages/core/src/index.ts'], [])}`);
    await initializeGitRepository(root);
    await createRun(root, { runId: 'run-1' });

    const create = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'worktree', 'create', 'run-1', 'T1', '--id', 'wt-run-1-T1'], { cwd: root });
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'worktree', 'inspect', 'run-1', '--json'], { cwd: root });
    const remove = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'worktree', 'remove', 'run-1', 'wt-run-1-T1'], { cwd: root });
    const parsed = JSON.parse(inspect.stdout) as { valid: boolean; records: Array<{ worktreeId: string; status: string }> };

    assert.match(create.stdout, /Worktree created: wt-run-1-T1/);
    assert.equal(parsed.valid, true);
    assert.equal(parsed.records[0]?.worktreeId, 'wt-run-1-T1');
    assert.match(remove.stdout, /Worktree removed: wt-run-1-T1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('task graph planner builds dependency and file overlap graph', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-graph-valid-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('G1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('G2', ['G1'], ['./src/a.ts', 'src/b.ts'], ['security'])}`);

    const graph = await inspectTaskGraph(root, { branch: 'master' });

    assert.equal(graph.version, 'phase-3.9-task-graph-planner-v1');
    assert.equal(graph.valid, true);
    assert.equal(graph.nodes.length, 2);
    assert.deepEqual(graph.dependencyEdges, [{ from: 'G1', to: 'G2', type: 'depends_on', files: [] }]);
    assert.deepEqual(graph.fileOverlapEdges, [{ from: 'G1', to: 'G2', type: 'file_overlap', files: ['src/a.ts'] }]);
    assert.deepEqual(graph.summary.highRiskTasks, ['G2']);
    assert.deepEqual(graph.summary.validationCommands, ['npm test']);
    assert.equal(graph.contract, 'phase-5.3-task-graph-v1');
    assert.deepEqual(graph.nodes[1].agentFit, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('task graph parses Phase 5.3 harness metadata fields', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase53-task-graph-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${harnessTaskMarkdown('H1')}`);

    const graph = await inspectTaskGraph(root, { branch: 'master' });
    const node = graph.nodes[0];

    assert.equal(graph.contract, 'phase-5.3-task-graph-v1');
    assert.deepEqual(node.fileOwnership, ['packages/core/src/index.ts']);
    assert.deepEqual(node.agentFit, ['implementer', 'validator']);
    assert.deepEqual(node.verificationAvailability, ['unit-test', 'cli-smoke']);
    assert.equal(node.autonomy, 'foreground_write');
    assert.deepEqual(node.allowedAgents, ['implementer', 'validator']);
    assert.deepEqual(node.requiredArtifacts, ['artifacts/implementer-H1.md', 'artifacts/validation-H1.md']);
    assert.equal(node.gapState, 'none');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('task graph planner blocks missing dependency and cycle diagnostics', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-graph-blocked-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('C1', ['C2'], ['src/c1.ts'], [])}\n${graphTaskMarkdown('C2', ['C1'], ['src/c2.ts'], [])}\n${graphTaskMarkdown('M1', ['M404'], ['src/m1.ts'], [])}`);

    const graph = await inspectTaskGraph(root, { branch: 'master' });

    assert.equal(graph.valid, false);
    assert.equal(graph.diagnostics.some((diagnostic) => /unknown task M404/.test(diagnostic.message)), true);
    assert.equal(graph.diagnostics.some((diagnostic) => /Task dependency cycle detected: C1 -> C2 -> C1|Task dependency cycle detected: C2 -> C1 -> C2/.test(diagnostic.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports task graph planner contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-graph-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'task_graph_planner_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.9-task-graph-planner-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI graph inspect renders graph plan', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-graph-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('G1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('G2', ['G1'], ['src/b.ts'], [])}`);

    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'graph', 'inspect'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'graph', 'inspect', '--json'], { cwd: root });
    const parsed = JSON.parse(inspectJson.stdout) as { valid: boolean; dependencyEdges: Array<{ from: string; to: string }> };
    const parsedHarness = JSON.parse(inspectJson.stdout) as { contract: string; nodes: Array<{ agentFit: string[]; verificationAvailability: string[]; autonomy: string | null; allowedAgents: string[]; requiredArtifacts: string[]; gapState: string | null }> };

    assert.match(inspect.stdout, /Task graph valid for master/);
    assert.match(inspect.stdout, /G1 -> G2/);
    assert.match(inspect.stdout, /contract=phase-5\.3-task-graph-v1/);
    assert.match(inspect.stdout, /agent_fit=none/);
    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.dependencyEdges, [{ from: 'G1', to: 'G2', type: 'depends_on', files: [] }]);
    assert.equal(parsedHarness.contract, 'phase-5.3-task-graph-v1');
    assert.deepEqual(parsedHarness.nodes[0].agentFit, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave planner builds dependency waves and separates file overlaps', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-valid-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('W1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('W2', [], ['./src/a.ts'], [])}\n${graphTaskMarkdown('W3', ['W1'], ['src/c.ts'], [])}`);

    const plan = await inspectWavePlan(root, { branch: 'master', capabilityId: 'native-file-edit' });

    assert.equal(plan.version, 'phase-3.10-wave-planner-v1');
    assert.equal(plan.valid, true);
    assert.deepEqual(plan.waves.map((wave) => wave.tasks.map((task) => task.taskId)), [['W1'], ['W2', 'W3']]);
    assert.equal(plan.manualGates.length, 0);
    assert.equal(plan.blockedTasks.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave planner routes manual gates and downstream blocked tasks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-manual-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('DB1', [], ['db/schema.sql'], ['database'])}\n${graphTaskMarkdown('APP1', ['DB1'], ['src/app.ts'], [])}`);

    const plan = await inspectWavePlan(root, { branch: 'master', capabilityId: 'native-file-edit' });

    assert.equal(plan.valid, false);
    assert.deepEqual(plan.manualGates.map((gate) => gate.taskId), ['DB1']);
    assert.deepEqual(plan.blockedTasks.map((gate) => gate.taskId), ['APP1']);
    assert.match(plan.blockedTasks[0]?.reasons.join(' ') ?? '', /depends on non-plannable task\(s\): DB1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave planner blocks graph diagnostics', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-blocked-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('M1', ['M404'], ['src/m1.ts'], [])}`);

    const plan = await inspectWavePlan(root, { branch: 'master', capabilityId: 'native-file-edit' });

    assert.equal(plan.valid, false);
    assert.deepEqual(plan.blockedTasks.map((gate) => gate.taskId), ['M1']);
    assert.equal(plan.diagnostics.some((diagnostic) => /unknown task M404/.test(diagnostic.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports wave planner contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'wave_planner_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.10-wave-planner-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI wave inspect renders wave plan', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('W1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('W2', ['W1'], ['src/b.ts'], [])}`);

    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'wave', 'inspect'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'wave', 'inspect', '--json'], { cwd: root });
    const parsed = JSON.parse(inspectJson.stdout) as { valid: boolean; waves: Array<{ tasks: Array<{ taskId: string }> }> };

    assert.match(inspect.stdout, /Wave plan valid for master/);
    assert.match(inspect.stdout, /wave 1: W1/);
    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.waves.map((wave) => wave.tasks.map((task) => task.taskId)), [['W1'], ['W2']]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

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

test('CLI background run and inspect render executor evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-background-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const run = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'background', 'run', 'B1'], { cwd: root });
    const runJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'background', 'run', 'B1', '--delegation', 'B-B1-cli-001', '--json'], { cwd: root });
    const parsedRun = JSON.parse(runJson.stdout) as { status: string; runId: string; delegationId: string };
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'background', 'inspect', parsedRun.runId], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'background', 'inspect', parsedRun.runId, '--json'], { cwd: root });
    const parsedInspect = JSON.parse(inspectJson.stdout) as { valid: boolean; runningDelegations: number };

    assert.match(run.stdout, /Background executor claimed for B1/);
    assert.equal(parsedRun.status, 'claimed');
    assert.match(inspect.stdout, /Background executor valid/);
    assert.equal(parsedInspect.valid, true);
    assert.equal(parsedInspect.runningDelegations, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

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
    const report = await doctor(root, { latestOnly: true });

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

test('CLI worker-runtime claim status heartbeat and inspect render resident evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-resident-worker-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('B1', []));

    const claim = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'worker-runtime', 'claim', 'B1', '--runtime', 'R-B1-cli', '--lease-seconds', '60', '--json'], { cwd: root });
    const parsedClaim = JSON.parse(claim.stdout) as { status: string; runId: string; runtimeId: string };
    const status = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'worker-runtime', 'status', '--run', parsedClaim.runId], { cwd: root });
    const heartbeat = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'worker-runtime', 'heartbeat', 'R-B1-cli', '--run', parsedClaim.runId], { cwd: root });
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'worker-runtime', 'inspect', 'R-B1-cli', '--run', parsedClaim.runId], { cwd: root });
    const runInspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'run', 'inspect', parsedClaim.runId], { cwd: root });
    const projectStatus = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'status', '--branch', 'master'], { cwd: root });

    assert.equal(parsedClaim.status, 'claimed');
    assert.equal(parsedClaim.runtimeId, 'R-B1-cli');
    assert.match(status.stdout, /Resident worker runtimes/);
    assert.match(status.stdout, /R-B1-cli claimed/);
    assert.match(heartbeat.stdout, /Resident worker runtime active: R-B1-cli/);
    assert.match(inspect.stdout, /Resident worker runtime active: R-B1-cli/);
    assert.match(runInspect.stdout, /worker_runtimes=1/);
    assert.match(projectStatus.stdout, /worker_runtimes=1 stale_worker_runtimes=0/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave executor completes planner-safe waves from supplied artifacts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-complete-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('WX1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('WX2', [], ['src/b.ts'], [])}`);
    const run = await createRun(root, { runId: 'run-1' });
    await writeArtifact(root, run.runId, 'implementer-WX1.md', validResultArtifact('implementer', 'WX1', 'PASS', 'artifacts/implementer-WX1.md'));
    await writeArtifact(root, run.runId, 'implementer-WX2.md', validResultArtifact('implementer', 'WX2', 'PASS', 'artifacts/implementer-WX2.md'));

    const result = await runWaveExecutor(root, {
      runId: run.runId,
      artifactPaths: {
        WX1: 'artifacts/implementer-WX1.md',
        WX2: 'artifacts/implementer-WX2.md'
      }
    });
    const state = await readRunState(root, run.runId);
    const inspection = await inspectWaveExecutor(root, run.runId);

    assert.equal(result.version, 'phase-3.12-wave-executor-v1');
    assert.equal(result.status, 'completed');
    assert.equal(result.executedWaves, 1);
    assert.deepEqual(result.taskResults.map((task) => task.taskId).sort(), ['WX1', 'WX2']);
    assert.equal(state.status, 'completed');
    assert.equal(state.phase, 'wave');
    assert.equal(inspection.valid, true);
    assert.equal(inspection.background.terminalDelegations, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave executor blocks manual and blocked planner gates before execution', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-gates-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('DB1', [], ['db/schema.sql'], ['database'])}\n${graphTaskMarkdown('APP1', ['DB1'], ['src/app.ts'], [])}`);

    const result = await runWaveExecutor(root);

    assert.equal(result.status, 'blocked');
    assert.equal(result.executedWaves, 0);
    assert.deepEqual(result.manualGates.map((gate) => gate.taskId), ['DB1']);
    assert.deepEqual(result.blockedTasks.map((gate) => gate.taskId), ['APP1']);
    assert.equal(result.taskResults.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wave executor safe-continue finishes current safe wave but does not cross dependency boundary', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-safe-continue-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('WX1', [], ['src/a.ts'], [])}\n${graphTaskMarkdown('WX2', [], ['src/b.ts'], [])}\n${graphTaskMarkdown('WX3', ['WX1'], ['src/c.ts'], [])}`);
    const run = await createRun(root, { runId: 'run-1' });
    await writeArtifact(root, run.runId, 'implementer-WX2.md', validResultArtifact('implementer', 'WX2', 'PASS', 'artifacts/implementer-WX2.md'));
    await writeArtifact(root, run.runId, 'implementer-WX3.md', validResultArtifact('implementer', 'WX3', 'PASS', 'artifacts/implementer-WX3.md'));

    const result = await runWaveExecutor(root, {
      runId: run.runId,
      strategy: 'safe-continue',
      artifactPaths: {
        WX2: 'artifacts/implementer-WX2.md',
        WX3: 'artifacts/implementer-WX3.md'
      }
    });

    assert.equal(result.status, 'claimed');
    assert.equal(result.executedWaves, 1);
    assert.deepEqual(result.taskResults.map((task) => `${task.taskId}:${task.result.status}`).sort(), ['WX1:claimed', 'WX2:completed']);
    assert.equal(result.taskResults.some((task) => task.taskId === 'WX3'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports wave executor contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'wave_executor_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.12-wave-executor-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI wave run and executor inspect render wave execution evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('WX1', [], ['src/a.ts'], [])}`);
    const run = await createRun(root, { runId: 'run-1' });
    const jsonRun = await createRun(root, { runId: 'run-json' });
    await writeArtifact(root, run.runId, 'implementer-WX1.md', validResultArtifact('implementer', 'WX1', 'PASS', 'artifacts/implementer-WX1.md'));
    await writeArtifact(root, jsonRun.runId, 'implementer-WX1.md', validResultArtifact('implementer', 'WX1', 'PASS', 'artifacts/implementer-WX1.md'));
    const waveRun = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'wave', 'run', '--run', run.runId, '--artifact', 'WX1:artifacts/implementer-WX1.md'], { cwd: root });
    const waveRunJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'wave', 'run', '--run', 'run-json', '--artifact', 'WX1:artifacts/implementer-WX1.md', '--json'], { cwd: root });
    const parsedRun = JSON.parse(waveRunJson.stdout) as { status: string; runId: string };
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'wave', 'executor', parsedRun.runId], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'wave', 'executor', parsedRun.runId, '--json'], { cwd: root });
    const parsedInspect = JSON.parse(inspectJson.stdout) as { valid: boolean; waveEvents: unknown[] };

    assert.match(waveRun.stdout, /Wave executor completed for master/);
    assert.equal(parsedRun.status, 'completed');
    assert.match(inspect.stdout, /Wave executor valid/);
    assert.equal(parsedInspect.valid, true);
    assert.equal(parsedInspect.waveEvents.length > 0, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI run index rebuild inspect and query render derived evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-run-index-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    const run = await createRun(root, { runId: 'run-cli' });
    await writeRunState(root, { ...run, status: 'completed', currentTask: 'T1', tasks: { T1: { status: 'completed' } } });

    const rebuild = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'run', 'index', 'rebuild'], { cwd: root });
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'run', 'index', 'inspect'], { cwd: root });
    const queryJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'run', 'index', 'query', '--task', 'T1', '--json'], { cwd: root });
    const parsed = JSON.parse(queryJson.stdout) as { runs: Array<{ runId: string }>; tasks: Array<{ taskId: string }> };

    assert.match(rebuild.stdout, /Local run index phase-3.13-local-run-index-v1/);
    assert.match(inspect.stdout, /Local run index valid/);
    assert.deepEqual(parsed.runs.map((entry) => entry.runId), ['run-cli']);
    assert.deepEqual(parsed.tasks.map((entry) => entry.taskId), ['T1']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI compact JSON supports instructions run-index sync-back and artifact validation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-compact-json-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  const parseCompactJson = <T>(stdout: string): T => {
    const trimmed = stdout.trim();
    assert.equal(trimmed.includes('\n'), false);
    return JSON.parse(trimmed) as T;
  };
  try {
    await initProject(root);
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', 'feature'], { cwd: root });
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'compact-run' });
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

    const instructions = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'instructions', 'overview', '--compact-json'], { cwd: root });
    const rebuild = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'run', 'index', 'rebuild', '--compact-json'], { cwd: root });
    const syncBack = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'sync-back', 'inspect', state.runId, '--branch', 'feature', '--task', 'T1', '--compact-json'], { cwd: root });
    const artifact = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'artifact', 'validate', state.runId, 'artifacts/validation-T1.md', '--task', 'T1', '--agent', 'validator', '--compact-json'], { cwd: root });

    assert.equal(parseCompactJson<{ action: string }>(instructions.stdout).action, 'overview');
    assert.equal(parseCompactJson<{ contract: string }>(rebuild.stdout).contract, 'phase-3.13-local-run-index-v1');
    assert.equal(parseCompactJson<{ status: string }>(syncBack.stdout).status, 'ready');
    assert.equal(parseCompactJson<{ valid: boolean }>(artifact.stdout).valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('CLI exposes context build and evidence summary compact JSON', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  const parseCompactJson = <T>(stdout: string): T => {
    const trimmed = stdout.trim();
    assert.equal(trimmed.includes('\n'), false);
    return JSON.parse(trimmed) as T;
  };
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', contextBuildTaskMarkdown('T1'));
    const state = await createRun(root, { runId: 'context-cli-run' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);

    const contextBuild = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'context', 'build', '--task', 'T1', '--branch', 'master', '--mode', 'verify', '--agent', 'validator', '--compact-json'], { cwd: root });
    const evidenceSummary = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'evidence', 'summary', state.runId, '--task', 'T1', '--compact-json'], { cwd: root });

    assert.equal(parseCompactJson<{ contract: string; authoritative: boolean; usableForPass: boolean }>(contextBuild.stdout).contract, 'sdd-context-package-v1');
    const summary = parseCompactJson<{ contract: string; authoritative: boolean; usableForPass: boolean }>(evidenceSummary.stdout);
    assert.equal(summary.contract, 'sdd-evidence-summary-v1');
    assert.equal(summary.authoritative, false);
    assert.equal(summary.usableForPass, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('governance policy explains confirmation and concurrency gates', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-governance-policy-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${validTaskMarkdown('G1', [])}\n${validTaskMarkdown('G2', [])}\n${validTaskMarkdown('G3', [])}\n${validTaskMarkdown('G4', [])}\n${validTaskMarkdown('G5', [])}`);
    const policy = await inspectGovernancePolicy(root);
    const risky = await evaluateGovernancePolicy(root, { operation: 'destructive_git' });

    assert.equal(policy.version, 'phase-3.14-governance-policy-v1');
    assert.equal(risky.status, 'confirm');
    assert.equal(risky.allowed, false);
    assert.equal(risky.issues.some((issue) => issue.field === 'governance.confirmation'), true);

    await runBackgroundExecutor(root, { taskId: 'G1' });
    await runBackgroundExecutor(root, { taskId: 'G2' });
    await runBackgroundExecutor(root, { taskId: 'G3' });
    await runBackgroundExecutor(root, { taskId: 'G4' });
    const blocked = await runBackgroundExecutor(root, { taskId: 'G5' });
    const events = await readRunEvents(root, blocked.runId);

    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.issues.some((issue) => issue.field === 'governance.concurrency'), true);
    assert.equal(events.some((event) => event.event === 'governance_policy_blocked'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports governance policy contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-governance-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'governance_policy_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.14-governance-policy-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI governance inspect and evaluate render policy evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-governance-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);

    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'governance', 'inspect'], { cwd: root });
    const evaluateJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'governance', 'evaluate', 'background_executor', '--json'], { cwd: root });
    const parsed = JSON.parse(evaluateJson.stdout) as { version: string; status: string; allowed: boolean };

    assert.match(inspect.stdout, /Governance policy phase-3.14-governance-policy-v1/);
    assert.equal(parsed.version, 'phase-3.14-governance-policy-v1');
    assert.equal(parsed.status, 'allow');
    assert.equal(parsed.allowed, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('instructions API returns stable JSON contract payloads', () => {
  const initPayload = getSddInstructions('init');
  const doctorPayload = getSddInstructions('doctor');
  const overviewPayload = getSddInstructions('overview');
  const doPayload = getSddInstructions('do');
  const verifyPayload = getSddInstructions('verify');
  const planPayload = getSddInstructions('plan');
  const specPayload = getSddInstructions('spec');
  const tasksPayload = getSddInstructions('tasks');

  assert.equal(doctorPayload.contract, 'sdd-instructions-v1');
  assert.equal(doctorPayload.action, 'doctor');
  assert.equal(doctorPayload.requiredCommands.includes('sdd doctor --latest-only'), true);
  assert.equal(doctorPayload.forbiddenSideEffects.includes('background write'), true);
  assert.equal(overviewPayload.requiredCommands.includes('sdd verify task <task_id> [--branch <branch>] [--run <run_id>]'), true);
  assert.equal(overviewPayload.forbiddenSideEffects.includes('unapproved complex sync-back apply'), true);
  assert.match(overviewPayload.summary, /natural-language SDD intent/);
  assert.equal(overviewPayload.nextSteps.some((step) => /natural-language intent router/.test(step)), true);
  assert.equal(overviewPayload.nextSteps.some((step) => /ambiguous after status/.test(step)), true);
  assert.equal(initPayload.allowedSideEffects.includes('write managed generated AI entries'), true);
  assert.equal(initPayload.allowedSideEffects.includes('write specs/<branch>/spec.md'), false);
  assert.equal(initPayload.forbiddenSideEffects.some((item) => /legacy --scaffold-docs/.test(item)), true);
  assert.match(planPayload.summary, /deliverable technical solution document/);
  assert.equal(planPayload.nextSteps.some((step) => /PlantUML/.test(step)), true);
  assert.equal(planPayload.nextSteps.some((step) => /state-machine/.test(step) && /api_schema/.test(step)), true);
  assert.match(specPayload.summary, /workflow partition entry/);
  assert.equal(specPayload.forbiddenSideEffects.includes('design technical solution in spec.md'), true);
  assert.equal(specPayload.nextSteps.some((step) => /AC-1/.test(step) && /verification hints/.test(step)), true);
  assert.match(tasksPayload.summary, /executable evidence contract/);
  assert.equal(tasksPayload.forbiddenSideEffects.includes('turn tasks.md into project-management backlog'), true);
  assert.equal(tasksPayload.nextSteps.some((step) => /acceptance_refs/.test(step) && /plan_refs/.test(step)), true);
  assert.equal(doPayload.requiredCommands.includes('sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent>'), true);
  assert.equal(doPayload.forbiddenSideEffects.includes('mark missing evidence as PASS'), true);
  assert.equal(doPayload.nextSteps.some((step) => /artifacts\/implement-<task_id>\.md/.test(step)), true);
  assert.equal(verifyPayload.requiredCommands.includes('sdd artifact validate <run_id> <artifact> --task <task_id> --agent validator'), true);
  assert.equal(verifyPayload.forbiddenSideEffects.includes('unapproved complex sync-back apply'), true);
});

test('initProject detects Maven multi-module Java projects', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-maven-'));
  try {
    await writeFile(path.join(root, 'pom.xml'), '<project><packaging>pom</packaging><modules><module>emp-api</module></modules></project>');
    await initProject(root);
    const config = await readProjectConfig(root);
    assert.equal(config.project.language, 'java');
    assert.equal(config.project.framework, 'ssm-maven-multimodule');
    assert.deepEqual(config.validation.default, ['mvn compile']);
    assert.equal(config.detection?.primary, 'java-ssm-maven-multimodule');
    assert.equal(config.detection?.confidence, 'medium');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject classifies mixed Java and Node repos by source evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-mixed-'));
  try {
    await writeFile(path.join(root, 'pom.xml'), '<project><packaging>pom</packaging><modules><module>emp-api</module></modules><dependencies><dependency><groupId>org.springframework</groupId></dependency><dependency><groupId>org.mybatis</groupId></dependency></dependencies></project>');
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'tooling-only', devDependencies: { typescript: '^5.0.0' } }));
    await mkdir(path.join(root, 'emp-api', 'src', 'main', 'java', 'com', 'emp'), { recursive: true });
    await mkdir(path.join(root, 'emp-api', 'src', 'main', 'resources'), { recursive: true });
    await writeFile(path.join(root, 'emp-api', 'src', 'main', 'java', 'com', 'emp', 'ApiController.java'), 'class ApiController {}');
    await writeFile(path.join(root, 'emp-api', 'src', 'main', 'resources', 'applicationContext.xml'), '<beans></beans>');
    await initProject(root);
    const config = await readProjectConfig(root);
    assert.equal(config.project.language, 'java');
    assert.equal(config.project.framework, 'ssm-maven-multimodule');
    assert.deepEqual(config.validation.default, ['mvn compile']);
    assert.equal(config.detection?.mixed_stack, true);
    assert.equal(config.detection?.candidates.some((candidate) => candidate.id === 'typescript-node'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createRun writes state and append-only events', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    await initProject(root);
    const state = await createRun(root);
    const restored = await readRunState(root, state.runId);
    assert.equal(restored.contract, 'phase-1.2-run-state-contract');
    assert.equal(restored.lifecycleDecision?.contract, 'sdd-lifecycle-decision-v1');
    assert.equal(restored.lifecycleDecision?.version, '1.3.0');
    const events = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'events.jsonl'), 'utf8');
    assert.match(events, /run_started/);
    assert.match(events, /lifecycle_decision_recorded/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports AI entry drift after init', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-drift-'));
  try {
    await initProject(root);
    const commandPath = path.join(root, '.claude', 'commands', 'sdd.md');
    await writeFile(commandPath, `${await readFile(commandPath, 'utf8')}\nmanual drift\n`, 'utf8');

    const report = await doctor(root);

    assert.equal(report.status, 'FAIL');
    assert.equal(report.checks.some((check) => check.check === 'ai_entry_sdd-root' && check.level === 'FAIL' && /will not overwrite user-modified/.test(check.action ?? '')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('artifact path cannot escape artifacts directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    assert.throws(() => getArtifactPath(root, 'run-1', '../outside.md'), /escapes artifacts directory/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports missing git repo as fail in temp directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    await initProject(root);
    const report = await doctor(root);
    assert.equal(report.status, 'FAIL');
    assert.equal(report.checks.some((check) => check.check === 'git_repo' && check.level === 'FAIL'), true);
    assert.equal(report.checks.some((check) => check.check === 'git_repo' && /git init/.test(check.action ?? '')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports broken document-chain refs and high-risk evidence gaps', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-document-chain-doctor-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks

### D1: Broken document chain

\`\`\`sdd-task
id: D1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-404
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
risk:
  - database
\`\`\`

#### Boundary

Stay inside document-chain checks.

#### Acceptance

- Broken ref is detected.
`);
    await writeFile(path.join(root, 'specs', 'master', 'spec.md'), '# Spec\n\n| ID | Acceptance |\n|---|---|\n| AC-1 | Existing acceptance. |\n', 'utf8');

    const report = await doctor(root, { latestOnly: true });

    assert.equal(report.checks.some((check) => check.check === 'document_chain_acceptance_ref' && check.level === 'FAIL' && /AC-404/.test(check.message)), true);
    assert.equal(report.checks.some((check) => check.check === 'document_chain_high_risk_evidence' && check.level === 'FAIL' && /D1/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parseSddTasksMarkdown extracts task metadata and companion sections', () => {
  const markdown = `# Tasks

### T1: Parser foundation

\`\`\`sdd-task
id: T1
status: pending
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
risk:
  - parser boundary
\`\`\`

#### Boundary

Only parse Markdown metadata; do not execute tasks.

#### Acceptance

- Task metadata is structured.
- Boundary is retained.

#### Implementation Notes

None yet.
`;
  const model = parseSddTasksMarkdown(markdown, { tasksPath: 'specs/master/tasks.md' });

  assert.equal(model.gaps.length, 0);
  assert.equal(model.tasks.length, 1);
  assert.equal(model.tasks[0].id, 'T1');
  assert.equal(model.tasks[0].status, 'pending');
  assert.equal(model.tasks[0].wave, 1);
  assert.deepEqual(model.tasks[0].dependsOn, []);
  assert.deepEqual(model.tasks[0].affectedFiles, ['packages/core/src/index.ts']);
  assert.deepEqual(model.tasks[0].validation, ['npm test']);
  assert.deepEqual(model.tasks[0].risk, ['parser boundary']);
  assert.match(model.tasks[0].boundary ?? '', /Only parse Markdown metadata/);
  assert.deepEqual(model.tasks[0].acceptance, ['Task metadata is structured.', 'Boundary is retained.']);
});

test('parseSddTasksMarkdown does not leak companion sections across indented task headings', () => {
  const markdown = `# Tasks

  ### ERP-SCRK-1: 固化入库同步状态机边界

\`\`\`sdd-task
id: ERP-SCRK-1
status: pending
wave: 1
depends_on: []
affected_files:
  - src/main/java/com/acme/erp/InboundSyncService.java
validation:
  - mvn test -Dtest=InboundSyncServiceTest
risk:
  - state-machine
\`\`\`

#### Boundary

Only state-machine logic.

#### Acceptance

- Terminal states never roll back.

  ### ERP-SCRK-2: 移除 Mapper SQL 拼接

\`\`\`sdd-task
id: ERP-SCRK-2
status: pending
wave: 2
depends_on:
  - ERP-SCRK-1
affected_files:
  - src/main/java/com/acme/erp/InboundSyncMapper.java
validation:
  - mvn test
risk:
  - sql
\`\`\`

#### Boundary

Only mapper SQL parameterization.

#### Acceptance

- Mapper has no SQL string concatenation.
`;
  const model = parseSddTasksMarkdown(markdown, { tasksPath: 'specs/master/tasks.md' });

  assert.equal(model.gaps.length, 0);
  assert.equal(model.tasks.length, 2);
  assert.deepEqual(model.tasks[0].acceptance, ['Terminal states never roll back.']);
  assert.deepEqual(model.tasks[1].acceptance, ['Mapper has no SQL string concatenation.']);
  assert.doesNotMatch(model.tasks[0].boundary ?? '', /Mapper SQL/);
});

test('parseSddTasksMarkdown reports task metadata and dependency gaps', () => {
  const markdown = `# Tasks

### T2: Gap case

\`\`\`sdd-task
id: T2
status: surprise
depends_on:
  - T404
affected_files: []
validation: []
risk: []
\`\`\`
`;
  const model = parseSddTasksMarkdown(markdown);
  const fields = model.gaps.map((gap) => gap.field);

  assert.equal(model.tasks.length, 1);
  assert.equal(model.gaps.every((gap) => gap.severity === 'blocking'), true);
  assert.equal(fields.includes('status'), true);
  assert.equal(fields.includes('wave'), true);
  assert.equal(fields.includes('affected_files'), true);
  assert.equal(fields.includes('validation'), true);
  assert.equal(fields.includes('Boundary'), true);
  assert.equal(fields.includes('Acceptance'), true);
  assert.equal(fields.includes('depends_on'), true);
  assert.match(renderTaskGapReport({
    branch: 'master',
    specPath: 'spec.md',
    planPath: 'plan.md',
    tasksPath: 'tasks.md',
    documents: { specExists: true, planExists: true, tasksExists: true },
    tasks: model.tasks,
    gaps: model.gaps
  }), /BLOCKED/);
});

test('parseSddBranch reads branch docs and inspectSddTask filters gaps', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-parser-'));
  try {
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), `# Tasks

### T1: Valid task

\`\`\`sdd-task
id: T1
status: pending
wave: 1
depends_on: []
affected_files:
  - a.ts
validation:
  - npm test
risk: []
\`\`\`

#### Boundary

Stay in a.ts.

#### Acceptance

- a.ts behavior is covered.
`, 'utf8');

    const model = await parseSddBranch(root, 'feature');
    const inspected = inspectSddTask(model, 'T1');

    assert.equal(model.documents.specExists, true);
    assert.equal(model.documents.planExists, true);
    assert.equal(model.documents.tasksExists, true);
    assert.equal(model.gaps.length, 0);
    assert.equal(inspected.task?.id, 'T1');
    assert.equal(inspected.gaps.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('safe path segments reject dot-dot branch and run id while allowing dotted names', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-safe-path-'));
  try {
    await assert.rejects(() => parseSddBranch(root, '..'), /branch cannot be \. or \.\./);
    await assert.rejects(() => readRunState(root, '..'), /runId cannot be \. or \.\./);
    assert.doesNotThrow(() => getArtifactPath(root, 'phase-1.5_run-1', 'evidence.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('retained phase fallback detects aggregate duplicate task ids and inspect ambiguity', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-duplicate-'));
  try {
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), '# Tasks\nLegacy index only.\n', 'utf8');
    await writeFile(path.join(branchDir, 'phase1.0-tasks.md'), validTaskMarkdown('T1', []), 'utf8');
    await writeFile(path.join(branchDir, 'phase1.1-tasks.md'), validTaskMarkdown('T1', []), 'utf8');

    const model = await parseSddBranch(root, 'feature');
    const inspected = inspectSddTask(model, 'T1');

    assert.equal(model.tasks.length, 2);
    assert.equal(model.gaps.some((gap) => gap.field === 'id' && gap.taskId === 'T1' && /Duplicate task id T1 across parsed task files/.test(gap.message)), true);
    assert.equal(inspected.task, null);
    assert.equal(inspected.gaps.some((gap) => /ambiguous/.test(gap.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('retained phase fallback validates cross-file dependencies over aggregate tasks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-cross-deps-'));
  try {
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), '# Tasks\nLegacy index only.\n', 'utf8');
    await writeFile(path.join(branchDir, 'phase1.0-tasks.md'), validTaskMarkdown('P1.0-T1', []), 'utf8');
    await writeFile(path.join(branchDir, 'phase1.1-tasks.md'), validTaskMarkdown('P1.1-T1', ['P1.0-T1']), 'utf8');

    const model = await parseSddBranch(root, 'feature');

    assert.equal(model.tasks.length, 2);
    assert.equal(model.gaps.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('retained phase fallback still reports unknown dependencies', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-unknown-deps-'));
  try {
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), '# Tasks\nLegacy index only.\n', 'utf8');
    await writeFile(path.join(branchDir, 'phase1.0-tasks.md'), validTaskMarkdown('P1.0-T1', ['P9.9-T404']), 'utf8');

    const model = await parseSddBranch(root, 'feature');

    assert.equal(model.gaps.some((gap) => gap.type === 'Dependency Gap' && gap.taskId === 'P1.0-T1' && /unknown task P9.9-T404/.test(gap.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parseSddResultMarkdown validates a legal sdd-result block', () => {
  const report = parseSddResultMarkdown(`# Review

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: reviewer
task: T1
status: PASS
artifacts:
  - artifacts/review-T1.md
\`\`\`
`);

  assert.equal(report.valid, true);
  assert.equal(report.result?.agent, 'reviewer');
  assert.equal(report.result?.task, 'T1');
  assert.deepEqual(report.result?.artifacts, ['artifacts/review-T1.md']);
});

test('validateSddResultArtifact catches missing, empty, and task mismatch artifacts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-result-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const missing = await validateSddResultArtifact(root, state.runId, 'artifacts/missing.md', { expectedTask: 'T1', expectedAgent: 'reviewer' });
    assert.equal(missing.valid, false);
    assert.equal(missing.issues.some((issue) => issue.field === 'artifacts' && /Cannot read artifact/.test(issue.message)), true);
    assert.equal(missing.issues.some((issue) => /\.sdd\/runs\/run-1\/artifacts\/missing\.md/.test(issue.recommendation)), true);

    await writeArtifact(root, state.runId, 'empty.md', '');
    const empty = await validateSddResultArtifact(root, state.runId, 'artifacts/empty.md');
    assert.equal(empty.valid, false);
    assert.equal(empty.issues.some((issue) => /empty/.test(issue.message)), true);

    await writeArtifact(root, state.runId, 'review-T2.md', `# Review

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: reviewer
task: T2
status: PASS
artifacts:
  - artifacts/review-T2.md
\`\`\`
`);
    const mismatch = await validateSddResultArtifact(root, state.runId, 'artifacts/review-T2.md', { expectedTask: 'T1', expectedAgent: 'reviewer' });
    assert.equal(mismatch.valid, false);
    assert.equal(mismatch.issues.some((issue) => issue.field === 'task' && /does not match expected task/.test(issue.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ingestArtifactResult accepts valid artifact and is idempotent', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-ingest-valid-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md'
    });
    await writeRunState(root, { ...state, delegations: { [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'review-T1.md', `# Review

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: reviewer
task: T1
status: PASS
artifacts:
  - artifacts/review-T1.md
\`\`\`
`);

    const first = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/review-T1.md' });
    const second = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/review-T1.md' });
    const nextState = await readRunState(root, state.runId);
    const inspection = await inspectArtifactResultIngestions(root, state.runId);
    const events = await readRunEvents(root, state.runId);

    assert.equal(first.valid, true);
    assert.equal(first.duplicate, false);
    assert.equal(first.record.status, 'accepted');
    assert.equal(first.record.delegationStatus, 'COMPLETED');
    assert.equal(second.valid, true);
    assert.equal(second.duplicate, true);
    assert.equal(nextState.delegations[delegation.delegationId].status, 'COMPLETED');
    assert.equal(nextState.artifacts.filter((artifact) => artifact.path === 'artifacts/review-T1.md').length, 1);
    assert.equal(inspection.valid, true);
    assert.equal(inspection.records.length, 1);
    assert.equal(events.some((event) => event.event === 'artifact_ingested'), true);
    assert.equal(events.some((event) => event.event === 'delegation_completed'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ingestArtifactResult rejects invalid artifact without accepted evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-ingest-invalid-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      expectedArtifact: 'artifacts/validation-T1.md'
    });
    await writeRunState(root, { ...state, delegations: { [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'validation-T2.md', `# Validation

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: validator
task: T2
status: PASS
artifacts:
  - artifacts/validation-T2.md
\`\`\`
`);

    const result = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/validation-T2.md' });
    const nextState = await readRunState(root, state.runId);
    const inspection = await inspectArtifactResultIngestions(root, state.runId);
    const events = await readRunEvents(root, state.runId);

    assert.equal(result.valid, false);
    assert.equal(result.record.status, 'rejected');
    assert.equal(result.record.issues.some((issue) => issue.field === 'task'), true);
    assert.equal(nextState.delegations[delegation.delegationId].status, 'RECOVERABLE');
    assert.equal(nextState.artifacts.length, 0);
    assert.equal(inspection.valid, true);
    assert.equal(events.some((event) => event.event === 'artifact_invalid'), true);
    assert.equal(events.some((event) => event.event === 'artifact_ingestion_rejected'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('ingestArtifactResult admits validator evidence claims into runtime store', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-evidence-admission-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    const boundState = await readRunState(root, state.runId);
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      expectedArtifact: 'artifacts/validation-T1.md'
    });
    await writeRunState(root, { ...boundState, delegations: { ...boundState.delegations, [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);

    const result = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/validation-T1.md' });
    const summary = await buildEvidenceSummaryProjection(root, { runId: state.runId, taskId: 'T1' });
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const claim = db.prepare('SELECT partition, task_id, acceptance_id, coverage_status, source_artifact FROM evidence_claims WHERE run_id = ?').get(state.runId) as { partition?: string; task_id?: string; acceptance_id?: string; coverage_status?: string; source_artifact?: string } | undefined;
      const policyDecision = db.prepare('SELECT decision_id FROM policy_decisions WHERE run_id = ?').get(state.runId) as { decision_id?: string } | undefined;
      assert.equal(result.valid, true);
      assert.equal(claim?.partition, 'master');
      assert.equal(claim?.task_id, 'T1');
      assert.equal(claim?.acceptance_id, 'AC-1');
      assert.equal(claim?.coverage_status, 'PASS');
      assert.equal(claim?.source_artifact, 'artifacts/validation-T1.md');
      assert.equal(policyDecision, undefined);
      assert.equal(summary.passCount, 1);
      assert.equal(summary.highlights.some((highlight) => highlight.includes('admitted_claims=1')), true);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ingestArtifactResult records policy decisions for rejected derived evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-policy-decision-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    const boundState = await readRunState(root, state.runId);
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      expectedArtifact: 'artifacts/validation-T1.md'
    });
    const derivedEvidence = `\n\`\`\`sdd-evidence\ncontract: sdd-evidence-v1\nversion: 1.0.0\ntask: T1\nacceptance: AC-1\nstatus: PASS\nclaim: Derived summary tries to prove AC-1.\nsource_artifact: artifacts/evidence-summary-T1.json\nevidence_refs:\n  - artifact:artifacts/context-package-T1.json\nprovenance_refs:\n  - artifact:artifacts/validation-T1.md\npolicy_refs:\n  - acceptance-policy-v1:require-source-evidence\n\`\`\`\n`;
    await writeRunState(root, { ...boundState, delegations: { ...boundState.delegations, [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${derivedEvidence}`);

    const result = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/validation-T1.md' });
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const claim = db.prepare('SELECT is_derived, source_artifact FROM evidence_claims WHERE run_id = ?').get(state.runId) as { is_derived?: number; source_artifact?: string } | undefined;
      const decision = db.prepare('SELECT status, issue_codes FROM policy_decisions WHERE run_id = ?').get(state.runId) as { status?: string; issue_codes?: string } | undefined;
      assert.equal(result.valid, false);
      assert.equal(result.record.status, 'rejected');
      assert.equal(claim?.is_derived, 1);
      assert.equal(claim?.source_artifact, 'artifacts/evidence-summary-T1.json');
      assert.equal(decision?.status, 'rejected');
      assert.match(decision?.issue_codes ?? '', /DERIVED_SOURCE_EVIDENCE/);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('renderSddResultArtifactTemplate renders self-referencing reviewer artifact', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-template-review-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const template = await renderSddResultArtifactTemplate(root, {
      taskId: 'T1',
      agent: 'reviewer',
      artifactPath: 'artifacts/review-T1.md'
    });

    assert.match(template, /contract: sdd-result-v1/);
    assert.match(template, /agent: reviewer/);
    assert.match(template, /task: T1/);
    assert.match(template, /status: PASS/);
    assert.match(template, /artifacts:\n  - artifacts\/review-T1\.md/);

    await writeArtifact(root, state.runId, 'review-T1.md', template);
    const report = await validateSddResultArtifact(root, state.runId, 'artifacts/review-T1.md', { expectedTask: 'T1', expectedAgent: 'reviewer' });
    assert.equal(report.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI artifact template can write directly into a run artifact directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-template-write-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const result = await execFileAsync(process.execPath, [
      '--import',
      tsxLoader,
      cliPath,
      'artifact',
      'template',
      'artifacts/review-T1.md',
      '--task',
      'T1',
      '--agent',
      'reviewer',
      '--run',
      state.runId,
      '--write'
    ], { cwd: root });
    const report = await validateSddResultArtifact(root, state.runId, 'artifacts/review-T1.md', { expectedTask: 'T1', expectedAgent: 'reviewer' });

    assert.match(result.stdout, /Artifact template written: artifacts\/review-T1\.md/);
    assert.equal(report.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI version compact JSON reports package identity', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-version-identity-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    const result = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, '--version', '--compact-json'], { cwd: root });
    const identity = JSON.parse(result.stdout) as { version?: string; cliEntryPath?: string; packageJsonPath?: string | null };

    assert.equal(identity.version, '0.3.0');
    assert.match(identity.cliEntryPath ?? '', /packages[\\/]cli[\\/]src[\\/]main\.ts$/);
    assert.match(identity.packageJsonPath ?? '', /package\.json$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI artifact template uses run partition when branch is omitted', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-template-run-branch-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    const result = await execFileAsync(process.execPath, [
      '--import',
      tsxLoader,
      cliPath,
      'artifact',
      'template',
      'artifacts/validation-T1.md',
      '--task',
      'T1',
      '--agent',
      'validator',
      '--run',
      state.runId,
      '--write'
    ], { cwd: root });
    const raw = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'validation-T1.md'), 'utf8');

    assert.match(result.stdout, /Artifact template written: artifacts\/validation-T1\.md/);
    assert.match(raw, /Acceptance AC-1: TODO\. Add validation evidence for Parser behavior is covered\./);
    assert.doesNotMatch(raw, /was not found in specs\//);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('renderSddResultArtifactTemplate scaffolds validator acceptance mapping without trusted PASS evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-template-validator-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    const template = await renderSddResultArtifactTemplate(root, {
      branch: 'feature',
      taskId: 'T1',
      agent: 'validator',
      artifactPath: 'artifacts/validation-T1.md'
    });

    assert.match(template, /## Acceptance Mapping/);
    assert.match(template, /Acceptance AC-1: TODO\. Add validation evidence for Parser behavior is covered\./);
    await writeArtifact(root, state.runId, 'validation-T1.md', template);
    const report = await validateSddResultArtifact(root, state.runId, 'artifacts/validation-T1.md', { expectedTask: 'T1', expectedAgent: 'validator' });
    assert.equal(report.valid, false);
    assert.equal(report.trust?.valid, false);
    assert.equal(report.issues.some((issue) => issue.message.includes('TODO_PLACEHOLDER')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parseSddEvidenceMarkdown validates policy-backed acceptance evidence', () => {
  const report = parseSddEvidenceMarkdown(validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md'), {
    expectedTask: 'T1',
    sourceArtifact: 'artifacts/validation-T1.md'
  });

  assert.equal(report.valid, true);
  assert.equal(report.claims.length, 1);
  assert.equal(report.claims[0].acceptance, 'AC-1');
  assert.equal(report.claims[0].evidence[0].ref, 'npm test');
});

test('parseSddEvidenceMarkdown rejects task mismatch and derived source evidence', () => {
  const report = parseSddEvidenceMarkdown(`\n\`\`\`sdd-evidence\ncontract: sdd-evidence-v1\nversion: 1.0.0\ntask: T2\nacceptance: AC-1\nstatus: PASS\nclaim: Validation proves AC-1.\nsource_artifact: artifacts/acceptance-coverage-T1.md\nevidence_refs:\n  - artifact:artifacts/acceptance-coverage-T1.md\nprovenance_refs:\n  - artifact:artifacts/validation-T1.md\npolicy_refs:\n  - acceptance-policy-v1:require-source-evidence\n\`\`\`\n`, {
    expectedTask: 'T1',
    sourceArtifact: 'artifacts/validation-T1.md'
  });

  assert.equal(report.valid, false);
  assert.equal(report.issues.some((issue) => issue.message.includes('POLICY_RULE_FAILED')), true);
  assert.equal(report.issues.some((issue) => issue.message.includes('DERIVED_SOURCE_EVIDENCE')), true);
});

test('artifact path helpers canonicalize root-relative and run-relative forms', () => {
  assert.equal(getRunRelativeArtifactPath('nested/result.md'), 'artifacts/nested/result.md');
  assert.equal(toArtifactRootRelativePath('artifacts/nested/result.md'), 'nested/result.md');
  assert.throws(() => getRunRelativeArtifactPath('artifacts/result.md'), /artifact-root-relative/);
  assert.throws(() => toArtifactRootRelativePath('result.md'), /must start with artifacts\//);
  assert.throws(() => toArtifactRootRelativePath('artifacts/../outside.md'), /relative and stay under artifacts/);
});

test('delegation terminal and stale contract checks are explicit', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-delegation-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const running = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md',
      startedAt: '2026-05-01T00:00:00.000Z',
      timeoutSeconds: 60
    });

    assert.equal(isDelegationTerminal(running.status), false);
    assert.equal(isDelegationStale(running, new Date('2026-05-01T00:02:00.000Z')), true);
    const stale = await validateDelegationRecord(root, state.runId, running, new Date('2026-05-01T00:02:00.000Z'));
    assert.equal(stale.valid, false);
    assert.equal(stale.stale, true);
    assert.equal(stale.issues.some((issue) => issue.field === 'status' && /stale/.test(issue.message)), true);

    const completed = { ...running, status: 'COMPLETED' as const, terminalEventAt: '2026-05-01T00:00:30.000Z' };
    await writeArtifact(root, state.runId, 'review-T1.md', `# Review

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: reviewer
task: T1
status: PASS
artifacts:
  - artifacts/review-T1.md
\`\`\`
`);
    const terminal = await validateDelegationRecord(root, state.runId, completed, new Date('2026-05-01T00:02:00.000Z'));
    assert.equal(isDelegationTerminal(completed.status), true);
    assert.equal(terminal.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('lifecycle decision gate allows direct only through conservative whitelist', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    estimated_change_size: 'tiny',
    task_count_estimate: 1,
    file_count_estimate: 1,
    impact_confidence: 'high',
    risk_tags: [],
    reversibility: 'reversible',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    requires_agents: false,
    handoff_count: 0,
    artifact_dependency: false,
    runtime_recovery_need: false,
    orchestration_uncertainty: 'low'
  }, new Date('2026-05-01T00:00:00.000Z'));

  assert.equal(result.record.decision.profile, 'direct');
  assert.equal(result.record.decision.confidence, 'high');
  assert.equal(result.record.decision.hard_gate_hits.length, 0);
  assert.equal(result.record.decision.human_checkpoint_required, false);
  assert.equal(result.record.decision.skipped_stages.includes('full-spec'), true);
});

test('lifecycle hard gates force full profile for contract and state risks', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    impact_confidence: 'high',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    reversibility: 'reversible',
    affected_contracts: ['public-api'],
    risk_tags: ['state-machine']
  });

  assert.equal(result.record.decision.profile, 'full');
  assert.equal(result.record.decision.hard_gate_hits.includes('api_schema_contract'), true);
  assert.equal(result.record.decision.hard_gate_hits.includes('state_machine_concurrency_liveness'), true);
  assert.equal(result.record.decision.required_stages.includes('verify'), true);
});

test('lifecycle database risk forces full hard gate and human checkpoint', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    impact_confidence: 'high',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    reversibility: 'reversible',
    risk_tags: ['database']
  });

  assert.equal(result.record.decision.profile, 'full');
  assert.equal(result.record.decision.hard_gate_hits.includes('database_or_data_loss'), true);
  assert.equal(result.record.decision.human_checkpoint_required, true);
  assert.equal(result.checkpointRequired, true);
});

test('Phase 5.1 lifecycle risk extraction maps Chinese hard-gate text', () => {
  const extraction = extractLifecycleRiskSignalsFromText('三线程状态流转，并发更新，SQL 拼接，数据一致性风险');
  const categories = extraction.evidence.map((item) => item.category);
  const result = evaluateLifecycleDecisionGate(extraction.signals);
  const rendered = renderLifecycleDecisionGate(result);

  assert.equal(extraction.source, 'from_text');
  assert.equal(extraction.riskTags.includes('state-machine'), true);
  assert.equal(extraction.riskTags.includes('concurrency'), true);
  assert.equal(extraction.riskTags.includes('database'), true);
  assert.equal(categories.includes('state_machine'), true);
  assert.equal(categories.includes('concurrency'), true);
  assert.equal(categories.includes('sql'), true);
  assert.equal(categories.includes('database_data_loss'), true);
  assert.equal(result.record.decision.profile, 'full');
  assert.equal(result.record.decision.hard_gate_hits.includes('state_machine_concurrency_liveness'), true);
  assert.equal(result.record.decision.hard_gate_hits.includes('database_or_data_loss'), true);
  assert.equal(rendered.includes('autonomy_ceiling=full_sdd_with_checkpoint'), true);
});

test('CLI lifecycle decide extracts from text and file', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-lifecycle-risk-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  const riskText = '三线程状态流转，并发更新，SQL 拼接，数据一致性风险';
  try {
    await initProject(root);
    const riskFile = path.join(root, 'risk.txt');
    await writeFile(riskFile, riskText);
    const fromText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'lifecycle', 'decide', '--from-text', riskText], { cwd: root });
    const fromFileJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'lifecycle', 'decide', '--from-file', riskFile, '--json'], { cwd: root });
    const rejected = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'lifecycle', 'decide', '--from-text', riskText, '--from-file', riskFile], { cwd: root }).catch((error: { code: number; stderr: string }) => error) as { code: number; stderr: string };
    const parsed = JSON.parse(fromFileJson.stdout) as { riskExtraction: { source: string }; record: { decision: { profile: string; hard_gate_hits: string[] } }; autonomyCeiling: string };

    assert.match(fromText.stdout, /Lifecycle Risk Gate/);
    assert.match(fromText.stdout, /source=from_text/);
    assert.match(fromText.stdout, /profile=full/);
    assert.match(fromText.stdout, /database_or_data_loss/);
    assert.match(fromText.stdout, /state_machine_concurrency_liveness/);
    assert.match(fromText.stdout, /required_stages=spec -> plan -> tasks -> do -> verify -> sync-back-proposal/);
    assert.match(fromText.stdout, /autonomy_ceiling=full_sdd_with_checkpoint/);
    assert.equal(parsed.riskExtraction.source, 'from_file');
    assert.equal(parsed.record.decision.profile, 'full');
    assert.equal(parsed.autonomyCeiling, 'full_sdd_with_checkpoint');
    assert.equal(rejected.code, 2);
    assert.match(rejected.stderr, /only one of --from-text or --from-file/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('lifecycle checkpoint triggers are recorded without executing workflow', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    impact_confidence: 'high',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    reversibility: 'reversible',
    policy_hits: ['git_commit'],
    permission_required: ['dependency_install'],
    human_checkpoint_required: true
  });

  assert.equal(result.record.decision.profile, 'compact');
  assert.equal(result.record.decision.human_checkpoint_required, true);
  assert.equal(result.record.decision.hard_gate_hits.includes('policy_or_permission_checkpoint'), true);
  assert.match(result.boundaries.join('\n'), /must not execute Phase 1.8 task implementation loop/);
});

test('lifecycle research gate handles unscoutable unknown impact', () => {
  const result = evaluateLifecycleDecisionGate({
    impact_confidence: 'low',
    can_scout_impact: false
  });

  assert.equal(result.record.decision.profile, 'research');
  assert.equal(result.record.decision.confidence, 'low');
  assert.equal(result.record.decision.hard_gate_hits.includes('low_impact_confidence_unscoutable'), true);
  assert.equal(result.record.decision.required_stages[0], 'research');
});

test('lifecycle decision gate emits canonical Phase 1.3 contract id for new records', () => {
  const result = evaluateLifecycleDecisionGate({
    intent_clarity: 'high',
    acceptance_clarity: 'high',
    impact_confidence: 'high',
    validation_clarity: 'clear',
    validation_available: true,
    validation_cost: 'cheap',
    reversibility: 'reversible'
  });

  assert.equal(result.record.contract, 'sdd-lifecycle-decision-v1');
  assert.equal(result.record.version, '1.3.0');
});

test('recordLifecycleDecision persists command gate output to run state and events', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-lifecycle-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const result = evaluateLifecycleDecisionGate({
      intent_clarity: 'high',
      acceptance_clarity: 'high',
      impact_confidence: 'high',
      validation_clarity: 'clear',
      validation_available: true,
      validation_cost: 'cheap',
      reversibility: 'reversible',
      risk_tags: ['database']
    }, new Date('2026-05-01T00:00:00.000Z'));

    await recordLifecycleDecision(root, state.runId, result.record);
    const restored = await readRunState(root, state.runId);
    const events = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'events.jsonl'), 'utf8');

    assert.equal(restored.lifecycleDecision?.decision.profile, 'full');
    assert.equal(restored.lifecycleDecision?.decision.hard_gate_hits.includes('database_or_data_loss'), true);
    assert.equal(restored.lifecycleDecision?.decision.human_checkpoint_required, true);
    assert.match(events, /Lifecycle decision recorded by Phase 1.7 command gate/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSingleTaskLoop completes from supplied review and validation artifacts without modifying tasks markdown', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-loop-pass-'));
  try {
    await initProject(root);
    await execFileAsync('git', ['init'], { cwd: root });
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
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
    const events = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'events.jsonl'), 'utf8');
    const tasksMarkdown = await readFile(path.join(root, 'specs', 'feature', 'tasks.md'), 'utf8');

    assert.equal(result.status, 'completed');
    assert.deepEqual(result.acceptedArtifacts, ['artifacts/review-T1.md', 'artifacts/validation-T1.md']);
    assert.equal(restored.status, 'completed');
    assert.equal(restored.currentTask, 'T1');
    assert.equal(restored.syncBack.status, 'proposed');
    assert.equal(restored.syncBack.proposalPath, 'artifacts/sync-back-proposal.md');
    assert.equal(ingestionInspection.valid, true);
    assert.deepEqual(ingestionInspection.records.map((record) => record.delegationId), ['B-T1-reviewer-001', 'B-T1-validator-001']);
    assert.equal(doctorReport.status, 'PASS');
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
    const gapReport = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'gap-report-T1.md'), 'utf8');
    const proposal = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'sync-back-proposal.md'), 'utf8');

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
    assert.match(rendered, /physical artifact files belong under \.sdd\/runs\/run-1\/artifacts\//);
    assert.match(rendered, /artifact_path_scope=CLI flags use run-relative artifacts\/<file>/);
    assert.equal(restored.status, 'blocked');
    assert.match(gapReport, /reviewer artifact was not supplied/);
    assert.match(proposal, /Proposal only/);
    const events = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'events.jsonl'), 'utf8');
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
    const gapReport = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'gap-report-T1.md'), 'utf8');
    const proposal = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'artifacts', 'sync-back-proposal.md'), 'utf8');
    const events = await readFile(path.join(root, '.sdd', 'runs', state.runId, 'events.jsonl'), 'utf8');

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

test('listRuns sorts run summaries by updated time descending', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-run-list-'));
  try {
    await initProject(root);
    const older = await createRun(root, { runId: 'run-older' });
    const newer = await createRun(root, { runId: 'run-newer' });
    const olderState = { ...older, updatedAt: '2026-05-01T00:00:00.000Z' };
    const newerState = { ...newer, updatedAt: '2026-05-02T00:00:00.000Z' };
    await writeFile(path.join(root, '.sdd', 'runs', older.runId, 'state.json'), `${JSON.stringify(olderState, null, 2)}\n`, 'utf8');
    await writeFile(path.join(root, '.sdd', 'runs', newer.runId, 'state.json'), `${JSON.stringify(newerState, null, 2)}\n`, 'utf8');

    const runs = await listRuns(root);

    assert.deepEqual(runs.map((run) => run.runId), ['run-newer', 'run-older']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local run index rebuilds and queries derived run evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-local-run-index-'));
  try {
    await initProject(root);
    const run = await createRun(root, { runId: 'run-index' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-implementer-001',
      task: 'T1',
      agent: 'implementer',
      expectedArtifact: 'artifacts/implementer-T1.md'
    });
    await writeArtifact(root, run.runId, 'implementer-T1.md', validResultArtifact('implementer', 'T1', 'PASS', 'artifacts/implementer-T1.md'));
    await writeRunState(root, {
      ...run,
      status: 'completed',
      currentTask: 'T1',
      tasks: { T1: { status: 'completed' } },
      delegations: { [delegation.delegationId]: { ...delegation, status: 'COMPLETED', terminalEventAt: '2026-05-07T00:00:00.000Z' } },
      artifacts: [{ path: 'artifacts/implementer-T1.md', kind: 'sdd-result', task: 'T1', agent: 'implementer', createdAt: '2026-05-07T00:00:00.000Z' }]
    });
    await appendEvent(root, run.runId, { event: 'wave_executor_started', runId: run.runId });

    const index = await rebuildLocalRunIndex(root);
    const queried = await queryLocalRunIndex(root, { taskId: 'T1', status: 'completed', artifact: 'artifacts/implementer-T1.md' });
    const inspection = await inspectLocalRunIndex(root);

    assert.equal(index.contract, 'phase-3.13-local-run-index-v1');
    assert.deepEqual(index.runs.map((entry) => entry.runId), ['run-index']);
    assert.deepEqual(index.tasks.map((entry) => `${entry.runId}:${entry.taskId}:${entry.status}`), ['run-index:T1:completed']);
    assert.equal(index.delegations.length, 1);
    assert.equal(index.artifacts[0]?.path, 'artifacts/implementer-T1.md');
    assert.equal(index.waves[0]?.lastEvent, 'wave_executor_started');
    assert.deepEqual(queried.runs.map((entry) => entry.runId), ['run-index']);
    assert.equal(inspection.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports local run index drift with rebuild action', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-local-index-doctor-'));
  try {
    await initProject(root);
    const run = await createRun(root, { runId: 'run-1' });
    await rebuildLocalRunIndex(root);
    await writeRunState(root, { ...run, status: 'completed', tasks: { T2: { status: 'completed' } } });

    const report = await doctor(root);

    assert.equal(report.checks.some((check) => check.check === 'local_run_index' && check.level === 'WARN' && /rebuild/.test(check.action ?? '')), true);
    assert.equal(report.checks.some((check) => check.check === 'local_run_index_contract' && check.level === 'PASS'), true);
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

test('doctor reports stale delegation and terminal event gaps without auto-fix', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-hardening-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const stale = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md',
      startedAt: '2020-01-01T00:00:00.000Z',
      timeoutSeconds: 1
    });
    const completed = createDelegationRecord({
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      expectedArtifact: 'artifacts/validation-T1.md',
      status: 'COMPLETED'
    });
    await writeRunState(root, { ...state, delegations: { [stale.delegationId]: stale, [completed.delegationId]: completed } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: stale.delegationId } });

    const report = await doctor(root);

    assert.equal(report.status, 'FAIL');
    assert.equal(report.checks.some((check) => check.check === 'stale_delegation'), true);
    assert.equal(report.checks.some((check) => check.check === 'terminal_event_missing'), true);
    assert.equal(report.checks.some((check) => check.check === 'artifact_invalid'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('archiveRun cancels running delegations and normal doctor skips archived evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-archive-run-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const running = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md',
      startedAt: '2020-01-01T00:00:00.000Z',
      timeoutSeconds: 1
    });
    await writeRunState(root, { ...state, delegations: { [running.delegationId]: running } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: running.delegationId } });

    const archived = await archiveRun(root, state.runId, { reason: 'exploratory failure' });
    const normalDoctor = await doctor(root);
    const allRunsDoctor = await doctor(root, { allRuns: true });
    const events = await readRunEvents(root, state.runId);

    assert.equal(archived.status, 'archived');
    assert.equal(archived.delegations[running.delegationId].status, 'CANCELLED');
    assert.equal(events.some((event) => event.event === 'delegation_cancelled'), true);
    assert.equal(events.some((event) => event.event === 'run_archived'), true);
    assert.equal(normalDoctor.checks.some((check) => check.check === 'stale_delegation'), false);
    assert.equal(normalDoctor.checks.some((check) => check.check === 'run_evidence_scope'), true);
    assert.equal(allRunsDoctor.checks.some((check) => check.check === 'stale_delegation'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor latestOnly ignores older failed run evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-latest-only-'));
  try {
    await initProject(root);
    const older = await createRun(root, { runId: 'run-older' });
    const newer = await createRun(root, { runId: 'run-newer' });
    const stale = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md',
      startedAt: '2020-01-01T00:00:00.000Z',
      timeoutSeconds: 1
    });
    await writeRunState(root, { ...older, updatedAt: '2026-05-01T00:00:00.000Z', delegations: { [stale.delegationId]: stale } });
    await writeRunState(root, { ...newer, updatedAt: '2026-05-02T00:00:00.000Z' });
    await appendEvent(root, older.runId, { event: 'delegation_started', runId: older.runId, data: { delegationId: stale.delegationId } });

    const latestOnly = await doctor(root, { latestOnly: true });
    const allRuns = await doctor(root, { allRuns: true });

    assert.equal(latestOnly.checks.some((check) => check.check === 'stale_delegation'), false);
    assert.equal(latestOnly.checks.some((check) => check.check === 'run_evidence_scope'), true);
    assert.equal(allRuns.checks.some((check) => check.check === 'stale_delegation'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor trust suite flags mention-only acceptance and weak validator PASS artifacts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-trust-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await writeArtifact(root, state.runId, 'validation-T1.md', validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md'));
    const restored = await readRunState(root, state.runId);
    await writeRunState(root, {
      ...restored,
      status: 'completed',
      validation: {
        status: 'pass',
        commands: ['npm test'],
        evidence: ['artifacts/validation-T1.md']
      },
      tasks: {
        T1: {
          status: 'verified',
          verifyStatus: 'PASS',
          gaps: [],
          artifacts: ['artifacts/validation-T1.md'],
          acceptanceCoverage: [{ acceptance: 'AC-1', status: 'PASS', evidence: 'Mentioned in artifacts/validation-T1.md.' }]
        }
      },
      artifacts: [{ path: 'artifacts/validation-T1.md', kind: 'validation', task: 'T1', agent: 'validator', createdAt: new Date().toISOString() }]
    });

    const report = await doctor(root, { allRuns: true, branch: 'feature' });

    assert.equal(report.checks.some((check) => check.check === 'acceptance_trust' && check.level === 'FAIL'), true);
    assert.equal(report.checks.some((check) => check.check === 'artifact_trust' && check.level === 'FAIL' && /UNSOURCED_PASS/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor honors explicit branch for document-chain scope', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-branch-'));
  try {
    await initProject(root);
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', 'other'], { cwd: root });
    const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
    const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;

    const report = await doctor(root, { latestOnly: true, branch: 'master' });
    const cli = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'doctor', '--latest-only', '--branch', 'master', '--compact-json'], { cwd: root });
    const parsed = JSON.parse(cli.stdout) as { checks: Array<{ check: string; message: string }> };

    assert.equal(report.checks.some((check) => /Document chain skipped for other/.test(check.message)), false);
    assert.equal(parsed.checks.some((check) => /Document chain skipped for other/.test(check.message)), false);
    assert.equal(parsed.checks.some((check) => check.check.startsWith('document_chain')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports artifact ingestion state mismatch', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-ingest-doctor-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md'
    });
    await writeRunState(root, { ...state, delegations: { [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'review-T1.md', `# Review

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: reviewer
task: T1
status: PASS
artifacts:
  - artifacts/review-T1.md
\`\`\`
`);
    const ingested = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/review-T1.md' });
    const acceptedState = await readRunState(root, state.runId);
    await writeRunState(root, {
      ...acceptedState,
      artifacts: [],
      artifactIngestions: {
        [`${delegation.delegationId}:artifacts/review-T1.md`]: ingested.record
      }
    });

    const report = await doctor(root);

    assert.equal(report.status, 'FAIL');
    assert.equal(report.checks.some((check) => check.check === 'artifact_result_ingestion' && /missing from run artifact index/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


async function appendProjectRuntimeConfig(root: string, runtimeConfig: string): Promise<void> {
  const configPath = path.join(root, '.sdd', 'project.yml');
  const current = await readFile(configPath, 'utf8');
  await writeFile(configPath, `${current.trimEnd()}\n${runtimeConfig.trim()}\n`, 'utf8');
}

function phase63ProjectRuntimeConfig(): string {
  return `agent_runtime:
  capability_sources:
    - id: project_frontend_material
      name: Project frontend material
      kind: open_source_material
      source_ref: docs/external/frontend-agent-manifest.yml
      reuse_decision: adapt_via_host_adapter
      quarantine_required: true
      allowed_use: declarative taxonomy and capability mapping only
      attribution: project frontend manifest
      rationale: project-provided agent metadata for validated contracts only
  skill_capabilities:
    - id: project.skill.frontend_review
      name: Project frontend review skill
      kind: skill
      source: project
      source_ref: project_frontend_material
      capability_domain:
        - frontend
        - review
        - ui
      allowed_stages:
        - plan
        - do
        - review
        - verify
      required_risk_ceiling: compact_boundary_only
      evidence_type: artifact
      reuse_decision: adapt_via_host_adapter
  profiles:
    - id: frontend
      extends: implementer
      stage_scope:
        - do
        - review
      risk_ceiling: compact_boundary_only
      default_autonomy: compact_boundary_only
      required_artifacts:
        - implementation artifact
        - browser validation evidence
      tool_scope:
        - read
        - edit
        - test
        - browser
      model_policy_id: balanced
      host_capability_requirements:
        - host.search.grep_glob
        - host.edit.hashline
        - playwright.browser_validation
        - project.skill.frontend_review
      boundaries:
        - edit declared frontend scope only
        - browser validation must be evidence-backed
  aliases:
    frontend-dev: frontend
  routing_rules:
    - id: frontend-default
      when:
        keywords:
          - frontend
          - ui
        affected_file_globs:
          - "**/*.tsx"
      prefer_profile: frontend
      require_capabilities:
        - project.skill.frontend_review
        - playwright.browser_validation
      category: implementation
  adapter_mappings:
    - profile: frontend
      host_adapter: claude_code
      projection: generated subagent profile
      permission_policy: compact frontend tool scope`;
}

function phase63InvalidProjectRuntimeConfig(): string {
  return `agent_runtime:
  capability_sources:
    - id: unsafe_source
      name: Unsafe external material
      kind: open_source_material
      source_ref: docs/external/unsafe-agent-pack.yml
      reuse_decision: reuse_direct
      quarantine_required: true
      allowed_use: direct execution and prompt import
      attribution: ""
      rationale: lifecycle authority request
  skill_capabilities:
    - id: project.skill.bad
      name: Bad project skill
      kind: skill
      source: project
      source_ref: missing_source
      capability_domain:
        - frontend
      allowed_stages:
        - do
      required_risk_ceiling: compact_boundary_only
      reuse_decision: adapt_via_host_adapter
  profiles:
    - id: bad_profile
      extends: implementer
      host_capability_requirements:
        - missing.capability
  aliases:
    frontend-dev: missing_profile
  routing_rules:
    - id: bad-rule
      when:
        keywords:
          - frontend
      prefer_profile: missing_profile
      require_capabilities:
        - missing.capability
      category: implementation`;
}

function phase63FrontendTaskMarkdown(taskId: string): string {
  return `# Tasks

### ${taskId}: Frontend runtime route

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
affected_files:
  - src/App.tsx
validation:
  - browser validation with Playwright
allowed_agents:
  - frontend-dev
agent_fit:
  - frontend-dev
required_artifacts:
  - artifacts/browser-${taskId}.md
risk: []
\`\`\`

#### Boundary

Stay inside the declared frontend files.

#### Acceptance

- Browser validation evidence is captured.
`;
}

async function writeBranchDocs(root: string, branch: string, tasksMarkdown: string): Promise<void> {
  const branchDir = path.join(root, 'specs', branch);
  await mkdir(branchDir, { recursive: true });
  await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
  await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
  await writeFile(path.join(branchDir, 'tasks.md'), tasksMarkdown, 'utf8');
}

async function bindTestRunState(root: string, runId: string, branch: string, taskId: string): Promise<void> {
  const state = await readRunState(root, runId);
  const model = await parseSddBranch(root, branch);
  const task = inspectSddTask(model, taskId).task;
  await writeRunState(root, {
    ...state,
    currentTask: taskId,
    partition: branch,
    gitBranch: branch,
    taskId,
    affectedFiles: task?.affectedFiles ?? [],
    documentSnapshot: {
      specHash: model.documents.specHash ?? null,
      planHash: model.documents.planHash ?? null,
      tasksHash: model.documents.tasksHash ?? null,
      planBasedOnSpecHash: model.documents.planBasedOnSpecHash ?? null,
      tasksBasedOnPlanHash: model.documents.tasksBasedOnPlanHash ?? null
    }
  });
}

async function markTestRunReadyForSyncBack(root: string, runId: string, taskId: string): Promise<void> {
  const state = await readRunState(root, runId);
  const proposal = 'status: verified\n';
  await writeArtifact(root, runId, 'sync-back-proposal.md', proposal);
  await writeRunState(root, {
    ...state,
    status: 'completed',
    tasks: {
      ...state.tasks,
      [taskId]: { status: 'verified', gaps: [], artifacts: ['artifacts/sync-back-proposal.md'] }
    },
    validation: {
      status: 'pass',
      commands: ['npm test'],
      evidence: ['artifacts/sync-back-proposal.md']
    },
    syncBack: {
      mode: 'proposal',
      proposalPath: 'artifacts/sync-back-proposal.md',
      proposalDigest: hashTestDocument(proposal),
      sourceVerifyStatus: 'PASS',
      status: 'proposed'
    },
    artifacts: [
      ...state.artifacts,
      { path: 'artifacts/sync-back-proposal.md', kind: 'sync_back_proposal', task: taskId, agent: null, createdAt: new Date().toISOString() }
    ]
  });
}

function hashTestDocument(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function validResultArtifact(agent: string, task: string, status: string, artifactPath: string): string {
  return `# ${agent} result\n\n\`\`\`sdd-result\ncontract: sdd-result-v1\nversion: 1.3.0\nagent: ${agent}\ntask: ${task}\nstatus: ${status}\nartifacts:\n  - ${artifactPath}\n\`\`\`\n`;
}

function validTrustEvidence(task: string, acceptance: string, artifactPath: string): string {
  return `\n\`\`\`sdd-evidence\ncontract: sdd-evidence-v1\nversion: 1.0.0\ntask: ${task}\nacceptance: ${acceptance}\nstatus: PASS\nclaim: Validation proves ${acceptance}.\nsource_artifact: ${artifactPath}\nevidence_refs:\n  - command:npm test\nprovenance_refs:\n  - artifact:${artifactPath}\npolicy_refs:\n  - acceptance-policy-v1:require-source-evidence\n\`\`\`\n`;
}

function validTaskMarkdown(taskId: string, dependsOn: string[]): string {
  const dependsOnBlock = dependsOn.length === 0 ? 'depends_on: []' : `depends_on:\n${dependsOn.map((dependency) => `  - ${dependency}`).join('\n')}`;
  return `# Tasks

### ${taskId}: Valid task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
${dependsOnBlock}
acceptance_refs:
  - AC-1
plan_refs:
  - "§4 Target Design Overview"
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
risk: []
\`\`\`

#### Boundary

Stay in parser files only.

#### Acceptance

- Parser behavior is covered.
`;
}

function taskMarkdownWithFiles(taskId: string, files: string[], risk: string[]): string {
  const affectedFilesBlock = files.length === 0 ? 'affected_files: []' : `affected_files:\n${files.map((file) => `  - ${file}`).join('\n')}`;
  const riskBlock = risk.length === 0 ? 'risk: []' : `risk:\n${risk.map((item) => `  - ${item}`).join('\n')}`;
  return `### ${taskId}: Isolation task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
${affectedFilesBlock}
validation:
  - npm test
${riskBlock}
\`\`\`

#### Acceptance

- Isolation decision is inspectable.
`;
}

function adaptiveTeamTaskMarkdown(taskId: string, options: { allowedAgents: string[]; requiredArtifacts?: string[]; risk?: string[]; autonomy?: string }): string {
  const risk = options.risk ?? [];
  const requiredArtifacts = options.requiredArtifacts ?? [];
  const allowedAgentsBlock = `allowed_agents:\n${options.allowedAgents.map((agent) => `  - ${agent}`).join('\n')}`;
  const requiredArtifactsBlock = requiredArtifacts.length === 0 ? 'required_artifacts: []' : `required_artifacts:\n${requiredArtifacts.map((artifact) => `  - ${artifact}`).join('\n')}`;
  const riskBlock = risk.length === 0 ? 'risk: []' : `risk:\n${risk.map((item) => `  - ${item}`).join('\n')}`;
  const autonomyBlock = options.autonomy ? `autonomy: ${options.autonomy}\n` : '';
  return `### ${taskId}: Adaptive team task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
${allowedAgentsBlock}
${requiredArtifactsBlock}
${riskBlock}
${autonomyBlock}\`\`\`

#### Boundary

Stay within the declared adaptive routing fixture.

#### Acceptance

- Adaptive team-mode decision is inspectable.
`;
}

function graphTaskMarkdown(taskId: string, dependsOn: string[], files: string[], risk: string[]): string {
  const dependsOnBlock = dependsOn.length === 0 ? 'depends_on: []' : `depends_on:\n${dependsOn.map((dependency) => `  - ${dependency}`).join('\n')}`;
  const affectedFilesBlock = files.length === 0 ? 'affected_files: []' : `affected_files:\n${files.map((file) => `  - ${file}`).join('\n')}`;
  const riskBlock = risk.length === 0 ? 'risk: []' : `risk:\n${risk.map((item) => `  - ${item}`).join('\n')}`;
  return `### ${taskId}: Graph task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
${dependsOnBlock}
${affectedFilesBlock}
validation:
  - npm test
${riskBlock}
\`\`\`

#### Boundary

Stay in graph planning only.

#### Acceptance

- Graph output is inspectable.
`;
}

function harnessTaskMarkdown(taskId: string): string {
  return `### ${taskId}: Harness task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
file_ownership:
  - packages/core/src/index.ts
risk:
  - runtime-evidence
agent_fit:
  - implementer
  - validator
verification_availability:
  - unit-test
  - cli-smoke
autonomy: foreground_write
allowed_agents:
  - implementer
  - validator
required_artifacts:
  - artifacts/implementer-${taskId}.md
  - artifacts/validation-${taskId}.md
gap_state: none
validation:
  - npm test
\`\`\`

#### Boundary

Stay inside Phase 5.3 metadata parsing.

#### Acceptance

- Harness metadata is parsed.
`;
}

function withManagedHash(content: string): string {
  const body = content.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
  return content.replace(/^sdd_hash:\s*sha256:[a-f0-9]+\s*$/m, `sdd_hash: sha256:${createHash('sha256').update(body, 'utf8').digest('hex')}`);
}

function contextBuildTaskMarkdown(taskId: string): string {
  return `# Tasks

### ${taskId}: Context package task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
plan_refs:
  - "§6 Context Build Packages"
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
risk: []
required_artifacts:
  - artifacts/implement-${taskId}.md
  - artifacts/validation-${taskId}.md
\`\`\`

#### Boundary

Stay inside context package runtime.

#### Acceptance

- Context package is deterministic.
`;
}


test('context budget contracts are JSON-renderable and non-authoritative', () => {
  const budget = contextBudgetForProfile(parseContextProfile('brief'));
  assert.equal(budget.contract, 'phase-6.10-context-budget-v1');
  assert.equal(budget.profile, 'brief');
  assert.ok(JSON.stringify(budget).includes('current_task'));

  const summary = summarizeCommandOutput('line one\nERROR blocked by missing artifact\nPASS later line', {
    path: '.sdd/runs/run-1/log.txt',
    hash: 'abc123',
    kind: 'command_output'
  });
  assert.equal(summary.contract, 'sdd-command-output-summary-v1');
  assert.equal(summary.authoritative, false);
  assert.equal(summary.usableForPass, false);
  assert.equal(summary.status, 'BLOCKED');
  assert.ok(summary.omittedLines >= 0);
});

test('evidence summary projection is hash-backed and not usable for PASS', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-evidence-summary-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'summary-run' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);

    const summary = await buildEvidenceSummaryProjection(root, { runId: state.runId, taskId: 'T1' });
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const projection = db.prepare('SELECT projection_type, scope_key, payload_json FROM projections WHERE projection_type = ?').get('evidence_summary') as { projection_type?: string; scope_key?: string; payload_json?: string } | undefined;
      const payload = JSON.parse(projection?.payload_json ?? '{}') as { contract?: string; authoritative?: boolean; usableForPass?: boolean; taskId?: string };
      assert.equal(summary.contract, 'sdd-evidence-summary-v1');
      assert.equal(summary.authoritative, false);
      assert.equal(summary.usableForPass, false);
      assert.equal(summary.taskId, 'T1');
      assert.ok(summary.sources.some((source) => source.path.endsWith('state.json') && source.hash.length === 64));
      assert.ok(summary.sources.some((source) => source.path.endsWith('artifacts/validation-T1.md') && source.kind === 'artifact'));
      assert.ok(summary.policyRefs.some((ref) => ref.includes('reject-derived-source-evidence')));
      assert.equal(projection?.scope_key, 'summary-run:T1');
      assert.equal(payload.contract, 'sdd-evidence-summary-v1');
      assert.equal(payload.authoritative, false);
      assert.equal(payload.usableForPass, false);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('context build packages differ by mode and agent while remaining derived guidance', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-build-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', contextBuildTaskMarkdown('T1'));
    const implementerPackage = await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'do', agent: 'implementer' });
    const validatorPackage = await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'verify', agent: 'validator' });
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const projections = db.prepare('SELECT projection_type, scope_key, payload_json FROM projections WHERE projection_type = ? ORDER BY scope_key').all('context_build') as Array<{ projection_type?: string; scope_key?: string; payload_json?: string }>;
      const payloads = projections.map((projection) => JSON.parse(projection.payload_json ?? '{}') as { contract?: string; authoritative?: boolean; usableForPass?: boolean });
      assert.equal(implementerPackage.contract, 'sdd-context-package-v1');
      assert.equal(implementerPackage.authoritative, false);
      assert.equal(implementerPackage.usableForPass, false);
      assert.ok(implementerPackage.mustRead.some((ref) => ref.path.endsWith('tasks.md')));
      assert.ok(implementerPackage.mustRead.some((ref) => ref.path === 'packages/core/src/index.ts'));
      assert.ok(validatorPackage.mustRead.some((ref) => ref.path === 'artifacts/validation-T1.md'));
      assert.notDeepEqual(implementerPackage.mustRead.map((ref) => ref.path), validatorPackage.mustRead.map((ref) => ref.path));
      assert.ok(validatorPackage.warnings.some((warning) => warning.includes('cannot satisfy PASS evidence')));
      assert.equal(projections.length, 2);
      assert.ok(projections.some((projection) => projection.scope_key === 'master:T1:do:implementer:brief'));
      assert.ok(projections.some((projection) => projection.scope_key === 'master:T1:verify:validator:brief'));
      assert.equal(payloads.every((payload) => payload.contract === 'sdd-context-package-v1' && payload.authoritative === false && payload.usableForPass === false), true);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('derived context projections and log workers cannot claim authority', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-derived-context-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'derived-run' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    const derivedArtifact = `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}
\
\
\
\
\`\`\`sdd-evidence
contract: sdd-evidence-v1
version: 1.0.0
task: T1
acceptance: AC-1
status: PASS
claim: derived summary tries to pass
source_artifact: artifacts/evidence-summary-T1.json
evidence_refs:
  - artifact:artifacts/context-package-T1.json
provenance_refs:
  - artifact:artifacts/log-worker-summary-T1.json
policy_refs:
  - acceptance-policy-v1:require-source-evidence
\`\`\`
`;
    await writeArtifact(root, state.runId, 'validation-T1.md', derivedArtifact);
    const validation = await validateSddResultArtifact(root, state.runId, 'artifacts/validation-T1.md', { expectedTask: 'T1', expectedAgent: 'validator' });

    assert.equal(validation.valid, false);
    assert.ok(validation.issues.some((issue) => issue.message.includes('DERIVED_SOURCE_EVIDENCE')));

    const workerValidation = validateLogWorkerSummary({
      contract: 'sdd-log-worker-summary-v1',
      authoritative: false,
      usableForPass: false,
      runId: state.runId,
      taskId: 'T1',
      workerId: 'log-worker-1',
      sources: [],
      highlights: ['captured log'],
      forbiddenAuthority: ['doctor verdict']
    });
    assert.equal(workerValidation.valid, false);
    assert.ok(workerValidation.issues.some((issue) => issue.field === 'forbiddenAuthority'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


async function initializeGitRepository(root: string): Promise<void> {
  await execFileAsync('git', ['-C', root, 'init']);
  await execFileAsync('git', ['-C', root, 'add', '.']);
  await execFileAsync('git', ['-C', root, '-c', 'user.name=sdd-test', '-c', 'user.email=sdd-test@example.com', 'commit', '--allow-empty', '-m', 'init']);
}
