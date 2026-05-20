import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { normalizePortablePath } from '../path-safety.js';
import { toArtifactRootRelativePath } from '../runtime-paths.js';
import type { RunState } from '../run-state/model.js';
import { readArtifact } from '../run-state/artifacts.js';
import { readRunEvents } from '../run-state/events.js';
import { readAllRunStates, readRunState } from '../run-state/run-state.js';
import { resolveWorkflowState } from '../workflow-state/resolve.js';
import { affectedFileConflictsForSelectedRun, type WorkflowAffectedFileConflict } from '../workflow-state/affected-file-conflicts.js';
import { resolveRunStateContext, resolveSddContext } from '../sdd-docs/context.js';
import type { ContextResolverContract } from '../sdd-docs/context.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import type { SddTask, SddTaskGap, SddTaskModel, SddTaskStatus } from '../sdd-docs/task-parser.js';
import { buildTaskRiskProfile } from '../task-risk-profile.js';
import { inspectVerifyContract, type VerifyContractIssue, type VerifyContractStatus } from '../verification/verify-contract.js';
import { evaluateLifecycleRiskDecisionForModel, inspectLifecycleRiskDecisionForModel, type LifecycleRiskConsumerDiagnostic } from '../risk.js';
import { dependencyBlockingReasonsForTask } from '../workflow-state/dependencies.js';

export interface ResolvedTaskRun {
  runId: string;
  state: RunState;
  context: ContextResolverContract;
  model: SddTaskModel;
  task: SddTask | null;
  explicitRunId: boolean;
  staleReasons: string[];
  affectedFileConflicts: WorkflowAffectedFileConflict[];
}

export type SyncBackInspectionStatus = 'ready' | 'blocked' | 'applied';

export interface SyncBackApplyPolicy {
  mode: 'direct' | 'confirm';
  requiresApproval: boolean;
  reasons: string[];
}

export interface SyncBackApprovalCard {
  contract: 'sdd-sync-back-approval-card-v1';
  scope: {
    runId: string;
    branch: string;
    taskId: string | null;
    targetTasksPath: string;
  };
  status: SyncBackInspectionStatus;
  risk: 'low' | 'review' | 'blocked';
  proposal: {
    path: string | null;
    digest: string | null;
    digestValid: boolean | null;
  };
  approval: SyncBackApplyPolicy;
  blockers: string[];
  staleReasons: string[];
  affectedFileConflicts: Array<{
    file: string;
    partition: string;
    taskId: string;
    runId: string;
    runStatus: string;
    syncBackStatus: string;
  }>;
  nextAction: string;
  verifyContractStatus: VerifyContractStatus;
  verifyContractIssues: VerifyContractIssue[];
  staleVerifyRecoveryCommand: string | null;
  lifecycleRisk: LifecycleRiskConsumerDiagnostic;
}

export interface SyncBackInspection {
  runId: string;
  branch: string;
  taskId: string | null;
  status: SyncBackInspectionStatus;
  reasons: string[];
  proposalPath: string | null;
  proposal: string | null;
  proposalDigest: string | null;
  proposalDigestValid: boolean | null;
  runTaskStatus: string | null;
  markdownTask: SddTask | null;
  markdownStatus: SddTaskStatus | null;
  targetTasksPath: string;
  artifacts: string[];
  gaps: SddTaskGap[];
  applyPolicy: SyncBackApplyPolicy;
  approvalCard: SyncBackApprovalCard;
  staleReasons: string[];
  affectedFileConflicts: WorkflowAffectedFileConflict[];
  verifyContractStatus: VerifyContractStatus;
  verifyContractIssues: VerifyContractIssue[];
  staleVerifyRecoveryCommand: string | null;
  lifecycleRisk: LifecycleRiskConsumerDiagnostic;
}

export async function resolveTaskRun(projectRoot: string, options: { runId?: string; branch?: string; taskId: string }): Promise<ResolvedTaskRun> {
  if (options.runId) {
    const state = await readRunState(projectRoot, options.runId);
    const context = options.branch
      ? await resolveSddContext(projectRoot, { branch: options.branch, branchSource: 'cli_option' })
      : await resolveRunStateContext(projectRoot, state);
    const model = await parseSddBranch(projectRoot, context.partition);
    const inspected = inspectSddTask(model, options.taskId);
    if (state.partition && state.partition !== context.partition) {
      throw new Error(`Run ${state.runId} belongs to partition ${state.partition}, not ${context.partition}.`);
    }
    if (state.taskId && state.taskId !== options.taskId) {
      throw new Error(`Run ${state.runId} belongs to task ${state.taskId}, not ${options.taskId}.`);
    }
    return {
      runId: state.runId,
      state,
      context,
      model,
      task: inspected.task,
      explicitRunId: true,
      staleReasons: await runDocumentStaleReasons(projectRoot, state, model),
      affectedFileConflicts: await affectedFileConflictsForRun(projectRoot, state)
    };
  }

  const workflow = await resolveWorkflowState(projectRoot, {
    branch: options.branch,
    branchSource: options.branch ? 'cli_option' : undefined,
    taskId: options.taskId
  });
  const inspected = inspectSddTask(workflow.model, options.taskId);
  const candidate = workflow.latestRunsByTask.find((entry) => entry.taskId === options.taskId);
  if (!candidate || !workflow.latestRunState) {
    throw new Error(`No eligible run found for ${workflow.context.partition}/${options.taskId}. Run sdd do task ${options.taskId} first, or pass --run <run_id>.`);
  }
  return {
    runId: workflow.latestRunState.runId,
    state: workflow.latestRunState,
    context: workflow.context,
    model: workflow.model,
    task: inspected.task,
    explicitRunId: false,
    staleReasons: await runDocumentStaleReasons(projectRoot, workflow.latestRunState, workflow.model),
    affectedFileConflicts: workflow.affectedFileConflicts
  };
}

export async function inspectSyncBack(projectRoot: string, options: { runId?: string; branch?: string; taskId?: string }): Promise<SyncBackInspection> {
  const taskId = options.taskId ?? (options.runId ? await taskIdFromRun(projectRoot, options.runId) : null);
  if (!taskId) {
    throw new Error('Cannot inspect sync-back without a task id. Pass --task <task_id> or use a run with currentTask.');
  }

  const resolved = await resolveTaskRun(projectRoot, { runId: options.runId, branch: options.branch, taskId });
  const branch = resolved.context.partition;
  const state = resolved.state;
  const model = resolved.model;
  const inspected = inspectSddTask(model, taskId);
  const reasons: string[] = [];
  const markdownTask = inspected.task;
  const taskGaps = inspected.gaps;
  if (!inspected.task) {
    reasons.push(`Task ${taskId} is missing or ambiguous in specs/${branch}/tasks.md.`);
  }
  if (markdownTask) {
    reasons.push(...dependencyBlockingReasonsForTask(model, taskId));
  }
  for (const reason of resolved.staleReasons) {
    reasons.push(reason);
  }
  for (const conflict of resolved.affectedFileConflicts) {
    reasons.push(`Affected file ${conflict.file} is active in run ${conflict.runId} for ${conflict.partition}/${conflict.taskId}.`);
  }

  const verifyContract = await inspectVerifyContract(projectRoot, { branch, branchSource: 'cli_option' });
  const blockingVerifyIssues = verifyContract.status === 'PASS' ? [] : verifyContract.issues;
  const staleVerifyRecoveryCommand = verifyContract.status === 'PASS' ? null : `sdd verifies write --branch ${branch} --force && sdd sync-back inspect ${state.runId} --branch ${branch} --task ${taskId}`;
  const proposalPath = state.syncBack.proposalPath;
  const expectedProposalDigest = state.syncBack.proposalDigest ?? null;
  let proposal: string | null = null;
  let proposalDigestValid: boolean | null = null;
  if (!proposalPath) {
    reasons.push('Run has no sync-back proposal.');
  } else {
    try {
      proposal = await readArtifact(projectRoot, state.runId, toArtifactRootRelativePath(proposalPath));
      if (expectedProposalDigest) {
        const actualProposalDigest = hashDocumentContent(proposal);
        proposalDigestValid = actualProposalDigest === expectedProposalDigest;
        if (!proposalDigestValid) {
          reasons.push(`Sync-back proposal ${proposalPath} digest changed from ${expectedProposalDigest} to ${actualProposalDigest}.`);
        }
      }
    } catch (error) {
      reasons.push(`Cannot read sync-back proposal ${proposalPath}: ${messageFromError(error)}`);
    }
  }

  const runtimeGaps = runtimeTaskGaps(state.tasks[taskId]);
  const blockingGaps = [...taskGaps, ...runtimeGaps].filter((gap) => gap.severity === 'blocking');
  if (state.status !== 'completed') {
    reasons.push(`Run status is ${state.status}, expected completed.`);
  }
  if (state.validation.status !== 'pass') {
    reasons.push(`Run validation status is ${state.validation.status}, expected pass.`);
  }
  if (blockingGaps.length > 0) {
    reasons.push(`Sync-back is blocked by ${blockingGaps.length} blocking gap(s).`);
  }
  const lifecycleRisk = await inspectLifecycleRiskDecisionForModel(projectRoot, branch, model);
  reasons.push(...syncBackTaskLifecycleRiskReasons(branch, model, markdownTask));

  let applyPolicy = deriveSyncBackApplyPolicy(state, markdownTask);
  if (state.gitBranch && resolved.context.currentGitBranch && state.gitBranch !== resolved.context.currentGitBranch) {
    applyPolicy = requireSyncBackApproval(applyPolicy, `Current Git branch is ${resolved.context.currentGitBranch}, but run ${state.runId} belongs to ${state.gitBranch}.`);
  }

  const status: SyncBackInspectionStatus = state.syncBack.status === 'applied' ? 'applied' : reasons.length === 0 ? 'ready' : 'blocked';
  const artifacts = state.validation.evidence.length > 0 ? state.validation.evidence : state.artifacts.map((artifact) => artifact.path);
  const gaps = [...taskGaps, ...runtimeGaps];

  return {
    runId: state.runId,
    branch,
    taskId,
    status,
    reasons,
    proposalPath,
    proposal,
    proposalDigest: expectedProposalDigest,
    proposalDigestValid,
    runTaskStatus: runtimeTaskStatus(state.tasks[taskId]),
    markdownTask,
    markdownStatus: markdownTask?.status ?? null,
    targetTasksPath: model.tasksPath,
    artifacts,
    gaps,
    applyPolicy,
    approvalCard: buildSyncBackApprovalCard({
      runId: state.runId,
      branch,
      taskId,
      status,
      reasons,
      proposalPath,
      proposalDigest: expectedProposalDigest,
      proposalDigestValid,
      targetTasksPath: model.tasksPath,
      applyPolicy,
      staleReasons: resolved.staleReasons,
      affectedFileConflicts: resolved.affectedFileConflicts,
      verifyContractStatus: verifyContract.status,
      verifyContractIssues: blockingVerifyIssues,
      staleVerifyRecoveryCommand,
      lifecycleRisk
    }),
    staleReasons: resolved.staleReasons,
    affectedFileConflicts: resolved.affectedFileConflicts,
    verifyContractStatus: verifyContract.status,
    verifyContractIssues: blockingVerifyIssues,
    staleVerifyRecoveryCommand,
    lifecycleRisk
  };
}

function buildSyncBackApprovalCard(input: {
  runId: string;
  branch: string;
  taskId: string | null;
  status: SyncBackInspectionStatus;
  reasons: string[];
  proposalPath: string | null;
  proposalDigest: string | null;
  proposalDigestValid: boolean | null;
  targetTasksPath: string;
  applyPolicy: SyncBackApplyPolicy;
  staleReasons: string[];
  affectedFileConflicts: WorkflowAffectedFileConflict[];
  verifyContractStatus: VerifyContractStatus;
  verifyContractIssues: VerifyContractIssue[];
  staleVerifyRecoveryCommand: string | null;
  lifecycleRisk: LifecycleRiskConsumerDiagnostic;
}): SyncBackApprovalCard {
  return {
    contract: 'sdd-sync-back-approval-card-v1',
    scope: {
      runId: input.runId,
      branch: input.branch,
      taskId: input.taskId,
      targetTasksPath: input.targetTasksPath
    },
    status: input.status,
    risk: syncBackApprovalRisk(input.status, input.applyPolicy),
    proposal: {
      path: input.proposalPath,
      digest: input.proposalDigest,
      digestValid: input.proposalDigestValid
    },
    approval: input.applyPolicy,
    blockers: input.reasons,
    staleReasons: input.staleReasons,
    affectedFileConflicts: input.affectedFileConflicts.map((conflict) => ({
      file: conflict.file,
      partition: conflict.partition,
      taskId: conflict.taskId,
      runId: conflict.runId,
      runStatus: conflict.runStatus,
      syncBackStatus: conflict.syncBackStatus
    })),
    verifyContractStatus: input.verifyContractStatus,
    verifyContractIssues: input.verifyContractIssues,
    staleVerifyRecoveryCommand: input.staleVerifyRecoveryCommand,
    lifecycleRisk: input.lifecycleRisk,
    nextAction: syncBackApprovalNextAction(input.status, input.applyPolicy, input.runId, input.branch, input.taskId, input.staleVerifyRecoveryCommand, input.proposalPath)
  };
}

function syncBackApprovalRisk(status: SyncBackInspectionStatus, applyPolicy: SyncBackApplyPolicy): SyncBackApprovalCard['risk'] {
  if (status === 'blocked') {
    return 'blocked';
  }
  return applyPolicy.requiresApproval ? 'review' : 'low';
}

function syncBackApprovalNextAction(status: SyncBackInspectionStatus, applyPolicy: SyncBackApplyPolicy, runId: string, branch: string, taskId: string | null, staleVerifyRecoveryCommand: string | null, proposalPath: string | null): string {
  if (status === 'applied') {
    return 'sdd status';
  }
  if (status === 'blocked') {
    return staleVerifyRecoveryCommand ?? 'Resolve the listed blockers, rerun the required validation or verify step, then inspect sync-back again.';
  }
  const taskFlag = taskId ? ` --task ${taskId}` : '';
  const approvedFlag = applyPolicy.requiresApproval ? ' --approved' : '';
  const command = `sdd sync-back apply ${runId} --branch ${branch}${taskFlag}${approvedFlag}`;
  return applyPolicy.requiresApproval
    ? `Review ${proposalPath ?? 'the sync-back proposal'} and apply policy, then run ${command}.`
    : `Run ${command}.`;
}

async function taskIdFromRun(projectRoot: string, runId: string): Promise<string | null> {
  const state = await readRunState(projectRoot, runId);
  return state.taskId ?? state.currentTask;
}

export async function runDocumentStaleReasons(projectRoot: string, state: RunState, model: SddTaskModel): Promise<string[]> {
  const reasons: string[] = [];
  const snapshot = state.documentSnapshot;
  if (!snapshot.specHash && !snapshot.planHash && !snapshot.tasksHash) {
    reasons.push('Run has no document snapshot hashes; rerun do task before test or sync-back apply.');
  }
  appendDocumentHashMismatch(reasons, 'spec.md', snapshot.specHash, model.documents.specHash ?? null);
  appendDocumentHashMismatch(reasons, 'plan.md', snapshot.planHash, model.documents.planHash ?? null);
  const tasksHash = model.documents.tasksHash ?? null;
  if (shouldReportDocumentHashMismatch(snapshot.tasksHash, tasksHash)) {
    const suppressTasksMismatch = await isAppliedSyncBackTasksWritebackCurrent(projectRoot, state, model.tasksPath);
    if (!suppressTasksMismatch) {
      appendDocumentHashMismatch(reasons, 'tasks.md', snapshot.tasksHash, tasksHash);
    }
  }
  if (model.documents.planStale) {
    reasons.push('Current plan.md is stale against spec.md.');
  }
  if (model.documents.tasksStale) {
    reasons.push('Current tasks.md is stale against plan.md or spec.md.');
  }
  return reasons;
}

function shouldReportDocumentHashMismatch(expected: string | null, actual: string | null): boolean {
  if (!expected && !actual) {
    return false;
  }
  return !expected || !actual || !documentHashMatches(expected, actual);
}

function appendDocumentHashMismatch(reasons: string[], documentName: string, expected: string | null, actual: string | null): void {
  if (shouldReportDocumentHashMismatch(expected, actual)) {
    reasons.push(`Run snapshot for ${documentName} is ${expected ?? 'missing'}, current hash is ${actual ?? 'missing'}.`);
  }
}

async function isAppliedSyncBackTasksWritebackCurrent(projectRoot: string, state: RunState, tasksPath: string): Promise<boolean> {
  if (state.syncBack.status !== 'applied') {
    return false;
  }
  try {
    const [tasksStat, events] = await Promise.all([stat(tasksPath), readRunEvents(projectRoot, state.runId)]);
    const relativeTasksPath = normalizePortablePath(path.relative(projectRoot, tasksPath));
    const appliedAtMs = Math.max(...events
      .filter((event) => {
        if (event.event !== 'sync_back_applied') {
          return false;
        }
        const eventTasksPath = typeof event.data?.tasksPath === 'string' ? normalizePortablePath(event.data.tasksPath) : null;
        return !eventTasksPath || eventTasksPath === relativeTasksPath;
      })
      .map((event) => Date.parse(event.time))
      .filter((time) => Number.isFinite(time)));
    return Number.isFinite(appliedAtMs) && tasksStat.mtimeMs <= appliedAtMs + 1;
  } catch {
    return false;
  }
}

export async function affectedFileConflictsForRun(projectRoot: string, state: RunState): Promise<WorkflowAffectedFileConflict[]> {
  const states = await readAllRunStates(projectRoot);
  return affectedFileConflictsForSelectedRun(states, state);
}

function syncBackTaskLifecycleRiskReasons(branch: string, model: SddTaskModel, task: SddTask | null): string[] {
  if (!task) {
    return [];
  }

  const decision = evaluateLifecycleRiskDecisionForModel(branch, {
    ...model,
    tasks: [task],
    gaps: model.gaps.filter((gap) => gap.taskId === task.id)
  });

  if (decision.profile === 'blocked' || decision.approvalPolicy === 'blocked') {
    return [`Lifecycle risk blocks sync-back for ${task.id}: ${decision.reasons.join(' ')}`];
  }
  return [];
}

function deriveSyncBackApplyPolicy(state: RunState, task: SddTask | null): SyncBackApplyPolicy {
  const reasons: string[] = [];
  const decision = state.lifecycleDecision?.decision;

  if (!task) {
    reasons.push('Target task is missing, so sync-back apply cannot be classified as direct-safe.');
  }
  if (decision?.human_checkpoint_required === true) {
    reasons.push('Lifecycle decision requires a human checkpoint.');
  }
  if (decision?.profile === 'full' || decision?.profile === 'research') {
    reasons.push(`Lifecycle profile is ${decision.profile}.`);
  }
  if ((decision?.hard_gate_hits.length ?? 0) > 0) {
    reasons.push(`Lifecycle hard gates were hit: ${decision?.hard_gate_hits.join(', ')}.`);
  }
  const profile = buildTaskRiskProfile(task);
  if (profile.approvalRecommendation !== 'direct') {
    reasons.push(`Task risk profile is ${profile.riskLevel}: ${profile.reasons.join(' ')}`);
  }
  if ((task?.dependsOn.length ?? 0) > 0) {
    reasons.push(`Task depends on ${task?.dependsOn.length} other task(s).`);
  }
  if ((task?.affectedFiles.length ?? 0) > 3) {
    reasons.push(`Task affects ${task?.affectedFiles.length} files.`);
  }

  if (reasons.length > 0) {
    return {
      mode: 'confirm',
      requiresApproval: true,
      reasons
    };
  }

  return {
    mode: 'direct',
    requiresApproval: false,
    reasons: ['Task is direct-safe: shared risk profile found no checkpoint, source-boundary, runtime-state, security, external, dependency, or broad file fan-out signal.']
  };
}

function requireSyncBackApproval(policy: SyncBackApplyPolicy, reason: string): SyncBackApplyPolicy {
  return {
    mode: 'confirm',
    requiresApproval: true,
    reasons: policy.reasons.includes(reason) ? policy.reasons : [...policy.reasons, reason]
  };
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function documentHashMatches(expected: string, actual: string): boolean {
  return expected.replace(/^sha256:/, '') === actual;
}

function runtimeTaskStatus(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const status = value.status;
  const verifyStatus = value.verifyStatus;
  if (typeof verifyStatus === 'string') {
    return verifyStatus;
  }
  return typeof status === 'string' ? status : null;
}

function runtimeTaskGaps(value: unknown): SddTaskGap[] {
  if (!isRecord(value) || !Array.isArray(value.gaps)) {
    return [];
  }
  return value.gaps.filter(isTaskGap);
}

function isTaskGap(value: unknown): value is SddTaskGap {
  if (!isRecord(value)) {
    return false;
  }
  return (value.type === 'Task Gap' || value.type === 'Document Gap' || value.type === 'Dependency Gap')
    && (value.severity === 'blocking' || value.severity === 'warning')
    && (typeof value.taskId === 'string' || value.taskId === null)
    && typeof value.field === 'string'
    && typeof value.message === 'string'
    && typeof value.recommendation === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
