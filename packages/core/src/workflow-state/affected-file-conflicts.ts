import type { RunState } from '../run-state/model.js';

export interface WorkflowAffectedFileConflict {
  file: string;
  partition: string;
  gitBranch: string | null;
  taskId: string;
  runId: string;
  runStatus: RunState['status'];
  syncBackStatus: RunState['syncBack']['status'];
  updatedAt: string;
}

export function affectedFileConflictsForSelectedRun(states: RunState[], selected: RunState): WorkflowAffectedFileConflict[] {
  if (!selected.partition || !selected.taskId || selected.affectedFiles.length === 0) {
    return [];
  }

  const selectedFiles = new Set(selected.affectedFiles);
  const conflicts: WorkflowAffectedFileConflict[] = [];
  for (const state of states) {
    if (!isAffectedFileConflictCandidate(state, selected)) {
      continue;
    }
    for (const file of state.affectedFiles) {
      if (selectedFiles.has(file)) {
        conflicts.push({
          file,
          partition: state.partition,
          gitBranch: state.gitBranch,
          taskId: state.taskId,
          runId: state.runId,
          runStatus: state.status,
          syncBackStatus: state.syncBack.status,
          updatedAt: state.updatedAt
        });
      }
    }
  }
  return conflicts.sort((left, right) => left.file.localeCompare(right.file) || left.partition.localeCompare(right.partition) || left.taskId.localeCompare(right.taskId) || left.runId.localeCompare(right.runId));
}

function isAffectedFileConflictCandidate(candidate: RunState, selected: RunState): candidate is RunState & { partition: string; taskId: string } {
  if (candidate.runId === selected.runId || candidate.status === 'archived' || !candidate.partition || !candidate.taskId) {
    return false;
  }
  if (isNonAuthoritativeForegroundRun(candidate)) {
    return false;
  }
  if (selectedSupersedesCandidate(selected, candidate)) {
    return false;
  }
  return isActiveAffectedFileRun(candidate);
}

function isActiveAffectedFileRun(state: RunState): boolean {
  return state.status === 'created' || state.status === 'running' || state.syncBack.status === 'proposed';
}

function selectedSupersedesCandidate(selected: RunState, candidate: RunState): boolean {
  return Boolean(
    selected.partition &&
    selected.taskId &&
    selected.partition === candidate.partition &&
    selected.taskId === candidate.taskId &&
    selected.status === 'completed' &&
    selected.validation.status === 'pass' &&
    Date.parse(selected.updatedAt) > Date.parse(candidate.updatedAt) &&
    (candidate.status === 'failed' || candidate.status === 'blocked' || candidate.validation.status === 'fail' || candidate.validation.status === 'blocked' || candidate.syncBack.status === 'proposed')
  );
}

function isNonAuthoritativeForegroundRun(state: RunState): boolean {
  if (state.phase === 'foreground-subagents') {
    return true;
  }
  const delegations = Object.values(state.delegations);
  return delegations.length > 0 && delegations.every((delegation) => delegation.runMode === 'foreground' && !delegation.blocking && !delegation.requiredForPhaseExit);
}
