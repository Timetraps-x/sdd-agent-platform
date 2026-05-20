import {
  AGENT_REGISTRY_CONTRACT_VERSION,
  AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
  WORKFLOW_GATE_CONTRACT_VERSION
} from '../contracts.js';
import { contractIssue, type ContractValidationIssue } from '../contracts/issues.js';
import { listAgentRegistry, type AgentRegistryEntry } from '../registries/agent-registry.js';
import { listWorkflowGates, type WorkflowGateContract } from '../registries/workflow-gates.js';
import { BUILT_IN_MODEL_POLICIES, buildAgentSkillRuntimeRegistry } from './runtime-registry.js';
import { inspectAgentSkillTeamRuntime } from './runtime-inspection.js';
import type {
  AgentProfileId,
  AgentSkillTeamRuntimeInspection,
  CapabilitySourceCatalogEntry,
  RuntimeRegistryEntrySource
} from './agent-runtime.js';

export interface WorkflowGateValidation {
  version: typeof WORKFLOW_GATE_CONTRACT_VERSION;
  valid: boolean;
  workflows: WorkflowGateContract[];
  issues: ContractValidationIssue[];
}

export interface AgentRegistryValidation {
  version: typeof AGENT_REGISTRY_CONTRACT_VERSION;
  valid: boolean;
  agents: AgentRegistryEntry[];
  issues: ContractValidationIssue[];
}

export interface AgentSkillTeamRuntimeValidation {
  version: typeof AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION;
  valid: boolean;
  inspection: AgentSkillTeamRuntimeInspection;
  issues: ContractValidationIssue[];
}

export async function validateWorkflowGates(projectRoot: string): Promise<WorkflowGateValidation> {
  const registry = await listWorkflowGates(projectRoot);
  const agentRegistry = await listAgentRegistry(projectRoot);
  const agentIds = new Set(agentRegistry.agents.map((agent) => agent.id));
  const issues = registry.workflows.flatMap((workflow) => validateWorkflowGate(workflow, agentIds));
  return {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    valid: issues.length === 0,
    workflows: registry.workflows,
    issues
  };
}

export async function validateAgentRegistry(projectRoot: string): Promise<AgentRegistryValidation> {
  const registry = await listAgentRegistry(projectRoot);
  const issues = registry.agents.flatMap(validateAgentRegistryEntry);
  return {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    valid: issues.length === 0,
    agents: registry.agents,
    issues
  };
}

export async function validateAgentSkillTeamRuntime(projectRoot: string): Promise<AgentSkillTeamRuntimeValidation> {
  const inspection = await inspectAgentSkillTeamRuntime(projectRoot);
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  const issues = [...registry.issues, ...validateAgentSkillTeamRuntimeInspection(inspection)];
  return {
    version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
    valid: issues.length === 0,
    inspection,
    issues
  };
}

function validateWorkflowGate(workflow: WorkflowGateContract, agentIds: Set<string>): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (workflow.requiredInputs.length === 0) {
    issues.push(contractIssue(`${workflow.id}.requiredInputs`, 'Workflow gate has no required inputs.', 'Declare required inputs before this workflow can run.'));
  }
  if (workflow.requiredArtifacts.length === 0) {
    issues.push(contractIssue(`${workflow.id}.requiredArtifacts`, 'Workflow gate has no required artifacts.', 'Declare required artifacts for workflow evidence.'));
  }
  for (const agentId of workflow.allowedAgents) {
    if (!agentIds.has(agentId)) {
      issues.push(contractIssue(`${workflow.id}.allowedAgents`, `Workflow references unknown agent ${agentId}.`, 'Add the agent to AgentRegistryContract or remove it from the workflow.'));
    }
  }
  return issues;
}

function validateAgentRegistryEntry(agent: AgentRegistryEntry): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (agent.allowedStages.length === 0) {
    issues.push(contractIssue(`${agent.id}.allowedStages`, 'Agent has no allowed stages.', 'Declare where the agent may participate.'));
  }
  if (agent.readBoundary.length === 0 || agent.writeBoundary.length === 0) {
    issues.push(contractIssue(`${agent.id}.boundary`, 'Agent read/write boundary is incomplete.', 'Declare read and write boundaries.'));
  }
  if (agent.toolAllowlist.length === 0) {
    issues.push(contractIssue(`${agent.id}.toolAllowlist`, 'Agent has no tool allowlist.', 'Declare permitted tool categories.'));
  }
  return issues;
}

function validateAgentSkillTeamRuntimeInspection(inspection: AgentSkillTeamRuntimeInspection): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  const profileIds = new Set(inspection.profiles.map((profile) => profile.id));
  const capabilityIds = new Set(inspection.skillCapabilities.map((capability) => capability.id));
  const sourceIds = new Set(inspection.capabilitySources.map((source) => source.id));
  const modelPolicyIds = new Set(BUILT_IN_MODEL_POLICIES.map((policy) => policy.id));
  for (const requiredProfile of ['planner', 'architect', 'implementer', 'reviewer', 'validator', 'researcher', 'orchestrator', 'security', 'domain_expert'] as AgentProfileId[]) {
    if (!profileIds.has(requiredProfile)) {
      issues.push(contractIssue(`profiles.${requiredProfile}`, 'Required Phase 6 profile is missing.', 'Add the profile to AgentProfileContract.'));
    }
  }
  for (const source of inspection.capabilitySources) {
    if (!source.id.trim()) {
      issues.push(contractIssue('capabilitySources.id', 'Capability source has no id.', 'Declare a stable capability source id.'));
    }
    if (!source.sourceRef.trim()) {
      issues.push(contractIssue(`${source.id}.sourceRef`, 'Capability source has no source reference.', 'Declare the source_ref before runtime inspection can cite it.'));
    }
    if (!source.attribution.trim()) {
      issues.push(contractIssue(`${source.id}.attribution`, 'Capability source has no attribution.', 'Declare attribution before external material can enter the runtime registry.'));
    }
    if (source.quarantineRequired && source.reuseDecision === 'reuse_direct') {
      issues.push(contractIssue(`${source.id}.reuseDecision`, 'Quarantined source cannot be reused directly.', 'Use adapt_via_host_adapter or borrow_mechanism until quarantine evidence promotes the source.'));
    }
    if (source.quarantineRequired && sourceDeclaresUnsafeAuthority(source)) {
      issues.push(contractIssue(`${source.id}.allowedUse`, 'Quarantined source requests prompt import, direct execution, or lifecycle authority.', 'Keep external material declarative and route only through validated profiles, capabilities, and adapter mappings.'));
    }
  }
  for (const capability of inspection.skillCapabilities) {
    const registrySource = inspectionRegistrySource(inspection, 'skill_capability', capability.id);
    if (!capability.id.trim()) {
      issues.push(contractIssue('skillCapabilities.id', 'Capability has no id.', 'Declare a stable capability id.'));
    }
    if (capability.allowedStages.length === 0) {
      issues.push(contractIssue(`${capability.id}.allowedStages`, 'Capability has no allowed stages.', 'Declare the SDD stages where this capability may be used.'));
    }
    if (!capability.sourceRef.trim()) {
      issues.push(contractIssue(`${capability.id}.sourceRef`, 'Capability has no source attribution.', 'Add source_ref before routing can cite this capability.'));
    }
    if (registrySource?.origin === 'project_config' && capability.evidenceType === 'none') {
      issues.push(contractIssue(`${capability.id}.evidenceType`, 'Project-declared capability has no evidence type.', 'Declare evidence_type so runtime results can be verified.'));
    }
    if (registrySource?.sourceId && !sourceIds.has(registrySource.sourceId)) {
      issues.push(contractIssue(`${capability.id}.sourceRef`, `Capability references missing source ${registrySource.sourceId}.`, 'Add the capability source or update the capability source_ref.'));
    }
  }
  for (const profile of inspection.profiles) {
    if (!profile.id.trim()) {
      issues.push(contractIssue('profiles.id', 'Profile has no id.', 'Declare a stable profile id.'));
    }
    if (profile.stageScope.length === 0 || profile.boundaries.length === 0) {
      issues.push(contractIssue(`${profile.id}.boundary`, 'Profile stage scope or boundary is incomplete.', 'Declare stage scope and execution boundaries.'));
    }
    if (profile.toolScope.length === 0) {
      issues.push(contractIssue(`${profile.id}.toolScope`, 'Profile has no tool scope.', 'Declare allowed tool groups before routing can project permissions.'));
    }
    if (profile.requiredArtifacts.length === 0) {
      issues.push(contractIssue(`${profile.id}.requiredArtifacts`, 'Profile has no required artifacts.', 'Declare the evidence artifacts expected from this profile.'));
    }
    if (!modelPolicyIds.has(profile.modelPolicyId)) {
      issues.push(contractIssue(`${profile.id}.modelPolicyId`, `Profile references unknown model policy ${profile.modelPolicyId}.`, 'Use a registered model policy id.'));
    }
    for (const capabilityId of profile.hostCapabilityRequirements) {
      if (!capabilityIds.has(capabilityId) && capabilityId !== 'claude_code.host_adapter') {
        issues.push(contractIssue(`${profile.id}.hostCapabilityRequirements`, `Profile references unknown capability ${capabilityId}.`, 'Add the capability or remove the requirement.'));
      }
    }
  }
  for (const [alias, target] of Object.entries(inspection.aliases ?? {})) {
    if (!alias.trim() || !target.trim()) {
      issues.push(contractIssue('agent_runtime.aliases', 'Alias declaration is incomplete.', 'Declare alias and target profile id.'));
      continue;
    }
    if (!inspectionProfileTokenResolves(target, profileIds)) {
      issues.push(contractIssue(`agent_runtime.aliases.${alias}`, `Alias points to unknown profile ${target}.`, 'Point aliases at a registered built-in or project-config profile.'));
    }
  }
  for (const rule of inspection.routingRules ?? []) {
    if (!rule.id.trim()) {
      issues.push(contractIssue('agent_runtime.routing_rules.id', 'Routing rule has no id.', 'Declare a stable routing rule id.'));
    }
    if (rule.when.keywords.length === 0 && rule.when.affectedFileGlobs.length === 0) {
      issues.push(contractIssue(`${rule.id}.when`, 'Routing rule has no match condition.', 'Declare keywords or affected_file_globs before the rule can influence routing.'));
    }
    if (!inspectionProfileTokenResolves(rule.preferProfile, profileIds)) {
      issues.push(contractIssue(`${rule.id}.preferProfile`, `Routing rule prefers unknown profile ${rule.preferProfile}.`, 'Add the profile or update prefer_profile.'));
    }
    for (const capabilityId of rule.requireCapabilities) {
      if (!capabilityIds.has(capabilityId)) {
        issues.push(contractIssue(`${rule.id}.requireCapabilities`, `Routing rule requires unknown capability ${capabilityId}.`, 'Add the capability or remove it from require_capabilities.'));
      }
    }
  }
  for (const mapping of inspection.adapterMappings ?? []) {
    if (!inspectionProfileTokenResolves(mapping.profile, profileIds)) {
      issues.push(contractIssue(`agent_runtime.adapter_mappings.${mapping.profile}`, `Adapter mapping references unknown profile ${mapping.profile}.`, 'Map adapters only to registered profiles.'));
    }
    if (!mapping.hostAdapter.trim() || !mapping.projection.trim() || !mapping.permissionPolicy.trim()) {
      issues.push(contractIssue(`agent_runtime.adapter_mappings.${mapping.profile}`, 'Adapter mapping is incomplete.', 'Declare host_adapter, projection, and permission_policy.'));
    }
  }
  if (inspection.teamMode.enabled) {
    issues.push(contractIssue('teamMode.enabled', 'Runtime inspection without task context must keep team-mode disabled.', 'Use task routing to select adaptive team-mode for a concrete task.'));
  }
  return issues;
}

function inspectionRegistrySource(inspection: AgentSkillTeamRuntimeInspection, kind: RuntimeRegistryEntrySource['kind'], id: string): RuntimeRegistryEntrySource | null {
  return inspection.registrySources?.find((source) => source.kind === kind && source.id === id) ?? null;
}

function inspectionProfileTokenResolves(value: string, profileIds: Set<AgentProfileId>): boolean {
  const normalized = normalizeAgentToken(value);
  if ([...profileIds].some((profileId) => normalizeAgentToken(profileId) === normalized)) {
    return true;
  }
  const aliasTarget = builtInProfileAliasTarget(value);
  return aliasTarget ? profileIds.has(aliasTarget) : false;
}

function sourceDeclaresUnsafeAuthority(source: CapabilitySourceCatalogEntry): boolean {
  return /prompt\s*(body|import)|direct\s+execution|execute\s+(third[- ]party|external)|run\s+(agent\s+)?pack|lifecycle\s+authority|completion\s+authority|unscoped\s+write|permission\s+escalation/i.test([source.allowedUse, source.rationale].join('\n'));
}

function builtInProfileAliasTarget(value: string): AgentProfileId | null {
  const normalized = normalizeAgentToken(value);
  if (normalized === 'scout') {
    return 'researcher';
  }
  if (normalized === 'debugger') {
    return 'implementer';
  }
  if (normalized === 'spec_reviewer') {
    return 'reviewer';
  }
  if (normalized === 'domain') {
    return 'domain_expert';
  }
  return null;
}

function normalizeAgentToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '_');
}
