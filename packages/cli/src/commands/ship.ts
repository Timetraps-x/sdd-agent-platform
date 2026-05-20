import { runShip } from '@sdd-agent-platform/core/lifecycle';
import { readBranchOption } from '../args.js';
import { hasHelpFlag, hasPreflightFlag } from '../options.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';
import { renderShipResult } from '../renderers/workflow.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleShipCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'ship') {
    return null;
  }

  const shipArgs = [subcommand, ...rest].filter((item): item is string => Boolean(item));
  if (hasHelpFlag(shipArgs)) {
    return {
      exitCode: 0,
      output: 'Usage: sdd ship [--branch <branch>] [--dry-run] [--preflight] [--json|--compact-json]'
    };
  }
  if (hasPreflightFlag(shipArgs)) {
    return {
      exitCode: 0,
      output: wantsJson(shipArgs) ? jsonOutput({ contract: 'sdd-command-preflight-v1', command: 'ship', branch: readBranchOption(shipArgs) ?? null, sideEffects: 'none', status: 'PASS' }, shipArgs) : `SDD command preflight PASS\ncommand=ship\nbranch=${readBranchOption(shipArgs) ?? 'default'}\nside_effects=none`
    };
  }
  const result = await runShip(projectRoot, {
    branch: readBranchOption(shipArgs),
    dryRun: shipArgs.includes('--dry-run')
  });
  const json = wantsJson(shipArgs);
  return {
    exitCode: result.status === 'PASS' ? 0 : 1,
    output: json ? jsonOutput(result, shipArgs) : renderShipResult(result)
  };
}
