import type { AgentRouterDecision } from '@sdd-agent-platform/core/router';

export function renderAgentRouterDecision(decision: AgentRouterDecision): string {
  return [
    `SDD route ${decision.taskId}`,
    '',
    resultSentenceForRoute(decision),
    '',
    'Why:',
    `- ${decision.primaryReason}`,
    '',
    'Next:',
    `- ${decision.nextAction}`
  ].join('\n');
}

function resultSentenceForRoute(decision: AgentRouterDecision): string {
  if (decision.blockedReason) {
    if (decision.lifecycleGate === 'research-before-implementation') {
      return 'Blocked before implementation research is complete.';
    }
    if (decision.lifecycleGate === 'clarify-before-routing') {
      return 'Blocked before routing.';
    }
    return 'Blocked before validation.';
  }
  if (decision.lifecycleGate === 'direct') {
    return 'Routed through the direct workflow.';
  }
  if (decision.lifecycleGate === 'review-before-sync-back') {
    return 'Routed; validation can run and sync-back needs review.';
  }
  return 'Routed with a lifecycle checkpoint.';
}
