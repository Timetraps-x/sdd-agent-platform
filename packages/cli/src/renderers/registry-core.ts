import type { AgentRegistryEntry, WorkflowGateContract } from '@sdd-agent-platform/core/registries';
import type { AgentRegistryValidation, WorkflowGateValidation } from '@sdd-agent-platform/core/router';

export function renderWorkflowGateList(workflows: WorkflowGateContract[]): string {
  const lines = ['SDD workflow gates'];
  for (const workflow of workflows) {
    lines.push(`- ${workflow.id} command=${workflow.command} agents=${workflow.allowedAgents.join(',') || 'none'}`);
  }
  return lines.join('\n');
}

export function renderWorkflowGateInspect(workflow: WorkflowGateContract): string {
  const lines = [`Workflow gate ${workflow.id}`];
  lines.push(`version=${workflow.version}`);
  lines.push(`command=${workflow.command}`);
  lines.push(`agents=${workflow.allowedAgents.join(',') || 'none'}`);
  lines.push('required_inputs');
  for (const input of workflow.requiredInputs) {
    lines.push(`- ${input}`);
  }
  lines.push('required_artifacts');
  for (const artifact of workflow.requiredArtifacts) {
    lines.push(`- ${artifact}`);
  }
  lines.push('gate_conditions');
  for (const condition of workflow.gateConditions) {
    lines.push(`- ${condition}`);
  }
  lines.push(`gap_closure=${workflow.gapClosureBehavior}`);
  lines.push(`next=${workflow.nextAction}`);
  return lines.join('\n');
}

export function renderWorkflowGateValidation(result: WorkflowGateValidation): string {
  const lines = ['SDD workflow gate validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`workflows=${result.workflows.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

export function renderAgentRegistryList(agents: AgentRegistryEntry[]): string {
  const lines = ['SDD agent registry'];
  for (const agent of agents) {
    lines.push(`- ${agent.id} stages=${agent.allowedStages.join(',')} autonomy=${agent.autonomyCeiling}`);
  }
  return lines.join('\n');
}

export function renderAgentRegistryInspect(agent: AgentRegistryEntry): string {
  const lines = [`Agent ${agent.id}`];
  lines.push(`version=${agent.version}`);
  lines.push(`role=${agent.role}`);
  lines.push(`allowed_stages=${agent.allowedStages.join(',')}`);
  lines.push(`autonomy_ceiling=${agent.autonomyCeiling}`);
  lines.push(`required_artifact=${agent.requiredArtifact}`);
  lines.push(`verification=${agent.verificationExpectation}`);
  lines.push('capabilities');
  for (const capability of agent.capabilities) {
    lines.push(`- ${capability}`);
  }
  lines.push('read_boundary');
  for (const item of agent.readBoundary) {
    lines.push(`- ${item}`);
  }
  lines.push('write_boundary');
  for (const item of agent.writeBoundary) {
    lines.push(`- ${item}`);
  }
  lines.push('tool_allowlist');
  for (const tool of agent.toolAllowlist) {
    lines.push(`- ${tool}`);
  }
  lines.push(`stop_condition=${agent.stopCondition}`);
  return lines.join('\n');
}

export function renderAgentRegistryValidation(result: AgentRegistryValidation): string {
  const lines = ['SDD agent registry validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`agents=${result.agents.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}
