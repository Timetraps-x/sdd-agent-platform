import { inspectBackgroundExecutor, runBackgroundExecutor } from '@sdd-agent-platform/core/execution';
import { claimResidentWorkerRuntime, heartbeatResidentWorkerRuntime, inspectResidentWorkerRuntime, listResidentWorkerRuntimes } from '@sdd-agent-platform/core/execution';
import { inspectWaveExecutor, runWaveExecutor } from '@sdd-agent-platform/core/execution';
import { inspectTaskGraph } from '@sdd-agent-platform/core/planning';
import { inspectWavePlan } from '@sdd-agent-platform/core/planning';
import { inspectWorktreeIsolation } from '@sdd-agent-platform/core/worktree';
import { createWorktreeLifecycle, inspectWorktreeLifecycle, keepWorktreeLifecycle, removeWorktreeLifecycle } from '@sdd-agent-platform/core/worktree';
import { readBranchOption, readTaskArtifactOptions, readWaveExecutorStrategy } from '../args.js';
import { readOption, readPositiveIntegerOption, readRepeatedOptions } from '../options.js';
import { renderBackgroundExecutorInspection, renderBackgroundExecutorResult, renderResidentWorkerRuntimeClaimResult, renderResidentWorkerRuntimeHeartbeatResult, renderResidentWorkerRuntimeInspection, renderResidentWorkerRuntimeList, renderWaveExecutorInspection, renderWaveExecutorResult } from '../renderers/execution.js';
import { renderTaskGraphPlan, renderWavePlan } from '../renderers/planning.js';
import { renderWorktreeIsolationDecision, renderWorktreeLifecycleInspection, renderWorktreeLifecycleRecord } from '../renderers/worktree.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleExecutionCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command === 'isolation' && subcommand === 'inspect') {
    const taskId = rest.find((item) => !item.startsWith('--'));
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd isolation inspect <task_id> [--branch <branch>] [--capability <capability_id>] [--peer-task <task_id>] [--json]'
      };
    }
    const decision = await inspectWorktreeIsolation(projectRoot, {
      taskId,
      branch: readBranchOption(rest),
      capabilityId: readOption(rest, '--capability') ?? undefined,
      peerTaskIds: readRepeatedOptions(rest, '--peer-task')
    });
    return {
      exitCode: decision.mode === 'blocked' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(decision, null, 2) : renderWorktreeIsolationDecision(decision)
    };
  }

  if (command === 'graph' && subcommand === 'inspect') {
    const graph = await inspectTaskGraph(projectRoot, { branch: readBranchOption(rest) });
    return {
      exitCode: graph.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(graph, null, 2) : renderTaskGraphPlan(graph)
    };
  }

  if (command === 'wave' && subcommand === 'inspect') {
    const wavePlan = await inspectWavePlan(projectRoot, {
      branch: readBranchOption(rest),
      capabilityId: readOption(rest, '--capability') ?? undefined
    });
    return {
      exitCode: wavePlan.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(wavePlan, null, 2) : renderWavePlan(wavePlan)
    };
  }

  if (command === 'wave' && subcommand === 'run') {
    const strategy = readWaveExecutorStrategy(rest, '--strategy');
    if (!strategy) {
      return {
        exitCode: 2,
        error: 'Usage: sdd wave run [--branch <branch>] [--run <run_id>] [--capability <id>] [--agent <agent>] [--worker <adapter_id>] [--strategy fast-stop|safe-continue] [--artifact <task_id:path>]... [--json]'
      };
    }
    const result = await runWaveExecutor(projectRoot, {
      branch: readBranchOption(rest),
      runId: readOption(rest, '--run') ?? undefined,
      capabilityId: readOption(rest, '--capability') ?? undefined,
      agent: readOption(rest, '--agent') ?? undefined,
      workerAdapterId: readOption(rest, '--worker') ?? undefined,
      strategy,
      artifactPaths: readTaskArtifactOptions(rest)
    });
    return {
      exitCode: result.status === 'completed' || result.status === 'claimed' ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderWaveExecutorResult(result)
    };
  }

  if (command === 'wave' && subcommand === 'executor') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd wave executor <run_id> [--json]'
      };
    }
    const inspection = await inspectWaveExecutor(projectRoot, runId);
    return {
      exitCode: inspection.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(inspection, null, 2) : renderWaveExecutorInspection(inspection)
    };
  }

  if (command === 'background' && subcommand === 'run') {
    const taskId = rest[0];
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd background run <task_id> [--run <run_id>] [--agent <agent>] [--worker <adapter_id>] [--artifact <path>] [--branch <branch>] [--json]'
      };
    }
    const result = await runBackgroundExecutor(projectRoot, {
      branch: readBranchOption(rest),
      runId: readOption(rest, '--run') ?? undefined,
      taskId,
      agent: readOption(rest, '--agent') ?? undefined,
      workerAdapterId: readOption(rest, '--worker') ?? undefined,
      artifactPath: readOption(rest, '--artifact') ?? undefined,
      delegationId: readOption(rest, '--delegation') ?? undefined
    });
    return {
      exitCode: result.status === 'blocked' || result.status === 'failed' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderBackgroundExecutorResult(result)
    };
  }

  if (command === 'background' && subcommand === 'inspect') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd background inspect <run_id> [--json]'
      };
    }
    const inspection = await inspectBackgroundExecutor(projectRoot, runId);
    return {
      exitCode: inspection.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(inspection, null, 2) : renderBackgroundExecutorInspection(inspection)
    };
  }

  if (command === 'worker-runtime' && subcommand === 'claim') {
    const taskId = rest[0];
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd worker-runtime claim <task_id> [--run <run_id>] [--runtime <runtime_id>] [--agent <agent>] [--worker <adapter_id>] [--delegation <delegation_id>] [--lease-seconds <n>] [--branch <branch>] [--json]'
      };
    }
    const result = await claimResidentWorkerRuntime(projectRoot, {
      branch: readBranchOption(rest),
      runId: readOption(rest, '--run') ?? undefined,
      taskId,
      runtimeId: readOption(rest, '--runtime') ?? undefined,
      agent: readOption(rest, '--agent') ?? undefined,
      workerAdapterId: readOption(rest, '--worker') ?? undefined,
      delegationId: readOption(rest, '--delegation') ?? undefined,
      leaseSeconds: readPositiveIntegerOption(rest, '--lease-seconds') ?? undefined
    });
    return {
      exitCode: result.status === 'blocked' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderResidentWorkerRuntimeClaimResult(result)
    };
  }

  if (command === 'worker-runtime' && subcommand === 'heartbeat') {
    const runtimeId = rest[0];
    const runId = readOption(rest, '--run');
    if (!runtimeId || !runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd worker-runtime heartbeat <runtime_id> --run <run_id> [--lease-seconds <n>] [--json]'
      };
    }
    const result = await heartbeatResidentWorkerRuntime(projectRoot, {
      runId,
      runtimeId,
      leaseSeconds: readPositiveIntegerOption(rest, '--lease-seconds') ?? undefined
    });
    return {
      exitCode: result.status === 'blocked' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderResidentWorkerRuntimeHeartbeatResult(result)
    };
  }

  if (command === 'worker-runtime' && subcommand === 'status') {
    const positionalRunId = rest[0] && !rest[0].startsWith('--') ? rest[0] : null;
    const runId = readOption(rest, '--run') ?? positionalRunId;
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd worker-runtime status --run <run_id> [--json]'
      };
    }
    const result = await listResidentWorkerRuntimes(projectRoot, { runId });
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderResidentWorkerRuntimeList(result)
    };
  }

  if (command === 'worker-runtime' && subcommand === 'inspect') {
    const runtimeId = rest[0];
    const runId = readOption(rest, '--run');
    if (!runtimeId || !runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd worker-runtime inspect <runtime_id> --run <run_id> [--json]'
      };
    }
    const result = await inspectResidentWorkerRuntime(projectRoot, { runId, runtimeId });
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderResidentWorkerRuntimeInspection(result)
    };
  }

  if (command === 'worktree' && subcommand === 'create') {
    const runId = rest[0];
    const taskId = rest[1];
    if (!runId || !taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd worktree create <run_id> <task_id> [--base <ref>] [--id <worktree_id>] [--json]'
      };
    }
    const record = await createWorktreeLifecycle(projectRoot, runId, {
      taskId,
      baseRef: readOption(rest, '--base') ?? undefined,
      worktreeId: readOption(rest, '--id') ?? undefined
    });
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(record, null, 2) : renderWorktreeLifecycleRecord('Worktree created', record)
    };
  }

  if (command === 'worktree' && subcommand === 'inspect') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd worktree inspect <run_id> [--json]'
      };
    }
    const inspection = await inspectWorktreeLifecycle(projectRoot, runId);
    return {
      exitCode: inspection.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(inspection, null, 2) : renderWorktreeLifecycleInspection(inspection)
    };
  }

  if (command === 'worktree' && subcommand === 'keep') {
    const runId = rest[0];
    const worktreeId = rest[1];
    if (!runId || !worktreeId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd worktree keep <run_id> <worktree_id> [--reason <text>] [--json]'
      };
    }
    const record = await keepWorktreeLifecycle(projectRoot, runId, worktreeId, { reason: readOption(rest, '--reason') ?? undefined });
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(record, null, 2) : renderWorktreeLifecycleRecord('Worktree kept', record)
    };
  }

  if (command === 'worktree' && subcommand === 'remove') {
    const runId = rest[0];
    const worktreeId = rest[1];
    if (!runId || !worktreeId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd worktree remove <run_id> <worktree_id> [--json]'
      };
    }
    const record = await removeWorktreeLifecycle(projectRoot, runId, worktreeId);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(record, null, 2) : renderWorktreeLifecycleRecord('Worktree removed', record)
    };
  }

  return null;
}
