import { routeSddTask } from '@sdd-agent-platform/core/router';
import { inspectSddTask } from '@sdd-agent-platform/core/sdd-docs';
import { parseSddBranch } from '@sdd-agent-platform/core/sdd-docs';
import { renderTaskGapReport, renderTaskInspect, renderTaskList } from '@sdd-agent-platform/core/sdd-docs';
import { readBranchOption, readResolvedBranch, readTeamModeActivation } from '../args.js';
import { taskFormatText } from '../help.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';
import { renderAgentRouterDecision } from '../renderers/router.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleTasksCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'tasks') {
    return null;
  }

  if (subcommand === 'format') {
    return {
      exitCode: 0,
      output: taskFormatText()
    };
  }

  if (subcommand === 'list') {
    const model = await parseSddBranch(projectRoot, await readResolvedBranch(projectRoot, rest));
    return {
      exitCode: model.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
      output: renderTaskList(model)
    };
  }

  if (subcommand === 'inspect') {
    const taskId = rest.find((item) => !item.startsWith('--'));
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd tasks inspect <task_id> [--branch <branch>] [--json]'
      };
    }
    const model = await parseSddBranch(projectRoot, await readResolvedBranch(projectRoot, rest));
    const result = inspectSddTask(model, taskId);
    if (!result.task && result.gaps.length === 0) {
      return {
        exitCode: 1,
        error: `Task not found: ${taskId}`
      };
    }
    const json = wantsJson(rest);
    return {
      exitCode: result.task === null || result.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
      output: json ? jsonOutput(result, rest) : renderTaskInspect(result.task, result.gaps)
    };
  }

  if (subcommand === 'route') {
    const taskId = rest.find((item) => !item.startsWith('--'));
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd tasks route <task_id> [--branch <branch>] [--team-mode [auto|force|off]] [--no-team-mode] [--profile] [--cache] [--json]'
      };
    }
    const decision = await routeSddTask(projectRoot, {
      taskId,
      branch: readBranchOption(rest),
      teamModeActivation: readTeamModeActivation(rest),
      profile: rest.includes('--profile'),
      cache: rest.includes('--cache'),
    });
    return {
      exitCode: decision.blockedReason ? 1 : 0,
      output: wantsJson(rest) ? jsonOutput(decision, rest) : renderAgentRouterDecision(decision)
    };
  }

  if (subcommand === 'gaps') {
    const model = await parseSddBranch(projectRoot, await readResolvedBranch(projectRoot, rest));
    return {
      exitCode: model.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
      output: renderTaskGapReport(model)
    };
  }

  return null;
}
