import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { PROJECT_CONFIG_CONTRACT } from '../../contracts.js';
import { messageFromError } from '../../contracts/issues.js';
import { readProjectConfig as readProjectConfigFile } from '../../config/project-config.js';
import { getProjectConfigPath, getRunsDir } from '../../runtime-paths.js';
import type { ProjectAgentRuntimeConfig } from '../../router/agent-runtime.js';
import { parseAgentRuntimeConfig } from '../../router/agent-runtime-config.js';
import { exists } from '../../storage/json-io.js';
import type { DoctorCheck } from '../model.js';

const execFileAsync = promisify(execFile);

export async function inspectGitRepository(projectRoot: string): Promise<DoctorCheck[]> {
  const gitRoot = await getGitRoot(projectRoot);
  return [gitRoot
    ? { level: 'PASS', check: 'git_repo', message: `Git repository detected at ${gitRoot}` }
    : { level: 'FAIL', check: 'git_repo', message: 'Current directory is not inside a Git repository; doctor and run-index checks expect git context.', action: 'Run from a project Git repository, or run git init first for a fresh temporary/project sandbox.' }];
}

export async function inspectProjectConfig(projectRoot: string): Promise<{ exists: boolean; checks: DoctorCheck[] }> {
  const configPath = getProjectConfigPath(projectRoot);
  if (!(await exists(configPath))) {
    return {
      exists: false,
      checks: [{ level: 'FAIL', check: 'project_config', message: '.sdd/project.yml is missing.', action: 'Run sdd init.' }]
    };
  }

  try {
    await readProjectConfigFile<ProjectAgentRuntimeConfig>(projectRoot, parseAgentRuntimeConfig);
    return {
      exists: true,
      checks: [{ level: 'PASS', check: 'project_config', message: `.sdd/project.yml is readable and uses ${PROJECT_CONFIG_CONTRACT}.` }]
    };
  } catch (error) {
    return {
      exists: true,
      checks: [{ level: 'FAIL', check: 'project_config', message: `Cannot parse .sdd/project.yml: ${messageFromError(error)}`, action: 'Run sdd init or fix the required project.yml keys.' }]
    };
  }
}

export async function inspectRunsDirectoryAccess(projectRoot: string): Promise<{ available: boolean; checks: DoctorCheck[] }> {
  const runsDir = getRunsDir(projectRoot);
  if (!(await exists(runsDir))) {
    return {
      available: false,
      checks: [{ level: 'WARN', check: 'runs_dir', message: '.sdd/runs does not exist yet.', action: 'Run sdd init or sdd run create.' }]
    };
  }

  try {
    await access(runsDir, constants.R_OK | constants.W_OK);
    return {
      available: true,
      checks: [{ level: 'PASS', check: 'runs_dir', message: '.sdd/runs exists and is readable/writable.' }]
    };
  } catch {
    return {
      available: false,
      checks: [{ level: 'FAIL', check: 'runs_dir', message: '.sdd/runs is not readable/writable.', action: 'Fix filesystem permissions for .sdd/runs.' }]
    };
  }
}

export async function inspectSpecsDirectory(projectRoot: string): Promise<DoctorCheck[]> {
  const specsDir = path.join(projectRoot, 'specs');
  return [await exists(specsDir)
    ? { level: 'PASS', check: 'specs_dir', message: 'specs directory exists.' }
    : { level: 'WARN', check: 'specs_dir', message: 'specs directory is missing.', action: 'Create specs/<branch>/ documents before full SDD execution.' }];
}

async function getGitRoot(projectRoot: string): Promise<string | null> {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel']);
    return result.stdout.trim();
  } catch {
    return null;
  }
}
