import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getAgentExecutionsDir,
  getArtifactsDir,
  getProjectConfigPath,
  getRunDir,
  getRunsDir,
  getTeamSessionsDir,
  getWorkerRuntimesDir
} from '../runtime-paths.js';
import { exists } from '../storage/json-io.js';
import { RuntimeStoreError, legacyImportId, recordLegacyImportFailure, runtimeScopedId, withRuntimeStore } from '../storage/runtime-store.js';
import type { RunDocumentSnapshot, RunState, RunStateLifecycleDecisionRecord, RunSummary } from './model.js';
import { appendEvent } from './events.js';
import { LIFECYCLE_DECISION_CONTRACT, LIFECYCLE_DECISION_VERSION, RUN_STATE_CONTRACT, RUNTIME_VERSION } from '../contracts.js';
import { parseProjectConfig } from '../config/project-config.js';

export async function readRunState(projectRoot: string, runId: string): Promise<RunState> {
  const statePath = path.join(getRunDir(projectRoot, runId), 'state.json');
  const legacyState = await importLegacyRunStateIfNeeded(projectRoot, runId, statePath);
  if (legacyState) {
    return legacyState;
  }
  const storedState = await readRuntimeRunState(projectRoot, runId);
  if (storedState) {
    return storedState;
  }
  throw new Error(`Run state not found for ${runId}.`);
}

export async function writeRunState(projectRoot: string, state: RunState): Promise<void> {
  const nextState = normalizeRunState({
    ...state,
    updatedAt: new Date().toISOString()
  });
  const statePath = path.join(getRunDir(projectRoot, state.runId), 'state.json');
  const serializedState = `${JSON.stringify(nextState, null, 2)}\n`;
  await writeFile(statePath, serializedState, 'utf8');
  await upsertRuntimeRunState(projectRoot, nextState, serializedState);
}

export async function archiveRun(projectRoot: string, runId: string, options: { reason?: string } = {}): Promise<RunState> {
  const state = await readRunState(projectRoot, runId);
  const terminalEventAt = new Date().toISOString();
  const delegations = Object.fromEntries(Object.entries(state.delegations).map(([delegationId, delegation]) => [
    delegationId,
    delegation.status === 'RUNNING'
      ? { ...delegation, status: 'CANCELLED' as const, terminalEventAt }
      : delegation
  ]));

  for (const delegation of Object.values(delegations)) {
    if (delegation.status === 'CANCELLED' && state.delegations[delegation.delegationId]?.status === 'RUNNING') {
      await appendEvent(projectRoot, runId, {
        event: 'delegation_cancelled',
        runId,
        summary: `${delegation.delegationId} cancelled because run was archived.`,
        data: { delegationId: delegation.delegationId, reason: options.reason ?? null }
      });
    }
  }

  await writeRunState(projectRoot, {
    ...state,
    status: 'archived',
    delegations
  });
  await appendEvent(projectRoot, runId, {
    event: 'run_archived',
    runId,
    summary: options.reason ? `Run archived: ${options.reason}` : 'Run archived.',
    data: { reason: options.reason ?? null }
  });
  return readRunState(projectRoot, runId);
}

export async function createRun(projectRoot: string, options: { runId?: string; lifecycleDecision?: RunStateLifecycleDecisionRecord } = {}): Promise<RunState> {
  await validateProjectConfig(projectRoot);
  await mkdir(getRunsDir(projectRoot), { recursive: true });
  const runId = options.runId ?? await createUniqueRunId(projectRoot);
  const runDir = getRunDir(projectRoot, runId);
  const artifactsDir = getArtifactsDir(projectRoot, runId);
  const agentExecutionsDir = getAgentExecutionsDir(projectRoot, runId);
  const teamSessionsDir = getTeamSessionsDir(projectRoot, runId);
  const workerRuntimesDir = getWorkerRuntimesDir(projectRoot, runId);
  await Promise.all([
    mkdir(artifactsDir, { recursive: true }),
    mkdir(agentExecutionsDir, { recursive: true }),
    mkdir(teamSessionsDir, { recursive: true }),
    mkdir(workerRuntimesDir, { recursive: true })
  ]);

  const now = new Date().toISOString();
  const state: RunState = {
    contract: RUN_STATE_CONTRACT,
    runtimeVersion: RUNTIME_VERSION,
    runId,
    status: 'created',
    phase: null,
    currentTask: null,
    partition: null,
    gitBranch: null,
    taskId: null,
    affectedFiles: [],
    documentSnapshot: emptyRunDocumentSnapshot(),
    createdAt: now,
    updatedAt: now,
    projectRoot: path.resolve(projectRoot),
    projectConfigPath: path.relative(projectRoot, getProjectConfigPath(projectRoot)),
    eventLogPath: path.relative(projectRoot, path.join(runDir, 'events.jsonl')),
    artifactRoot: path.relative(projectRoot, artifactsDir),
    lifecycleDecision: options.lifecycleDecision ?? emptyRunLifecycleDecisionRecord(),
    tasks: {},
    agents: {},
    delegations: {},
    artifacts: [],
    artifactIngestions: {},
    worktrees: {},
    validation: {
      status: 'not_run',
      commands: [],
      evidence: []
    },
    syncBack: {
      mode: 'proposal',
      proposalPath: null,
      status: 'not_created'
    }
  };

  await writeRunState(projectRoot, state);
  await appendEvent(projectRoot, runId, {
    event: 'run_started',
    runId,
    summary: 'Run created by Phase 1.2 runtime skeleton',
    data: {
      runtimeVersion: RUNTIME_VERSION,
      statePath: path.relative(projectRoot, path.join(runDir, 'state.json'))
    }
  });
  if (state.lifecycleDecision) {
    await appendEvent(projectRoot, runId, {
      event: 'lifecycle_decision_recorded',
      runId,
      summary: 'Lifecycle decision placeholder recorded for Phase 1.7 command gate',
      data: {
        contract: LIFECYCLE_DECISION_CONTRACT,
        modelVersion: state.lifecycleDecision.model_version,
        profile: state.lifecycleDecision.decision.profile,
        confidence: state.lifecycleDecision.decision.confidence
      }
    });
  }
  return state;
}

export async function createUniqueRunId(projectRoot: string): Promise<string> {
  const base = formatDateForRunId(new Date());
  for (let sequence = 1; sequence <= 999; sequence += 1) {
    const runId = `${base}-${String(sequence).padStart(3, '0')}`;
    if (!await exists(getRunDir(projectRoot, runId))) {
      return runId;
    }
  }
  throw new Error(`Cannot allocate run id for ${base}; sequence exhausted.`);
}

export async function listRuns(projectRoot: string): Promise<RunSummary[]> {
  const runsDir = getRunsDir(projectRoot);
  if (!await exists(runsDir)) {
    return [];
  }
  const entries = await readdir(runsDir, { withFileTypes: true });
  const summaries: RunSummary[] = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    try {
      const state = await readRunState(projectRoot, entry.name);
      summaries.push(summarizeRunState(state));
    } catch {
      continue;
    }
  }
  return summaries.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export async function readAllRunStates(projectRoot: string): Promise<RunState[]> {
  const runsDir = getRunsDir(projectRoot);
  if (!await exists(runsDir)) {
    return [];
  }
  const entries = await readdir(runsDir, { withFileTypes: true });
  const states: RunState[] = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    try {
      states.push(await readRunState(projectRoot, entry.name));
    } catch {
      continue;
    }
  }
  return states;
}

export function summarizeRunState(state: RunState): RunSummary {
  return {
    runId: state.runId,
    status: state.status,
    phase: state.phase,
    currentTask: state.currentTask,
    partition: state.partition,
    gitBranch: state.gitBranch,
    taskId: state.taskId,
    affectedFiles: state.affectedFiles,
    documentSnapshot: state.documentSnapshot,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    validationStatus: state.validation.status,
    syncBackStatus: state.syncBack.status,
    taskIds: Object.keys(state.tasks).sort(),
    artifactCount: state.artifacts.length
  };
}

export function normalizeRunState(state: Partial<RunState>): RunState {
  return {
    ...state,
    partition: typeof state.partition === 'string' ? state.partition : null,
    gitBranch: typeof state.gitBranch === 'string' ? state.gitBranch : null,
    taskId: typeof state.taskId === 'string' ? state.taskId : state.currentTask ?? null,
    affectedFiles: Array.isArray(state.affectedFiles) ? state.affectedFiles.filter((file): file is string => typeof file === 'string') : [],
    documentSnapshot: normalizeRunDocumentSnapshot(state.documentSnapshot),
    artifactIngestions: state.artifactIngestions ?? {},
    worktrees: state.worktrees ?? {}
  } as RunState;
}

export function normalizeRunDocumentSnapshot(snapshot: unknown): RunDocumentSnapshot {
  if (!isRecord(snapshot)) {
    return emptyRunDocumentSnapshot();
  }
  return {
    specHash: stringOrNull(snapshot.specHash),
    planHash: stringOrNull(snapshot.planHash),
    tasksHash: stringOrNull(snapshot.tasksHash),
    planBasedOnSpecHash: stringOrNull(snapshot.planBasedOnSpecHash),
    tasksBasedOnPlanHash: stringOrNull(snapshot.tasksBasedOnPlanHash)
  };
}

export function emptyRunDocumentSnapshot(): RunDocumentSnapshot {
  return {
    specHash: null,
    planHash: null,
    tasksHash: null,
    planBasedOnSpecHash: null,
    tasksBasedOnPlanHash: null
  };
}

async function validateProjectConfig(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}

function emptyRunLifecycleDecisionRecord(): RunStateLifecycleDecisionRecord {
  return {
    contract: LIFECYCLE_DECISION_CONTRACT,
    version: LIFECYCLE_DECISION_VERSION,
    model_version: 'phase1.0-final',
    input_summary: {},
    decision: {
      profile: null,
      confidence: null,
      hard_gate_hits: [],
      required_stages: [],
      skipped_stages: [],
      human_checkpoint_required: false
    },
    reasons: ['Phase 1.2 records the lifecycle decision contract; Phase 1.7 command gate will populate decision values.'],
    escalation_triggers: [],
    downgrade_reason: null,
    audit: {
      decided_at: null,
      decided_by: null,
      policy_version: 'phase1.0-final',
      source_artifacts: ['docs/architecture/lifecycle-decision-model.md']
    }
  };
}

async function upsertRuntimeRunState(projectRoot: string, state: RunState, serializedState: string): Promise<void> {
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare(`INSERT INTO runs (run_id, status, phase, current_task, partition, git_branch, task_id, created_at, updated_at, state_json, state_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO UPDATE SET status=excluded.status, phase=excluded.phase, current_task=excluded.current_task, partition=excluded.partition, git_branch=excluded.git_branch, task_id=excluded.task_id, updated_at=excluded.updated_at, state_json=excluded.state_json, state_hash=excluded.state_hash`)
      .run(state.runId, state.status, state.phase, state.currentTask, state.partition, state.gitBranch, state.taskId, state.createdAt, state.updatedAt, serializedState, hashDocumentContent(serializedState));
  });
}

async function readRuntimeRunState(projectRoot: string, runId: string): Promise<RunState | null> {
  return withRuntimeStore(projectRoot, ({ db }) => {
    const row = db.prepare('SELECT state_json FROM runs WHERE run_id = ?').get(runId) as { state_json?: string } | undefined;
    return row?.state_json ? normalizeRunState(JSON.parse(row.state_json) as Partial<RunState>) : null;
  });
}

async function importLegacyRunStateIfNeeded(projectRoot: string, runId: string, statePath: string): Promise<RunState | null> {
  if (!await exists(statePath)) {
    return null;
  }
  try {
    const raw = await readFile(statePath, 'utf8');
    const contentHash = hashDocumentContent(raw);
    return await withRuntimeStore(projectRoot, ({ db }) => {
      const legacy = db.prepare('SELECT content_hash FROM legacy_imports WHERE run_id = ? AND entity_type = ?').get(runId, 'state') as { content_hash?: string } | undefined;
      const row = db.prepare('SELECT state_json, state_hash FROM runs WHERE run_id = ?').get(runId) as { state_json?: string; state_hash?: string } | undefined;
      if (legacy?.content_hash === contentHash && row?.state_json && row.state_hash === contentHash) {
        return normalizeRunState(JSON.parse(row.state_json) as Partial<RunState>);
      }
      const state = normalizeRunState(JSON.parse(raw) as Partial<RunState>);
      db.prepare(`INSERT INTO runs (run_id, status, phase, current_task, partition, git_branch, task_id, created_at, updated_at, state_json, state_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO UPDATE SET status=excluded.status, phase=excluded.phase, current_task=excluded.current_task, partition=excluded.partition, git_branch=excluded.git_branch, task_id=excluded.task_id, created_at=excluded.created_at, updated_at=excluded.updated_at, state_json=excluded.state_json, state_hash=excluded.state_hash`)
        .run(state.runId, state.status, state.phase, state.currentTask, state.partition, state.gitBranch, state.taskId, state.createdAt, state.updatedAt, raw, contentHash);
      for (const artifact of state.artifacts) {
        const payload = JSON.stringify({ ...artifact, status: 'legacy_imported' });
        db.prepare('INSERT OR REPLACE INTO artifacts (artifact_id, run_id, path, kind, task_id, agent, content_hash, bytes, status, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(runtimeScopedId(state.runId, artifact.path, hashDocumentContent(payload)), state.runId, artifact.path, artifactKind(artifact.path), artifact.task, artifact.agent, hashDocumentContent(payload), Buffer.byteLength(payload, 'utf8'), 'legacy_imported', artifact.createdAt, payload);
      }
      for (const record of Object.values(state.artifactIngestions ?? {})) {
        db.prepare('INSERT OR REPLACE INTO artifact_ingestions (ingestion_id, run_id, delegation_id, task_id, agent, artifact_path, status, result_status, ingested_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(runtimeScopedId(record.runId, record.delegationId, record.artifactPath), record.runId, record.delegationId, record.task, record.agent, record.artifactPath, record.status, record.resultStatus, record.ingestedAt, JSON.stringify(record));
      }
      db.prepare('INSERT OR REPLACE INTO legacy_imports (import_id, run_id, entity_type, content_hash, imported_at, status, issue) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(legacyImportId(runId, 'state'), runId, 'state', contentHash, new Date().toISOString(), 'imported', null);
      return state;
    });
  } catch (error) {
    await recordLegacyImportFailure(projectRoot, runId, 'state', error);
    throw new RuntimeStoreError('LEGACY_IMPORT_FAILED', `Cannot import legacy state for ${runId}: ${messageFromError(error)}`, { cause: error });
  }
}

function artifactKind(runRelativePath: string): string {
  const extension = path.extname(runRelativePath).replace(/^\./, '');
  return extension || 'artifact';
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatDateForRunId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}
