import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getArtifactPath, getEvidenceAttachmentPath, getRunRelativeArtifactPath, normalizeArtifactRootRelativePath } from '../runtime-paths.js';
import { readRuntimeRunState, recordRuntimeEvidenceAttachment, runtimeScopedId, withRuntimeStore } from '../storage/runtime-store.js';
import { exists } from '../storage/json-io.js';
import { appendArtifactHashLedgerEntry } from './invocation-ledger.js';

export async function writeArtifact(projectRoot: string, runId: string, artifactRootRelativePath: string, content: string): Promise<{ absolutePath: string; runRelativePath: string }> {
  const normalized = normalizeArtifactRootRelativePath(artifactRootRelativePath);
  const runRelativePath = getRunRelativeArtifactPath(normalized);
  const branchSlug = await resolveRunBranchSlug(projectRoot, runId);
  const absolutePath = getEvidenceAttachmentPath(projectRoot, branchSlug, runRelativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  await appendArtifactHashLedgerEntry(projectRoot, {
    runId,
    artifactPath: runRelativePath,
    content,
    status: 'written'
  });
  await recordRuntimeArtifact(projectRoot, { runId, path: runRelativePath, content, status: 'written' });
  await recordRuntimeEvidenceAttachment(projectRoot, {
    branchSlug,
    runId,
    kind: artifactKind(runRelativePath),
    relativePath: runRelativePath,
    contentHash: hashDocumentContent(content),
    bytes: Buffer.byteLength(content, 'utf8'),
    payload: { artifactPath: runRelativePath, status: 'written' }
  });
  return { absolutePath, runRelativePath };
}

export async function readArtifact(projectRoot: string, runId: string, artifactRootRelativePath: string): Promise<string> {
  const normalized = normalizeArtifactRootRelativePath(artifactRootRelativePath);
  const runRelativePath = getRunRelativeArtifactPath(normalized);
  const evidencePath = getEvidenceAttachmentPath(projectRoot, await resolveRunBranchSlug(projectRoot, runId), runRelativePath);
  if (await exists(evidencePath)) {
    return readFile(evidencePath, 'utf8');
  }
  return readFile(getArtifactPath(projectRoot, runId, normalized), 'utf8');
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

async function resolveRunBranchSlug(projectRoot: string, runId: string): Promise<string> {
  const state = await readRuntimeRunState(projectRoot, runId);
  return state?.gitBranch ?? state?.partition ?? 'unscoped';
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}
