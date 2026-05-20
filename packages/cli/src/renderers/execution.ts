import type { BackgroundExecutorInspection, BackgroundExecutorResult } from '@sdd-agent-platform/core/execution';
import type { ForegroundSubagentRunResult } from '@sdd-agent-platform/core/execution';
import type { ResidentWorkerRuntimeClaimResult, ResidentWorkerRuntimeHeartbeatResult, ResidentWorkerRuntimeInspection, ResidentWorkerRuntimeList } from '@sdd-agent-platform/core/execution';
import type { WaveExecutorInspection, WaveExecutorResult } from '@sdd-agent-platform/core/execution';
import { renderIssues } from './issues.js';

export function renderBackgroundExecutorResult(result: BackgroundExecutorResult): string {
  const lines = [`Background executor ${result.status} for ${result.taskId}`];
  lines.push(`version=${result.version}`);
  lines.push(`run=${result.runId} delegation=${result.delegationId ?? 'n/a'} queue=${result.queueItemId ?? 'n/a'} worker=${result.workerAdapterId}`);
  lines.push(`artifact=${result.artifactPath ?? 'pending'}`);
  if (result.hostInvocation) {
    lines.push(`host_exit=${result.hostInvocation.exitCode ?? 'null'} timed_out=${result.hostInvocation.timedOut} stdout_bytes=${result.hostInvocation.stdoutBytes} stderr_bytes=${result.hostInvocation.stderrBytes}`);
  }
  lines.push(result.message);
  renderIssues(lines, result.issues);
  return lines.join('\n');
}

export function renderForegroundSubagentRunResult(result: ForegroundSubagentRunResult): string {
  const lines = [`Foreground subagents ${result.status} for ${result.taskId}`];
  lines.push(`run=${result.runId} branch=${result.branch} agents=${result.agents.length}`);
  lines.push(`summary_refs=${result.summaryRefs.length} deep_read_refs=${result.doNotReadUnlessNeededRefs.length}`);
  lines.push(result.message);
  for (const agent of result.agents) {
    lines.push(`- ${agent.agent}: ${agent.status} delegation=${agent.delegationId} artifact=${agent.artifactPath ?? 'none'}`);
    if (agent.digest) {
      lines.push(`  digest=${agent.digest.summary}`);
      for (const finding of agent.digest.keyFindings.slice(0, 3)) {
        lines.push(`  finding=${finding}`);
      }
      if (agent.digest.recommendation) {
        lines.push(`  recommendation=${agent.digest.recommendation}`);
      }
      for (const ref of agent.digest.deepReadRefs) {
        lines.push(`  deep_read=${ref.ref}`);
      }
    }
    if (agent.hostInvocation) {
      lines.push(`  host_exit=${agent.hostInvocation.exitCode ?? 'null'} timed_out=${agent.hostInvocation.timedOut} stdout_bytes=${agent.hostInvocation.stdoutBytes} stderr_bytes=${agent.hostInvocation.stderrBytes}`);
    }
    renderIssues(lines, agent.issues.map((issue) => ({ field: `${agent.agent}.${issue.field}`, message: issue.message, recommendation: issue.recommendation })));
  }
  lines.push('note=foreground subagents collect non-authoritative evidence only; they do not approve, sync-back, or ship.');
  return lines.join('\n');
}

export function renderBackgroundExecutorInspection(inspection: BackgroundExecutorInspection): string {
  const lines = [`Background executor ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`delegations=${inspection.delegations.length} running=${inspection.runningDelegations} terminal=${inspection.terminalDelegations} ingestions=${inspection.artifactIngestions.length}`);
  for (const delegation of inspection.delegations) {
    lines.push(`- ${delegation.delegationId} ${delegation.status} task=${delegation.taskId} agent=${delegation.agent} artifact=${delegation.expectedArtifact}`);
  }
  renderIssues(lines, inspection.issues);
  return lines.join('\n');
}

export function renderResidentWorkerRuntimeClaimResult(result: ResidentWorkerRuntimeClaimResult): string {
  const lines = [`Resident worker runtime ${result.status} for ${result.taskId}`];
  lines.push(`version=${result.version}`);
  lines.push(`run=${result.runId} runtime=${result.runtimeId ?? 'n/a'} delegation=${result.delegationId ?? 'n/a'} queue=${result.queueItemId ?? 'n/a'} worker=${result.workerAdapterId}`);
  lines.push(`artifact=${result.expectedArtifact ?? 'pending'} lease_expires=${result.leaseExpiresAt ?? 'n/a'}`);
  lines.push(result.message);
  renderIssues(lines, result.issues);
  if (result.runtimeId && result.leaseExpiresAt) {
    lines.push(`next sdd worker-runtime heartbeat ${result.runtimeId} --run ${result.runId}`);
    lines.push(`inspect sdd worker-runtime inspect ${result.runtimeId} --run ${result.runId}`);
  }
  return lines.join('\n');
}

export function renderResidentWorkerRuntimeHeartbeatResult(result: ResidentWorkerRuntimeHeartbeatResult): string {
  const lines = [`Resident worker runtime ${result.status}: ${result.runtimeId}`];
  lines.push(`version=${result.version}`);
  lines.push(`run=${result.runId} lease_expires=${result.leaseExpiresAt ?? 'n/a'}`);
  lines.push(result.message);
  renderIssues(lines, result.issues);
  if (result.runtime) {
    lines.push(`next ${result.status === 'terminal' ? `sdd background inspect ${result.runId}` : `sdd worker-runtime inspect ${result.runtimeId} --run ${result.runId}`}`);
  }
  return lines.join('\n');
}

export function renderResidentWorkerRuntimeList(result: ResidentWorkerRuntimeList): string {
  const lines = [`Resident worker runtimes for ${result.runId}`];
  lines.push(`version=${result.version}`);
  lines.push(`runtimes=${result.runtimes.length} active=${result.activeRuntimes} stale=${result.staleRuntimes} terminal=${result.terminalRuntimes} blocked=${result.blockedRuntimes}`);
  for (const runtime of result.runtimes) {
    lines.push(`- ${runtime.runtimeId} ${runtime.status} task=${runtime.taskId} agent=${runtime.agent} delegation=${runtime.delegationId} lease_expires=${runtime.leaseExpiresAt}`);
  }
  renderIssues(lines, result.issues);
  return lines.join('\n');
}

export function renderResidentWorkerRuntimeInspection(inspection: ResidentWorkerRuntimeInspection): string {
  const lines = [`Resident worker runtime ${inspection.status}: ${inspection.runtimeId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`run=${inspection.runId} valid=${inspection.valid} lease_expired=${inspection.leaseExpired}`);
  if (inspection.runtime) {
    lines.push(`task=${inspection.runtime.taskId} agent=${inspection.runtime.agent} worker=${inspection.runtime.workerAdapterId}`);
    lines.push(`delegation=${inspection.runtime.delegationId} queue=${inspection.runtime.queueItemId} artifact=${inspection.runtime.expectedArtifact}`);
    lines.push(`claimed=${inspection.runtime.claimedAt} heartbeat=${inspection.runtime.lastHeartbeatAt ?? 'none'} lease_expires=${inspection.runtime.leaseExpiresAt}`);
    lines.push(`evidence=${inspection.runtime.evidenceSummary}`);
  }
  lines.push(`queue_status=${inspection.queueItem?.status ?? 'missing'} adapter=${inspection.workerAdapter?.id ?? 'missing'}`);
  lines.push(`next ${inspection.recommendedNextCommand}`);
  renderIssues(lines, inspection.issues);
  return lines.join('\n');
}

export function renderWaveExecutorResult(result: WaveExecutorResult): string {
  const lines = [`Wave executor ${result.status} for ${result.branch}`];
  lines.push(`version=${result.version}`);
  lines.push(`run=${result.runId} strategy=${result.strategy} waves=${result.executedWaves}/${result.plannedWaves} tasks=${result.taskResults.length}`);
  lines.push(result.message);
  for (const task of result.taskResults) {
    lines.push(`- wave ${task.waveIndex} ${task.taskId}: ${task.result.status} delegation=${task.result.delegationId ?? 'n/a'} artifact=${task.result.artifactPath ?? 'pending'}`);
  }
  if (result.manualGates.length > 0) {
    lines.push('manual_gates');
    for (const gate of result.manualGates) {
      lines.push(`- ${gate.taskId}: ${gate.reasons.join(' | ')}`);
    }
  }
  if (result.blockedTasks.length > 0) {
    lines.push('blocked_tasks');
    for (const gate of result.blockedTasks) {
      lines.push(`- ${gate.taskId}: ${gate.reasons.join(' | ')}`);
    }
  }
  renderIssues(lines, result.issues);
  return lines.join('\n');
}

export function renderWaveExecutorInspection(inspection: WaveExecutorInspection): string {
  const lines = [`Wave executor ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`events=${inspection.waveEvents.length} delegations=${inspection.background.delegations.length} terminal=${inspection.background.terminalDelegations}`);
  for (const event of inspection.waveEvents) {
    lines.push(`- ${event.event}: ${event.summary ?? ''}`);
  }
  renderIssues(lines, inspection.issues);
  return lines.join('\n');
}
