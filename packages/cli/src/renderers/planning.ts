import type { TaskGraphPlan } from '@sdd-agent-platform/core/planning';
import type { WavePlan } from '@sdd-agent-platform/core/planning';

export function renderTaskGraphPlan(graph: TaskGraphPlan): string {
  const lines = [`Task graph ${graph.valid ? 'valid' : 'blocked'} for ${graph.branch}`];
  lines.push(`version=${graph.version}`);
  lines.push(`contract=${graph.contract}`);
  lines.push(`tasks=${graph.summary.tasks} dependencies=${graph.summary.dependencies} file_overlaps=${graph.summary.fileOverlaps}`);
  lines.push(`high_risk_tasks=${graph.summary.highRiskTasks.length > 0 ? graph.summary.highRiskTasks.join(',') : 'none'}`);
  lines.push(`validation=${graph.summary.validationCommands.length > 0 ? graph.summary.validationCommands.join(' | ') : 'none'}`);
  lines.push(`risk_notes=${graph.summary.riskNotes.length > 0 ? graph.summary.riskNotes.join(' | ') : 'none'}`);
  lines.push('nodes');
  for (const node of graph.nodes) {
    lines.push(`- ${node.taskId} status=${node.status} wave=${node.wave ?? 'n/a'} deps=${node.dependsOn.join(',') || 'none'} files=${node.affectedFiles.length} agent_fit=${node.agentFit.join(',') || 'none'} verification=${node.verificationAvailability.join(',') || 'none'} autonomy=${node.autonomy ?? 'n/a'}`);
  }
  if (graph.dependencyEdges.length > 0) {
    lines.push('dependency_edges');
    for (const edge of graph.dependencyEdges) {
      lines.push(`- ${edge.from} -> ${edge.to}`);
    }
  }
  if (graph.fileOverlapEdges.length > 0) {
    lines.push('file_overlap_edges');
    for (const edge of graph.fileOverlapEdges) {
      lines.push(`- ${edge.from} <-> ${edge.to}: ${edge.files.join(',')}`);
    }
  }
  if (graph.diagnostics.length > 0) {
    lines.push('diagnostics');
    for (const diagnostic of graph.diagnostics) {
      lines.push(`- [${diagnostic.severity}] ${diagnostic.taskId ?? 'document'} ${diagnostic.field}: ${diagnostic.message}`);
      lines.push(`  recommendation: ${diagnostic.recommendation}`);
    }
  }
  return lines.join('\n');
}

export function renderWavePlan(plan: WavePlan): string {
  const lines = [`Wave plan ${plan.valid ? 'valid' : 'blocked'} for ${plan.branch}`];
  lines.push(`version=${plan.version}`);
  lines.push(`tasks=${plan.summary.tasks} waves=${plan.summary.waves} planned=${plan.summary.plannedTasks} manual=${plan.summary.manualTasks} blocked=${plan.summary.blockedTasks}`);
  if (plan.waves.length > 0) {
    lines.push('waves');
    for (const wave of plan.waves) {
      const tasks = wave.tasks.map((task) => `${task.taskId}(${task.isolationMode})`).join(', ');
      lines.push(`- wave ${wave.index}: ${tasks}`);
    }
  }
  if (plan.manualGates.length > 0) {
    lines.push('manual_gates');
    for (const gate of plan.manualGates) {
      lines.push(`- ${gate.taskId}: ${gate.reasons.join(' | ')}`);
    }
  }
  if (plan.blockedTasks.length > 0) {
    lines.push('blocked_tasks');
    for (const gate of plan.blockedTasks) {
      lines.push(`- ${gate.taskId}: ${gate.reasons.join(' | ')}`);
    }
  }
  if (plan.diagnostics.length > 0) {
    lines.push('diagnostics');
    for (const diagnostic of plan.diagnostics) {
      lines.push(`- [${diagnostic.severity}] ${diagnostic.taskId ?? 'document'} ${diagnostic.field}: ${diagnostic.message}`);
      lines.push(`  recommendation: ${diagnostic.recommendation}`);
    }
  }
  return lines.join('\n');
}
