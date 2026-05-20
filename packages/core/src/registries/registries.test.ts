import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { doctor } from '../doctor/doctor.js';
import { inspectAgentRegistryEntry, listAgentRegistry } from './agent-registry.js';
import { inspectAgentCapabilityCatalog, validateAgentCapabilityCatalog } from './agent-capability-catalog.js';
import { decideCommandTeamRuntime, inspectCommandTeamRuntime, validateCommandTeamRuntime } from './command-team-runtime.js';
import { buildContextBuildPackage } from '../context/build-package.js';
import {
  inspectHarnessLearningContract,
  inspectProjectContextPackContract,
  inspectSkillAgentEvalContract,
  validateHarnessLearningContract,
  validateProjectContextPackContract,
  validateSkillAgentEvalContract
} from './eval-learning-context.js';
import { inspectQueryStatusContract, validateQueryStatusContract } from './query-status.js';
import { inspectToolCapability, listToolCapabilities } from './tool-capabilities.js';
import { inspectToolPluginContract, listToolPluginContracts } from './tool-plugins.js';
import { inspectWorkerAdapterContract, listWorkerAdapterContracts } from './worker-adapters.js';
import { inspectWorkflowGate, listWorkflowGates } from './workflow-gates.js';
import { validateAgentRegistry, validateWorkflowGates } from '../router/route-sdd-task.js';
import { contextBuildTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';

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

test('Phase 7.6 agent capability catalog routes domains and material packs without prompt bloat', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase76-capability-catalog-'));
  try {
    await initProject(root);
    const catalog = await inspectAgentCapabilityCatalog(root);
    const validation = await validateAgentCapabilityCatalog(root);
    const specMapping = catalog.commandMappings.find((mapping) => mapping.command === 'spec');
    const verifiesMapping = catalog.commandMappings.find((mapping) => mapping.command === 'verifies');
    const contextCapability = catalog.capabilities.find((capability) => capability.domain === 'context_curation');

    assert.equal(catalog.version, 'phase-7.6-agent-capability-catalog-v1');
    assert.equal(validation.valid, true);
    assert.equal(catalog.capabilities.length, 8);
    assert.equal(catalog.materialPacks.every((pack) => pack.contextBudget !== 'medium'), true);
    assert.equal(specMapping?.requiredDomains.includes('norm_discovery'), true);
    assert.equal(specMapping?.requiredDomains.includes('uncertainty_resolution'), true);
    assert.equal(verifiesMapping?.requiredDomains.includes('verification_design'), true);
    assert.equal(contextCapability?.routing.materialPackIds.includes('performance-risk'), true);
    assert.equal(catalog.commandMappings.some((mapping) => mapping.materialPolicy === 'never_inline'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports Phase 7.6 agent capability catalog visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase76-capability-doctor-'));
  try {
    await initProject(root);
    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'agent_capability_catalog');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-7\.6-agent-capability-catalog-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 7.7 command team runtime maps commands to bounded roles and telemetry', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase77-command-team-'));
  try {
    await initProject(root);
    const inspection = await inspectCommandTeamRuntime(root);
    const validation = await validateCommandTeamRuntime(root);
    const specProfile = inspection.commandProfiles.find((profile) => profile.command === 'spec');
    const verifyProfile = inspection.commandProfiles.find((profile) => profile.command === 'verify');
    const recoverProfile = inspection.commandProfiles.find((profile) => profile.command === 'recover');
    const evidenceRunner = inspection.roles.find((role) => role.id === 'role.evidence-runner');
    const verifyDecision = await decideCommandTeamRuntime(root, { command: 'verify', riskTags: ['runtime_evidence'] });
    const offDecision = await decideCommandTeamRuntime(root, { command: 'verify', activation: 'off', riskTags: ['runtime_evidence'] });

    assert.equal(inspection.version, 'phase-7.7-command-team-runtime-v1');
    assert.equal(validation.valid, true);
    assert.equal(inspection.commandProfiles.length, 11);
    assert.equal(specProfile?.requiredRoleIds.includes('role.norm-scout'), true);
    assert.equal(specProfile?.requiredRoleIds.includes('role.uncertainty-reviewer'), true);
    assert.equal(verifyProfile?.evidenceAuthority, 'gate_decides');
    assert.equal(recoverProfile?.minMode, 'team-required');
    assert.equal(evidenceRunner?.authorityCeiling, 'validation_runner');
    assert.equal(inspection.independenceRules.some((rule) => rule.command === 'verify'), true);
    assert.equal(inspection.commandProfiles.some((profile) => profile.materialPolicy === 'never_inline'), false);
    assert.equal(verifyDecision.mode, 'team-lite');
    assert.equal(verifyDecision.independenceRuleIds.includes('ind.verify.runner-designer'), true);
    assert.equal(verifyDecision.telemetryPolicy?.recordEvidenceRefs, true);
    assert.equal(offDecision.mode, 'single');
    assert.deepEqual(offDecision.independenceRuleIds, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 7.9 command team runtime trims optional roles under token pressure unless forced', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase79-token-aware-team-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', contextBuildTaskMarkdown('T1'));
    await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'do', agent: 'implementer' });

    const pressuredDecision = await decideCommandTeamRuntime(root, { command: 'verify', riskTags: ['runtime_evidence'] });
    const forcedDecision = await decideCommandTeamRuntime(root, { command: 'verify', activation: 'force', riskTags: ['runtime_evidence'] });

    assert.equal(pressuredDecision.mode, 'team-lite');
    assert.equal(pressuredDecision.roleIds.includes('role.context-curator'), false);
    assert.equal(pressuredDecision.materialPackIds.includes('project-norms'), false);
    assert.match(pressuredDecision.reason, /token pressure/);
    assert.equal(forcedDecision.roleIds.includes('role.context-curator'), true);
    assert.equal(forcedDecision.materialPackIds.includes('project-norms'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports Phase 7.7 command team runtime visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase77-command-team-doctor-'));
  try {
    await initProject(root);
    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'command_team_runtime');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-7\.7-command-team-runtime-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
