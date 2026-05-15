import type { AgentRouterDecision } from '@sdd-agent-platform/core/router';

export function renderAgentRouterDecision(decision: AgentRouterDecision): string {
  const lines = [`Agent router decision ${decision.taskId}`];
  lines.push(`version=${decision.version}`);
  lines.push(`branch=${decision.branch} category=${decision.category}`);
  lines.push(`recommended_profile=${decision.recommendedProfile ?? 'none'} autonomy_ceiling=${decision.autonomyCeiling}`);
  lines.push(`allowed_profiles=${decision.allowedProfiles.join(',') || 'none'}`);
  lines.push(`required_capabilities=${decision.requiredCapabilities.join(',') || 'none'}`);
  lines.push(`source_capability=${decision.sourceCapability ?? 'none'} reuse=${decision.reuseDecision ?? 'none'}`);
  if (decision.registrySources && decision.registrySources.length > 0) {
    lines.push(`registry_sources=${decision.registrySources.map((source) => `${source.kind}:${source.id}:${source.origin}`).join(',')}`);
  }
  if (decision.resolvedAliases && decision.resolvedAliases.length > 0) {
    lines.push(`alias_resolutions=${decision.resolvedAliases.map((alias) => `${alias.input}->${alias.resolved}:${alias.source}`).join(',')}`);
  }
  if (decision.routingRuleHits && decision.routingRuleHits.length > 0) {
    lines.push(`routing_rule_hits=${decision.routingRuleHits.join(',')}`);
  }
  if (decision.quarantineWarnings && decision.quarantineWarnings.length > 0) {
    lines.push('quarantine_warnings');
    for (const warning of decision.quarantineWarnings) {
      lines.push(`- ${warning}`);
    }
  }
  if (decision.adapterMapping) {
    lines.push(`adapter_mapping profile=${decision.adapterMapping.profile} host=${decision.adapterMapping.hostAdapter} projection=${decision.adapterMapping.projection}`);
  }
  if (decision.toolPermission) {
    lines.push(`tool_permission profile=${decision.toolPermission.profile} policy=${decision.toolPermission.policy} groups=${decision.toolPermission.toolGroups.join(',')}`);
    lines.push(`approval=${decision.toolPermission.approvalPolicy}`);
  }
  lines.push(`model_policy=${decision.modelPolicy.id} category=${decision.modelPolicy.category}`);
  lines.push(`team_mode=${decision.teamMode.decision} mode=${decision.teamMode.mode} activation=${decision.teamMode.activation} cost=${decision.teamMode.costClass} cost_route=${decision.teamMode.costRoute} waves=${decision.teamMode.waveRecommendation.join(',') || 'none'}`);
  lines.push(`team_mode_reason=${decision.teamMode.reason}`);
  if (decision.teamMode.downgradeReason) {
    lines.push(`team_mode_downgrade=${decision.teamMode.downgradeReason}`);
  }
  lines.push(`trust_policy_enforced=${decision.teamMode.trustPolicyEnforced}`);
  if (decision.cache) {
    lines.push(`route_cache=${decision.cache.status} key=${decision.cache.key} authoritative=${decision.cache.authoritative}`);
  }
  if (decision.profile && decision.profile.length > 0) {
    lines.push('profile');
    for (const span of decision.profile) {
      lines.push(`- ${span.name}: ${span.durationMs}ms`);
    }
  }
  lines.push(`required_artifacts=${decision.requiredArtifacts.join(',') || 'none'}`);
  if (decision.blockedReason) {
    lines.push(`blocked_reason=${decision.blockedReason}`);
  }
  lines.push(`next=${decision.nextAction}`);
  return lines.join('\n');
}
