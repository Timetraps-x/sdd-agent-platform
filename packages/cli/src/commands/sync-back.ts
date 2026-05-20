import { applySyncBack } from '@sdd-agent-platform/core/sync-back';
import { inspectSyncBack } from '@sdd-agent-platform/core/sync-back';
import { readBranchOption, readOptionalPositionalArgument } from '../args.js';
import { hasHelpFlag, hasPreflightFlag, readOption } from '../options.js';
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

  if (hasHelpFlag([subcommand, ...rest].filter((item): item is string => Boolean(item)))) {
    return {
      exitCode: 0,
      output: syncBackUsage(subcommand)
    };
  }


  if (subcommand === 'inspect') {
    const runId = readOptionalPositionalArgument(rest);
    const taskId = readOption(rest, '--task') ?? undefined;
    if (!runId && !taskId) {
      return {
        exitCode: 2,
        error: syncBackUsage('inspect')
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
        error: syncBackUsage('apply')
      };
    }
    if (hasPreflightFlag(rest)) {
      return {
        exitCode: 0,
        output: syncBackPreflightOutput(runId, taskId, rest)
      };
    }

    const result = await applySyncBack(projectRoot, {
      runId,
      branch: readBranchOption(rest),
      taskId,
      approved: rest.includes('--approved'),
      refreshVerify: rest.includes('--refresh-verify')
    });
    const json = wantsJson(rest);
    return {
      exitCode: 0,
      output: json ? jsonOutput(result, rest) : renderSyncBackApplyResult(result)
    };
  }

  return null;
}
function syncBackUsage(subcommand: string | undefined): string {
  if (subcommand === 'apply') {
    return 'Usage: sdd sync-back apply [<run_id>] [--branch <branch>] --task <task_id> [--approved] [--refresh-verify] [--preflight] [--json|--compact-json]';
  }
  if (subcommand === 'inspect') {
    return 'Usage: sdd sync-back inspect [<run_id>] [--branch <branch>] --task <task_id> [--json|--compact-json]';
  }
  return 'Usage: sdd sync-back inspect|apply [<run_id>] [--branch <branch>] --task <task_id> [--approved] [--refresh-verify] [--preflight] [--json|--compact-json]';
}

function syncBackPreflightOutput(runId: string | undefined, taskId: string | undefined, args: string[]): string {
  if (wantsJson(args)) {
    return jsonOutput({ contract: 'sdd-command-preflight-v1', command: 'sync-back apply', runId: runId ?? null, taskId: taskId ?? null, sideEffects: 'none', status: 'PASS' }, args);
  }
  return `SDD command preflight PASS\ncommand=sync-back apply\nrun=${runId ?? 'latest'}\ntask=${taskId ?? 'none'}\nside_effects=none`;
}