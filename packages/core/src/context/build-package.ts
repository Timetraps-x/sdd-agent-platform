import { CONTEXT_PACKAGE_CONTRACT_VERSION } from '../contracts.js';
import { recordRuntimeProjection } from '../storage/runtime-store.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import { contextBudgetForProfile, type ContextBudget, type ContextProfile } from './budget.js';
import { contextSourceRefForAbsolutePath, contextSourceRefForProjectPath, uniqueContextSourceRefs } from './source-refs.js';
import type { ContextSourceRef } from './source-refs.js';

export type ContextBuildMode = 'do' | 'verify' | 'sync-back' | 'doctor';
export type ContextBuildRole = 'default' | 'implementer' | 'reviewer' | 'validator' | 'context-curator';

export interface ContextBuildPackage {
  contract: typeof CONTEXT_PACKAGE_CONTRACT_VERSION;
  profile: ContextProfile;
  mode: ContextBuildMode;
  agent: string | null;
  role: ContextBuildRole;
  authoritative: false;
  usableForPass: false;
  taskId: string;
  branch: string;
  budget: ContextBudgetAccounting;
  mustRead: ContextSourceRef[];
  optionalRead: ContextSourceRef[];
  doNotReadUnlessNeeded: ContextSourceRef[];
  nextCommands: string[];
  warnings: string[];
}

export interface ContextBudgetRefSummary {
  path: string;
  kind: ContextSourceRef['kind'];
  estimatedBytes: number;
  reason: string;
}

export interface ContextBudgetAccounting {
  profile: ContextProfile;
  maxBytes: number;
  estimatedBytes: number;
  estimatedTokens: number;
  includedRefs: ContextBudgetRefSummary[];
  deferredRefs: ContextBudgetRefSummary[];
  excludedRefs: ContextBudgetRefSummary[];
  truncatedSummaries: string[];
}

export interface ContextBuildOptions {
  taskId: string;
  branch?: string;
  mode: ContextBuildMode;
  agent?: string;
  profile?: ContextProfile;
}

export async function buildContextBuildPackage(projectRoot: string, options: ContextBuildOptions): Promise<ContextBuildPackage> {
  const profile = options.profile ?? 'brief';
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).partition;
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  if (!inspected.task) {
    throw new Error(`Task not found: ${options.taskId}`);
  }
  const role = contextBuildRole(options.agent);
  const task = inspected.task;
  const docRefs = await Promise.all([
    contextSourceRefForAbsolutePath(projectRoot, model.tasksPath, 'document'),
    contextSourceRefForAbsolutePath(projectRoot, model.planPath, 'document'),
    contextSourceRefForAbsolutePath(projectRoot, model.specPath, 'document')
  ]);
  const affectedRefs = await Promise.all(task.affectedFiles.map((file) => contextSourceRefForProjectPath(projectRoot, file, 'document')));
  const artifactRefs = await Promise.all(task.requiredArtifacts.map((artifact) => contextSourceRefForProjectPath(projectRoot, artifact, 'artifact')));
  const routeRef = await contextSourceRefForProjectPath(projectRoot, `.sdd/cache/routes`, 'derived');
  const runIndexRef = await contextSourceRefForProjectPath(projectRoot, `.sdd/run-index.json`, 'derived');
  const candidateMustRead = uniqueContextSourceRefs(contextMustReadRefs(options.mode, role, docRefs, affectedRefs, artifactRefs, routeRef, runIndexRef));
  const candidateOptionalRead = uniqueContextSourceRefs(contextOptionalRefs(options.mode, role, docRefs, affectedRefs, artifactRefs, routeRef, runIndexRef));
  const candidateDeferredRead = uniqueContextSourceRefs(contextDeferredRefs(options.mode, role, docRefs, affectedRefs, artifactRefs, routeRef, runIndexRef));
  const budgeted = applyContextBudget(contextBudgetForProfile(profile), candidateMustRead, candidateOptionalRead, candidateDeferredRead);
  const contextPackage: ContextBuildPackage = {
    contract: CONTEXT_PACKAGE_CONTRACT_VERSION,
    profile,
    mode: options.mode,
    agent: options.agent ?? null,
    role,
    authoritative: false,
    usableForPass: false,
    taskId: task.id,
    branch,
    budget: budgeted.accounting,
    mustRead: budgeted.mustRead,
    optionalRead: budgeted.optionalRead,
    doNotReadUnlessNeeded: budgeted.doNotReadUnlessNeeded,
    nextCommands: contextNextCommands(task.id, branch, options.mode, options.agent),
    warnings: [
      'Context package is derived guidance only and cannot satisfy PASS evidence.',
      ...inspected.gaps.map((gap) => `${gap.field}: ${gap.message}`)
    ]
  };
  enforceContextPackageOutputBudget(contextPackage);
  await recordRuntimeProjection(projectRoot, 'context_build', `${branch}:${task.id}:${options.mode}:${options.agent ?? 'none'}:${profile}`, contextPackage);
  return contextPackage;
}

function applyContextBudget(
  budget: ContextBudget,
  mustRead: ContextSourceRef[],
  optionalRead: ContextSourceRef[],
  deferredRead: ContextSourceRef[]
): {
  mustRead: ContextSourceRef[];
  optionalRead: ContextSourceRef[];
  doNotReadUnlessNeeded: ContextSourceRef[];
  accounting: ContextBudgetAccounting;
} {
  const includedRefs: ContextBudgetRefSummary[] = [];
  const deferredRefs: ContextBudgetRefSummary[] = [];
  const excludedRefs: ContextBudgetRefSummary[] = [];
  const truncatedSummaries: string[] = [];
  const nextMustRead: ContextSourceRef[] = [];
  const nextOptionalRead: ContextSourceRef[] = [];
  const nextDeferredRead: ContextSourceRef[] = [];
  let estimatedBytes = 0;

  for (const ref of mustRead) {
    const summary = summarizeBudgetRef(ref, 'required');
    if (estimatedBytes + summary.estimatedBytes <= budget.maxBytes || nextMustRead.length === 0) {
      nextMustRead.push(ref);
      includedRefs.push(summary);
      estimatedBytes += summary.estimatedBytes;
    } else {
      nextDeferredRead.push(ref);
      deferredRefs.push({ ...summary, reason: 'required_ref_deferred_by_context_budget' });
    }
  }

  for (const ref of optionalRead) {
    const summary = summarizeBudgetRef(ref, 'optional');
    if (estimatedBytes + summary.estimatedBytes <= budget.maxBytes) {
      nextOptionalRead.push(ref);
      includedRefs.push(summary);
      estimatedBytes += summary.estimatedBytes;
    } else {
      nextDeferredRead.push(ref);
      deferredRefs.push({ ...summary, reason: 'optional_ref_deferred_by_context_budget' });
    }
  }

  const seenDeferred = new Set(nextDeferredRead.map((ref) => `${ref.kind}:${ref.path}`));
  for (const ref of deferredRead) {
    const summary = summarizeBudgetRef(ref, 'deferred');
    if (includedRefs.some((included) => included.path === ref.path && included.kind === ref.kind)) {
      excludedRefs.push({ ...summary, reason: 'duplicate_ref_excluded' });
    } else if (!seenDeferred.has(`${ref.kind}:${ref.path}`)) {
      nextDeferredRead.push(ref);
      deferredRefs.push(summary);
    }
  }

  if (deferredRefs.length > 8) {
    truncatedSummaries.push(`deferred_refs_truncated=${deferredRefs.length - 8}`);
  }
  if (excludedRefs.length > 8) {
    truncatedSummaries.push(`excluded_refs_truncated=${excludedRefs.length - 8}`);
  }

  const accounting: ContextBudgetAccounting = {
    profile: budget.profile,
    maxBytes: budget.maxBytes,
    estimatedBytes: Math.min(estimatedBytes, budget.maxBytes),
    estimatedTokens: estimateTokens(Math.min(estimatedBytes, budget.maxBytes)),
    includedRefs: includedRefs.slice(0, 12),
    deferredRefs: deferredRefs.slice(0, 8),
    excludedRefs: excludedRefs.slice(0, 8),
    truncatedSummaries
  };

  return {
    mustRead: nextMustRead,
    optionalRead: nextOptionalRead,
    doNotReadUnlessNeeded: uniqueContextSourceRefs(nextDeferredRead),
    accounting
  };
}

function enforceContextPackageOutputBudget(contextPackage: ContextBuildPackage): void {
  let trimmedOptional = 0;
  let trimmedDeferred = 0;
  let trimmedAccounting = 0;

  while (contextPackage.optionalRead.length > 0 && contextPackageOutputBytes(contextPackage) > contextPackage.budget.maxBytes) {
    contextPackage.optionalRead.pop();
    contextPackage.budget.includedRefs.pop();
    trimmedOptional += 1;
  }
  while (contextPackage.doNotReadUnlessNeeded.length > 0 && contextPackageOutputBytes(contextPackage) > contextPackage.budget.maxBytes) {
    contextPackage.doNotReadUnlessNeeded.pop();
    trimmedDeferred += 1;
  }
  while (contextPackage.budget.excludedRefs.length > 0 && contextPackageOutputBytes(contextPackage) > contextPackage.budget.maxBytes) {
    contextPackage.budget.excludedRefs.pop();
    trimmedAccounting += 1;
  }
  while (contextPackage.budget.deferredRefs.length > 0 && contextPackageOutputBytes(contextPackage) > contextPackage.budget.maxBytes) {
    contextPackage.budget.deferredRefs.pop();
    trimmedAccounting += 1;
  }

  const trims = [
    trimmedOptional > 0 ? `optional_refs_output_trimmed=${trimmedOptional}` : null,
    trimmedDeferred > 0 ? `deferred_refs_output_trimmed=${trimmedDeferred}` : null,
    trimmedAccounting > 0 ? `budget_accounting_output_trimmed=${trimmedAccounting}` : null
  ].filter((item): item is string => item !== null);
  if (trims.length > 0) {
    contextPackage.budget.truncatedSummaries = trims;
  }
  contextPackage.budget.estimatedBytes = Math.min(contextPackageOutputBytes(contextPackage), contextPackage.budget.maxBytes);
  contextPackage.budget.estimatedTokens = estimateTokens(contextPackage.budget.estimatedBytes);
}

function contextPackageOutputBytes(contextPackage: ContextBuildPackage): number {
  return Buffer.byteLength(JSON.stringify(contextPackage), 'utf8');
}

function summarizeBudgetRef(ref: ContextSourceRef, reason: string): ContextBudgetRefSummary {
  return {
    path: ref.path,
    kind: ref.kind,
    estimatedBytes: Buffer.byteLength(JSON.stringify(ref), 'utf8'),
    reason
  };
}

function estimateTokens(bytes: number): number {
  return Math.ceil(bytes / 4);
}

function contextMustReadRefs(mode: ContextBuildMode, role: ContextBuildRole, docs: ContextSourceRef[], affected: ContextSourceRef[], artifacts: ContextSourceRef[], routeRef: ContextSourceRef, runIndexRef: ContextSourceRef): ContextSourceRef[] {
  if (role === 'implementer') {
    return [docs[0], docs[1], ...affected];
  }
  if (role === 'reviewer') {
    return [docs[0], docs[1], runIndexRef, ...affected];
  }
  if (role === 'validator') {
    return [docs[0], ...artifacts, runIndexRef];
  }
  if (role === 'context-curator') {
    return [docs[0], docs[2], routeRef];
  }
  if (mode === 'do') {
    return [docs[0], docs[1], ...affected];
  }
  if (mode === 'verify') {
    return [docs[0], ...artifacts];
  }
  if (mode === 'sync-back') {
    return [docs[0], ...affected];
  }
  return [docs[0]];
}

function contextOptionalRefs(mode: ContextBuildMode, role: ContextBuildRole, docs: ContextSourceRef[], affected: ContextSourceRef[], artifacts: ContextSourceRef[], routeRef: ContextSourceRef, runIndexRef: ContextSourceRef): ContextSourceRef[] {
  if (role === 'implementer') {
    return [docs[2], ...artifacts, routeRef];
  }
  if (role === 'reviewer') {
    return [docs[2], ...artifacts, routeRef];
  }
  if (role === 'validator') {
    return [docs[1], docs[2], routeRef];
  }
  if (role === 'context-curator') {
    return [docs[1], runIndexRef];
  }
  return mode === 'doctor' ? [docs[1], docs[2], runIndexRef, routeRef, ...artifacts] : [docs[2], ...artifacts];
}

function contextDeferredRefs(mode: ContextBuildMode, role: ContextBuildRole, docs: ContextSourceRef[], affected: ContextSourceRef[], artifacts: ContextSourceRef[], routeRef: ContextSourceRef, runIndexRef: ContextSourceRef): ContextSourceRef[] {
  if (role === 'context-curator') {
    return [...affected, ...artifacts];
  }
  if (mode === 'verify') {
    return [...affected, routeRef];
  }
  return [runIndexRef, ...artifacts, docs[2]];
}

function contextBuildRole(agent: string | undefined): ContextBuildRole {
  if (agent === 'implementer' || agent === 'reviewer' || agent === 'validator' || agent === 'context-curator') {
    return agent;
  }
  if (agent === 'role.context-curator') {
    return 'context-curator';
  }
  if (agent === 'role.implementation-reviewer') {
    return 'reviewer';
  }
  if (agent === 'role.verification-designer' || agent === 'role.evidence-runner') {
    return 'validator';
  }
  return 'default';
}

function contextNextCommands(taskId: string, branch: string, mode: ContextBuildMode, agent?: string): string[] {
  if (mode === 'do') {
    return [`sdd do task ${taskId} --branch ${branch}`];
  }
  if (mode === 'verify') {
    return [`sdd test task ${taskId} --branch ${branch}`, `sdd evidence summary <run_id> --task ${taskId} --json`];
  }
  if (mode === 'sync-back') {
    return [`sdd sync-back inspect --branch ${branch} --task ${taskId}`];
  }
  const agentSuffix = agent ? ` --agent ${agent}` : '';
  return [`sdd doctor fast --branch ${branch}`, `sdd context build --task ${taskId} --branch ${branch} --mode verify${agentSuffix} --json`];
}
