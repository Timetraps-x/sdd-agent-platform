import { getProjectStatus, getStatuslineProjection } from '@sdd-agent-platform/core/status';
import { readBranchContext } from '../args.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';
import { renderProjectStatus, renderStatuslineProjection } from '../renderers/workflow.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleStatusCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'status' && command !== 'statusline' && command !== 'progress') {
    return null;
  }

  const statusArgs = [subcommand, ...rest].filter((item): item is string => Boolean(item));
  if (command === 'statusline' || command === 'progress' || statusArgs.includes('--statusline')) {
    const projection = await getStatuslineProjection(projectRoot, readBranchContext(statusArgs));
    const json = wantsJson(statusArgs);
    return {
      exitCode: projection.taskHealth === 'blocked' || projection.runtimeHealth === 'blocked' || projection.evidenceHealth === 'blocked' ? 1 : 0,
      output: json ? jsonOutput(projection, statusArgs) : renderStatuslineProjection(projection)
    };
  }
  const result = await getProjectStatus(projectRoot, readBranchContext(statusArgs));
  const json = wantsJson(statusArgs);
  return {
    exitCode: result.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
    output: json ? jsonOutput(result, statusArgs) : renderProjectStatus(result)
  };
}
