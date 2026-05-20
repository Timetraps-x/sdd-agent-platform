import { createHash } from 'node:crypto';

import { CONTEXT_LOAD_SIGNAL_CONTRACT_VERSION, CONTEXT_OFFLOAD_DECISION_CONTRACT_VERSION } from '../contracts.js';
import type { RuntimeProjectionEnvelope, RuntimeRef, RuntimeScope } from '../contracts.js';
import { listRuntimeProjections, readRuntimeProjectionEnvelope, recordRuntimeProjectionEnvelope, type RuntimeProjectionEnvelopeWriteResult } from '../storage/runtime-store.js';
import type { ContextLoadLevel, ContextLoadSignal, ContextOffloadDecision } from './contracts.js';

export const CONTEXT_OFFLOAD_RUNTIME_PRODUCER_VERSION = 'phase8-context-offload-runtime-v1';
export const CONTEXT_LOAD_SIGNAL_PROJECTION_TYPE = 'phase8_context_load_signal';
export const CONTEXT_OFFLOAD_DECISION_PROJECTION_TYPE = 'phase8_context_offload_decision';

export interface ContextLoadInput {
  scope: RuntimeScope;
  refs?: RuntimeRef[];
  fileCount?: number;
  artifactBytes?: number;
  dependencyFanout?: number;
  unknownImpact?: boolean;
  staleEvidenceRefs?: number;
  logBytes?: number;
  generatedAt?: string;
}

export interface ContextRuntimeDiagnostic {
  level: ContextLoadLevel | 'unknown';
  action: ContextOffloadDecision['action'] | 'none';
  loadSignals: number;
  offloadDecisions: number;
  dispatchRefs: number;
  blockingReasons: string[];
}

export function evaluateContextLoadSignal(input: ContextLoadInput): ContextLoadSignal {
  const fileCountScore = scoreByThreshold(input.fileCount ?? 0, [8, 20, 40]);
  const artifactSizeScore = scoreByThreshold(input.artifactBytes ?? 0, [50_000, 200_000, 500_000]);
  const dependencyFanoutScore = scoreByThreshold(input.dependencyFanout ?? 0, [5, 12, 25]);
  const unknownImpactScore = input.unknownImpact ? 2 : 0;
  const staleEvidenceScore = scoreByThreshold(input.staleEvidenceRefs ?? 0, [1, 3, 6]);
  const logVolumeScore = scoreByThreshold(input.logBytes ?? 0, [30_000, 120_000, 300_000]);
  const score = fileCountScore + artifactSizeScore + dependencyFanoutScore + unknownImpactScore + staleEvidenceScore + logVolumeScore;
  return {
    contract: CONTEXT_LOAD_SIGNAL_CONTRACT_VERSION,
    scope: input.scope,
    level: contextLevelForScore(score),
    score,
    fileCountScore,
    artifactSizeScore,
    dependencyFanoutScore,
    unknownImpactScore,
    staleEvidenceScore,
    logVolumeScore,
    confidence: input.unknownImpact ? 'medium' : 'high',
    inputRefs: input.refs ?? [],
    reasons: contextLoadReasons(fileCountScore, artifactSizeScore, dependencyFanoutScore, unknownImpactScore, staleEvidenceScore, logVolumeScore),
    generatedAt: input.generatedAt ?? new Date().toISOString()
  };
}

export function decideContextOffload(signal: ContextLoadSignal, refs: { inlineRefs?: RuntimeRef[]; summarizeRefs?: RuntimeRef[]; dispatchRefs?: RuntimeRef[] } = {}): ContextOffloadDecision {
  const action = signal.level === 'overloaded'
    ? 'block-for-curation'
    : signal.level === 'high'
      ? 'dispatch-subagent'
      : signal.level === 'elevated'
        ? 'summarize'
        : 'inline';
  return {
    contract: CONTEXT_OFFLOAD_DECISION_CONTRACT_VERSION,
    scope: signal.scope,
    action,
    loadSignalRef: { kind: 'projection', ref: `${CONTEXT_LOAD_SIGNAL_PROJECTION_TYPE}:${contextLoadSignalScopeKey(signal.scope)}` },
    requiredBefore: action === 'block-for-curation' ? 'stage-output' : action === 'dispatch-subagent' ? 'handoff' : 'never',
    inlineRefs: action === 'inline' ? refs.inlineRefs ?? signal.inputRefs : [],
    summarizeRefs: action === 'summarize' ? refs.summarizeRefs ?? signal.inputRefs : [],
    dispatchRefs: action === 'dispatch-subagent' ? refs.dispatchRefs ?? signal.inputRefs : [],
    blockingReasons: action === 'block-for-curation' ? signal.reasons : [],
    generatedAt: signal.generatedAt
  };
}

export function contextLoadSignalScopeKey(scope: RuntimeScope): string {
  return [scope.branch, scope.taskId ?? 'all', scope.runId ?? 'none', scope.changeRef ?? 'none'].join(':');
}

export async function recordContextLoadSignalProjection(projectRoot: string, signal: ContextLoadSignal): Promise<RuntimeProjectionEnvelopeWriteResult<ContextLoadSignal>> {
  return recordRuntimeProjectionEnvelope(projectRoot, {
    projectionType: CONTEXT_LOAD_SIGNAL_PROJECTION_TYPE,
    scopeKey: contextLoadSignalScopeKey(signal.scope),
    inputHash: stableHash(JSON.stringify(signal)),
    producer: 'phase8-context-offload-runtime',
    producerVersion: CONTEXT_OFFLOAD_RUNTIME_PRODUCER_VERSION,
    generatedAt: signal.generatedAt,
    payload: signal
  });
}

export async function readContextLoadSignalProjection(projectRoot: string, scope: RuntimeScope): Promise<RuntimeProjectionEnvelope<ContextLoadSignal> | null> {
  return readRuntimeProjectionEnvelope(projectRoot, CONTEXT_LOAD_SIGNAL_PROJECTION_TYPE, contextLoadSignalScopeKey(scope));
}

export async function recordContextOffloadDecisionProjection(projectRoot: string, decision: ContextOffloadDecision): Promise<RuntimeProjectionEnvelopeWriteResult<ContextOffloadDecision>> {
  return recordRuntimeProjectionEnvelope(projectRoot, {
    projectionType: CONTEXT_OFFLOAD_DECISION_PROJECTION_TYPE,
    scopeKey: contextLoadSignalScopeKey(decision.scope),
    inputHash: stableHash(JSON.stringify(decision)),
    producer: 'phase8-context-offload-runtime',
    producerVersion: CONTEXT_OFFLOAD_RUNTIME_PRODUCER_VERSION,
    generatedAt: decision.generatedAt,
    payload: decision
  });
}

export async function inspectContextOffloadRuntime(projectRoot: string, branch: string): Promise<ContextRuntimeDiagnostic> {
  const projections = await listRuntimeProjections(projectRoot, [CONTEXT_LOAD_SIGNAL_PROJECTION_TYPE, CONTEXT_OFFLOAD_DECISION_PROJECTION_TYPE]);
  const signalEnvelopes = projections
    .filter((projection) => projection.projectionType === CONTEXT_LOAD_SIGNAL_PROJECTION_TYPE)
    .map((projection) => projection.payload as RuntimeProjectionEnvelope<ContextLoadSignal>)
    .filter((envelope) => envelope?.payload?.scope?.branch === branch);
  const decisionEnvelopes = projections
    .filter((projection) => projection.projectionType === CONTEXT_OFFLOAD_DECISION_PROJECTION_TYPE)
    .map((projection) => projection.payload as RuntimeProjectionEnvelope<ContextOffloadDecision>)
    .filter((envelope) => envelope?.payload?.scope?.branch === branch);
  const latestSignal = latestEnvelope(signalEnvelopes)?.payload ?? null;
  const latestDecision = latestEnvelope(decisionEnvelopes)?.payload ?? null;
  return {
    level: latestSignal?.level ?? 'unknown',
    action: latestDecision?.action ?? 'none',
    loadSignals: signalEnvelopes.length,
    offloadDecisions: decisionEnvelopes.length,
    dispatchRefs: latestDecision?.dispatchRefs.length ?? 0,
    blockingReasons: latestDecision?.blockingReasons ?? []
  };
}

function latestEnvelope<TPayload>(envelopes: Array<RuntimeProjectionEnvelope<TPayload>>): RuntimeProjectionEnvelope<TPayload> | null {
  return [...envelopes].sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))[0] ?? null;
}

function contextLevelForScore(score: number): ContextLoadLevel {
  if (score >= 10) {
    return 'overloaded';
  }
  if (score >= 7) {
    return 'high';
  }
  if (score >= 3) {
    return 'elevated';
  }
  return 'normal';
}

function scoreByThreshold(value: number, thresholds: [number, number, number]): number {
  if (value >= thresholds[2]) {
    return 3;
  }
  if (value >= thresholds[1]) {
    return 2;
  }
  if (value >= thresholds[0]) {
    return 1;
  }
  return 0;
}

function contextLoadReasons(fileCountScore: number, artifactSizeScore: number, dependencyFanoutScore: number, unknownImpactScore: number, staleEvidenceScore: number, logVolumeScore: number): string[] {
  return [
    fileCountScore > 0 ? `file-count score=${fileCountScore}` : null,
    artifactSizeScore > 0 ? `artifact-size score=${artifactSizeScore}` : null,
    dependencyFanoutScore > 0 ? `dependency-fanout score=${dependencyFanoutScore}` : null,
    unknownImpactScore > 0 ? `unknown-impact score=${unknownImpactScore}` : null,
    staleEvidenceScore > 0 ? `stale-evidence score=${staleEvidenceScore}` : null,
    logVolumeScore > 0 ? `log-volume score=${logVolumeScore}` : null
  ].filter((reason): reason is string => reason !== null);
}

function stableHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
