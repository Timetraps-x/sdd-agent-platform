import { TOOL_PERMISSION_SPEC_VERSION } from '../contracts.js';
import type { LifecycleAutonomyCeiling } from '../lifecycle/decision-gate.js';
import type { SddTask, SddTaskGap } from '../sdd-docs/task-parser.js';
import type {
  AgentProfileId,
  AgentRouterCategory,
  AgentRouterRejectedProfile,
  AgentRuntimeAdapterMapping,
  AgentRuntimeRoutingRule,
  ModelPolicyContract,
  RuntimeRegistryEntrySource,
  ToolPermissionSpec
} from './agent-runtime.js';
import { BUILT_IN_MODEL_POLICIES, registrySourceFor, type AgentSkillRuntimeRegistry } from './runtime-registry.js';
import { findBuiltInProfile, findRegisteredProfile, resolveAgentProfileToken } from './profile-resolution.js';
import { hasExternalUnknownRisk, hasSecurityRisk, isHighRiskValues } from './risk-policy.js';

export function routeCategory(task: SddTask, blockingGap: SddTaskGap | undefined, allowedProfiles: AgentProfileId[] = [], matchedRules: AgentRuntimeRoutingRule[] = []): AgentRouterCategory {
  if (blockingGap) {
    return 'blocked';
  }
  if (hasSecurityRisk(task.risk)) {
    return 'security_research';
  }
  if (hasExternalUnknownRisk(task.risk)) {
    return 'external_research';
  }
  if (task.status === 'completed') {
    return 'validation';
  }
  const ruleCategory = matchedRules.find((rule) => rule.category)?.category;
  if (ruleCategory) {
    return ruleCategory;
  }
  if (allowedProfiles.every((profile) => profile === 'planner' || profile === 'architect' || profile === 'researcher')) {
    return 'planning';
  }
  if (allowedProfiles.includes('reviewer') && !allowedProfiles.includes('implementer')) {
    return 'implementation_review';
  }
  return 'implementation';
}

export function selectRequiredSkillCapabilities(task: SddTask, profile: AgentProfileId, registry: AgentSkillRuntimeRegistry, matchedRules: AgentRuntimeRoutingRule[]): string[] {
  const capabilities = new Set<string>(['host.search.grep_glob']);
  const profileContract = findRegisteredProfile(profile, registry);
  for (const capabilityId of profileContract?.hostCapabilityRequirements ?? []) {
    capabilities.add(capabilityId);
  }
  for (const rule of matchedRules) {
    for (const capabilityId of rule.requireCapabilities) {
      capabilities.add(capabilityId);
    }
  }
  if (profile === 'researcher' || profile === 'planner' || profile === 'architect' || hasExternalUnknownRisk(task.risk)) {
    capabilities.add('claude.subagent.researcher');
    capabilities.add('context7.docs');
  }
  if (profile === 'implementer') {
    capabilities.add('claude.subagent.implementer');
    capabilities.add('host.edit.hashline');
    capabilities.add('host.cli.shell');
  }
  if (profile === 'reviewer') {
    capabilities.add('host.cli.shell');
  }
  if (profile === 'validator') {
    capabilities.add('host.cli.shell');
    if (task.validation.some((item) => /browser|ui|frontend|playwright|页面|前端/i.test(item))) {
      capabilities.add('playwright.browser_validation');
    }
  }
  if (profile === 'security' || hasSecurityRisk(task.risk)) {
    capabilities.add('pattern.ohmy.security_research');
  }
  if (profile === 'domain_expert') {
    capabilities.add('external.agency_agents.material');
  }
  return [...capabilities];
}

export function routeRegistrySources(registry: AgentSkillRuntimeRegistry, profile: AgentProfileId | null, capabilityIds: string[]): RuntimeRegistryEntrySource[] {
  const selected: RuntimeRegistryEntrySource[] = [];
  const seen = new Set<string>();
  const pushSource = (source: RuntimeRegistryEntrySource | null): void => {
    if (!source) {
      return;
    }
    const key = `${source.kind}:${source.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      selected.push(source);
    }
  };
  if (profile) {
    pushSource(registrySourceFor(registry, 'profile', profile));
  }
  for (const capabilityId of capabilityIds) {
    const capabilitySource = registrySourceFor(registry, 'skill_capability', capabilityId);
    pushSource(capabilitySource);
    if (capabilitySource?.sourceId) {
      pushSource(registrySourceFor(registry, 'capability_source', capabilitySource.sourceId));
    }
  }
  return selected;
}

export function quarantineWarningsForSources(sources: RuntimeRegistryEntrySource[]): string[] {
  return sources.filter((source) => source.quarantineRequired).map((source) => `${source.kind}:${source.id} originates from quarantined material and remains declarative metadata only.`);
}

export function adapterMappingForProfile(registry: AgentSkillRuntimeRegistry, profile: AgentProfileId): AgentRuntimeAdapterMapping | null {
  return registry.adapterMappings.find((mapping) => resolveAgentProfileToken(mapping.profile, registry).profile === profile) ?? null;
}

export function buildToolPermissionSpec(task: SddTask, profile: AgentProfileId, autonomyCeiling: LifecycleAutonomyCeiling, registry?: AgentSkillRuntimeRegistry): ToolPermissionSpec {
  const highRisk = isHighRiskValues(task.risk);
  const readonlyProfiles: AgentProfileId[] = ['planner', 'architect', 'researcher', 'reviewer', 'security', 'domain_expert'];
  const profileContract = registry ? findRegisteredProfile(profile, registry) : null;
  const toolGroups = profileContract && !findBuiltInProfile(profile) ? [...profileContract.toolScope] : readonlyProfiles.includes(profile) ? ['read', 'search', 'docs'] : profile === 'validator' ? ['read', 'test', 'browser'] : ['read', 'edit', 'test'];
  return {
    version: TOOL_PERMISSION_SPEC_VERSION,
    profile,
    risk: [...task.risk],
    toolGroups,
    fileScope: task.affectedFiles.length > 0 ? [...task.affectedFiles] : ['declared task boundary', 'artifacts/<task>.md'],
    policy: highRisk || autonomyCeiling === 'full_sdd_with_checkpoint' || autonomyCeiling === 'research_before_implementation' ? 'ask' : 'allow',
    approvalPolicy: highRisk ? 'human checkpoint required before write or external side effect' : 'host approval policy applies',
    runtimeValidationRequired: highRisk || profile === 'implementer' || profile === 'validator',
    deniedTools: profile === 'security' ? ['destructive_exploit', 'dos', 'credential_exfiltration', 'detection_evasion'] : ['destructive_git', 'unscoped_external_write'],
    hostPermissionProjection: `profile=${profile}; autonomy=${autonomyCeiling}; policy=${highRisk ? 'ask' : 'host-default'}`
  };
}

export function modelPolicyForProfile(profile: AgentProfileId | null, registry?: AgentSkillRuntimeRegistry): ModelPolicyContract {
  const profileContract = profile && registry ? findRegisteredProfile(profile, registry) : null;
  const policyId = profileContract?.modelPolicyId ?? (profile === 'security' ? 'security_review' : profile === 'planner' || profile === 'architect' || profile === 'reviewer' || profile === 'researcher' || profile === 'orchestrator' ? 'reasoning' : 'balanced');
  return BUILT_IN_MODEL_POLICIES.find((policy) => policy.id === policyId) ?? BUILT_IN_MODEL_POLICIES[0];
}

export function buildRejectedProfiles(allowedProfiles: AgentProfileId[], blockedReason: string | null, registry: AgentSkillRuntimeRegistry): AgentRouterRejectedProfile[] {
  const allowed = new Set(allowedProfiles);
  return registry.profiles
    .filter((profile) => !allowed.has(profile.id))
    .map((profile) => ({ profile: profile.id, reason: blockedReason ?? 'Profile is outside task metadata allowed_agents/agent_fit, routing rules, or router risk category.' }));
}
