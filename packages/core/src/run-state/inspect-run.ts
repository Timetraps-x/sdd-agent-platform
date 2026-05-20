import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { TASK_RUN_EVIDENCE_CONTRACT_VERSION } from '../contracts.js';
import { getAgentExecutionsDir, getTeamSessionsDir, getWorkerRuntimesDir } from '../runtime-paths.js';
import { exists } from '../storage/json-io.js';
import type { ArtifactIndexEntry, InvocationLedgerEntry, RunState, RunStateArtifactIngestionRecord, RunStateWorktreeLifecycleRecord, RunStatus, RunSummary, RuntimeEvent } from './model.js';
import { readRunEvents } from './events.js';
import { listInvocationLedgerEntries } from './invocation-ledger.js';
import { readRunState, summarizeRunState } from './run-state.js';

export interface TaskRunEvidenceGap {
  type: string;
  severity: string;
  taskId?: string | null;
  field: string;
  message: string;
  recommendation: string;
}

export interface AgentExecutionRecordView {
  executionId: string;
  runId?: string;
  taskId: string;
  profile: string;
  status: string;
  artifacts: string[];
  toolPermission: { profile?: string } | null;
  routeId: string;
  routeDecision: { recommendedProfile?: string };
  createdAt: string;
  [key: string]: unknown;
}

export interface TeamSessionRecordView {
  teamId: string;
  runId?: string;
  taskId?: string | null;
  status: string;
  teamMode: { mode: string; activation: string; costClass: string; reason: string };
  chiefProfile: string;
  memberProfiles: string[];
  artifacts: string[];
  createdAt: string;
  [key: string]: unknown;
}

export interface ResidentWorkerRuntimeRecordView {
  runtimeId: string;
  runId?: string;
  taskId: string;
  agent: string;
  delegationId: string;
  status: string;
  leaseExpiresAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface TaskRunEvidenceContract {
  version: typeof TASK_RUN_EVIDENCE_CONTRACT_VERSION;
  runId: string;
  state: { status: RunStatus; phase: string | null; currentTask: string | null };
  events: Array<{ event: string; summary: string | null; task: string | null; agent: string | null; gate: string | null; validation: string | null; gap: string | null }>;
  artifacts: ArtifactIndexEntry[];
  validation: RunState['validation'];
  gaps: TaskRunEvidenceGap[];
  syncBackProposal: string | null;
  invocationLedger: InvocationLedgerEntry[];
  agentExecutions: AgentExecutionRecordView[];
  teamSessions: TeamSessionRecordView[];
  workerRuntimes: ResidentWorkerRuntimeRecordView[];
}

export interface RunInspection {
  summary: RunSummary;
  state: RunState;
  events: RuntimeEvent[];
  eventCount: number;
  recentEvents: RuntimeEvent[];
  artifacts: ArtifactIndexEntry[];
  artifactIngestions: RunStateArtifactIngestionRecord[];
  worktrees: RunStateWorktreeLifecycleRecord[];
  validation: RunState['validation'];
  syncBack: RunState['syncBack'];
  tasks: Record<string, unknown>;
  taskRunEvidence: TaskRunEvidenceContract;
  agentExecutions: AgentExecutionRecordView[];
  invocationLedger: InvocationLedgerEntry[];
  teamSessions: TeamSessionRecordView[];
  workerRuntimes: ResidentWorkerRuntimeRecordView[];
}

export async function inspectRun(projectRoot: string, runId: string): Promise<RunInspection> {
  const state = await readRunState(projectRoot, runId);
  const [events, agentExecutions, teamSessions, workerRuntimes, invocationLedger] = await Promise.all([
    readRunEvents(projectRoot, runId),
    listAgentExecutionRecords(projectRoot, runId),
    listTeamSessionRecords(projectRoot, runId),
    listResidentWorkerRuntimeRecords(projectRoot, runId),
    listInvocationLedgerEntries(projectRoot, runId)
  ]);
  return {
    summary: summarizeRunState(state),
    state,
    events,
    eventCount: events.length,
    recentEvents: events.slice(-10),
    artifacts: state.artifacts,
    artifactIngestions: Object.values(state.artifactIngestions ?? {}),
    worktrees: Object.values(state.worktrees ?? {}),
    validation: state.validation,
    syncBack: state.syncBack,
    taskRunEvidence: buildTaskRunEvidence(state, events, agentExecutions, teamSessions, workerRuntimes, invocationLedger),
    tasks: state.tasks,
    agentExecutions,
    teamSessions,
    workerRuntimes,
    invocationLedger
  };
}

async function listAgentExecutionRecords(projectRoot: string, runId: string): Promise<AgentExecutionRecordView[]> {
  const recordsDir = getAgentExecutionsDir(projectRoot, runId);
  if (!await exists(recordsDir)) {
    return [];
  }
  const records = await readJsonRecords<AgentExecutionRecordView>(recordsDir);
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.executionId.localeCompare(right.executionId));
}

async function listTeamSessionRecords(projectRoot: string, runId: string): Promise<TeamSessionRecordView[]> {
  const recordsDir = getTeamSessionsDir(projectRoot, runId);
  if (!await exists(recordsDir)) {
    return [];
  }
  const records = await readJsonRecords<TeamSessionRecordView>(recordsDir);
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.teamId.localeCompare(right.teamId));
}

async function listResidentWorkerRuntimeRecords(projectRoot: string, runId: string): Promise<ResidentWorkerRuntimeRecordView[]> {
  const recordsDir = getWorkerRuntimesDir(projectRoot, runId);
  if (!await exists(recordsDir)) {
    return [];
  }
  const records = await readJsonRecords<ResidentWorkerRuntimeRecordView>(recordsDir);
  return records.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt) || left.runtimeId.localeCompare(right.runtimeId));
}

async function readJsonRecords<T>(recordsDir: string): Promise<T[]> {
  const entries = await readdir(recordsDir, { withFileTypes: true });
  const records: T[] = [];
  for (const entry of entries.filter((candidate) => candidate.isFile() && candidate.name.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(recordsDir, entry.name), 'utf8');
      records.push(JSON.parse(raw) as T);
    } catch {
      continue;
    }
  }
  return records;
}

function buildTaskRunEvidence(state: RunState, events: RuntimeEvent[], agentExecutions: AgentExecutionRecordView[] = [], teamSessions: TeamSessionRecordView[] = [], workerRuntimes: ResidentWorkerRuntimeRecordView[] = [], invocationLedger: InvocationLedgerEntry[] = []): TaskRunEvidenceContract {
  return {
    version: TASK_RUN_EVIDENCE_CONTRACT_VERSION,
    runId: state.runId,
    state: { status: state.status, phase: state.phase, currentTask: state.currentTask },
    events: events.map((event) => ({
      event: event.event,
      summary: event.summary ?? null,
      task: stringData(event.data, 'task'),
      agent: stringData(event.data, 'agent'),
      gate: stringData(event.data, 'gate'),
      validation: stringData(event.data, 'status') ?? stringData(event.data, 'validation'),
      gap: stringData(event.data, 'gap')
    })),
    artifacts: state.artifacts,
    validation: state.validation,
    gaps: Object.values(state.tasks).flatMap(extractTaskGaps),
    syncBackProposal: state.syncBack.proposalPath,
    agentExecutions,
    teamSessions,
    workerRuntimes,
    invocationLedger
  };
}

function stringData(data: Record<string, unknown> | undefined, key: string): string | null {
  const value = data?.[key];
  return typeof value === 'string' ? value : null;
}

function extractTaskGaps(taskState: unknown): TaskRunEvidenceGap[] {
  if (!taskState || typeof taskState !== 'object' || !('gaps' in taskState)) {
    return [];
  }
  const gaps = (taskState as { gaps?: unknown }).gaps;
  return Array.isArray(gaps) ? gaps.filter(isTaskRunEvidenceGap) : [];
}

function isTaskRunEvidenceGap(value: unknown): value is TaskRunEvidenceGap {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const gap = value as Partial<TaskRunEvidenceGap>;
  return typeof gap.type === 'string' && typeof gap.severity === 'string' && typeof gap.field === 'string' && typeof gap.message === 'string' && typeof gap.recommendation === 'string';
}
