import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { getRuntimeStorePath, getSddDir } from '../runtime-paths.js';
import { exists } from './json-io.js';
import type { InvocationLedgerEntry, RuntimeEvent, RunState } from '../run-state/model.js';
import { RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION, type RuntimeProjectionEnvelope, type RuntimeProjectionStaleness } from '../contracts.js';


export const RUNTIME_STORE_SCHEMA_VERSION = 2;
export const RUNTIME_STORE_CONTRACT_VERSION = 'phase-7.2-runtime-store-v2';

export type RuntimeStoreIssueCode = 'STORE_UNAVAILABLE' | 'SCHEMA_MISMATCH' | 'LEGACY_IMPORT_FAILED';

export type RuntimeStoreDatabase = {
  exec(sql: string): unknown;
  prepare(sql: string): {
    run: (...params: unknown[]) => unknown;
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };
  close: () => void;
};

export type RuntimeStoreConstructor = new (filename: string) => RuntimeStoreDatabase;

export interface RuntimeStoreHandle {
  path: string;
  db: RuntimeStoreDatabase;
}

export class RuntimeStoreError extends Error {
  constructor(readonly code: RuntimeStoreIssueCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'RuntimeStoreError';
    this.cause = options?.cause;
  }
}

export interface RuntimeStoreDoctorCheck {
  level: 'PASS' | 'WARN' | 'FAIL';
  check: string;
  message: string;
  action?: string;
}


let runtimeStoreConstructorPromise: Promise<RuntimeStoreConstructor> | null = null;

export async function withRuntimeStore<T>(projectRoot: string, fn: (store: RuntimeStoreHandle) => T | Promise<T>): Promise<T> {
  const store = await openRuntimeStore(projectRoot);
  try {
    return await fn(store);
  } finally {
    store.db.close();
  }
}

async function loadRuntimeStoreConstructor(): Promise<RuntimeStoreConstructor> {
  runtimeStoreConstructorPromise ??= importNodeSqlite()
    .then((sqlite) => sqlite.DatabaseSync as RuntimeStoreConstructor)
    .catch((error: unknown) => {
      throw new RuntimeStoreError('STORE_UNAVAILABLE', `node:sqlite is unavailable: ${messageFromError(error)}`, { cause: error });
    });
  return runtimeStoreConstructorPromise;
}

async function importNodeSqlite(): Promise<{ DatabaseSync: RuntimeStoreConstructor }> {
  const emitWarning = process.emitWarning;
  const forwardWarning = emitWarning as unknown as (warning: string | Error, ...args: unknown[]) => void;
  process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
    const message = warning instanceof Error ? warning.message : warning;
    if (typeof message === 'string' && message.includes('SQLite is an experimental feature')) {
      return;
    }
    return forwardWarning.call(process, warning, ...args);
  }) as typeof process.emitWarning;
  try {
    return await import('node:sqlite') as { DatabaseSync: RuntimeStoreConstructor };
  } finally {
    process.emitWarning = emitWarning;
  }
}

async function openRuntimeStore(projectRoot: string): Promise<RuntimeStoreHandle> {
  await mkdir(getSddDir(projectRoot), { recursive: true });
  const DatabaseSync = await loadRuntimeStoreConstructor();
  const storePath = getRuntimeStorePath(projectRoot);
  let db: RuntimeStoreDatabase;
  try {
    db = new DatabaseSync(storePath);
  } catch (error) {
    throw new RuntimeStoreError('STORE_UNAVAILABLE', `Cannot open runtime store ${storePath}: ${messageFromError(error)}`, { cause: error });
  }
  try {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000');
    db.exec('PRAGMA journal_mode = WAL');
    initializeRuntimeStoreSchema(db);
    return { path: storePath, db };
  } catch (error) {
    db.close();
    throw new RuntimeStoreError('SCHEMA_MISMATCH', `Cannot initialize runtime store ${storePath}: ${messageFromError(error)}`, { cause: error });
  }
}

function initializeRuntimeStoreSchema(db: RuntimeStoreDatabase): void {
  const currentVersion = readRuntimeStoreSchemaVersion(db);
  if (currentVersion > RUNTIME_STORE_SCHEMA_VERSION) {
    throw new RuntimeStoreError('SCHEMA_MISMATCH', `Runtime store schema ${currentVersion} is newer than supported schema ${RUNTIME_STORE_SCHEMA_VERSION}.`);
  }
  db.exec(`
CREATE TABLE IF NOT EXISTS runtime_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runs (run_id TEXT PRIMARY KEY, status TEXT NOT NULL, phase TEXT, current_task TEXT, partition TEXT, git_branch TEXT, task_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, state_json TEXT NOT NULL, state_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events (event_id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, event_time TEXT NOT NULL, event_name TEXT NOT NULL, event_hash TEXT NOT NULL, event_json TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'runtime', FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE, UNIQUE(run_id, event_hash));
CREATE TABLE IF NOT EXISTS attempts (attempt_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, task_id TEXT, status TEXT, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS activities (activity_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, task_id TEXT, branch TEXT, kind TEXT NOT NULL, ref TEXT NOT NULL, status TEXT, created_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS artifacts (artifact_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, path TEXT NOT NULL, kind TEXT NOT NULL, task_id TEXT, agent TEXT, content_hash TEXT NOT NULL, bytes INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE, UNIQUE(run_id, path, content_hash));
CREATE TABLE IF NOT EXISTS artifact_ingestions (ingestion_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, delegation_id TEXT NOT NULL, task_id TEXT NOT NULL, agent TEXT NOT NULL, artifact_path TEXT NOT NULL, status TEXT NOT NULL, result_status TEXT, ingested_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS policy_decisions (decision_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, task_id TEXT, acceptance_id TEXT, status TEXT NOT NULL, issue_codes TEXT NOT NULL, created_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS evidence_claims (claim_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, partition TEXT, task_id TEXT NOT NULL, acceptance_id TEXT NOT NULL, coverage_status TEXT NOT NULL, source_artifact TEXT NOT NULL, is_derived INTEGER NOT NULL, created_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS evidence_attachments (evidence_id TEXT PRIMARY KEY, branch_slug TEXT NOT NULL, run_id TEXT, task_id TEXT, kind TEXT NOT NULL, relative_path TEXT NOT NULL, content_hash TEXT NOT NULL, bytes INTEGER NOT NULL, created_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE, UNIQUE(branch_slug, relative_path, content_hash));
CREATE TABLE IF NOT EXISTS gaps (gap_id TEXT PRIMARY KEY, run_id TEXT, task_id TEXT, severity TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recovery_actions (action_id TEXT PRIMARY KEY, run_id TEXT, task_id TEXT, status TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS source_snapshots (snapshot_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, partition TEXT, spec_hash TEXT, plan_hash TEXT, tasks_hash TEXT, created_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS projections (projection_id TEXT PRIMARY KEY, projection_type TEXT NOT NULL, scope_key TEXT NOT NULL, generated_at TEXT NOT NULL, payload_json TEXT NOT NULL, UNIQUE(projection_type, scope_key));
CREATE TABLE IF NOT EXISTS legacy_imports (import_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, entity_type TEXT NOT NULL, content_hash TEXT NOT NULL, imported_at TEXT NOT NULL, status TEXT NOT NULL, issue TEXT, UNIQUE(run_id, entity_type));
CREATE TABLE IF NOT EXISTS test_runs (test_run_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, partition TEXT, task_id TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS test_steps (test_step_id TEXT PRIMARY KEY, test_run_id TEXT NOT NULL, run_id TEXT NOT NULL, task_id TEXT NOT NULL, command TEXT NOT NULL, status TEXT NOT NULL, exit_code INTEGER, duration_ms INTEGER NOT NULL, output_artifact TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(test_run_id) REFERENCES test_runs(test_run_id) ON DELETE CASCADE, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_runs_partition_task_updated ON runs(partition, task_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_events_run_time ON events(run_id, event_time, event_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_run_path ON artifacts(run_id, path);
CREATE INDEX IF NOT EXISTS idx_evidence_claims_run_task ON evidence_claims(run_id, task_id, acceptance_id);
CREATE INDEX IF NOT EXISTS idx_evidence_attachments_branch_created ON evidence_attachments(branch_slug, created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_attachments_run_path ON evidence_attachments(run_id, relative_path);
CREATE INDEX IF NOT EXISTS idx_test_runs_run_task ON test_runs(run_id, task_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_test_steps_test_run ON test_steps(test_run_id, status);
`);
  db.exec(`PRAGMA user_version = ${RUNTIME_STORE_SCHEMA_VERSION}`);
  const now = new Date().toISOString();
  db.prepare('INSERT OR REPLACE INTO runtime_meta (key, value, updated_at) VALUES (?, ?, ?)').run('contract', RUNTIME_STORE_CONTRACT_VERSION, now);
  db.prepare('INSERT OR REPLACE INTO runtime_meta (key, value, updated_at) VALUES (?, ?, ?)').run('schema_version', String(RUNTIME_STORE_SCHEMA_VERSION), now);
}

function readRuntimeStoreSchemaVersion(db: RuntimeStoreDatabase): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version?: unknown } | undefined;
  return typeof row?.user_version === 'number' ? row.user_version : 0;
}

export async function recordRuntimeEvent(projectRoot: string, event: RuntimeEvent, source = 'runtime'): Promise<void> {
  const eventJson = JSON.stringify(event);
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare('INSERT OR IGNORE INTO events (run_id, event_time, event_name, event_hash, event_json, source) VALUES (?, ?, ?, ?, ?, ?)')
      .run(event.runId, event.time, event.event, hashDocumentContent(eventJson), eventJson, source);
  });
}

export async function importLegacyRunEventsIfNeeded(projectRoot: string, runId: string, eventPath: string): Promise<void> {
  if (!await exists(eventPath)) {
    return;
  }
  try {
    const raw = await readFile(eventPath, 'utf8');
    const contentHash = hashDocumentContent(raw);
    await withRuntimeStore(projectRoot, ({ db }) => {
      const legacy = db.prepare('SELECT content_hash FROM legacy_imports WHERE run_id = ? AND entity_type = ?').get(runId, 'events') as { content_hash?: string } | undefined;
      if (legacy?.content_hash === contentHash) {
        return;
      }
      for (const line of raw.split(/\r?\n/).filter((item) => item.trim().length > 0)) {
        const event = JSON.parse(line) as RuntimeEvent;
        const eventJson = JSON.stringify(event);
        db.prepare('INSERT OR IGNORE INTO events (run_id, event_time, event_name, event_hash, event_json, source) VALUES (?, ?, ?, ?, ?, ?)')
          .run(event.runId, event.time, event.event, hashDocumentContent(eventJson), eventJson, 'legacy');
      }
      db.prepare('INSERT OR REPLACE INTO legacy_imports (import_id, run_id, entity_type, content_hash, imported_at, status, issue) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(legacyImportId(runId, 'events'), runId, 'events', contentHash, new Date().toISOString(), 'imported', null);
    });
  } catch (error) {
    await recordLegacyImportFailure(projectRoot, runId, 'events', error);
    throw new RuntimeStoreError('LEGACY_IMPORT_FAILED', `Cannot import legacy events for ${runId}: ${messageFromError(error)}`, { cause: error });
  }
}

export async function readRuntimeRunEvents(projectRoot: string, runId: string): Promise<RuntimeEvent[]> {
  return withRuntimeStore(projectRoot, ({ db }) => {
    const rows = db.prepare('SELECT event_json FROM events WHERE run_id = ? ORDER BY event_time ASC, event_id ASC').all(runId) as Array<{ event_json: string }>;
    return rows.map((row) => JSON.parse(row.event_json) as RuntimeEvent);
  });
}

export async function upsertRuntimeRunState(projectRoot: string, state: RunState, serializedState: string): Promise<void> {
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare(`INSERT INTO runs (run_id, status, phase, current_task, partition, git_branch, task_id, created_at, updated_at, state_json, state_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO UPDATE SET status=excluded.status, phase=excluded.phase, current_task=excluded.current_task, partition=excluded.partition, git_branch=excluded.git_branch, task_id=excluded.task_id, updated_at=excluded.updated_at, state_json=excluded.state_json, state_hash=excluded.state_hash`)
      .run(state.runId, state.status, state.phase, state.currentTask, state.partition, state.gitBranch, state.taskId, state.createdAt, state.updatedAt, serializedState, hashDocumentContent(serializedState));
  });
}

export async function readRuntimeRunState(projectRoot: string, runId: string): Promise<RunState | null> {
  return withRuntimeStore(projectRoot, ({ db }) => {
    const row = db.prepare('SELECT state_json FROM runs WHERE run_id = ?').get(runId) as { state_json?: string } | undefined;
    return row?.state_json ? JSON.parse(row.state_json) as RunState : null;
  });
}

export async function listRuntimeRunStates(projectRoot: string): Promise<RunState[]> {
  return withRuntimeStore(projectRoot, ({ db }) => {
    const rows = db.prepare('SELECT state_json FROM runs ORDER BY updated_at DESC, run_id DESC').all() as Array<{ state_json: string }>;
    return rows.map((row) => JSON.parse(row.state_json) as RunState);
  });
}

export async function recordRuntimeActivity(projectRoot: string, entry: InvocationLedgerEntry): Promise<void> {
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare('INSERT OR REPLACE INTO activities (activity_id, run_id, task_id, branch, kind, ref, status, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(entry.entryId, entry.runId, entry.taskId ?? null, entry.branch ?? null, entry.kind, entry.ref, entry.status ?? null, entry.timestamp, JSON.stringify(entry));
  });
}

export async function readRuntimeActivities(projectRoot: string, runId: string): Promise<InvocationLedgerEntry[]> {
  return withRuntimeStore(projectRoot, ({ db }) => {
    const rows = db.prepare('SELECT payload_json FROM activities WHERE run_id = ? ORDER BY created_at ASC, activity_id ASC').all(runId) as Array<{ payload_json: string }>;
    return rows.map((row) => JSON.parse(row.payload_json) as InvocationLedgerEntry);
  });
}

export async function recordRuntimeEvidenceAttachment(projectRoot: string, input: { branchSlug: string; runId?: string | null; taskId?: string | null; kind: string; relativePath: string; contentHash: string; bytes: number; payload?: unknown }): Promise<void> {
  const now = new Date().toISOString();
  const payloadJson = JSON.stringify(input.payload ?? { relativePath: input.relativePath, kind: input.kind });
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare('INSERT OR REPLACE INTO evidence_attachments (evidence_id, branch_slug, run_id, task_id, kind, relative_path, content_hash, bytes, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(runtimeScopedId(input.branchSlug, input.runId ?? 'none', input.relativePath, input.contentHash), input.branchSlug, input.runId ?? null, input.taskId ?? null, input.kind, input.relativePath, input.contentHash, input.bytes, now, payloadJson);
  });
}

export async function recordRuntimeProjection(projectRoot: string, projectionType: string, scopeKey: string, payload: unknown): Promise<void> {
  const now = new Date().toISOString();
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare('INSERT OR REPLACE INTO projections (projection_id, projection_type, scope_key, generated_at, payload_json) VALUES (?, ?, ?, ?, ?)')
      .run(runtimeScopedId(projectionType, scopeKey), projectionType, scopeKey, now, JSON.stringify(payload));
  });
}

export type RuntimeProjectionEnvelopeWriteStatus = 'created' | 'updated' | 'unchanged';

export interface RuntimeProjectionEnvelopeInput<TPayload> {
  projectionType: string;
  scopeKey: string;
  inputHash: string;
  producer: string;
  producerVersion: string;
  payload: TPayload;
  generatedAt?: string;
}

export interface RuntimeProjectionEnvelopeWriteResult<TPayload> {
  envelope: RuntimeProjectionEnvelope<TPayload>;
  previous: RuntimeProjectionRecord | null;
  staleness: RuntimeProjectionStaleness;
  status: RuntimeProjectionEnvelopeWriteStatus;
}

export interface RuntimeProjectionFreshnessInput {
  inputHash: string;
  producerVersion: string;
}

export function buildRuntimeProjectionEnvelope<TPayload>(input: RuntimeProjectionEnvelopeInput<TPayload>): RuntimeProjectionEnvelope<TPayload> {
  return {
    contract: RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION,
    projectionType: input.projectionType,
    scopeKey: input.scopeKey,
    id: runtimeScopedId(input.projectionType, input.scopeKey, input.inputHash, input.producerVersion),
    inputHash: input.inputHash,
    producer: input.producer,
    producerVersion: input.producerVersion,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    payload: input.payload
  };
}

export async function recordRuntimeProjectionEnvelope<TPayload>(projectRoot: string, input: RuntimeProjectionEnvelopeInput<TPayload>): Promise<RuntimeProjectionEnvelopeWriteResult<TPayload>> {
  const candidate = buildRuntimeProjectionEnvelope(input);
  return withRuntimeStore(projectRoot, ({ db }) => {
    const previous = readRuntimeProjectionRecordFromDb(db, input.projectionType, input.scopeKey);
    const existingEnvelope = asRuntimeProjectionEnvelope<TPayload>(previous?.payload);
    const staleness = runtimeProjectionStaleness(existingEnvelope, input);
    if (existingEnvelope && staleness === 'fresh' && JSON.stringify(existingEnvelope.payload) === JSON.stringify(input.payload)) {
      return { envelope: existingEnvelope, previous, staleness, status: 'unchanged' };
    }
    db.prepare('INSERT OR REPLACE INTO projections (projection_id, projection_type, scope_key, generated_at, payload_json) VALUES (?, ?, ?, ?, ?)')
      .run(runtimeScopedId(input.projectionType, input.scopeKey), input.projectionType, input.scopeKey, candidate.generatedAt, JSON.stringify(candidate));
    return { envelope: candidate, previous, staleness, status: previous ? 'updated' : 'created' };
  });
}

export interface RuntimeProjectionRecord {
  projectionType: string;
  scopeKey: string;
  generatedAt: string;
  payload: unknown;
}

export async function readRuntimeProjection(projectRoot: string, projectionType: string, scopeKey: string): Promise<RuntimeProjectionRecord | null> {
  return withRuntimeStore(projectRoot, ({ db }) => readRuntimeProjectionRecordFromDb(db, projectionType, scopeKey));
}

export async function readRuntimeProjectionEnvelope<TPayload>(projectRoot: string, projectionType: string, scopeKey: string): Promise<RuntimeProjectionEnvelope<TPayload> | null> {
  const record = await readRuntimeProjection(projectRoot, projectionType, scopeKey);
  return asRuntimeProjectionEnvelope<TPayload>(record?.payload);
}

export function runtimeProjectionStaleness(envelope: RuntimeProjectionEnvelope<unknown> | null, freshness: RuntimeProjectionFreshnessInput): RuntimeProjectionStaleness {
  if (!envelope) {
    return 'unknown';
  }
  if (envelope.contract !== RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION || envelope.producerVersion !== freshness.producerVersion) {
    return 'incompatible';
  }
  return envelope.inputHash === freshness.inputHash ? 'fresh' : 'stale';
}

export async function listRuntimeProjections(projectRoot: string, projectionTypes: string[]): Promise<RuntimeProjectionRecord[]> {
  if (projectionTypes.length === 0) {
    return [];
  }
  const placeholders = projectionTypes.map(() => '?').join(', ');
  return withRuntimeStore(projectRoot, ({ db }) => {
    const rows = db.prepare(`SELECT projection_type, scope_key, generated_at, payload_json FROM projections WHERE projection_type IN (${placeholders}) ORDER BY generated_at DESC, projection_type ASC, scope_key ASC`)
      .all(...projectionTypes) as RuntimeProjectionRow[];
    return rows.map(runtimeProjectionRecordFromRow);
  });
}

export interface RuntimeTestRunRecord {
  testRunId: string;
  runId: string;
  partition: string | null;
  taskId: string;
  status: string;
  startedAt: string;
  completedAt: string;
  payload: unknown;
}

export interface RuntimeTestStepRecord {
  stepId: string;
  testRunId: string;
  runId: string;
  taskId: string;
  command: string;
  status: string;
  exitCode: number | null;
  durationMs: number;
  outputArtifact: string;
  payload: unknown;
}

export async function recordRuntimeTestRun(projectRoot: string, record: RuntimeTestRunRecord): Promise<void> {
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare('INSERT OR REPLACE INTO test_runs (test_run_id, run_id, partition, task_id, status, started_at, completed_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(record.testRunId, record.runId, record.partition, record.taskId, record.status, record.startedAt, record.completedAt, JSON.stringify(record.payload));
  });
}

export async function recordRuntimeTestStep(projectRoot: string, record: RuntimeTestStepRecord): Promise<void> {
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare('INSERT OR REPLACE INTO test_steps (test_step_id, test_run_id, run_id, task_id, command, status, exit_code, duration_ms, output_artifact, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(record.stepId, record.testRunId, record.runId, record.taskId, record.command, record.status, record.exitCode, record.durationMs, record.outputArtifact, JSON.stringify(record.payload));
  });
}

export async function listRuntimeTestRuns(projectRoot: string, runId?: string | null): Promise<RuntimeTestRunRecord[]> {
  return withRuntimeStore(projectRoot, ({ db }) => {
    const rows = runId
      ? db.prepare('SELECT test_run_id, run_id, partition, task_id, status, started_at, completed_at, payload_json FROM test_runs WHERE run_id = ? ORDER BY completed_at DESC').all(runId)
      : db.prepare('SELECT test_run_id, run_id, partition, task_id, status, started_at, completed_at, payload_json FROM test_runs ORDER BY completed_at DESC').all();
    return (rows as Array<{ test_run_id: string; run_id: string; partition: string | null; task_id: string; status: string; started_at: string; completed_at: string; payload_json: string }>).map((row) => ({
      testRunId: row.test_run_id,
      runId: row.run_id,
      partition: row.partition,
      taskId: row.task_id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      payload: JSON.parse(row.payload_json)
    }));
  });
}

export async function recordLegacyImportFailure(projectRoot: string, runId: string, entityType: string, error: unknown): Promise<void> {
  try {
    await withRuntimeStore(projectRoot, ({ db }) => {
      db.prepare('INSERT OR REPLACE INTO legacy_imports (import_id, run_id, entity_type, content_hash, imported_at, status, issue) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(legacyImportId(runId, entityType), runId, entityType, 'unavailable', new Date().toISOString(), 'failed', messageFromError(error));
    });
  } catch {
    return;
  }
}

export async function inspectRuntimeStoreEvidence(projectRoot: string): Promise<RuntimeStoreDoctorCheck[]> {
  try {
    return await withRuntimeStore(projectRoot, ({ path: storePath, db }) => {
      const versionRow = db.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined;
      const integrityRow = db.prepare('PRAGMA integrity_check').get() as { integrity_check?: string } | undefined;
      const schemaVersion = versionRow?.user_version ?? 0;
      if (schemaVersion !== RUNTIME_STORE_SCHEMA_VERSION) {
        return [{ level: 'FAIL', check: 'runtime_store', message: `Runtime store schema version ${schemaVersion} does not match expected ${RUNTIME_STORE_SCHEMA_VERSION}.`, action: 'Run a compatible sdd version or rebuild the runtime store from legacy .sdd/runs.' }];
      }
      if (integrityRow?.integrity_check !== 'ok') {
        return [{ level: 'FAIL', check: 'runtime_store', message: `Runtime store integrity check failed: ${integrityRow?.integrity_check ?? 'unknown'}.`, action: 'Rebuild runtime projections from legacy .sdd/runs after preserving the database for debugging.' }];
      }
      const checks: RuntimeStoreDoctorCheck[] = [{ level: 'PASS', check: 'runtime_store', message: `${RUNTIME_STORE_CONTRACT_VERSION} is available at ${storePath} with schema ${schemaVersion}.` }];
      const scopeLeak = db.prepare('SELECT COUNT(*) AS count FROM evidence_claims c JOIN runs r ON r.run_id = c.run_id WHERE c.partition IS NOT NULL AND r.partition IS NOT NULL AND c.partition <> r.partition').get() as { count?: number } | undefined;
      checks.push(((scopeLeak?.count ?? 0) > 0)
        ? { level: 'FAIL', check: 'runtime_partition_scope', message: `Runtime store has ${scopeLeak?.count ?? 0} cross-partition evidence claim(s).`, action: 'Reingest validator artifacts for the correct run partition; mismatched claims cannot satisfy PASS evidence.' }
        : { level: 'PASS', check: 'runtime_partition_scope', message: 'Runtime evidence claims match their run partition scope.' });
      const freshness = db.prepare('SELECT (SELECT MAX(updated_at) FROM runs) AS latest_run, (SELECT MAX(generated_at) FROM projections) AS latest_projection').get() as { latest_run?: string | null; latest_projection?: string | null } | undefined;
      checks.push(freshness?.latest_run && freshness?.latest_projection && freshness.latest_projection < freshness.latest_run
        ? { level: 'PASS', check: 'runtime_projection_freshness', message: `Latest runtime projection ${freshness.latest_projection} is older than latest run update ${freshness.latest_run}; views can be refreshed on demand.` }
        : { level: 'PASS', check: 'runtime_projection_freshness', message: freshness?.latest_projection ? 'Runtime projections are current with known run updates.' : 'No runtime projections have been materialized yet.' });
      const legacy = db.prepare("SELECT status, COUNT(*) AS count FROM legacy_imports GROUP BY status").all() as Array<{ status: string; count: number }>;
      const failedLegacy = legacy.find((row) => row.status === 'failed')?.count ?? 0;
      const importedLegacy = legacy.find((row) => row.status === 'imported')?.count ?? 0;
      checks.push(failedLegacy > 0
        ? { level: 'FAIL', check: 'runtime_legacy_import', message: `${failedLegacy} legacy import record(s) failed.`, action: 'Inspect legacy .sdd/runs files and repair malformed state/events/invocation evidence before test or sync-back.' }
        : importedLegacy > 0
          ? { level: 'PASS', check: 'runtime_legacy_import', message: `${importedLegacy} legacy runtime record(s) imported non-destructively; trust debt was preserved, not upgraded.` }
          : { level: 'PASS', check: 'runtime_legacy_import', message: 'No legacy runtime import debt detected.' });
      return checks;
    });
  } catch (error) {
    return [{ level: 'FAIL', check: 'runtime_store', message: `Runtime store unavailable: ${messageFromError(error)}`, action: 'Use a Node runtime with node:sqlite support and writable .sdd/runtime.sqlite.' }];
  }
}

interface RuntimeProjectionRow {
  projection_type: string;
  scope_key: string;
  generated_at: string;
  payload_json: string;
}

function readRuntimeProjectionRecordFromDb(db: RuntimeStoreDatabase, projectionType: string, scopeKey: string): RuntimeProjectionRecord | null {
  const row = db.prepare('SELECT projection_type, scope_key, generated_at, payload_json FROM projections WHERE projection_type = ? AND scope_key = ?').get(projectionType, scopeKey) as RuntimeProjectionRow | undefined;
  return row ? runtimeProjectionRecordFromRow(row) : null;
}

function runtimeProjectionRecordFromRow(row: RuntimeProjectionRow): RuntimeProjectionRecord {
  return {
    projectionType: row.projection_type,
    scopeKey: row.scope_key,
    generatedAt: row.generated_at,
    payload: JSON.parse(row.payload_json) as unknown
  };
}

function asRuntimeProjectionEnvelope<TPayload>(payload: unknown): RuntimeProjectionEnvelope<TPayload> | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const candidate = payload as Partial<RuntimeProjectionEnvelope<TPayload>>;
  return candidate.contract === RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION ? candidate as RuntimeProjectionEnvelope<TPayload> : null;
}

export function runtimeScopedId(...parts: string[]): string {
  return createHash('sha256').update(parts.join('\0'), 'utf8').digest('hex').slice(0, 32);
}

export function legacyImportId(runId: string, entityType: string): string {
  return runtimeScopedId(runId, entityType);
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}