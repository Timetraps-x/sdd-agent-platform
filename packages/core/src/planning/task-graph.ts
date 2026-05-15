import { TASK_GRAPH_CONTRACT_VERSION, TASK_GRAPH_PLANNER_CONTRACT_VERSION } from '../contracts.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import type { SddGapSeverity, SddTask, SddTaskSourceLocation, SddTaskStatus } from '../sdd-docs/task-parser.js';

export type TaskGraphEdgeType = 'depends_on' | 'file_overlap';

export interface TaskGraphNode {
  taskId: string;
  title: string | null;
  status: SddTaskStatus;
  wave: number | null;
  dependsOn: string[];
  affectedFiles: string[];
  risk: string[];
  validation: string[];
  acceptanceRefs: string[];
  planRefs: string[];
  fileOwnership: string[];
  agentFit: string[];
  verificationAvailability: string[];
  autonomy: string | null;
  allowedAgents: string[];
  requiredArtifacts: string[];
  gapState: string | null;
  source: SddTaskSourceLocation;
}

export interface TaskGraphEdge {
  from: string;
  to: string;
  type: TaskGraphEdgeType;
  files: string[];
}

export interface TaskGraphDiagnostic {
  severity: SddGapSeverity;
  taskId: string | null;
  field: string;
  message: string;
  recommendation: string;
}

export interface TaskGraphPlan {
  contract: typeof TASK_GRAPH_CONTRACT_VERSION;
  version: typeof TASK_GRAPH_PLANNER_CONTRACT_VERSION;
  branch: string;
  valid: boolean;
  nodes: TaskGraphNode[];
  dependencyEdges: TaskGraphEdge[];
  fileOverlapEdges: TaskGraphEdge[];
  diagnostics: TaskGraphDiagnostic[];
  summary: {
    tasks: number;
    dependencies: number;
    fileOverlaps: number;
    highRiskTasks: string[];
    validationCommands: string[];
  };
}

export async function inspectTaskGraph(projectRoot: string, options: { branch?: string } = {}): Promise<TaskGraphPlan> {
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const model = await parseSddBranch(projectRoot, branch);
  const nodes = model.tasks.map((task): TaskGraphNode => ({
    taskId: task.id,
    title: task.title,
    status: task.status,
    wave: task.wave,
    dependsOn: task.dependsOn,
    affectedFiles: task.affectedFiles,
    risk: task.risk,
    validation: task.validation,
    acceptanceRefs: task.acceptanceRefs,
    planRefs: task.planRefs,
    fileOwnership: task.fileOwnership,
    agentFit: task.agentFit,
    verificationAvailability: task.verificationAvailability,
    autonomy: task.autonomy,
    allowedAgents: task.allowedAgents,
    requiredArtifacts: task.requiredArtifacts,
    gapState: task.gapState,
    source: task.source
  }));
  const diagnostics: TaskGraphDiagnostic[] = model.gaps.map((gap) => ({
    severity: gap.severity,
    taskId: gap.taskId,
    field: gap.field,
    message: gap.message,
    recommendation: gap.recommendation
  }));
  diagnostics.push(...detectTaskGraphCycles(model.tasks));
  const taskCounts = new Map<string, number>();
  for (const task of model.tasks) {
    taskCounts.set(task.id, (taskCounts.get(task.id) ?? 0) + 1);
  }
  const dependencyEdges = model.tasks.flatMap((task): TaskGraphEdge[] => task.dependsOn
    .filter((dependency) => taskCounts.get(dependency) === 1)
    .map((dependency) => ({ from: dependency, to: task.id, type: 'depends_on', files: [] })));
  const fileOverlapEdges: TaskGraphEdge[] = [];
  for (let leftIndex = 0; leftIndex < model.tasks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < model.tasks.length; rightIndex += 1) {
      const left = model.tasks[leftIndex];
      const right = model.tasks[rightIndex];
      const files = overlappingFiles(left.affectedFiles, right.affectedFiles);
      if (files.length > 0) {
        fileOverlapEdges.push({ from: left.id, to: right.id, type: 'file_overlap', files });
      }
    }
  }
  const validationCommands = [...new Set(model.tasks.flatMap((task) => task.validation))].sort();
  const highRiskTasks = model.tasks
    .filter((task) => task.risk.length > 0)
    .map((task) => task.id)
    .sort();

  return {
    contract: TASK_GRAPH_CONTRACT_VERSION,
    version: TASK_GRAPH_PLANNER_CONTRACT_VERSION,
    branch,
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== 'blocking'),
    nodes,
    dependencyEdges,
    fileOverlapEdges,
    diagnostics,
    summary: {
      tasks: nodes.length,
      dependencies: dependencyEdges.length,
      fileOverlaps: fileOverlapEdges.length,
      highRiskTasks,
      validationCommands
    }
  };
}

function overlappingFiles(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map(normalizeComparablePath));
  return left.filter((file) => rightSet.has(normalizeComparablePath(file)));
}

function normalizeComparablePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function detectTaskGraphCycles(tasks: SddTask[]): TaskGraphDiagnostic[] {
  const uniqueTaskIds = new Set<string>();
  const duplicateTaskIds = new Set<string>();
  for (const task of tasks) {
    if (uniqueTaskIds.has(task.id)) {
      duplicateTaskIds.add(task.id);
    }
    uniqueTaskIds.add(task.id);
  }
  const graph = new Map<string, string[]>();
  for (const task of tasks.filter((candidate) => !duplicateTaskIds.has(candidate.id))) {
    graph.set(task.id, task.dependsOn.filter((dependency) => uniqueTaskIds.has(dependency) && !duplicateTaskIds.has(dependency)));
  }
  const diagnostics: TaskGraphDiagnostic[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];
  const reportedCycles = new Set<string>();

  const visit = (taskId: string): void => {
    if (visiting.has(taskId)) {
      const cycleStart = stack.indexOf(taskId);
      const cycle = [...stack.slice(cycleStart), taskId];
      const key = cycle.join('->');
      if (!reportedCycles.has(key)) {
        reportedCycles.add(key);
        diagnostics.push({
          severity: 'blocking',
          taskId,
          field: 'depends_on',
          message: `Task dependency cycle detected: ${cycle.join(' -> ')}.`,
          recommendation: 'Break the cycle before graph planning or wave planning.'
        });
      }
      return;
    }
    if (visited.has(taskId)) {
      return;
    }
    visiting.add(taskId);
    stack.push(taskId);
    for (const dependency of graph.get(taskId) ?? []) {
      visit(dependency);
    }
    stack.pop();
    visiting.delete(taskId);
    visited.add(taskId);
  };

  for (const taskId of graph.keys()) {
    visit(taskId);
  }
  return diagnostics;
}
