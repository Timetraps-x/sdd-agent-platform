import { WORKFLOW_STATE_RESOLVER_CONTRACT_VERSION } from '../contracts.js';
import { recordRuntimeProjection } from '../storage/runtime-store.js';
import type { RunState, RunSummary } from '../run-state/model.js';
import { affectedFileConflictsForSelectedRun, type WorkflowAffectedFileConflict } from './affected-file-conflicts.js';
import { readAllRunStates, summarizeRunState } from '../run-state/run-state.js';
import { resolveSddContext, type ContextBranchSource, type ContextResolverContract } from '../sdd-docs/context.js';
import { parseSddBranch, type SddTaskGap, type SddTaskModel } from '../sdd-docs/task-parser.js';
import { workflowDependencyBlockers, type WorkflowDependencyBlocker } from './dependencies.js';

export interface WorkflowTaskCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  blocked: number;
  deferred: number;
  unknown: number;
  gaps: number;
}

export interface WorkflowLatestTaskRun {
  partition: string;
  gitBranch: string | null;
  taskId: string;
  runId: string;
  runStatus: RunState['status'];
  validationStatus: RunState['validation']['status'];
  syncBackStatus: RunState['syncBack']['status'];
  affectedFiles: string[];
  updatedAt: string;
}


export interface WorkflowStateResolution {
  contract: typeof WORKFLOW_STATE_RESOLVER_CONTRACT_VERSION;
  generatedAt: string;
  branch: string;
  workflowStatus: 'active' | 'not_started';
  context: ContextResolverContract;
  documents: SddTaskModel['documents'];
  model: SddTaskModel;
  taskCounts: WorkflowTaskCounts;
  visibleGaps: SddTaskGap[];
  latestRun: RunSummary | null;
  latestRunState: RunState | null;
  latestRunsByTask: WorkflowLatestTaskRun[];
  affectedFileConflicts: WorkflowAffectedFileConflict[];
  blockingReasons: string[];
  dependencyBlockers: WorkflowDependencyBlocker[];
  recommendedNextCommand: string;
}

export async function resolveWorkflowState(projectRoot: string, options: { branch?: string | null; branchSource?: ContextBranchSource; taskId?: string | null } = {}): Promise<WorkflowStateResolution> {
  const context = await resolveSddContext(projectRoot, options);
  const branch = context.partition;
  const [model, states] = await Promise.all([parseSddBranch(projectRoot, branch), readAllRunStates(projectRoot)]);
  const visibleGaps = workflowIsActive(model) ? model.gaps : [];
  const latestRunsByTask = latestTaskRuns(states, branch);
  const selectedTaskRun = options.taskId
    ? latestRunsByTask.find((entry) => entry.taskId === options.taskId) ?? null
    : latestRunsByTask.slice().sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
  const latestRunState = selectedTaskRun ? states.find((state) => state.runId === selectedTaskRun.runId) ?? null : null;
  const affectedFileConflicts = latestRunState ? affectedFileConflictsForSelectedRun(states, latestRunState) : [];
  const dependencyBlockers = workflowDependencyBlockers(model);
  const blockingReasons = blockingWorkflowReasons(visibleGaps, affectedFileConflicts, dependencyBlockers);
  const resolution: WorkflowStateResolution = {
    contract: WORKFLOW_STATE_RESOLVER_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    branch,
    workflowStatus: workflowIsActive(model) ? 'active' : 'not_started',
    context,
    documents: model.documents,
    model,
    taskCounts: taskCounts(model, visibleGaps),
    visibleGaps,
    latestRun: latestRunState ? summarizeRunState(latestRunState) : null,
    latestRunState,
    latestRunsByTask,
    affectedFileConflicts,
    dependencyBlockers,
    blockingReasons,
    recommendedNextCommand: recommendedNextCommand(context, model, latestRunState, visibleGaps, dependencyBlockers)
  };
  await recordRuntimeProjection(projectRoot, 'workflow_state', branch, projectWorkflowStateProjection(resolution));
  return resolution;
}

function workflowIsActive(model: SddTaskModel): boolean {
  return model.documents.specExists || model.documents.planExists || model.documents.tasksExists;
}

function taskCounts(model: SddTaskModel, gaps: SddTaskGap[]): WorkflowTaskCounts {
  return {
    total: model.tasks.length,
    pending: model.tasks.filter((task) => task.status === 'pending').length,
    inProgress: model.tasks.filter((task) => task.status === 'in_progress').length,
    completed: model.tasks.filter((task) => task.status === 'completed').length,
    blocked: model.tasks.filter((task) => task.status === 'blocked').length,
    deferred: model.tasks.filter((task) => task.status === 'deferred').length,
    unknown: model.tasks.filter((task) => task.status === 'unknown').length,
    gaps: gaps.length
  };
}

function latestTaskRuns(states: RunState[], partition: string): WorkflowLatestTaskRun[] {
  const latest = new Map<string, WorkflowLatestTaskRun>();
  for (const state of states) {
    if (state.status === 'archived' || state.partition !== partition || !state.taskId) {
      continue;
    }
    const entry: WorkflowLatestTaskRun = {
      partition,
      gitBranch: state.gitBranch,
      taskId: state.taskId,
      runId: state.runId,
      runStatus: state.status,
      validationStatus: state.validation.status,
      syncBackStatus: state.syncBack.status,
      affectedFiles: state.affectedFiles,
      updatedAt: state.updatedAt
    };
    const existing = latest.get(entry.taskId);
    if (!existing || Date.parse(entry.updatedAt) > Date.parse(existing.updatedAt) || (entry.updatedAt === existing.updatedAt && entry.runId.localeCompare(existing.runId) > 0)) {
      latest.set(entry.taskId, entry);
    }
  }
  return Array.from(latest.values()).sort((left, right) => left.taskId.localeCompare(right.taskId));
}


function blockingWorkflowReasons(gaps: SddTaskGap[], conflicts: WorkflowAffectedFileConflict[], dependencyBlockers: WorkflowDependencyBlocker[]): string[] {
  const reasons = gaps.filter((gap) => gap.severity === 'blocking').map((gap) => `${gap.field}: ${gap.message}`);
  for (const conflict of conflicts) {
    reasons.push(`Affected file ${conflict.file} is active in run ${conflict.runId} for ${conflict.partition}/${conflict.taskId}.`);
  }
  for (const blocker of dependencyBlockers) {
    reasons.push(blocker.reason);
  }
  return reasons;
}

function recommendedNextCommand(context: ContextResolverContract, model: SddTaskModel, latestRun: RunState | null, gaps: SddTaskGap[], dependencyBlockers: WorkflowDependencyBlocker[]): string {
  if (!workflowIsActive(model)) {
    return context.branchSource === 'git_branch' ? '/sdd:spec' : `/sdd:spec --branch ${context.rawBranch}`;
  }
  if (gaps.some((gap) => gap.severity === 'blocking')) {
    return `sdd tasks gaps --branch ${context.partition}`;
  }
  const dependencyBlocker = dependencyBlockers[0];
  if (dependencyBlocker) {
    return `sdd tasks inspect ${dependencyBlocker.dependencyId} --branch ${context.partition}`;
  }
  if (latestRun?.syncBack.status === 'proposed' && latestRun.currentTask) {
    return `sdd sync-back inspect --branch ${context.partition} --task ${latestRun.currentTask}`;
  }
  const pendingTask = model.tasks.find((task) => task.status === 'pending');
  return pendingTask ? `sdd tasks inspect ${pendingTask.id} --branch ${context.partition}` : `sdd tasks list --branch ${context.partition}`;
}

function projectWorkflowStateProjection(resolution: WorkflowStateResolution): unknown {
  return {
    contract: resolution.contract,
    generatedAt: resolution.generatedAt,
    branch: resolution.branch,
    workflowStatus: resolution.workflowStatus,
    documents: resolution.documents,
    taskCounts: resolution.taskCounts,
    latestRun: resolution.latestRun,
    latestRunsByTask: resolution.latestRunsByTask,
    affectedFileConflicts: resolution.affectedFileConflicts,
    dependencyBlockers: resolution.dependencyBlockers,
    blockingReasons: resolution.blockingReasons,
    recommendedNextCommand: resolution.recommendedNextCommand
  };
}
