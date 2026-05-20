import type { SddTask, SddTaskGap, SddTaskModel } from './task-parser.js';

export function renderTaskList(model: SddTaskModel): string {
  const lines = [`SDD tasks for ${model.branch}`];
  for (const task of model.tasks) {
    lines.push(`${task.id}\t${task.status}\twave=${task.wave ?? 'n/a'}\tdeps=${task.dependsOn.join(',') || 'none'}\t${task.title ?? ''}`.trim());
  }
  lines.push(`gaps=${model.gaps.length}`);
  return lines.join('\n');
}

export function renderTaskInspect(task: SddTask | null, gaps: SddTaskGap[] = []): string {
  if (task === null) {
    const lines = ['SDD task inspect', 'decision', '- task not found or ambiguous', 'gaps'];
    if (gaps.length === 0) {
      lines.push('- none');
    } else {
      appendTaskGaps(lines, gaps);
    }
    lines.push('next');
    lines.push('- run sdd tasks list or fix duplicate/missing task ids before implementation');
    return lines.join('\n');
  }

  const lines = [`SDD task ${task.id}`, 'changed', '- none', 'decision'];
  lines.push(`- title=${task.title ?? 'n/a'}`);
  lines.push(`- status=${task.status} wave=${task.wave ?? 'n/a'} depends_on=${task.dependsOn.join(',') || 'none'}`);
  lines.push(`- autonomy=${task.autonomy ?? 'n/a'}`);
  lines.push('evidence');
  lines.push(`- source=${task.source.filePath}:${task.source.lineStart}`);
  appendTextValue(lines, 'boundary', task.boundary);
  appendListValue(lines, 'acceptance', task.acceptance);
  appendListValue(lines, 'risk', task.risk);
  appendListValue(lines, 'acceptance_refs', task.acceptanceRefs);
  appendListValue(lines, 'plan_refs', task.planRefs);
  appendListValue(lines, 'affected_files', task.affectedFiles);
  appendListValue(lines, 'validation', task.validation);
  appendListValue(lines, 'agent_fit', task.agentFit);
  appendListValue(lines, 'verification_availability', task.verificationAvailability);
  appendListValue(lines, 'allowed_agents', task.allowedAgents);
  appendListValue(lines, 'required_artifacts', task.requiredArtifacts);
  lines.push('gaps');
  if (gaps.length === 0) {
    lines.push('- none');
  } else {
    appendTaskGaps(lines, gaps);
  }
  lines.push('next');
  if (gaps.some((gap) => gap.severity === 'blocking')) {
    lines.push(`- fix blocking task metadata gaps before running sdd do task ${task.id}`);
  } else {
    lines.push(`- sdd do task ${task.id}`);
  }
  return lines.join('\n');
}

export function appendTaskGaps(lines: string[], gaps: SddTaskGap[], fallbackTaskId = 'document'): void {
  for (const gap of gaps) {
    lines.push(`- [${gap.severity}] ${gap.type} ${gap.taskId ?? fallbackTaskId} ${gap.field}: ${gap.message}`);
    lines.push(`  recommendation: ${gap.recommendation}`);
  }
}

export function renderTaskGapReport(model: SddTaskModel): string {
  if (model.gaps.length === 0) {
    return 'PASS\nNo task gaps detected.';
  }
  const lines = ['BLOCKED', 'Task Gap Report'];
  for (const gap of model.gaps) {
    lines.push(`- [${gap.severity}] ${gap.type} ${gap.taskId ?? 'document'} ${gap.field}: ${gap.message} Recommendation: ${gap.recommendation}`);
  }
  return lines.join('\n');
}

function appendTextValue(lines: string[], label: string, value: string | null): void {
  lines.push(`- ${label}: ${value ?? 'none'}`);
}

function appendListValue(lines: string[], label: string, values: string[]): void {
  lines.push(`- ${label}: ${values.join(', ') || 'none'}`);
}
