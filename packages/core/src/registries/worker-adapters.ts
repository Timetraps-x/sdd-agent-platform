import { readFile } from 'node:fs/promises';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';
import type { ToolCapabilitySideEffect } from './tool-capabilities.js';

export type WorkerAdapterKind = 'claude_code_subagent' | 'sdd_cli_task' | 'manual_handoff';
export type WorkerAdapterExitStatus = 'completed' | 'failed' | 'cancelled' | 'timed_out' | 'blocked';
export type WorkerAdapterTerminalStatus = 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED';

export interface WorkerAdapterPayloadContract {
  queueItemId: string;
  runId: string;
  taskId: string;
  delegationId: string;
  stateMachineVersion: string;
}

export interface WorkerAdapterOutputContract {
  artifactReference: string;
  terminalStatus: WorkerAdapterTerminalStatus[];
  exitStatuses: WorkerAdapterExitStatus[];
  requiredEvents: string[];
}

export interface WorkerAdapterContract {
  id: string;
  title: string;
  version: string;
  kind: WorkerAdapterKind;
  capabilityId: string;
  pluginContractId: string;
  input: WorkerAdapterPayloadContract;
  output: WorkerAdapterOutputContract;
  sideEffect: ToolCapabilitySideEffect;
  permissionPrompt: string;
  requiredEvidence: string[];
  forbiddenUses: string[];
}

export interface WorkerAdapterContractRegistry {
  version: string;
  adapters: WorkerAdapterContract[];
}

export const WORKER_ADAPTER_CONTRACT_REGISTRY_VERSION = 'phase-3.5-worker-adapter-contract-v1';

const DELEGATION_STATE_MACHINE_VERSION = 'phase-3.4-delegation-state-machine-v1';

const BUILT_IN_WORKER_ADAPTER_CONTRACTS: WorkerAdapterContract[] = [
  {
    id: 'claude-code-subagent-worker',
    title: 'Claude Code subagent worker adapter',
    version: '1.0.0',
    kind: 'claude_code_subagent',
    capabilityId: 'sdd-cli',
    pluginContractId: 'sdd-cli-runtime',
    input: {
      queueItemId: '<run_id>:<delegation_id>',
      runId: '<run_id>',
      taskId: '<task_id>',
      delegationId: '<delegation_id>',
      stateMachineVersion: DELEGATION_STATE_MACHINE_VERSION
    },
    output: {
      artifactReference: 'artifacts/<agent>-<task_id>.md',
      terminalStatus: ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'],
      exitStatuses: ['completed', 'failed', 'timed_out', 'cancelled', 'blocked'],
      requiredEvents: ['delegation_started', 'delegation_completed', 'delegation_failed', 'delegation_timeout', 'delegation_cancelled']
    },
    sideEffect: 'command_execution',
    permissionPrompt: 'Run a Claude Code/subagent task for one queued delegation and persist only declared run events/artifact references.',
    requiredEvidence: ['queue item id', 'delegation state transition event', 'sdd-result artifact reference'],
    forbiddenUses: ['bypass Claude Code permission prompts', 'execute undeclared wave scheduling', 'write outside .sdd/runs or declared artifacts', 'reopen terminal delegation ids']
  },
  {
    id: 'manual-handoff-worker',
    title: 'Manual handoff worker adapter',
    version: '1.0.0',
    kind: 'manual_handoff',
    capabilityId: 'sdd-cli',
    pluginContractId: 'sdd-cli-runtime',
    input: {
      queueItemId: '<run_id>:<delegation_id>',
      runId: '<run_id>',
      taskId: '<task_id>',
      delegationId: '<delegation_id>',
      stateMachineVersion: DELEGATION_STATE_MACHINE_VERSION
    },
    output: {
      artifactReference: 'artifacts/<agent>-<task_id>.md',
      terminalStatus: ['COMPLETED', 'FAILED', 'CANCELLED'],
      exitStatuses: ['completed', 'failed', 'cancelled', 'blocked'],
      requiredEvents: ['delegation_started', 'delegation_completed', 'delegation_failed', 'delegation_cancelled']
    },
    sideEffect: 'read_only',
    permissionPrompt: 'Prepare a manual delegation handoff without starting a background process.',
    requiredEvidence: ['queue item id', 'manual handoff instructions', 'expected artifact reference'],
    forbiddenUses: ['start background worker', 'claim queue item', 'mark delegation completed without artifact evidence']
  },
  {
    id: 'sdd-cli-task-worker',
    title: 'SDD CLI task worker adapter',
    version: '1.0.0',
    kind: 'sdd_cli_task',
    capabilityId: 'artifact-run-hygiene',
    pluginContractId: 'artifact-run-hygiene-tools',
    input: {
      queueItemId: '<run_id>:<delegation_id>',
      runId: '<run_id>',
      taskId: '<task_id>',
      delegationId: '<delegation_id>',
      stateMachineVersion: DELEGATION_STATE_MACHINE_VERSION
    },
    output: {
      artifactReference: 'artifacts/<agent>-<task_id>.md',
      terminalStatus: ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'],
      exitStatuses: ['completed', 'failed', 'timed_out', 'cancelled', 'blocked'],
      requiredEvents: ['delegation_started', 'delegation_completed', 'delegation_failed', 'delegation_timeout', 'delegation_cancelled']
    },
    sideEffect: 'local_write',
    permissionPrompt: 'Run a bounded SDD CLI task adapter and write only declared artifact/run evidence.',
    requiredEvidence: ['queue item id', 'command output', 'sdd-result artifact reference'],
    forbiddenUses: ['unapproved complex sync-back apply', 'dynamic plugin execution', 'background wave execution', 'write undeclared artifacts']
  }
];

export async function listWorkerAdapterContracts(projectRoot: string): Promise<WorkerAdapterContractRegistry> {
  await assertProjectConfigReadable(projectRoot);
  return {
    version: WORKER_ADAPTER_CONTRACT_REGISTRY_VERSION,
    adapters: [...BUILT_IN_WORKER_ADAPTER_CONTRACTS].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectWorkerAdapterContract(projectRoot: string, adapterId: string): Promise<WorkerAdapterContract | null> {
  const registry = await listWorkerAdapterContracts(projectRoot);
  return registry.adapters.find((adapter) => adapter.id === adapterId) ?? null;
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
