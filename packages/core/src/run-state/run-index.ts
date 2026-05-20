import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { LOCAL_RUN_INDEX_CONTRACT_VERSION } from '../contracts.js';
import { getLocalRunIndexPath } from '../runtime-paths.js';
import { exists } from '../storage/json-io.js';
import { recordRuntimeProjection } from '../storage/runtime-store.js';
import { readRunEvents } from './events.js';
import type { RunState, RunStateDelegationRecord, RunStatus, RunSummary } from './model.js';
import { readAllRunStates, summarizeRunState } from './run-state.js';

export interface ContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

export type DelegationQueueStatusSource = 'run_state_delegation';

export interface DelegationQueueItem {
  id: string;
  runId: string;
  delegationId: string;
  taskId: string;
  agent: string;
  requestedCapabilityId: string;
  dedupeKey: string;
  status: RunStateDelegationRecord['status'];
  statusSource: DelegationQueueStatusSource;
  runMode: RunStateDelegationRecord['runMode'];
  expectedArtifact: string;
  requiredEvidence: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalRunIndexTaskEntry {
  taskId: string;
  partition: string | null;
  gitBranch: string | null;
  affectedFiles: string[];
  status: string | null;
  runId: string;
  runStatus: RunStatus;
  updatedAt: string;
}

export interface LocalRunIndexArtifactEntry {
  path: string;
  kind: string;
  task: string | null;
  agent: string | null;
  runId: string;
  createdAt: string;
}

export interface LocalRunIndexWaveSummary {
  runId: string;
  eventCount: number;
  lastEvent: string | null;
}

export interface LocalRunIndexPartitionTaskEntry {
  partition: string;
  gitBranch: string | null;
  taskId: string;
  runId: string;
  runStatus: RunStatus;
  validationStatus: RunState['validation']['status'];
  syncBackStatus: RunState['syncBack']['status'];
  affectedFiles: string[];
  updatedAt: string;
}

export interface LocalRunIndexAffectedFileEntry {
  file: string;
  partition: string;
  gitBranch: string | null;
  taskId: string;
  runId: string;
  runStatus: RunStatus;
  syncBackStatus: RunState['syncBack']['status'];
  updatedAt: string;
}

export interface LocalRunIndexQuery {
  runId?: string;
  taskId?: string;
  partition?: string;
  status?: RunStatus;
  artifact?: string;
}

export interface LocalRunIndex {
  contract: typeof LOCAL_RUN_INDEX_CONTRACT_VERSION;
  generatedAt: string;
  runs: RunSummary[];
  tasks: LocalRunIndexTaskEntry[];
  delegations: DelegationQueueItem[];
  artifacts: LocalRunIndexArtifactEntry[];
  waves: LocalRunIndexWaveSummary[];
  latestByPartitionTask: LocalRunIndexPartitionTaskEntry[];
  activeByAffectedFile: LocalRunIndexAffectedFileEntry[];
}

export interface LocalRunIndexInspection {
  valid: boolean;
  exists: boolean;
  indexPath: string;
  index: LocalRunIndex | null;
  issues: ContractValidationIssue[];
}

export async function rebuildLocalRunIndex(projectRoot: string): Promise<LocalRunIndex> {
  const index = await buildLocalRunIndexSnapshot(projectRoot);
  await writeFile(getLocalRunIndexPath(projectRoot), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  await recordRuntimeProjection(projectRoot, 'local_run_index', 'all', index);
  return index;
}

export async function readLocalRunIndex(projectRoot: string): Promise<LocalRunIndex> {
  const raw = await readFile(getLocalRunIndexPath(projectRoot), 'utf8');
  return normalizeLocalRunIndex(JSON.parse(raw) as Partial<LocalRunIndex>);
}

export async function queryLocalRunIndex(projectRoot: string, query: LocalRunIndexQuery = {}): Promise<LocalRunIndex> {
  const index = await readLocalRunIndex(projectRoot);
  const runIds = new Set(index.runs
    .filter((run) => !query.runId || run.runId === query.runId)
    .filter((run) => !query.status || run.status === query.status)
    .filter((run) => !query.taskId || run.taskIds.includes(query.taskId))
    .filter((run) => !query.artifact || index.artifacts.some((artifact) => artifact.runId === run.runId && artifact.path === query.artifact))
    .map((run) => run.runId));
  const result = {
    ...index,
    runs: index.runs.filter((run) => runIds.has(run.runId)),
    tasks: index.tasks.filter((task) => runIds.has(task.runId) && (!query.taskId || task.taskId === query.taskId) && (!query.partition || task.partition === query.partition)),
    delegations: index.delegations.filter((delegation) => runIds.has(delegation.runId) && (!query.taskId || delegation.taskId === query.taskId)),
    artifacts: index.artifacts.filter((artifact) => runIds.has(artifact.runId) && (!query.taskId || artifact.task === query.taskId) && (!query.artifact || artifact.path === query.artifact)),
    waves: index.waves.filter((wave) => runIds.has(wave.runId)),
    latestByPartitionTask: index.latestByPartitionTask.filter((entry) => runIds.has(entry.runId) && (!query.partition || entry.partition === query.partition) && (!query.taskId || entry.taskId === query.taskId)),
    activeByAffectedFile: index.activeByAffectedFile.filter((entry) => runIds.has(entry.runId) && (!query.partition || entry.partition === query.partition) && (!query.taskId || entry.taskId === query.taskId))
  };
  await recordRuntimeProjection(projectRoot, 'local_run_index_query', hashDocumentContent(JSON.stringify(query)), result);
  return result;
}

export async function inspectLocalRunIndex(projectRoot: string): Promise<LocalRunIndexInspection> {
  const indexPath = getLocalRunIndexPath(projectRoot);
  if (!await exists(indexPath)) {
    return {
      valid: false,
      exists: false,
      indexPath,
      index: null,
      issues: [contractIssue('run_index', 'Local run index projection is missing.', 'Run sdd run index rebuild to recreate the derived index from runtime.sqlite.')]
    };
  }

  try {
    const index = await readLocalRunIndex(projectRoot);
    const rebuilt = await buildLocalRunIndexSnapshot(projectRoot);
    const issues: ContractValidationIssue[] = [];
    if (index.contract !== LOCAL_RUN_INDEX_CONTRACT_VERSION) {
      issues.push(contractIssue('contract', `Local run index contract is ${index.contract}.`, 'Run sdd run index rebuild to refresh the index contract.'));
    }
    if (JSON.stringify(index.runs) !== JSON.stringify(rebuilt.runs)) {
      issues.push(contractIssue('runs', 'Local run index run summaries differ from runtime.sqlite state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.tasks) !== JSON.stringify(rebuilt.tasks)) {
      issues.push(contractIssue('tasks', 'Local run index task entries differ from runtime.sqlite state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.delegations) !== JSON.stringify(rebuilt.delegations)) {
      issues.push(contractIssue('delegations', 'Local run index delegation entries differ from runtime.sqlite state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.artifacts) !== JSON.stringify(rebuilt.artifacts)) {
      issues.push(contractIssue('artifacts', 'Local run index artifact entries differ from runtime.sqlite state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.waves) !== JSON.stringify(rebuilt.waves)) {
      issues.push(contractIssue('waves', 'Local run index wave summaries differ from runtime.sqlite events.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.latestByPartitionTask) !== JSON.stringify(rebuilt.latestByPartitionTask)) {
      issues.push(contractIssue('latestByPartitionTask', 'Local run index partition/task latest view differs from runtime.sqlite state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.activeByAffectedFile) !== JSON.stringify(rebuilt.activeByAffectedFile)) {
      issues.push(contractIssue('activeByAffectedFile', 'Local run index affected-file active view differs from runtime.sqlite state.', 'Run sdd run index rebuild.'));
    }
    return {
      valid: issues.length === 0,
      exists: true,
      indexPath,
      index,
      issues
    };
  } catch (error) {
    return {
      valid: false,
      exists: true,
      indexPath,
      index: null,
      issues: [contractIssue('run_index', `Cannot read local run index: ${messageFromError(error)}`, 'Run sdd run index rebuild to recreate the derived index.')]
    };
  }
}

async function buildLocalRunIndexSnapshot(projectRoot: string): Promise<LocalRunIndex> {
  const states = await readAllRunStates(projectRoot);
  const tasks: LocalRunIndexTaskEntry[] = [];
  const artifacts: LocalRunIndexArtifactEntry[] = [];
  const delegations: DelegationQueueItem[] = [];
  const waves: LocalRunIndexWaveSummary[] = [];
  const latestByPartitionTask = new Map<string, LocalRunIndexPartitionTaskEntry>();
  const activeByAffectedFile: LocalRunIndexAffectedFileEntry[] = [];

  for (const state of states) {
    for (const [taskId, taskState] of Object.entries(state.tasks)) {
      tasks.push({
        taskId,
        partition: state.partition,
        gitBranch: state.gitBranch,
        affectedFiles: state.affectedFiles,
        status: runtimeTaskStatus(taskState),
        runId: state.runId,
        runStatus: state.status,
        updatedAt: state.updatedAt
      });
    }
    if (state.partition && state.taskId && state.status !== 'archived') {
      const entry: LocalRunIndexPartitionTaskEntry = {
        partition: state.partition,
        gitBranch: state.gitBranch,
        taskId: state.taskId,
        runId: state.runId,
        runStatus: state.status,
        validationStatus: state.validation.status,
        syncBackStatus: state.syncBack.status,
        affectedFiles: state.affectedFiles,
        updatedAt: state.updatedAt
      };
      const key = partitionTaskKey(state.partition, state.taskId);
      const existing = latestByPartitionTask.get(key);
      if (!existing || Date.parse(entry.updatedAt) > Date.parse(existing.updatedAt) || (entry.updatedAt === existing.updatedAt && entry.runId.localeCompare(existing.runId) > 0)) {
        latestByPartitionTask.set(key, entry);
      }
      if (isActiveRunForAffectedFile(state)) {
        for (const file of state.affectedFiles) {
          activeByAffectedFile.push({
            file,
            partition: state.partition,
            gitBranch: state.gitBranch,
            taskId: state.taskId,
            runId: state.runId,
            runStatus: state.status,
            syncBackStatus: state.syncBack.status,
            updatedAt: state.updatedAt
          });
        }
      }
    }
    for (const artifact of state.artifacts) {
      artifacts.push({
        ...artifact,
        runId: state.runId
      });
    }
    delegations.push(...Object.values(state.delegations).map((delegation) => delegationQueueItemFromRunState(state, delegation)));
    const waveEvents = (await readRunEvents(projectRoot, state.runId)).filter((event) => event.event.startsWith('wave_executor_'));
    if (waveEvents.length > 0) {
      waves.push({
        runId: state.runId,
        eventCount: waveEvents.length,
        lastEvent: waveEvents[waveEvents.length - 1]?.event ?? null
      });
    }
  }

  return {
    contract: LOCAL_RUN_INDEX_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    runs: states.map((state) => summarizeRunState(state)).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
    tasks: tasks.sort((left, right) => (left.partition ?? '').localeCompare(right.partition ?? '') || left.taskId.localeCompare(right.taskId) || left.runId.localeCompare(right.runId)),
    delegations: delegations.sort((left, right) => left.id.localeCompare(right.id)),
    artifacts: artifacts.sort((left, right) => left.path.localeCompare(right.path) || left.runId.localeCompare(right.runId)),
    waves: waves.sort((left, right) => left.runId.localeCompare(right.runId)),
    latestByPartitionTask: Array.from(latestByPartitionTask.values()).sort((left, right) => left.partition.localeCompare(right.partition) || left.taskId.localeCompare(right.taskId)),
    activeByAffectedFile: activeByAffectedFile.sort((left, right) => left.file.localeCompare(right.file) || left.partition.localeCompare(right.partition) || left.taskId.localeCompare(right.taskId) || left.runId.localeCompare(right.runId))
  };
}

function normalizeLocalRunIndex(index: Partial<LocalRunIndex>): LocalRunIndex {
  return {
    contract: index.contract ?? LOCAL_RUN_INDEX_CONTRACT_VERSION,
    generatedAt: index.generatedAt ?? new Date().toISOString(),
    runs: index.runs ?? [],
    tasks: index.tasks ?? [],
    delegations: index.delegations ?? [],
    artifacts: index.artifacts ?? [],
    waves: index.waves ?? [],
    latestByPartitionTask: index.latestByPartitionTask ?? [],
    activeByAffectedFile: index.activeByAffectedFile ?? []
  };
}

function delegationQueueItemFromRunState(state: RunState, delegation: RunStateDelegationRecord): DelegationQueueItem {
  return {
    id: `${state.runId}:${delegation.delegationId}`,
    runId: state.runId,
    delegationId: delegation.delegationId,
    taskId: delegation.task,
    agent: delegation.agent,
    requestedCapabilityId: 'sdd-cli',
    dedupeKey: `${state.runId}:${delegation.task}:${delegation.agent}`,
    status: delegation.status,
    statusSource: 'run_state_delegation',
    runMode: delegation.runMode,
    expectedArtifact: delegation.expectedArtifact,
    requiredEvidence: [delegation.expectedArtifact, state.eventLogPath],
    createdAt: delegation.startedAt,
    updatedAt: delegation.terminalEventAt ?? delegation.lastHeartbeatAt ?? state.updatedAt
  };
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

function partitionTaskKey(partition: string, taskId: string): string {
  return `${partition}::${taskId}`;
}

function isActiveRunForAffectedFile(state: RunState): boolean {
  return state.status !== 'archived' && state.syncBack.status !== 'applied' && state.affectedFiles.length > 0;
}

function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
