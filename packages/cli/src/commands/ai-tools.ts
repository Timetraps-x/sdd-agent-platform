import { applyAiToolEntries, summarizeAiProjectionStatus } from '@sdd-agent-platform/core/ai-tools';
import { readAiToolSelection } from '../args.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleAiToolsCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'update') {
    return null;
  }

  const updateArgs = [subcommand, ...rest].filter((item): item is string => Boolean(item));
  const check = updateArgs.includes('--check');
  const force = updateArgs.includes('--force');
  const aiTool = readAiToolSelection(updateArgs, false);
  const results = await applyAiToolEntries(projectRoot, { tool: aiTool, check, force });
  const status = summarizeAiProjectionStatus(results);
  return {
    exitCode: status === 'FAIL' ? 1 : 0,
    output: JSON.stringify({ command: 'update', check, force, status, aiTools: results }, null, 2)
  };
}
