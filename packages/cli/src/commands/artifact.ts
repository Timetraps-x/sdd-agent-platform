import { ingestArtifactResult, inspectArtifactResultIngestions } from '@sdd-agent-platform/core/artifacts';
import { validateSddResultArtifact } from '@sdd-agent-platform/core/artifacts';
import { renderSddResultArtifactTemplate } from '@sdd-agent-platform/core/artifacts';
import { readRunState, writeArtifact } from '@sdd-agent-platform/core/run-state';
import { toArtifactRootRelativePath } from '@sdd-agent-platform/core/runtime-paths';
import { readBranchOption, readSddResultStatus } from '../args.js';
import { hasHelpFlag, hasPreflightFlag, readOption } from '../options.js';
import { renderArtifactIngestionInspection, renderArtifactIngestionResult, renderArtifactValidationReport } from '../renderers/artifacts.js';
import { renderTextOrJson } from '../renderers/json.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleArtifactCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'artifact') {
    return null;
  }

  if (hasHelpFlag([subcommand, ...rest].filter((item): item is string => Boolean(item)))) {
    return {
      exitCode: 0,
      output: artifactUsage(subcommand)
    };
  }


  if (subcommand === 'template') {
    const artifactPath = rest.find((item) => !item.startsWith('--'));
    const taskId = readOption(rest, '--task');
    const agent = readOption(rest, '--agent');
    if (!artifactPath || !taskId || !agent) {
      return {
        exitCode: 2,
        error: artifactUsage('template')
      };
    }
    if (hasPreflightFlag(rest)) {
      return {
        exitCode: 0,
        output: artifactPreflightOutput('artifact template', artifactPath, rest)
      };
    }

    const runId = readOption(rest, '--run');
    const branch = readBranchOption(rest);
    if (runId) {
      const scopeError = await artifactTemplateScopeError(projectRoot, runId, taskId, branch);
      if (scopeError) {
        return {
          exitCode: 2,
          error: scopeError
        };
      }
    }
    const template = await renderSddResultArtifactTemplate(projectRoot, {
      artifactPath,
      taskId,
      agent,
      branch,
      runId: runId ?? undefined,
      status: readSddResultStatus(rest, '--status') ?? 'PASS'
    });
    if (rest.includes('--write')) {
      if (!runId) {
        return {
          exitCode: 2,
          error: 'Usage: sdd artifact template <artifacts/path.md> --task <task_id> --agent <agent> --run <run_id> --write'
        };
      }
      const written = await writeArtifact(projectRoot, runId, toArtifactRootRelativePath(artifactPath), template);
      return {
        exitCode: 0,
        output: `Artifact template written: ${written.runRelativePath}\nphysical_path=${written.absolutePath}`
      };
    }
    return {
      exitCode: 0,
      output: template
    };
  }

  if (subcommand === 'validate') {
    const runId = rest[0];
    const artifactPath = rest[1];
    if (!runId || !artifactPath) {
      return {
        exitCode: 2,
        error: artifactUsage('validate')
      };
    }
    const expectedTask = readOption(rest, '--task') ?? undefined;
    const expectedAgent = readOption(rest, '--agent') ?? undefined;
    const report = await validateSddResultArtifact(projectRoot, runId, artifactPath, {
      expectedTask,
      expectedAgent
    });
    return {
      exitCode: report.valid ? 0 : 1,
      output: renderTextOrJson(rest, report, (value) => renderArtifactValidationReport(artifactPath, value, expectedTask, expectedAgent))
    };
  }

  if (subcommand === 'ingest') {
    const runId = rest[0];
    const delegationId = rest[1];
    const artifactPath = rest[2];
    if (!runId || !delegationId || !artifactPath) {
      return {
        exitCode: 2,
        error: artifactUsage('ingest')
      };
    }
    if (hasPreflightFlag(rest)) {
      return {
        exitCode: 0,
        output: artifactPreflightOutput('artifact ingest', artifactPath, rest)
      };
    }

    const result = await ingestArtifactResult(projectRoot, runId, { delegationId, artifactPath });
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderArtifactIngestionResult(result)
    };
  }

  if (subcommand === 'ingestions') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: artifactUsage('ingestions')
      };
    }
    const inspection = await inspectArtifactResultIngestions(projectRoot, runId);
    return {
      exitCode: inspection.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(inspection, null, 2) : renderArtifactIngestionInspection(inspection)
    };
  }

  return null;
}
function artifactUsage(subcommand: string | undefined): string {
  if (subcommand === 'template') {
    return 'Usage: sdd artifact template <artifacts/path.md> --task <task_id> --agent <agent> [--run <run_id> --write] [--branch <branch>] [--status <status>] [--preflight]';
  }
  if (subcommand === 'validate') {
    return 'Usage: sdd artifact validate <run_id> <artifacts/path.md> [--task <task_id>] [--agent <agent>] [--json|--compact-json]';
  }
  if (subcommand === 'ingest') {
    return 'Usage: sdd artifact ingest <run_id> <delegation_id> <artifacts/path.md> [--preflight] [--json]';
  }
  if (subcommand === 'ingestions') {
    return 'Usage: sdd artifact ingestions <run_id> [--json]';
  }
  return 'Usage: sdd artifact template|validate|ingest|ingestions [options]';
}

async function artifactTemplateScopeError(projectRoot: string, runId: string, taskId: string, branch: string | undefined): Promise<string | null> {
  const state = await readRunState(projectRoot, runId);
  if (!state.partition && !state.gitBranch) {
    return `Run ${runId} is unscoped; create it with sdd run create --branch <branch> --task <task_id> before writing artifacts.`;
  }
  if (!state.taskId) {
    return `Run ${runId} has no scoped task; create it with sdd run create --branch <branch> --task <task_id> before writing artifacts.`;
  }
  if (state.taskId !== taskId) {
    return `Run ${runId} is scoped to task ${state.taskId}, not ${taskId}.`;
  }
  if (branch && branch !== state.partition && branch !== state.gitBranch) {
    return `Run ${runId} is scoped to branch ${state.gitBranch ?? state.partition}, not ${branch}.`;
  }
  return null;
}

function artifactPreflightOutput(commandName: string, artifactPath: string, args: string[]): string {
  if (args.includes('--json') || args.includes('--compact-json')) {
    return renderTextOrJson(args, { contract: 'sdd-command-preflight-v1', command: commandName, artifactPath, sideEffects: 'none', status: 'PASS' }, (value) => JSON.stringify(value, null, 2));
  }
  return `SDD command preflight PASS\ncommand=${commandName}\nartifact=${artifactPath}\nside_effects=none`;
}