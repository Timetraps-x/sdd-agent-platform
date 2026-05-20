import { inspectToolCapability, listToolCapabilities } from '../registries/tool-capabilities.js';
import type { ToolCapabilitySideEffect } from '../registries/tool-capabilities.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import { buildTaskRiskProfile } from '../task-risk-profile.js';

export const WORKTREE_ISOLATION_CONTRACT_VERSION = 'phase-3.7-worktree-isolation-contract-v1';

export type WorktreeIsolationMode = 'none' | 'required' | 'blocked' | 'manual';

export interface WorktreeIsolationPeer {
  taskId: string;
  affectedFiles: string[];
  risk: string[];
}

export interface WorktreeIsolationGate {
  name: string;
  passed: boolean;
  message: string;
}

export interface WorktreeIsolationDecision {
  version: string;
  taskId: string;
  mode: WorktreeIsolationMode;
  safeConcurrency: boolean;
  capabilityId: string;
  capabilitySideEffect: ToolCapabilitySideEffect;
  affectedFiles: string[];
  risk: string[];
  peers: WorktreeIsolationPeer[];
  overlaps: Array<{ peerTaskId: string; files: string[] }>;
  gates: WorktreeIsolationGate[];
  reasons: string[];
}

export async function inspectWorktreeIsolation(projectRoot: string, options: { branch?: string; taskId: string; capabilityId?: string; peerTaskIds?: string[] }): Promise<WorktreeIsolationDecision> {
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const [model, capabilityRegistry] = await Promise.all([parseSddBranch(projectRoot, branch), listToolCapabilities(projectRoot)]);
  const inspected = inspectSddTask(model, options.taskId);
  const capabilityId = options.capabilityId ?? 'native-file-edit';
  const capability = capabilityRegistry.capabilities.find((candidate) => candidate.id === capabilityId);
  const task = inspected.task;
  const affectedFiles = task?.affectedFiles ?? [];
  const risk = task?.risk ?? [];
  const peers = (options.peerTaskIds ?? []).map((peerTaskId): WorktreeIsolationPeer => {
    const peer = inspectSddTask(model, peerTaskId).task;
    return { taskId: peerTaskId, affectedFiles: peer?.affectedFiles ?? [], risk: peer?.risk ?? [] };
  });
  const sideEffect = capability?.sideEffect ?? 'local_write';
  const overlaps = peers
    .map((peer) => ({ peerTaskId: peer.taskId, files: overlappingFiles(affectedFiles, peer.affectedFiles) }))
    .filter((overlap) => overlap.files.length > 0);
  const riskProfile = buildTaskRiskProfile(task);
  const highRisk = riskProfile.riskLevel === 'high';
  const manualRisk = riskProfile.securitySensitive || riskProfile.normalizedTags.includes('database');
  const unsafeOverlap = overlaps.length > 0 && sideEffect !== 'read_only';
  const reasons: string[] = [];
  const gates: WorktreeIsolationGate[] = [];

  if (!task) {
    reasons.push(`Task ${options.taskId} is missing or ambiguous in specs/${branch}/tasks.md.`);
  }
  if (!capability) {
    reasons.push(`Capability ${capabilityId} is not declared in the Phase 3.1 capability registry.`);
  }
  if (unsafeOverlap) {
    reasons.push(`Writable task overlaps peer affected file(s): ${overlaps.map((overlap) => `${overlap.peerTaskId}:${overlap.files.join(',')}`).join('; ')}.`);
  }
  if (manualRisk) {
    reasons.push('Database/security risk profile requires manual isolation gate before worktree lifecycle automation.');
  } else if (highRisk && sideEffect !== 'read_only') {
    reasons.push('High-risk writable task risk profile requires worktree isolation.');
  } else if (sideEffect === 'read_only') {
    reasons.push('Read-only capability does not require worktree isolation.');
  } else if (sideEffect === 'local_write' || sideEffect === 'command_execution') {
    reasons.push('Writable or command-executing capability requires worktree isolation unless blocked by overlap.');
  }

  gates.push(
    { name: 'task_found', passed: task !== null, message: task ? `Task ${options.taskId} found.` : `Task ${options.taskId} missing or ambiguous.` },
    { name: 'capability_declared', passed: capability !== undefined, message: capability ? `Capability ${capabilityId} side_effect=${sideEffect}.` : `Capability ${capabilityId} missing.` },
    { name: 'files_overlap', passed: overlaps.length === 0, message: overlaps.length === 0 ? 'No peer affected_files overlap.' : `Overlaps: ${overlaps.map((overlap) => `${overlap.peerTaskId}:${overlap.files.join(',')}`).join('; ')}` },
    { name: 'unsafe_concurrency', passed: !unsafeOverlap, message: unsafeOverlap ? 'Writable overlapping tasks are not safe to run concurrently.' : 'No unsafe writable overlap detected.' },
    { name: 'read_only', passed: sideEffect === 'read_only', message: sideEffect === 'read_only' ? 'Read-only task can run without worktree.' : 'Task may mutate local state or execute commands.' }
  );

  const mode: WorktreeIsolationMode = !task || !capability || unsafeOverlap
    ? 'blocked'
    : manualRisk || sideEffect === 'external_interaction'
      ? 'manual'
      : sideEffect === 'read_only'
        ? 'none'
        : 'required';

  return {
    version: WORKTREE_ISOLATION_CONTRACT_VERSION,
    taskId: options.taskId,
    mode,
    safeConcurrency: mode !== 'blocked',
    capabilityId,
    capabilitySideEffect: sideEffect,
    affectedFiles,
    risk,
    peers,
    overlaps,
    gates,
    reasons
  };
}

export async function inspectWorktreeIsolationContract(projectRoot: string): Promise<{ valid: boolean; issues: string[] }> {
  const capability = await inspectToolCapability(projectRoot, 'native-file-edit');
  const issues: string[] = [];
  if (!capability) {
    issues.push('native-file-edit capability is missing.');
  }
  return { valid: issues.length === 0, issues };
}

function overlappingFiles(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map(normalizeComparablePath));
  return left.filter((file) => rightSet.has(normalizeComparablePath(file)));
}

function normalizeComparablePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}
