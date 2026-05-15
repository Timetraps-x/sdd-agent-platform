import { ingestArtifactResult, inspectArtifactResultIngestions } from '@sdd-agent-platform/core/artifacts';
import { validateSddResultArtifact } from '@sdd-agent-platform/core/artifacts';
import { renderSddResultArtifactTemplate } from '@sdd-agent-platform/core/artifacts';
import { writeArtifact } from '@sdd-agent-platform/core/run-state';
import { toArtifactRootRelativePath } from '@sdd-agent-platform/core/runtime-paths';
import { readBranchOption, readSddResultStatus } from '../args.js';
import { readOption } from '../options.js';
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

  if (subcommand === 'template') {
    const artifactPath = rest.find((item) => !item.startsWith('--'));
    const taskId = readOption(rest, '--task');
    const agent = readOption(rest, '--agent');
    if (!artifactPath || !taskId || !agent) {
      return {
        exitCode: 2,
        error: 'Usage: sdd artifact template <artifacts/path.md> --task <task_id> --agent <agent> [--run <run_id> --write] [--branch <branch>] [--status <status>]'
      };
    }
    const runId = readOption(rest, '--run');
    const template = await renderSddResultArtifactTemplate(projectRoot, {
      artifactPath,
      taskId,
      agent,
      branch: readBranchOption(rest),
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
        error: 'Usage: sdd artifact validate <run_id> <artifacts/path.md> [--task <task_id>] [--agent <agent>] [--json|--compact-json]'
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
        error: 'Usage: sdd artifact ingest <run_id> <delegation_id> <artifacts/path.md> [--json]'
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
        error: 'Usage: sdd artifact ingestions <run_id> [--json]'
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
