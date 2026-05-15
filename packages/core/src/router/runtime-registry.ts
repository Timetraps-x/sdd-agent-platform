import { contractIssue, type ContractValidationIssue } from '../contracts/issues.js';
import { readProjectConfig as readProjectConfigFile } from '../config/project-config.js';
import { BUILT_IN_CAPABILITY_SOURCES } from '../registries/capability-sources.js';
import { BUILT_IN_SKILL_CAPABILITIES } from '../registries/skill-capabilities.js';
import {
  BUILT_IN_AGENT_PROFILES,
  BUILT_IN_DELEGATION_WAVES,
  BUILT_IN_EVIDENCE_INGESTION_CONTRACT,
  BUILT_IN_HOST_ADAPTER_CONTRACT,
  BUILT_IN_MODEL_POLICIES
} from '../registries/agent-runtime-static.js';
import { parseAgentRuntimeConfig } from './agent-runtime-config.js';
import type {
  AgentProfileContract,
  AgentRuntimeAdapterMapping,
  AgentRuntimeRoutingRule,
  CapabilitySourceCatalogEntry,
  ProjectAgentRuntimeConfig,
  RuntimeRegistryEntrySource,
  SkillCapabilityContract
} from './agent-runtime.js';

export {
  BUILT_IN_AGENT_PROFILES,
  BUILT_IN_DELEGATION_WAVES,
  BUILT_IN_EVIDENCE_INGESTION_CONTRACT,
  BUILT_IN_HOST_ADAPTER_CONTRACT,
  BUILT_IN_MODEL_POLICIES
};

export interface AgentSkillRuntimeRegistry {
  profiles: AgentProfileContract[];
  skillCapabilities: SkillCapabilityContract[];
  capabilitySources: CapabilitySourceCatalogEntry[];
  registrySources: RuntimeRegistryEntrySource[];
  aliases: Record<string, string>;
  routingRules: AgentRuntimeRoutingRule[];
  adapterMappings: AgentRuntimeAdapterMapping[];
  issues: ContractValidationIssue[];
}

function emptyAgentRuntimeConfig(): ProjectAgentRuntimeConfig {
  return {
    profiles: [],
    skillCapabilities: [],
    capabilitySources: [],
    aliases: {},
    routingRules: [],
    adapterMappings: []
  };
}

export async function buildAgentSkillRuntimeRegistry(projectRoot: string): Promise<AgentSkillRuntimeRegistry> {
  const config = await readProjectConfigFile<ProjectAgentRuntimeConfig>(projectRoot, parseAgentRuntimeConfig);
  return mergeAgentSkillRuntimeRegistry(config.agentRuntime ?? emptyAgentRuntimeConfig());
}

export function mergeAgentSkillRuntimeRegistry(projectRuntime: ProjectAgentRuntimeConfig): AgentSkillRuntimeRegistry {
  const issues: ContractValidationIssue[] = [];
  const profiles = new Map<string, AgentProfileContract>();
  const skillCapabilities = new Map<string, SkillCapabilityContract>();
  const capabilitySources = new Map<string, CapabilitySourceCatalogEntry>();
  const registrySources: RuntimeRegistryEntrySource[] = [];

  for (const profile of BUILT_IN_AGENT_PROFILES) {
    profiles.set(profile.id, profile);
    registrySources.push({ id: profile.id, kind: 'profile', origin: 'built_in', sourceId: null, quarantineRequired: false });
  }
  for (const capability of BUILT_IN_SKILL_CAPABILITIES) {
    skillCapabilities.set(capability.id, capability);
    registrySources.push({ id: capability.id, kind: 'skill_capability', origin: 'built_in', sourceId: null, quarantineRequired: false });
  }
  for (const source of BUILT_IN_CAPABILITY_SOURCES) {
    capabilitySources.set(source.id, source);
    registrySources.push({ id: source.id, kind: 'capability_source', origin: 'built_in', sourceId: source.id, quarantineRequired: source.quarantineRequired });
  }

  for (const source of projectRuntime.capabilitySources) {
    if (capabilitySources.has(source.id)) {
      issues.push(contractIssue(`agent_runtime.capability_sources.${source.id}`, 'Capability source id duplicates an existing source.', 'Use a project-specific id; Phase 6.3 does not allow overriding built-ins.'));
      continue;
    }
    capabilitySources.set(source.id, source);
    registrySources.push({ id: source.id, kind: 'capability_source', origin: 'project_config', sourceId: source.id, quarantineRequired: source.quarantineRequired });
  }

  for (const capability of projectRuntime.skillCapabilities) {
    if (skillCapabilities.has(capability.id)) {
      issues.push(contractIssue(`agent_runtime.skill_capabilities.${capability.id}`, 'Skill capability id duplicates an existing capability.', 'Use a project-specific id; Phase 6.3 does not allow overriding built-ins.'));
      continue;
    }
    skillCapabilities.set(capability.id, capability);
    const source = capabilitySources.get(capability.sourceRef);
    if (!source) {
      issues.push(contractIssue(`agent_runtime.skill_capabilities.${capability.id}.source_ref`, `Skill capability references unknown source ${capability.sourceRef || '<empty>'}.`, 'Declare capability_sources entry first, or point source_ref at an existing capability source id.'));
    }
    registrySources.push({ id: capability.id, kind: 'skill_capability', origin: 'project_config', sourceId: source?.id ?? (capability.sourceRef || null), quarantineRequired: source?.quarantineRequired ?? false });
  }

  for (const profile of projectRuntime.profiles) {
    if (profiles.has(profile.id)) {
      issues.push(contractIssue(`agent_runtime.profiles.${profile.id}`, 'Agent profile id duplicates an existing profile.', 'Use a project-specific id; Phase 6.3 does not allow overriding built-ins.'));
      continue;
    }
    profiles.set(profile.id, profile);
    registrySources.push({ id: profile.id, kind: 'profile', origin: 'project_config', sourceId: null, quarantineRequired: false });
  }

  return {
    profiles: [...profiles.values()].sort((left, right) => left.id.localeCompare(right.id)),
    skillCapabilities: [...skillCapabilities.values()].sort((left, right) => left.id.localeCompare(right.id)),
    capabilitySources: [...capabilitySources.values()].sort((left, right) => left.id.localeCompare(right.id)),
    registrySources: [...registrySources].sort((left, right) => `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`)),
    aliases: { ...projectRuntime.aliases },
    routingRules: [...projectRuntime.routingRules],
    adapterMappings: [...projectRuntime.adapterMappings],
    issues
  };
}

export function registrySourceFor(registry: AgentSkillRuntimeRegistry, kind: RuntimeRegistryEntrySource['kind'], id: string): RuntimeRegistryEntrySource | null {
  return registry.registrySources.find((source) => source.kind === kind && source.id === id) ?? null;
}
