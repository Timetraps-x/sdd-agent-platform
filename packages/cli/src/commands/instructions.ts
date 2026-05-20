import { getSddInstructions, renderSddInstructions } from '@sdd-agent-platform/core/instructions';
import { renderTextOrJson } from '../renderers/json.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleInstructionsCommand(command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'instructions') {
    return null;
  }

  const instructionArgs = [subcommand, ...rest].filter((item): item is string => Boolean(item));
  const action = instructionArgs.find((item) => !item.startsWith('--')) ?? 'overview';
  const payload = getSddInstructions(action);
  return {
    exitCode: 0,
    output: renderTextOrJson(instructionArgs, payload, renderSddInstructions)
  };
}
