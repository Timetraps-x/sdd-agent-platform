import {
  LEGACY_LIFECYCLE_DECISION_CONTRACT,
  LIFECYCLE_DECISION_CONTRACT,
  LIFECYCLE_DECISION_VERSION
} from '../contracts.js';
import { appendEvent } from '../run-state/events.js';
import type { RunState } from '../run-state/model.js';
import { readRunState, writeRunState } from '../run-state/run-state.js';
import type { LifecycleDecisionSignals } from './risk-signals.js';

export type LifecycleProfile = 'direct' | 'compact' | 'full' | 'research';
export type LifecycleConfidence = 'high' | 'medium' | 'low';
export type LifecycleAutonomyCeiling = 'direct_execution_allowed' | 'compact_boundary_only' | 'full_sdd_with_checkpoint' | 'research_before_implementation';

export interface LifecycleDecisionRecord {
  contract: typeof LIFECYCLE_DECISION_CONTRACT | typeof LEGACY_LIFECYCLE_DECISION_CONTRACT;
  version?: typeof LIFECYCLE_DECISION_VERSION;
  model_version: string;
  input_summary: Record<string, unknown>;
  decision: {
    profile: LifecycleProfile | null;
    confidence: LifecycleConfidence | null;
    hard_gate_hits: string[];
    required_stages: string[];
    skipped_stages: string[];
    human_checkpoint_required: boolean;
  };
  reasons: string[];
  escalation_triggers: string[];
  downgrade_reason: string | null;
  audit: {
    decided_at: string | null;
    decided_by: 'command' | 'runtime' | 'user_override' | null;
    policy_version: string;
    source_artifacts: string[];
  };
}

export interface LifecycleDecisionGateResult {
  record: LifecycleDecisionRecord;
  checkpointRequired: boolean;
  boundaries: string[];
  autonomyCeiling: LifecycleAutonomyCeiling;
}

const FULL_PROFILE_HARD_GATES = [
  'security_auth',
  'database_or_data_loss',
  'api_schema_contract',
  'state_machine_concurrency_liveness',
  'ci_dependency_build_release'
];

export function evaluateLifecycleDecisionGate(input: Partial<LifecycleDecisionSignals> = {}, decidedAt = new Date()): LifecycleDecisionGateResult {
  const signals = normalizeLifecycleSignals(input);
  const hardGateHits = evaluateLifecycleHardGates(signals);
  const reasons: string[] = [];
  const escalationTriggers = defaultEscalationTriggers();
  let profile: LifecycleProfile;

  if (hardGateHits.includes('external_unknown') || hardGateHits.includes('architecture_decision_required')) {
    profile = 'research';
    reasons.push('External unknowns or architecture decisions require research before implementation.');
  } else if (hardGateHits.some((gate) => FULL_PROFILE_HARD_GATES.includes(gate))) {
    profile = 'full';
    reasons.push('Hard gate requires full SDD path with explicit spec, plan, tasks, review, and validation evidence.');
  } else if (signals.impact_confidence === 'low') {
    profile = signals.can_scout_impact ? 'compact' : 'research';
    reasons.push(signals.can_scout_impact ? 'Impact confidence is low but can be bounded by scout evidence, so direct is not allowed.' : 'Impact cannot be estimated safely, so research is required.');
  } else if (signals.acceptance_clarity === 'low' || signals.validation_clarity === 'unclear') {
    profile = signals.external_unknown ? 'research' : 'compact';
    reasons.push('Acceptance or validation signals are insufficient for direct execution.');
  } else if (matchesDirectWhitelist(signals, hardGateHits)) {
    profile = 'direct';
    reasons.push('All direct whitelist conditions hold: clear intent, clear acceptance, high impact confidence, no risk tags, reversible change, and cheap local validation.');
  } else if (isBoundedCompactChange(signals)) {
    profile = 'compact';
    reasons.push('Change is bounded but needs lightweight task boundary or validation context.');
  } else {
    profile = 'full';
    reasons.push('Signals exceed compact boundary or require multi-step SDD evidence.');
  }

  if (hardGateHits.length > 0) {
    reasons.push(`Hard gates hit: ${hardGateHits.join(', ')}.`);
  }
  if (signals.policy_hits.length > 0) {
    reasons.push(`Policy hits require checkpoint attention: ${signals.policy_hits.join(', ')}.`);
  }
  if (signals.permission_required.length > 0) {
    reasons.push(`Permissions require explicit user/Claude Code confirmation: ${signals.permission_required.join(', ')}.`);
  }

  const confidence = estimateLifecycleConfidence(signals, hardGateHits);
  const checkpointRequired = signals.human_checkpoint_required || hardGateHits.includes('database_or_data_loss') || signals.reversibility === 'irreversible' || signals.policy_hits.length > 0 || signals.permission_required.length > 0 || (confidence === 'low' && profile !== 'research');
  const record: LifecycleDecisionRecord = {
    contract: LIFECYCLE_DECISION_CONTRACT,
    version: LIFECYCLE_DECISION_VERSION,
    model_version: 'phase1.0-final',
    input_summary: {
      intent_clarity: signals.intent_clarity,
      acceptance_clarity: signals.acceptance_clarity,
      estimated_change_size: signals.estimated_change_size,
      task_count_estimate: signals.task_count_estimate,
      file_count_estimate: signals.file_count_estimate,
      impact_surface: signals.affected_layers,
      affected_contracts: signals.affected_contracts,
      dependency_fanout: signals.dependency_fanout,
      impact_confidence: signals.impact_confidence,
      risk_tags: signals.risk_tags,
      reversibility: signals.reversibility,
      validation_clarity: signals.validation_clarity,
      validation_available: signals.validation_available,
      validation_cost: signals.validation_cost,
      orchestration_uncertainty: signals.orchestration_uncertainty,
      policy_hits: signals.policy_hits,
      permission_required: signals.permission_required
    },
    decision: {
      profile,
      confidence,
      hard_gate_hits: hardGateHits,
      required_stages: requiredStagesForProfile(profile),
      skipped_stages: skippedStagesForProfile(profile),
      human_checkpoint_required: checkpointRequired
    },
    reasons,
    escalation_triggers: escalationTriggers,
    downgrade_reason: null,
    audit: {
      decided_at: decidedAt.toISOString(),
      decided_by: 'command',
      policy_version: 'phase1.0-final',
      source_artifacts: uniqueStrings(['docs/architecture/lifecycle-decision-model.md', ...signals.source_artifacts])
    }
  };

  return {
    record,
    checkpointRequired,
    boundaries: commandIntegrationBoundaries(profile),
    autonomyCeiling: lifecycleAutonomyCeiling(record)
  };
}

export async function recordLifecycleDecision(projectRoot: string, runId: string, record: LifecycleDecisionRecord): Promise<RunState> {
  const state = await readRunState(projectRoot, runId);
  const nextState: RunState = {
    ...state,
    lifecycleDecision: record
  };
  await writeRunState(projectRoot, nextState);
  await appendEvent(projectRoot, runId, {
    event: 'lifecycle_decision_recorded',
    runId,
    summary: `Lifecycle decision recorded by Phase 1.7 command gate: ${record.decision.profile ?? 'unknown'} / ${record.decision.confidence ?? 'unknown'}`,
    data: {
      contract: record.contract,
      modelVersion: record.model_version,
      profile: record.decision.profile,
      confidence: record.decision.confidence,
      hardGateHits: record.decision.hard_gate_hits,
      humanCheckpointRequired: record.decision.human_checkpoint_required
    }
  });
  return readRunState(projectRoot, runId);
}

export function emptyLifecycleDecisionRecord(): LifecycleDecisionRecord {
  return {
    contract: LIFECYCLE_DECISION_CONTRACT,
    version: LIFECYCLE_DECISION_VERSION,
    model_version: 'phase1.0-final',
    input_summary: {},
    decision: {
      profile: null,
      confidence: null,
      hard_gate_hits: [],
      required_stages: [],
      skipped_stages: [],
      human_checkpoint_required: false
    },
    reasons: ['Phase 1.2 records the lifecycle decision contract; Phase 1.7 command gate will populate decision values.'],
    escalation_triggers: [],
    downgrade_reason: null,
    audit: {
      decided_at: null,
      decided_by: null,
      policy_version: 'phase1.0-final',
      source_artifacts: ['docs/architecture/lifecycle-decision-model.md']
    }
  };
}

export function lifecycleAutonomyCeiling(record: LifecycleDecisionRecord): LifecycleAutonomyCeiling {
  const decision = record.decision;
  if (decision.profile === 'research') {
    return 'research_before_implementation';
  }
  if (decision.profile === 'full' || decision.human_checkpoint_required || decision.hard_gate_hits.some((gate) => FULL_PROFILE_HARD_GATES.includes(gate))) {
    return 'full_sdd_with_checkpoint';
  }
  if (decision.profile === 'compact') {
    return 'compact_boundary_only';
  }
  return 'direct_execution_allowed';
}

function normalizeLifecycleSignals(input: Partial<LifecycleDecisionSignals>): LifecycleDecisionSignals {
  return {
    intent_clarity: input.intent_clarity ?? 'medium',
    acceptance_clarity: input.acceptance_clarity ?? 'medium',
    estimated_change_size: input.estimated_change_size ?? 'small',
    task_count_estimate: input.task_count_estimate ?? 1,
    file_count_estimate: input.file_count_estimate ?? 1,
    affected_layers: input.affected_layers ?? [],
    affected_contracts: input.affected_contracts ?? [],
    dependency_fanout: input.dependency_fanout ?? 'local',
    impact_confidence: input.impact_confidence ?? 'medium',
    risk_tags: uniqueStrings(input.risk_tags ?? []),
    reversibility: input.reversibility ?? 'unknown',
    validation_clarity: input.validation_clarity ?? 'partial',
    validation_available: input.validation_available ?? false,
    validation_cost: input.validation_cost ?? 'unknown',
    policy_hits: uniqueStrings(input.policy_hits ?? []),
    permission_required: uniqueStrings(input.permission_required ?? []),
    requires_agents: input.requires_agents ?? false,
    handoff_count: input.handoff_count ?? 0,
    artifact_dependency: input.artifact_dependency ?? false,
    runtime_recovery_need: input.runtime_recovery_need ?? false,
    orchestration_uncertainty: input.orchestration_uncertainty ?? 'medium',
    human_checkpoint_required: input.human_checkpoint_required ?? false,
    approval_reason: input.approval_reason ?? [],
    source_artifacts: input.source_artifacts ?? [],
    can_scout_impact: input.can_scout_impact ?? true,
    architecture_decision_required: input.architecture_decision_required ?? false,
    external_unknown: input.external_unknown ?? false
  };
}

function evaluateLifecycleHardGates(signals: LifecycleDecisionSignals): string[] {
  const hits: string[] = [];
  const riskText = signals.risk_tags.map((tag) => tag.toLowerCase());
  if (signals.external_unknown) {
    hits.push('external_unknown');
  }
  if (signals.architecture_decision_required) {
    hits.push('architecture_decision_required');
  }
  if (containsAny(riskText, ['security', 'auth', 'permission', 'credential', 'data_leak', 'privacy'])) {
    hits.push('security_auth');
  }
  if (containsAny(riskText, ['database', 'migration', 'data_loss', 'irreversible', 'schema-data']) || signals.reversibility === 'irreversible') {
    hits.push('database_or_data_loss');
  }
  if (signals.affected_contracts.length > 0 || containsAny(riskText, ['api', 'schema', 'contract'])) {
    hits.push('api_schema_contract');
  }
  if (containsAny(riskText, ['state_machine', 'state-machine', 'concurrency', 'liveness', 'recovery'])) {
    hits.push('state_machine_concurrency_liveness');
  }
  if (containsAny(riskText, ['ci', 'cd', 'dependency', 'build', 'release', 'publish'])) {
    hits.push('ci_dependency_build_release');
  }
  if (signals.impact_confidence === 'low') {
    hits.push(signals.can_scout_impact ? 'low_impact_confidence_scoutable' : 'low_impact_confidence_unscoutable');
  }
  if (signals.acceptance_clarity === 'low' || signals.validation_clarity === 'unclear') {
    hits.push('unclear_acceptance_or_validation');
  }
  if (signals.policy_hits.length > 0 || signals.permission_required.length > 0) {
    hits.push('policy_or_permission_checkpoint');
  }
  return uniqueStrings(hits);
}

function matchesDirectWhitelist(signals: LifecycleDecisionSignals, hardGateHits: string[]): boolean {
  return signals.intent_clarity === 'high'
    && signals.acceptance_clarity === 'high'
    && signals.validation_clarity === 'clear'
    && signals.validation_available
    && signals.validation_cost === 'cheap'
    && signals.impact_confidence === 'high'
    && signals.risk_tags.length === 0
    && hardGateHits.length === 0
    && signals.reversibility === 'reversible'
    && !signals.requires_agents
    && signals.handoff_count === 0
    && !signals.artifact_dependency
    && !signals.runtime_recovery_need
    && signals.orchestration_uncertainty === 'low'
    && signals.file_count_estimate <= 2
    && signals.task_count_estimate <= 1;
}

function isBoundedCompactChange(signals: LifecycleDecisionSignals): boolean {
  return signals.estimated_change_size !== 'large'
    && signals.task_count_estimate <= 2
    && signals.file_count_estimate <= 5
    && signals.dependency_fanout !== 'multi_component'
    && signals.dependency_fanout !== 'unknown'
    && signals.impact_confidence !== 'low'
    && signals.validation_clarity !== 'unclear'
    && signals.orchestration_uncertainty !== 'high';
}

function estimateLifecycleConfidence(signals: LifecycleDecisionSignals, hardGateHits: string[]): LifecycleConfidence {
  if (signals.intent_clarity === 'low' || signals.impact_confidence === 'low' || signals.orchestration_uncertainty === 'high' || signals.external_unknown || signals.architecture_decision_required) {
    return 'low';
  }
  if (signals.intent_clarity === 'high' && signals.acceptance_clarity === 'high' && signals.impact_confidence === 'high' && signals.validation_clarity === 'clear' && hardGateHits.length === 0) {
    return 'high';
  }
  return 'medium';
}

function requiredStagesForProfile(profile: LifecycleProfile): string[] {
  if (profile === 'direct') {
    return ['intent', 'implement', 'minimal-validation'];
  }
  if (profile === 'compact') {
    return ['intent-or-mini-spec', 'task-boundary', 'implement', 'validation'];
  }
  if (profile === 'full') {
    return ['spec', 'plan', 'tasks', 'do', 'verify', 'sync-back-proposal'];
  }
  return ['research', 'options', 'decision', 'architecture-artifact', 'implementation-spec'];
}

function skippedStagesForProfile(profile: LifecycleProfile): string[] {
  if (profile === 'direct') {
    return ['full-spec', 'full-plan', 'full-tasks', 'agent-workflow'];
  }
  if (profile === 'compact') {
    return ['full-spec', 'full-plan'];
  }
  if (profile === 'full') {
    return ['research'];
  }
  return ['direct-implementation'];
}

function defaultEscalationTriggers(): string[] {
  return [
    'actual impact exceeds initial estimate',
    'API/database/security/state-machine/concurrency/build risk appears',
    'acceptance or validation becomes unclear',
    'validation fails for non-obvious reasons',
    'Spec/Plan/Task/Scope/Validation/Environment gap is detected',
    'required artifact, delegation terminal event, or liveness evidence is missing'
  ];
}

function commandIntegrationBoundaries(profile: LifecycleProfile): string[] {
  const boundaries = [
    'Command gate may decide and record lifecycle profile only.',
    'Command gate must not execute Phase 1.8 task implementation loop.',
    'Command gate must not launch agents or workflows in Phase 1.7.',
    'Phase transition still requires checkpoint confirmation.'
  ];
  if (profile === 'direct' || profile === 'compact') {
    boundaries.push('Short path is allowed only within the recorded lifecycle decision; escalation triggers remain active.');
  }
  return boundaries;
}

function containsAny(values: string[], needles: string[]): boolean {
  return values.some((value) => needles.some((needle) => value.includes(needle)));
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}
