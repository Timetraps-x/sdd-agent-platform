import { parseContextProfile } from '@sdd-agent-platform/core/context';
import { buildContextBuildPackage } from '@sdd-agent-platform/core/context';
import { buildEvidenceSummaryProjection } from '@sdd-agent-platform/core/context';
import { readBranchOption, readContextBuildMode } from '../args.js';
import { readOption } from '../options.js';
import { renderContextBuildPackage, renderEvidenceSummaryProjection } from '../renderers/context.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleContextCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command === 'evidence' && subcommand === 'summary') {
    const runId = rest.find((item) => !item.startsWith('--'));
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd evidence summary <run_id> [--task <task_id>] [--json|--compact-json]'
      };
    }
    const summary = await buildEvidenceSummaryProjection(projectRoot, {
      runId,
      taskId: readOption(rest, '--task') ?? undefined
    });
    const json = wantsJson(rest);
    return {
      exitCode: 0,
      output: json ? jsonOutput(summary, rest) : renderEvidenceSummaryProjection(summary)
    };
  }

  if (command === 'context' && subcommand === 'build') {
    const taskId = readOption(rest, '--task') ?? undefined;
    const mode = readContextBuildMode(rest, '--mode');
    if (!taskId || !mode) {
      return {
        exitCode: 2,
        error: 'Usage: sdd context build --task <task_id> --mode do|verify|sync-back|doctor [--agent <agent>] [--branch <branch>] [--profile brief|normal|forensic] [--json|--compact-json]'
      };
    }
    const contextPackage = await buildContextBuildPackage(projectRoot, {
      taskId,
      branch: readBranchOption(rest),
      mode,
      agent: readOption(rest, '--agent') ?? undefined,
      profile: parseContextProfile(readOption(rest, '--profile'))
    });
    const json = wantsJson(rest);
    return {
      exitCode: 0,
      output: json ? jsonOutput(contextPackage, rest) : renderContextBuildPackage(contextPackage)
    };
  }

  return null;
}
