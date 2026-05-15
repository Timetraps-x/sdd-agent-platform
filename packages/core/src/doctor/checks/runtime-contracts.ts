import {
  BACKGROUND_EXECUTOR_CONTRACT_VERSION,
  LOCAL_RUN_INDEX_CONTRACT_VERSION,
  TASK_GRAPH_PLANNER_CONTRACT_VERSION,
  WAVE_EXECUTOR_CONTRACT_VERSION,
  WAVE_PLANNER_CONTRACT_VERSION
} from '../../contracts.js';
import { messageFromError } from '../../contracts/issues.js';
import { DELEGATION_STATE_MACHINE_VERSION, DELEGATION_STATUSES, TERMINAL_DELEGATION_STATUSES, getDelegationStateMachine } from '../../delegation/state-machine.js';
import { listDelegationQueueItems } from '../../delegation/queue.js';
import type { BackgroundExecutorStatus } from '../../execution/background-executor.js';
import type { WaveExecutorStrategy } from '../../execution/wave-executor.js';
import type { TaskGraphEdgeType } from '../../planning/task-graph.js';
import type { WavePlanGate } from '../../planning/wave-plan.js';
import { readProjectConfig as readProjectConfigFile } from '../../config/project-config.js';
import { listToolCapabilities } from '../../registries/tool-capabilities.js';
import { listToolPluginContracts } from '../../registries/tool-plugins.js';
import { listWorkerAdapterContracts } from '../../registries/worker-adapters.js';
import type { ProjectAgentRuntimeConfig } from '../../router/agent-runtime.js';
import { parseAgentRuntimeConfig } from '../../router/agent-runtime-config.js';
import { WORKTREE_ISOLATION_CONTRACT_VERSION, type WorktreeIsolationMode } from '../../worktree/isolation.js';
import { WORKTREE_LIFECYCLE_CONTRACT_VERSION, type WorktreeLifecycleStatus } from '../../worktree/lifecycle.js';
import type { DoctorCheck } from '../model.js';

const BASELINE_WORKER_ADAPTER_IDS = [
  'claude-code-subagent-worker',
  'sdd-cli-task-worker',
  'manual-handoff-worker'
] as const;

export async function inspectDelegationQueueContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const [capabilityRegistry, snapshot] = await Promise.all([
      listToolCapabilities(projectRoot),
      listDelegationQueueItems(projectRoot)
    ]);
    const capabilityIds = new Set(capabilityRegistry.capabilities.map((capability) => capability.id));
    const invalidItems = snapshot.items
      .filter((item) => !item.id || !item.runId || !item.delegationId || !item.taskId || !item.agent || !item.dedupeKey || !capabilityIds.has(item.requestedCapabilityId))
      .map((item) => item.id || '<missing-id>');

    if (invalidItems.length > 0) {
      return [{
        level: 'FAIL',
        check: 'delegation_queue_contract',
        message: `Delegation queue contract ${snapshot.version} has invalid queue item(s): ${invalidItems.join(', ')}.`,
        action: 'Restore delegation run-state records and ensure requested capabilities reference the Phase 3.1 registry.'
      }];
    }

    return [{
      level: 'PASS',
      check: 'delegation_queue_contract',
      message: `Delegation queue contract ${snapshot.version} derived ${snapshot.items.length} queue item(s) from run-state delegations.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'delegation_queue_contract',
      message: `Cannot inspect delegation queue contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting delegation queue items.'
    }];
  }
}

export async function inspectDelegationStateMachineContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const machine = getDelegationStateMachine();
    const statuses = new Set(machine.statuses);
    const terminalStatuses = new Set(machine.terminalStatuses);
    const missingStatuses = DELEGATION_STATUSES.filter((status) => !statuses.has(status));
    const invalidTerminalStatuses = machine.terminalStatuses.filter((status) => !TERMINAL_DELEGATION_STATUSES.includes(status));
    const invalidTransitions = machine.transitions.filter((transition) =>
      !statuses.has(transition.from) ||
      !statuses.has(transition.to) ||
      terminalStatuses.has(transition.from) ||
      transition.terminal !== terminalStatuses.has(transition.to)
    );

    if (missingStatuses.length > 0 || invalidTerminalStatuses.length > 0 || invalidTransitions.length > 0) {
      const problems = [
        missingStatuses.length > 0 ? `missing status(es): ${missingStatuses.join(', ')}` : null,
        invalidTerminalStatuses.length > 0 ? `invalid terminal status(es): ${invalidTerminalStatuses.join(', ')}` : null,
        invalidTransitions.length > 0 ? `invalid transition(s): ${invalidTransitions.map((transition) => `${transition.from}->${transition.to}`).join(', ')}` : null
      ].filter((problem): problem is string => problem !== null);
      return [{
        level: 'FAIL',
        check: 'delegation_state_machine',
        message: `Delegation state machine ${machine.version} has compatibility issue(s): ${problems.join('; ')}.`,
        action: 'Restore the built-in Phase 3.4 delegation state machine contract.'
      }];
    }

    return [{
      level: 'PASS',
      check: 'delegation_state_machine',
      message: `Delegation state machine ${machine.version} declares ${machine.statuses.length} status(es), ${machine.terminalStatuses.length} terminal status(es), and ${machine.transitions.length} transition(s).`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'delegation_state_machine',
      message: `Cannot inspect delegation state machine: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting the delegation state machine.'
    }];
  }
}

export async function inspectWorkerAdapterContracts(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const [capabilityRegistry, pluginRegistry, adapterRegistry] = await Promise.all([
      listToolCapabilities(projectRoot),
      listToolPluginContracts(projectRoot),
      listWorkerAdapterContracts(projectRoot)
    ]);
    const capabilityIds = new Set(capabilityRegistry.capabilities.map((capability) => capability.id));
    const pluginIds = new Set(pluginRegistry.contracts.map((contract) => contract.id));
    const adapterIds = new Set(adapterRegistry.adapters.map((adapter) => adapter.id));
    const missingAdapters = BASELINE_WORKER_ADAPTER_IDS.filter((adapterId) => !adapterIds.has(adapterId));
    const missingCapabilities = adapterRegistry.adapters
      .filter((adapter) => !capabilityIds.has(adapter.capabilityId))
      .map((adapter) => `${adapter.id}->${adapter.capabilityId}`);
    const missingPlugins = adapterRegistry.adapters
      .filter((adapter) => !pluginIds.has(adapter.pluginContractId))
      .map((adapter) => `${adapter.id}->${adapter.pluginContractId}`);
    const invalidStateMachineRefs = adapterRegistry.adapters
      .filter((adapter) => adapter.input.stateMachineVersion !== DELEGATION_STATE_MACHINE_VERSION)
      .map((adapter) => adapter.id);
    const invalidTerminalStatuses = adapterRegistry.adapters
      .filter((adapter) => adapter.output.terminalStatus.some((status) => !TERMINAL_DELEGATION_STATUSES.includes(status)))
      .map((adapter) => adapter.id);

    if (missingAdapters.length > 0 || missingCapabilities.length > 0 || missingPlugins.length > 0 || invalidStateMachineRefs.length > 0 || invalidTerminalStatuses.length > 0) {
      const problems = [
        missingAdapters.length > 0 ? `missing baseline adapter id(s): ${missingAdapters.join(', ')}` : null,
        missingCapabilities.length > 0 ? `unknown capability reference(s): ${missingCapabilities.join(', ')}` : null,
        missingPlugins.length > 0 ? `unknown plugin contract reference(s): ${missingPlugins.join(', ')}` : null,
        invalidStateMachineRefs.length > 0 ? `invalid state machine reference(s): ${invalidStateMachineRefs.join(', ')}` : null,
        invalidTerminalStatuses.length > 0 ? `invalid terminal status output(s): ${invalidTerminalStatuses.join(', ')}` : null
      ].filter((problem): problem is string => problem !== null);
      return [{
        level: 'FAIL',
        check: 'worker_adapter_contract',
        message: `Worker adapter contract ${adapterRegistry.version} has compatibility issue(s): ${problems.join('; ')}.`,
        action: 'Restore the built-in Phase 3.5 worker adapter contract registry.'
      }];
    }

    return [{
      level: 'PASS',
      check: 'worker_adapter_contract',
      message: `Worker adapter contract ${adapterRegistry.version} exposes ${adapterRegistry.adapters.length} adapter manifest(s) compatible with capability, plugin, and state machine contracts.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'worker_adapter_contract',
      message: `Cannot inspect worker adapter contracts: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting worker adapter contracts.'
    }];
  }
}

export async function inspectWorktreeIsolationContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const modes: WorktreeIsolationMode[] = ['none', 'required', 'blocked', 'manual'];
    const requiredGates = ['task_found', 'capability_declared', 'files_overlap', 'unsafe_concurrency', 'read_only'];
    return [{
      level: 'PASS',
      check: 'worktree_isolation_contract',
      message: `Worktree isolation contract ${WORKTREE_ISOLATION_CONTRACT_VERSION} declares ${modes.length} mode(s) and ${requiredGates.length} dry-run gate(s).`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'worktree_isolation_contract',
      message: `Cannot inspect worktree isolation contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting worktree isolation contract.'
    }];
  }
}

export async function inspectWorktreeLifecycleContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const statuses: WorktreeLifecycleStatus[] = ['created', 'kept', 'removed'];
    return [{
      level: 'PASS',
      check: 'worktree_lifecycle_contract',
      message: `Worktree lifecycle contract ${WORKTREE_LIFECYCLE_CONTRACT_VERSION} declares ${statuses.length} status(es) and safe create/keep/remove operations.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'worktree_lifecycle_contract',
      message: `Cannot inspect worktree lifecycle contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting worktree lifecycle contract.'
    }];
  }
}

export async function inspectTaskGraphPlannerContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const edgeTypes: TaskGraphEdgeType[] = ['depends_on', 'file_overlap'];
    return [{
      level: 'PASS',
      check: 'task_graph_planner_contract',
      message: `Task graph planner contract ${TASK_GRAPH_PLANNER_CONTRACT_VERSION} declares ${edgeTypes.length} edge type(s), graph diagnostics, and read-only inspect output.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'task_graph_planner_contract',
      message: `Cannot inspect task graph planner contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting task graph planner contract.'
    }];
  }
}

export async function inspectWavePlannerContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const gates: Array<WavePlanGate['gate']> = ['manual', 'blocked'];
    return [{
      level: 'PASS',
      check: 'wave_planner_contract',
      message: `Wave planner contract ${WAVE_PLANNER_CONTRACT_VERSION} declares dependency waves and ${gates.length} gate type(s) without execution side effects.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'wave_planner_contract',
      message: `Cannot inspect wave planner contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting wave planner contract.'
    }];
  }
}

export async function inspectBackgroundExecutorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const statuses: BackgroundExecutorStatus[] = ['claimed', 'completed', 'failed', 'blocked'];
    return [{
      level: 'PASS',
      check: 'background_executor_contract',
      message: `Background executor contract ${BACKGROUND_EXECUTOR_CONTRACT_VERSION} declares ${statuses.length} result status(es), single-delegation claim/run/ingest, and no wave execution side effects.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'background_executor_contract',
      message: `Cannot inspect background executor contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting background executor contract.'
    }];
  }
}

export async function inspectWaveExecutorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const strategies: WaveExecutorStrategy[] = ['fast-stop', 'safe-continue'];
    return [{
      level: 'PASS',
      check: 'wave_executor_contract',
      message: `Wave executor contract ${WAVE_EXECUTOR_CONTRACT_VERSION} declares ${strategies.length} strategy option(s), planner-driven execution, and no sync-back apply side effects.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'wave_executor_contract',
      message: `Cannot inspect wave executor contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting wave executor contract.'
    }];
  }
}

export async function inspectLocalRunIndexContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    return [{
      level: 'PASS',
      check: 'local_run_index_contract',
      message: `Local run index contract ${LOCAL_RUN_INDEX_CONTRACT_VERSION} declares rebuildable derived run, task, delegation, artifact, and wave summary indexes.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'local_run_index_contract',
      message: `Cannot inspect local run index contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting local run index contract.'
    }];
  }
}

async function readProjectConfig(projectRoot: string): Promise<void> {
  await readProjectConfigFile<ProjectAgentRuntimeConfig>(projectRoot, parseAgentRuntimeConfig);
}
