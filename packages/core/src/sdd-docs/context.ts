import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { CONTEXT_RESOLVER_CONTRACT_VERSION } from '../contracts.js';
import { branchToSafePartition, normalizePortablePath, safeBranchOrNull } from '../path-safety.js';
import { getProjectConfigPath } from '../runtime-paths.js';
import type { RunState } from '../run-state/model.js';
import { parseProjectConfig } from '../config/project-config.js';

const execFileAsync = promisify(execFile);

export type ContextBranchSource = 'explicit_option' | 'cli_option' | 'project_config' | 'git_branch';

export interface ContextResolverContract {
  contract: typeof CONTEXT_RESOLVER_CONTRACT_VERSION;
  branch: string;
  partition: string;
  rawBranch: string;
  branchSource: ContextBranchSource;
  currentGitBranch: string | null;
  workingTreeMatched: boolean | null;
  specDir: string;
}

export async function resolveSddContext(projectRoot: string, options: { branch?: string | null; branchSource?: ContextBranchSource } = {}): Promise<ContextResolverContract> {
  const currentGitBranch = await getCurrentGitBranch(projectRoot);
  const requestedBranch = options.branch?.trim();
  if (requestedBranch) {
    return resolvedContext(projectRoot, requestedBranch, options.branchSource ?? 'explicit_option', currentGitBranch);
  }

  if (currentGitBranch) {
    return resolvedContext(projectRoot, currentGitBranch, 'git_branch', currentGitBranch);
  }

  const projectConfigBranch = await resolveProjectConfigBranch(projectRoot);
  if (projectConfigBranch) {
    return resolvedContext(projectRoot, projectConfigBranch, 'project_config', currentGitBranch);
  }

  throw new Error('Cannot resolve SDD branch. Run from a Git branch, pass --branch <branch>, or set sdd.default_branch in .sdd/project.yml. /sdd:spec is the workflow partition entry.');
}

export async function resolveRunStateContext(projectRoot: string, state: RunState): Promise<ContextResolverContract> {
  if (!state.partition && !state.gitBranch) {
    return resolveSddContext(projectRoot);
  }

  const currentGitBranch = await getCurrentGitBranch(projectRoot);
  const partition = state.partition ?? branchToSafePartition(state.gitBranch ?? '');
  const rawBranch = state.gitBranch ?? state.partition ?? partition;
  return {
    contract: CONTEXT_RESOLVER_CONTRACT_VERSION,
    branch: partition,
    partition,
    rawBranch,
    branchSource: 'explicit_option',
    currentGitBranch,
    workingTreeMatched: currentGitBranch ? currentGitBranch === rawBranch : null,
    specDir: normalizePortablePath(path.relative(projectRoot, path.join(projectRoot, 'specs', partition)))
  };
}

function resolvedContext(projectRoot: string, rawBranch: string, branchSource: ContextBranchSource, currentGitBranch: string | null): ContextResolverContract {
  const partition = branchToSafePartition(rawBranch);
  return {
    contract: CONTEXT_RESOLVER_CONTRACT_VERSION,
    branch: partition,
    partition,
    rawBranch,
    branchSource,
    currentGitBranch,
    workingTreeMatched: currentGitBranch ? currentGitBranch === rawBranch : null,
    specDir: normalizePortablePath(path.relative(projectRoot, path.join(projectRoot, 'specs', partition)))
  };
}

async function resolveProjectConfigBranch(projectRoot: string): Promise<string | null> {
  try {
    const configPath = getProjectConfigPath(projectRoot);
    const raw = await readFile(configPath, 'utf8');
    const config = parseProjectConfig(raw, configPath);
    const defaultBranch = safeBranchOrNull(config.sdd.default_branch ?? '');
    if (defaultBranch) {
      return defaultBranch;
    }

    const specDir = normalizePortablePath(config.sdd.spec_dir);
    if (specDir.includes('<branch>')) {
      return null;
    }
    const parts = specDir.split('/');
    if (parts.length === 2 && parts[0] === 'specs') {
      return safeBranchOrNull(parts[1]);
    }
    return null;
  } catch {
    return null;
  }
}

async function getCurrentGitBranch(projectRoot: string): Promise<string | null> {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, 'branch', '--show-current']);
    const branch = result.stdout.trim();
    return branch.length > 0 ? branch : null;
  } catch {
    return null;
  }
}
