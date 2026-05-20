import { createHash } from 'node:crypto';

import type { RuntimeConfidence, RuntimeRef, RuntimeScope, SddStage } from '../contracts.js';
import { LIFECYCLE_RISK_DECISION_CONTRACT_VERSION } from '../contracts.js';
import type { TaskRiskProfile } from '../task-risk-profile.js';
import type { ApprovalPolicy, CodingRiskLevel, CodingRiskProfile, CodingRiskSignal, LifecycleRiskDecision, LifecycleRiskProfile, RequiredEvidence, RequiredReview } from './contracts.js';

export interface LegacyLifecycleDecisionRecordLike {
  model_version: string;
  input_summary: Record<string, unknown>;
  decision: {
    profile: 'direct' | 'compact' | 'full' | 'research' | null;
    confidence: RuntimeConfidence | null;
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

export interface LegacyLifecycleRiskDecisionOptions {
  inputHash?: string;
  inputRefs?: RuntimeRef[];
  signalRefs?: RuntimeRef[];
  generatedAt?: string;
}

export function taskRiskProfileToCodingRiskSignals(profile: TaskRiskProfile, scope: RuntimeScope): CodingRiskSignal[] {
  const inputRefs = taskRiskInputRefs(profile);
  const signals: CodingRiskSignal[] = [];
  if (profile.sourceBoundary) {
    signals.push(taskRiskSignal(profile, scope, 'source-boundary', 'source', 'high', 'high', inputRefs, ['Legacy task risk touches CLI/core source boundary files.']));
  }
  if (profile.runtimeStateBoundary) {
    signals.push(taskRiskSignal(profile, scope, 'runtime-state', 'runtime-state', 'medium', 'high', inputRefs, ['Legacy task risk touches runtime state, run, or artifact storage paths.']));
  }
  if (profile.docsOnly) {
    signals.push(taskRiskSignal(profile, scope, 'docs-only', 'workflow', 'low', 'high', inputRefs, ['Legacy task risk marks this as documentation or release-document only.']));
  }
  if (profile.validationOnly) {
    signals.push(taskRiskSignal(profile, scope, 'validation-only', 'evidence', 'low', 'high', inputRefs, ['Legacy task risk marks this as validation-only work.']));
  }
  if (profile.securitySensitive) {
    signals.push(taskRiskSignal(profile, scope, 'security-sensitive', 'security', 'high', 'high', inputRefs, ['Legacy task risk marks this as security-sensitive.']));
  }
  if (profile.externalUnknown) {
    signals.push(taskRiskSignal(profile, scope, 'external-unknown', 'external', 'high', 'low', inputRefs, ['Legacy task risk depends on external or unknown behavior.']));
  }
  if (profile.externalKnown) {
    signals.push(taskRiskSignal(profile, scope, 'external-known', 'external', 'medium', 'high', inputRefs, ['Legacy task risk depends on known external or third-party behavior.']));
  }
  if (profile.contextRisk || profile.tokenRisk) {
    const reasons = [
      profile.contextRisk ? 'Legacy task risk contains context-risk signal.' : null,
      profile.tokenRisk ? 'Legacy task risk contains token-risk signal.' : null
    ].filter((item): item is string => Boolean(item));
    signals.push(taskRiskSignal(profile, scope, 'context-token', 'context', 'medium', 'medium', inputRefs, reasons));
  }
  if (profile.performanceRisk) {
    signals.push(taskRiskSignal(profile, scope, 'performance', 'performance', 'medium', 'medium', inputRefs, ['Legacy task risk contains performance, latency, or cost signal.']));
  }
  if (signals.length === 0) {
    signals.push(taskRiskSignal(profile, scope, 'baseline', 'workflow', legacyRiskLevel(profile.riskLevel), 'high', inputRefs, profile.reasons));
  }
  return signals;
}

export function taskRiskProfileToCodingRiskProfile(profile: TaskRiskProfile, scope: RuntimeScope, generatedAt = new Date().toISOString()): CodingRiskProfile {
  const signals = taskRiskProfileToCodingRiskSignals(profile, scope);
  return {
    contract: 'sdd-coding-risk-profile-v1',
    scope,
    level: legacyRiskLevel(profile.riskLevel),
    dimensions: uniqueStrings(signals.map((signal) => signal.dimension)),
    signals,
    confidence: profile.externalUnknown || profile.contextRisk || profile.tokenRisk ? 'medium' : 'high',
    reasons: profile.reasons,
    generatedAt
  };
}

export function legacyLifecycleDecisionToRiskDecision(record: LegacyLifecycleDecisionRecordLike, scope: RuntimeScope, options: LegacyLifecycleRiskDecisionOptions = {}): LifecycleRiskDecision {
  const profile = legacyLifecycleProfile(record.decision.profile);
  const requiredStages = mapLegacyRequiredStages(record.decision.required_stages, profile);
  const skippedStages = mapLegacyStages(record.decision.skipped_stages, profile);
  const hardGateHits = record.decision.hard_gate_hits;
  const inputRefs = options.inputRefs ?? record.audit.source_artifacts.map((ref): RuntimeRef => ({ kind: 'document', ref }));
  return {
    contract: LIFECYCLE_RISK_DECISION_CONTRACT_VERSION,
    scope,
    profile,
    requiredStages,
    skippedStages,
    blockedStages: profile === 'blocked' ? allSddStages() : [],
    requiredEvidence: lifecycleRequiredEvidence(requiredStages, inputRefs, hardGateHits),
    requiredReviews: lifecycleRequiredReviews(hardGateHits),
    humanCheckpointRequired: record.decision.human_checkpoint_required,
    approvalPolicy: lifecycleApprovalPolicy(profile, record.decision.human_checkpoint_required),
    inputRefs,
    signalRefs: options.signalRefs ?? [],
    policyVersion: record.audit.policy_version,
    inputHash: options.inputHash ?? stableHash(JSON.stringify({ input: record.input_summary, decision: record.decision, reasons: record.reasons })),
    confidence: record.decision.confidence ?? 'low',
    reasons: ['Mapped from legacy lifecycle decision for comparison only.', ...record.reasons],
    generatedAt: options.generatedAt ?? record.audit.decided_at ?? new Date().toISOString()
  };
}

function taskRiskSignal(profile: TaskRiskProfile, scope: RuntimeScope, suffix: string, dimension: CodingRiskSignal['dimension'], level: CodingRiskLevel, confidence: RuntimeConfidence, inputRefs: RuntimeRef[], reasons: string[]): CodingRiskSignal {
  return {
    id: `legacy-task-risk:${profile.taskId ?? 'unknown'}:${suffix}`,
    dimension,
    level,
    scope,
    confidence,
    inputRefs,
    reasons
  };
}

function taskRiskInputRefs(profile: TaskRiskProfile): RuntimeRef[] {
  return profile.taskId ? [{ kind: 'task', ref: profile.taskId }] : [];
}

function legacyRiskLevel(level: TaskRiskProfile['riskLevel']): CodingRiskLevel {
  return level;
}

function legacyLifecycleProfile(profile: LegacyLifecycleDecisionRecordLike['decision']['profile']): LifecycleRiskProfile {
  return profile ?? 'blocked';
}

function mapLegacyRequiredStages(stages: string[], profile: LifecycleRiskProfile): SddStage[] {
  const mapped = uniqueStages(stages.map(legacyStageToSddStage).filter((stage): stage is SddStage => Boolean(stage)));
  return uniqueStages([...defaultStagesForProfile(profile), ...mapped]);
}

function mapLegacyStages(stages: string[], profile: LifecycleRiskProfile): SddStage[] {
  const mapped = uniqueStages(stages.map(legacyStageToSddStage).filter((stage): stage is SddStage => Boolean(stage)));
  return mapped.length > 0 ? mapped : defaultStagesForProfile(profile);
}

function legacyStageToSddStage(stage: string): SddStage | null {
  const normalized = stage.trim().toLowerCase().replace(/_/g, '-');
  if (['spec', 'full-spec', 'mini-spec', 'implementation-spec', 'architecture-artifact'].includes(normalized)) {
    return 'spec';
  }
  if (['plan', 'full-plan', 'options', 'decision'].includes(normalized)) {
    return 'plan';
  }
  if (['tasks', 'full-tasks', 'task-boundary'].includes(normalized)) {
    return 'tasks';
  }
  if (['verifies', 'verification-plan'].includes(normalized)) {
    return 'verifies';
  }
  if (['do', 'implement', 'direct-implementation'].includes(normalized)) {
    return 'do';
  }
  if (['test', 'validation', 'minimal-validation'].includes(normalized)) {
    return 'test';
  }
  if (['goal-verify', 'verify', 'acceptance-verify', 'evidence-judgment'].includes(normalized)) {
    return 'goal-verify';
  }
  if (['sync-back', 'sync-back-proposal'].includes(normalized)) {
    return 'sync-back';
  }
  if (normalized === 'ship') {
    return 'ship';
  }
  return null;
}

function defaultStagesForProfile(profile: LifecycleRiskProfile): SddStage[] {
  if (profile === 'direct') {
    return ['do', 'test'];
  }
  if (profile === 'compact') {
    return ['tasks', 'verifies', 'do', 'test', 'goal-verify', 'sync-back'];
  }
  if (profile === 'full') {
    return ['spec', 'plan', 'tasks', 'verifies', 'do', 'test', 'goal-verify', 'sync-back'];
  }
  if (profile === 'research') {
    return ['spec', 'plan', 'verifies'];
  }
  return [];
}

function lifecycleRequiredEvidence(requiredStages: SddStage[], inputRefs: RuntimeRef[], hardGateHits: string[]): RequiredEvidence[] {
  if (!requiredStages.includes('test')) {
    return [];
  }
  return [{
    id: 'legacy-lifecycle:test-evidence',
    acceptanceRef: 'legacy-lifecycle-decision',
    kind: 'command',
    requiredBefore: 'sync-back',
    refs: inputRefs,
    reasons: hardGateHits.length > 0 ? [`Legacy lifecycle hard gates require command evidence: ${hardGateHits.join(', ')}.`] : ['Legacy lifecycle requires validation evidence.']
  }];
}

function lifecycleRequiredReviews(hardGateHits: string[]): RequiredReview[] {
  return uniqueStrings(hardGateHits.map(hardGateReviewKind).filter((kind): kind is RequiredReview['kind'] => Boolean(kind))).map((kind) => ({
    id: `legacy-lifecycle:${kind}-review`,
    kind,
    requiredBefore: 'handoff',
    reasons: [`Legacy lifecycle hard gate requires ${kind} review.`]
  }));
}

function hardGateReviewKind(gate: string): RequiredReview['kind'] | null {
  if (/security|auth|permission/.test(gate)) {
    return 'security';
  }
  if (/database|data|state|concurrency|liveness|runtime/.test(gate)) {
    return 'runtime-state';
  }
  if (/api|schema|contract|source/.test(gate)) {
    return 'source-boundary';
  }
  if (/ci|build|release|publish/.test(gate)) {
    return 'release';
  }
  if (/evidence|validation|policy/.test(gate)) {
    return 'evidence';
  }
  return null;
}

function lifecycleApprovalPolicy(profile: LifecycleRiskProfile, checkpointRequired: boolean): ApprovalPolicy {
  if (profile === 'blocked') {
    return 'blocked';
  }
  if (checkpointRequired) {
    return 'human-required';
  }
  return profile === 'direct' ? 'auto-allow' : 'review-required';
}

function allSddStages(): SddStage[] {
  return ['spec', 'plan', 'tasks', 'verifies', 'do', 'test', 'goal-verify', 'sync-back', 'ship'];
}

function uniqueStages(values: SddStage[]): SddStage[] {
  return Array.from(new Set(values));
}

function uniqueStrings<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function stableHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
