import { CONTEXT_PACKAGE_CONTRACT_VERSION } from '../contracts.js';
import { recordRuntimeProjection } from '../storage/runtime-store.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import type { ContextProfile } from './budget.js';
import { contextSourceRefForAbsolutePath, contextSourceRefForProjectPath, uniqueContextSourceRefs } from './source-refs.js';
import type { ContextSourceRef } from './source-refs.js';

export type ContextBuildMode = 'do' | 'verify' | 'sync-back' | 'doctor';

export interface ContextBuildPackage {
  contract: typeof CONTEXT_PACKAGE_CONTRACT_VERSION;
  profile: ContextProfile;
  mode: ContextBuildMode;
  agent: string | null;
  authoritative: false;
  usableForPass: false;
  taskId: string;
  branch: string;
  mustRead: ContextSourceRef[];
  optionalRead: ContextSourceRef[];
  doNotReadUnlessNeeded: ContextSourceRef[];
  nextCommands: string[];
  warnings: string[];
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
  const mustRead = uniqueContextSourceRefs(contextMustReadRefs(options.mode, docRefs, affectedRefs, artifactRefs));
  const optionalRead = uniqueContextSourceRefs(contextOptionalRefs(options.mode, docRefs, affectedRefs, artifactRefs, routeRef, runIndexRef, options.agent ?? null));
  const doNotReadUnlessNeeded = uniqueContextSourceRefs(contextDeferredRefs(options.mode, docRefs, affectedRefs, artifactRefs, routeRef, runIndexRef));
  const contextPackage: ContextBuildPackage = {
    contract: CONTEXT_PACKAGE_CONTRACT_VERSION,
    profile,
    mode: options.mode,
    agent: options.agent ?? null,
    authoritative: false,
    usableForPass: false,
    taskId: task.id,
    branch,
    mustRead,
    optionalRead,
    doNotReadUnlessNeeded,
    nextCommands: contextNextCommands(task.id, branch, options.mode, options.agent),
    warnings: [
      'Context package is derived guidance only and cannot satisfy PASS evidence.',
      ...inspected.gaps.map((gap) => `${gap.field}: ${gap.message}`)
    ]
  };
  await recordRuntimeProjection(projectRoot, 'context_build', `${branch}:${task.id}:${options.mode}:${options.agent ?? 'none'}:${profile}`, contextPackage);
  return contextPackage;
}

function contextMustReadRefs(mode: ContextBuildMode, docs: ContextSourceRef[], affected: ContextSourceRef[], artifacts: ContextSourceRef[]): ContextSourceRef[] {
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

function contextOptionalRefs(mode: ContextBuildMode, docs: ContextSourceRef[], affected: ContextSourceRef[], artifacts: ContextSourceRef[], routeRef: ContextSourceRef, runIndexRef: ContextSourceRef, agent: string | null): ContextSourceRef[] {
  const refs = mode === 'doctor' ? [docs[1], docs[2], runIndexRef, routeRef, ...artifacts] : [docs[2], ...artifacts];
  if (agent === 'implementer') {
    refs.push(...affected);
  }
  if (agent === 'reviewer' || agent === 'validator') {
    refs.push(runIndexRef);
  }
  return refs;
}

function contextDeferredRefs(mode: ContextBuildMode, docs: ContextSourceRef[], affected: ContextSourceRef[], artifacts: ContextSourceRef[], routeRef: ContextSourceRef, runIndexRef: ContextSourceRef): ContextSourceRef[] {
  if (mode === 'doctor') {
    return [...affected];
  }
  if (mode === 'verify') {
    return [...affected, routeRef];
  }
  return [runIndexRef, ...artifacts, docs[2]];
}

function contextNextCommands(taskId: string, branch: string, mode: ContextBuildMode, agent?: string): string[] {
  if (mode === 'do') {
    return [`sdd do task ${taskId} --branch ${branch}`];
  }
  if (mode === 'verify') {
    return [`sdd verify task ${taskId} --branch ${branch}`, `sdd evidence summary <run_id> --task ${taskId} --json`];
  }
  if (mode === 'sync-back') {
    return [`sdd sync-back inspect --branch ${branch} --task ${taskId}`];
  }
  const agentSuffix = agent ? ` --agent ${agent}` : '';
  return [`sdd doctor --latest-only --branch ${branch}`, `sdd context build --task ${taskId} --branch ${branch} --mode verify${agentSuffix} --json`];
}
