import { createHash } from 'node:crypto';

import type { RuntimeProjectionEnvelope, RuntimeRef, RuntimeScope, RuntimeProjectionStaleness, SddStage } from '../contracts.js';
import { readRuntimeProjectionEnvelope, recordRuntimeProjectionEnvelope, runtimeProjectionStaleness, listRuntimeProjections, type RuntimeProjectionEnvelopeWriteResult } from '../storage/runtime-store.js';
import type { LifecycleRiskDecision } from '../risk/contracts.js';
import type { StageRun, StageRunStatus, WorkflowHandoff, WorkflowHandoffStatus } from './contracts.js';

export const STAGE_RUNTIME_PRODUCER_VERSION = 'phase8-stage-runtime-v1';
export const STAGE_RUN_PROJECTION_TYPE = 'phase8_stage_run';
export const WORKFLOW_HANDOFF_PROJECTION_TYPE = 'phase8_workflow_handoff';

const STAGE_RUN_TRANSITIONS: Record<StageRunStatus, readonly StageRunStatus[]> = {
  pending: ['active', 'blocked', 'skipped'],
  active: ['completed', 'blocked', 'failed'],
  blocked: ['active', 'skipped', 'failed'],
  completed: [],
  skipped: [],
  failed: []
};

const WORKFLOW_HANDOFF_TRANSITIONS: Record<WorkflowHandoffStatus, readonly WorkflowHandoffStatus[]> = {
  proposed: ['accepted', 'rejected', 'blocked'],
  blocked: ['proposed', 'rejected'],
  accepted: [],
  rejected: []
};

export interface StageRuntimeValidationResult {
  valid: boolean;
  issues: string[];
}

export interface StageRunTransitionResult extends StageRuntimeValidationResult {
  stageRun: StageRun;
}

export interface WorkflowHandoffTransitionResult extends StageRuntimeValidationResult {
  handoff: WorkflowHandoff;
}

export interface WorkflowHandoffValidationInput {
  handoff: WorkflowHandoff;
  sourceStageRun?: StageRun | null;
  lifecycleRiskDecision?: LifecycleRiskDecision | null;
}

export interface WorkflowHandoffValidationResult extends StageRuntimeValidationResult {
  recommendedStatus: WorkflowHandoffStatus;
  considered: {
    sourceStageStatus: StageRunStatus | null;
    lifecycleRiskProfile: LifecycleRiskDecision['profile'] | null;
    lifecycleApprovalPolicy: LifecycleRiskDecision['approvalPolicy'] | null;
    requiredInputRefs: number;
    outputRefs: number;
    evidenceRefs: number;
    openQuestions: number;
    blockingGaps: number;
  };
}

export type WorkflowStageHandoffDiagnosticStatus = 'missing' | 'fresh' | 'stale' | 'blocked' | 'rejected' | 'incompatible';

export interface WorkflowStageHandoffDiagnostic {
  status: WorkflowStageHandoffDiagnosticStatus;
  branch: string;
  activeStage: StageRun | null;
  latestStageRun: StageRun | null;
  latestHandoff: WorkflowHandoff | null;
  latestStageStaleness: RuntimeProjectionStaleness;
  latestHandoffStaleness: RuntimeProjectionStaleness;
  projectionCounts: {
    stageRuns: number;
    handoffs: number;
  };
  reasons: string[];
}

export function canTransitionStageRun(from: StageRunStatus, to: StageRunStatus): boolean {
  return STAGE_RUN_TRANSITIONS[from].includes(to);
}

export function transitionStageRun(stageRun: StageRun, status: StageRunStatus, options: { updatedAt?: string; outputRefs?: RuntimeRef[]; blockingReasons?: string[] } = {}): StageRunTransitionResult {
  if (!canTransitionStageRun(stageRun.status, status)) {
    return {
      valid: false,
      issues: [`Illegal stage transition ${stageRun.status} -> ${status} for ${stageRun.stage}.`],
      stageRun
    };
  }
  const next: StageRun = {
    ...stageRun,
    status,
    outputRefs: options.outputRefs ?? stageRun.outputRefs,
    blockingReasons: options.blockingReasons ?? stageRun.blockingReasons,
    updatedAt: options.updatedAt ?? new Date().toISOString()
  };
  return { valid: true, issues: validateStageRun(next).issues, stageRun: next };
}

export function canTransitionWorkflowHandoff(from: WorkflowHandoffStatus, to: WorkflowHandoffStatus): boolean {
  return WORKFLOW_HANDOFF_TRANSITIONS[from].includes(to);
}

export function transitionWorkflowHandoff(handoff: WorkflowHandoff, status: WorkflowHandoffStatus, options: { decidedAt?: string; blockingGaps?: string[]; openQuestions?: string[] } = {}): WorkflowHandoffTransitionResult {
  if (!canTransitionWorkflowHandoff(handoff.status, status)) {
    return {
      valid: false,
      issues: [`Illegal handoff transition ${handoff.status} -> ${status} for ${handoff.fromStage} -> ${handoff.toStage}.`],
      handoff
    };
  }
  const next: WorkflowHandoff = {
    ...handoff,
    status,
    blockingGaps: options.blockingGaps ?? handoff.blockingGaps,
    openQuestions: options.openQuestions ?? handoff.openQuestions,
    decidedAt: options.decidedAt ?? new Date().toISOString()
  };
  return { valid: true, issues: [], handoff: next };
}

export function validateStageRun(stageRun: StageRun): StageRuntimeValidationResult {
  const issues: string[] = [];
  if (isSubagentRole(stageRun.ownerAgent)) {
    issues.push(`Stage owner ${stageRun.ownerAgent} is a subagent; subagents cannot own lifecycle stages.`);
  }
  if ((stageRun.status === 'blocked' || stageRun.status === 'failed') && stageRun.blockingReasons.length === 0) {
    issues.push(`Stage ${stageRun.stage} is ${stageRun.status} but has no blocking reason.`);
  }
  return { valid: issues.length === 0, issues };
}

export function validateWorkflowHandoff(input: WorkflowHandoffValidationInput): WorkflowHandoffValidationResult {
  const issues: string[] = [];
  const { handoff, sourceStageRun, lifecycleRiskDecision } = input;
  if (!sourceStageRun) {
    issues.push('Handoff source stage run is missing.');
  } else if (sourceStageRun.stage !== handoff.fromStage) {
    issues.push(`Handoff source stage ${handoff.fromStage} does not match stage run ${sourceStageRun.stage}.`);
  } else if (!['completed', 'skipped'].includes(sourceStageRun.status)) {
    issues.push(`Handoff source stage ${handoff.fromStage} is ${sourceStageRun.status}; only completed or skipped stages can hand off control.`);
  }
  if (!lifecycleRiskDecision) {
    issues.push('Lifecycle risk decision is missing for handoff validation.');
  } else if (lifecycleRiskDecision.profile === 'blocked' || lifecycleRiskDecision.approvalPolicy === 'blocked') {
    issues.push('Lifecycle risk decision blocks workflow handoff.');
  }
  if (handoff.requiredInputRefs.length === 0) {
    issues.push('Handoff has no required input refs.');
  }
  if (handoff.outputRefs.length === 0) {
    issues.push('Handoff has no source output refs.');
  }
  if (requiresEvidenceForHandoff(handoff.toStage) && handoff.evidenceRefs.length === 0) {
    issues.push(`Handoff to ${handoff.toStage} has no evidence refs.`);
  }
  if (handoff.openQuestions.length > 0) {
    issues.push(`Handoff has open questions: ${handoff.openQuestions.join(' ')}`);
  }
  if (handoff.blockingGaps.length > 0) {
    issues.push(`Handoff has blocking gaps: ${handoff.blockingGaps.join(' ')}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    recommendedStatus: issues.length === 0 ? 'proposed' : 'blocked',
    considered: {
      sourceStageStatus: sourceStageRun?.status ?? null,
      lifecycleRiskProfile: lifecycleRiskDecision?.profile ?? null,
      lifecycleApprovalPolicy: lifecycleRiskDecision?.approvalPolicy ?? null,
      requiredInputRefs: handoff.requiredInputRefs.length,
      outputRefs: handoff.outputRefs.length,
      evidenceRefs: handoff.evidenceRefs.length,
      openQuestions: handoff.openQuestions.length,
      blockingGaps: handoff.blockingGaps.length
    }
  };
}

export function stageRunScopeKey(scope: RuntimeScope, stage: SddStage): string {
  return [scope.branch, scope.taskId ?? 'all', scope.runId ?? 'none', scope.changeRef ?? 'none', stage].join(':');
}

export function workflowHandoffScopeKey(scope: RuntimeScope, fromStage: SddStage, toStage: SddStage): string {
  return [scope.branch, scope.taskId ?? 'all', scope.runId ?? 'none', scope.changeRef ?? 'none', fromStage, toStage].join(':');
}

export async function recordStageRunProjection(projectRoot: string, stageRun: StageRun): Promise<RuntimeProjectionEnvelopeWriteResult<StageRun>> {
  return recordRuntimeProjectionEnvelope(projectRoot, {
    projectionType: STAGE_RUN_PROJECTION_TYPE,
    scopeKey: stageRunScopeKey(stageRun.scope, stageRun.stage),
    inputHash: stageRunInputHash(stageRun),
    producer: 'phase8-stage-runtime',
    producerVersion: STAGE_RUNTIME_PRODUCER_VERSION,
    generatedAt: stageRun.updatedAt,
    payload: stageRun
  });
}

export async function readStageRunProjection(projectRoot: string, scope: RuntimeScope, stage: SddStage): Promise<RuntimeProjectionEnvelope<StageRun> | null> {
  return readRuntimeProjectionEnvelope(projectRoot, STAGE_RUN_PROJECTION_TYPE, stageRunScopeKey(scope, stage));
}

export async function recordWorkflowHandoffProjection(projectRoot: string, handoff: WorkflowHandoff): Promise<RuntimeProjectionEnvelopeWriteResult<WorkflowHandoff>> {
  return recordRuntimeProjectionEnvelope(projectRoot, {
    projectionType: WORKFLOW_HANDOFF_PROJECTION_TYPE,
    scopeKey: workflowHandoffScopeKey(handoff.scope, handoff.fromStage, handoff.toStage),
    inputHash: workflowHandoffInputHash(handoff),
    producer: 'phase8-stage-runtime',
    producerVersion: STAGE_RUNTIME_PRODUCER_VERSION,
    generatedAt: handoff.decidedAt ?? handoff.createdAt,
    payload: handoff
  });
}

export async function readWorkflowHandoffProjection(projectRoot: string, scope: RuntimeScope, fromStage: SddStage, toStage: SddStage): Promise<RuntimeProjectionEnvelope<WorkflowHandoff> | null> {
  return readRuntimeProjectionEnvelope(projectRoot, WORKFLOW_HANDOFF_PROJECTION_TYPE, workflowHandoffScopeKey(scope, fromStage, toStage));
}

export async function inspectWorkflowStageHandoff(projectRoot: string, branch: string): Promise<WorkflowStageHandoffDiagnostic> {
  const projections = await listRuntimeProjections(projectRoot, [STAGE_RUN_PROJECTION_TYPE, WORKFLOW_HANDOFF_PROJECTION_TYPE]);
  const stageEnvelopes = projections
    .filter((projection) => projection.projectionType === STAGE_RUN_PROJECTION_TYPE)
    .map((projection) => projection.payload as RuntimeProjectionEnvelope<StageRun>)
    .filter((envelope) => envelope?.payload?.scope?.branch === branch);
  const handoffEnvelopes = projections
    .filter((projection) => projection.projectionType === WORKFLOW_HANDOFF_PROJECTION_TYPE)
    .map((projection) => projection.payload as RuntimeProjectionEnvelope<WorkflowHandoff>)
    .filter((envelope) => envelope?.payload?.scope?.branch === branch);
  const latestStageEnvelope = latestEnvelope(stageEnvelopes);
  const latestHandoffEnvelope = latestEnvelope(handoffEnvelopes);
  const activeStage = latestEnvelope(stageEnvelopes.filter((envelope) => envelope.payload.status === 'active'))?.payload ?? null;
  const latestStageStaleness = stageEnvelopeStaleness(latestStageEnvelope);
  const latestHandoffStaleness = handoffEnvelopeStaleness(latestHandoffEnvelope);
  const latestHandoff = latestHandoffEnvelope?.payload ?? null;
  const status: WorkflowStageHandoffDiagnosticStatus = !latestHandoffEnvelope
    ? 'missing'
    : latestStageStaleness === 'incompatible' || latestHandoffStaleness === 'incompatible'
      ? 'incompatible'
      : latestStageStaleness === 'stale' || latestHandoffStaleness === 'stale'
        ? 'stale'
        : latestHandoff?.status === 'blocked'
          ? 'blocked'
          : latestHandoff?.status === 'rejected'
            ? 'rejected'
            : 'fresh';

  return {
    status,
    branch,
    activeStage,
    latestStageRun: latestStageEnvelope?.payload ?? null,
    latestHandoff,
    latestStageStaleness,
    latestHandoffStaleness,
    projectionCounts: {
      stageRuns: stageEnvelopes.length,
      handoffs: handoffEnvelopes.length
    },
    reasons: workflowStageHandoffReasons(status, latestStageEnvelope?.payload ?? null, latestHandoff)
  };
}

function stageEnvelopeStaleness(envelope: RuntimeProjectionEnvelope<StageRun> | null): RuntimeProjectionStaleness {
  return runtimeProjectionStaleness(envelope, {
    inputHash: envelope ? stageRunInputHash(envelope.payload) : 'missing',
    producerVersion: STAGE_RUNTIME_PRODUCER_VERSION
  });
}

function handoffEnvelopeStaleness(envelope: RuntimeProjectionEnvelope<WorkflowHandoff> | null): RuntimeProjectionStaleness {
  return runtimeProjectionStaleness(envelope, {
    inputHash: envelope ? workflowHandoffInputHash(envelope.payload) : 'missing',
    producerVersion: STAGE_RUNTIME_PRODUCER_VERSION
  });
}

function workflowStageHandoffReasons(status: WorkflowStageHandoffDiagnosticStatus, latestStageRun: StageRun | null, latestHandoff: WorkflowHandoff | null): string[] {
  if (status === 'missing') {
    return ['Workflow handoff projection is missing; legacy next-command behavior remains authoritative.'];
  }
  if (status === 'stale') {
    return ['Workflow handoff projection is stale against its current payload.'];
  }
  if (status === 'incompatible') {
    return [`Workflow handoff projection producer is incompatible with ${STAGE_RUNTIME_PRODUCER_VERSION}.`];
  }
  if (status === 'blocked') {
    return [`Workflow handoff is blocked: ${latestHandoff?.blockingGaps.join(' ') || latestStageRun?.blockingReasons.join(' ') || 'no blocking detail recorded'}.`];
  }
  if (status === 'rejected') {
    return [`Workflow handoff ${latestHandoff?.fromStage ?? 'unknown'} -> ${latestHandoff?.toStage ?? 'unknown'} was rejected.`];
  }
  return [`Workflow handoff is fresh: ${latestHandoff?.fromStage ?? 'unknown'} -> ${latestHandoff?.toStage ?? 'unknown'} status=${latestHandoff?.status ?? 'none'}.`];
}

function latestEnvelope<TPayload>(envelopes: Array<RuntimeProjectionEnvelope<TPayload>>): RuntimeProjectionEnvelope<TPayload> | null {
  return [...envelopes].sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))[0] ?? null;
}

function stageRunInputHash(stageRun: StageRun): string {
  return stableHash(JSON.stringify({
    contract: stageRun.contract,
    id: stageRun.id,
    scope: stageRun.scope,
    stage: stageRun.stage,
    ownerAgent: stageRun.ownerAgent,
    coMainAgents: stageRun.coMainAgents,
    status: stageRun.status,
    inputRefs: stageRun.inputRefs,
    outputRefs: stageRun.outputRefs,
    decisionRefs: stageRun.decisionRefs,
    blockingReasons: stageRun.blockingReasons,
    createdAt: stageRun.createdAt,
    updatedAt: stageRun.updatedAt
  }));
}

function workflowHandoffInputHash(handoff: WorkflowHandoff): string {
  return stableHash(JSON.stringify({
    contract: handoff.contract,
    id: handoff.id,
    scope: handoff.scope,
    fromStage: handoff.fromStage,
    toStage: handoff.toStage,
    fromAgent: handoff.fromAgent,
    toAgent: handoff.toAgent,
    status: handoff.status,
    outputRefs: handoff.outputRefs,
    requiredInputRefs: handoff.requiredInputRefs,
    riskDecisionRef: handoff.riskDecisionRef,
    evidenceRefs: handoff.evidenceRefs,
    openQuestions: handoff.openQuestions,
    blockingGaps: handoff.blockingGaps,
    createdAt: handoff.createdAt,
    decidedAt: handoff.decidedAt ?? null
  }));
}

function requiresEvidenceForHandoff(toStage: SddStage): boolean {
  return toStage === 'test' || toStage === 'goal-verify' || toStage === 'sync-back' || toStage === 'ship';
}

function isSubagentRole(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized === 'subagent' || normalized.startsWith('subagent:') || normalized.endsWith('-subagent');
}

function stableHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
