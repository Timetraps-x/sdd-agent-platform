import type { WorktreeIsolationDecision } from '@sdd-agent-platform/core/worktree';
import type { WorktreeLifecycleInspection, WorktreeLifecycleRecord } from '@sdd-agent-platform/core/worktree';
import { renderIssues } from './issues.js';

export function renderWorktreeIsolationDecision(decision: WorktreeIsolationDecision): string {
  const lines = [`Worktree isolation ${decision.mode} for ${decision.taskId}`];
  lines.push(`version=${decision.version}`);
  lines.push(`safe_concurrency=${decision.safeConcurrency} capability=${decision.capabilityId} side_effect=${decision.capabilitySideEffect}`);
  lines.push(`affected_files=${decision.affectedFiles.length > 0 ? decision.affectedFiles.join(',') : 'none'}`);
  lines.push(`risk=${decision.risk.length > 0 ? decision.risk.join(',') : 'none'}`);
  if (decision.overlaps.length > 0) {
    lines.push('overlaps');
    for (const overlap of decision.overlaps) {
      lines.push(`- ${overlap.peerTaskId}: ${overlap.files.join(',')}`);
    }
  }
  lines.push('gates');
  for (const gate of decision.gates) {
    lines.push(`- ${gate.name} ${gate.passed ? 'PASS' : 'FAIL'}: ${gate.message}`);
  }
  lines.push('reasons');
  for (const reason of decision.reasons) {
    lines.push(`- ${reason}`);
  }
  return lines.join('\n');
}

export function renderWorktreeLifecycleRecord(title: string, record: WorktreeLifecycleRecord): string {
  return [
    `${title}: ${record.worktreeId}`,
    `status=${record.status} task=${record.taskId} branch=${record.branchName}`,
    `path=${record.worktreePath} base=${record.baseRef} dirty=${record.dirty}`,
    `kept=${record.keepReason ?? 'n/a'} removed=${record.removedAt ?? 'n/a'}`
  ].join('\n');
}

export function renderWorktreeLifecycleInspection(inspection: WorktreeLifecycleInspection): string {
  const lines = [`Worktree lifecycle ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`records=${inspection.records.length}`);
  for (const record of inspection.records) {
    lines.push(`- ${record.worktreeId} ${record.status} task=${record.taskId} path=${record.worktreePath} dirty=${record.dirty}`);
  }
  renderIssues(lines, inspection.issues);
  return lines.join('\n');
}
