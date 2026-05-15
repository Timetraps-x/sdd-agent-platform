import { getProjectStatus } from '@sdd-agent-platform/core/status';
import { readBranchContext } from '../args.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';
import { renderProjectStatus } from '../renderers/workflow.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleStatusCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'status') {
    return null;
  }

  const statusArgs = [subcommand, ...rest].filter((item): item is string => Boolean(item));
  const result = await getProjectStatus(projectRoot, readBranchContext(statusArgs));
  const json = wantsJson(statusArgs);
  return {
    exitCode: result.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
    output: json ? jsonOutput(result, statusArgs) : renderProjectStatus(result)
  };
}
