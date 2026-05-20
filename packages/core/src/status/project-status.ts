import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import type { ContextBranchSource, ContextResolverContract } from '../sdd-docs/context.js';
import type { SddTaskGap, SddTaskModel } from '../sdd-docs/task-parser.js';
import type { RunSummary } from '../run-state/model.js';
import { readRunEvents } from '../run-state/events.js';
import { readRunState } from '../run-state/run-state.js';
import { listAgentExecutionRecords, listTeamSessionRecords } from '../execution/agent-execution-records.js';
import { listResidentWorkerRuntimes } from '../execution/resident-worker.js';
import { runDocumentStaleReasons } from '../sync-back/inspect.js';
import { resolveWorkflowState, type WorkflowLatestTaskRun } from '../workflow-state/resolve.js';
import type { WorkflowAffectedFileConflict } from '../workflow-state/affected-file-conflicts.js';
import type { WorkflowDependencyBlocker } from '../workflow-state/dependencies.js';
import { buildTaskRiskProfile } from '../task-risk-profile.js';
import { listRuntimeProjections } from '../storage/runtime-store.js';
import { inspectLifecycleRiskDecisionForModel, type LifecycleRiskConsumerDiagnostic } from '../risk.js';
import { inspectWorkflowStageHandoff, type WorkflowStageHandoffDiagnostic } from '../stage-runtime.js';
import { inspectContextOffloadRuntime, type ContextRuntimeDiagnostic } from '../context-offload.js';
import { inspectSubagentDispatches, type SubagentDispatchDiagnostic } from '../subagents.js';

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

export interface TaskRiskSummary {
  highRiskTasks: string[];
  mediumRiskTasks: string[];
  sourceBoundaryTasks: string[];
  contextRiskTasks: string[];
  tokenRiskTasks: string[];
  performanceRiskTasks: string[];
}

export interface TokenRuntimeProjection {
  health: 'unknown' | 'nominal' | 'pressure';
  estimatedTokens: number | null;
  contextPackages: number;
  teamRuntimeDecisions: number;
  pressureReasons: string[];
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
  taskRisk: TaskRiskSummary;
  latestRun: RunSummary | null;
  latestRunsByTask: WorkflowLatestTaskRun[];
  latestRunEvidence: RunEvidenceSummary | null;
  latestRunStaleReasons: string[];
  affectedFileConflicts: WorkflowAffectedFileConflict[];
  dependencyBlockers: WorkflowDependencyBlocker[];
  recommendedNextCommand: string;
  tokenProjection: TokenRuntimeProjection;
  contextRuntime: ContextRuntimeDiagnostic;
  subagentDispatches: SubagentDispatchDiagnostic;
  lifecycleRisk: LifecycleRiskConsumerDiagnostic;
  workflowHandoff: WorkflowStageHandoffDiagnostic;
  gaps: SddTaskGap[];
}

export interface StatuslineProjection {
  contract: 'sdd-statusline-projection-v1';
  branch: string;
  workflow: ProjectStatus['workflowStatus'];
  taskHealth: 'empty' | 'active' | 'blocked' | 'complete';
  runtimeHealth: 'none' | 'pass' | 'warn' | 'blocked';
  testHealth: 'none' | 'pass' | 'warn' | 'blocked';
  teamHealth: 'none' | 'active';
  tokenHealth: 'unknown' | 'nominal' | 'pressure';
  contextLoad: ProjectStatus['contextRuntime']['level'];
  contextAction: ProjectStatus['contextRuntime']['action'];
  subagentHealth: ProjectStatus['subagentDispatches']['status'];
  evidenceHealth: 'none' | 'pass' | 'warn' | 'blocked';
  latestRunId: string | null;
  counts: {
    tasks: ProjectStatus['tasks'];
    agentExecutions: number;
    teamSessions: number;
    workerRuntimes: number;
    staleWorkerRuntimes: number;
    artifactIngestions: number;
    staleReasons: number;
    affectedFileConflicts: number;
    subagentDispatches: number;
    blockingSubagents: number;
  };
  taskRisk: TaskRiskSummary;
  next: string;
}

export async function getProjectStatus(projectRoot: string, options: { branch?: string | null; branchSource?: ContextBranchSource } = {}): Promise<ProjectStatus> {
  const [workflow, gitRoot] = await Promise.all([resolveWorkflowState(projectRoot, options), getGitRoot(projectRoot)]);
  const latestRun = workflow.latestRun;
  const latestRunState = workflow.latestRunState;
  const latestRunEvidence = latestRun ? await inspectRunEvidenceSummary(projectRoot, latestRun.runId) : null;
  const enrichedLatestRunEvidence = latestRun && latestRunEvidence
    ? await addTaskDocumentStalenessToRunEvidence(workflow.model.tasksPath, latestRun, latestRunEvidence)
    : latestRunEvidence;
  const latestRunStaleReasons = latestRunState ? await runDocumentStaleReasons(projectRoot, latestRunState, workflow.model) : [];
  const taskRisk = summarizeTaskRisk(workflow.model.tasks);
  const tokenProjection = await inspectTokenRuntimeProjection(projectRoot);
  const lifecycleRisk = await inspectLifecycleRiskDecisionForModel(projectRoot, workflow.branch, workflow.model);
  const workflowHandoff = await inspectWorkflowStageHandoff(projectRoot, workflow.branch);
  const contextRuntime = await inspectContextOffloadRuntime(projectRoot, workflow.branch);
  const subagentDispatches = await inspectSubagentDispatches(projectRoot, workflow.branch);

  return {
    branch: workflow.branch,
    workflowStatus: workflow.workflowStatus,
    context: workflow.context,
    gitRoot,
    documents: workflow.documents,
    tasks: workflow.taskCounts,
    taskRisk,
    latestRun,
    latestRunsByTask: workflow.latestRunsByTask,
    latestRunEvidence: enrichedLatestRunEvidence,
    latestRunStaleReasons,
    affectedFileConflicts: workflow.affectedFileConflicts,
    dependencyBlockers: workflow.dependencyBlockers,
    recommendedNextCommand: workflow.recommendedNextCommand,
    tokenProjection,
    contextRuntime,
    subagentDispatches,
    lifecycleRisk,
    workflowHandoff,
    gaps: workflow.visibleGaps
  };
}

export async function getStatuslineProjection(projectRoot: string, options: { branch?: string | null; branchSource?: ContextBranchSource } = {}): Promise<StatuslineProjection> {
  return statuslineProjectionFromStatus(await getProjectStatus(projectRoot, options));
}

export function statuslineProjectionFromStatus(status: ProjectStatus): StatuslineProjection {
  const evidence = status.latestRunEvidence;
  const runtimeHealth = status.latestRun
    ? status.latestRun.status === 'completed' && status.latestRun.validationStatus === 'pass' ? 'pass' : 'blocked'
    : 'none';
  const staleReasons = status.latestRunStaleReasons.length;
  const affectedFileConflicts = status.affectedFileConflicts.length;
  return {
    contract: 'sdd-statusline-projection-v1',
    branch: status.branch,
    workflow: status.workflowStatus,
    taskHealth: taskHealth(status),
    runtimeHealth,
    testHealth: testHealth(status),
    teamHealth: (evidence?.teamSessions ?? 0) > 0 ? 'active' : 'none',
    tokenHealth: status.tokenProjection.health,
    contextLoad: status.contextRuntime.level,
    contextAction: status.contextRuntime.action,
    subagentHealth: status.subagentDispatches.status,
    evidenceHealth: evidenceHealth(status, runtimeHealth),
    latestRunId: status.latestRun?.runId ?? null,
    counts: {
      tasks: status.tasks,
      agentExecutions: evidence?.agentExecutions ?? 0,
      teamSessions: evidence?.teamSessions ?? 0,
      workerRuntimes: evidence?.workerRuntimes ?? 0,
      staleWorkerRuntimes: evidence?.staleWorkerRuntimes ?? 0,
      artifactIngestions: evidence?.artifactIngestions ?? 0,
      staleReasons,
      affectedFileConflicts,
      subagentDispatches: status.subagentDispatches.dispatches,
      blockingSubagents: status.subagentDispatches.blockingOpen
    },
    taskRisk: status.taskRisk,
    next: status.recommendedNextCommand
  };
}

function summarizeTaskRisk(tasks: Array<Parameters<typeof buildTaskRiskProfile>[0]>): TaskRiskSummary {
  const entries = tasks.map((task) => ({ taskId: task?.id ?? null, profile: buildTaskRiskProfile(task) }));
  return {
    highRiskTasks: entries.filter(({ profile }) => profile.riskLevel === 'high').map(({ taskId }) => taskId).filter((taskId): taskId is string => Boolean(taskId)).sort(),
    mediumRiskTasks: entries.filter(({ profile }) => profile.riskLevel === 'medium').map(({ taskId }) => taskId).filter((taskId): taskId is string => Boolean(taskId)).sort(),
    sourceBoundaryTasks: entries.filter(({ profile }) => profile.sourceBoundary).map(({ taskId }) => taskId).filter((taskId): taskId is string => Boolean(taskId)).sort(),
    contextRiskTasks: entries.filter(({ profile }) => profile.contextRisk).map(({ taskId }) => taskId).filter((taskId): taskId is string => Boolean(taskId)).sort(),
    tokenRiskTasks: entries.filter(({ profile }) => profile.tokenRisk).map(({ taskId }) => taskId).filter((taskId): taskId is string => Boolean(taskId)).sort(),
    performanceRiskTasks: entries.filter(({ profile }) => profile.performanceRisk).map(({ taskId }) => taskId).filter((taskId): taskId is string => Boolean(taskId)).sort()
  };
}

function taskHealth(status: ProjectStatus): StatuslineProjection['taskHealth'] {
  if (status.tasks.total === 0) {
    return 'empty';
  }
  if (status.tasks.blocked > 0 || status.gaps.some((gap) => gap.severity === 'blocking') || status.dependencyBlockers.length > 0) {
    return 'blocked';
  }
  if (status.tasks.completed === status.tasks.total) {
    return 'complete';
  }
  return 'active';
}

function testHealth(status: ProjectStatus): StatuslineProjection['testHealth'] {
  if (!status.latestRun) {
    return 'none';
  }
  if (status.latestRun.validationStatus === 'pass') {
    return 'pass';
  }
  if (status.latestRun.validationStatus === 'pass_with_gaps') {
    return 'warn';
  }
  return 'blocked';
}

function evidenceHealth(status: ProjectStatus, runtimeHealth: StatuslineProjection['runtimeHealth']): StatuslineProjection['evidenceHealth'] {
  if (!status.latestRunEvidence) {
    return 'none';
  }
  if (status.latestRunStaleReasons.length > 0 || status.affectedFileConflicts.length > 0 || status.latestRunEvidence.staleWorkerRuntimes > 0) {
    return 'blocked';
  }
  if (runtimeHealth === 'blocked' || status.latestRunEvidence.tasksChangedAfterRun) {
    return 'warn';
  }
  return 'pass';
}

async function inspectTokenRuntimeProjection(projectRoot: string): Promise<TokenRuntimeProjection> {
  const projections = await listRuntimeProjections(projectRoot, ['context_build', 'team_runtime_decision']);
  const contextPackages = projections.filter((projection) => projection.projectionType === 'context_build');
  const teamRuntimeDecisions = projections.filter((projection) => projection.projectionType === 'team_runtime_decision');
  const contextTokenEstimates = contextPackages.map((projection) => tokenEstimateFromContextBuildPayload(projection.payload)).filter((value): value is number => value !== null);
  const teamTokenEstimates = teamRuntimeDecisions.map((projection) => tokenEstimateFromTeamRuntimePayload(projection.payload)).filter((value): value is number => value !== null);
  const estimatedTokens = [...contextTokenEstimates, ...teamTokenEstimates].reduce((total, value) => total + value, 0);
  const pressureReasons = [
    ...contextPackages.map((projection) => contextPressureReason(projection.payload)).filter((value): value is string => value !== null),
    ...teamRuntimeDecisions.map((projection) => teamPressureReason(projection.payload)).filter((value): value is string => value !== null)
  ];

  return {
    health: projections.length === 0 ? 'unknown' : pressureReasons.length > 0 ? 'pressure' : 'nominal',
    estimatedTokens: projections.length === 0 ? null : estimatedTokens,
    contextPackages: contextPackages.length,
    teamRuntimeDecisions: teamRuntimeDecisions.length,
    pressureReasons
  };
}

function tokenEstimateFromContextBuildPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const budget = (payload as { budget?: { estimatedTokens?: unknown } }).budget;
  return typeof budget?.estimatedTokens === 'number' ? budget.estimatedTokens : null;
}

function tokenEstimateFromTeamRuntimePayload(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const decision = payload as { roleIds?: unknown; telemetryPolicy?: { contextBudget?: unknown } | null };
  const roleCount = Array.isArray(decision.roleIds) ? decision.roleIds.length : 0;
  const contextBudget = decision.telemetryPolicy?.contextBudget;
  const perRole = contextBudget === 'medium' ? 3000 : contextBudget === 'small' ? 1200 : 600;
  return roleCount * perRole;
}

function contextPressureReason(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const contextPackage = payload as { taskId?: unknown; profile?: unknown; budget?: { estimatedBytes?: unknown; maxBytes?: unknown } };
  const estimatedBytes = contextPackage.budget?.estimatedBytes;
  const maxBytes = contextPackage.budget?.maxBytes;
  if (contextPackage.profile === 'brief') {
    return null;
  }
  if (typeof estimatedBytes === 'number' && typeof maxBytes === 'number' && estimatedBytes >= maxBytes * 0.85) {
    return `context_budget_pressure:${String(contextPackage.taskId ?? 'unknown')}`;
  }
  return null;
}

function teamPressureReason(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const decision = payload as { command?: unknown; mode?: unknown; roleIds?: unknown };
  const roleCount = Array.isArray(decision.roleIds) ? decision.roleIds.length : 0;
  if (decision.mode === 'team-required' || roleCount > 2) {
    return `team_runtime_pressure:${String(decision.command ?? 'unknown')}`;
  }
  return null;
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

async function getGitRoot(projectRoot: string): Promise<string | null> {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel']);
    return result.stdout.trim();
  } catch {
    return null;
  }
}
