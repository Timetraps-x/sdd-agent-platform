import type { DoctorReport } from '@sdd-agent-platform/core/doctor';

export function renderDoctorReport(report: DoctorReport, options: { mode?: 'fast' | 'deep'; recover?: boolean } = {}): string {
  const failures = report.checks.filter((check) => check.level === 'FAIL');
  const warnings = report.checks.filter((check) => check.level === 'WARN');
  const primary = failures[0] ?? warnings[0] ?? null;
  const lines = ['SDD doctor'];
  lines.push('');
  lines.push(report.status === 'PASS' ? 'Project diagnostics passed.' : report.status === 'WARN' ? 'Project diagnostics passed with warnings.' : 'Project diagnostics failed.');
  lines.push('');
  lines.push('Why:');
  lines.push(`- ${primary?.message ?? `All ${report.checks.length} diagnostic checks passed.`}`);
  lines.push('');
  lines.push('Next:');
  lines.push(`- ${doctorNextActions(failures, warnings, options)[0]}`);
  return lines.join('\n');
}

function doctorNextActions(failures: DoctorReport['checks'], warnings: DoctorReport['checks'], options: { mode?: 'fast' | 'deep'; recover?: boolean }): string[] {
  const primary = failures[0]?.action ?? warnings[0]?.action;
  if (options.recover) {
    return [
      primary ?? 'sdd status',
      'sdd run index rebuild',
      'sdd sync-back inspect --task <task_id> --branch <branch>',
      'sdd doctor fast --branch <branch>'
    ].filter((item, index, items) => items.indexOf(item) === index);
  }
  if (primary) {
    return [primary, 'Use sdd doctor recover for deterministic repair/reconcile guidance.'];
  }
  return [options.mode === 'deep' ? 'sdd status' : 'sdd doctor deep --branch <branch>'];
}
