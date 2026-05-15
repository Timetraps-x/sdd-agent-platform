import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { getRuntimeStorePath, getSddDir } from '../runtime-paths.js';
import { exists } from './json-io.js';
import type { RuntimeEvent } from '../run-state/model.js';


export const RUNTIME_STORE_SCHEMA_VERSION = 1;
export const RUNTIME_STORE_CONTRACT_VERSION = 'phase-6.11-runtime-store-v1';

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
CREATE TABLE IF NOT EXISTS gaps (gap_id TEXT PRIMARY KEY, run_id TEXT, task_id TEXT, severity TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recovery_actions (action_id TEXT PRIMARY KEY, run_id TEXT, task_id TEXT, status TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS source_snapshots (snapshot_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, partition TEXT, spec_hash TEXT, plan_hash TEXT, tasks_hash TEXT, created_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(run_id) REFERENCES runs(run_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS projections (projection_id TEXT PRIMARY KEY, projection_type TEXT NOT NULL, scope_key TEXT NOT NULL, generated_at TEXT NOT NULL, payload_json TEXT NOT NULL, UNIQUE(projection_type, scope_key));
CREATE TABLE IF NOT EXISTS legacy_imports (import_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, entity_type TEXT NOT NULL, content_hash TEXT NOT NULL, imported_at TEXT NOT NULL, status TEXT NOT NULL, issue TEXT, UNIQUE(run_id, entity_type));
CREATE INDEX IF NOT EXISTS idx_runs_partition_task_updated ON runs(partition, task_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_events_run_time ON events(run_id, event_time, event_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_run_path ON artifacts(run_id, path);
CREATE INDEX IF NOT EXISTS idx_evidence_claims_run_task ON evidence_claims(run_id, task_id, acceptance_id);
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

export async function recordRuntimeProjection(projectRoot: string, projectionType: string, scopeKey: string, payload: unknown): Promise<void> {
  const now = new Date().toISOString();
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare('INSERT OR REPLACE INTO projections (projection_id, projection_type, scope_key, generated_at, payload_json) VALUES (?, ?, ?, ?, ?)')
      .run(runtimeScopedId(projectionType, scopeKey), projectionType, scopeKey, now, JSON.stringify(payload));
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
        ? { level: 'FAIL', check: 'runtime_legacy_import', message: `${failedLegacy} legacy import record(s) failed.`, action: 'Inspect legacy .sdd/runs files and repair malformed state/events/invocation evidence before verify or sync-back.' }
        : importedLegacy > 0
          ? { level: 'PASS', check: 'runtime_legacy_import', message: `${importedLegacy} legacy runtime record(s) imported non-destructively; trust debt was preserved, not upgraded.` }
          : { level: 'PASS', check: 'runtime_legacy_import', message: 'No legacy runtime import debt detected.' });
      return checks;
    });
  } catch (error) {
    return [{ level: 'FAIL', check: 'runtime_store', message: `Runtime store unavailable: ${messageFromError(error)}`, action: 'Use a Node runtime with node:sqlite support and writable .sdd/runtime.sqlite.' }];
  }
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