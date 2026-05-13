import { createHash } from 'node:crypto';
import path from 'node:path';

export function assertSafePathSegment(value: string, field: string): void {
  if (value === '.' || value === '..') {
    throw new Error(`${field} cannot be . or ...`);
  }
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(`${field} must contain only letters, digits, dot, underscore, or dash.`);
  }
}

export function safeBranchOrNull(branch: string): string | null {
  try {
    assertSafePathSegment(branch, 'branch');
    return branch;
  } catch {
    return null;
  }
}

export function branchToSafePartition(branch: string): string {
  const trimmed = branch.trim();
  const safe = safeBranchOrNull(trimmed);
  if (safe) {
    return safe;
  }
  const hash = createHash('sha256').update(trimmed).digest('hex').slice(0, 8);
  const slug = trimmed.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  const candidate = slug && slug !== '.' && slug !== '..' ? `${slug}-${hash}` : `branch-${hash}`;
  assertSafePathSegment(candidate, 'partition');
  return candidate;
}

export function normalizePortablePath(value: string): string {
  return path.posix.normalize(value.replace(/\\/g, '/'));
}
