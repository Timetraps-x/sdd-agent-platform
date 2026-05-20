import type { ContextBuildPackage } from '@sdd-agent-platform/core/context';
import type { EvidenceSummaryProjection } from '@sdd-agent-platform/core/context';

export function renderEvidenceSummaryProjection(summary: EvidenceSummaryProjection): string {
  const lines = [`Evidence summary ${summary.runId}`];
  lines.push(`task=${summary.taskId ?? 'none'} authoritative=${summary.authoritative} usable_for_pass=${summary.usableForPass}`);
  lines.push(`pass=${summary.passCount} blocked=${summary.blockedCount} fail=${summary.failCount} issues=${summary.issueCodes.join(',') || 'none'}`);
  lines.push('highlights');
  for (const highlight of summary.highlights.slice(0, 8)) {
    lines.push(`- ${highlight}`);
  }
  lines.push('sources');
  for (const source of summary.sources.slice(0, 12)) {
    lines.push(`- ${source.kind}:${source.path} hash=${source.hash.slice(0, 12)}`);
  }
  if (summary.sources.length > 12) {
    lines.push(`- omitted_sources=${summary.sources.length - 12}`);
  }
  return lines.join('\n');
}

export function renderContextBuildPackage(contextPackage: ContextBuildPackage): string {
  const lines = [`Context package ${contextPackage.taskId}`];
  lines.push(`mode=${contextPackage.mode} agent=${contextPackage.agent ?? 'none'} profile=${contextPackage.profile} branch=${contextPackage.branch}`);
  lines.push(`authoritative=${contextPackage.authoritative} usable_for_pass=${contextPackage.usableForPass}`);
  lines.push(`budget=${contextPackage.budget.estimatedBytes}/${contextPackage.budget.maxBytes} bytes estimated_tokens=${contextPackage.budget.estimatedTokens} included=${contextPackage.budget.includedRefs.length} deferred=${contextPackage.budget.deferredRefs.length} excluded=${contextPackage.budget.excludedRefs.length} truncated=${contextPackage.budget.truncatedSummaries.length}`);
  renderContextRefs(lines, 'must_read', contextPackage.mustRead, 10);
  renderContextRefs(lines, 'optional_read', contextPackage.optionalRead, 8);
  renderContextRefs(lines, 'deferred', contextPackage.doNotReadUnlessNeeded, 6);
  lines.push('next_commands');
  for (const command of contextPackage.nextCommands) {
    lines.push(`- ${command}`);
  }
  if (contextPackage.warnings.length > 0) {
    lines.push('warnings');
    for (const warning of contextPackage.warnings.slice(0, 6)) {
      lines.push(`- ${warning}`);
    }
  }
  return lines.join('\n');
}

function renderContextRefs(lines: string[], label: string, refs: ContextBuildPackage['mustRead'], limit: number): void {
  lines.push(label);
  for (const ref of refs.slice(0, limit)) {
    lines.push(`- ${ref.kind}:${ref.path} hash=${ref.hash.slice(0, 12)}`);
  }
  if (refs.length > limit) {
    lines.push(`- omitted_${label}=${refs.length - limit}`);
  }
}
