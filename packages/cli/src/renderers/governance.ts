import type { GovernancePolicy, GovernancePolicyDecision } from '@sdd-agent-platform/core/governance';
import { renderIssues } from './issues.js';

export function renderGovernancePolicy(policy: GovernancePolicy): string {
  const lines = [`Governance policy ${policy.version}`];
  lines.push(`concurrency background=${policy.concurrency.maxBackgroundDelegations} wave=${policy.concurrency.maxWaveExecutors}`);
  lines.push(`confirmation operations=${policy.manualConfirmation.operations.join(',')}`);
  lines.push(`confirmation workers=${policy.manualConfirmation.workerAdapters.join(',') || 'none'}`);
  lines.push(`confirmation risks=${policy.manualConfirmation.riskTags.join(',') || 'none'}`);
  lines.push(`cleanup archive_only=${policy.cleanup.archiveOnly} delete_run_history=${policy.cleanup.deleteRunHistory}`);
  lines.push(`retry reopen_terminal=${policy.retry.reopenTerminalDelegation} max_attempts=${policy.retry.maxAttemptsPerDelegation}`);
  lines.push(`stop_conditions=${policy.stopConditions.join(',')}`);
  return lines.join('\n');
}

export function renderGovernancePolicyDecision(decision: GovernancePolicyDecision): string {
  const lines = [`Governance decision ${decision.status} for ${decision.operation}`];
  lines.push(`version=${decision.version} allowed=${decision.allowed}`);
  lines.push('reasons');
  for (const reason of decision.reasons) {
    lines.push(`- ${reason}`);
  }
  renderIssues(lines, decision.issues);
  return lines.join('\n');
}
