import type { AgentSkillTeamRuntimeInspection, CapabilitySourceCatalogEntry, ExternalAgentPackImportInspection, RuntimeRegistryEntrySource, SkillCapabilityContract, TeamModePolicy } from '@sdd-agent-platform/core/router';
import type { AgentSkillTeamRuntimeValidation } from '@sdd-agent-platform/core/router';
import { idsByOrigin, renderRegistryOriginCounts } from './registry-shared.js';

export function renderAgentSkillTeamRuntimeInspection(inspection: AgentSkillTeamRuntimeInspection): string {
  const lines = ['SDD agent/skill/team runtime'];
  lines.push(`version=${inspection.version}`);
  lines.push(`profiles=${inspection.profiles.length} skill_capabilities=${inspection.skillCapabilities.length} capability_sources=${inspection.capabilitySources.length}`);
  lines.push(`registry_origins=${renderRegistryOriginCounts(inspection.registrySources)}`);
  lines.push(`project_profiles=${idsByOrigin(inspection.registrySources, 'profile', 'project_config')}`);
  lines.push(`project_capabilities=${idsByOrigin(inspection.registrySources, 'skill_capability', 'project_config')}`);
  lines.push(`project_sources=${idsByOrigin(inspection.registrySources, 'capability_source', 'project_config')}`);
  if (inspection.aliases && Object.keys(inspection.aliases).length > 0) {
    lines.push(`aliases=${Object.entries(inspection.aliases).map(([alias, target]) => `${alias}->${target}`).join(',')}`);
  }
  if (inspection.routingRules && inspection.routingRules.length > 0) {
    lines.push(`routing_rules=${inspection.routingRules.map((rule) => rule.id).join(',')}`);
  }
  if (inspection.adapterMappings && inspection.adapterMappings.length > 0) {
    lines.push(`adapter_mappings=${inspection.adapterMappings.map((mapping) => `${mapping.profile}:${mapping.hostAdapter}`).join(',')}`);
  }
  lines.push(`host_adapter=${inspection.hostAdapter.id} host=${inspection.hostAdapter.host}`);
  lines.push(`team_mode_default=${inspection.teamMode.decision}`);
  lines.push(`reuse_policy=${inspection.reusePolicy}`);
  lines.push('profiles');
  for (const profile of inspection.profiles) {
    lines.push(`- ${profile.id} stages=${profile.stageScope.join(',')} risk_ceiling=${profile.riskCeiling}`);
  }
  lines.push('capabilities');
  for (const capability of inspection.skillCapabilities) {
    lines.push(`- ${capability.id} reuse=${capability.reuseDecision} evidence=${capability.evidenceType}`);
  }
  return lines.join('\n');
}

export function renderAgentSkillTeamRuntimeValidation(result: AgentSkillTeamRuntimeValidation): string {
  const lines = ['SDD agent/skill/team runtime validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`profiles=${result.inspection.profiles.length}`);
  lines.push(`capabilities=${result.inspection.skillCapabilities.length}`);
  lines.push(`registry_origins=${renderRegistryOriginCounts(result.inspection.registrySources)}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

export function renderSkillCapabilityList(capabilities: SkillCapabilityContract[], registrySources?: RuntimeRegistryEntrySource[]): string {
  const lines = ['SDD skill capabilities'];
  lines.push(`registry_origins=${renderRegistryOriginCounts(registrySources)}`);
  for (const capability of capabilities) {
    const source = registrySources?.find((candidate) => candidate.kind === 'skill_capability' && candidate.id === capability.id);
    lines.push(`- ${capability.id} domain=${capability.capabilityDomain.join(',')} reuse=${capability.reuseDecision} evidence=${capability.evidenceType} origin=${source?.origin ?? 'unknown'}`);
  }
  return lines.join('\n');
}

export function renderSkillCapabilityInspect(capability: SkillCapabilityContract): string {
  const lines = [`Skill capability ${capability.id}`];
  lines.push(`version=${capability.version}`);
  lines.push(`name=${capability.name}`);
  lines.push(`kind=${capability.kind} source=${capability.source} source_ref=${capability.sourceRef}`);
  lines.push(`domain=${capability.capabilityDomain.join(',')}`);
  lines.push(`allowed_stages=${capability.allowedStages.join(',')}`);
  lines.push(`risk_ceiling=${capability.requiredRiskCeiling}`);
  lines.push(`evidence_type=${capability.evidenceType}`);
  lines.push(`reuse_decision=${capability.reuseDecision}`);
  if (capability.buildExceptionReason) {
    lines.push(`build_exception=${capability.buildExceptionReason}`);
  }
  return lines.join('\n');
}

export function renderCapabilitySourceList(sources: CapabilitySourceCatalogEntry[], registrySources?: RuntimeRegistryEntrySource[]): string {
  const lines = ['SDD capability sources'];
  lines.push(`registry_origins=${renderRegistryOriginCounts(registrySources)}`);
  for (const source of sources) {
    const registrySource = registrySources?.find((candidate) => candidate.kind === 'capability_source' && candidate.id === source.id);
    lines.push(`- ${source.id} kind=${source.kind} reuse=${source.reuseDecision} quarantine=${source.quarantineRequired} origin=${registrySource?.origin ?? 'unknown'}`);
  }
  return lines.join('\n');
}

export function renderCapabilitySourceInspect(source: CapabilitySourceCatalogEntry): string {
  const lines = [`Capability source ${source.id}`];
  lines.push(`version=${source.version}`);
  lines.push(`name=${source.name}`);
  lines.push(`kind=${source.kind} reuse=${source.reuseDecision} quarantine=${source.quarantineRequired}`);
  lines.push(`source_ref=${source.sourceRef}`);
  lines.push(`allowed_use=${source.allowedUse}`);
  lines.push(`attribution=${source.attribution}`);
  lines.push(`rationale=${source.rationale}`);
  return lines.join('\n');
}

export function renderExternalAgentPackImportInspection(inspection: ExternalAgentPackImportInspection): string {
  const lines = [`External pack import ${inspection.sourceId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`status=${inspection.status} risk_ceiling=${inspection.riskCeiling}`);
  lines.push(`allowed_profiles=${inspection.allowedProfiles.join(',') || 'none'}`);
  lines.push(`mapping=${inspection.mappingResult}`);
  lines.push(`reason=${inspection.reason}`);
  lines.push('checks');
  for (const check of inspection.checks) {
    lines.push(`- ${check.check} status=${check.status} evidence=${check.evidence}`);
  }
  return lines.join('\n');
}

export function renderTeamModePolicy(policy: TeamModePolicy): string {
  const lines = ['SDD team-mode policy'];
  lines.push(`version=${policy.version}`);
  lines.push(`enabled=${policy.enabled} decision=${policy.decision} mode=${policy.mode} activation=${policy.activation} cost=${policy.costClass}`);
  lines.push(`reason=${policy.reason}`);
  lines.push(`chief=${policy.chiefProfile} members=${policy.memberProfiles.join(',') || 'none'} max_members=${policy.maxMembers}`);
  lines.push(`require_artifacts=${policy.requireArtifacts}`);
  lines.push(`waves=${policy.waveRecommendation.join(',') || 'none'}`);
  if (policy.blockedReason) {
    lines.push(`blocked_reason=${policy.blockedReason}`);
  }
  for (const wave of policy.allowedWaves) {
    lines.push(`- ${wave.id} kind=${wave.waveKind} members=${wave.memberProfiles.join(',')} merge_gate=${wave.mergeGate}`);
  }
  return lines.join('\n');
}
