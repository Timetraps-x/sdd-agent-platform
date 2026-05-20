import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { INVOCATION_LEDGER_CONTRACT_VERSION } from '../contracts.js';
import { getInvocationLedgerPath } from '../runtime-paths.js';
import { exists } from '../storage/json-io.js';
import { RuntimeStoreError, legacyImportId, readRuntimeActivities, recordLegacyImportFailure, recordRuntimeActivity, withRuntimeStore } from '../storage/runtime-store.js';
import type { InvocationLedgerEntry } from './model.js';

export async function appendInvocationLedgerEntry(projectRoot: string, input: Omit<InvocationLedgerEntry, 'contract' | 'version' | 'entryId' | 'timestamp'>): Promise<InvocationLedgerEntry> {
  const timestamp = new Date().toISOString();
  const entry: InvocationLedgerEntry = {
    contract: 'sdd-invocation-ledger-v1',
    version: INVOCATION_LEDGER_CONTRACT_VERSION,
    entryId: createHash('sha256').update(`${input.runId}:${input.kind}:${input.ref}:${timestamp}`).digest('hex').slice(0, 16),
    timestamp,
    ...input
  };
  await recordRuntimeActivity(projectRoot, entry);
  return entry;
}

export async function listInvocationLedgerEntries(projectRoot: string, runId: string): Promise<InvocationLedgerEntry[]> {
  const entries = await readRuntimeActivities(projectRoot, runId);
  if (entries.length > 0) {
    return entries;
  }
  const ledgerPath = getInvocationLedgerPath(projectRoot, runId);
  await importLegacyInvocationLedgerIfNeeded(projectRoot, runId, ledgerPath);
  return readRuntimeActivities(projectRoot, runId);
}

export async function appendArtifactHashLedgerEntry(projectRoot: string, input: { runId: string; taskId?: string | null; branch?: string | null; artifactPath: string; content: string; status?: string }): Promise<InvocationLedgerEntry> {
  return appendUniqueInvocationLedgerEntry(projectRoot, {
    runId: input.runId,
    taskId: input.taskId ?? null,
    branch: input.branch ?? null,
    kind: 'artifact_hash',
    ref: input.artifactPath,
    status: input.status ?? 'observed',
    artifactPath: input.artifactPath,
    outputHash: hashDocumentContent(input.content),
    materialRefs: [],
    metadata: { bytes: Buffer.byteLength(input.content, 'utf8') }
  });
}

export async function appendUniqueInvocationLedgerEntry(projectRoot: string, input: Omit<InvocationLedgerEntry, 'contract' | 'version' | 'entryId' | 'timestamp'>): Promise<InvocationLedgerEntry> {
  const existing = await findMatchingInvocationLedgerEntry(projectRoot, input);
  if (existing) {
    return existing;
  }
  return appendInvocationLedgerEntry(projectRoot, input);
}

export async function appendDeclaredCommandLedgerEntries(projectRoot: string, input: { runId: string; taskId: string; branch: string; commands: string[] }): Promise<void> {
  for (const command of input.commands) {
    await appendUniqueInvocationLedgerEntry(projectRoot, {
      runId: input.runId,
      taskId: input.taskId,
      branch: input.branch,
      kind: 'command',
      ref: command,
      status: 'declared',
      materialRefs: [],
      metadata: { source: 'task.validation' }
    });
  }
}

async function importLegacyInvocationLedgerIfNeeded(projectRoot: string, runId: string, ledgerPath: string): Promise<void> {
  if (!await exists(ledgerPath)) {
    return;
  }
  try {
    const raw = await readFile(ledgerPath, 'utf8');
    const contentHash = hashDocumentContent(raw);
    await withRuntimeStore(projectRoot, ({ db }) => {
      const legacy = db.prepare('SELECT content_hash FROM legacy_imports WHERE run_id = ? AND entity_type = ?').get(runId, 'invocations') as { content_hash?: string } | undefined;
      if (legacy?.content_hash === contentHash) {
        return;
      }
      for (const line of raw.split(/\r?\n/).filter(Boolean)) {
        const entry = JSON.parse(line) as InvocationLedgerEntry;
        db.prepare('INSERT OR REPLACE INTO activities (activity_id, run_id, task_id, branch, kind, ref, status, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(entry.entryId, entry.runId, entry.taskId ?? null, entry.branch ?? null, entry.kind, entry.ref, entry.status ?? null, entry.timestamp, JSON.stringify(entry));
      }
      db.prepare('INSERT OR REPLACE INTO legacy_imports (import_id, run_id, entity_type, content_hash, imported_at, status, issue) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(legacyImportId(runId, 'invocations'), runId, 'invocations', contentHash, new Date().toISOString(), 'imported', null);
    });
  } catch (error) {
    await recordLegacyImportFailure(projectRoot, runId, 'invocations', error);
    throw new RuntimeStoreError('LEGACY_IMPORT_FAILED', `Cannot import legacy invocation ledger for ${runId}: ${messageFromError(error)}`, { cause: error });
  }
}

async function findMatchingInvocationLedgerEntry(projectRoot: string, input: Omit<InvocationLedgerEntry, 'contract' | 'version' | 'entryId' | 'timestamp'>): Promise<InvocationLedgerEntry | null> {
  const entries = await listInvocationLedgerEntries(projectRoot, input.runId);
  return entries.find((entry) => entry.kind === input.kind && entry.ref === input.ref && entry.status === input.status && entry.outputHash === input.outputHash) ?? null;
}



function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
