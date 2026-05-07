import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  createWorktreeLifecycle,
  ingestArtifactResult,
  createRun,
  archiveRun,
  doctor,
  evaluateLifecycleDecisionGate,
  evaluateGovernancePolicy,
  getArtifactPath,
  getProjectStatus,
  getDelegationStateMachine,
  getRunRelativeArtifactPath,
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
  listRuns,
  removeWorktreeLifecycle,
  queryLocalRunIndex,
  listToolPluginContracts,
  listToolCapabilities,
  listDelegationQueueItems,
  listWorkerAdapterContracts,
  parseSddBranch,
  parseSddResultMarkdown,
  parseSddTasksMarkdown,
  readProjectConfig,
  readRunEvents,
  readRunState,
  recordLifecycleDecision,
  rebuildLocalRunIndex,
  renderSddResultArtifactTemplate,
  renderTaskGapReport,
  runBackgroundExecutor,
  runWaveExecutor,
  runGoalVerify,
  runSingleTaskLoop,
  toArtifactRootRelativePath,
  validateDelegationRecord,
  validateDelegationStateTransition,
  validateSddResultArtifact,
  writeArtifact,
  writeRunState
} from './index.js';

const execFileAsync = promisify(execFile);

test('initProject creates readable project config', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    const init = await initProject(root);
    assert.equal(init.created, true);
    const config = await readProjectConfig(root);
    assert.equal(config.contract, 'phase-1.2-project-contract');
    assert.equal(config.lifecycle.decision_required, true);
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
    assert.match(plan, /sdd-init-onboarding-plan-v1/);
    assert.match(tasks, /sdd-init-onboarding-tasks-v1/);
    assert.match(tasks, /id: ONBOARDING-1/);
    assert.equal(branch.tasks.some((task) => task.id === 'ONBOARDING-1'), true);
    assert.equal(status.documents.specExists, true);
    assert.equal(status.documents.planExists, true);
    assert.equal(status.documents.tasksExists, true);
    assert.equal(status.gaps.some((gap) => gap.type === 'Document Gap'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
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
    const initCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'init.md'), 'utf8');
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
    assert.match(command, /recommended next command/);
    assert.match(command, /sdd tasks inspect <task_id>/);
    assert.match(command, /sdd sync-back inspect <run_id> --task <task_id>/);
    assert.match(command, /follow apply_policy/);
    assert.match(command, /ONBOARDING-1/);
    assert.match(command, /do not create parallel documents/);
    assert.match(instructionsCommand, /sdd status/);
    assert.match(instructionsCommand, /sdd sync-back inspect/);
    assert.match(instructionsCommand, /sdd run inspect <run_id>/);
    assert.match(initCommand, /starter semantic documents/);
    assert.match(specCommand, /sdd instructions spec --json/);
    assert.match(planCommand, /sdd instructions plan --json/);
    assert.match(tasksCommand, /sdd instructions tasks --json/);
    assert.match(tasksCommand, /sdd tasks format/);
    assert.match(tasksCommand, /companion sections.*outside the fenced metadata block/);
    assert.match(specCommand, /refine the existing SDD spec document/);
    assert.match(planCommand, /refine the existing SDD plan document/);
    assert.match(tasksCommand, /refine existing graph-ready SDD task blocks/);
    assert.match(doCommand, /sdd status/);
    assert.match(doCommand, /sdd instructions do --json/);
    assert.match(doCommand, /sdd tasks inspect <task_id>/);
    assert.match(doCommand, /sdd do task <task_id>/);
    assert.match(doCommand, /sdd verify task <task_id> --run <run_id>/);
    assert.match(verifyCommand, /sdd status/);
    assert.match(verifyCommand, /sdd run inspect <run_id>/);
    assert.match(verifyCommand, /sdd instructions verify --json/);
    assert.match(verifyCommand, /sdd verify task <task_id> --run <run_id>/);
    assert.match(verifyCommand, /sdd sync-back inspect <run_id> --task <task_id>/);
    assert.match(verifyCommand, /confirm-required tasks require human confirmation/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AI entry drift check detects body edits and update refreshes managed entries', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-drift-'));
  try {
    await initProject(root);
    const commandPath = path.join(root, '.claude', 'commands', 'sdd.md');
    await writeFile(commandPath, `${await readFile(commandPath, 'utf8')}\nmanual drift\n`, 'utf8');

    const drift = await checkAiToolEntryDrift(root);
    assert.equal(drift[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'drifted'), true);

    const update = await applyAiToolEntries(root);
    assert.equal(update[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'updated'), true);
    const clean = await checkAiToolEntryDrift(root);
    assert.equal(clean[0].entries.every((entry) => entry.status === 'unchanged'), true);
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

test('CLI help lists Phase 2 workflow commands and init scaffold options', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['--import', 'tsx', path.join(process.cwd(), 'packages/cli/src/main.ts'), '--help'], {
    cwd: process.cwd()
  });

  assert.match(stdout, /sdd init \[--force\] \[--ai <mode>\] \[--branch <branch>\] \[--no-scaffold-docs\]/);
  assert.match(stdout, /starter SDD docs/);
  assert.match(stdout, /--no-scaffold-docs/);
  assert.match(stdout, /sdd status \[--branch <branch>\] \[--json\]/);
  assert.match(stdout, /sdd run list \[--json\]/);
  assert.match(stdout, /sdd run index rebuild\|inspect\|query \[options\]/);
  assert.match(stdout, /sdd run inspect <run_id> \[--json\]/);
  assert.match(stdout, /sdd sync-back inspect <run_id> \[options\]/);
  assert.match(stdout, /sdd sync-back apply <run_id> \[--approved\]/);
  assert.match(stdout, /sdd artifact template <path> \[options\]/);
  assert.match(stdout, /sdd artifact ingest <run_id> <delegation_id> <path>/);
  assert.match(stdout, /sdd artifact ingestions <run_id> \[--json\]/);
  assert.match(stdout, /sdd run archive <run_id> \[--reason\]/);
  assert.match(stdout, /sdd doctor \[--latest-only\] \[--all-runs\]/);
  assert.match(stdout, /sdd governance inspect\|evaluate \[options\]/);
  assert.match(stdout, /sdd capabilities list \[--json\]/);
  assert.match(stdout, /sdd capabilities inspect <id> \[--json\]/);
  assert.match(stdout, /sdd plugins list \[--json\]/);
  assert.match(stdout, /sdd plugins inspect <id> \[--json\]/);
  assert.match(stdout, /sdd queue list \[--run <run_id>\] \[--json\]/);
  assert.match(stdout, /sdd queue inspect <id> \[--json\]/);
  assert.match(stdout, /sdd state-machine inspect \[--json\]/);
  assert.match(stdout, /sdd workers list \[--json\]/);
  assert.match(stdout, /sdd workers inspect <id> \[--json\]/);
  assert.match(stdout, /sdd isolation inspect <task_id> \[options\]/);
  assert.match(stdout, /sdd background run <task_id> \[options\]/);
  assert.match(stdout, /sdd background inspect <run_id> \[--json\]/);
  assert.match(stdout, /sdd worktree create <run_id> <task_id> \[options\]/);
  assert.match(stdout, /sdd worktree inspect <run_id> \[--json\]/);
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

    assert.match(inspect.stdout, /Task graph valid for master/);
    assert.match(inspect.stdout, /G1 -> G2/);
    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.dependencyEdges, [{ from: 'G1', to: 'G2', type: 'depends_on', files: [] }]);
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

  assert.equal(doctorPayload.contract, 'sdd-instructions-v1');
  assert.equal(doctorPayload.action, 'doctor');
  assert.equal(doctorPayload.requiredCommands.includes('sdd doctor --latest-only'), true);
  assert.equal(doctorPayload.forbiddenSideEffects.includes('background write'), true);
  assert.equal(overviewPayload.requiredCommands.includes('sdd run inspect <run_id>'), true);
  assert.equal(overviewPayload.forbiddenSideEffects.includes('unapproved complex sync-back apply'), true);
  assert.equal(initPayload.allowedSideEffects.includes('write specs/<branch>/spec.md'), true);
  assert.equal(initPayload.allowedSideEffects.includes('write specs/<branch>/tasks.md'), true);
  assert.equal(initPayload.forbiddenSideEffects.includes('overwrite user-authored semantic documents without --force'), true);
  assert.equal(doPayload.requiredCommands.includes('sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent>'), true);
  assert.equal(doPayload.forbiddenSideEffects.includes('mark missing evidence as PASS'), true);
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
    assert.equal(report.checks.some((check) => check.check === 'ai_entry_sdd-root' && check.level === 'FAIL' && check.action === 'Run sdd update.'), true);
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

test('renderSddResultArtifactTemplate copies validator acceptance mapping', async () => {
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
    assert.match(template, /Acceptance Parser behavior is covered\./);
    await writeArtifact(root, state.runId, 'validation-T1.md', template);
    const report = await validateSddResultArtifact(root, state.runId, 'artifacts/validation-T1.md', { expectedTask: 'T1', expectedAgent: 'validator' });
    assert.equal(report.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
    await writeArtifact(root, state.runId, 'validation-T1.md', validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md'));

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
    await writeArtifact(root, state.runId, 'validation-T1.md', validResultArtifact('validator', 'T1', 'PASS_WITH_GAPS', 'artifacts/validation-T1.md'));

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
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}\n## Acceptance Mapping\n\n- [PASS] Parser behavior is covered.\n`);

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
    assert.equal(restored.phase, 'verify');
    assert.equal(restored.validation.status, 'pass');
    assert.deepEqual(result.acceptanceCoverage.map((item) => item.status), ['PASS']);
    assert.match(coverage, /Acceptance Mapping/);
    assert.match(coverage, /Parser behavior is covered/);
    assert.match(proposal, /status: verified/);
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
    assert.equal(status.latestRun?.runId, state.runId);
    assert.equal(status.tasks.pending, 1);
    assert.equal(status.recommendedNextCommand, 'sdd sync-back inspect run-1 --branch feature --task T1');
    assert.equal(syncBack.status, 'ready');
    assert.equal(syncBack.markdownStatus, 'pending');
    assert.match(syncBack.proposal ?? '', /status: verified/);
    assert.equal(syncBack.applyPolicy.mode, 'direct');
    assert.equal(syncBack.applyPolicy.requiresApproval, false);

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

    const repeated = await applySyncBack(root, { runId: state.runId, branch: 'feature', taskId: 'T1' });
    const repeatedTasks = await readFile(path.join(root, 'specs', 'feature', 'tasks.md'), 'utf8');

    assert.equal(repeated.applied, false);
    assert.equal(repeatedTasks.match(/Sync-back applied from run `run-1`/g)?.length, 1);
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
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}\n## Acceptance Mapping\n\n- [PASS] Graph output is inspectable.\n`);

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
    await writeArtifact(root, state.runId, 'validation-T1.md', validResultArtifact('validator', 'T1', 'PASS_WITH_GAPS', 'artifacts/validation-T1.md'));

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
    assert.match(coverage, /No matching acceptance evidence/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runGoalVerify passes when validator artifact includes generated acceptance mapping', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verify-template-pass-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
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

    assert.equal(result.status, 'PASS');
    assert.deepEqual(result.acceptanceCoverage.map((item) => item.status), ['PASS']);
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


async function writeBranchDocs(root: string, branch: string, tasksMarkdown: string): Promise<void> {
  const branchDir = path.join(root, 'specs', branch);
  await mkdir(branchDir, { recursive: true });
  await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
  await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
  await writeFile(path.join(branchDir, 'tasks.md'), tasksMarkdown, 'utf8');
}

function validResultArtifact(agent: string, task: string, status: string, artifactPath: string): string {
  return `# ${agent} result\n\n\`\`\`sdd-result\ncontract: sdd-result-v1\nversion: 1.3.0\nagent: ${agent}\ntask: ${task}\nstatus: ${status}\nartifacts:\n  - ${artifactPath}\n\`\`\`\n`;
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

async function initializeGitRepository(root: string): Promise<void> {
  await execFileAsync('git', ['-C', root, 'init']);
  await execFileAsync('git', ['-C', root, 'add', '.']);
  await execFileAsync('git', ['-C', root, '-c', 'user.name=sdd-test', '-c', 'user.email=sdd-test@example.com', 'commit', '--allow-empty', '-m', 'init']);
}
