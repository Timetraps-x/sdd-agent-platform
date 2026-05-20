import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';


import {
  appendProjectRuntimeConfig,
  contextBuildTaskMarkdown,
  graphTaskMarkdown,
  hashTestDocument,
  phase63FrontendTaskMarkdown,
  phase63ProjectRuntimeConfig,
  taskMarkdownWithFiles,
  validResultArtifact,
  validTaskMarkdown,
  validTrustEvidence,
  withManagedHash,
  writeBranchDocs
} from '@sdd-agent-platform/core/test-support';
import { bindTestRunState, markTestRunReadyForSyncBack } from '@sdd-agent-platform/core/test-support';


import { applyAiToolEntries, checkAiToolEntryDrift } from '@sdd-agent-platform/core/ai-tools';
import { getSddInstructions } from '@sdd-agent-platform/core/instructions';
import { buildRuntimeAnalysisReport } from '@sdd-agent-platform/core/runtime-analysis';
import { appendEvent, readRunEvents } from '@sdd-agent-platform/core/run-state';
import { readArtifact, writeArtifact } from '@sdd-agent-platform/core/run-state';
import { listInvocationLedgerEntries } from '@sdd-agent-platform/core/run-state';
import { archiveRun, createRun, listRuns, readRunState, writeRunState } from '@sdd-agent-platform/core/run-state';
import { queryLocalRunIndex, rebuildLocalRunIndex } from '@sdd-agent-platform/core/run-state';
import { getProjectStatus } from '@sdd-agent-platform/core/status';
import { initProject } from '@sdd-agent-platform/core/status';
import { parseSddBranch } from '@sdd-agent-platform/core/sdd-docs';
import { evaluateGovernancePolicy, inspectGovernancePolicy } from '@sdd-agent-platform/core/governance';
import { createDelegationRecord } from '@sdd-agent-platform/core/delegation';
import { validateSddResultArtifact } from '@sdd-agent-platform/core/artifacts';
import { renderSddResultArtifactTemplate } from '@sdd-agent-platform/core/artifacts';
import { ingestArtifactResult, inspectArtifactResultIngestions } from '@sdd-agent-platform/core/artifacts';
import { runGoalVerify, writeVerifyContract } from '@sdd-agent-platform/core/verification';
import { inspectSyncBack } from '@sdd-agent-platform/core/sync-back';
import { applySyncBack } from '@sdd-agent-platform/core/sync-back';
import { getArtifactPath, getRuntimeStorePath } from '@sdd-agent-platform/core/runtime-paths';

const execFileAsync = promisify(execFile);

type CliRegressionRunState = Awaited<ReturnType<typeof readRunState>>;

function forceRuntimeRunState(projectRoot: string, state: CliRegressionRunState): void {
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  const db = new DatabaseSync(getRuntimeStorePath(projectRoot));
  try {
    db.prepare('UPDATE runs SET status = ?, phase = ?, current_task = ?, partition = ?, git_branch = ?, task_id = ?, updated_at = ?, state_json = ? WHERE run_id = ?')
      .run(state.status, state.phase, state.currentTask, state.partition, state.gitBranch, state.taskId, state.updatedAt, serialized, state.runId);
  } finally {
    db.close();
  }
}



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

test('CLI exposes verifies inspect write and JSON output', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verifies-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));

    const missing = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'verifies', 'inspect', '--branch', 'feature'], { cwd: root });
    const write = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'verifies', 'write', '--branch', 'feature'], { cwd: root });
    const inspect = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'verifies', 'inspect', '--branch', 'feature'], { cwd: root });
    const inspectJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'verifies', 'inspect', '--branch', 'feature', '--json'], { cwd: root });
    const parsed = JSON.parse(inspectJson.stdout) as { status: string; exists: boolean; taskCount: number };

    assert.match(missing.stdout, /status=WARN/);
    assert.match(missing.stdout, /sdd verifies write --branch feature/);
    assert.match(write.stdout, /SDD verify contract created/);
    assert.match(write.stdout, /specs\/feature\/verify.md/);
    assert.match(inspect.stdout, /status=PASS/);
    assert.match(inspect.stdout, /sdd test task <task_id> --branch <branch>/);
    assert.equal(parsed.status, 'PASS');
    assert.equal(parsed.exists, true);
    assert.equal(parsed.taskCount, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI exposes test task runtime and JSON output', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-test-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'docs/t1.md').replace('  - npm test', '  - node -e "process.stdout.write(\'ok\')" => AC-1\n  - node -e "process.stdout.write(\'json\')" => AC-1'));

    await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'verifies', 'write', '--branch', 'feature'], { cwd: root });
    const result = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'test', 'task', 'T1', '--branch', 'feature', '--command', 'node -e "process.stdout.write(\'ok\')"'], { cwd: root });
    const json = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'test', 'task', 'T1', '--branch', 'feature', '--command', 'node -e "process.stdout.write(\'json\')"', '--json'], { cwd: root });
    const argvJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'test', 'task', 'T1', '--branch', 'feature', '--json', '--', process.execPath, '-e', 'process.stdout.write(process.argv[1])', 'literal;not-shell'], { cwd: root }).catch((error: { code: number; stdout: string }) => error) as { code: number; stdout: string };
    const parsed = JSON.parse(json.stdout) as { status: string; steps: unknown[]; validationArtifact: string | null };
    const parsedArgv = JSON.parse(argvJson.stdout) as { status: string; commandStatus: string; steps: Array<{ argv: string[] | null; shell: boolean }> };

    assert.match(result.stdout, /SDD test T1/);
    assert.match(result.stdout, /Validation passed/);
    assert.match(result.stdout, /Next:/);
    assert.equal(parsed.status, 'PASS');
    assert.equal(parsed.steps.length, 1);
    assert.equal(parsed.validationArtifact, 'artifacts/validation-T1.md');
    assert.equal(argvJson.code, 1);
    assert.equal(parsedArgv.status, 'BLOCKED');
    assert.equal(parsedArgv.commandStatus, 'PASS');
    assert.equal(parsedArgv.steps[0].shell, false);
    assert.deepEqual(parsedArgv.steps[0].argv, [process.execPath, '-e', 'process.stdout.write(process.argv[1])', 'literal;not-shell']);
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
    const staleState = { ...boundRun, status: 'completed' as const, currentTask: 'T1', updatedAt: '2000-01-01T00:00:00.000Z' };
    forceRuntimeRunState(root, staleState);

    const staleStatus = await getProjectStatus(root, { branch: 'feature' });
    const staleCli = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'status', '--branch', 'feature'], { cwd: root });

    assert.equal(staleStatus.latestRunEvidence?.tasksChangedAfterRun, true);
    assert.equal(staleStatus.latestRunEvidence?.runUpdatedAt, '2000-01-01T00:00:00.000Z');
    assert.match(staleCli.stdout, /latest_run_evidence may be stale/);

    const appliedState = { ...staleState, syncBack: { ...staleState.syncBack, status: 'applied' as const } };
    forceRuntimeRunState(root, appliedState);
    const appliedStatus = await getProjectStatus(root, { branch: 'feature' });
    const appliedCli = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'status', '--branch', 'feature'], { cwd: root });
    assert.deepEqual(appliedStatus.latestRunStaleReasons, []);
    assert.doesNotMatch(appliedCli.stdout, /latest_run_evidence may be stale/);
    assert.match(appliedCli.stdout, /tasks.md changed after sync-back apply/);

    const freshState = { ...staleState, updatedAt: '2999-01-01T00:00:00.000Z' };
    forceRuntimeRunState(root, freshState);
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


test('CLI exposes Phase 6 runtime, catalog, quarantine, team-mode, and route commands', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase60-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);

    const runtime = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agent-runtime', 'inspect'], { cwd: root });
    const runtimeJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agent-runtime', 'validate', '--json'], { cwd: root });
    const agentCapabilities = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agent-capabilities', 'list'], { cwd: root });
    const agentCapabilitiesJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agent-capabilities', 'validate', '--json'], { cwd: root });
    const commandTeam = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'command-team', 'inspect'], { cwd: root });
    const commandTeamJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'command-team', 'validate', '--json'], { cwd: root });
    const commandTeamDecision = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'command-team', 'decide', '--command', 'verify', '--risk', 'runtime_evidence'], { cwd: root });
    const capability = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'skill-capabilities', 'inspect', 'host.edit.hashline'], { cwd: root });
    const source = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'capability-sources', 'inspect', 'ohmy_team_mode'], { cwd: root });
    const pack = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'external-packs', 'inspect', 'agency_agents_material'], { cwd: root });
    const team = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'team-mode', 'inspect'], { cwd: root });
    const route = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'ONBOARDING-1'], { cwd: root });
    const routeForce = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'ONBOARDING-1', '--team-mode'], { cwd: root });
    const routeOff = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'ONBOARDING-1', '--no-team-mode'], { cwd: root });
    const routeProfileCache = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'ONBOARDING-1', '--profile', '--cache'], { cwd: root });
    const parsedRuntime = JSON.parse(runtimeJson.stdout) as { valid: boolean; version: string };
    const parsedAgentCapabilities = JSON.parse(agentCapabilitiesJson.stdout) as { valid: boolean; version: string; catalog: { capabilities: Array<{ domain: string }>; materialPacks: Array<{ loadPolicy: string }> } };
    const parsedCommandTeam = JSON.parse(commandTeamJson.stdout) as { valid: boolean; version: string; inspection: { commandProfiles: Array<{ command: string }>; independenceRules: Array<{ id: string }> } };

    assert.match(runtime.stdout, /SDD agent\/skill\/team runtime/);
    assert.match(runtime.stdout, /team_mode_default=disabled/);
    assert.equal(parsedRuntime.valid, true);
    assert.equal(parsedRuntime.version, 'phase-6.0-agent-skill-team-runtime-v1');
    assert.match(agentCapabilities.stdout, /SDD agent capability catalog/);
    assert.match(agentCapabilities.stdout, /domain=norm_discovery/);
    assert.match(agentCapabilities.stdout, /material_packs/);
    assert.match(agentCapabilities.stdout, /material_policy=summary_only/);
    assert.equal(parsedAgentCapabilities.valid, true);
    assert.equal(parsedAgentCapabilities.version, 'phase-7.6-agent-capability-catalog-v1');
    assert.equal(parsedAgentCapabilities.catalog.capabilities.some((item) => item.domain === 'context_curation'), true);
    assert.equal(parsedAgentCapabilities.catalog.materialPacks.some((item) => item.loadPolicy === 'never_inline'), false);
    assert.match(commandTeam.stdout, /SDD command team runtime/);
    assert.match(commandTeam.stdout, /command_profiles=11/);
    assert.match(commandTeam.stdout, /role\.evidence-runner/);
    assert.match(commandTeamDecision.stdout, /Command team decision verify/);
    assert.match(commandTeamDecision.stdout, /mode=team-lite/);
    assert.match(commandTeamDecision.stdout, /ind\.verify\.runner-designer/);
    assert.equal(parsedCommandTeam.valid, true);
    assert.equal(parsedCommandTeam.version, 'phase-7.7-command-team-runtime-v1');
    assert.equal(parsedCommandTeam.inspection.commandProfiles.some((item) => item.command === 'recover'), true);
    assert.equal(parsedCommandTeam.inspection.independenceRules.some((item) => item.id === 'ind.verify.runner-designer'), true);
    assert.match(capability.stdout, /Skill capability host\.edit\.hashline/);
    assert.match(capability.stdout, /reuse_decision=reuse_direct/);
    assert.match(source.stdout, /Capability source ohmy_team_mode/);
    assert.match(source.stdout, /reuse=borrow_mechanism/);
    assert.match(pack.stdout, /status=quarantined/);
    assert.match(pack.stdout, /dangerous_command_scan/);
    assert.match(team.stdout, /decision=disabled mode=off activation=off cost=none/);
    assert.match(route.stdout, /SDD route ONBOARDING-1/);
    assert.match(route.stdout, /Routed through the direct workflow/);
    assert.match(route.stdout, /Why:/);
    assert.match(route.stdout, /Next:/);
    assert.match(routeForce.stdout, /SDD route ONBOARDING-1/);
    assert.match(routeOff.stdout, /SDD route ONBOARDING-1/);
    assert.match(routeProfileCache.stdout, /SDD route ONBOARDING-1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI exposes Phase 6.3 project agent runtime config routes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase63-runtime-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await appendProjectRuntimeConfig(root, phase63ProjectRuntimeConfig());
    await writeBranchDocs(root, 'master', phase63FrontendTaskMarkdown('FRONTEND-1'));

    const runtimeText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'agent-runtime', 'inspect'], { cwd: root });
    const skillListText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'skill-capabilities', 'list'], { cwd: root });
    const sourceListText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'capability-sources', 'list'], { cwd: root });
    const packText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'external-packs', 'inspect', 'project_frontend_material'], { cwd: root });
    const routeText = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'FRONTEND-1'], { cwd: root });
    const routeJson = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'tasks', 'route', 'FRONTEND-1', '--json'], { cwd: root });
    const parsedRoute = JSON.parse(routeJson.stdout) as { recommendedProfile: string; routingRuleHits: string[]; resolvedAliases: Array<{ input: string; resolved: string }>; registrySources: Array<{ id: string; origin: string }> };

    assert.equal(runtimeText.stdout.includes('project_profiles=frontend'), true);
    assert.equal(runtimeText.stdout.includes('routing_rules=frontend-default'), true);
    assert.equal(skillListText.stdout.includes('project.skill.frontend_review'), true);
    assert.equal(skillListText.stdout.includes('origin=project_config'), true);
    assert.equal(sourceListText.stdout.includes('project_frontend_material'), true);
    assert.equal(sourceListText.stdout.includes('origin=project_config'), true);
    assert.equal(packText.stdout.includes('status=quarantined'), true);
    assert.equal(routeText.stdout.includes('SDD route FRONTEND-1'), true);
    assert.equal(routeText.stdout.includes('Why:'), true);
    assert.equal(routeText.stdout.includes('Next:'), true);
    assert.equal(parsedRoute.recommendedProfile, 'frontend');
    assert.deepEqual(parsedRoute.routingRuleHits, ['frontend-default']);
    assert.equal(parsedRoute.resolvedAliases.some((alias) => alias.input === 'frontend-dev' && alias.resolved === 'frontend'), true);
    assert.equal(parsedRoute.registrySources.some((source) => source.id === 'project.skill.frontend_review' && source.origin === 'project_config'), true);
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
  assert.match(stdout, /sdd statusline \[--branch <branch>\] \[--json\|--compact-json\]/);
  assert.match(stdout, /sdd subagents run <task_id> \[--agent <agent>\]/);
  assert.match(stdout, /sdd ship \[--branch <branch>\] \[--dry-run\] \[--json\|--compact-json\]/);
  assert.match(stdout, /sdd doctor \[fast\|deep\]/);
  assert.match(stdout, /sdd artifact template <path> --task <task_id> --agent <agent> \[--run <run_id> --write\]/);
  assert.match(stdout, /More help:/);
  assert.match(stdout, /init --branch is legacy starter-doc scaffolding/);
  assert.doesNotMatch(stdout, /sdd plugins list \[--json\]/);
  assert.match(workflow.stdout, /sdd workflow help/);
  assert.match(workflow.stdout, /--compact-json prints one-line JSON/);
  assert.match(advanced.stdout, /sdd advanced help/);
  assert.match(advanced.stdout, /sdd plugins list\|inspect \[--json\]/);
  assert.match(advanced.stdout, /sdd init --branch <branch> creates starter docs/);
  assert.match(advanced.stdout, /sdd progress \[--branch <branch>\] \[--json\|--compact-json\]/);
  assert.match(advanced.stdout, /Foreground subagents:/);
});


test('CLI help and preflight for side-effect commands do not write runtime artifacts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-command-lifecycle-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));

    const doHelp = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'do', 'task', 'T1', '--branch', 'feature', '--help'], { cwd: root });
    const doPreflight = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'do', 'task', 'T1', '--branch', 'feature', '--preflight'], { cwd: root });
    const runPreflight = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'run', 'create', '--preflight'], { cwd: root });
    const artifactPreflight = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'artifact', 'template', 'artifacts/review-T1.md', '--task', 'T1', '--agent', 'reviewer', '--run', 'run-1', '--write', '--preflight'], { cwd: root });
    const syncBackPreflight = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'sync-back', 'apply', '--task', 'T1', '--branch', 'feature', '--preflight'], { cwd: root });
    const shipHelp = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'ship', '--branch', 'feature', '--help'], { cwd: root });
    const shipPreflight = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'ship', '--branch', 'feature', '--preflight'], { cwd: root });
    const runs = await listRuns(root);

    assert.match(doHelp.stdout, /Usage: sdd do task/);
    assert.match(doHelp.stdout, /--approved/);
    assert.match(doPreflight.stdout, /command=do task/);
    assert.match(runPreflight.stdout, /command=run create/);
    assert.match(artifactPreflight.stdout, /command=artifact template/);
    assert.match(syncBackPreflight.stdout, /command=sync-back apply/);
    assert.match(shipHelp.stdout, /Usage: sdd ship/);
    assert.match(shipPreflight.stdout, /command=ship/);
    assert.equal(runs.length, 0);
    await assert.rejects(readFile(path.join(root, 'specs', 'feature', 'release.md'), 'utf8'));
    await assert.rejects(readFile(path.join(root, '.sdd', 'runs', 'run-1', 'evidence', 'artifacts', 'review-T1.md'), 'utf8'));
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


test('CLI subagents run collects foreground evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-subagents-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  const hostCommand = [
    "const prompt = process.argv[1];",
    "const agent = prompt.match(/^Agent: (.+)$/m)?.[1] ?? 'agent';",
    "const task = prompt.match(/^Task id: (.+)$/m)?.[1] ?? 'TASK';",
    "const artifact = prompt.match(/^Expected result artifact: (.+)$/m)?.[1] ?? 'artifacts/result.md';",
    "const result = '# ' + agent + ' result\\n\\n```sdd-result\\ncontract: sdd-result-v1\\nversion: 1.3.0\\nagent: ' + agent + '\\ntask: ' + task + '\\nstatus: PASS\\nartifacts:\\n  - ' + artifact + '\\n```\\n\\n## Summary\\n' + agent + ' produced a compact digest for the parent main agent.\\n\\n## Key findings\\n- ' + agent + ' completed foreground evidence collection.\\n\\n## Recommendation\\nRead the digest first and inspect the artifact only if more detail is required.\\n\\n## Deep-read triggers\\n- Inspect ' + artifact + ' for full details.\\n';",
    "const evidence = agent === 'validator' ? '\\n```sdd-evidence\\ncontract: sdd-evidence-v1\\nversion: 1.0.0\\ntask: ' + task + '\\nacceptance: AC-1\\nstatus: PASS\\nclaim: Validation proves AC-1.\\nsource_artifact: ' + artifact + '\\nevidence_refs:\\n  - command:npm test\\nprovenance_refs:\\n  - artifact:' + artifact + '\\npolicy_refs:\\n  - acceptance-policy-v1:require-source-evidence\\n```\\n' : '';",
    "process.stdout.write(result + evidence);"
  ].join('\n');
  const env = { ...process.env, SDD_CLAUDE_CODE_COMMAND: process.execPath, SDD_CLAUDE_CODE_ARGS: JSON.stringify(['-e', hostCommand, '{prompt}']) };
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'docs/t1.md'));

    const text = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'subagents', 'run', 'T1', '--branch', 'feature', '--agent', 'reviewer', '--agent', 'validator'], { cwd: root, env });
    const json = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'subagents', 'run', 'T1', '--branch', 'feature', '--agent', 'reviewer', '--agent', 'validator', '--compact-json'], { cwd: root, env });
    const parsed = JSON.parse(json.stdout) as { status: string; summaryRefs: unknown[]; doNotReadUnlessNeededRefs: unknown[]; agents: Array<{ agent: string; status: string; artifactPath: string | null; digest?: { summary: string; keyFindings: string[] } }> };

    assert.match(text.stdout, /Foreground subagents completed for T1/);
    assert.match(text.stdout, /non-authoritative evidence only/);
    assert.match(text.stdout, /summary_refs=2 deep_read_refs=2/);
    assert.match(text.stdout, /digest=.*compact digest/);
    assert.match(text.stdout, /deep_read=artifacts\//);
    assert.equal(parsed.status, 'completed');
    assert.deepEqual(parsed.agents.map((agent) => `${agent.agent}:${agent.status}`), ['reviewer:completed', 'validator:completed']);
    assert.equal(parsed.agents.every((agent) => agent.artifactPath?.startsWith('artifacts/')), true);
    assert.equal(parsed.summaryRefs.length, 2);
    assert.equal(parsed.doNotReadUnlessNeededRefs.length, 2);
    assert.equal(parsed.agents.every((agent) => agent.digest?.summary.includes('compact digest')), true);
    assert.equal(parsed.agents.every((agent) => agent.digest?.keyFindings.length), true);
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


test('CLI wave run and executor inspect render wave execution evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-wave-executor-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${graphTaskMarkdown('WX1', [], ['src/a.ts'], [])}`);
    const run = await createRun(root, { runId: 'run-1' });
    const jsonRun = await createRun(root, { runId: 'run-json' });
    await bindTestRunState(root, run.runId, 'master', 'WX1');
    await bindTestRunState(root, jsonRun.runId, 'master', 'WX1');
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
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
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
    await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'sync-back', 'apply', state.runId, '--branch', 'feature', '--task', 'T1', '--approved', '--compact-json'], { cwd: root });
    const statusline = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'statusline', '--branch', 'feature', '--compact-json'], { cwd: root }).catch((error: { stdout: string }) => error);
    const ship = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'ship', '--branch', 'feature', '--dry-run', '--compact-json'], { cwd: root }).catch((error: { stdout: string }) => error);
    const doctorFast = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'doctor', 'fast', '--branch', 'feature'], { cwd: root }).catch((error: { stdout: string }) => error);
    const doctorRecover = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'doctor', 'recover', '--branch', 'feature'], { cwd: root }).catch((error: { stdout: string }) => error);
    const artifact = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'artifact', 'validate', state.runId, 'artifacts/validation-T1.md', '--task', 'T1', '--agent', 'validator', '--compact-json'], { cwd: root });

    assert.equal(parseCompactJson<{ action: string }>(instructions.stdout).action, 'overview');
    assert.equal(parseCompactJson<{ contract: string }>(rebuild.stdout).contract, 'phase-3.13-local-run-index-v1');
    assert.equal(parseCompactJson<{ status: string }>(syncBack.stdout).status, 'ready');
    assert.equal(parseCompactJson<{ contract: string; branch: string }>(syncBack.stdout).contract, undefined);
    assert.equal(parseCompactJson<{ approvalCard: { contract: string } }>(syncBack.stdout).approvalCard.contract, 'sdd-sync-back-approval-card-v1');
    assert.equal(parseCompactJson<{ contract: string; branch: string }>(statusline.stdout).contract, 'sdd-statusline-projection-v1');
    assert.equal(parseCompactJson<{ contract: string; branch: string; dryRun: boolean; releasePath: string }>(ship.stdout).contract, 'sdd-ship-readiness-v1');
    assert.equal(parseCompactJson<{ dryRun: boolean; releasePath: string }>(ship.stdout).dryRun, true);
    assert.match(parseCompactJson<{ releasePath: string }>(ship.stdout).releasePath, /specs[\\/]feature[\\/]release\.md/);
    assert.match(doctorFast.stdout, /SDD doctor/);
    assert.match(doctorFast.stdout, /Why:/);
    assert.match(doctorRecover.stdout, /Next:/);
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











test('CLI run create scopes branch task and artifact template rejects unscoped or mismatched writes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-scoped-run-artifact-cli-'));
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    await writeBranchDocs(root, 'other', validTaskMarkdown('T1', []));
    const scoped = await execFileAsync(process.execPath, [
      '--import',
      tsxLoader,
      cliPath,
      'run',
      'create',
      '--branch',
      'feature',
      '--task',
      'T1'
    ], { cwd: root });
    const parsed = JSON.parse(scoped.stdout) as { runId: string; partition: string; gitBranch: string; taskId: string; artifactRoot: string };
    const state = await readRunState(root, parsed.runId);
    const unscoped = await createRun(root, { runId: 'unscoped-run' });
    const unscopedWrite = await execFileAsync(process.execPath, [
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
      unscoped.runId,
      '--write'
    ], { cwd: root }).catch((error: { stderr: string }) => error);
    const mismatchWrite = await execFileAsync(process.execPath, [
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
      parsed.runId,
      '--branch',
      'other',
      '--write'
    ], { cwd: root }).catch((error: { stderr: string }) => error);
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
      parsed.runId,
      '--write'
    ], { cwd: root });
    const report = await validateSddResultArtifact(root, parsed.runId, 'artifacts/review-T1.md', { expectedTask: 'T1', expectedAgent: 'reviewer' });

    assert.equal(parsed.partition, 'feature');
    assert.equal(parsed.gitBranch, 'feature');
    assert.equal(parsed.taskId, 'T1');
    assert.match(parsed.artifactRoot, /\.sdd[\\/]runs[\\/]feature[\\/]evidence/);
    assert.equal(state.partition, 'feature');
    assert.equal(state.taskId, 'T1');
    assert.match(unscopedWrite.stderr, /Run unscoped-run is unscoped/);
    assert.match(mismatchWrite.stderr, /scoped to branch feature, not other/);
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

    assert.equal(identity.version, '0.4.0');
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
    const raw = await readArtifact(root, state.runId, 'validation-T1.md');

    assert.match(result.stdout, /Artifact template written: artifacts\/validation-T1\.md/);
    assert.match(raw, /Acceptance AC-1: TODO\. Add validation evidence for Parser behavior is covered\./);
    assert.doesNotMatch(raw, /was not found in specs\//);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
    assert.match(fromText.stdout, /Lifecycle decision/);
    assert.match(fromText.stdout, /Lifecycle checkpoint is required/);
    assert.match(fromText.stdout, /Why:/);
    assert.match(fromText.stdout, /Next:/);
    assert.equal(parsed.riskExtraction.source, 'from_file');
    assert.equal(parsed.record.decision.profile, 'full');
    assert.equal(parsed.autonomyCeiling, 'full_sdd_with_checkpoint');
    assert.equal(rejected.code, 2);
    assert.match(rejected.stderr, /only one of --from-text or --from-file/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});










test('CLI ship exits non-zero when readiness is blocked', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-cli-ship-blocked-'));
  try {
    await initProject(root);
    const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
    const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;

    const blocked = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'ship', '--branch', 'master', '--dry-run', '--compact-json'], { cwd: root })
      .catch((error: { code: number; stdout: string }) => error) as { code: number; stdout: string };
    const parsed = JSON.parse(blocked.stdout) as { status: string };

    assert.equal(blocked.code, 1);
    assert.equal(parsed.status, 'BLOCKED');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('CLI doctor honors explicit branch for document-chain scope', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-branch-'));
  try {
    await initProject(root);
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', 'other'], { cwd: root });
    const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
    const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;

    const cli = await execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, 'doctor', '--latest-only', '--branch', 'master', '--compact-json'], { cwd: root });
    const parsed = JSON.parse(cli.stdout) as { checks: Array<{ check: string; message: string }> };

    assert.equal(parsed.checks.some((check) => /Document chain skipped for other/.test(check.message)), false);
    assert.equal(parsed.checks.some((check) => check.check.startsWith('document_chain')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});









async function initializeGitRepository(root: string): Promise<void> {
  await execFileAsync('git', ['-C', root, 'init']);
  await execFileAsync('git', ['-C', root, 'add', '.']);
  await execFileAsync('git', ['-C', root, '-c', 'user.name=sdd-test', '-c', 'user.email=sdd-test@example.com', 'commit', '--allow-empty', '-m', 'init']);
}
