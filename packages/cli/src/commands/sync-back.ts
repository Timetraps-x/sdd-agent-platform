import { applySyncBack } from '@sdd-agent-platform/core/sync-back';
import { inspectSyncBack } from '@sdd-agent-platform/core/sync-back';
import { readBranchOption, readOptionalPositionalArgument } from '../args.js';
import { readOption } from '../options.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';
import { renderSyncBackApplyResult, renderSyncBackInspection } from '../renderers/workflow.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleSyncBackCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'sync-back') {
    return null;
  }

  if (subcommand === 'inspect') {
    const runId = readOptionalPositionalArgument(rest);
    const taskId = readOption(rest, '--task') ?? undefined;
    if (!runId && !taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd sync-back inspect [<run_id>] [--branch <branch>] --task <task_id> [--json|--compact-json]'
      };
    }
    const result = await inspectSyncBack(projectRoot, {
      runId,
      branch: readBranchOption(rest),
      taskId
    });
    const json = wantsJson(rest);
    return {
      exitCode: result.status === 'blocked' ? 1 : 0,
      output: json ? jsonOutput(result, rest) : renderSyncBackInspection(result)
    };
  }

  if (subcommand === 'apply') {
    const runId = readOptionalPositionalArgument(rest);
    const taskId = readOption(rest, '--task') ?? undefined;
    if (!runId && !taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd sync-back apply [<run_id>] [--branch <branch>] --task <task_id> [--approved] [--json|--compact-json]'
      };
    }
    const result = await applySyncBack(projectRoot, {
      runId,
      branch: readBranchOption(rest),
      taskId,
      approved: rest.includes('--approved')
    });
    const json = wantsJson(rest);
    return {
      exitCode: 0,
      output: json ? jsonOutput(result, rest) : renderSyncBackApplyResult(result)
    };
  }

  return null;
}
