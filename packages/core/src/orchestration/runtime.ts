import { STAGE_RUN_CONTRACT_VERSION, SUBAGENT_DISPATCH_CONTRACT_VERSION, SUBAGENT_RESULT_CONTRACT_VERSION, WORKFLOW_HANDOFF_CONTRACT_VERSION, WORK_UNIT_CONTRACT_VERSION, type RuntimeRef, type RuntimeScope, type SddStage } from '../contracts.js';
import { evaluateContextLoadSignal, decideContextOffload, recordContextLoadSignalProjection, recordContextOffloadDecisionProjection } from '../context-offload/runtime.js';
import type { ContextLoadSignal, ContextOffloadDecision } from '../context-offload/contracts.js';
import type { ArtifactResultIngestionRecord } from '../artifacts/ingestion.js';
import { evaluateLifecycleRiskDecisionForModel } from '../risk/consumer-diagnostics.js';
import { lifecycleRiskDecisionScopeKey, recordLifecycleRiskDecisionProjection } from '../risk/kernel.js';
import type { LifecycleRiskDecision } from '../risk/contracts.js';
import type { SddTask, SddTaskModel } from '../sdd-docs/task-parser.js';
import { recordStageRunProjection, recordWorkflowHandoffProjection, validateWorkflowHandoff } from '../stage-runtime/runtime.js';
import type { StageRun, WorkflowHandoff } from '../stage-runtime/contracts.js';
import { listRuntimeProjections } from '../storage/runtime-store.js';
import { recordSubagentDispatchProjection, recordSubagentResultProjection, subagentDispatchBlocksGate, SUBAGENT_DISPATCH_PROJECTION_TYPE, SUBAGENT_RESULT_PROJECTION_TYPE } from '../subagents/runtime.js';
import type { SubagentDispatch, SubagentResult } from '../subagents/contracts.js';
import { recordWorkUnitProjection, workUnitBlocksGate, WORK_UNIT_PROJECTION_TYPE } from '../work-units/runtime.js';
import type { WorkUnit, WorkUnitStatus } from '../work-units/contracts.js';
import type { CompleteExecutionOrchestrationInput, EnsureExecutionOrchestrationInput, EnsureTaskOrchestrationInput, OrchestrationGate, OrchestrationGateTarget } from './contracts.js';

export async function ensureLifecycleRiskDecision(projectRoot: string, model: SddTaskModel, input: { branch: string; task?: SddTask | null; runId?: string }): Promise<LifecycleRiskDecision> {
  const scope = runtimeScope(input.branch, input.task?.id, input.runId);
  const decision = input.task
    ? taskLifecycleRiskDecision(input.branch, input.task, model)
    : evaluateLifecycleRiskDecisionForModel(input.branch, model);
  const scopedDecision: LifecycleRiskDecision = { ...decision, scope };
  await recordLifecycleRiskDecisionProjection(projectRoot, scopedDecision);
  return scopedDecision;
}

export async function ensureTaskOrchestration(projectRoot: string, model: SddTaskModel, task: SddTask | null, input: EnsureTaskOrchestrationInput): Promise<{ riskDecision: LifecycleRiskDecision; stageRun: StageRun; contextLoadSignal: ContextLoadSignal; contextOffloadDecision: ContextOffloadDecision }> {
  await ensureLifecycleRiskDecision(projectRoot, model, { branch: input.branch });
  const riskDecision = await ensureLifecycleRiskDecision(projectRoot, model, { branch: input.branch, task, runId: input.runId });
  const scope = runtimeScope(input.branch, input.taskId, input.runId);
  const now = new Date().toISOString();
  const stage = input.stage ?? 'do';
  const stageRun = buildStageRun(scope, stage, input.agent ?? 'implementer', input.status ?? 'active', riskDecision, input.outputRefs ?? [], now);
  await recordStageRunProjection(projectRoot, stageRun);
  const contextLoadSignal = evaluateContextLoadSignal({
    scope,
    refs: task ? [{ kind: 'task', ref: task.id }] : [],
    fileCount: task?.affectedFiles.length ?? 0,
    dependencyFanout: task?.dependsOn.length ?? 0,
    staleEvidenceRefs: staleDocumentCount(model),
    unknownImpact: task ? task.risk.some((risk) => /unknown|external/i.test(risk)) : true,
    logBytes: task?.risk.some((risk) => /context|token/i.test(risk)) ? 300_000 : 0,
    generatedAt: now
  });
  await recordContextLoadSignalProjection(projectRoot, contextLoadSignal);
  const contextOffloadDecision = decideContextOffload(contextLoadSignal, { dispatchRefs: task ? [{ kind: 'task', ref: task.id }] : [] });
  await recordContextOffloadDecisionProjection(projectRoot, contextOffloadDecision);
  return { riskDecision, stageRun, contextLoadSignal, contextOffloadDecision };
}

export async function ensureExecutionOrchestration(projectRoot: string, model: SddTaskModel, task: SddTask | null, input: EnsureExecutionOrchestrationInput): Promise<{ riskDecision: LifecycleRiskDecision; stageRun: StageRun; workUnit: WorkUnit; dispatch: SubagentDispatch | null; contextLoadSignal: ContextLoadSignal; contextOffloadDecision: ContextOffloadDecision }> {
  const ensured = await ensureTaskOrchestration(projectRoot, model, task, input);
  const scope = runtimeScope(input.branch, input.taskId, input.runId);
  const now = new Date().toISOString();
  const isSubagent = input.workerKind === 'claude_code_subagent';
  const workUnit = buildWorkUnit(scope, ensured.stageRun.id, input.agent ?? 'implementer', isSubagent, input.dispatchBlocking ?? isSubagent, 'running', input.expectedArtifact, now);
  await recordWorkUnitProjection(projectRoot, workUnit);
  const dispatch = isSubagent
    ? buildSubagentDispatch(scope, workUnit, input.agent ?? 'implementer', input.delegationId ?? `${input.taskId}-${input.agent ?? 'implementer'}`, input.dispatchBlocking ?? true, 'running', ensured.contextOffloadDecision, now)
    : null;
  if (dispatch) {
    await recordSubagentDispatchProjection(projectRoot, dispatch);
  }
  return { ...ensured, workUnit, dispatch };
}

export async function completeExecutionOrchestration(projectRoot: string, model: SddTaskModel, task: SddTask | null, input: CompleteExecutionOrchestrationInput): Promise<{ riskDecision: LifecycleRiskDecision; stageRun: StageRun; workUnit: WorkUnit; dispatch: SubagentDispatch | null; result: SubagentResult | null; handoff: WorkflowHandoff }> {
  const scope = runtimeScope(input.branch, input.taskId, input.runId);
  const now = new Date().toISOString();
  const status = input.completed ? 'completed' : 'failed';
  const ensured = await ensureTaskOrchestration(projectRoot, model, task, { ...input, status, outputRefs: input.artifactPath ? [{ kind: 'artifact', ref: input.artifactPath }] : [] });
  const isSubagent = input.workerKind === 'claude_code_subagent';
  const workUnit = buildWorkUnit(scope, ensured.stageRun.id, input.agent ?? 'implementer', isSubagent, input.dispatchBlocking ?? isSubagent, status, input.artifactPath ?? input.expectedArtifact, now);
  await recordWorkUnitProjection(projectRoot, workUnit);
  const dispatch = isSubagent
    ? buildSubagentDispatch(scope, workUnit, input.agent ?? 'implementer', input.delegationId ?? `${input.taskId}-${input.agent ?? 'implementer'}`, input.dispatchBlocking ?? true, input.completed ? 'completed' : 'failed', ensured.contextOffloadDecision, now)
    : null;
  let result: SubagentResult | null = null;
  if (dispatch) {
    await recordSubagentDispatchProjection(projectRoot, dispatch);
    result = buildSubagentResult(dispatch, input, now);
    await recordSubagentResultProjection(projectRoot, result);
  }
  const handoff = buildWorkflowHandoff(scope, ensured.stageRun, ensured.riskDecision, input.agent ?? 'implementer', input.artifactPath, input.completed, now);
  const validation = validateWorkflowHandoff({ handoff, sourceStageRun: ensured.stageRun, lifecycleRiskDecision: ensured.riskDecision });
  await recordWorkflowHandoffProjection(projectRoot, validation.valid ? handoff : { ...handoff, status: 'blocked', blockingGaps: validation.issues, decidedAt: now });
  return { riskDecision: ensured.riskDecision, stageRun: ensured.stageRun, workUnit, dispatch, result, handoff };
}

export async function projectSubagentResultFromBackgroundExecution(projectRoot: string, input: { branch: string; taskId: string; runId: string; agent: string; delegationId: string; ingestion: ArtifactResultIngestionRecord }): Promise<SubagentResult> {
  const scope = runtimeScope(input.branch, input.taskId, input.runId);
  const workUnit = buildWorkUnit(scope, stageRunId(scope, 'do'), input.agent, true, true, input.ingestion.delegationStatus === 'COMPLETED' ? 'completed' : 'failed', input.ingestion.artifactPath, input.ingestion.ingestedAt);
  await recordWorkUnitProjection(projectRoot, workUnit);
  const dispatch = buildSubagentDispatch(scope, workUnit, input.agent, input.delegationId, true, input.ingestion.delegationStatus === 'COMPLETED' ? 'completed' : 'failed', null, input.ingestion.ingestedAt);
  await recordSubagentDispatchProjection(projectRoot, dispatch);
  const result = buildSubagentResult(dispatch, { ...input, artifactPath: input.ingestion.artifactPath, resultStatus: input.ingestion.resultStatus, completed: input.ingestion.delegationStatus === 'COMPLETED' }, input.ingestion.ingestedAt);
  await recordSubagentResultProjection(projectRoot, result);
  return result;
}

export async function inspectOrchestrationGate(projectRoot: string, input: { branch: string; taskId?: string; runId?: string; target?: OrchestrationGateTarget; riskDecision?: LifecycleRiskDecision | null; contextOffloadDecision?: ContextOffloadDecision | null; contextLoadSignal?: ContextLoadSignal | null; stageRun?: StageRun | null; handoff?: WorkflowHandoff | null } ): Promise<OrchestrationGate> {
  const scope = runtimeScope(input.branch, input.taskId, input.runId);
  const target = input.target ?? 'execution';
  const projections = await listRuntimeProjections(projectRoot, [WORK_UNIT_PROJECTION_TYPE, SUBAGENT_DISPATCH_PROJECTION_TYPE, SUBAGENT_RESULT_PROJECTION_TYPE]);
  const workUnits = projections
    .filter((projection) => projection.projectionType === WORK_UNIT_PROJECTION_TYPE)
    .map((projection) => projection.payload as { payload: WorkUnit })
    .map((envelope) => envelope.payload)
    .filter((workUnit) => sameScope(workUnit.scope, scope));
  const dispatches = projections
    .filter((projection) => projection.projectionType === SUBAGENT_DISPATCH_PROJECTION_TYPE)
    .map((projection) => projection.payload as { payload: SubagentDispatch })
    .map((envelope) => envelope.payload)
    .filter((dispatch) => sameScope(dispatch.scope, scope));
  const results = projections
    .filter((projection) => projection.projectionType === SUBAGENT_RESULT_PROJECTION_TYPE)
    .map((projection) => projection.payload as { payload: SubagentResult })
    .map((envelope) => envelope.payload);
  const resultByDispatch = new Map(results.map((result) => [result.dispatchId, result]));
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const riskDecision = input.riskDecision ?? null;
  const contextOffloadDecision = input.contextOffloadDecision ?? null;
  const contextLoadSignal = input.contextLoadSignal ?? null;
  const stageRun = input.stageRun ?? null;
  const handoff = input.handoff ?? null;

  if (!riskDecision && target !== 'route') {
    warnings.push('Lifecycle risk decision is missing from orchestration gate input.');
  }
  if (riskDecision?.approvalPolicy === 'blocked' || riskDecision?.profile === 'blocked') {
    blockingReasons.push(`Lifecycle risk blocks workflow: ${riskDecision.reasons.join(' ')}`);
  } else if (riskDecision?.approvalPolicy === 'human-required' && target !== 'test') {
    blockingReasons.push('Lifecycle risk requires human approval before automated workflow continuation.');
  } else if (riskDecision?.approvalPolicy === 'review-required' && ['sync-back', 'ship'].includes(target)) {
    warnings.push('Lifecycle risk requires review evidence before final workflow closure.');
  }
  if (contextOffloadDecision?.action === 'block-for-curation') {
    blockingReasons.push(...contextOffloadDecision.blockingReasons.map((reason) => `Context curation required: ${reason}`));
  }
  const gateName = gateNameForTarget(target);
  const blockingWorkUnits = workUnits.filter((workUnit) => workUnitBlocksGate(workUnit, gateName));
  const blockingSubagentDispatches = dispatches.filter((dispatch) => subagentDispatchBlocksGate(dispatch, resultByDispatch.get(dispatch.id) ?? null) && dispatch.requiredBefore === gateName);
  blockingReasons.push(...blockingWorkUnits.map((workUnit) => `Work unit ${workUnit.id} blocks ${gateName}: status=${workUnit.status}.`));
  blockingReasons.push(...blockingSubagentDispatches.map((dispatch) => `Subagent dispatch ${dispatch.id} blocks ${dispatch.requiredBefore}: status=${dispatch.status}.`));
  if (['sync-back', 'ship'].includes(target) && handoff && handoff.status !== 'accepted' && handoff.status !== 'proposed') {
    blockingReasons.push(`Workflow handoff ${handoff.fromStage}->${handoff.toStage} is ${handoff.status}.`);
  }
  const status = blockingReasons.length > 0 ? 'BLOCKED' : warnings.length > 0 ? 'WARN' : 'PASS';
  return {
    status,
    target,
    scope,
    blockingReasons: uniqueStrings(blockingReasons),
    warnings: uniqueStrings(warnings),
    nextAction: status === 'BLOCKED' ? 'Resolve orchestration blockers before continuing the workflow.' : status === 'WARN' ? 'Review orchestration warnings before final workflow closure.' : null,
    riskDecision,
    stageRun,
    handoff,
    contextLoadSignal,
    contextOffloadDecision,
    blockingWorkUnits,
    blockingSubagentDispatches,
    subagentResults: results.filter((result) => dispatches.some((dispatch) => dispatch.id === result.dispatchId))
  };
}

export function lifecycleAutonomyCeilingFromDecision(decision: LifecycleRiskDecision): 'direct_execution_allowed' | 'compact_boundary_only' | 'full_sdd_with_checkpoint' | 'research_before_implementation' {
  if (decision.profile === 'direct') {
    return 'direct_execution_allowed';
  }
  if (decision.profile === 'compact') {
    return 'compact_boundary_only';
  }
  if (decision.profile === 'full') {
    return 'full_sdd_with_checkpoint';
  }
  return 'research_before_implementation';
}

function taskLifecycleRiskDecision(branch: string, task: SddTask, model: SddTaskModel): LifecycleRiskDecision {
  return evaluateLifecycleRiskDecisionForModel(branch, { ...model, tasks: [task], gaps: model.gaps.filter((gap) => !gap.taskId || gap.taskId === task.id || gap.severity === 'blocking') });
}

function buildStageRun(scope: RuntimeScope, stage: SddStage, agent: string, status: StageRun['status'], riskDecision: LifecycleRiskDecision, outputRefs: RuntimeRef[], now: string): StageRun {
  return {
    contract: STAGE_RUN_CONTRACT_VERSION,
    id: stageRunId(scope, stage),
    scope,
    stage,
    ownerAgent: agent,
    coMainAgents: [],
    status,
    inputRefs: riskDecision.inputRefs,
    outputRefs,
    decisionRefs: [{ kind: 'projection', ref: `${lifecycleRiskDecisionScopeKey(riskDecision.scope)}` }],
    blockingReasons: status === 'blocked' || status === 'failed' ? riskDecision.reasons : [],
    createdAt: now,
    updatedAt: now
  };
}

function buildWorkflowHandoff(scope: RuntimeScope, stageRun: StageRun, decision: LifecycleRiskDecision, agent: string, artifactPath: string | null, completed: boolean, now: string): WorkflowHandoff {
  const handoff: WorkflowHandoff = {
    contract: WORKFLOW_HANDOFF_CONTRACT_VERSION,
    id: `${stageRun.id}:handoff:test`,
    scope,
    fromStage: stageRun.stage,
    toStage: nextStage(stageRun.stage),
    fromAgent: agent,
    toAgent: 'validator',
    status: completed ? 'proposed' : 'blocked',
    outputRefs: artifactPath ? [{ kind: 'artifact', ref: artifactPath }] : [],
    requiredInputRefs: decision.inputRefs.length > 0 ? decision.inputRefs : [{ kind: 'task', ref: scope.taskId ?? 'unknown' }],
    riskDecisionRef: { kind: 'projection', ref: `${lifecycleRiskDecisionScopeKey(decision.scope)}` },
    evidenceRefs: artifactPath ? [{ kind: 'artifact', ref: artifactPath }] : [],
    openQuestions: [],
    blockingGaps: completed ? [] : ['Execution did not complete successfully.'],
    createdAt: now,
    decidedAt: now
  };
  return handoff;
}

function buildWorkUnit(scope: RuntimeScope, stageRunIdValue: string, agent: string, isSubagent: boolean, blocking: boolean, status: WorkUnitStatus, artifactPath: string | null | undefined, now: string): WorkUnit {
  return {
    contract: WORK_UNIT_CONTRACT_VERSION,
    id: workUnitId(scope, agent, isSubagent),
    scope,
    stageRunId: stageRunIdValue,
    type: isSubagent ? 'subagent' : 'main-agent',
    name: agent,
    purpose: isSubagent ? 'Non-authoritative background evidence collection.' : 'Lifecycle stage execution.',
    status,
    blocking,
    authority: isSubagent ? 'non-authoritative' : 'stage-owner',
    requiredBefore: blocking ? 'handoff' : 'never',
    contextRef: { kind: 'task', ref: scope.taskId ?? 'unknown' },
    outputRefs: artifactPath ? [{ kind: 'artifact', ref: artifactPath }] : [],
    evidenceRefs: artifactPath ? [{ kind: 'artifact', ref: artifactPath }] : [],
    createdAt: now,
    completedAt: ['completed', 'failed', 'cancelled'].includes(status) ? now : undefined
  };
}

function buildSubagentDispatch(scope: RuntimeScope, workUnit: WorkUnit, agent: string, delegationId: string, blocking: boolean, status: SubagentDispatch['status'], decision: ContextOffloadDecision | null, now: string): SubagentDispatch {
  return {
    contract: SUBAGENT_DISPATCH_CONTRACT_VERSION,
    id: subagentDispatchId(scope, delegationId),
    scope,
    workUnitId: workUnit.id,
    definitionName: agent,
    mode: 'background',
    status,
    blocking,
    requiredBefore: blocking ? 'handoff' : 'never',
    contextRef: decision?.loadSignalRef ?? { kind: 'task', ref: scope.taskId ?? 'unknown' },
    createdAt: now,
    updatedAt: now
  };
}

function buildSubagentResult(dispatch: SubagentDispatch, input: { artifactPath: string | null; resultStatus: string | null; completed: boolean }, now: string): SubagentResult {
  const artifactRefs = input.artifactPath ? [{ kind: 'artifact' as const, ref: input.artifactPath }] : [];
  return {
    contract: SUBAGENT_RESULT_CONTRACT_VERSION,
    dispatchId: dispatch.id,
    status: input.completed ? 'completed' : 'failed',
    authority: 'evidence-candidate',
    summary: `Subagent dispatch ${dispatch.id} finished with result ${input.resultStatus ?? 'unknown'}.`,
    artifactRefs,
    evidenceRefs: artifactRefs,
    modelArtifacts: artifactRefs.length > 0 ? [{
      contract: 'sdd-model-produced-artifact-v1',
      producer: 'subagent',
      authority: 'candidate',
      allowedUse: ['summary', 'diagnostic', 'evidence-candidate'],
      forbiddenUse: ['final-risk-decision', 'stage-completion', 'ship-gate-pass'],
      artifactRefs: artifactRefs.map((ref) => ref.ref),
      reviewedByRuntime: true
    }] : [],
    completedAt: now
  };
}

function runtimeScope(branch: string, taskId?: string, runId?: string): RuntimeScope {
  return { branch, taskId, runId };
}

function stageRunId(scope: RuntimeScope, stage: SddStage): string {
  return `stage:${scope.branch}:${scope.taskId ?? 'all'}:${scope.runId ?? 'none'}:${stage}`;
}

function workUnitId(scope: RuntimeScope, agent: string, isSubagent: boolean): string {
  return `work-unit:${scope.branch}:${scope.taskId ?? 'all'}:${scope.runId ?? 'none'}:${isSubagent ? 'subagent' : 'main'}:${agent}`;
}

function subagentDispatchId(scope: RuntimeScope, delegationId: string): string {
  return `dispatch:${scope.branch}:${scope.taskId ?? 'all'}:${scope.runId ?? 'none'}:${delegationId}`;
}

function nextStage(stage: SddStage): SddStage {
  if (stage === 'do') {
    return 'test';
  }
  if (stage === 'test') {
    return 'goal-verify';
  }
  if (stage === 'goal-verify') {
    return 'sync-back';
  }
  if (stage === 'sync-back') {
    return 'ship';
  }
  return 'do';
}

function gateNameForTarget(target: OrchestrationGateTarget): WorkUnit['requiredBefore'] {
  if (target === 'ship') {
    return 'ship';
  }
  if (target === 'sync-back' || target === 'test') {
    return 'sync-back';
  }
  if (target === 'execution') {
    return 'stage-output';
  }
  return 'handoff';
}

function sameScope(left: RuntimeScope, right: RuntimeScope): boolean {
  return left.branch === right.branch && (!right.taskId || left.taskId === right.taskId) && (!right.runId || left.runId === right.runId);
}

function staleDocumentCount(model: SddTaskModel): number {
  return [model.documents.planStale, model.documents.tasksStale, model.documents.verifyStale].filter(Boolean).length;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}
