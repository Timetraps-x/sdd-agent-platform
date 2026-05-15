import type { DoctorReport } from '@sdd-agent-platform/core/doctor';

export function renderDoctorReport(report: DoctorReport): string {
  const failures = report.checks.filter((check) => check.level === 'FAIL');
  const warnings = report.checks.filter((check) => check.level === 'WARN');
  const passes = report.checks.filter((check) => check.level === 'PASS');
  const lines = ['SDD doctor', 'decision'];
  lines.push(`- status=${report.status}`);
  lines.push(`- checks pass=${passes.length} warn=${warnings.length} fail=${failures.length}`);
  lines.push('evidence');
  const visibleChecks = [...failures, ...warnings, ...passes.slice(0, failures.length === 0 && warnings.length === 0 ? 5 : 2)];
  if (visibleChecks.length === 0) {
    lines.push('- no checks reported');
  } else {
    for (const check of visibleChecks) {
      const action = check.action ? ` action=${check.action}` : '';
      lines.push(`- [${check.level}] ${check.check}: ${check.message}${action}`);
    }
  }
  const hiddenPasses = passes.length - visibleChecks.filter((check) => check.level === 'PASS').length;
  if (hiddenPasses > 0) {
    lines.push(`- ${hiddenPasses} passing check(s) hidden; use --json for full details`);
  }
  lines.push('gaps');
  if (failures.length === 0 && warnings.length === 0) {
    lines.push('- none');
  } else {
    for (const check of [...failures, ...warnings]) {
      lines.push(`- [${check.level}] ${check.check}: ${check.action ?? check.message}`);
    }
  }
  lines.push('next');
  if (failures[0]?.action) {
    lines.push(`- ${failures[0].action}`);
  } else if (warnings[0]?.action) {
    lines.push(`- ${warnings[0].action}`);
  } else {
    lines.push('- sdd status');
  }
  return lines.join('\n');
}
