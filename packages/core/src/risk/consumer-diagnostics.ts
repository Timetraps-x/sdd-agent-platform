import type { SddTaskModel } from '../sdd-docs/task-parser.js';
import { buildTaskRiskProfile } from '../task-risk-profile.js';
import { readRuntimeProjectionEnvelope, runtimeProjectionStaleness } from '../storage/runtime-store.js';
import type { LifecycleRiskDecision } from './contracts.js';
import { evaluateLifecycleRiskDecision, LIFECYCLE_RISK_DECISION_PROJECTION_TYPE, LIFECYCLE_RISK_POLICY_VERSION, lifecycleRiskDecisionScopeKey } from './kernel.js';
import { taskRiskProfileToCodingRiskSignals } from './legacy-adapters.js';

export type LifecycleRiskDiagnosticStatus = 'missing' | 'fresh' | 'stale' | 'blocked' | 'incompatible';

export interface LifecycleRiskConsumerDiagnostic {
  status: LifecycleRiskDiagnosticStatus;
  scopeKey: string;
  projectionType: typeof LIFECYCLE_RISK_DECISION_PROJECTION_TYPE;
  profile: LifecycleRiskDecision['profile'] | null;
  approvalPolicy: LifecycleRiskDecision['approvalPolicy'] | null;
  inputHash: string | null;
  expectedInputHash: string;
  producerVersion: string | null;
  expectedProducerVersion: typeof LIFECYCLE_RISK_POLICY_VERSION;
  reasons: string[];
}

export async function inspectLifecycleRiskDecisionForModel(projectRoot: string, branch: string, model: SddTaskModel): Promise<LifecycleRiskConsumerDiagnostic> {
  const current = evaluateLifecycleRiskDecisionForModel(branch, model);
  const scopeKey = lifecycleRiskDecisionScopeKey(current.scope);
  const envelope = await readRuntimeProjectionEnvelope<LifecycleRiskDecision>(projectRoot, LIFECYCLE_RISK_DECISION_PROJECTION_TYPE, scopeKey);
  if (!envelope) {
    return {
      status: 'missing',
      scopeKey,
      projectionType: LIFECYCLE_RISK_DECISION_PROJECTION_TYPE,
      profile: null,
      approvalPolicy: null,
      inputHash: null,
      expectedInputHash: current.inputHash,
      producerVersion: null,
      expectedProducerVersion: LIFECYCLE_RISK_POLICY_VERSION,
      reasons: ['Lifecycle risk decision projection is missing; observe/compare consumers keep legacy behavior.']
    };
  }

  const staleness = runtimeProjectionStaleness(envelope, { inputHash: current.inputHash, producerVersion: LIFECYCLE_RISK_POLICY_VERSION });
  const status: LifecycleRiskDiagnosticStatus = staleness === 'incompatible'
    ? 'incompatible'
    : staleness === 'stale'
      ? 'stale'
      : envelope.payload.profile === 'blocked'
        ? 'blocked'
        : 'fresh';
  return {
    status,
    scopeKey,
    projectionType: LIFECYCLE_RISK_DECISION_PROJECTION_TYPE,
    profile: envelope.payload.profile,
    approvalPolicy: envelope.payload.approvalPolicy,
    inputHash: envelope.inputHash,
    expectedInputHash: current.inputHash,
    producerVersion: envelope.producerVersion,
    expectedProducerVersion: LIFECYCLE_RISK_POLICY_VERSION,
    reasons: lifecycleRiskDiagnosticReasons(status, envelope.payload, current.inputHash)
  };
}

export function evaluateLifecycleRiskDecisionForModel(branch: string, model: SddTaskModel): LifecycleRiskDecision {
  const scope = { branch };
  const signals = model.tasks.flatMap((task) => taskRiskProfileToCodingRiskSignals(buildTaskRiskProfile(task), { branch, taskId: task.id }));
  return evaluateLifecycleRiskDecision({
    scope,
    signals,
    factSet: {
      request: {
        intentKnown: model.documents.specExists || model.tasks.length > 0,
        acceptanceKnown: model.gaps.filter((gap) => gap.severity === 'blocking').length === 0,
        validationKnown: model.documents.verifyExists || model.tasks.some((task) => task.validation.length > 0)
      },
      documents: {
        specExists: model.documents.specExists,
        planExists: model.documents.planExists,
        tasksExists: model.documents.tasksExists,
        verifiesExists: model.documents.verifyExists
      }
    }
  });
}

function lifecycleRiskDiagnosticReasons(status: LifecycleRiskDiagnosticStatus, decision: LifecycleRiskDecision, expectedInputHash: string): string[] {
  if (status === 'stale') {
    return [`Lifecycle risk decision input hash ${decision.inputHash} does not match current input hash ${expectedInputHash}.`];
  }
  if (status === 'incompatible') {
    return [`Lifecycle risk decision policy ${decision.policyVersion} is incompatible with expected ${LIFECYCLE_RISK_POLICY_VERSION}.`];
  }
  if (status === 'blocked') {
    return [`Lifecycle risk decision is blocked: ${decision.reasons.join(' ')}`];
  }
  return [`Lifecycle risk decision is fresh: profile=${decision.profile} approval=${decision.approvalPolicy}.`];
}
