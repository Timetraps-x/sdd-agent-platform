import type { LifecycleDecisionGateResult } from './decision-gate.js';

export function renderLifecycleDecisionGate(result: LifecycleDecisionGateResult): string {
  const decision = result.record.decision;
  const lines = ['Lifecycle decision'];
  lines.push('');
  lines.push(lifecycleDecisionSentence(result));
  lines.push('');
  lines.push('Why:');
  lines.push(`- ${result.record.reasons[0] ?? 'Lifecycle signals were evaluated.'}`);
  lines.push('');
  lines.push('Next:');
  lines.push(`- ${decision.required_stages.length > 0 ? `Complete required stages: ${decision.required_stages.join(' -> ')}.` : 'No required stages were selected.'}`);
  return lines.join('\n');
}

function lifecycleDecisionSentence(result: LifecycleDecisionGateResult): string {
  const decision = result.record.decision;
  if (decision.profile === 'research') {
    return 'Research is required before implementation.';
  }
  if (decision.human_checkpoint_required) {
    return 'Lifecycle checkpoint is required.';
  }
  if (decision.profile === 'direct') {
    return 'Direct workflow is allowed.';
  }
  return 'Lifecycle workflow was selected.';
}
