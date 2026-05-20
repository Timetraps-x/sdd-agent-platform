import { runGoalVerify } from '@sdd-agent-platform/core/verification';
import { renderGoalVerifyResult, renderSingleTaskLoopResult } from '@sdd-agent-platform/core/verification';
import { runSingleTaskLoop } from '@sdd-agent-platform/core/verification';
import { readBranchOption, readOptionalPositionalArgument, readTeamModeActivation } from '../args.js';
import { hasHelpFlag, hasPreflightFlag, readOption } from '../options.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleVerifyCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command === 'do' && subcommand === 'task') {
    if (hasHelpFlag(rest)) {
      return {
        exitCode: 0,
        output: doTaskUsage()
      };
    }
    const taskId = rest.find((item) => !item.startsWith('--'));
    if (!taskId) {
      return {
        exitCode: 2,
        error: doTaskUsage()
      };
    }
    if (hasPreflightFlag(rest)) {
      return {
        exitCode: 0,
        output: commandPreflightOutput('do task', taskId, rest)
      };
    }
    const result = await runSingleTaskLoop(projectRoot, {
      taskId,
      branch: readBranchOption(rest),
      runId: readOption(rest, '--run') ?? undefined,
      implementArtifact: readOption(rest, '--implement-artifact') ?? undefined,
      reviewArtifact: readOption(rest, '--review-artifact') ?? undefined,
      debugArtifact: readOption(rest, '--debug-artifact') ?? undefined,
      validationArtifact: readOption(rest, '--validation-artifact') ?? undefined,
      teamModeActivation: readTeamModeActivation(rest),
      approved: rest.includes('--approved')
    });
    const json = wantsJson(rest);
    return {
      exitCode: result.status === 'completed' ? 0 : 1,
      output: json ? jsonOutput(result, rest) : renderSingleTaskLoopResult(result)
    };
  }

  if (command === 'verify' && subcommand === 'task') {
    if (hasHelpFlag(rest)) {
      return {
        exitCode: 0,
        output: verifyTaskUsage()
      };
    }
    const taskId = readOptionalPositionalArgument(rest);
    const runId = readOption(rest, '--run');
    if (!taskId) {
      return {
        exitCode: 2,
        error: verifyTaskUsage()
      };
    }
    if (hasPreflightFlag(rest)) {
      return {
        exitCode: 0,
        output: commandPreflightOutput('verify task', taskId, rest)
      };
    }
    const result = await runGoalVerify(projectRoot, {
      taskId,
      runId: runId ?? undefined,
      branch: readBranchOption(rest),
      reviewArtifact: readOption(rest, '--review-artifact') ?? undefined,
      validationArtifact: readOption(rest, '--validation-artifact') ?? undefined
    });
    const json = wantsJson(rest);
    return {
      exitCode: result.status === 'PASS' ? 0 : 1,
      output: json ? jsonOutput(result, rest) : renderGoalVerifyResult(result)
    };
  }

  return null;
}
function doTaskUsage(): string {
  return 'Usage: sdd do task <task_id> [--branch <branch>] [--run <run_id>] [--approved] [--team-mode [auto|force|off]] [--no-team-mode] [--preflight] [--implement-artifact artifacts/path.md] [--review-artifact artifacts/path.md] [--debug-artifact artifacts/path.md] [--validation-artifact artifacts/path.md]';
}

function verifyTaskUsage(): string {
  return 'Usage: sdd verify task <task_id> [--run <run_id>] [--branch <branch>] [--preflight] [--review-artifact artifacts/path.md] [--validation-artifact artifacts/path.md] [--json]';
}

function commandPreflightOutput(commandName: string, taskId: string, args: string[]): string {
  if (wantsJson(args)) {
    return jsonOutput({ contract: 'sdd-command-preflight-v1', command: commandName, taskId, sideEffects: 'none', status: 'PASS' }, args);
  }
  return `SDD command preflight PASS\ncommand=${commandName}\ntask=${taskId}\nside_effects=none`;
}