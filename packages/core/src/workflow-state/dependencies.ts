import type { SddTask, SddTaskModel } from '../sdd-docs/task-parser.js';
type TaskDependencyModel = Pick<SddTaskModel, 'tasks'>;

export interface TaskDependencyReadinessEntry {
  taskId: string;
  status: SddTask['status'] | 'missing';
  ready: boolean;
  reason: string | null;
}

export interface TaskDependencyReadiness {
  taskId: string;
  ready: boolean;
  dependencies: TaskDependencyReadinessEntry[];
  blockingReasons: string[];
}

export interface WorkflowDependencyBlocker {
  taskId: string;
  dependencyId: string;
  dependencyStatus: SddTask['status'] | 'missing';
  reason: string;
}

export function resolveTaskDependencyReadiness(model: TaskDependencyModel, taskId: string): TaskDependencyReadiness {
  const task = model.tasks.find((candidate) => candidate.id === taskId) ?? null;
  if (!task) {
    return { taskId, ready: false, dependencies: [], blockingReasons: [`Task ${taskId} was not found.`] };
  }

  const dependencies = task.dependsOn.map((dependencyId) => dependencyReadinessEntry(task.id, dependencyId, model.tasks.find((candidate) => candidate.id === dependencyId) ?? null));
  const blockingReasons = dependencies.map((dependency) => dependency.reason).filter((reason): reason is string => Boolean(reason));
  return {
    taskId: task.id,
    ready: blockingReasons.length === 0,
    dependencies,
    blockingReasons
  };
}

export function dependencyBlockingReasonsForTask(model: TaskDependencyModel, taskId: string): string[] {
  return resolveTaskDependencyReadiness(model, taskId).blockingReasons;
}

export function workflowDependencyBlockers(model: TaskDependencyModel): WorkflowDependencyBlocker[] {
  const blockers: WorkflowDependencyBlocker[] = [];
  for (const task of model.tasks) {
    if (task.status === 'completed' || task.status === 'deferred') {
      continue;
    }
    for (const dependency of resolveTaskDependencyReadiness(model, task.id).dependencies) {
      if (!dependency.ready && dependency.reason) {
        blockers.push({
          taskId: task.id,
          dependencyId: dependency.taskId,
          dependencyStatus: dependency.status,
          reason: dependency.reason
        });
      }
    }
  }
  return blockers;
}

export function nextDependencyTaskId(model: TaskDependencyModel, taskId: string): string | null {
  return resolveTaskDependencyReadiness(model, taskId).dependencies.find((dependency) => !dependency.ready)?.taskId ?? null;
}

function dependencyReadinessEntry(taskId: string, dependencyId: string, dependency: SddTask | null): TaskDependencyReadinessEntry {
  if (!dependency) {
    return {
      taskId: dependencyId,
      status: 'missing',
      ready: false,
      reason: `Task ${taskId} depends on ${dependencyId}, but ${dependencyId} was not found; restore or remove the dependency before continuing ${taskId}.`
    };
  }
  if (dependency.status === 'completed') {
    return {
      taskId: dependency.id,
      status: dependency.status,
      ready: true,
      reason: null
    };
  }
  return {
    taskId: dependency.id,
    status: dependency.status,
    ready: false,
    reason: `Task ${taskId} depends on ${dependency.id}, but ${dependency.id} status is ${dependency.status}; complete and sync-back ${dependency.id} before continuing ${taskId}.`
  };
}
