import { runGoalVerify } from '@sdd-agent-platform/core/verification';
import { renderGoalVerifyResult, renderSingleTaskLoopResult } from '@sdd-agent-platform/core/verification';
import { runSingleTaskLoop } from '@sdd-agent-platform/core/verification';
import { readBranchOption, readOptionalPositionalArgument, readTeamModeActivation } from '../args.js';
import { readOption } from '../options.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleVerifyCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command === 'do' && subcommand === 'task') {
    const taskId = rest.find((item) => !item.startsWith('--'));
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd do task <task_id> [--branch <branch>] [--run <run_id>] [--team-mode [auto|force|off]] [--no-team-mode] [--implement-artifact artifacts/path.md] [--review-artifact artifacts/path.md] [--debug-artifact artifacts/path.md] [--validation-artifact artifacts/path.md]'
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
      teamModeActivation: readTeamModeActivation(rest)
    });
    const json = wantsJson(rest);
    return {
      exitCode: result.status === 'completed' ? 0 : 1,
      output: json ? jsonOutput(result, rest) : renderSingleTaskLoopResult(result)
    };
  }

  if (command === 'verify' && subcommand === 'task') {
    const taskId = readOptionalPositionalArgument(rest);
    const runId = readOption(rest, '--run');
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd verify task <task_id> [--run <run_id>] [--branch <branch>] [--review-artifact artifacts/path.md] [--validation-artifact artifacts/path.md] [--json]'
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
