import { TEAM_MODE_POLICY_VERSION } from '../contracts.js';
import type { LifecycleAutonomyCeiling } from '../lifecycle/decision-gate.js';
import type { TeamModeActivation } from './route-cache.js';
import { BUILT_IN_DELEGATION_WAVES } from './runtime-registry.js';
import type {
  AgentProfileId,
  AgentRouterCategory,
  DelegationWavePolicy,
  TeamModeCostClass,
  TeamModeCostRoute,
  TeamModeDecisionStatus,
  TeamModePolicy,
  TeamModeSelection
} from './agent-runtime.js';
import type { SddTask } from '../sdd-docs/task-parser.js';
import { hasSecurityRisk, isHighRiskValues, taskAutonomyCeiling } from './risk-policy.js';

export function resolveTeamModeActivation(options: { teamModeEnabled?: boolean; teamModeActivation?: TeamModeActivation }, defaultActivation: TeamModeActivation): TeamModeActivation {
  if (options.teamModeActivation) {
    return options.teamModeActivation;
  }
  if (options.teamModeEnabled === true) {
    return 'force';
  }
  if (options.teamModeEnabled === false) {
    return 'off';
  }
  return defaultActivation;
}

function baseTeamModePolicy(input: {
  activation: TeamModeActivation;
  mode: TeamModeSelection;
  enabled: boolean;
  decision: TeamModeDecisionStatus;
  costClass: TeamModeCostClass;
  reason: string;
  costRoute?: TeamModeCostRoute;
  downgradeReason?: string | null;
  trustPolicyEnforced?: boolean;
  allowedWaves?: DelegationWavePolicy[];
  memberProfiles?: AgentProfileId[];
  maxMembers?: number;
  blockedReason?: string | null;
}): TeamModePolicy {
  const allowedWaves = input.allowedWaves ?? [];
  const memberProfiles = (input.memberProfiles ?? [...new Set(allowedWaves.flatMap((wave) => wave.memberProfiles))]).slice(0, input.maxMembers ?? 0);
  return {
    version: TEAM_MODE_POLICY_VERSION,
    enabled: input.enabled,
    decision: input.decision,
    mode: input.mode,
    activation: input.activation,
    costClass: input.costClass,
    reason: input.reason,
    costRoute: input.costRoute ?? 'not_applicable',
    downgradeReason: input.downgradeReason ?? null,
    trustPolicyEnforced: input.trustPolicyEnforced ?? true,
    chiefProfile: 'orchestrator',
    memberProfiles,
    allowedWaves,
    maxMembers: input.maxMembers ?? memberProfiles.length,
    requireArtifacts: true,
    blockedReason: input.blockedReason ?? null,
    waveRecommendation: allowedWaves.map((wave) => wave.id)
  };
}

function selectTeamWaves(ids: Array<DelegationWavePolicy['id']>): DelegationWavePolicy[] {
  return ids.map((id) => BUILT_IN_DELEGATION_WAVES.find((wave) => wave.id === id)).filter((wave): wave is DelegationWavePolicy => Boolean(wave));
}

function hasReviewArtifactRequirement(task: SddTask | null | undefined): boolean {
  return Boolean(task?.requiredArtifacts.some((artifact) => /review|validation|security|验证|评审|安全/i.test(artifact)));
}

export function buildTeamModePolicy(options: { activation: TeamModeActivation; task?: SddTask | null; category?: AgentRouterCategory; risk?: string[]; autonomyCeiling?: LifecycleAutonomyCeiling; blockedReason?: string | null }): TeamModePolicy {
  const activation = options.activation;
  if (options.blockedReason) {
    return baseTeamModePolicy({
      activation,
      mode: 'off',
      enabled: false,
      decision: 'blocked',
      costClass: 'none',
      reason: options.blockedReason,
      blockedReason: options.blockedReason,
      costRoute: 'blocked',
      trustPolicyEnforced: true
    });
  }
  if (activation === 'off') {
    return baseTeamModePolicy({
      activation,
      mode: 'off',
      enabled: false,
      decision: 'disabled',
      costClass: 'none',
      reason: 'Team-mode automation disabled for this route.',
      costRoute: 'not_applicable',
      trustPolicyEnforced: true
    });
  }

  const task = options.task ?? null;
  const risk = options.risk ?? task?.risk ?? [];
  const category = options.category ?? 'planning';
  const autonomyCeiling = options.autonomyCeiling ?? (task ? taskAutonomyCeiling(task) : 'direct_execution_allowed');
  const highRisk = isHighRiskValues(risk) || autonomyCeiling === 'full_sdd_with_checkpoint' || autonomyCeiling === 'research_before_implementation';
  const reviewNeeded = category === 'implementation_review' || category === 'validation' || hasReviewArtifactRequirement(task);

  if (hasSecurityRisk(risk) || category === 'security_research') {
    return baseTeamModePolicy({
      activation,
      mode: 'security-research',
      enabled: true,
      decision: 'enabled',
      costClass: 'high',
      reason: 'Security-sensitive task automatically requires bounded security-research team evidence.',
      costRoute: 'no_downgrade',
      trustPolicyEnforced: true,
      allowedWaves: selectTeamWaves(['security_research', 'validation']),
      memberProfiles: ['security', 'reviewer', 'validator'],
      maxMembers: 3
    });
  }

  if (highRisk || category === 'external_research') {
    return baseTeamModePolicy({
      activation,
      mode: 'hyperplan',
      enabled: true,
      decision: 'enabled',
      costClass: highRisk ? 'high' : 'medium',
      reason: 'High-risk or research-before-implementation task automatically requires adversarial planning/review evidence.',
      costRoute: 'no_downgrade',
      trustPolicyEnforced: true,
      allowedWaves: selectTeamWaves(['hyperplan', 'implementation_review', 'validation']),
      memberProfiles: ['architect', 'reviewer', 'security', 'validator'],
      maxMembers: 4
    });
  }

  if (reviewNeeded || activation === 'force') {
    return baseTeamModePolicy({
      activation,
      mode: 'review-lite',
      enabled: true,
      decision: 'enabled',
      costClass: 'low',
      reason: activation === 'force' ? 'Team-mode was forced, so router selects the lowest-cost review-lite team.' : 'Task metadata indicates review or validation evidence is useful, so router selects review-lite.',
      costRoute: activation === 'force' ? 'no_downgrade' : 'downgraded',
      downgradeReason: activation === 'force' ? null : 'Low-cost review-lite route keeps reviewer/validator artifacts and policy-backed verify mandatory.',
      trustPolicyEnforced: true,
      allowedWaves: selectTeamWaves(['implementation_review', 'validation']),
      memberProfiles: ['reviewer', 'validator'],
      maxMembers: 2
    });
  }

  return baseTeamModePolicy({
    activation,
    mode: 'off',
    enabled: false,
    decision: 'disabled',
    costClass: 'none',
    reason: 'Low-risk task does not need an agent team.',
    costRoute: 'downgraded',
    downgradeReason: 'Low-risk task uses no team automation, but artifact trust policy and policy-backed verify remain mandatory.',
    trustPolicyEnforced: true
  });
}
