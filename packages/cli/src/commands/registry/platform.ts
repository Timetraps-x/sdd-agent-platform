import { getDelegationStateMachine, inspectDelegationQueueItem, listDelegationQueueItems } from '@sdd-agent-platform/core/delegation';
import { inspectToolCapability, inspectToolPluginContract, inspectWorkerAdapterContract, listToolCapabilities, listToolPluginContracts, listWorkerAdapterContracts } from '@sdd-agent-platform/core/registries';
import { readOption } from '../../options.js';
import {
  renderCapabilityInspect,
  renderCapabilityList,
  renderDelegationQueueInspect,
  renderDelegationQueueList,
  renderDelegationStateMachineInspect,
  renderPluginContractInspect,
  renderPluginContractList,
  renderWorkerAdapterInspect,
  renderWorkerAdapterList
} from '../../renderers/registry-platform.js';
import type { CliResult } from './types.js';

export async function handleRegistryPlatformCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command === 'capabilities' && subcommand === 'list') {
    const registry = await listToolCapabilities(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderCapabilityList(registry.capabilities)
    };
  }

  if (command === 'capabilities' && subcommand === 'inspect') {
    const capabilityId = rest.find((item) => !item.startsWith('--'));
    if (!capabilityId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd capabilities inspect <capability_id> [--json]'
      };
    }
    const capability = await inspectToolCapability(projectRoot, capabilityId);
    if (!capability) {
      return {
        exitCode: 1,
        error: `Unknown capability: ${capabilityId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(capability, null, 2) : renderCapabilityInspect(capability)
    };
  }

  if (command === 'plugins' && subcommand === 'list') {
    const registry = await listToolPluginContracts(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderPluginContractList(registry.contracts)
    };
  }

  if (command === 'plugins' && subcommand === 'inspect') {
    const pluginId = rest.find((item) => !item.startsWith('--'));
    if (!pluginId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd plugins inspect <plugin_id> [--json]'
      };
    }
    const contract = await inspectToolPluginContract(projectRoot, pluginId);
    if (!contract) {
      return {
        exitCode: 1,
        error: `Unknown plugin contract: ${pluginId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderPluginContractInspect(contract)
    };
  }

  if (command === 'queue' && subcommand === 'list') {
    const snapshot = await listDelegationQueueItems(projectRoot, { runId: readOption(rest, '--run') ?? undefined });
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(snapshot, null, 2) : renderDelegationQueueList(snapshot.items)
    };
  }

  if (command === 'queue' && subcommand === 'inspect') {
    const queueItemId = rest.find((item) => !item.startsWith('--'));
    if (!queueItemId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd queue inspect <queue_item_id> [--json]'
      };
    }
    const item = await inspectDelegationQueueItem(projectRoot, queueItemId);
    if (!item) {
      return {
        exitCode: 1,
        error: `Unknown queue item: ${queueItemId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(item, null, 2) : renderDelegationQueueInspect(item)
    };
  }

  if (command === 'state-machine' && subcommand === 'inspect') {
    const machine = getDelegationStateMachine();
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(machine, null, 2) : renderDelegationStateMachineInspect(machine)
    };
  }

  if (command === 'workers' && subcommand === 'list') {
    const registry = await listWorkerAdapterContracts(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderWorkerAdapterList(registry.adapters)
    };
  }

  if (command === 'workers' && subcommand === 'inspect') {
    const adapterId = rest.find((item) => !item.startsWith('--'));
    if (!adapterId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd workers inspect <adapter_id> [--json]'
      };
    }
    const adapter = await inspectWorkerAdapterContract(projectRoot, adapterId);
    if (!adapter) {
      return {
        exitCode: 1,
        error: `Unknown worker adapter: ${adapterId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(adapter, null, 2) : renderWorkerAdapterInspect(adapter)
    };
  }

  return null;
}
