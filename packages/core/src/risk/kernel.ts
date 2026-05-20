import { createHash } from 'node:crypto';

import type { RuntimeProjectionEnvelope } from '../contracts.js';
import { LIFECYCLE_RISK_DECISION_CONTRACT_VERSION } from '../contracts.js';
import type { CodingFactSet } from '../coding-facts.js';
import { readRuntimeProjectionEnvelope, recordRuntimeProjectionEnvelope, type RuntimeProjectionEnvelopeWriteResult } from '../storage/runtime-store.js';
import type { ApprovalPolicy, CodingRiskLevel, CodingRiskProfile, CodingRiskSignal, LifecycleRiskDecision, LifecycleRiskProfile, RequiredEvidence, RequiredReview } from './contracts.js';

export const LIFECYCLE_RISK_POLICY_VERSION = 'phase8-risk-kernel-v1';
export const LIFECYCLE_RISK_DECISION_PROJECTION_TYPE = 'phase8_lifecycle_risk_decision';

export interface LifecycleRiskDecisionInput {
  scope: LifecycleRiskDecision['scope'];
  signals: CodingRiskSignal[];
  factSet?: Pick<CodingFactSet, 'request' | 'documents'>;
  inputRefs?: LifecycleRiskDecision['inputRefs'];
  signalRefs?: LifecycleRiskDecision['signalRefs'];
  inputHash?: string;
  generatedAt?: string;
}

export function evaluateLifecycleRiskDecision(input: LifecycleRiskDecisionInput): LifecycleRiskDecision {
  const signalSummary = summarizeSignals(input.signals);
  const requestBlocked = input.factSet ? !input.factSet.request.intentKnown || !input.factSet.request.acceptanceKnown : false;
  const validationUnknown = input.factSet ? !input.factSet.request.validationKnown : false;
  const blocked = requestBlocked || signalSummary.maxLevel === 'blocked';
  const research = !blocked && (hasDimension(input.signals, 'external') && signalSummary.confidence === 'low' || validationUnknown && signalSummary.hasSourceOrRuntime);
  const full = !blocked && !research && (signalSummary.highRisk || signalSummary.hasSourceOrRuntime || hasDimension(input.signals, 'security'));
  const compact = !blocked && !research && !full && (signalSummary.mediumRisk || hasDimension(input.signals, 'context') || hasDimension(input.signals, 'performance') || hasDimension(input.signals, 'evidence'));
  const profile: LifecycleRiskProfile = blocked ? 'blocked' : research ? 'research' : full ? 'full' : compact ? 'compact' : 'direct';
  const humanCheckpointRequired = blocked || signalSummary.requiresHuman;
  const requiredStages = requiredStagesForProfile(profile);
  const blockedStages = blocked ? allStages() : [];
  const skippedStages = skippedStagesFor(requiredStages, blockedStages);
  const inputRefs = input.inputRefs ?? input.signals.flatMap((signal) => signal.inputRefs);
  const reasons = decisionReasons(input, profile, signalSummary, requestBlocked, validationUnknown);

  return {
    contract: LIFECYCLE_RISK_DECISION_CONTRACT_VERSION,
    scope: input.scope,
    profile,
    requiredStages,
    skippedStages,
    blockedStages,
    requiredEvidence: requiredEvidenceFor(profile, input.signals, inputRefs),
    requiredReviews: requiredReviewsFor(input.signals),
    humanCheckpointRequired,
    approvalPolicy: approvalPolicyFor(profile, humanCheckpointRequired),
    inputRefs,
    signalRefs: input.signalRefs ?? [],
    policyVersion: LIFECYCLE_RISK_POLICY_VERSION,
    inputHash: input.inputHash ?? stableHash(JSON.stringify({ factSet: input.factSet ?? null, signals: input.signals })),
    confidence: blocked ? 'low' : signalSummary.confidence,
    reasons,
    generatedAt: input.generatedAt ?? new Date().toISOString()
  };
}

export function evaluateLifecycleRiskDecisionFromProfile(profile: CodingRiskProfile, factSet?: LifecycleRiskDecisionInput['factSet'], generatedAt?: string): LifecycleRiskDecision {
  return evaluateLifecycleRiskDecision({
    scope: profile.scope,
    signals: profile.signals,
    factSet,
    inputHash: stableHash(JSON.stringify({ profile, factSet: factSet ?? null })),
    generatedAt
  });
}

export function lifecycleRiskDecisionScopeKey(scope: LifecycleRiskDecision['scope']): string {
  return [scope.branch, scope.taskId ?? 'all', scope.runId ?? 'none', scope.changeRef ?? 'none'].join(':');
}

export async function recordLifecycleRiskDecisionProjection(projectRoot: string, decision: LifecycleRiskDecision): Promise<RuntimeProjectionEnvelopeWriteResult<LifecycleRiskDecision>> {
  return recordRuntimeProjectionEnvelope(projectRoot, {
    projectionType: LIFECYCLE_RISK_DECISION_PROJECTION_TYPE,
    scopeKey: lifecycleRiskDecisionScopeKey(decision.scope),
    inputHash: decision.inputHash,
    producer: 'phase8-risk-kernel',
    producerVersion: decision.policyVersion,
    generatedAt: decision.generatedAt,
    payload: decision
  });
}

export async function readLifecycleRiskDecisionProjection(projectRoot: string, scope: LifecycleRiskDecision['scope']): Promise<RuntimeProjectionEnvelope<LifecycleRiskDecision> | null> {
  return readRuntimeProjectionEnvelope(projectRoot, LIFECYCLE_RISK_DECISION_PROJECTION_TYPE, lifecycleRiskDecisionScopeKey(scope));
}

interface SignalSummary {
  maxLevel: CodingRiskLevel;
  confidence: LifecycleRiskDecision['confidence'];
  highRisk: boolean;
  mediumRisk: boolean;
  hasSourceOrRuntime: boolean;
  requiresHuman: boolean;
}

function summarizeSignals(signals: CodingRiskSignal[]): SignalSummary {
  const levels = signals.map((signal) => signal.level);
  const confidences = signals.map((signal) => signal.confidence);
  return {
    maxLevel: maxRiskLevel(levels),
    confidence: confidences.includes('low') ? 'low' : confidences.includes('medium') ? 'medium' : 'high',
    highRisk: levels.includes('high') || levels.includes('blocked'),
    mediumRisk: levels.includes('medium'),
    hasSourceOrRuntime: hasDimension(signals, 'source') || hasDimension(signals, 'runtime-state'),
    requiresHuman: signals.some((signal) => signal.level === 'blocked' || signal.dimension === 'security' && signal.level === 'high' || signal.dimension === 'external' && signal.level === 'high')
  };
}

function maxRiskLevel(levels: CodingRiskLevel[]): CodingRiskLevel {
  if (levels.includes('blocked')) {
    return 'blocked';
  }
  if (levels.includes('high')) {
    return 'high';
  }
  if (levels.includes('medium')) {
    return 'medium';
  }
  return 'low';
}

function hasDimension(signals: CodingRiskSignal[], dimension: CodingRiskSignal['dimension']): boolean {
  return signals.some((signal) => signal.dimension === dimension);
}

function requiredStagesForProfile(profile: LifecycleRiskProfile): LifecycleRiskDecision['requiredStages'] {
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

function skippedStagesFor(requiredStages: LifecycleRiskDecision['requiredStages'], blockedStages: LifecycleRiskDecision['blockedStages']): LifecycleRiskDecision['skippedStages'] {
  if (blockedStages.length > 0) {
    return [];
  }
  return allStages().filter((stage) => !requiredStages.includes(stage));
}

function requiredEvidenceFor(profile: LifecycleRiskProfile, signals: CodingRiskSignal[], refs: LifecycleRiskDecision['inputRefs']): RequiredEvidence[] {
  if (profile === 'blocked' || profile === 'research' || !requiredStagesForProfile(profile).includes('test')) {
    return [];
  }
  const reasons = signals.length > 0 ? signals.flatMap((signal) => signal.reasons) : ['Lifecycle risk decision requires validation evidence.'];
  return [{
    id: 'phase8-risk:command-evidence',
    acceptanceRef: 'phase8-risk-decision',
    kind: 'command',
    requiredBefore: 'sync-back',
    refs,
    reasons: uniqueStrings(reasons)
  }];
}

function requiredReviewsFor(signals: CodingRiskSignal[]): RequiredReview[] {
  return uniqueStrings(signals.map(reviewKindForSignal).filter((kind): kind is RequiredReview['kind'] => Boolean(kind))).map((kind) => ({
    id: `phase8-risk:${kind}-review`,
    kind,
    requiredBefore: kind === 'release' ? 'ship' : 'handoff',
    reasons: [`Phase 8 risk signal requires ${kind} review.`]
  }));
}

function reviewKindForSignal(signal: CodingRiskSignal): RequiredReview['kind'] | null {
  if (signal.dimension === 'source') {
    return 'source-boundary';
  }
  if (signal.dimension === 'runtime-state') {
    return 'runtime-state';
  }
  if (signal.dimension === 'security') {
    return 'security';
  }
  if (signal.dimension === 'evidence') {
    return 'evidence';
  }
  if (signal.dimension === 'workflow' && signal.level === 'high') {
    return 'release';
  }
  return null;
}

function approvalPolicyFor(profile: LifecycleRiskProfile, humanCheckpointRequired: boolean): ApprovalPolicy {
  if (profile === 'blocked') {
    return 'blocked';
  }
  if (humanCheckpointRequired) {
    return 'human-required';
  }
  return profile === 'direct' ? 'auto-allow' : 'review-required';
}

function decisionReasons(input: LifecycleRiskDecisionInput, profile: LifecycleRiskProfile, summary: SignalSummary, requestBlocked: boolean, validationUnknown: boolean): string[] {
  const reasons = input.signals.flatMap((signal) => signal.reasons);
  if (requestBlocked) {
    reasons.unshift('Intent or acceptance target is unknown, so lifecycle risk is blocked.');
  } else if (profile === 'research') {
    reasons.unshift('Impact or validation clarity is insufficient for implementation lifecycle selection.');
  } else if (profile === 'full') {
    reasons.unshift('Source, runtime-state, security, or high-risk signal requires full lifecycle evidence.');
  } else if (profile === 'compact') {
    reasons.unshift('Medium-risk, context, performance, or evidence signal requires compact lifecycle boundary.');
  } else {
    reasons.unshift('No blocking, research, full, or compact risk signal was detected.');
  }
  if (validationUnknown && summary.hasSourceOrRuntime) {
    reasons.push('Validation is unknown for source/runtime impact.');
  }
  return uniqueStrings(reasons);
}

function allStages(): LifecycleRiskDecision['requiredStages'] {
  return ['spec', 'plan', 'tasks', 'verifies', 'do', 'test', 'goal-verify', 'sync-back', 'ship'];
}

function uniqueStrings<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function stableHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
