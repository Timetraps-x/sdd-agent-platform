import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolveSddContext, type ContextBranchSource, type ContextResolverContract } from '../sdd-docs/context.js';
import { parseSddBranch, type SddTaskGap, type SddTaskModel } from '../sdd-docs/task-parser.js';
import type { RunSummary } from '../run-state/model.js';
import { readRunEvents } from '../run-state/events.js';
import { readRunState } from '../run-state/run-state.js';
import { rebuildLocalRunIndex, type LocalRunIndexAffectedFileEntry, type LocalRunIndexPartitionTaskEntry } from '../run-state/run-index.js';
import { listAgentExecutionRecords, listTeamSessionRecords } from '../execution/agent-execution-records.js';
import { listResidentWorkerRuntimes } from '../execution/resident-worker.js';
import { affectedFileConflictsForRun, runDocumentStaleReasons } from '../sync-back/inspect.js';

const execFileAsync = promisify(execFile);

export interface RunEvidenceSummary {
  agentExecutions: number;
  teamSessions: number;
  artifactIngestions: number;
  workerRuntimes: number;
  staleWorkerRuntimes: number;
  routePreflight: boolean;
  tasksChangedAfterRun: boolean;
  tasksUpdatedAt: string | null;
  runUpdatedAt: string | null;
}

export interface ProjectStatus {
  branch: string;
  workflowStatus: 'active' | 'not_started';
  context: ContextResolverContract;
  gitRoot: string | null;
  documents: SddTaskModel['documents'];
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    blocked: number;
    deferred: number;
    unknown: number;
    gaps: number;
  };
  latestRun: RunSummary | null;
  latestRunsByTask: LocalRunIndexPartitionTaskEntry[];
  latestRunEvidence: RunEvidenceSummary | null;
  latestRunStaleReasons: string[];
  affectedFileConflicts: LocalRunIndexAffectedFileEntry[];
  recommendedNextCommand: string;
  gaps: SddTaskGap[];
}

export async function getProjectStatus(projectRoot: string, options: { branch?: string | null; branchSource?: ContextBranchSource } = {}): Promise<ProjectStatus> {
  const context = await resolveSddContext(projectRoot, options);
  const branch = context.partition;
  const [model, index, gitRoot] = await Promise.all([parseSddBranch(projectRoot, branch), rebuildLocalRunIndex(projectRoot), getGitRoot(projectRoot)]);
  const latestRunsByTask = index.latestByPartitionTask.filter((entry) => entry.partition === branch);
  const latestPartitionRun = [...latestRunsByTask].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
  const latestRun = latestPartitionRun ? index.runs.find((run) => run.runId === latestPartitionRun.runId) ?? null : null;
  const latestRunState = latestRun ? await readRunState(projectRoot, latestRun.runId) : null;
  const latestRunEvidence = latestRun ? await inspectRunEvidenceSummary(projectRoot, latestRun.runId) : null;
  const enrichedLatestRunEvidence = latestRun && latestRunEvidence
    ? await addTaskDocumentStalenessToRunEvidence(model.tasksPath, latestRun, latestRunEvidence)
    : latestRunEvidence;
  const latestRunStaleReasons = latestRunState ? await runDocumentStaleReasons(projectRoot, latestRunState, model) : [];
  const affectedFileConflicts = latestRunState ? await affectedFileConflictsForRun(projectRoot, latestRunState) : [];
  const pendingTask = model.tasks.find((task) => task.status === 'pending');
  const blockingGaps = model.gaps.filter((gap) => gap.severity === 'blocking');
  const workflowStatus = model.documents.specExists || model.documents.planExists || model.documents.tasksExists ? 'active' : 'not_started';
  const visibleGaps = workflowStatus === 'not_started' ? [] : model.gaps;
  return {
    branch,
    workflowStatus,
    context,
    gitRoot,
    documents: model.documents,
    tasks: {
      total: model.tasks.length,
      pending: model.tasks.filter((task) => task.status === 'pending').length,
      inProgress: model.tasks.filter((task) => task.status === 'in_progress').length,
      completed: model.tasks.filter((task) => task.status === 'completed').length,
      blocked: model.tasks.filter((task) => task.status === 'blocked').length,
      deferred: model.tasks.filter((task) => task.status === 'deferred').length,
      unknown: model.tasks.filter((task) => task.status === 'unknown').length,
      gaps: visibleGaps.length
    },
    latestRun,
    latestRunsByTask,
    latestRunEvidence: enrichedLatestRunEvidence,
    latestRunStaleReasons,
    affectedFileConflicts,
    recommendedNextCommand: workflowStatus === 'not_started'
      ? specEntryCommand(context)
      : blockingGaps.length > 0
        ? `sdd tasks gaps --branch ${branch}`
        : latestRun?.syncBackStatus === 'proposed' && latestRun.currentTask
          ? `sdd sync-back inspect --branch ${branch} --task ${latestRun.currentTask}`
          : pendingTask
            ? `sdd tasks inspect ${pendingTask.id} --branch ${branch}`
            : `sdd tasks list --branch ${branch}`,
    gaps: visibleGaps
  };
}

async function inspectRunEvidenceSummary(projectRoot: string, runId: string): Promise<RunEvidenceSummary> {
  const [state, events, agentExecutions, teamSessions, workerRuntimeList] = await Promise.all([
    readRunState(projectRoot, runId),
    readRunEvents(projectRoot, runId),
    listAgentExecutionRecords(projectRoot, runId),
    listTeamSessionRecords(projectRoot, runId),
    listResidentWorkerRuntimes(projectRoot, { runId })
  ]);
  return {
    agentExecutions: agentExecutions.length,
    teamSessions: teamSessions.length,
    artifactIngestions: Object.keys(state.artifactIngestions ?? {}).length,
    workerRuntimes: workerRuntimeList.runtimes.length,
    staleWorkerRuntimes: workerRuntimeList.staleRuntimes,
    routePreflight: events.some((event) => event.event === 'agent_router_preflight'),
    tasksChangedAfterRun: false,
    tasksUpdatedAt: null,
    runUpdatedAt: state.updatedAt ?? null
  };
}

async function addTaskDocumentStalenessToRunEvidence(tasksPath: string, latestRun: RunSummary, evidence: RunEvidenceSummary): Promise<RunEvidenceSummary> {
  try {
    const tasksStat = await stat(tasksPath);
    const runUpdatedAtMs = Date.parse(latestRun.updatedAt);
    if (Number.isNaN(runUpdatedAtMs)) {
      return { ...evidence, runUpdatedAt: latestRun.updatedAt };
    }
    return {
      ...evidence,
      tasksChangedAfterRun: tasksStat.mtimeMs > runUpdatedAtMs,
      tasksUpdatedAt: tasksStat.mtime.toISOString(),
      runUpdatedAt: latestRun.updatedAt
    };
  } catch {
    return { ...evidence, runUpdatedAt: latestRun.updatedAt };
  }
}

function specEntryCommand(context: ContextResolverContract): string {
  return context.branchSource === 'git_branch' ? '/sdd:spec' : `/sdd:spec --branch ${context.rawBranch}`;
}

async function getGitRoot(projectRoot: string): Promise<string | null> {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel']);
    return result.stdout.trim();
  } catch {
    return null;
  }
}
