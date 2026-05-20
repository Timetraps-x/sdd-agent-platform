import { initProject } from '@sdd-agent-platform/core/status';
import { readAiToolSelection } from '../args.js';
import { readOption } from '../options.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';
import { renderInitResult } from '../renderers/workflow.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleInitCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'init') {
    return null;
  }

  const initArgs = [subcommand, ...rest].filter((item): item is string => Boolean(item));
  const force = initArgs.includes('--force');
  const aiTool = readAiToolSelection(initArgs, true);
  const branch = readOption(initArgs, '--branch') ?? undefined;
  const scaffoldDocuments = initArgs.includes('--no-scaffold-docs') ? false : initArgs.includes('--scaffold-docs') || branch !== undefined;
  const result = await initProject(projectRoot, { force, aiTool, branch, scaffoldDocuments });
  const json = wantsJson(initArgs);
  return {
    exitCode: 0,
    output: json ? jsonOutput({ command: 'init', ...result }, initArgs) : renderInitResult(result)
  };
}
