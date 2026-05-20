import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SDD_VERSION } from '@sdd-agent-platform/core/ai-tools';

export interface CliIdentity {
  version: string;
  cliEntryPath: string;
  packageRoot: string | null;
  packageJsonPath: string | null;
}

export function getCliIdentity(importMetaUrl: string): CliIdentity {
  const cliEntryPath = fileURLToPath(importMetaUrl);
  const packageRoot = findPackageRoot(path.dirname(cliEntryPath));
  const packageJsonPath = packageRoot ? path.join(packageRoot, 'package.json') : null;
  return {
    version: readPackageVersion(packageJsonPath) ?? SDD_VERSION,
    cliEntryPath,
    packageRoot,
    packageJsonPath
  };
}

function findPackageRoot(startDir: string): string | null {
  let current = startDir;
  while (true) {
    const packageJsonPath = path.join(current, 'package.json');
    if (existsSync(packageJsonPath) && isCliPackageRoot(packageJsonPath)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function isCliPackageRoot(packageJsonPath: string): boolean {
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: unknown };
    return parsed.name === '@sdd-agent-platform/cli' || parsed.name === 'sdd-agent-platform';
  } catch {
    return false;
  }
}

function readPackageVersion(packageJsonPath: string | null): string | null {
  if (!packageJsonPath) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : null;
  } catch {
    return null;
  }
}
