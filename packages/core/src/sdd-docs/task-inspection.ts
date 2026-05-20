import type { SddTask, SddTaskGap, SddTaskModel } from './task-parser.js';

export function inspectSddTask(model: SddTaskModel, taskId: string): { task: SddTask | null; gaps: SddTaskGap[] } {
  const matchingTasks = model.tasks.filter((candidate) => candidate.id === taskId);
  if (matchingTasks.length > 1) {
    return {
      task: null,
      gaps: [
        ...model.gaps.filter((gap) => gap.taskId === taskId),
        taskGap(
          taskId,
          'id',
          `Task id ${taskId} is ambiguous; ${matchingTasks.length} tasks share this id: ${matchingTasks.map(taskSourceEvidence).join('; ')}.`,
          'Inspect by a unique task id, or rename duplicate task ids before implementation.'
        )
      ]
    };
  }
  const task = matchingTasks[0] ?? null;
  return {
    task,
    gaps: model.gaps.filter((gap) => gap.taskId === taskId || (task === null && gap.taskId === null))
  };
}

export function taskGap(taskId: string, field: string, message: string, recommendation: string): SddTaskGap {
  return {
    type: 'Task Gap',
    severity: 'blocking',
    taskId,
    field,
    message,
    recommendation
  };
}

function taskSourceEvidence(task: Pick<SddTask, 'id' | 'source'>): string {
  return `${task.id} at ${task.source.filePath}:${task.source.lineStart}-${task.source.lineEnd}`;
}
