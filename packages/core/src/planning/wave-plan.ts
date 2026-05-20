import { WAVE_PLANNER_CONTRACT_VERSION } from '../contracts.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { inspectTaskGraph } from './task-graph.js';
import type { TaskGraphDiagnostic, TaskGraphNode, TaskGraphPlan } from './task-graph.js';
import { inspectWorktreeIsolation } from '../worktree/isolation.js';
import type { WorktreeIsolationDecision, WorktreeIsolationMode } from '../worktree/isolation.js';

export interface WavePlanTask {
  taskId: string;
  isolationMode: WorktreeIsolationMode;
  reasons: string[];
}

export interface WavePlanWave {
  index: number;
  tasks: WavePlanTask[];
}

export interface WavePlanGate {
  taskId: string;
  gate: 'manual' | 'blocked';
  reasons: string[];
}

export interface WavePlan {
  version: typeof WAVE_PLANNER_CONTRACT_VERSION;
  branch: string;
  valid: boolean;
  waves: WavePlanWave[];
  manualGates: WavePlanGate[];
  blockedTasks: WavePlanGate[];
  diagnostics: TaskGraphDiagnostic[];
  summary: {
    tasks: number;
    waves: number;
    plannedTasks: number;
    manualTasks: number;
    blockedTasks: number;
  };
}

export async function inspectWavePlan(projectRoot: string, options: { branch?: string; capabilityId?: string } = {}): Promise<WavePlan> {
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const capabilityId = options.capabilityId ?? 'native-file-edit';
  const graph = await inspectTaskGraph(projectRoot, { branch });
  const taskIds = new Set(graph.nodes.map((node) => node.taskId));
  const blockingDiagnostics = graph.diagnostics.filter((diagnostic) => diagnostic.severity === 'blocking');
  const globalBlocking = blockingDiagnostics.filter((diagnostic) => diagnostic.taskId === null);
  const blockingByTask = new Map<string, string[]>();
  for (const diagnostic of blockingDiagnostics.filter((candidate) => candidate.taskId !== null)) {
    const reasons = blockingByTask.get(diagnostic.taskId ?? '') ?? [];
    reasons.push(diagnostic.message);
    blockingByTask.set(diagnostic.taskId ?? '', reasons);
  }

  const decisions = new Map<string, WorktreeIsolationDecision>();
  await Promise.all(graph.nodes.map(async (node) => {
    decisions.set(node.taskId, await inspectWorktreeIsolation(projectRoot, { branch, taskId: node.taskId, capabilityId }));
  }));

  const manualGates: WavePlanGate[] = [];
  const blockedTasks: WavePlanGate[] = [];
  const blockedTaskIds = new Set<string>();
  const manualTaskIds = new Set<string>();
  const candidates = new Map<string, TaskGraphNode>();

  for (const node of graph.nodes) {
    const decision = decisions.get(node.taskId);
    const diagnosticReasons = blockingByTask.get(node.taskId) ?? [];
    if (globalBlocking.length > 0) {
      blockedTasks.push({ taskId: node.taskId, gate: 'blocked', reasons: globalBlocking.map((diagnostic) => diagnostic.message) });
      blockedTaskIds.add(node.taskId);
    } else if (diagnosticReasons.length > 0) {
      blockedTasks.push({ taskId: node.taskId, gate: 'blocked', reasons: diagnosticReasons });
      blockedTaskIds.add(node.taskId);
    } else if (!decision || decision.mode === 'blocked') {
      blockedTasks.push({ taskId: node.taskId, gate: 'blocked', reasons: decision?.reasons ?? [`Task ${node.taskId} cannot be inspected for isolation.`] });
      blockedTaskIds.add(node.taskId);
    } else if (decision.mode === 'manual') {
      manualGates.push({ taskId: node.taskId, gate: 'manual', reasons: decision.reasons });
      manualTaskIds.add(node.taskId);
    } else {
      candidates.set(node.taskId, node);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [taskId, node] of [...candidates]) {
      const blockedDependencies = node.dependsOn.filter((dependency) => !taskIds.has(dependency) || blockedTaskIds.has(dependency) || manualTaskIds.has(dependency));
      if (blockedDependencies.length > 0) {
        blockedTasks.push({
          taskId,
          gate: 'blocked',
          reasons: [`Task ${taskId} depends on non-plannable task(s): ${blockedDependencies.join(', ')}.`]
        });
        blockedTaskIds.add(taskId);
        candidates.delete(taskId);
        changed = true;
      }
    }
  }

  const waves: WavePlanWave[] = [];
  const completed = new Set<string>();
  const remaining = new Map(candidates);
  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((node) => node.dependsOn.every((dependency) => completed.has(dependency)))
      .sort((left, right) => left.taskId.localeCompare(right.taskId));
    if (ready.length === 0) {
      for (const taskId of remaining.keys()) {
        blockedTasks.push({ taskId, gate: 'blocked', reasons: [`Task ${taskId} cannot be placed in a dependency wave.`] });
        blockedTaskIds.add(taskId);
      }
      break;
    }
    const waveNodes: TaskGraphNode[] = [];
    for (const node of ready) {
      if (!waveNodes.some((candidate) => graphTasksOverlap(graph, candidate.taskId, node.taskId))) {
        waveNodes.push(node);
      }
    }
    const tasks = waveNodes.map((node): WavePlanTask => ({
      taskId: node.taskId,
      isolationMode: decisions.get(node.taskId)?.mode ?? 'blocked',
      reasons: decisions.get(node.taskId)?.reasons ?? []
    }));
    waves.push({ index: waves.length + 1, tasks });
    for (const node of waveNodes) {
      remaining.delete(node.taskId);
      completed.add(node.taskId);
    }
  }

  const plannedTasks = waves.reduce((count, wave) => count + wave.tasks.length, 0);
  return {
    version: WAVE_PLANNER_CONTRACT_VERSION,
    branch,
    valid: graph.valid && blockedTasks.length === 0,
    waves,
    manualGates,
    blockedTasks,
    diagnostics: graph.diagnostics,
    summary: {
      tasks: graph.nodes.length,
      waves: waves.length,
      plannedTasks,
      manualTasks: manualGates.length,
      blockedTasks: blockedTasks.length
    }
  };
}

function graphTasksOverlap(graph: TaskGraphPlan, leftTaskId: string, rightTaskId: string): boolean {
  return graph.fileOverlapEdges.some((edge) =>
    (edge.from === leftTaskId && edge.to === rightTaskId) || (edge.from === rightTaskId && edge.to === leftTaskId)
  );
}
