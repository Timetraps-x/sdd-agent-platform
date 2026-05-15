import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getArtifactPath, getRunRelativeArtifactPath, normalizeArtifactRootRelativePath } from '../runtime-paths.js';
import { runtimeScopedId, withRuntimeStore } from '../storage/runtime-store.js';
import { appendArtifactHashLedgerEntry } from './invocation-ledger.js';

export async function writeArtifact(projectRoot: string, runId: string, artifactRootRelativePath: string, content: string): Promise<{ absolutePath: string; runRelativePath: string }> {
  const normalized = normalizeArtifactRootRelativePath(artifactRootRelativePath);
  const absolutePath = getArtifactPath(projectRoot, runId, normalized);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  const runRelativePath = getRunRelativeArtifactPath(normalized);
  await appendArtifactHashLedgerEntry(projectRoot, {
    runId,
    artifactPath: runRelativePath,
    content,
    status: 'written'
  });
  await recordRuntimeArtifact(projectRoot, { runId, path: runRelativePath, content, status: 'written' });
  return { absolutePath, runRelativePath };
}

export async function readArtifact(projectRoot: string, runId: string, artifactRootRelativePath: string): Promise<string> {
  return readFile(getArtifactPath(projectRoot, runId, normalizeArtifactRootRelativePath(artifactRootRelativePath)), 'utf8');
}

export function artifactKind(artifactPath: string): string {
  const fileName = path.posix.basename(artifactPath.replace(/\\/g, '/'));
  if (fileName.startsWith('implement-')) {
    return 'implement';
  }
  if (fileName.startsWith('review-')) {
    return 'review';
  }
  if (fileName.startsWith('debug-')) {
    return 'debug';
  }
  if (fileName.startsWith('validation-')) {
    return 'validation';
  }
  if (fileName.startsWith('gap-report-')) {
    return 'gap-report';
  }
  if (fileName === 'sync-back-proposal.md') {
    return 'sync-back-proposal';
  }
  return 'artifact';
}

async function recordRuntimeArtifact(projectRoot: string, input: { runId: string; path: string; content: string; status: string; taskId?: string | null; agent?: string | null }): Promise<void> {
  const contentHash = hashDocumentContent(input.content);
  const now = new Date().toISOString();
  const payload = JSON.stringify({ path: input.path, status: input.status, taskId: input.taskId ?? null, agent: input.agent ?? null });
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare('INSERT OR REPLACE INTO artifacts (artifact_id, run_id, path, kind, task_id, agent, content_hash, bytes, status, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(runtimeScopedId(input.runId, input.path, contentHash), input.runId, input.path, artifactKind(input.path), input.taskId ?? null, input.agent ?? null, contentHash, Buffer.byteLength(input.content, 'utf8'), input.status, now, payload);
  });
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}
