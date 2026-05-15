import type { DelegationStateMachine } from '@sdd-agent-platform/core/delegation';
import type { DelegationQueueItem } from '@sdd-agent-platform/core/run-state';
import type { ToolCapability, ToolPluginContract, WorkerAdapterContract } from '@sdd-agent-platform/core/registries';

export function renderCapabilityList(capabilities: ToolCapability[]): string {
  const lines = ['SDD tool capabilities'];
  for (const capability of capabilities) {
    lines.push(`- ${capability.id} category=${capability.category} side_effect=${capability.sideEffect} default=${capability.defaultAvailable}`);
  }
  return lines.join('\n');
}

export function renderCapabilityInspect(capability: ToolCapability): string {
  const lines = [`Capability ${capability.id}`];
  lines.push(`title=${capability.title}`);
  lines.push(`category=${capability.category} side_effect=${capability.sideEffect} default=${capability.defaultAvailable}`);
  lines.push(`summary=${capability.summary}`);
  lines.push('allowed_stages');
  for (const stage of capability.allowedStages) {
    lines.push(`- ${stage}`);
  }
  lines.push('required_evidence');
  for (const evidence of capability.requiredEvidence) {
    lines.push(`- ${evidence}`);
  }
  lines.push('forbidden_uses');
  for (const forbiddenUse of capability.forbiddenUses) {
    lines.push(`- ${forbiddenUse}`);
  }
  return lines.join('\n');
}

export function renderPluginContractList(contracts: ToolPluginContract[]): string {
  const lines = ['SDD plugin loading contracts'];
  for (const contract of contracts) {
    lines.push(`- ${contract.id} capability=${contract.capabilityId} entry=${contract.entryKind} load_mode=${contract.loadMode}`);
  }
  return lines.join('\n');
}

export function renderPluginContractInspect(contract: ToolPluginContract): string {
  const lines = [`Plugin contract ${contract.id}`];
  lines.push(`title=${contract.title}`);
  lines.push(`version=${contract.version} capability=${contract.capabilityId}`);
  lines.push(`entry=${contract.entryKind} load_mode=${contract.loadMode}`);
  lines.push(`asset_path=${contract.assetPath}`);
  lines.push(`checksum=${contract.checksum ?? 'none'}`);
  lines.push('required_evidence');
  for (const evidence of contract.requiredEvidence) {
    lines.push(`- ${evidence}`);
  }
  lines.push('forbidden_uses');
  for (const forbiddenUse of contract.forbiddenUses) {
    lines.push(`- ${forbiddenUse}`);
  }
  return lines.join('\n');
}

export function renderDelegationQueueList(items: DelegationQueueItem[]): string {
  const lines = ['SDD delegation queue items'];
  for (const item of items) {
    lines.push(`- ${item.id} task=${item.taskId} agent=${item.agent} status=${item.status} capability=${item.requestedCapabilityId}`);
  }
  return lines.join('\n');
}

export function renderDelegationQueueInspect(item: DelegationQueueItem): string {
  const lines = [`Queue item ${item.id}`];
  lines.push(`run=${item.runId} delegation=${item.delegationId}`);
  lines.push(`task=${item.taskId} agent=${item.agent} status=${item.status}`);
  lines.push(`capability=${item.requestedCapabilityId} source=${item.statusSource} run_mode=${item.runMode}`);
  lines.push(`dedupe_key=${item.dedupeKey}`);
  lines.push(`expected_artifact=${item.expectedArtifact}`);
  lines.push('required_evidence');
  for (const evidence of item.requiredEvidence) {
    lines.push(`- ${evidence}`);
  }
  return lines.join('\n');
}

export function renderDelegationStateMachineInspect(machine: DelegationStateMachine): string {
  const lines = [`Delegation state machine ${machine.version}`];
  lines.push(`statuses=${machine.statuses.join(',')}`);
  lines.push(`terminal_statuses=${machine.terminalStatuses.join(',')}`);
  lines.push('transitions');
  for (const transition of machine.transitions) {
    lines.push(`- ${transition.from} -> ${transition.to} event=${transition.event} terminal=${transition.terminal}`);
  }
  return lines.join('\n');
}

export function renderWorkerAdapterList(adapters: WorkerAdapterContract[]): string {
  const lines = ['SDD worker adapter contracts'];
  for (const adapter of adapters) {
    lines.push(`- ${adapter.id} kind=${adapter.kind} capability=${adapter.capabilityId} plugin=${adapter.pluginContractId} side_effect=${adapter.sideEffect}`);
  }
  return lines.join('\n');
}

export function renderWorkerAdapterInspect(adapter: WorkerAdapterContract): string {
  const lines = [`Worker adapter ${adapter.id}`];
  lines.push(`title=${adapter.title}`);
  lines.push(`version=${adapter.version} kind=${adapter.kind}`);
  lines.push(`capability=${adapter.capabilityId} plugin=${adapter.pluginContractId} side_effect=${adapter.sideEffect}`);
  lines.push(`state_machine=${adapter.input.stateMachineVersion}`);
  lines.push(`artifact_reference=${adapter.output.artifactReference}`);
  lines.push(`terminal_status=${adapter.output.terminalStatus.join(',')}`);
  lines.push(`exit_statuses=${adapter.output.exitStatuses.join(',')}`);
  lines.push(`permission_prompt=${adapter.permissionPrompt}`);
  lines.push('required_events');
  for (const event of adapter.output.requiredEvents) {
    lines.push(`- ${event}`);
  }
  lines.push('required_evidence');
  for (const evidence of adapter.requiredEvidence) {
    lines.push(`- ${evidence}`);
  }
  lines.push('forbidden_uses');
  for (const forbiddenUse of adapter.forbiddenUses) {
    lines.push(`- ${forbiddenUse}`);
  }
  return lines.join('\n');
}
