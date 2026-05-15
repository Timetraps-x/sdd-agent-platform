import type { LifecycleDecisionGateResult } from './decision-gate.js';

export function renderLifecycleDecisionGate(result: LifecycleDecisionGateResult): string {
  const decision = result.record.decision;
  const lines = [
    'Lifecycle Decision Gate',
    'changed',
    '- lifecycle decision evaluated',
    'decision',
    `- profile=${decision.profile ?? 'unknown'}`,
    `- confidence=${decision.confidence ?? 'unknown'}`,
    `- checkpoint_required=${decision.human_checkpoint_required}`,
    `- hard_gates=${decision.hard_gate_hits.join(',') || 'none'}`,
    `- required_stages=${decision.required_stages.join(' -> ') || 'none'}`,
    `- skipped_stages=${decision.skipped_stages.join(',') || 'none'}`,
    `- autonomy_ceiling=${result.autonomyCeiling}`,
    'evidence'
  ];
  for (const reason of result.record.reasons) {
    lines.push(`- ${reason}`);
  }
  lines.push('gaps');
  if (result.record.escalation_triggers.length === 0) {
    lines.push('- none');
  } else {
    for (const trigger of result.record.escalation_triggers) {
      lines.push(`- escalation_trigger: ${trigger}`);
    }
  }
  lines.push('next');
  if (decision.required_stages.length > 0) {
    lines.push(`- Complete required stages: ${decision.required_stages.join(' -> ')}.`);
  } else {
    lines.push('- No required stages were selected.');
  }
  lines.push('Command boundaries:');
  for (const boundary of result.boundaries) {
    lines.push(`- ${boundary}`);
  }
  return lines.join('\n');
}
