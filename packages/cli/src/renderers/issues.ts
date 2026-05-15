export function renderIssues(lines: string[], issues: Array<{ field: string; message: string; recommendation: string }>): void {
  if (issues.length === 0) {
    return;
  }
  lines.push('issues');
  for (const issue of issues) {
    lines.push(`- ${issue.field}: ${issue.message}`);
    lines.push(`  recommendation: ${issue.recommendation}`);
  }
}

export function renderDocumentGaps(lines: string[], gaps: Array<{ severity: string; type: string; taskId?: string | null; field: string; message: string }>): void {
  if (gaps.length === 0) {
    return;
  }
  lines.push('gaps');
  for (const gap of gaps) {
    lines.push(`- [${gap.severity}] ${gap.type} ${gap.taskId ?? 'document'} ${gap.field}: ${gap.message}`);
  }
}

export function renderIssuesOrNone(lines: string[], issues: Array<{ field: string; message: string; recommendation: string }>): void {
  if (issues.length === 0) {
    lines.push('issues=none');
    return;
  }
  renderIssues(lines, issues);
}

export function renderWorkflowDocumentGaps(lines: string[], gaps: Array<{ severity: string; type: string; taskId?: string | null; field: string; message: string }>): void {
  if (gaps.length === 0) {
    lines.push('- document_gaps none');
    return;
  }
  lines.push('document_gaps');
  for (const gap of gaps) {
    lines.push(`- [${gap.severity}] ${gap.taskId ?? 'document'} ${gap.type}.${gap.field}: ${gap.message}`);
  }
}
