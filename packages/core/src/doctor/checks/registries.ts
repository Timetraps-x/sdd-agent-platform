import { messageFromError } from '../../contracts/issues.js';
import { inspectGovernancePolicy, type GovernancePolicyOperation } from '../../governance/policy.js';
import { validateAgentCapabilityCatalog } from '../../registries/agent-capability-catalog.js';
import { validateCommandTeamRuntime } from '../../registries/command-team-runtime.js';
import { inspectHarnessLearningContract, inspectProjectContextPackContract, inspectSkillAgentEvalContract } from '../../registries/eval-learning-context.js';
import { validateQueryStatusContract } from '../../registries/query-status.js';
import { listToolCapabilities } from '../../registries/tool-capabilities.js';
import { listToolPluginContracts } from '../../registries/tool-plugins.js';
import { validateAgentSkillTeamRuntime } from '../../router/route-sdd-task.js';
import type { DoctorCheck } from '../model.js';

const BASELINE_GOVERNANCE_POLICY_OPERATIONS: GovernancePolicyOperation[] = [
  'background_executor',
  'wave_executor',
  'sync_back_apply',
  'destructive_git',
  'external_interaction',
  'cleanup'
];

const BASELINE_TOOL_CAPABILITY_IDS = [
  'sdd-cli',
  'hashline-edit',
  'native-file-edit',
  'git-local',
  'validation-command',
  'artifact-run-hygiene',
  'browser-ui-check',
  'governance-policy'
] as const;

const BASELINE_TOOL_PLUGIN_CONTRACT_IDS = [
  'sdd-cli-runtime',
  'hashline-edit-adapter',
  'native-file-edit-adapter',
  'git-local-inspection',
  'validation-command-runner',
  'artifact-run-hygiene-tools',
  'browser-ui-check-adapter'
] as const;

export async function inspectCapabilityRegistry(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const registry = await listToolCapabilities(projectRoot);
    const present = new Set(registry.capabilities.map((capability) => capability.id));
    const missing = BASELINE_TOOL_CAPABILITY_IDS.filter((capabilityId) => !present.has(capabilityId));
    if (missing.length > 0) {
      return [{
        level: 'FAIL',
        check: 'capability_registry',
        message: `Capability registry ${registry.version} is missing baseline capability id(s): ${missing.join(', ')}.`,
        action: 'Restore the built-in Phase 3.1 capability registry.'
      }];
    }
    return [{
      level: 'PASS',
      check: 'capability_registry',
      message: `Capability registry ${registry.version} exposes ${registry.capabilities.length} baseline capability declaration(s).`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'capability_registry',
      message: `Cannot inspect capability registry: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting capabilities.'
    }];
  }
}

export async function inspectToolPluginContracts(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const [capabilityRegistry, pluginRegistry] = await Promise.all([
      listToolCapabilities(projectRoot),
      listToolPluginContracts(projectRoot)
    ]);
    const capabilityIds = new Set(capabilityRegistry.capabilities.map((capability) => capability.id));
    const pluginIds = new Set(pluginRegistry.contracts.map((contract) => contract.id));
    const missingPlugins = BASELINE_TOOL_PLUGIN_CONTRACT_IDS.filter((pluginId) => !pluginIds.has(pluginId));
    const missingCapabilities = pluginRegistry.contracts
      .filter((contract) => !capabilityIds.has(contract.capabilityId))
      .map((contract) => `${contract.id}->${contract.capabilityId}`);

    if (missingPlugins.length > 0 || missingCapabilities.length > 0) {
      const problems = [
        missingPlugins.length > 0 ? `missing baseline plugin id(s): ${missingPlugins.join(', ')}` : null,
        missingCapabilities.length > 0 ? `unknown capability reference(s): ${missingCapabilities.join(', ')}` : null
      ].filter((problem): problem is string => problem !== null);
      return [{
        level: 'FAIL',
        check: 'plugin_loading_contract',
        message: `Plugin loading contract ${pluginRegistry.version} has compatibility issue(s): ${problems.join('; ')}.`,
        action: 'Restore the built-in Phase 3.2 plugin loading contract registry.'
      }];
    }

    return [{
      level: 'PASS',
      check: 'plugin_loading_contract',
      message: `Plugin loading contract ${pluginRegistry.version} exposes ${pluginRegistry.contracts.length} baseline plugin contract declaration(s) compatible with capability registry ${capabilityRegistry.version}.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'plugin_loading_contract',
      message: `Cannot inspect plugin loading contracts: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting plugin contracts.'
    }];
  }
}

export async function inspectGovernancePolicyContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const policy = await inspectGovernancePolicy(projectRoot);
    const missingOperations = BASELINE_GOVERNANCE_POLICY_OPERATIONS.filter((operation) => !policy.manualConfirmation.operations.includes(operation) && operation !== 'background_executor' && operation !== 'wave_executor');
    if (missingOperations.length > 0 || policy.cleanup.deleteRunHistory || !policy.cleanup.archiveOnly || policy.retry.reopenTerminalDelegation) {
      return [{
        level: 'FAIL',
        check: 'governance_policy_contract',
        message: `Governance policy ${policy.version} has unsafe compatibility issue(s).`,
        action: 'Restore the built-in Phase 3.14 governance policy contract.'
      }];
    }
    return [{
      level: 'PASS',
      check: 'governance_policy_contract',
      message: `Governance policy ${policy.version} gates ${BASELINE_GOVERNANCE_POLICY_OPERATIONS.length} operation type(s), max ${policy.concurrency.maxBackgroundDelegations} background delegation(s), and explicit confirmation for risky shared-state actions.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'governance_policy_contract',
      message: `Cannot inspect governance policy contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting governance policy contract.'
    }];
  }
}

export async function inspectQueryStatusBoundaryContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const validation = await validateQueryStatusContract(projectRoot);
    if (!validation.valid) {
      return validation.issues.map((issue) => ({
        level: 'FAIL' as const,
        check: 'query_status_contract',
        message: issue.message,
        action: issue.recommendation
      }));
    }
    return [{
      level: 'PASS',
      check: 'query_status_contract',
      message: `Query status contract ${validation.version} separates status, doctor, run inspect, and debug responsibilities using ${validation.surfaces.length} query surface(s).`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'query_status_contract',
      message: `Cannot inspect query status contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting query status contract.'
    }];
  }
}

export async function inspectAgentSkillTeamRuntimeDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const validation = await validateAgentSkillTeamRuntime(projectRoot);
    if (!validation.valid) {
      return validation.issues.map((issue) => ({
        level: 'FAIL' as const,
        check: 'agent_skill_team_runtime_contract',
        message: issue.message,
        action: issue.recommendation
      }));
    }
    return [{
      level: 'PASS',
      check: 'agent_skill_team_runtime_contract',
      message: `Agent/skill/team runtime contract ${validation.version} exposes ${validation.inspection.profiles.length} profile(s), ${validation.inspection.skillCapabilities.length} capability mapping(s), ${validation.inspection.capabilitySources.length} source catalog entrie(s), and keeps team-mode ${validation.inspection.teamMode.decision} by default.`
    }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'agent_skill_team_runtime_contract', message: `Cannot inspect agent/skill/team runtime contract: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting Phase 6 runtime contract.' }];
  }
}

export async function inspectAgentCapabilityCatalogDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const validation = await validateAgentCapabilityCatalog(projectRoot);
    if (!validation.valid) {
      return validation.issues.map((issue) => ({
        level: 'FAIL' as const,
        check: 'agent_capability_catalog',
        message: issue,
        action: 'Restore the built-in Phase 7.6 agent capability catalog.'
      }));
    }
    return [{
      level: 'PASS',
      check: 'agent_capability_catalog',
      message: `Agent capability catalog ${validation.version} exposes ${validation.catalog.capabilities.length} capability domain(s), ${validation.catalog.materialPacks.length} routed material pack(s), and ${validation.catalog.commandMappings.length} command mapping(s).`
    }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'agent_capability_catalog', message: `Cannot inspect agent capability catalog: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting Phase 7.6 capability catalog.' }];
  }
}

export async function inspectCommandTeamRuntimeDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const validation = await validateCommandTeamRuntime(projectRoot);
    if (!validation.valid) {
      return validation.issues.map((issue) => ({
        level: 'FAIL' as const,
        check: 'command_team_runtime',
        message: issue,
        action: 'Restore the built-in Phase 7.7 command team runtime contract.'
      }));
    }
    return [{
      level: 'PASS',
      check: 'command_team_runtime',
      message: `Command team runtime ${validation.version} exposes ${validation.inspection.commandProfiles.length} command profile(s), ${validation.inspection.roles.length} role profile(s), and ${validation.inspection.independenceRules.length} independence rule(s).`
    }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'command_team_runtime', message: `Cannot inspect command team runtime: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting Phase 7.7 command team runtime.' }];
  }
}

export async function inspectSkillAgentEvalDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const contract = await inspectSkillAgentEvalContract(projectRoot);
    return [{ level: 'PASS', check: 'skill_agent_eval_contract', message: `Skill/agent eval contract ${contract.version} anchors ${contract.corpus.length} ERP trial corpus file(s) and ${contract.dimensions.length} scoring dimension(s).` }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'skill_agent_eval_contract', message: `Cannot inspect skill/agent eval contract: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting eval contract.' }];
  }
}

export async function inspectHarnessLearningDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const contract = await inspectHarnessLearningContract(projectRoot);
    return [{ level: 'PASS', check: 'harness_learning_contract', message: `Harness learning contract ${contract.version} limits repeated-failure output to ${contract.allowedSinks.length} reviewed sink(s).` }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'harness_learning_contract', message: `Cannot inspect harness learning contract: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting learning contract.' }];
  }
}

export async function inspectProjectContextPackDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const contract = await inspectProjectContextPackContract(projectRoot);
    return [{ level: 'PASS', check: 'project_context_pack_contract', message: `Project Context Pack contract ${contract.version} uses ${contract.entryPoint} as durable context while preserving structured runtime sources of truth.` }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'project_context_pack_contract', message: `Cannot inspect Project Context Pack contract: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting context pack contract.' }];
  }
}
