import { inspectRun } from '@sdd-agent-platform/core/run-state';
import { inspectLocalRunIndex, queryLocalRunIndex, rebuildLocalRunIndex } from '@sdd-agent-platform/core/run-state';
import { archiveRun, createRun, listRuns, readRunState } from '@sdd-agent-platform/core/run-state';
import { readRunStatus } from '../args.js';
import { hasHelpFlag, hasPreflightFlag, readOption } from '../options.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';
import {
  renderLocalRunIndex,
  renderLocalRunIndexInspection,
  renderRunInspection,
  renderRunList
} from '../renderers/workflow.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleRunCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'run') {
    return null;
  }

  if (hasHelpFlag([subcommand, ...rest].filter((item): item is string => Boolean(item)))) {
    return {
      exitCode: 0,
      output: runUsage(subcommand)
    };
  }


  if (subcommand === 'create') {
    if (hasPreflightFlag(rest)) {
      return {
        exitCode: 0,
        output: runPreflightOutput('run create', null, rest)
      };
    }

    const branch = readOption(rest, '--branch');
    const taskId = readOption(rest, '--task');
    if (Boolean(branch) !== Boolean(taskId)) {
      return {
        exitCode: 2,
        error: 'Usage: sdd run create [--branch <branch> --task <task_id>] [--preflight]'
      };
    }
    const state = await createRun(projectRoot, {
      branch: branch ?? undefined,
      taskId: taskId ?? undefined
    });
    return {
      exitCode: 0,
      output: JSON.stringify({
        runId: state.runId,
        partition: state.partition,
        gitBranch: state.gitBranch,
        taskId: state.taskId,
        stateRef: '.sdd/runtime.sqlite:runs',
        artifactRoot: state.artifactRoot
      }, null, 2)
    };
  }

  if (subcommand === 'status') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd run status <run_id>'
      };
    }
    const state = await readRunState(projectRoot, runId);
    return {
      exitCode: 0,
      output: JSON.stringify({ runId: state.runId, status: state.status, phase: state.phase, currentTask: state.currentTask, updatedAt: state.updatedAt }, null, 2)
    };
  }

  if (subcommand === 'list') {
    const runs = await listRuns(projectRoot);
    const json = rest.includes('--json');
    return {
      exitCode: 0,
      output: json ? JSON.stringify(runs, null, 2) : renderRunList(runs)
    };
  }

  if (subcommand === 'index') {
    const action = rest[0];
    const json = wantsJson(rest);
    if (action === 'rebuild') {
      if (hasPreflightFlag(rest)) {
        return {
          exitCode: 0,
          output: runPreflightOutput('run index rebuild', null, rest)
        };
      }

      const index = await rebuildLocalRunIndex(projectRoot);
      return {
        exitCode: 0,
        output: json ? jsonOutput(index, rest) : renderLocalRunIndex(index)
      };
    }
    if (action === 'inspect') {
      const inspection = await inspectLocalRunIndex(projectRoot);
      return {
        exitCode: inspection.valid ? 0 : 1,
        output: json ? jsonOutput(inspection, rest) : renderLocalRunIndexInspection(inspection)
      };
    }
    if (action === 'query') {
      const status = readRunStatus(rest, '--status');
      if (readOption(rest, '--status') && !status) {
        return {
          exitCode: 2,
          error: 'Usage: sdd run index query [--run <run_id>] [--task <task_id>] [--status created|running|completed|blocked|failed|archived] [--artifact <path>] [--json|--compact-json]'
        };
      }
      const index = await queryLocalRunIndex(projectRoot, {
        runId: readOption(rest, '--run') ?? undefined,
        taskId: readOption(rest, '--task') ?? undefined,
        status: status ?? undefined,
        artifact: readOption(rest, '--artifact') ?? undefined
      });
      return {
        exitCode: 0,
        output: json ? jsonOutput(index, rest) : renderLocalRunIndex(index)
      };
    }
    return {
      exitCode: 2,
      error: 'Usage: sdd run index rebuild|inspect|query [options]'
    };
  }

  if (subcommand === 'inspect') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd run inspect <run_id> [--json]'
      };
    }
    const result = await inspectRun(projectRoot, runId);
    const json = wantsJson(rest);
    return {
      exitCode: 0,
      output: json ? jsonOutput(result, rest) : renderRunInspection(result)
    };
  }

  if (subcommand === 'archive') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd run archive <run_id> [--reason <text>]'
      };
    }
    if (hasPreflightFlag(rest)) {
      return {
        exitCode: 0,
        output: runPreflightOutput('run archive', runId, rest)
      };
    }

    const state = await archiveRun(projectRoot, runId, { reason: readOption(rest, '--reason') ?? undefined });
    return {
      exitCode: 0,
      output: JSON.stringify({ runId: state.runId, status: state.status, updatedAt: state.updatedAt }, null, 2)
    };
  }

  return null;
}
function runUsage(subcommand: string | undefined): string {
  if (subcommand === 'create') {
    return 'Usage: sdd run create [--branch <branch> --task <task_id>] [--preflight]';
  }
  if (subcommand === 'archive') {
    return 'Usage: sdd run archive <run_id> [--reason <text>] [--preflight]';
  }
  if (subcommand === 'index') {
    return 'Usage: sdd run index rebuild|inspect|query [options]';
  }
  return 'Usage: sdd run create|status|list|index|inspect|archive [options]';
}

function runPreflightOutput(commandName: string, runId: string | null, args: string[]): string {
  if (wantsJson(args)) {
    return jsonOutput({ contract: 'sdd-command-preflight-v1', command: commandName, runId, sideEffects: 'none', status: 'PASS' }, args);
  }
  return `SDD command preflight PASS\ncommand=${commandName}\nrun=${runId ?? 'none'}\nside_effects=none`;
}