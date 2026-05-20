import type { SddTask } from '../sdd-docs/task-parser.js';
import type {
  AgentProfileContract,
  AgentProfileId,
  AgentRuntimeAliasResolution,
  AgentRuntimeRoutingRule
} from './agent-runtime.js';
import { BUILT_IN_AGENT_PROFILES, type AgentSkillRuntimeRegistry } from './runtime-registry.js';
import { hasExternalUnknownRisk, hasSecurityRisk } from './risk-policy.js';

export interface AgentRouteProfileSelection {
  profiles: AgentProfileId[];
  resolvedAliases: AgentRuntimeAliasResolution[];
}

interface AgentProfileTokenResolution {
  profile: AgentProfileId | null;
  alias: AgentRuntimeAliasResolution | null;
}

export function deriveAllowedProfiles(task: SddTask, registry: AgentSkillRuntimeRegistry, matchedRules: AgentRuntimeRoutingRule[]): AgentRouteProfileSelection {
  const profiles = new Set<AgentProfileId>();
  const resolvedAliases: AgentRuntimeAliasResolution[] = [];
  for (const value of [...task.allowedAgents, ...task.agentFit]) {
    for (const token of value.split(/[\s,\/]+/).filter(Boolean)) {
      const resolution = resolveAgentProfileToken(token, registry);
      if (resolution.profile) {
        profiles.add(resolution.profile);
      }
      appendAliasResolution(resolvedAliases, resolution.alias);
    }
  }
  for (const rule of matchedRules) {
    const resolution = resolveAgentProfileToken(rule.preferProfile, registry);
    if (resolution.profile) {
      profiles.add(resolution.profile);
    }
    appendAliasResolution(resolvedAliases, resolution.alias);
  }
  if (profiles.size === 0) {
    for (const profile of fallbackProfilesForTask(task)) {
      addRegisteredProfile(profiles, profile, registry);
    }
  }
  return { profiles: [...profiles], resolvedAliases };
}

export function toAgentProfileId(value: string, registry?: AgentSkillRuntimeRegistry): AgentProfileId | null {
  return resolveAgentProfileToken(value, registry).profile;
}

export function resolveAgentProfileToken(value: string, registry?: AgentSkillRuntimeRegistry): AgentProfileTokenResolution {
  const directProfile = registry ? findRegisteredProfile(value, registry) : findBuiltInProfile(value);
  if (directProfile) {
    return { profile: directProfile.id, alias: null };
  }
  const builtInAlias = builtInProfileAliasTarget(value);
  const builtInProfile = builtInAlias ? registry ? findRegisteredProfile(builtInAlias, registry) : findBuiltInProfile(builtInAlias) : null;
  if (builtInProfile) {
    return { profile: builtInProfile.id, alias: { input: value, resolved: builtInProfile.id, source: 'built_in' } };
  }
  if (registry) {
    for (const [alias, target] of Object.entries(registry.aliases)) {
      if (normalizeAgentToken(alias) !== normalizeAgentToken(value)) {
        continue;
      }
      const aliasTarget = findRegisteredProfile(target, registry) ?? (builtInProfileAliasTarget(target) ? findRegisteredProfile(builtInProfileAliasTarget(target)!, registry) : null);
      if (aliasTarget) {
        return { profile: aliasTarget.id, alias: { input: value, resolved: aliasTarget.id, source: 'project_config' } };
      }
    }
  }
  return { profile: null, alias: null };
}

export function findRegisteredProfile(value: string, registry: AgentSkillRuntimeRegistry): AgentProfileContract | null {
  const normalized = normalizeAgentToken(value);
  return registry.profiles.find((profile) => normalizeAgentToken(profile.id) === normalized) ?? null;
}

export function findBuiltInProfile(value: string): AgentProfileContract | null {
  const normalized = normalizeAgentToken(value);
  return BUILT_IN_AGENT_PROFILES.find((profile) => normalizeAgentToken(profile.id) === normalized) ?? null;
}

export function chooseRecommendedProfile(task: SddTask, allowedProfiles: AgentProfileId[], registry: AgentSkillRuntimeRegistry, matchedRules: AgentRuntimeRoutingRule[]): AgentProfileId {
  if (hasSecurityRisk(task.risk)) {
    return allowedProfiles.includes('security') ? 'security' : allowedProfiles[0] ?? 'security';
  }
  if (hasExternalUnknownRisk(task.risk)) {
    return allowedProfiles.includes('researcher') ? 'researcher' : allowedProfiles[0] ?? 'researcher';
  }
  if (task.status === 'completed') {
    return allowedProfiles.includes('validator') ? 'validator' : allowedProfiles[0] ?? 'validator';
  }
  const preferredByRule = matchedRules.map((rule) => resolveAgentProfileToken(rule.preferProfile, registry).profile).find((profile): profile is AgentProfileId => Boolean(profile));
  if (preferredByRule && allowedProfiles.includes(preferredByRule)) {
    return preferredByRule;
  }
  if (allowedProfiles.includes('implementer')) {
    return 'implementer';
  }
  return allowedProfiles[0] ?? 'implementer';
}

function appendAliasResolution(resolvedAliases: AgentRuntimeAliasResolution[], alias: AgentRuntimeAliasResolution | null): void {
  if (!alias) {
    return;
  }
  if (!resolvedAliases.some((candidate) => candidate.input === alias.input && candidate.resolved === alias.resolved && candidate.source === alias.source)) {
    resolvedAliases.push(alias);
  }
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

function addRegisteredProfile(profiles: Set<AgentProfileId>, profileId: AgentProfileId, registry: AgentSkillRuntimeRegistry): void {
  const profile = findRegisteredProfile(profileId, registry);
  if (profile) {
    profiles.add(profile.id);
  }
}

function fallbackProfilesForTask(task: SddTask): AgentProfileId[] {
  if (hasSecurityRisk(task.risk)) {
    return ['security', 'reviewer'];
  }
  if (hasExternalUnknownRisk(task.risk)) {
    return ['researcher', 'architect'];
  }
  if (task.status === 'completed') {
    return ['validator', 'reviewer'];
  }
  return ['implementer', 'reviewer', 'validator'];
}

function normalizeAgentToken(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, '_');
}
