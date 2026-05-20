import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { parseProjectConfig } from '../config/project-config.js';
import { assertSafePathSegment } from '../path-safety.js';
import { appendEvent } from '../run-state/events.js';
import { readRunState, writeRunState } from '../run-state/run-state.js';
import { getProjectConfigPath, getWorktreesDir } from '../runtime-paths.js';
import { exists } from '../storage/json-io.js';
import { inspectWorktreeIsolation } from './isolation.js';

const execFileAsync = promisify(execFile);

export const WORKTREE_LIFECYCLE_CONTRACT_VERSION = 'phase-3.8-worktree-lifecycle-v1';

export interface WorktreeLifecycleIssue {
  field: string;
  message: string;
  recommendation: string;
}

export type WorktreeLifecycleStatus = 'created' | 'kept' | 'removed';

export interface WorktreeLifecycleRecord {
  contract: typeof WORKTREE_LIFECYCLE_CONTRACT_VERSION;
  runId: string;
  taskId: string;
  worktreeId: string;
  status: WorktreeLifecycleStatus;
  branchName: string;
  worktreePath: string;
  baseRef: string;
  createdAt: string;
  updatedAt: string;
  removedAt: string | null;
  keepReason: string | null;
  dirty: boolean;
}

export interface WorktreeLifecycleInspection {
  runId: string;
  contract: typeof WORKTREE_LIFECYCLE_CONTRACT_VERSION;
  records: WorktreeLifecycleRecord[];
  valid: boolean;
  issues: WorktreeLifecycleIssue[];
}

export async function createWorktreeLifecycle(projectRoot: string, runId: string, options: { taskId: string; baseRef?: string; worktreeId?: string }): Promise<WorktreeLifecycleRecord> {
  await assertProjectConfigReadable(projectRoot);
  const state = await readRunState(projectRoot, runId);
  const decision = await inspectWorktreeIsolation(projectRoot, { taskId: options.taskId });
  if (decision.mode === 'blocked' || decision.mode === 'none') {
    throw new Error(`Cannot create worktree for ${options.taskId}: isolation mode is ${decision.mode}.`);
  }
  const gitRoot = await getGitRoot(projectRoot);
  if (!gitRoot) {
    throw new Error('Cannot create worktree outside a Git repository.');
  }

  const worktreeId = options.worktreeId ?? defaultWorktreeId(runId, options.taskId);
  assertSafePathSegment(worktreeId, 'worktreeId');
  const currentWorktrees = state.worktrees ?? {};
  const existing = currentWorktrees[worktreeId];
  if (existing && existing.status !== 'removed') {
    throw new Error(`Worktree ${worktreeId} already exists for run ${runId}.`);
  }

  const baseRef = options.baseRef ?? 'HEAD';
  const branchName = `sdd-${worktreeId}`;
  const worktreePath = path.join(getWorktreesDir(projectRoot), worktreeId);
  await mkdir(path.dirname(worktreePath), { recursive: true });
  await execFileAsync('git', ['-C', projectRoot, 'worktree', 'add', '-b', branchName, worktreePath, baseRef]);

  const now = new Date().toISOString();
  const record: WorktreeLifecycleRecord = {
    contract: WORKTREE_LIFECYCLE_CONTRACT_VERSION,
    runId,
    taskId: options.taskId,
    worktreeId,
    status: 'created',
    branchName,
    worktreePath: path.relative(projectRoot, worktreePath),
    baseRef,
    createdAt: now,
    updatedAt: now,
    removedAt: null,
    keepReason: null,
    dirty: false
  };
  await writeRunState(projectRoot, { ...state, worktrees: { ...currentWorktrees, [worktreeId]: record } });
  await appendEvent(projectRoot, runId, {
    event: 'worktree_created',
    runId,
    summary: `Worktree ${worktreeId} created for ${options.taskId}.`,
    data: { worktreeId, taskId: options.taskId, path: record.worktreePath, branchName, baseRef }
  });
  return record;
}

export async function inspectWorktreeLifecycle(projectRoot: string, runId: string): Promise<WorktreeLifecycleInspection> {
  const state = await readRunState(projectRoot, runId);
  const records = await Promise.all(Object.values(state.worktrees ?? {}).map(async (record) => ({
    ...record,
    dirty: record.status === 'removed' ? false : await isGitWorktreeDirty(projectRoot, record.worktreePath)
  })));
  const issues: WorktreeLifecycleIssue[] = [];
  const activePaths = new Set(records.filter((record) => record.status !== 'removed').map((record) => normalizeComparablePath(record.worktreePath)));
  const registeredPaths = await listGitWorktreePaths(projectRoot);

  for (const record of records) {
    const absolutePath = path.resolve(projectRoot, record.worktreePath);
    const comparablePath = normalizeComparablePath(record.worktreePath);
    const pathExists = await exists(absolutePath);
    if (record.contract !== WORKTREE_LIFECYCLE_CONTRACT_VERSION) {
      issues.push(lifecycleIssue('contract', `${record.worktreeId} uses ${record.contract}.`, `Use ${WORKTREE_LIFECYCLE_CONTRACT_VERSION}.`));
    }
    if (record.status !== 'removed' && !pathExists) {
      issues.push(lifecycleIssue('worktreePath', `${record.worktreeId} points to missing worktree path ${record.worktreePath}.`, 'Inspect worktree state and mark removed only through lifecycle remove.'));
    }
    if (record.status !== 'removed' && pathExists && !registeredPaths.has(normalizeComparablePath(absolutePath))) {
      issues.push(lifecycleIssue('worktreePath', `${record.worktreeId} path is not registered in git worktree list.`, 'Inspect git worktree list and reconcile lifecycle state.'));
    }
    if (record.status === 'removed' && pathExists) {
      issues.push(lifecycleIssue('status', `${record.worktreeId} is removed in state but path still exists.`, 'Inspect the path before deleting anything manually.'));
    }
    if (record.status !== 'removed' && record.dirty) {
      issues.push(lifecycleIssue('dirty', `${record.worktreeId} has uncommitted changes.`, 'Keep the worktree or resolve changes before lifecycle remove.'));
    }
    if (record.status !== 'removed' && activePaths.has(comparablePath) && Array.from(activePaths).filter((item) => item === comparablePath).length > 1) {
      issues.push(lifecycleIssue('worktreePath', `${record.worktreeId} shares a path with another active worktree.`, 'Use one lifecycle record per worktree path.'));
    }
  }

  for (const orphanPath of await listOrphanWorktreeDirs(projectRoot, activePaths)) {
    issues.push(lifecycleIssue('orphan', `${orphanPath} exists without active lifecycle state.`, 'Inspect the directory before removing it or recreate lifecycle state.'));
  }

  return {
    runId,
    contract: WORKTREE_LIFECYCLE_CONTRACT_VERSION,
    records,
    valid: issues.length === 0,
    issues
  };
}

export async function keepWorktreeLifecycle(projectRoot: string, runId: string, worktreeId: string, options: { reason?: string } = {}): Promise<WorktreeLifecycleRecord> {
  assertSafePathSegment(worktreeId, 'worktreeId');
  const state = await readRunState(projectRoot, runId);
  const record = (state.worktrees ?? {})[worktreeId];
  if (!record) {
    throw new Error(`Unknown worktree ${worktreeId} for run ${runId}.`);
  }
  const now = new Date().toISOString();
  const nextRecord: WorktreeLifecycleRecord = {
    ...record,
    status: 'kept',
    updatedAt: now,
    keepReason: options.reason ?? 'kept for later inspection',
    dirty: await isGitWorktreeDirty(projectRoot, record.worktreePath)
  };
  await writeRunState(projectRoot, { ...state, worktrees: { ...(state.worktrees ?? {}), [worktreeId]: nextRecord } });
  await appendEvent(projectRoot, runId, {
    event: 'worktree_kept',
    runId,
    summary: `Worktree ${worktreeId} kept.`,
    data: { worktreeId, reason: nextRecord.keepReason, dirty: nextRecord.dirty }
  });
  return nextRecord;
}

export async function removeWorktreeLifecycle(projectRoot: string, runId: string, worktreeId: string): Promise<WorktreeLifecycleRecord> {
  assertSafePathSegment(worktreeId, 'worktreeId');
  const state = await readRunState(projectRoot, runId);
  const record = (state.worktrees ?? {})[worktreeId];
  if (!record) {
    throw new Error(`Unknown worktree ${worktreeId} for run ${runId}.`);
  }
  if (record.status === 'removed') {
    return record;
  }
  const dirty = await isGitWorktreeDirty(projectRoot, record.worktreePath);
  if (dirty) {
    throw new Error(`Refusing to remove dirty worktree ${worktreeId}. Commit, stash, or keep it first.`);
  }
  await execFileAsync('git', ['-C', projectRoot, 'worktree', 'remove', path.resolve(projectRoot, record.worktreePath)]);
  const now = new Date().toISOString();
  const nextRecord: WorktreeLifecycleRecord = {
    ...record,
    status: 'removed',
    updatedAt: now,
    removedAt: now,
    dirty: false
  };
  await writeRunState(projectRoot, { ...state, worktrees: { ...(state.worktrees ?? {}), [worktreeId]: nextRecord } });
  await appendEvent(projectRoot, runId, {
    event: 'worktree_removed',
    runId,
    summary: `Worktree ${worktreeId} removed.`,
    data: { worktreeId, path: record.worktreePath }
  });
  return nextRecord;
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}

function defaultWorktreeId(runId: string, taskId: string): string {
  return `wt-${runId}-${taskId}`.replace(/[^A-Za-z0-9._-]/g, '-');
}

async function isGitWorktreeDirty(projectRoot: string, worktreePath: string): Promise<boolean> {
  const absolutePath = path.resolve(projectRoot, worktreePath);
  if (!await exists(absolutePath)) {
    return false;
  }
  try {
    const result = await execFileAsync('git', ['-C', absolutePath, 'status', '--porcelain']);
    return result.stdout.trim().length > 0;
  } catch {
    return true;
  }
}

async function listGitWorktreePaths(projectRoot: string): Promise<Set<string>> {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, 'worktree', 'list', '--porcelain']);
    return new Set(result.stdout.split(/\r?\n/).filter((line) => line.startsWith('worktree ')).map((line) => normalizeComparablePath(path.resolve(line.slice('worktree '.length)))));
  } catch {
    return new Set();
  }
}

async function listOrphanWorktreeDirs(projectRoot: string, activePaths: Set<string>): Promise<string[]> {
  const worktreesDir = getWorktreesDir(projectRoot);
  if (!await exists(worktreesDir)) {
    return [];
  }
  const entries = await readdir(worktreesDir, { withFileTypes: true });
  const orphans: string[] = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const relativePath = path.relative(projectRoot, path.join(worktreesDir, entry.name));
    if (!activePaths.has(normalizeComparablePath(relativePath))) {
      orphans.push(relativePath);
    }
  }
  return orphans;
}

async function getGitRoot(projectRoot: string): Promise<string | null> {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel']);
    return result.stdout.trim();
  } catch {
    return null;
  }
}

function normalizeComparablePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function lifecycleIssue(field: string, message: string, recommendation: string): WorktreeLifecycleIssue {
  return { field, message, recommendation };
}
