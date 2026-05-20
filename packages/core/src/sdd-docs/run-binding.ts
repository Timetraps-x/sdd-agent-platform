import { appendEvent } from '../run-state/events.js';
import { readRunState, writeRunState } from '../run-state/run-state.js';
import type { RunDocumentSnapshot, RunState } from '../run-state/model.js';
import type { ContextResolverContract } from './context.js';
import type { SddTask, SddTaskModel } from './task-parser.js';

export async function bindRunStateToTask(projectRoot: string, state: RunState, context: ContextResolverContract, model: SddTaskModel, task: SddTask | null, taskId: string): Promise<RunState> {
  if (state.partition && state.partition !== context.partition) {
    throw new Error(`Run ${state.runId} belongs to partition ${state.partition}, not ${context.partition}.`);
  }
  if (state.taskId && state.taskId !== taskId) {
    throw new Error(`Run ${state.runId} belongs to task ${state.taskId}, not ${taskId}.`);
  }
  if (state.gitBranch && state.gitBranch !== context.rawBranch) {
    throw new Error(`Run ${state.runId} belongs to Git branch ${state.gitBranch}, not ${context.rawBranch}.`);
  }

  const nextState: RunState = {
    ...state,
    currentTask: taskId,
    partition: context.partition,
    gitBranch: context.rawBranch,
    taskId,
    affectedFiles: task?.affectedFiles ?? state.affectedFiles,
    documentSnapshot: documentSnapshotFromModel(model)
  };
  await writeRunState(projectRoot, nextState);
  await appendEvent(projectRoot, state.runId, {
    event: 'run_context_bound',
    runId: state.runId,
    summary: `Run bound to ${context.partition}/${taskId}`,
    data: {
      partition: context.partition,
      gitBranch: context.rawBranch,
      task: taskId,
      affectedFiles: nextState.affectedFiles,
      documentSnapshot: nextState.documentSnapshot
    }
  });
  return readRunState(projectRoot, state.runId);
}

export async function bindRunStateToTaskContext(projectRoot: string, state: RunState, context: ContextResolverContract, model: SddTaskModel, task: SddTask | null, taskId: string): Promise<RunState> {
  if (!state.taskId || state.taskId === taskId) {
    return bindRunStateToTask(projectRoot, state, context, model, task, taskId);
  }
  if (state.partition && state.partition !== context.partition) {
    throw new Error(`Run ${state.runId} belongs to partition ${state.partition}, not ${context.partition}.`);
  }
  if (state.gitBranch && state.gitBranch !== context.rawBranch) {
    throw new Error(`Run ${state.runId} belongs to Git branch ${state.gitBranch}, not ${context.rawBranch}.`);
  }

  const nextState: RunState = {
    ...state,
    currentTask: taskId,
    partition: context.partition,
    gitBranch: context.rawBranch,
    affectedFiles: [...new Set([...state.affectedFiles, ...(task?.affectedFiles ?? [])])],
    documentSnapshot: documentSnapshotFromModel(model)
  };
  await writeRunState(projectRoot, nextState);
  await appendEvent(projectRoot, state.runId, {
    event: 'run_context_bound',
    runId: state.runId,
    summary: `Run context updated for ${context.partition}/${taskId}`,
    data: {
      partition: context.partition,
      gitBranch: context.rawBranch,
      task: taskId,
      affectedFiles: nextState.affectedFiles,
      documentSnapshot: nextState.documentSnapshot
    }
  });
  return readRunState(projectRoot, state.runId);
}

export function documentSnapshotFromModel(model: SddTaskModel): RunDocumentSnapshot {
  return {
    specHash: model.documents.specHash ?? null,
    planHash: model.documents.planHash ?? null,
    tasksHash: model.documents.tasksHash ?? null,
    planBasedOnSpecHash: model.documents.planBasedOnSpecHash ?? null,
    tasksBasedOnPlanHash: model.documents.tasksBasedOnPlanHash ?? null
  };
}
