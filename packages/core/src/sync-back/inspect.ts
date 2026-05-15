import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { normalizePortablePath } from '../path-safety.js';
import { toArtifactRootRelativePath } from '../runtime-paths.js';
import type { RunState } from '../run-state/model.js';
import { readArtifact } from '../run-state/artifacts.js';
import { readRunEvents } from '../run-state/events.js';
import { readRunState } from '../run-state/run-state.js';
import { rebuildLocalRunIndex } from '../run-state/run-index.js';
import type { LocalRunIndexAffectedFileEntry } from '../run-state/run-index.js';
import { resolveRunStateContext, resolveSddContext } from '../sdd-docs/context.js';
import type { ContextResolverContract } from '../sdd-docs/context.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import type { SddTask, SddTaskGap, SddTaskModel, SddTaskStatus } from '../sdd-docs/task-parser.js';

export interface ResolvedTaskRun {
  runId: string;
  state: RunState;
  context: ContextResolverContract;
  model: SddTaskModel;
  task: SddTask | null;
  explicitRunId: boolean;
  staleReasons: string[];
  affectedFileConflicts: LocalRunIndexAffectedFileEntry[];
}

export interface SyncBackApplyPolicy {
  mode: 'direct' | 'confirm';
  requiresApproval: boolean;
  reasons: string[];
}

export interface SyncBackInspection {
  runId: string;
  branch: string;
  taskId: string | null;
  status: 'ready' | 'blocked' | 'applied';
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
  staleReasons: string[];
  affectedFileConflicts: LocalRunIndexAffectedFileEntry[];
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

  const context = await resolveSddContext(projectRoot, options.branch ? { branch: options.branch, branchSource: 'cli_option' } : {});
  const model = await parseSddBranch(projectRoot, context.partition);
  const inspected = inspectSddTask(model, options.taskId);
  const index = await rebuildLocalRunIndex(projectRoot);
  const candidates = index.latestByPartitionTask.filter((entry) => entry.partition === context.partition && entry.taskId === options.taskId);
  if (candidates.length === 0) {
    throw new Error(`No eligible run found for ${context.partition}/${options.taskId}. Run sdd do task ${options.taskId} first, or pass --run <run_id>.`);
  }
  if (candidates.length > 1) {
    throw new Error(`Ambiguous runs found for ${context.partition}/${options.taskId}: ${candidates.map((candidate) => candidate.runId).join(', ')}. Pass --run <run_id>.`);
  }
  const state = await readRunState(projectRoot, candidates[0].runId);
  return {
    runId: state.runId,
    state,
    context,
    model,
    task: inspected.task,
    explicitRunId: false,
    staleReasons: await runDocumentStaleReasons(projectRoot, state, model),
    affectedFileConflicts: await affectedFileConflictsForRun(projectRoot, state)
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
  for (const reason of resolved.staleReasons) {
    reasons.push(reason);
  }
  for (const conflict of resolved.affectedFileConflicts) {
    reasons.push(`Affected file ${conflict.file} is active in run ${conflict.runId} for ${conflict.partition}/${conflict.taskId}.`);
  }

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

  let applyPolicy = deriveSyncBackApplyPolicy(state, markdownTask);
  if (state.gitBranch && resolved.context.currentGitBranch && state.gitBranch !== resolved.context.currentGitBranch) {
    applyPolicy = requireSyncBackApproval(applyPolicy, `Current Git branch is ${resolved.context.currentGitBranch}, but run ${state.runId} belongs to ${state.gitBranch}.`);
  }

  return {
    runId: state.runId,
    branch,
    taskId,
    status: state.syncBack.status === 'applied' ? 'applied' : reasons.length === 0 ? 'ready' : 'blocked',
    reasons,
    proposalPath,
    proposal,
    proposalDigest: expectedProposalDigest,
    proposalDigestValid,
    runTaskStatus: runtimeTaskStatus(state.tasks[taskId]),
    markdownTask,
    markdownStatus: markdownTask?.status ?? null,
    targetTasksPath: model.tasksPath,
    artifacts: state.validation.evidence.length > 0 ? state.validation.evidence : state.artifacts.map((artifact) => artifact.path),
    gaps: [...taskGaps, ...runtimeGaps],
    applyPolicy,
    staleReasons: resolved.staleReasons,
    affectedFileConflicts: resolved.affectedFileConflicts
  };
}

async function taskIdFromRun(projectRoot: string, runId: string): Promise<string | null> {
  const state = await readRunState(projectRoot, runId);
  return state.taskId ?? state.currentTask;
}

export async function runDocumentStaleReasons(projectRoot: string, state: RunState, model: SddTaskModel): Promise<string[]> {
  const reasons: string[] = [];
  const snapshot = state.documentSnapshot;
  if (!snapshot.specHash && !snapshot.planHash && !snapshot.tasksHash) {
    reasons.push('Run has no document snapshot hashes; rerun do task before verify or sync-back apply.');
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

export async function affectedFileConflictsForRun(projectRoot: string, state: RunState): Promise<LocalRunIndexAffectedFileEntry[]> {
  if (!state.partition || !state.taskId || state.affectedFiles.length === 0) {
    return [];
  }
  const files = new Set(state.affectedFiles);
  const index = await rebuildLocalRunIndex(projectRoot);
  return index.activeByAffectedFile.filter((entry) => entry.runId !== state.runId && files.has(entry.file));
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
  if ((task?.risk.length ?? 0) > 0) {
    reasons.push(`Task declares risk tags: ${task?.risk.join(', ')}.`);
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
    reasons: ['Task is direct-safe: no checkpoint, hard gate, risk tag, dependency, or broad file fan-out was detected.']
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
