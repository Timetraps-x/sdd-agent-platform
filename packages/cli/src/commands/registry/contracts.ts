import { inspectHarnessLearningContract, inspectProjectContextPackContract, inspectQueryStatusContract, inspectSkillAgentEvalContract, validateHarnessLearningContract, validateProjectContextPackContract, validateQueryStatusContract, validateSkillAgentEvalContract } from '@sdd-agent-platform/core/registries';
import {
  renderHarnessLearningContract,
  renderHarnessLearningValidation,
  renderProjectContextPackContract,
  renderProjectContextPackValidation,
  renderQueryStatusContract,
  renderQueryStatusValidation,
  renderSkillAgentEvalContract,
  renderSkillAgentEvalValidation
} from '../../renderers/registry-contracts.js';
import type { CliResult } from './types.js';

export async function handleRegistryContractCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command === 'query-status' && subcommand === 'inspect') {
    const contract = await inspectQueryStatusContract(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderQueryStatusContract(contract)
    };
  }

  if (command === 'query-status' && subcommand === 'validate') {
    const result = await validateQueryStatusContract(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderQueryStatusValidation(result)
    };
  }

  if (command === 'eval' && subcommand === 'inspect') {
    const contract = await inspectSkillAgentEvalContract(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderSkillAgentEvalContract(contract)
    };
  }

  if (command === 'eval' && subcommand === 'validate') {
    const result = await validateSkillAgentEvalContract(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderSkillAgentEvalValidation(result)
    };
  }

  if (command === 'learning' && subcommand === 'inspect') {
    const contract = await inspectHarnessLearningContract(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderHarnessLearningContract(contract)
    };
  }

  if (command === 'learning' && subcommand === 'validate') {
    const result = await validateHarnessLearningContract(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderHarnessLearningValidation(result)
    };
  }

  if (command === 'context-pack' && subcommand === 'inspect') {
    const contract = await inspectProjectContextPackContract(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderProjectContextPackContract(contract)
    };
  }

  if (command === 'context-pack' && subcommand === 'validate') {
    const result = await validateProjectContextPackContract(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderProjectContextPackValidation(result)
    };
  }

  return null;
}
