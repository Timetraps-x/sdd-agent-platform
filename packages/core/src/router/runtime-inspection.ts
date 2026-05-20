import {
  AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
  CAPABILITY_SOURCE_CATALOG_VERSION,
  EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION
} from '../contracts.js';
import {
  BUILT_IN_EVIDENCE_INGESTION_CONTRACT,
  BUILT_IN_HOST_ADAPTER_CONTRACT,
  buildAgentSkillRuntimeRegistry
} from './runtime-registry.js';
import { buildTeamModePolicy } from './team-mode.js';
import type {
  AgentSkillTeamRuntimeInspection,
  CapabilitySourceCatalog,
  CapabilitySourceCatalogEntry,
  ExternalAgentPackImportCheck,
  ExternalAgentPackImportInspection,
  SkillCapabilityContract,
  SkillCapabilityRegistry
} from './agent-runtime.js';

export async function inspectAgentSkillTeamRuntime(projectRoot: string): Promise<AgentSkillTeamRuntimeInspection> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  return {
    version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
    profiles: registry.profiles,
    skillCapabilities: registry.skillCapabilities,
    capabilitySources: registry.capabilitySources,
    hostAdapter: BUILT_IN_HOST_ADAPTER_CONTRACT,
    evidenceIngestion: BUILT_IN_EVIDENCE_INGESTION_CONTRACT,
    teamMode: buildTeamModePolicy({ activation: 'off' }),
    reusePolicy: 'reuse_direct native host/MCP capabilities first; external prompt packs are quarantined material sources and projected only as structured metadata.',
    registrySources: registry.registrySources,
    aliases: registry.aliases,
    routingRules: registry.routingRules,
    adapterMappings: registry.adapterMappings
  };
}

export async function listSkillCapabilities(projectRoot: string): Promise<SkillCapabilityRegistry> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  return {
    version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
    capabilities: registry.skillCapabilities,
    registrySources: registry.registrySources.filter((source) => source.kind === 'skill_capability')
  };
}

export async function inspectSkillCapability(projectRoot: string, capabilityId: string): Promise<SkillCapabilityContract | null> {
  const registry = await listSkillCapabilities(projectRoot);
  return registry.capabilities.find((capability) => capability.id === capabilityId) ?? null;
}

export async function listCapabilitySources(projectRoot: string): Promise<CapabilitySourceCatalog> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  return {
    version: CAPABILITY_SOURCE_CATALOG_VERSION,
    sources: registry.capabilitySources,
    registrySources: registry.registrySources.filter((source) => source.kind === 'capability_source')
  };
}

export async function inspectCapabilitySource(projectRoot: string, sourceId: string): Promise<CapabilitySourceCatalogEntry | null> {
  const catalog = await listCapabilitySources(projectRoot);
  return catalog.sources.find((source) => source.id === sourceId) ?? null;
}

export async function inspectExternalAgentPackImport(projectRoot: string, sourceId: string): Promise<ExternalAgentPackImportInspection> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  const source = registry.capabilitySources.find((entry) => entry.id === sourceId);
  if (!source) {
    return {
      version: EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION,
      sourceId,
      status: 'denied',
      checks: [{ check: 'source_catalog', status: 'fail', evidence: 'Source id is not present in CapabilitySourceCatalog.' }],
      mappingResult: 'no SDD mapping available',
      allowedProfiles: [],
      riskCeiling: 'research_before_implementation',
      reason: 'Unknown external source cannot be routed.'
    };
  }
  if (source.reuseDecision === 'avoid') {
    return {
      version: EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION,
      sourceId,
      status: 'denied',
      checks: [{ check: 'reuse_decision', status: 'fail', evidence: `${source.id} is marked avoid for Phase 6 core runtime.` }],
      mappingResult: 'future adapter only',
      allowedProfiles: [],
      riskCeiling: 'research_before_implementation',
      reason: source.rationale
    };
  }
  const checks: ExternalAgentPackImportCheck[] = source.quarantineRequired
    ? [
      { check: 'license_source_attribution', status: 'not_run', evidence: 'Quarantine inspection must verify source and license before import.' },
      { check: 'hidden_unicode_scan', status: 'not_run', evidence: 'External material has not been scanned for hidden Unicode.' },
      { check: 'secret_scan', status: 'not_run', evidence: 'External material has not been scanned for secrets.' },
      { check: 'dangerous_command_scan', status: 'not_run', evidence: 'External material has not been scanned for dangerous commands.' },
      { check: 'sdd_frontmatter_mapping', status: 'not_run', evidence: 'External material has not been mapped to SDD capability/profile fields.' }
    ]
    : [
      { check: 'source_catalog', status: 'pass', evidence: `${source.id} is cataloged as ${source.reuseDecision}.` },
      { check: 'quarantine_required', status: 'pass', evidence: 'This source is a native capability or mechanism reference, not an imported prompt pack.' }
    ];
  return {
    version: EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION,
    sourceId,
    status: source.quarantineRequired ? 'quarantined' : 'approved',
    checks,
    mappingResult: source.quarantineRequired ? 'pending structured metadata mapping' : 'available through host adapter or mechanism reference',
    allowedProfiles: source.quarantineRequired ? ['domain_expert', 'researcher'] : ['researcher', 'architect', 'orchestrator'],
    riskCeiling: source.quarantineRequired ? 'research_before_implementation' : 'compact_boundary_only',
    reason: source.quarantineRequired ? 'External material is not routable until quarantine checks pass.' : source.rationale
  };
}
