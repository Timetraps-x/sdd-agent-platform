import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION } from '../contracts.js';
import { contractIssue, messageFromError, type ContractValidationIssue } from '../contracts/issues.js';
import { listDelegationQueueItems } from '../delegation/queue.js';
import { isDelegationTerminal } from '../delegation/validation.js';
import { getWorkerRuntimeRecordPath, getWorkerRuntimesDir } from '../runtime-paths.js';
import { appendEvent } from '../run-state/events.js';
import { readRunState, writeRunState } from '../run-state/run-state.js';
import { exists } from '../storage/json-io.js';
import type { DelegationQueueItem } from '../run-state/run-index.js';
import { inspectWorkerAdapterContract, type WorkerAdapterContract } from '../registries/worker-adapters.js';
import { toSafeRecordId } from './agent-execution-records.js';
import { runBackgroundExecutor } from './background-executor.js';

const DEFAULT_RESIDENT_WORKER_LEASE_SECONDS = 900;

export type ResidentWorkerRuntimeStatus = 'claimed' | 'active' | 'stale' | 'terminal' | 'blocked';

export interface ResidentWorkerRuntimeRecord {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runtimeId: string;
  runId: string;
  taskId: string;
  agent: string;
  workerAdapterId: string;
  delegationId: string;
  queueItemId: string;
  expectedArtifact: string;
  status: ResidentWorkerRuntimeStatus;
  claimedAt: string;
  lastHeartbeatAt: string | null;
  leaseSeconds: number;
  leaseExpiresAt: string;
  updatedAt: string;
  evidenceSummary: string;
}

export interface ResidentWorkerRuntimeClaimOptions {
  branch?: string;
  runId?: string;
  taskId: string;
  runtimeId?: string;
  agent?: string;
  workerAdapterId?: string;
  delegationId?: string;
  leaseSeconds?: number;
}

export interface ResidentWorkerRuntimeClaimResult {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runId: string;
  runtimeId: string | null;
  taskId: string;
  agent: string;
  workerAdapterId: string;
  delegationId: string | null;
  queueItemId: string | null;
  expectedArtifact: string | null;
  status: ResidentWorkerRuntimeStatus;
  leaseExpiresAt: string | null;
  runtime: ResidentWorkerRuntimeRecord | null;
  issues: ContractValidationIssue[];
  message: string;
}

export interface ResidentWorkerRuntimeHeartbeatOptions {
  runId: string;
  runtimeId: string;
  leaseSeconds?: number;
}

export interface ResidentWorkerRuntimeHeartbeatResult {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runId: string;
  runtimeId: string;
  status: ResidentWorkerRuntimeStatus;
  leaseExpiresAt: string | null;
  runtime: ResidentWorkerRuntimeRecord | null;
  issues: ContractValidationIssue[];
  message: string;
}

export interface ResidentWorkerRuntimeInspection {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runId: string;
  runtimeId: string;
  runtime: ResidentWorkerRuntimeRecord | null;
  queueItem: DelegationQueueItem | null;
  workerAdapter: WorkerAdapterContract | null;
  status: ResidentWorkerRuntimeStatus;
  leaseExpired: boolean;
  valid: boolean;
  issues: ContractValidationIssue[];
  recommendedNextCommand: string;
}

export interface ResidentWorkerRuntimeList {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runId: string;
  runtimes: ResidentWorkerRuntimeRecord[];
  activeRuntimes: number;
  staleRuntimes: number;
  terminalRuntimes: number;
  blockedRuntimes: number;
  valid: boolean;
  issues: ContractValidationIssue[];
}

export async function writeResidentWorkerRuntimeRecord(projectRoot: string, record: ResidentWorkerRuntimeRecord): Promise<ResidentWorkerRuntimeRecord> {
  await mkdir(getWorkerRuntimesDir(projectRoot, record.runId), { recursive: true });
  await writeFile(getWorkerRuntimeRecordPath(projectRoot, record.runId, record.runtimeId), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return record;
}

export async function readResidentWorkerRuntimeRecord(projectRoot: string, runId: string, runtimeId: string): Promise<ResidentWorkerRuntimeRecord> {
  const raw = await readFile(getWorkerRuntimeRecordPath(projectRoot, runId, runtimeId), 'utf8');
  return JSON.parse(raw) as ResidentWorkerRuntimeRecord;
}

export async function listResidentWorkerRuntimeRecords(projectRoot: string, runId: string): Promise<ResidentWorkerRuntimeRecord[]> {
  const recordsDir = getWorkerRuntimesDir(projectRoot, runId);
  if (!await exists(recordsDir)) {
    return [];
  }
  const entries = await readdir(recordsDir, { withFileTypes: true });
  const records: ResidentWorkerRuntimeRecord[] = [];
  for (const entry of entries.filter((candidate) => candidate.isFile() && candidate.name.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(recordsDir, entry.name), 'utf8');
      records.push(JSON.parse(raw) as ResidentWorkerRuntimeRecord);
    } catch {
      continue;
    }
  }
  return records.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt) || left.runtimeId.localeCompare(right.runtimeId));
}

export async function claimResidentWorkerRuntime(projectRoot: string, options: ResidentWorkerRuntimeClaimOptions): Promise<ResidentWorkerRuntimeClaimResult> {
  const agent = options.agent ?? 'implementer';
  const workerAdapterId = options.workerAdapterId ?? 'sdd-cli-task-worker';
  const leaseSeconds = normalizeResidentWorkerLeaseSeconds(options.leaseSeconds);
  const backgroundResult = await runBackgroundExecutor(projectRoot, {
    branch: options.branch,
    runId: options.runId,
    taskId: options.taskId,
    agent,
    workerAdapterId,
    delegationId: options.delegationId,
    timeoutSeconds: leaseSeconds
  });

  if (backgroundResult.status === 'blocked' || backgroundResult.status === 'failed' || !backgroundResult.delegationId || !backgroundResult.queueItemId) {
    return {
      version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
      runId: backgroundResult.runId,
      runtimeId: null,
      taskId: options.taskId,
      agent,
      workerAdapterId,
      delegationId: backgroundResult.delegationId,
      queueItemId: backgroundResult.queueItemId,
      expectedArtifact: null,
      status: 'blocked',
      leaseExpiresAt: null,
      runtime: null,
      issues: backgroundResult.issues,
      message: `Resident worker runtime blocked before claim: ${backgroundResult.message}`
    };
  }

  const runtimeId = toSafeRecordId(options.runtimeId ?? `R-${options.taskId}-${agent}-001`);
  const state = await readRunState(projectRoot, backgroundResult.runId);
  const delegation = state.delegations[backgroundResult.delegationId];
  const now = new Date().toISOString();
  const runtime: ResidentWorkerRuntimeRecord = {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runtimeId,
    runId: backgroundResult.runId,
    taskId: options.taskId,
    agent,
    workerAdapterId,
    delegationId: backgroundResult.delegationId,
    queueItemId: backgroundResult.queueItemId,
    expectedArtifact: delegation?.expectedArtifact ?? `artifacts/${agent}-${options.taskId}.md`,
    status: 'claimed',
    claimedAt: now,
    lastHeartbeatAt: null,
    leaseSeconds,
    leaseExpiresAt: residentWorkerLeaseExpiresAt(now, leaseSeconds),
    updatedAt: now,
    evidenceSummary: `Resident worker runtime ${runtimeId} claimed ${backgroundResult.delegationId}; completion still requires artifact ingestion and verify.`
  };
  await writeResidentWorkerRuntimeRecord(projectRoot, runtime);
  await appendEvent(projectRoot, runtime.runId, {
    event: 'worker_runtime_claimed',
    runId: runtime.runId,
    summary: `Resident worker runtime ${runtime.runtimeId} claimed ${runtime.delegationId}`,
    data: { runtimeId: runtime.runtimeId, taskId: runtime.taskId, agent: runtime.agent, workerAdapterId: runtime.workerAdapterId, delegationId: runtime.delegationId, queueItemId: runtime.queueItemId, leaseExpiresAt: runtime.leaseExpiresAt }
  });
  return {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runId: runtime.runId,
    runtimeId: runtime.runtimeId,
    taskId: runtime.taskId,
    agent: runtime.agent,
    workerAdapterId: runtime.workerAdapterId,
    delegationId: runtime.delegationId,
    queueItemId: runtime.queueItemId,
    expectedArtifact: runtime.expectedArtifact,
    status: runtime.status,
    leaseExpiresAt: runtime.leaseExpiresAt,
    runtime,
    issues: [],
    message: `Resident worker runtime ${runtime.runtimeId} claimed ${runtime.delegationId}; send heartbeat before ${runtime.leaseExpiresAt}.`
  };
}

export async function heartbeatResidentWorkerRuntime(projectRoot: string, options: ResidentWorkerRuntimeHeartbeatOptions): Promise<ResidentWorkerRuntimeHeartbeatResult> {
  let runtime: ResidentWorkerRuntimeRecord;
  try {
    runtime = await readResidentWorkerRuntimeRecord(projectRoot, options.runId, options.runtimeId);
  } catch (error) {
    return {
      version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
      runId: options.runId,
      runtimeId: options.runtimeId,
      status: 'blocked',
      leaseExpiresAt: null,
      runtime: null,
      issues: [contractIssue('runtimeId', `Cannot read resident worker runtime ${options.runtimeId}: ${messageFromError(error)}`, 'Run sdd worker-runtime status --run <run_id> or claim a new resident worker runtime.')],
      message: `Resident worker runtime ${options.runtimeId} is not readable.`
    };
  }

  const now = new Date().toISOString();
  const leaseSeconds = normalizeResidentWorkerLeaseSeconds(options.leaseSeconds ?? runtime.leaseSeconds);
  const queueItem = await findResidentWorkerQueueItem(projectRoot, runtime);
  if (queueItem && isDelegationTerminal(queueItem.status)) {
    const terminalRuntime = await writeResidentWorkerRuntimeRecord(projectRoot, {
      ...runtime,
      status: 'terminal',
      leaseSeconds,
      updatedAt: now,
      evidenceSummary: `Resident worker runtime ${runtime.runtimeId} is terminal because delegation ${runtime.delegationId} is ${queueItem.status}.`
    });
    await appendEvent(projectRoot, runtime.runId, { event: 'worker_runtime_terminal', runId: runtime.runId, summary: `Resident worker runtime ${runtime.runtimeId} observed terminal delegation ${runtime.delegationId}`, data: { runtimeId: runtime.runtimeId, delegationId: runtime.delegationId, status: queueItem.status } });
    return {
      version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
      runId: runtime.runId,
      runtimeId: runtime.runtimeId,
      status: 'terminal',
      leaseExpiresAt: terminalRuntime.leaseExpiresAt,
      runtime: terminalRuntime,
      issues: [],
      message: `Resident worker runtime ${runtime.runtimeId} is terminal; create a new delegation id for retry instead of reactivating it.`
    };
  }

  await heartbeatDelegationForRuntime(projectRoot, runtime, now, leaseSeconds);
  const activeRuntime = await writeResidentWorkerRuntimeRecord(projectRoot, {
    ...runtime,
    status: 'active',
    lastHeartbeatAt: now,
    leaseSeconds,
    leaseExpiresAt: residentWorkerLeaseExpiresAt(now, leaseSeconds),
    updatedAt: now,
    evidenceSummary: `Resident worker runtime ${runtime.runtimeId} heartbeat renewed until ${residentWorkerLeaseExpiresAt(now, leaseSeconds)}.`
  });
  await appendEvent(projectRoot, runtime.runId, { event: 'worker_runtime_heartbeat', runId: runtime.runId, summary: `Resident worker runtime ${runtime.runtimeId} heartbeat renewed`, data: { runtimeId: runtime.runtimeId, delegationId: runtime.delegationId, leaseExpiresAt: activeRuntime.leaseExpiresAt } });
  return {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runId: activeRuntime.runId,
    runtimeId: activeRuntime.runtimeId,
    status: activeRuntime.status,
    leaseExpiresAt: activeRuntime.leaseExpiresAt,
    runtime: activeRuntime,
    issues: [],
    message: `Resident worker runtime ${activeRuntime.runtimeId} active until ${activeRuntime.leaseExpiresAt}.`
  };
}

export async function listResidentWorkerRuntimes(projectRoot: string, options: { runId: string }): Promise<ResidentWorkerRuntimeList> {
  const records = await listResidentWorkerRuntimeRecords(projectRoot, options.runId);
  const queueSnapshot = await listDelegationQueueItems(projectRoot, { runId: options.runId });
  const queueItems = new Map(queueSnapshot.items.map((item) => [item.id, item]));
  const runtimes = records.map((record) => withDerivedResidentWorkerStatus(record, queueItems.get(record.queueItemId) ?? null));
  const issues: ContractValidationIssue[] = [];
  for (const runtime of runtimes) {
    issues.push(...await validateResidentWorkerRuntime(projectRoot, runtime, queueItems.get(runtime.queueItemId) ?? null));
  }
  return {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runId: options.runId,
    runtimes,
    activeRuntimes: runtimes.filter((runtime) => runtime.status === 'active' || runtime.status === 'claimed').length,
    staleRuntimes: runtimes.filter((runtime) => runtime.status === 'stale').length,
    terminalRuntimes: runtimes.filter((runtime) => runtime.status === 'terminal').length,
    blockedRuntimes: runtimes.filter((runtime) => runtime.status === 'blocked').length,
    valid: issues.length === 0,
    issues
  };
}

export async function inspectResidentWorkerRuntime(projectRoot: string, options: { runId: string; runtimeId: string }): Promise<ResidentWorkerRuntimeInspection> {
  let record: ResidentWorkerRuntimeRecord;
  try {
    record = await readResidentWorkerRuntimeRecord(projectRoot, options.runId, options.runtimeId);
  } catch (error) {
    const issues = [contractIssue('runtimeId', `Cannot read resident worker runtime ${options.runtimeId}: ${messageFromError(error)}`, 'Run sdd worker-runtime status --run <run_id> or claim a new resident worker runtime.')];
    return {
      version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
      runId: options.runId,
      runtimeId: options.runtimeId,
      runtime: null,
      queueItem: null,
      workerAdapter: null,
      status: 'blocked',
      leaseExpired: false,
      valid: false,
      issues,
      recommendedNextCommand: `sdd worker-runtime status --run ${options.runId}`
    };
  }
  const queueItem = await findResidentWorkerQueueItem(projectRoot, record);
  const workerAdapter = await inspectWorkerAdapterContract(projectRoot, record.workerAdapterId);
  const runtime = withDerivedResidentWorkerStatus(record, queueItem);
  const issues = await validateResidentWorkerRuntime(projectRoot, runtime, queueItem, workerAdapter);
  return {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runId: options.runId,
    runtimeId: options.runtimeId,
    runtime,
    queueItem,
    workerAdapter,
    status: runtime.status,
    leaseExpired: isResidentWorkerLeaseExpired(runtime),
    valid: issues.length === 0,
    issues,
    recommendedNextCommand: residentWorkerRecommendedNextCommand(runtime)
  };
}

function normalizeResidentWorkerLeaseSeconds(value: number | undefined): number {
  if (value && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return DEFAULT_RESIDENT_WORKER_LEASE_SECONDS;
}

function residentWorkerLeaseExpiresAt(fromIso: string, leaseSeconds: number): string {
  const timestamp = Date.parse(fromIso);
  const start = Number.isNaN(timestamp) ? Date.now() : timestamp;
  return new Date(start + leaseSeconds * 1000).toISOString();
}

function isResidentWorkerLeaseExpired(runtime: ResidentWorkerRuntimeRecord, now = new Date()): boolean {
  const timestamp = Date.parse(runtime.leaseExpiresAt);
  return Number.isNaN(timestamp) || timestamp < now.getTime();
}

function withDerivedResidentWorkerStatus(runtime: ResidentWorkerRuntimeRecord, queueItem: DelegationQueueItem | null, now = new Date()): ResidentWorkerRuntimeRecord {
  if (runtime.status === 'blocked') {
    return runtime;
  }
  if (runtime.status === 'terminal' || (queueItem && isDelegationTerminal(queueItem.status))) {
    return { ...runtime, status: 'terminal' };
  }
  if (isResidentWorkerLeaseExpired(runtime, now)) {
    return { ...runtime, status: 'stale' };
  }
  if (runtime.lastHeartbeatAt) {
    return { ...runtime, status: 'active' };
  }
  return { ...runtime, status: 'claimed' };
}

async function findResidentWorkerQueueItem(projectRoot: string, runtime: ResidentWorkerRuntimeRecord): Promise<DelegationQueueItem | null> {
  const snapshot = await listDelegationQueueItems(projectRoot, { runId: runtime.runId });
  return snapshot.items.find((item) => item.id === runtime.queueItemId) ?? snapshot.items.find((item) => item.delegationId === runtime.delegationId) ?? null;
}

async function heartbeatDelegationForRuntime(projectRoot: string, runtime: ResidentWorkerRuntimeRecord, heartbeatAt: string, leaseSeconds: number): Promise<void> {
  const state = await readRunState(projectRoot, runtime.runId);
  const delegation = state.delegations[runtime.delegationId];
  if (!delegation || isDelegationTerminal(delegation.status)) {
    return;
  }
  await writeRunState(projectRoot, {
    ...state,
    delegations: {
      ...state.delegations,
      [runtime.delegationId]: {
        ...delegation,
        lastHeartbeatAt: heartbeatAt,
        timeoutSeconds: leaseSeconds
      }
    }
  });
}

async function validateResidentWorkerRuntime(projectRoot: string, runtime: ResidentWorkerRuntimeRecord, queueItem: DelegationQueueItem | null, workerAdapter?: WorkerAdapterContract | null): Promise<ContractValidationIssue[]> {
  const issues: ContractValidationIssue[] = [];
  if (runtime.version !== RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION) {
    issues.push(contractIssue('version', `Expected ${RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION}.`, 'Rewrite the resident worker runtime record through sdd worker-runtime claim.'));
  }
  const adapter = workerAdapter === undefined ? await inspectWorkerAdapterContract(projectRoot, runtime.workerAdapterId) : workerAdapter;
  if (!adapter) {
    issues.push(contractIssue('workerAdapterId', `Resident worker runtime ${runtime.runtimeId} references unknown worker adapter ${runtime.workerAdapterId}.`, 'Claim the runtime with a declared worker adapter.'));
  }
  if (!queueItem) {
    issues.push(contractIssue('queueItemId', `Resident worker runtime ${runtime.runtimeId} references missing queue item ${runtime.queueItemId}.`, 'Inspect the run or claim a new resident worker runtime with a valid delegation.'));
  }
  if (runtime.status === 'stale' && queueItem?.status === 'RUNNING') {
    issues.push(contractIssue('lease', `Resident worker runtime ${runtime.runtimeId} is stale while delegation ${runtime.delegationId} is still RUNNING.`, `Run sdd worker-runtime heartbeat ${runtime.runtimeId} --run ${runtime.runId}, or inspect/reclaim with a new delegation id if the worker stopped.`));
  }
  return issues;
}

function residentWorkerRecommendedNextCommand(runtime: ResidentWorkerRuntimeRecord): string {
  if (runtime.status === 'stale') {
    return `sdd worker-runtime heartbeat ${runtime.runtimeId} --run ${runtime.runId}`;
  }
  if (runtime.status === 'terminal') {
    return `sdd background inspect ${runtime.runId}`;
  }
  return `sdd worker-runtime heartbeat ${runtime.runtimeId} --run ${runtime.runId}`;
}
