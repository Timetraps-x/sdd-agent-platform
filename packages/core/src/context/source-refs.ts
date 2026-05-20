import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { exists } from '../storage/json-io.js';
import { normalizePortablePath } from '../path-safety.js';

export type ContextSourceKind = 'artifact' | 'run_state' | 'ledger' | 'document' | 'command_output' | 'derived';

export interface ContextSourceRef {
  path: string;
  hash: string;
  kind: ContextSourceKind;
}

export async function contextSourceRefForProjectPath(projectRoot: string, relativePath: string, kind: ContextSourceKind): Promise<ContextSourceRef> {
  const normalized = normalizePortablePath(relativePath);
  return contextSourceRefForAbsolutePath(projectRoot, path.join(projectRoot, normalized), kind, normalized);
}

export async function contextSourceRefForAbsolutePath(projectRoot: string, absolutePath: string, kind: ContextSourceKind, displayPath?: string): Promise<ContextSourceRef> {
  const relativePath = displayPath ?? normalizePortablePath(path.relative(projectRoot, absolutePath));
  if (!relativePath || relativePath.startsWith('../') || path.isAbsolute(relativePath)) {
    return { path: normalizePortablePath(absolutePath), hash: hashDocumentContent(`external:${absolutePath}`), kind };
  }
  if (!await exists(absolutePath)) {
    return { path: relativePath, hash: hashDocumentContent(`missing:${relativePath}`), kind };
  }
  const fileStat = await stat(absolutePath);
  if (fileStat.isDirectory()) {
    return { path: relativePath, hash: hashDocumentContent(`directory:${relativePath}`), kind };
  }
  return { path: relativePath, hash: hashDocumentContent(await readFile(absolutePath, 'utf8')), kind };
}

export function uniqueContextSourceRefs(refs: ContextSourceRef[]): ContextSourceRef[] {
  return [...new Map(refs.map((ref) => [`${ref.kind}:${ref.path}`, ref])).values()];
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}
