import type { RuntimeConfidence, RuntimeRef, RuntimeScope, SddStage } from '../contracts.js';
import { CODING_RISK_PROFILE_CONTRACT_VERSION, LIFECYCLE_RISK_DECISION_CONTRACT_VERSION } from '../contracts.js';

export type CodingRiskLevel = 'low' | 'medium' | 'high' | 'blocked';
export type LifecycleRiskProfile = 'direct' | 'compact' | 'full' | 'research' | 'blocked';
export type ApprovalPolicy = 'auto-allow' | 'review-required' | 'human-required' | 'blocked';

export interface CodingRiskSignal {
  id: string;
  dimension: 'source' | 'runtime-state' | 'evidence' | 'security' | 'external' | 'context' | 'performance' | 'workflow';
  level: CodingRiskLevel;
  scope: RuntimeScope;
  confidence: RuntimeConfidence;
  inputRefs: RuntimeRef[];
  reasons: string[];
}

export interface CodingRiskProfile {
  contract: typeof CODING_RISK_PROFILE_CONTRACT_VERSION;
  scope: RuntimeScope;
  level: CodingRiskLevel;
  dimensions: CodingRiskSignal['dimension'][];
  signals: CodingRiskSignal[];
  confidence: RuntimeConfidence;
  reasons: string[];
  generatedAt: string;
}

export interface RequiredEvidence {
  id: string;
  acceptanceRef: string;
  kind: 'command' | 'artifact' | 'review' | 'runtime-projection' | 'manual';
  requiredBefore: 'sync-back' | 'ship' | 'handoff';
  refs: RuntimeRef[];
  reasons: string[];
}

export interface RequiredReview {
  id: string;
  kind: 'source-boundary' | 'runtime-state' | 'security' | 'evidence' | 'release';
  requiredBefore: 'handoff' | 'sync-back' | 'ship';
  reasons: string[];
}

export interface LifecycleRiskDecision {
  contract: typeof LIFECYCLE_RISK_DECISION_CONTRACT_VERSION;
  scope: RuntimeScope;
  profile: LifecycleRiskProfile;
  requiredStages: SddStage[];
  skippedStages: SddStage[];
  blockedStages: SddStage[];
  requiredEvidence: RequiredEvidence[];
  requiredReviews: RequiredReview[];
  humanCheckpointRequired: boolean;
  approvalPolicy: ApprovalPolicy;
  inputRefs: RuntimeRef[];
  signalRefs: RuntimeRef[];
  policyVersion: string;
  inputHash: string;
  confidence: RuntimeConfidence;
  reasons: string[];
  generatedAt: string;
}
