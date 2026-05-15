import { inspectAgentRegistryEntry, inspectWorkflowGate, listAgentRegistry, listWorkflowGates } from '@sdd-agent-platform/core/registries';
import { validateAgentRegistry, validateWorkflowGates } from '@sdd-agent-platform/core/router';
import {
  renderAgentRegistryInspect,
  renderAgentRegistryList,
  renderAgentRegistryValidation,
  renderWorkflowGateInspect,
  renderWorkflowGateList,
  renderWorkflowGateValidation
} from '../../renderers/registry-core.js';
import type { CliResult } from './types.js';

export async function handleRegistryCoreCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command === 'workflow' && subcommand === 'list') {
    const registry = await listWorkflowGates(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderWorkflowGateList(registry.workflows)
    };
  }

  if (command === 'workflow' && subcommand === 'inspect') {
    const workflowId = rest.find((item) => !item.startsWith('--'));
    if (!workflowId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd workflow inspect <workflow_id> [--json]'
      };
    }
    const workflow = await inspectWorkflowGate(projectRoot, workflowId);
    if (!workflow) {
      return {
        exitCode: 1,
        error: `Unknown workflow: ${workflowId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(workflow, null, 2) : renderWorkflowGateInspect(workflow)
    };
  }

  if (command === 'workflow' && subcommand === 'validate') {
    const result = await validateWorkflowGates(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderWorkflowGateValidation(result)
    };
  }

  if (command === 'agents' && subcommand === 'list') {
    const registry = await listAgentRegistry(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderAgentRegistryList(registry.agents)
    };
  }

  if (command === 'agents' && subcommand === 'inspect') {
    const agentId = rest.find((item) => !item.startsWith('--'));
    if (!agentId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd agents inspect <agent_id> [--json]'
      };
    }
    const agent = await inspectAgentRegistryEntry(projectRoot, agentId);
    if (!agent) {
      return {
        exitCode: 1,
        error: `Unknown agent: ${agentId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(agent, null, 2) : renderAgentRegistryInspect(agent)
    };
  }

  if (command === 'agents' && subcommand === 'validate') {
    const result = await validateAgentRegistry(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderAgentRegistryValidation(result)
    };
  }

  return null;
}
