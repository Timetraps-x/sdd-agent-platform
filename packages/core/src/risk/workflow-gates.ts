import type { SddStage } from '../contracts.js';
import { buildTaskRiskProfile, type TaskRiskProfile, type TaskRiskProfileInput } from '../task-risk-profile.js';
import type { ApprovalPolicy, LifecycleRiskDecision, LifecycleRiskProfile } from './contracts.js';

export type LifecycleWorkflowGate =
  | 'direct'
  | 'review-before-sync-back'
  | 'review-before-test'
  | 'approval-before-test'
  | 'research-before-implementation'
  | 'clarify-before-routing'
  | 'verify-contract-blocked';

export interface LifecycleWorkflowGateDecision {
  lifecycleGate: LifecycleWorkflowGate;
  lifecycleProfile: LifecycleRiskProfile | null;
  approvalPolicy: ApprovalPolicy | null;
  requiredStages: SddStage[];
  primaryReason: string;
  nextAction: string;
  blocksRoute: boolean;
  blocksTest: boolean;
}

export function evaluateTaskWorkflowGate(input: {
  task: TaskRiskProfileInput | null;
  taskId: string;
  riskDecision?: LifecycleRiskDecision | null;
  approved?: boolean;
  reviewerCheckpointSatisfied?: boolean;
}): LifecycleWorkflowGateDecision {
  const riskProfile = input.task ? buildTaskRiskProfile(input.task) : null;
  const lifecycleGate = selectLifecycleGate(riskProfile, input.riskDecision ?? null);
  const primaryReason = primaryReasonForGate(lifecycleGate, input.taskId, riskProfile, input.riskDecision ?? null);
  const nextAction = nextActionForGate(lifecycleGate, input.taskId, Boolean(input.approved));
  const blocksRoute = routeBlockedByGate(lifecycleGate, Boolean(input.approved));
  const blocksTest = testBlockedByGate(lifecycleGate, Boolean(input.approved), Boolean(input.reviewerCheckpointSatisfied));

  return {
    lifecycleGate,
    lifecycleProfile: input.riskDecision?.profile ?? null,
    approvalPolicy: input.riskDecision?.approvalPolicy ?? null,
    requiredStages: input.riskDecision?.requiredStages ?? [],
    primaryReason,
    nextAction,
    blocksRoute,
    blocksTest
  };
}

export function verifyContractBlockedGate(taskId: string): LifecycleWorkflowGateDecision {
  return {
    lifecycleGate: 'verify-contract-blocked',
    lifecycleProfile: null,
    approvalPolicy: 'blocked',
    requiredStages: [],
    primaryReason: `verify.md is missing, stale, or invalid, so validation commands cannot run for ${taskId}.`,
    nextAction: `Run sdd instructions verify --json, fix or refresh verify.md for ${taskId}, then rerun sdd test task ${taskId}.`,
    blocksRoute: false,
    blocksTest: true
  };
}

export function testBlockedByGate(gate: LifecycleWorkflowGate, approved = false, reviewerCheckpointSatisfied = false): boolean {
  if (gate === 'approval-before-test' && approved) {
    return false;
  }
  if (gate === 'review-before-test' && reviewerCheckpointSatisfied) {
    return false;
  }
  return ['review-before-test', 'approval-before-test', 'research-before-implementation', 'clarify-before-routing', 'verify-contract-blocked'].includes(gate);
}

export function gateRequiresSyncBackReview(gate: LifecycleWorkflowGate): boolean {
  return gate !== 'direct';
}

function selectLifecycleGate(riskProfile: TaskRiskProfile | null, riskDecision: LifecycleRiskDecision | null): LifecycleWorkflowGate {
  const candidates: LifecycleWorkflowGate[] = [];

  if (!riskProfile) {
    candidates.push('clarify-before-routing');
  }
  if (riskDecision?.profile === 'blocked' || riskDecision?.approvalPolicy === 'blocked') {
    candidates.push('clarify-before-routing');
  }
  if (riskDecision?.profile === 'research') {
    candidates.push('research-before-implementation');
  }
  if (riskDecision?.approvalPolicy === 'human-required') {
    candidates.push('approval-before-test');
  }

  if (riskProfile) {
    const tags = new Set(riskProfile.normalizedTags);
    if (tags.has('unknown')) {
      candidates.push('clarify-before-routing');
    }
    if (riskProfile.externalUnknown) {
      candidates.push('research-before-implementation');
    }
    if (riskProfile.securitySensitive || hasAny(tags, ['database', 'data-loss', 'sql', 'token', 'secret', 'token-secret', 'credential', 'credentials'])) {
      candidates.push('approval-before-test');
    }
    if (riskProfile.sourceBoundary || riskProfile.runtimeStateBoundary || hasAny(tags, ['source-boundary', 'platform-runtime', 'api-schema', 'state-machine', 'concurrency', 'ci-build', 'release'])) {
      candidates.push('review-before-test');
    }
    if (tags.has('validation-only') || riskProfile.contextRisk || riskProfile.tokenRisk || riskProfile.performanceRisk) {
      candidates.push('review-before-sync-back');
    }
  }

  return strictestGate(candidates.length > 0 ? candidates : ['direct']);
}

function strictestGate(gates: LifecycleWorkflowGate[]): LifecycleWorkflowGate {
  return [...gates].sort((left, right) => gateRank(left) - gateRank(right))[0];
}

function gateRank(gate: LifecycleWorkflowGate): number {
  switch (gate) {
    case 'verify-contract-blocked':
      return 0;
    case 'clarify-before-routing':
      return 1;
    case 'research-before-implementation':
      return 2;
    case 'approval-before-test':
      return 3;
    case 'review-before-test':
      return 4;
    case 'review-before-sync-back':
      return 5;
    case 'direct':
      return 6;
  }
}

function routeBlockedByGate(gate: LifecycleWorkflowGate, approved: boolean): boolean {
  if (gate === 'clarify-before-routing' || gate === 'research-before-implementation') {
    return true;
  }
  return gate === 'approval-before-test' && !approved;
}

function primaryReasonForGate(gate: LifecycleWorkflowGate, taskId: string, riskProfile: TaskRiskProfile | null, riskDecision: LifecycleRiskDecision | null): string {
  switch (gate) {
    case 'clarify-before-routing':
      return riskDecision?.profile === 'blocked' || riskDecision?.approvalPolicy === 'blocked'
        ? `Task ${taskId} is missing clear intent, acceptance, validation, or routable task data.`
        : `Task ${taskId} contains unknown risk and needs clarification before routing.`;
    case 'research-before-implementation':
      return `Task ${taskId} depends on external or low-confidence impact and needs research before implementation.`;
    case 'approval-before-test':
      return `Task ${taskId} includes security, token/secret, database, data-loss, or similarly high-impact risk that needs human approval before validation.`;
    case 'review-before-test':
      return `Task ${taskId} touches source, runtime state, API/schema, state/concurrency, or CI/build boundaries that need review before validation.`;
    case 'review-before-sync-back':
      return `Task ${taskId} can be validated, but ${reviewBeforeSyncBackReason(riskProfile)} requires review before applying status.`;
    case 'direct':
      return `No high-risk lifecycle gate applies to ${taskId}.`;
    case 'verify-contract-blocked':
      return `verify.md is missing, stale, or invalid, so validation commands cannot run for ${taskId}.`;
  }
}

function reviewBeforeSyncBackReason(riskProfile: TaskRiskProfile | null): string {
  if (riskProfile?.validationOnly) {
    return 'validation/evidence-only work';
  }
  if (riskProfile?.contextRisk || riskProfile?.tokenRisk) {
    return 'context or token-budget risk';
  }
  if (riskProfile?.performanceRisk) {
    return 'performance, latency, or cost risk';
  }
  return 'the lifecycle gate';
}

function nextActionForGate(gate: LifecycleWorkflowGate, taskId: string, approved: boolean): string {
  switch (gate) {
    case 'clarify-before-routing':
      return `Update ${taskId} with clear intent, boundary, acceptance, validation, and impact, then rerun sdd tasks route ${taskId}.`;
    case 'research-before-implementation':
      return `Record research evidence for ${taskId}, document impact and validation, then rerun sdd tasks route ${taskId}.`;
    case 'approval-before-test':
      return approved
        ? `Run or continue validation for ${taskId} with the recorded approval.`
        : `Have a human review the risk, affected files, and validation commands; if accepted, rerun sdd test task ${taskId} --approved.`;
    case 'review-before-test':
      return `Have a reviewer inspect affected files and validation commands for ${taskId}, record the checkpoint, then rerun sdd test task ${taskId}.`;
    case 'review-before-sync-back':
      return `Run validation for ${taskId}, then inspect the sync-back proposal before applying status.`;
    case 'direct':
      return `Run validation for ${taskId}; sync-back can be direct after PASS.`;
    case 'verify-contract-blocked':
      return `Run sdd instructions verify --json, fix or refresh verify.md for ${taskId}, then rerun sdd test task ${taskId}.`;
  }
}

function hasAny(values: Set<string>, candidates: string[]): boolean {
  return candidates.some((candidate) => values.has(candidate));
}
