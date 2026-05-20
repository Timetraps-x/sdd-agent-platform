import { COMMAND_TEAM_RUNTIME_CONTRACT_VERSION } from '../contracts.js';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';
import { readFile } from 'node:fs/promises';
import { inspectAgentCapabilityCatalog, type AgentCapabilityAuthority, type AgentCapabilityDomain, type AgentCapabilityMaterialPack, type MaterialPackLoadPolicy } from './agent-capability-catalog.js';
import { listRuntimeProjections, recordRuntimeProjection } from '../storage/runtime-store.js';

export type CommandTeamRuntimeCommand = 'spec' | 'plan' | 'tasks' | 'verifies' | 'do' | 'test' | 'verify' | 'sync-back' | 'ship' | 'doctor-deep' | 'recover';
export type CommandTeamMode = 'single' | 'team-lite' | 'team-required' | 'blocked';
export type CommandTeamActivation = 'auto' | 'force' | 'off';
export type CommandRoleKind = 'scout' | 'planner' | 'implementer' | 'reviewer' | 'validator' | 'risk-reviewer' | 'summarizer' | 'operator';

export interface CommandRoleProfile {
  id: string;
  role: CommandRoleKind;
  requiredDomains: AgentCapabilityDomain[];
  authorityCeiling: AgentCapabilityAuthority;
  materialPackIds: string[];
  contextBudget: AgentCapabilityMaterialPack['contextBudget'];
  summaryOnly: boolean;
  evidenceRequired: boolean;
}

export interface CommandRoleIndependenceRule {
  id: string;
  command: CommandTeamRuntimeCommand;
  leftRoleId: string;
  rightRoleId: string;
  rationale: string;
}

export interface CommandTeamRuntimeProfile {
  command: CommandTeamRuntimeCommand;
  minMode: Exclude<CommandTeamMode, 'blocked'>;
  escalationRiskTags: string[];
  requiredRoleIds: string[];
  optionalRoleIds: string[];
  summaryContract: 'summary_only_artifact_backed';
  evidenceAuthority: 'runner_decides' | 'gate_decides';
  materialPolicy: MaterialPackLoadPolicy;
  telemetry: {
    contextBudget: AgentCapabilityMaterialPack['contextBudget'];
    recordContextBytes: boolean;
    recordSummaryBytes: boolean;
    recordEvidenceRefs: boolean;
    tokenEstimatePolicy: 'estimated_only';
  };
}

export interface CommandTeamRuntimeInspection {
  version: typeof COMMAND_TEAM_RUNTIME_CONTRACT_VERSION;
  roles: CommandRoleProfile[];
  commandProfiles: CommandTeamRuntimeProfile[];
  independenceRules: CommandRoleIndependenceRule[];
}

export interface CommandTeamRuntimeValidation {
  version: typeof COMMAND_TEAM_RUNTIME_CONTRACT_VERSION;
  valid: boolean;
  issues: string[];
  inspection: CommandTeamRuntimeInspection;
}

export interface CommandTeamRuntimeDecision {
  version: typeof COMMAND_TEAM_RUNTIME_CONTRACT_VERSION;
  command: CommandTeamRuntimeCommand;
  mode: CommandTeamMode;
  activation: CommandTeamActivation;
  roleIds: string[];
  materialPackIds: string[];
  independenceRuleIds: string[];
  telemetryPolicy: CommandTeamRuntimeProfile['telemetry'] | null;
  reason: string;
}

const ROLES: CommandRoleProfile[] = [
  role('role.norm-scout', 'scout', ['norm_discovery'], 'advisory_only', ['project-norms'], 'small', true, false),
  role('role.uncertainty-reviewer', 'reviewer', ['uncertainty_resolution'], 'advisory_only', ['uncertainty-map'], 'tiny', true, false),
  role('role.performance-planner', 'planner', ['performance_planning'], 'advisory_only', ['performance-risk'], 'tiny', true, false),
  role('role.verification-designer', 'validator', ['verification_design'], 'gate_evidence', ['verification-design'], 'small', true, true),
  role('role.evidence-runner', 'operator', ['evidence_collection'], 'validation_runner', ['verification-design'], 'small', true, true),
  role('role.implementation-reviewer', 'reviewer', ['verification_design'], 'gate_evidence', ['verification-design'], 'small', true, true),
  role('role.sync-risk-reviewer', 'risk-reviewer', ['sync_back_risk_review'], 'gate_evidence', ['sync-back-risk'], 'tiny', true, true),
  role('role.release-summarizer', 'summarizer', ['release_summary'], 'advisory_only', ['sync-back-risk'], 'tiny', true, false),
  role('role.context-curator', 'scout', ['context_curation'], 'advisory_only', ['project-norms', 'uncertainty-map', 'performance-risk'], 'tiny', true, false)
];

const COMMAND_PROFILES: CommandTeamRuntimeProfile[] = [
  profile('spec', 'team-lite', ['ambiguous', 'high_risk'], ['role.norm-scout', 'role.uncertainty-reviewer'], ['role.context-curator'], 'runner_decides', 'summary_only', 'small'),
  profile('plan', 'team-lite', ['performance', 'context_budget', 'token_risk'], ['role.norm-scout', 'role.performance-planner'], ['role.uncertainty-reviewer', 'role.context-curator'], 'runner_decides', 'summary_only', 'tiny'),
  profile('tasks', 'single', ['shared_state', 'architecture'], ['role.norm-scout'], ['role.performance-planner', 'role.context-curator'], 'runner_decides', 'summary_only', 'tiny'),
  profile('verifies', 'team-lite', ['acceptance', 'evidence'], ['role.verification-designer'], ['role.context-curator'], 'gate_decides', 'route_when_triggered', 'small'),
  profile('do', 'single', ['implementation_review', 'shared_state'], ['role.implementation-reviewer'], ['role.context-curator'], 'gate_decides', 'route_when_triggered', 'small'),
  profile('test', 'single', ['validation', 'runtime_evidence'], ['role.evidence-runner'], ['role.verification-designer'], 'gate_decides', 'route_when_triggered', 'small'),
  profile('verify', 'team-lite', ['acceptance', 'runtime_evidence'], ['role.verification-designer', 'role.evidence-runner'], ['role.context-curator'], 'gate_decides', 'route_when_triggered', 'small'),
  profile('sync-back', 'team-lite', ['shared_state', 'semantic_update'], ['role.sync-risk-reviewer'], ['role.context-curator'], 'gate_decides', 'summary_only', 'tiny'),
  profile('ship', 'team-lite', ['release', 'external_state'], ['role.release-summarizer', 'role.sync-risk-reviewer'], ['role.context-curator'], 'runner_decides', 'summary_only', 'tiny'),
  profile('doctor-deep', 'team-lite', ['runtime_evidence', 'stale_evidence'], ['role.context-curator', 'role.sync-risk-reviewer'], ['role.release-summarizer'], 'runner_decides', 'summary_only', 'tiny'),
  profile('recover', 'team-required', ['blocked', 'stale_evidence', 'shared_state'], ['role.context-curator', 'role.sync-risk-reviewer', 'role.verification-designer'], ['role.release-summarizer'], 'gate_decides', 'summary_only', 'small')
];

const INDEPENDENCE_RULES: CommandRoleIndependenceRule[] = [
  independence('ind.verify.runner-designer', 'verify', 'role.evidence-runner', 'role.verification-designer', 'Verification design and executed evidence must remain distinguishable.'),
  independence('ind.ship.summary-risk', 'ship', 'role.release-summarizer', 'role.sync-risk-reviewer', 'Release summary cannot replace shared-state risk review.'),
  independence('ind.recover.context-risk', 'recover', 'role.context-curator', 'role.sync-risk-reviewer', 'Recovery context selection cannot approve its own shared-state changes.'),
  independence('ind.test.runner-designer', 'test', 'role.evidence-runner', 'role.verification-designer', 'Validation command execution must not be treated as verification design when both roles are active.')
];

export async function inspectCommandTeamRuntime(projectRoot: string): Promise<CommandTeamRuntimeInspection> {
  await assertProjectConfigReadable(projectRoot);
  return {
    version: COMMAND_TEAM_RUNTIME_CONTRACT_VERSION,
    roles: [...ROLES].sort((left, right) => left.id.localeCompare(right.id)),
    commandProfiles: [...COMMAND_PROFILES].sort((left, right) => left.command.localeCompare(right.command)),
    independenceRules: [...INDEPENDENCE_RULES].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function validateCommandTeamRuntime(projectRoot: string): Promise<CommandTeamRuntimeValidation> {
  const [inspection, capabilityCatalog] = await Promise.all([
    inspectCommandTeamRuntime(projectRoot),
    inspectAgentCapabilityCatalog(projectRoot)
  ]);
  const issues = validateInspection(inspection, new Set(capabilityCatalog.capabilities.map((capability) => capability.domain)), new Set(capabilityCatalog.materialPacks.map((pack) => pack.id)));
  return {
    version: COMMAND_TEAM_RUNTIME_CONTRACT_VERSION,
    valid: issues.length === 0,
    issues,
    inspection
  };
}

export async function decideCommandTeamRuntime(projectRoot: string, options: { command: CommandTeamRuntimeCommand; activation?: CommandTeamActivation; riskTags?: string[] }): Promise<CommandTeamRuntimeDecision> {
  const validation = await validateCommandTeamRuntime(projectRoot);
  const profile = validation.inspection.commandProfiles.find((candidate) => candidate.command === options.command);
  if (!validation.valid || !profile) {
    return {
      version: COMMAND_TEAM_RUNTIME_CONTRACT_VERSION,
      command: options.command,
      mode: 'blocked',
      activation: options.activation ?? 'auto',
      roleIds: [],
      materialPackIds: [],
      independenceRuleIds: [],
      telemetryPolicy: null,
      reason: profile ? `invalid command team runtime: ${validation.issues.join('; ')}` : `unknown command profile: ${options.command}`
    };
  }

  const activation = options.activation ?? 'auto';
  const tokenPressure = await hasContextTokenPressure(projectRoot);
  const riskTags = new Set(options.riskTags ?? []);
  const escalated = profile.escalationRiskTags.some((tag) => riskTags.has(tag));
  const mode = activation === 'off' ? 'single' : activation === 'force' ? forceMode(profile.minMode) : escalated ? forceMode(profile.minMode) : profile.minMode;
  const roleIds = commandTeamRoleIds(profile, mode, tokenPressure, activation);
  const roles = validation.inspection.roles.filter((roleProfile) => roleIds.includes(roleProfile.id));
  const materialPackIds = [...new Set(roles.flatMap((roleProfile) => roleProfile.materialPackIds))].sort();
  const independenceRuleIds = validation.inspection.independenceRules
    .filter((rule) => rule.command === profile.command && roleIds.includes(rule.leftRoleId) && roleIds.includes(rule.rightRoleId))
    .map((rule) => rule.id)
    .sort();

  const decision: CommandTeamRuntimeDecision = {
    version: COMMAND_TEAM_RUNTIME_CONTRACT_VERSION,
    command: options.command,
    mode,
    activation,
    roleIds,
    materialPackIds,
    independenceRuleIds,
    telemetryPolicy: profile.telemetry,
    reason: teamRuntimeDecisionReason(activation, escalated, tokenPressure)
  };
  await recordRuntimeProjection(projectRoot, 'team_runtime_decision', options.command, decision);
  return decision;
}

function role(id: string, roleKind: CommandRoleKind, requiredDomains: AgentCapabilityDomain[], authorityCeiling: AgentCapabilityAuthority, materialPackIds: string[], contextBudget: AgentCapabilityMaterialPack['contextBudget'], summaryOnly: boolean, evidenceRequired: boolean): CommandRoleProfile {
  return { id, role: roleKind, requiredDomains, authorityCeiling, materialPackIds, contextBudget, summaryOnly, evidenceRequired };
}

function commandTeamRoleIds(profile: CommandTeamRuntimeProfile, mode: CommandTeamMode, tokenPressure: boolean, activation: CommandTeamActivation): string[] {
  if (mode === 'single') {
    return profile.requiredRoleIds.slice(0, 1);
  }
  if (tokenPressure && activation !== 'force') {
    return profile.requiredRoleIds;
  }
  return [...profile.requiredRoleIds, ...profile.optionalRoleIds];
}

function teamRuntimeDecisionReason(activation: CommandTeamActivation, escalated: boolean, tokenPressure: boolean): string {
  if (activation === 'off') {
    return 'team mode disabled for this command decision';
  }
  if (tokenPressure && activation !== 'force') {
    return 'context/token pressure trimmed optional team roles and material packs';
  }
  return escalated ? 'risk tags triggered command team escalation' : 'command profile selected default bounded team runtime';
}

async function hasContextTokenPressure(projectRoot: string): Promise<boolean> {
  const projections = await listRuntimeProjections(projectRoot, ['context_build', 'team_runtime_decision']);
  return projections.some((projection) => {
    if (projection.projectionType === 'context_build') {
      const payload = projection.payload as { budget?: { deferredRefs?: unknown[]; truncatedSummaries?: unknown[]; estimatedBytes?: unknown; maxBytes?: unknown } };
      const deferredRefs = payload.budget?.deferredRefs?.length ?? 0;
      const truncatedSummaries = payload.budget?.truncatedSummaries?.length ?? 0;
      const estimatedBytes = payload.budget?.estimatedBytes;
      const maxBytes = payload.budget?.maxBytes;
      return deferredRefs > 0 || truncatedSummaries > 0 || (typeof estimatedBytes === 'number' && typeof maxBytes === 'number' && estimatedBytes >= maxBytes * 0.85);
    }
    const payload = projection.payload as { mode?: unknown; roleIds?: unknown };
    const roleCount = Array.isArray(payload.roleIds) ? payload.roleIds.length : 0;
    return payload.mode === 'team-required' || roleCount > 2;
  });
}

function profile(command: CommandTeamRuntimeCommand, minMode: Exclude<CommandTeamMode, 'blocked'>, escalationRiskTags: string[], requiredRoleIds: string[], optionalRoleIds: string[], evidenceAuthority: CommandTeamRuntimeProfile['evidenceAuthority'], materialPolicy: MaterialPackLoadPolicy, contextBudget: AgentCapabilityMaterialPack['contextBudget']): CommandTeamRuntimeProfile {
  return {
    command,
    minMode,
    escalationRiskTags,
    requiredRoleIds,
    optionalRoleIds,
    summaryContract: 'summary_only_artifact_backed',
    evidenceAuthority,
    materialPolicy,
    telemetry: {
      contextBudget,
      recordContextBytes: true,
      recordSummaryBytes: true,
      recordEvidenceRefs: true,
      tokenEstimatePolicy: 'estimated_only'
    }
  };
}

function independence(id: string, command: CommandTeamRuntimeCommand, leftRoleId: string, rightRoleId: string, rationale: string): CommandRoleIndependenceRule {
  return { id, command, leftRoleId, rightRoleId, rationale };
}

function validateInspection(inspection: CommandTeamRuntimeInspection, domains: Set<AgentCapabilityDomain>, packIds: Set<string>): string[] {
  const issues: string[] = [];
  const roleIds = new Set(inspection.roles.map((roleProfile) => roleProfile.id));
  const commandIds = new Set<CommandTeamRuntimeCommand>();
  const expectedCommands: CommandTeamRuntimeCommand[] = ['spec', 'plan', 'tasks', 'verifies', 'do', 'test', 'verify', 'sync-back', 'ship', 'doctor-deep', 'recover'];

  for (const roleProfile of inspection.roles) {
    if (roleProfile.requiredDomains.length === 0) {
      issues.push(`${roleProfile.id}: required domains are required.`);
    }
    if (!roleProfile.summaryOnly) {
      issues.push(`${roleProfile.id}: command roles must return summary-only output.`);
    }
    for (const domain of roleProfile.requiredDomains) {
      if (!domains.has(domain)) {
        issues.push(`${roleProfile.id}: unknown capability domain ${domain}.`);
      }
    }
    for (const packId of roleProfile.materialPackIds) {
      if (!packIds.has(packId)) {
        issues.push(`${roleProfile.id}: unknown material pack ${packId}.`);
      }
    }
  }

  for (const commandProfile of inspection.commandProfiles) {
    commandIds.add(commandProfile.command);
    if (commandProfile.requiredRoleIds.length === 0) {
      issues.push(`${commandProfile.command}: required roles are required.`);
    }
    for (const roleId of [...commandProfile.requiredRoleIds, ...commandProfile.optionalRoleIds]) {
      if (!roleIds.has(roleId)) {
        issues.push(`${commandProfile.command}: unknown role ${roleId}.`);
      }
    }
    if (commandProfile.materialPolicy === 'never_inline') {
      issues.push(`${commandProfile.command}: command team runtime may not inline full material packs.`);
    }
  }

  for (const command of expectedCommands) {
    if (!commandIds.has(command)) {
      issues.push(`${command}: command profile is missing.`);
    }
  }

  for (const rule of inspection.independenceRules) {
    if (!commandIds.has(rule.command)) {
      issues.push(`${rule.id}: unknown command ${rule.command}.`);
    }
    if (!roleIds.has(rule.leftRoleId) || !roleIds.has(rule.rightRoleId)) {
      issues.push(`${rule.id}: independence roles must exist.`);
    }
  }

  return issues;
}

function forceMode(mode: Exclude<CommandTeamMode, 'blocked'>): Exclude<CommandTeamMode, 'blocked'> {
  return mode === 'single' ? 'team-lite' : mode;
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
