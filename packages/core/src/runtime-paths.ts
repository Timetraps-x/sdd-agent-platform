import path from 'node:path';
import { assertSafePathSegment, branchToSafePartition, normalizePortablePath } from './path-safety.js';

export function getWorktreesDir(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'worktrees');
}

export function getSddDir(projectRoot: string): string {
  return path.join(projectRoot, '.sdd');
}

export function getProjectConfigPath(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'project.yml');
}

export function getRunsDir(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'runs');
}

export function getLocalRunIndexPath(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'run-index.json');
}

export function getRuntimeStorePath(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'runtime.sqlite');
}

export function getRunDir(projectRoot: string, runId: string): string {
  assertSafePathSegment(runId, 'runId');
  return path.join(getRunsDir(projectRoot), runId);
}

export function getBranchRunRoot(projectRoot: string, branchSlug: string): string {
  return path.join(getRunsDir(projectRoot), branchToSafePartition(branchSlug));
}

export function getEvidenceDir(projectRoot: string, branchSlug: string): string {
  return path.join(getBranchRunRoot(projectRoot, branchSlug), 'evidence');
}

export function getEvidenceAttachmentPath(projectRoot: string, branchSlug: string, relativeEvidencePath: string): string {
  const evidenceDir = getEvidenceDir(projectRoot, branchSlug);
  const normalized = normalizeEvidenceRootRelativePath(relativeEvidencePath);
  const resolved = path.resolve(evidenceDir, normalized);
  if (!resolved.startsWith(path.resolve(evidenceDir) + path.sep) && resolved !== path.resolve(evidenceDir)) {
    throw new Error(`Evidence path escapes evidence directory: ${relativeEvidencePath}`);
  }
  return resolved;
}

export function getArtifactsDir(projectRoot: string, runId: string): string {
  return path.join(getRunDir(projectRoot, runId), 'artifacts');
}

export function getAgentExecutionsDir(projectRoot: string, runId: string): string {
  return path.join(getRunDir(projectRoot, runId), 'agent-executions');
}

export function getTeamSessionsDir(projectRoot: string, runId: string): string {
  return path.join(getRunDir(projectRoot, runId), 'team-sessions');
}

export function getWorkerRuntimesDir(projectRoot: string, runId: string): string {
  return path.join(getRunDir(projectRoot, runId), 'worker-runtimes');
}

export function getInvocationLedgerPath(projectRoot: string, runId: string): string {
  return path.join(getRunDir(projectRoot, runId), 'invocations.jsonl');
}

export function getRouteCacheDir(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'cache', 'routes');
}

export function getRouteCachePath(projectRoot: string, key: string): string {
  assertSafePathSegment(key, 'routeCacheKey');
  return path.join(getRouteCacheDir(projectRoot), `${key}.json`);
}

export function getWorkerRuntimeRecordPath(projectRoot: string, runId: string, runtimeId: string): string {
  assertSafePathSegment(runtimeId, 'runtimeId');
  return path.join(getWorkerRuntimesDir(projectRoot, runId), `${runtimeId}.json`);
}

export function getAgentExecutionRecordPath(projectRoot: string, runId: string, executionId: string): string {
  assertSafePathSegment(executionId, 'executionId');
  return path.join(getAgentExecutionsDir(projectRoot, runId), `${executionId}.json`);
}

export function getTeamSessionRecordPath(projectRoot: string, runId: string, teamId: string): string {
  assertSafePathSegment(teamId, 'teamId');
  return path.join(getTeamSessionsDir(projectRoot, runId), `${teamId}.json`);
}

export function getArtifactPath(projectRoot: string, runId: string, relativeArtifactPath: string): string {
  const artifactsDir = getArtifactsDir(projectRoot, runId);
  const resolved = path.resolve(artifactsDir, relativeArtifactPath);
  if (!resolved.startsWith(path.resolve(artifactsDir) + path.sep) && resolved !== path.resolve(artifactsDir)) {
    throw new Error(`Artifact path escapes artifacts directory: ${relativeArtifactPath}`);
  }
  return resolved;
}

export function getRunRelativeArtifactPath(artifactRootRelativePath: string): string {
  return `artifacts/${normalizeArtifactRootRelativePath(artifactRootRelativePath)}`;
}

export function toArtifactRootRelativePath(runRelativeArtifactPath: string): string {
  const portablePath = runRelativeArtifactPath.replace(/\\/g, '/');
  if (!portablePath.startsWith('artifacts/')) {
    throw new Error(`Run-relative artifact path must start with artifacts/: ${runRelativeArtifactPath}`);
  }
  return normalizeArtifactRootRelativePath(portablePath.slice('artifacts/'.length));
}

export function normalizeArtifactRootRelativePath(value: string): string {
  const normalized = normalizePortablePath(value);
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized === '..' || path.isAbsolute(value)) {
    throw new Error(`Artifact path must be relative and stay under artifacts/: ${value}`);
  }
  if (normalized.startsWith('artifacts/')) {
    throw new Error(`Artifact helper paths must be artifact-root-relative, not run-relative: ${value}`);
  }
  return normalized;
}

export function normalizeEvidenceRootRelativePath(value: string): string {
  const normalized = normalizePortablePath(value);
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized === '..' || path.isAbsolute(value)) {
    throw new Error(`Evidence path must be relative and stay under evidence/: ${value}`);
  }
  if (normalized.startsWith('evidence/')) {
    throw new Error(`Evidence helper paths must be evidence-root-relative, not branch-run-relative: ${value}`);
  }
  return normalized;
}
