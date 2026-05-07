#!/usr/bin/env node
import {
  archiveRun,
  applyAiToolEntries,
  applySyncBack,
  createWorktreeLifecycle,
  createRun,
  doctor,
  evaluateLifecycleDecisionGate,
  evaluateGovernancePolicy,
  getProjectStatus,
  getDelegationStateMachine,
  getSddInstructions,
  initProject,
  inspectRun,
  inspectSddTask,
  inspectToolPluginContract,
  inspectToolCapability,
  inspectDelegationQueueItem,
  inspectSyncBack,
  inspectTaskGraph,
  inspectWavePlan,
  inspectWaveExecutor,
  inspectBackgroundExecutor,
  inspectArtifactResultIngestions,
  inspectWorktreeLifecycle,
  inspectWorkerAdapterContract,
  inspectWorktreeIsolation,
  inspectGovernancePolicy,
  keepWorktreeLifecycle,
  removeWorktreeLifecycle,
  listRuns,
  rebuildLocalRunIndex,
  inspectLocalRunIndex,
  queryLocalRunIndex,
  listToolPluginContracts,
  listToolCapabilities,
  listDelegationQueueItems,
  listWorkerAdapterContracts,
  ingestArtifactResult,
  parseSddBranch,
  readRunState,
  recordLifecycleDecision,
  renderDoctorReport,
  renderGoalVerifyResult,
  renderLifecycleDecisionGate,
  renderSddResultArtifactTemplate,
  renderSddInstructions,
  renderSingleTaskLoopResult,
  renderTaskGapReport,
  renderTaskInspect,
  renderTaskList,
  runGoalVerify,
  runSingleTaskLoop,
  runBackgroundExecutor,
  runWaveExecutor,
  SDD_VERSION,
  summarizeAiProjectionStatus,
  validateSddResultArtifact,
  type SddResultStatus,
  type AiToolSelection,
  type ProjectStatus,
  type RunInspection,
  type RunSummary,
  type RunStatus,
  type LocalRunIndex,
  type LocalRunIndexInspection,
  type GovernancePolicy,
  type GovernancePolicyDecision,
  type GovernancePolicyOperation,
  type SyncBackApplyResult,
  type SyncBackInspection,
  type ToolCapability,
  type ToolPluginContract,
  type DelegationQueueItem,
  type DelegationStateMachine,
  type WorkerAdapterContract,
  type ArtifactResultIngestionInspection,
  type ArtifactResultIngestionResult,
  type WorktreeIsolationDecision,
  type WorktreeLifecycleInspection,
  type WorktreeLifecycleRecord,
  type TaskGraphPlan,
  type WavePlan,
  type WaveExecutorInspection,
  type WaveExecutorResult,
  type WaveExecutorStrategy,
  type BackgroundExecutorInspection,
  type BackgroundExecutorResult,
} from '../../core/src/index.js';

interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

async function main(args: string[]): Promise<CliResult> {
  const projectRoot = process.cwd();
  const [command, subcommand, ...rest] = args;

  if (!command || command === '--help' || command === '-h') {
    return {
      exitCode: 0,
      output: helpText()
    };
  }

  if (command === '--version' || command === '-v') {
    return {
      exitCode: 0,
      output: SDD_VERSION
    };
  }

  if (command === 'init') {
    const initArgs = [subcommand, ...rest].filter(Boolean);
    const force = initArgs.includes('--force');
    const aiTool = readAiToolSelection(initArgs, true);
    const branch = readOption(initArgs, '--branch') ?? 'master';
    const scaffoldDocuments = !initArgs.includes('--no-scaffold-docs');
    const result = await initProject(projectRoot, { force, aiTool, branch, scaffoldDocuments });
    return {
      exitCode: 0,
      output: JSON.stringify({ command: 'init', ...result }, null, 2)
    };
  }

  if (command === 'update') {
    const updateArgs = [subcommand, ...rest].filter(Boolean);
    const check = updateArgs.includes('--check');
    const aiTool = readAiToolSelection(updateArgs, false);
    const results = await applyAiToolEntries(projectRoot, { tool: aiTool, check });
    const status = summarizeAiProjectionStatus(results);
    return {
      exitCode: status === 'FAIL' ? 1 : 0,
      output: JSON.stringify({ command: 'update', check, status, aiTools: results }, null, 2)
    };
  }

  if (command === 'instructions') {
    const instructionArgs = [subcommand, ...rest].filter(Boolean);
    const action = instructionArgs.find((item) => !item.startsWith('--')) ?? 'overview';
    const payload = getSddInstructions(action);
    const json = instructionArgs.includes('--json');
    return {
      exitCode: 0,
      output: json ? JSON.stringify(payload, null, 2) : renderSddInstructions(payload)
    };
  }

  if (command === 'doctor') {
    const doctorArgs = [subcommand, ...rest].filter(Boolean);
    if (doctorArgs.includes('--latest-only') && doctorArgs.includes('--all-runs')) {
      return {
        exitCode: 2,
        error: 'Usage: sdd doctor [--latest-only] [--all-runs] (choose only one scope flag)'
      };
    }
    const report = await doctor(projectRoot, {
      latestOnly: doctorArgs.includes('--latest-only'),
      allRuns: doctorArgs.includes('--all-runs')
    });
    return {
      exitCode: report.status === 'FAIL' ? 1 : 0,
      output: renderDoctorReport(report)
    };
  }

  if (command === 'status') {
    const statusArgs = [subcommand, ...rest].filter(Boolean);
    const result = await getProjectStatus(projectRoot, { branch: readOption(statusArgs, '--branch') ?? 'master' });
    const json = statusArgs.includes('--json');
    return {
      exitCode: result.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
      output: json ? JSON.stringify(result, null, 2) : renderProjectStatus(result)
    };
  }

  if (command === 'run' && subcommand === 'create') {
    const state = await createRun(projectRoot);
    return {
      exitCode: 0,
      output: JSON.stringify({ runId: state.runId, statePath: `.sdd/runs/${state.runId}/state.json`, eventLogPath: `.sdd/runs/${state.runId}/events.jsonl` }, null, 2)
    };
  }

  if (command === 'run' && subcommand === 'status') {
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

  if (command === 'run' && subcommand === 'list') {
    const runs = await listRuns(projectRoot);
    const json = rest.includes('--json');
    return {
      exitCode: 0,
      output: json ? JSON.stringify(runs, null, 2) : renderRunList(runs)
    };
  }

  if (command === 'run' && subcommand === 'index') {
    const action = rest[0];
    const json = rest.includes('--json');
    if (action === 'rebuild') {
      const index = await rebuildLocalRunIndex(projectRoot);
      return {
        exitCode: 0,
        output: json ? JSON.stringify(index, null, 2) : renderLocalRunIndex(index)
      };
    }
    if (action === 'inspect') {
      const inspection = await inspectLocalRunIndex(projectRoot);
      return {
        exitCode: inspection.valid ? 0 : 1,
        output: json ? JSON.stringify(inspection, null, 2) : renderLocalRunIndexInspection(inspection)
      };
    }
    if (action === 'query') {
      const status = readRunStatus(rest, '--status');
      if (readOption(rest, '--status') && !status) {
        return {
          exitCode: 2,
          error: 'Usage: sdd run index query [--run <run_id>] [--task <task_id>] [--status created|running|completed|blocked|failed|archived] [--artifact <path>] [--json]'
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
        output: json ? JSON.stringify(index, null, 2) : renderLocalRunIndex(index)
      };
    }
    return {
      exitCode: 2,
      error: 'Usage: sdd run index rebuild|inspect|query [options]'
    };
  }

  if (command === 'run' && subcommand === 'inspect') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd run inspect <run_id> [--json]'
      };
    }
    const result = await inspectRun(projectRoot, runId);
    const json = rest.includes('--json');
    return {
      exitCode: 0,
      output: json ? JSON.stringify(result, null, 2) : renderRunInspection(result)
    };
  }

  if (command === 'run' && subcommand === 'archive') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd run archive <run_id> [--reason <text>]'
      };
    }
    const state = await archiveRun(projectRoot, runId, { reason: readOption(rest, '--reason') ?? undefined });
    return {
      exitCode: 0,
      output: JSON.stringify({ runId: state.runId, status: state.status, updatedAt: state.updatedAt }, null, 2)
    };
  }

  if (command === 'sync-back' && subcommand === 'inspect') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd sync-back inspect <run_id> [--branch <branch>] [--task <task_id>] [--json]'
      };
    }
    const result = await inspectSyncBack(projectRoot, {
      runId,
      branch: readOption(rest, '--branch') ?? 'master',
      taskId: readOption(rest, '--task') ?? undefined
    });
    const json = rest.includes('--json');
    return {
      exitCode: result.status === 'blocked' ? 1 : 0,
      output: json ? JSON.stringify(result, null, 2) : renderSyncBackInspection(result)
    };
  }

  if (command === 'sync-back' && subcommand === 'apply') {
    const runId = rest[0];
    if (!runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd sync-back apply <run_id> [--branch <branch>] [--task <task_id>] [--approved] [--json]'
      };
    }
    const result = await applySyncBack(projectRoot, {
      runId,
      branch: readOption(rest, '--branch') ?? 'master',
      taskId: readOption(rest, '--task') ?? undefined,
      approved: rest.includes('--approved')
    });
    const json = rest.includes('--json');
    return {
      exitCode: 0,
      output: json ? JSON.stringify(result, null, 2) : renderSyncBackApplyResult(result)
    };
  }

  if (command === 'tasks' && subcommand === 'format') {
    return {
      exitCode: 0,
      output: taskFormatText()
    };
  }

  if (command === 'tasks' && subcommand === 'list') {
    const model = await parseSddBranch(projectRoot, readOption(rest, '--branch') ?? 'master');
    return {
      exitCode: model.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
      output: renderTaskList(model)
    };
  }

  if (command === 'tasks' && subcommand === 'inspect') {
    const taskId = rest.find((item) => !item.startsWith('--'));
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd tasks inspect <task_id> [--branch <branch>]'
      };
    }
    const model = await parseSddBranch(projectRoot, readOption(rest, '--branch') ?? 'master');
    const result = inspectSddTask(model, taskId);
    if (!result.task && result.gaps.length === 0) {
      return {
        exitCode: 1,
        error: `Task not found: ${taskId}`
      };
    }
    return {
      exitCode: result.task === null || result.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
      output: renderTaskInspect(result.task, result.gaps)
    };
  }

  if (command === 'tasks' && subcommand === 'gaps') {
    const model = await parseSddBranch(projectRoot, readOption(rest, '--branch') ?? 'master');
    return {
      exitCode: model.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
      output: renderTaskGapReport(model)
    };
  }

  if (command === 'lifecycle' && subcommand === 'decide') {
    const result = evaluateLifecycleDecisionGate(readLifecycleSignalOptions(rest));
    const runId = readOption(rest, '--run');
    if (runId) {
      await recordLifecycleDecision(projectRoot, runId, result.record);
    }
    const json = rest.includes('--json');
    return {
      exitCode: 0,
      output: json ? JSON.stringify({ ...result, recordedRunId: runId ?? null }, null, 2) : `${renderLifecycleDecisionGate(result)}${runId ? `\nrecorded_run=${runId}` : ''}`
    };
  }

  if (command === 'do' && subcommand === 'task') {
    const taskId = rest.find((item) => !item.startsWith('--'));
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd do task <task_id> [--branch <branch>] [--run <run_id>] [--implement-artifact artifacts/path.md] [--review-artifact artifacts/path.md] [--debug-artifact artifacts/path.md] [--validation-artifact artifacts/path.md]'
      };
    }
    const result = await runSingleTaskLoop(projectRoot, {
      taskId,
      branch: readOption(rest, '--branch') ?? 'master',
      runId: readOption(rest, '--run') ?? undefined,
      implementArtifact: readOption(rest, '--implement-artifact') ?? undefined,
      reviewArtifact: readOption(rest, '--review-artifact') ?? undefined,
      debugArtifact: readOption(rest, '--debug-artifact') ?? undefined,
      validationArtifact: readOption(rest, '--validation-artifact') ?? undefined
    });
    return {
      exitCode: result.status === 'completed' ? 0 : 1,
      output: renderSingleTaskLoopResult(result)
    };
  }


  if (command === 'verify' && subcommand === 'task') {
    const taskId = rest.find((item) => !item.startsWith('--'));
    const runId = readOption(rest, '--run');
    if (!taskId || !runId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd verify task <task_id> --run <run_id> [--branch <branch>] [--review-artifact artifacts/path.md] [--validation-artifact artifacts/path.md]'
      };
    }
    const result = await runGoalVerify(projectRoot, {
      taskId,
      runId,
      branch: readOption(rest, '--branch') ?? 'master',
      reviewArtifact: readOption(rest, '--review-artifact') ?? undefined,
      validationArtifact: readOption(rest, '--validation-artifact') ?? undefined
    });
    return {
      exitCode: result.status === 'PASS' ? 0 : 1,
      output: renderGoalVerifyResult(result)
    };
  }

  if (command === 'governance' && subcommand === 'inspect') {
    const policy = await inspectGovernancePolicy(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(policy, null, 2) : renderGovernancePolicy(policy)
    };
  }

  if (command === 'governance' && subcommand === 'evaluate') {
    const operation = readGovernancePolicyOperation(rest[0]);
    if (!operation) {
      return {
        exitCode: 2,
        error: 'Usage: sdd governance evaluate background_executor|wave_executor|sync_back_apply|destructive_git|external_interaction|cleanup [--worker <adapter_id>] [--risk <tag>] [--approved] [--json]'
      };
    }
    const decision = await evaluateGovernancePolicy(projectRoot, {
      operation,
      workerAdapterId: readOption(rest, '--worker') ?? undefined,
      riskTags: readRepeatedOption(rest, '--risk'),
      approved: rest.includes('--approved')
    });
    return {
      exitCode: decision.allowed ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(decision, null, 2) : renderGovernancePolicyDecision(decision)
    };
  }

  if (command === 'capabilities' && subcommand === 'list') {
    const registry = await listToolCapabilities(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderCapabilityList(registry.capabilities)
    };
  }

  if (command === 'capabilities' && subcommand === 'inspect') {
    const capabilityId = rest.find((item) => !item.startsWith('--'));
    if (!capabilityId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd capabilities inspect <capability_id> [--json]'
      };
    }
    const capability = await inspectToolCapability(projectRoot, capabilityId);
    if (!capability) {
      return {
        exitCode: 1,
        error: `Unknown capability: ${capabilityId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(capability, null, 2) : renderCapabilityInspect(capability)
    };
  }

  if (command === 'plugins' && subcommand === 'list') {
    const registry = await listToolPluginContracts(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderPluginContractList(registry.contracts)
    };
  }

  if (command === 'plugins' && subcommand === 'inspect') {
    const pluginId = rest.find((item) => !item.startsWith('--'));
    if (!pluginId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd plugins inspect <plugin_id> [--json]'
      };
    }
    const contract = await inspectToolPluginContract(projectRoot, pluginId);
    if (!contract) {
      return {
        exitCode: 1,
        error: `Unknown plugin contract: ${pluginId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderPluginContractInspect(contract)
    };
  }

  if (command === 'queue' && subcommand === 'list') {
    const snapshot = await listDelegationQueueItems(projectRoot, { runId: readOption(rest, '--run') ?? undefined });
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(snapshot, null, 2) : renderDelegationQueueList(snapshot.items)
    };
  }

  if (command === 'queue' && subcommand === 'inspect') {
    const queueItemId = rest.find((item) => !item.startsWith('--'));
    if (!queueItemId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd queue inspect <queue_item_id> [--json]'
      };
    }
    const item = await inspectDelegationQueueItem(projectRoot, queueItemId);
    if (!item) {
      return {
        exitCode: 1,
        error: `Unknown queue item: ${queueItemId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(item, null, 2) : renderDelegationQueueInspect(item)
    };
  }

  if (command === 'state-machine' && subcommand === 'inspect') {
    const machine = getDelegationStateMachine();
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(machine, null, 2) : renderDelegationStateMachineInspect(machine)
    };
  }

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
      branch: readOption(rest, '--branch') ?? 'master',
      capabilityId: readOption(rest, '--capability') ?? undefined,
      peerTaskIds: readRepeatedOptions(rest, '--peer-task')
    });
    return {
      exitCode: decision.mode === 'blocked' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(decision, null, 2) : renderWorktreeIsolationDecision(decision)
    };
  }

  if (command === 'graph' && subcommand === 'inspect') {
    const graph = await inspectTaskGraph(projectRoot, { branch: readOption(rest, '--branch') ?? 'master' });
    return {
      exitCode: graph.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(graph, null, 2) : renderTaskGraphPlan(graph)
    };
  }

  if (command === 'wave' && subcommand === 'inspect') {
    const wavePlan = await inspectWavePlan(projectRoot, {
      branch: readOption(rest, '--branch') ?? 'master',
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
      branch: readOption(rest, '--branch') ?? 'master',
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
      branch: readOption(rest, '--branch') ?? 'master',
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

  if (command === 'workers' && subcommand === 'list') {
    const registry = await listWorkerAdapterContracts(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderWorkerAdapterList(registry.adapters)
    };
  }

  if (command === 'workers' && subcommand === 'inspect') {
    const adapterId = rest.find((item) => !item.startsWith('--'));
    if (!adapterId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd workers inspect <adapter_id> [--json]'
      };
    }
    const adapter = await inspectWorkerAdapterContract(projectRoot, adapterId);
    if (!adapter) {
      return {
        exitCode: 1,
        error: `Unknown worker adapter: ${adapterId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(adapter, null, 2) : renderWorkerAdapterInspect(adapter)
    };
  }

  if (command === 'artifact' && subcommand === 'template') {
    const artifactPath = rest.find((item) => !item.startsWith('--'));
    const taskId = readOption(rest, '--task');
    const agent = readOption(rest, '--agent');
    if (!artifactPath || !taskId || !agent) {
      return {
        exitCode: 2,
        error: 'Usage: sdd artifact template <artifacts/path.md> --task <task_id> --agent <agent> [--branch <branch>] [--status <status>]'
      };
    }
    return {
      exitCode: 0,
      output: await renderSddResultArtifactTemplate(projectRoot, {
        artifactPath,
        taskId,
        agent,
        branch: readOption(rest, '--branch') ?? 'master',
        status: readSddResultStatus(rest, '--status') ?? 'PASS'
      })
    };
  }

  if (command === 'artifact' && subcommand === 'validate') {
    const runId = rest[0];
    const artifactPath = rest[1];
    if (!runId || !artifactPath) {
      return {
        exitCode: 2,
        error: 'Usage: sdd artifact validate <run_id> <artifacts/path.md> [--task <task_id>] [--agent <agent>] [--json]'
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
      output: rest.includes('--json') ? JSON.stringify(report, null, 2) : renderArtifactValidationReport(artifactPath, report, expectedTask, expectedAgent)
    };
  }

  if (command === 'artifact' && subcommand === 'ingest') {
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

  if (command === 'artifact' && subcommand === 'ingestions') {
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


  return {
    exitCode: 2,
    error: `Unknown command: ${args.join(' ')}\n\n${helpText()}`
  };
}

function helpText(): string {
  return `sdd Phase 2 platform CLI

Commands:
  sdd --version                            Print CLI/core version
  sdd init [--force] [--ai <mode>] [--branch <branch>] [--no-scaffold-docs]
                                                Create .sdd config, starter SDD docs, and generated AI entries
  sdd update [--check] [--ai <mode>]       Refresh or check managed generated AI entries
  sdd instructions [action] [--json]       Print dynamic SDD instruction payload
  sdd doctor [--latest-only] [--all-runs] Check config, run evidence, specs, and AI entry drift
  sdd status [--branch <branch>] [--json]  Show tasks, latest run, gaps, and recommended next command
  sdd run create                           Create .sdd/runs/<run_id> with state/events/artifacts
  sdd run status <run_id>                  Print current run status
  sdd run list [--json]                    List recorded runs by updated time
  sdd run index rebuild|inspect|query [options] Rebuild, inspect, or query Phase 3.13 local run index
  sdd run inspect <run_id> [--json]        Inspect run state, events, artifacts, validation, sync-back
  sdd run archive <run_id> [--reason]      Archive a run without deleting evidence
  sdd sync-back inspect <run_id> [options] Inspect explicit proposal-to-tasks.md write-back readiness
  sdd sync-back apply <run_id> [--approved] Apply verified sync-back proposal to tasks.md
  sdd lifecycle decide [options]           Evaluate lifecycle decision gate
  sdd do task <task_id> [options]          Run ingestion-aware task workflow over supplied artifacts
  sdd verify task <task_id> --run <run_id> Run goal-level acceptance coverage verify
  sdd tasks format                         Print canonical sdd-task fenced block format
  sdd tasks list [--branch <branch>]       Parse and list sdd-task blocks
  sdd tasks inspect <task_id> [--branch]   Inspect one parsed task
  sdd tasks gaps [--branch <branch>]       Render parser task gap report
  sdd artifact template <path> [options]   Print a valid sdd-result artifact template
  sdd artifact validate <run_id> <path>    Validate a run-relative sdd-result artifact
  sdd artifact ingest <run_id> <delegation_id> <path>
  sdd artifact ingestions <run_id> [--json] Inspect Phase 3.6 artifact ingestion ledger
  sdd capabilities list [--json]           List Phase 3.1 tool/capability declarations
  sdd capabilities inspect <id> [--json]   Inspect one capability declaration
  sdd governance inspect|evaluate [options] Inspect or evaluate Phase 3.14 governance policy
  sdd plugins list [--json]                List Phase 3.2 plugin loading contracts
  sdd plugins inspect <id> [--json]        Inspect one plugin loading contract
  sdd queue list [--run <run_id>] [--json] List Phase 3.3 delegation queue items
  sdd queue inspect <id> [--json]          Inspect one delegation queue item
  sdd state-machine inspect [--json]       Inspect Phase 3.4 delegation state machine
  sdd workers list [--json]                List Phase 3.5 worker adapter contracts
  sdd workers inspect <id> [--json]        Inspect one worker adapter contract
  sdd isolation inspect <task_id> [options] Dry-run Phase 3.7 worktree isolation decision
  sdd graph inspect [--branch <branch>] [--json] Inspect Phase 3.9 task dependency graph
  sdd wave inspect [--branch <branch>] [--capability <id>] [--json] Inspect Phase 3.10 dependency wave plan
  sdd wave run [options]                     Run Phase 3.12 planner-driven wave executor
  sdd wave executor <run_id> [--json]        Inspect Phase 3.12 wave executor evidence
  sdd background run <task_id> [options]   Claim one Phase 3.11 background delegation; ingest supplied artifact if provided
  sdd background inspect <run_id> [--json] Inspect Phase 3.11 background executor evidence
  sdd worktree create <run_id> <task_id> [options]
  sdd worktree inspect <run_id> [--json]  Inspect Phase 3.8 worktree lifecycle records
  sdd worktree keep <run_id> <id>         Mark a worktree retained for inspection
  sdd worktree remove <run_id> <id>       Remove a clean tracked worktree

AI options:
  --ai auto                                Project Claude Code entries when supported
  --ai claude-code                         Project Claude Code entries explicitly
  --ai none                                Skip AI entry projection during init

Init options:
  --branch <branch>                         Create starter docs under specs/<branch>; default master
  --no-scaffold-docs                        Skip starter spec.md/plan.md/tasks.md creation

Doctor options:
  --latest-only                            Inspect only the newest non-archived run evidence
  --all-runs                               Inspect every run, including archived runs

Run index options:
  --run <run_id>                           Filter local run index query by run id
  --task <task_id>                         Filter local run index query by task id
  --status <status>                        Filter query by run status
  --artifact <path>                        Filter query by indexed artifact path
  --json                                   Print machine-readable local run index output

Artifact options:
  --task <task_id>                         Expected artifact task id
  --agent <agent>                          Expected producing agent name
  --branch <branch>                        Branch used to copy validator Acceptance mapping
  --status <status>                        Template status; default PASS
  --json                                   Print machine-readable validation result

Governance options:
  --worker <adapter_id>                    Worker adapter to evaluate
  --risk <tag>                             Risk tag to evaluate; repeatable
  --approved                               Record explicit approval for confirmation-gated operations
  --json                                   Print machine-readable governance output

Wave executor options:
  --branch <branch>                        Read specs/<branch>/tasks.md; default master
  --run <run_id>                           Reuse an existing run; default creates one
  --capability <id>                        Capability used for planner isolation decisions
  --strategy fast-stop|safe-continue       Stop on first task failure or finish current safe wave
  --artifact <task_id:path>                Supply task-specific run-relative artifact; repeatable

Instructions actions:
  overview | init | doctor | update | spec | plan | tasks | do | verify | run-task | verify-task

Do task options:
  --branch <branch>                        Read specs/<branch>/spec.md, plan.md, tasks.md
  --run <run_id>                           Reuse an existing run instead of creating one
  --implement-artifact <path>              Run-relative implementer artifact, if available
  --review-artifact <path>                 Run-relative reviewer artifact, required to complete
  --debug-artifact <path>                  Optional single debugger artifact after review failure
  --validation-artifact <path>             Run-relative validator artifact, required to complete

Verify task options:
  --branch <branch>                        Read specs/<branch>/spec.md, plan.md, tasks.md
  --run <run_id>                           Required run id containing state/events/artifacts
  --review-artifact <path>                 Optional reviewer artifact override
  --validation-artifact <path>             Optional validator artifact override

Lifecycle decide options:
  --direct-safe                            High clarity, high confidence, reversible, cheap local validation
  --risk <tag>                             Add risk tag; api/schema/database/security/state-machine/ci force gates
  --contract <name>                        Mark affected API/schema/contract
  --impact-confidence <high|medium|low>    Set impact confidence
  --acceptance <high|medium|low>           Set acceptance clarity
  --validation <clear|partial|unclear>     Set validation clarity
  --external-unknown                       Require research route
  --architecture                           Require architecture/research route
  --checkpoint                             Force human checkpoint
  --permission <name>                      Mark permission/checkpoint requirement
  --run <run_id>                           Record decision to existing run state/events
  --json                                   Print machine-readable result

Sync-back options:
  --branch <branch>                        Read target specs/<branch>/tasks.md
  --task <task_id>                         Override run currentTask when inspecting or applying
  --json                                   Print machine-readable result

Isolation options:
  --branch <branch>                        Read specs/<branch>/tasks.md
  --capability <capability_id>             Capability side effect used for isolation decision
  --peer-task <task_id>                    Compare affected_files overlap against peer task

Graph options:
  --branch <branch>                        Read specs/<branch>/tasks.md

Wave options:
  --branch <branch>                        Read specs/<branch>/tasks.md
  --capability <capability_id>             Capability side effect used for isolation decisions

Background options:
  --branch <branch>                        Read specs/<branch>/tasks.md
  --run <run_id>                           Reuse an existing run; default creates one
  --agent <agent>                          Delegated agent name; default implementer
  --worker <adapter_id>                    Worker adapter id; default sdd-cli-task-worker
  --artifact <path>                        Run-relative sdd-result artifact to ingest
  --delegation <delegation_id>             Stable delegation id for retry/ingest
Worktree options:
  --base <ref>                            Base ref for git worktree add; default HEAD
  --id <worktree_id>                      Stable lifecycle id; default wt-<run>-<task>
  --reason <text>                         Reason when keeping a worktree
  `;
}

function renderProjectStatus(status: ProjectStatus): string {
  const lines = [`SDD status for ${status.branch}`];
  lines.push(`documents spec=${status.documents.specExists} plan=${status.documents.planExists} tasks=${status.documents.tasksExists}`);
  lines.push(`tasks total=${status.tasks.total} pending=${status.tasks.pending} in_progress=${status.tasks.inProgress} completed=${status.tasks.completed} blocked=${status.tasks.blocked} deferred=${status.tasks.deferred} unknown=${status.tasks.unknown} gaps=${status.tasks.gaps}`);
  if (status.latestRun) {
    lines.push(`latest_run ${status.latestRun.runId} status=${status.latestRun.status} phase=${status.latestRun.phase ?? 'n/a'} task=${status.latestRun.currentTask ?? 'n/a'} validation=${status.latestRun.validationStatus} sync_back=${status.latestRun.syncBackStatus}`);
  } else {
    lines.push('latest_run none');
  }
  if (status.gaps.length > 0) {
    lines.push('gaps');
    for (const gap of status.gaps) {
      lines.push(`- [${gap.severity}] ${gap.type} ${gap.taskId ?? 'document'} ${gap.field}: ${gap.message}`);
    }
  }
  lines.push(`next ${status.recommendedNextCommand}`);
  return lines.join('\n');
}

function renderRunList(runs: RunSummary[]): string {
  if (runs.length === 0) {
    return 'No SDD runs found.';
  }
  const lines = ['SDD runs'];
  for (const run of runs) {
    lines.push(`${run.runId}\t${run.status}\tphase=${run.phase ?? 'n/a'}\ttask=${run.currentTask ?? 'n/a'}\tvalidation=${run.validationStatus}\tsync_back=${run.syncBackStatus}\tupdated=${run.updatedAt}`);
  }
  return lines.join('\n');
}

function renderLocalRunIndex(index: LocalRunIndex): string {
  const lines = [`Local run index ${index.contract}`];
  lines.push(`generated=${index.generatedAt} runs=${index.runs.length} tasks=${index.tasks.length} delegations=${index.delegations.length} artifacts=${index.artifacts.length} waves=${index.waves.length}`);
  for (const run of index.runs) {
    lines.push(`- ${run.runId}: ${run.status} phase=${run.phase ?? 'n/a'} task=${run.currentTask ?? 'n/a'} artifacts=${run.artifactCount} updated=${run.updatedAt}`);
  }
  return lines.join('\n');
}

function renderLocalRunIndexInspection(inspection: LocalRunIndexInspection): string {
  const lines = [`Local run index ${inspection.valid ? 'valid' : 'invalid'}`];
  lines.push(`path=${inspection.indexPath} exists=${inspection.exists}`);
  if (inspection.index) {
    lines.push(`contract=${inspection.index.contract} runs=${inspection.index.runs.length} tasks=${inspection.index.tasks.length} delegations=${inspection.index.delegations.length} artifacts=${inspection.index.artifacts.length} waves=${inspection.index.waves.length}`);
  }
  if (inspection.issues.length > 0) {
    lines.push('issues');
    for (const issue of inspection.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  return lines.join('\n');
}

function renderGovernancePolicy(policy: GovernancePolicy): string {
  const lines = [`Governance policy ${policy.version}`];
  lines.push(`concurrency background=${policy.concurrency.maxBackgroundDelegations} wave=${policy.concurrency.maxWaveExecutors}`);
  lines.push(`confirmation operations=${policy.manualConfirmation.operations.join(',')}`);
  lines.push(`confirmation workers=${policy.manualConfirmation.workerAdapters.join(',') || 'none'}`);
  lines.push(`confirmation risks=${policy.manualConfirmation.riskTags.join(',') || 'none'}`);
  lines.push(`cleanup archive_only=${policy.cleanup.archiveOnly} delete_run_history=${policy.cleanup.deleteRunHistory}`);
  lines.push(`retry reopen_terminal=${policy.retry.reopenTerminalDelegation} max_attempts=${policy.retry.maxAttemptsPerDelegation}`);
  lines.push(`stop_conditions=${policy.stopConditions.join(',')}`);
  return lines.join('\n');
}

function renderGovernancePolicyDecision(decision: GovernancePolicyDecision): string {
  const lines = [`Governance decision ${decision.status} for ${decision.operation}`];
  lines.push(`version=${decision.version} allowed=${decision.allowed}`);
  lines.push('reasons');
  for (const reason of decision.reasons) {
    lines.push(`- ${reason}`);
  }
  if (decision.issues.length > 0) {
    lines.push('issues');
    for (const issue of decision.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  return lines.join('\n');
}

function renderRunInspection(inspection: RunInspection): string {
  const lines = [`SDD run ${inspection.summary.runId}`];
  lines.push(`status=${inspection.summary.status} phase=${inspection.summary.phase ?? 'n/a'} task=${inspection.summary.currentTask ?? 'n/a'} updated=${inspection.summary.updatedAt}`);
  lines.push(`validation=${inspection.validation.status} evidence=${inspection.validation.evidence.join(',') || 'none'}`);
  lines.push(`sync_back=${inspection.syncBack.status} proposal=${inspection.syncBack.proposalPath ?? 'none'}`);
  lines.push(`artifacts=${inspection.artifacts.length}`);
  for (const artifact of inspection.artifacts) {
    lines.push(`- ${artifact.path} kind=${artifact.kind} task=${artifact.task ?? 'n/a'} agent=${artifact.agent ?? 'n/a'}`);
  }
  lines.push(`artifact_ingestions=${inspection.artifactIngestions.length}`);
  for (const ingestion of inspection.artifactIngestions) {
    lines.push(`- ${ingestion.delegationId} ${ingestion.status} artifact=${ingestion.artifactPath} result=${ingestion.resultStatus ?? 'n/a'} delegation=${ingestion.delegationStatus ?? 'n/a'}`);
  }
  lines.push(`events=${inspection.eventCount}`);
  for (const event of inspection.recentEvents) {
    lines.push(`- ${event.time} ${event.event}${event.summary ? `: ${event.summary}` : ''}`);
  }
  return lines.join('\n');
}

function renderSyncBackInspection(inspection: SyncBackInspection): string {
  const lines = [`Sync-back ${inspection.status} for ${inspection.runId}/${inspection.taskId ?? 'n/a'}`];
  lines.push(`branch=${inspection.branch}`);
  lines.push(`proposal=${inspection.proposalPath ?? 'none'}`);
  lines.push(`run_task_status=${inspection.runTaskStatus ?? 'n/a'} markdown_status=${inspection.markdownStatus ?? 'n/a'}`);
  if (inspection.reasons.length > 0) {
    lines.push('reasons');
    for (const reason of inspection.reasons) {
      lines.push(`- ${reason}`);
    }
  }
  if (inspection.gaps.length > 0) {
    lines.push('gaps');
    for (const gap of inspection.gaps) {
      lines.push(`- [${gap.severity}] ${gap.type} ${gap.taskId ?? 'document'} ${gap.field}: ${gap.message}`);
    }
  }
  lines.push(`apply_policy=${inspection.applyPolicy.mode} approval_required=${inspection.applyPolicy.requiresApproval}`);
  for (const reason of inspection.applyPolicy.reasons) {
    lines.push(`- policy: ${reason}`);
  }
  if (inspection.status === 'ready') {
    const approvedFlag = inspection.applyPolicy.requiresApproval ? ' --approved' : '';
    lines.push(`next sdd sync-back apply ${inspection.runId} --branch ${inspection.branch} --task ${inspection.taskId}${approvedFlag}`);
  }
  return lines.join('\n');
}

function renderSyncBackApplyResult(result: SyncBackApplyResult): string {
  const lines = [result.message];
  lines.push(`tasks_path=${result.tasksPath}`);
  lines.push(`applied=${result.applied}`);
  lines.push(`sync_back=${result.inspection.status}`);
  return lines.join('\n');
}

function renderCapabilityList(capabilities: ToolCapability[]): string {
  const lines = ['SDD tool capabilities'];
  for (const capability of capabilities) {
    lines.push(`- ${capability.id} category=${capability.category} side_effect=${capability.sideEffect} default=${capability.defaultAvailable}`);
  }
  return lines.join('\n');
}

function renderCapabilityInspect(capability: ToolCapability): string {
  const lines = [`Capability ${capability.id}`];
  lines.push(`title=${capability.title}`);
  lines.push(`category=${capability.category} side_effect=${capability.sideEffect} default=${capability.defaultAvailable}`);
  lines.push(`summary=${capability.summary}`);
  lines.push('allowed_stages');
  for (const stage of capability.allowedStages) {
    lines.push(`- ${stage}`);
  }
  lines.push('required_evidence');
  for (const evidence of capability.requiredEvidence) {
    lines.push(`- ${evidence}`);
  }
  lines.push('forbidden_uses');
  for (const forbiddenUse of capability.forbiddenUses) {
    lines.push(`- ${forbiddenUse}`);
  }
  return lines.join('\n');
}

function renderPluginContractList(contracts: ToolPluginContract[]): string {
  const lines = ['SDD plugin loading contracts'];
  for (const contract of contracts) {
    lines.push(`- ${contract.id} capability=${contract.capabilityId} entry=${contract.entryKind} load_mode=${contract.loadMode}`);
  }
  return lines.join('\n');
}

function renderPluginContractInspect(contract: ToolPluginContract): string {
  const lines = [`Plugin contract ${contract.id}`];
  lines.push(`title=${contract.title}`);
  lines.push(`version=${contract.version} capability=${contract.capabilityId}`);
  lines.push(`entry=${contract.entryKind} load_mode=${contract.loadMode}`);
  lines.push(`asset_path=${contract.assetPath}`);
  lines.push(`checksum=${contract.checksum ?? 'none'}`);
  lines.push('required_evidence');
  for (const evidence of contract.requiredEvidence) {
    lines.push(`- ${evidence}`);
  }
  lines.push('forbidden_uses');
  for (const forbiddenUse of contract.forbiddenUses) {
    lines.push(`- ${forbiddenUse}`);
  }
  return lines.join('\n');
}

function renderDelegationQueueList(items: DelegationQueueItem[]): string {
  const lines = ['SDD delegation queue items'];
  for (const item of items) {
    lines.push(`- ${item.id} task=${item.taskId} agent=${item.agent} status=${item.status} capability=${item.requestedCapabilityId}`);
  }
  return lines.join('\n');
}

function renderDelegationQueueInspect(item: DelegationQueueItem): string {
  const lines = [`Queue item ${item.id}`];
  lines.push(`run=${item.runId} delegation=${item.delegationId}`);
  lines.push(`task=${item.taskId} agent=${item.agent} status=${item.status}`);
  lines.push(`capability=${item.requestedCapabilityId} source=${item.statusSource} run_mode=${item.runMode}`);
  lines.push(`dedupe_key=${item.dedupeKey}`);
  lines.push(`expected_artifact=${item.expectedArtifact}`);
  lines.push('required_evidence');
  for (const evidence of item.requiredEvidence) {
    lines.push(`- ${evidence}`);
  }
  return lines.join('\n');
}

function renderDelegationStateMachineInspect(machine: DelegationStateMachine): string {
  const lines = [`Delegation state machine ${machine.version}`];
  lines.push(`statuses=${machine.statuses.join(',')}`);
  lines.push(`terminal_statuses=${machine.terminalStatuses.join(',')}`);
  lines.push('transitions');
  for (const transition of machine.transitions) {
    lines.push(`- ${transition.from} -> ${transition.to} event=${transition.event} terminal=${transition.terminal}`);
  }
  return lines.join('\n');
}

function renderWorkerAdapterList(adapters: WorkerAdapterContract[]): string {
  const lines = ['SDD worker adapter contracts'];
  for (const adapter of adapters) {
    lines.push(`- ${adapter.id} kind=${adapter.kind} capability=${adapter.capabilityId} plugin=${adapter.pluginContractId} side_effect=${adapter.sideEffect}`);
  }
  return lines.join('\n');
}

function renderWorkerAdapterInspect(adapter: WorkerAdapterContract): string {
  const lines = [`Worker adapter ${adapter.id}`];
  lines.push(`title=${adapter.title}`);
  lines.push(`version=${adapter.version} kind=${adapter.kind}`);
  lines.push(`capability=${adapter.capabilityId} plugin=${adapter.pluginContractId} side_effect=${adapter.sideEffect}`);
  lines.push(`state_machine=${adapter.input.stateMachineVersion}`);
  lines.push(`artifact_reference=${adapter.output.artifactReference}`);
  lines.push(`terminal_status=${adapter.output.terminalStatus.join(',')}`);
  lines.push(`exit_statuses=${adapter.output.exitStatuses.join(',')}`);
  lines.push(`permission_prompt=${adapter.permissionPrompt}`);
  lines.push('required_events');
  for (const event of adapter.output.requiredEvents) {
    lines.push(`- ${event}`);
  }
  lines.push('required_evidence');
  for (const evidence of adapter.requiredEvidence) {
    lines.push(`- ${evidence}`);
  }
  lines.push('forbidden_uses');
  for (const forbiddenUse of adapter.forbiddenUses) {
    lines.push(`- ${forbiddenUse}`);
  }
  return lines.join('\n');
}

function renderArtifactIngestionResult(result: ArtifactResultIngestionResult): string {
  const lines = [`Artifact ingestion ${result.record.status}: ${result.record.artifactPath}`];
  lines.push(`delegation=${result.record.delegationId} duplicate=${result.duplicate} result=${result.record.resultStatus ?? 'n/a'} terminal=${result.record.delegationStatus ?? 'n/a'}`);
  if (result.record.issues.length > 0) {
    lines.push('issues');
    for (const issue of result.record.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  if (result.record.gaps.length > 0) {
    lines.push('gaps');
    for (const gap of result.record.gaps) {
      lines.push(`- [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message}`);
    }
  }
  return lines.join('\n');
}

function renderArtifactIngestionInspection(inspection: ArtifactResultIngestionInspection): string {
  const lines = [`Artifact ingestions ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`records=${inspection.records.length}`);
  for (const record of inspection.records) {
    lines.push(`- ${record.delegationId} ${record.status} artifact=${record.artifactPath} result=${record.resultStatus ?? 'n/a'} delegation=${record.delegationStatus ?? 'n/a'}`);
  }
  if (inspection.issues.length > 0) {
    lines.push('issues');
    for (const issue of inspection.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  return lines.join('\n');
}

function renderBackgroundExecutorResult(result: BackgroundExecutorResult): string {
  const lines = [`Background executor ${result.status} for ${result.taskId}`];
  lines.push(`version=${result.version}`);
  lines.push(`run=${result.runId} delegation=${result.delegationId ?? 'n/a'} queue=${result.queueItemId ?? 'n/a'} worker=${result.workerAdapterId}`);
  lines.push(`artifact=${result.artifactPath ?? 'pending'}`);
  lines.push(result.message);
  if (result.issues.length > 0) {
    lines.push('issues');
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  return lines.join('\n');
}

function renderBackgroundExecutorInspection(inspection: BackgroundExecutorInspection): string {
  const lines = [`Background executor ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`delegations=${inspection.delegations.length} running=${inspection.runningDelegations} terminal=${inspection.terminalDelegations} ingestions=${inspection.artifactIngestions.length}`);
  for (const delegation of inspection.delegations) {
    lines.push(`- ${delegation.delegationId} ${delegation.status} task=${delegation.taskId} agent=${delegation.agent} artifact=${delegation.expectedArtifact}`);
  }
  if (inspection.issues.length > 0) {
    lines.push('issues');
    for (const issue of inspection.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  return lines.join('\n');
}

function renderWaveExecutorResult(result: WaveExecutorResult): string {
  const lines = [`Wave executor ${result.status} for ${result.branch}`];
  lines.push(`version=${result.version}`);
  lines.push(`run=${result.runId} strategy=${result.strategy} waves=${result.executedWaves}/${result.plannedWaves} tasks=${result.taskResults.length}`);
  lines.push(result.message);
  for (const task of result.taskResults) {
    lines.push(`- wave ${task.waveIndex} ${task.taskId}: ${task.result.status} delegation=${task.result.delegationId ?? 'n/a'} artifact=${task.result.artifactPath ?? 'pending'}`);
  }
  if (result.manualGates.length > 0) {
    lines.push('manual_gates');
    for (const gate of result.manualGates) {
      lines.push(`- ${gate.taskId}: ${gate.reasons.join(' | ')}`);
    }
  }
  if (result.blockedTasks.length > 0) {
    lines.push('blocked_tasks');
    for (const gate of result.blockedTasks) {
      lines.push(`- ${gate.taskId}: ${gate.reasons.join(' | ')}`);
    }
  }
  if (result.issues.length > 0) {
    lines.push('issues');
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  return lines.join('\n');
}

function renderWaveExecutorInspection(inspection: WaveExecutorInspection): string {
  const lines = [`Wave executor ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`events=${inspection.waveEvents.length} delegations=${inspection.background.delegations.length} terminal=${inspection.background.terminalDelegations}`);
  for (const event of inspection.waveEvents) {
    lines.push(`- ${event.event}: ${event.summary ?? ''}`);
  }
  if (inspection.issues.length > 0) {
    lines.push('issues');
    for (const issue of inspection.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  return lines.join('\n');
}

function renderWorktreeIsolationDecision(decision: WorktreeIsolationDecision): string {
  const lines = [`Worktree isolation ${decision.mode} for ${decision.taskId}`];
  lines.push(`version=${decision.version}`);
  lines.push(`safe_concurrency=${decision.safeConcurrency} capability=${decision.capabilityId} side_effect=${decision.capabilitySideEffect}`);
  lines.push(`affected_files=${decision.affectedFiles.length > 0 ? decision.affectedFiles.join(',') : 'none'}`);
  lines.push(`risk=${decision.risk.length > 0 ? decision.risk.join(',') : 'none'}`);
  if (decision.overlaps.length > 0) {
    lines.push('overlaps');
    for (const overlap of decision.overlaps) {
      lines.push(`- ${overlap.peerTaskId}: ${overlap.files.join(',')}`);
    }
  }
  lines.push('gates');
  for (const gate of decision.gates) {
    lines.push(`- ${gate.name} ${gate.passed ? 'PASS' : 'FAIL'}: ${gate.message}`);
  }
  lines.push('reasons');
  for (const reason of decision.reasons) {
    lines.push(`- ${reason}`);
  }
  return lines.join('\n');
}

function renderWorktreeLifecycleRecord(title: string, record: WorktreeLifecycleRecord): string {
  return [
    `${title}: ${record.worktreeId}`,
    `status=${record.status} task=${record.taskId} branch=${record.branchName}`,
    `path=${record.worktreePath} base=${record.baseRef} dirty=${record.dirty}`,
    `kept=${record.keepReason ?? 'n/a'} removed=${record.removedAt ?? 'n/a'}`
  ].join('\n');
}

function renderWorktreeLifecycleInspection(inspection: WorktreeLifecycleInspection): string {
  const lines = [`Worktree lifecycle ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`records=${inspection.records.length}`);
  for (const record of inspection.records) {
    lines.push(`- ${record.worktreeId} ${record.status} task=${record.taskId} path=${record.worktreePath} dirty=${record.dirty}`);
  }
  if (inspection.issues.length > 0) {
    lines.push('issues');
    for (const issue of inspection.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  return lines.join('\n');
}

function renderTaskGraphPlan(graph: TaskGraphPlan): string {
  const lines = [`Task graph ${graph.valid ? 'valid' : 'blocked'} for ${graph.branch}`];
  lines.push(`version=${graph.version}`);
  lines.push(`tasks=${graph.summary.tasks} dependencies=${graph.summary.dependencies} file_overlaps=${graph.summary.fileOverlaps}`);
  lines.push(`high_risk_tasks=${graph.summary.highRiskTasks.length > 0 ? graph.summary.highRiskTasks.join(',') : 'none'}`);
  lines.push(`validation=${graph.summary.validationCommands.length > 0 ? graph.summary.validationCommands.join(' | ') : 'none'}`);
  lines.push('nodes');
  for (const node of graph.nodes) {
    lines.push(`- ${node.taskId} status=${node.status} wave=${node.wave ?? 'n/a'} deps=${node.dependsOn.join(',') || 'none'} files=${node.affectedFiles.length}`);
  }
  if (graph.dependencyEdges.length > 0) {
    lines.push('dependency_edges');
    for (const edge of graph.dependencyEdges) {
      lines.push(`- ${edge.from} -> ${edge.to}`);
    }
  }
  if (graph.fileOverlapEdges.length > 0) {
    lines.push('file_overlap_edges');
    for (const edge of graph.fileOverlapEdges) {
      lines.push(`- ${edge.from} <-> ${edge.to}: ${edge.files.join(',')}`);
    }
  }
  if (graph.diagnostics.length > 0) {
    lines.push('diagnostics');
    for (const diagnostic of graph.diagnostics) {
      lines.push(`- [${diagnostic.severity}] ${diagnostic.taskId ?? 'document'} ${diagnostic.field}: ${diagnostic.message}`);
      lines.push(`  recommendation: ${diagnostic.recommendation}`);
    }
  }
  return lines.join('\n');
}

function renderWavePlan(plan: WavePlan): string {
  const lines = [`Wave plan ${plan.valid ? 'valid' : 'blocked'} for ${plan.branch}`];
  lines.push(`version=${plan.version}`);
  lines.push(`tasks=${plan.summary.tasks} waves=${plan.summary.waves} planned=${plan.summary.plannedTasks} manual=${plan.summary.manualTasks} blocked=${plan.summary.blockedTasks}`);
  if (plan.waves.length > 0) {
    lines.push('waves');
    for (const wave of plan.waves) {
      const tasks = wave.tasks.map((task) => `${task.taskId}(${task.isolationMode})`).join(', ');
      lines.push(`- wave ${wave.index}: ${tasks}`);
    }
  }
  if (plan.manualGates.length > 0) {
    lines.push('manual_gates');
    for (const gate of plan.manualGates) {
      lines.push(`- ${gate.taskId}: ${gate.reasons.join(' | ')}`);
    }
  }
  if (plan.blockedTasks.length > 0) {
    lines.push('blocked_tasks');
    for (const gate of plan.blockedTasks) {
      lines.push(`- ${gate.taskId}: ${gate.reasons.join(' | ')}`);
    }
  }
  if (plan.diagnostics.length > 0) {
    lines.push('diagnostics');
    for (const diagnostic of plan.diagnostics) {
      lines.push(`- [${diagnostic.severity}] ${diagnostic.taskId ?? 'document'} ${diagnostic.field}: ${diagnostic.message}`);
      lines.push(`  recommendation: ${diagnostic.recommendation}`);
    }
  }
  return lines.join('\n');
}

function readOption(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index < 0) {
    return null;
  }
  return args[index + 1] ?? null;
}

function readWaveExecutorStrategy(args: string[], name: string): WaveExecutorStrategy | null {
  const value = readOption(args, name) ?? 'fast-stop';
  return value === 'fast-stop' || value === 'safe-continue' ? value : null;
}

function readRunStatus(args: string[], name: string): RunStatus | null {
  const value = readOption(args, name);
  return value === 'created' || value === 'running' || value === 'completed' || value === 'blocked' || value === 'failed' || value === 'archived' ? value : null;
}

function readGovernancePolicyOperation(value: string | undefined): GovernancePolicyOperation | null {
  return value === 'background_executor' || value === 'wave_executor' || value === 'sync_back_apply' || value === 'destructive_git' || value === 'external_interaction' || value === 'cleanup' ? value : null;
}

function readRepeatedOption(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) {
      values.push(args[index + 1]);
    }
  }
  return values;
}

function readTaskArtifactOptions(args: string[]): Record<string, string> {
  const artifacts: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== '--artifact') {
      continue;
    }
    const value = args[index + 1];
    const separator = value?.indexOf(':') ?? -1;
    if (!value || separator <= 0) {
      continue;
    }
    artifacts[value.slice(0, separator)] = value.slice(separator + 1);
  }
  return artifacts;
}

function readSddResultStatus(args: string[], name: string): SddResultStatus | null {
  const value = readOption(args, name);
  return value === 'PASS' || value === 'PASS_WITH_GAPS' || value === 'FAIL' || value === 'BLOCKED' || value === 'TIMED_OUT' || value === 'CANCELLED' ? value : null;
}

function renderArtifactValidationReport(artifactPath: string, report: Awaited<ReturnType<typeof validateSddResultArtifact>>, expectedTask?: string, expectedAgent?: string): string {
  if (report.valid) {
    return `Artifact valid: ${artifactPath}`;
  }
  const lines = [`Artifact invalid: ${artifactPath}`];
  for (const issue of report.issues) {
    lines.push(`- ${issue.field}: ${issue.message}`);
    lines.push(`  recommendation: ${issue.recommendation}`);
  }
  if (expectedTask && expectedAgent) {
    lines.push(`next sdd artifact template ${artifactPath} --task ${expectedTask} --agent ${expectedAgent}`);
  }
  return lines.join('\n');
}

function readAiToolSelection(args: string[], allowNone: boolean): AiToolSelection {
  const value = readOption(args, '--ai') ?? 'auto';
  if (value === 'auto' || value === 'claude-code' || (allowNone && value === 'none')) {
    return value;
  }
  throw new Error(`Unsupported --ai value: ${value}`);
}

function readLifecycleSignalOptions(args: string[]) {
  const directSafe = args.includes('--direct-safe');
  const riskTags = readRepeatedOptions(args, '--risk');
  const contracts = readRepeatedOptions(args, '--contract');
  const permissions = readRepeatedOptions(args, '--permission');
  return {
    intent_clarity: directSafe ? 'high' as const : readSignalClarity(args, '--intent') ?? 'medium' as const,
    acceptance_clarity: directSafe ? 'high' as const : readSignalClarity(args, '--acceptance') ?? 'medium' as const,
    estimated_change_size: directSafe ? 'tiny' as const : readEstimatedChangeSize(args, '--size') ?? 'small' as const,
    task_count_estimate: Number(readOption(args, '--tasks') ?? (directSafe ? '1' : '1')),
    file_count_estimate: Number(readOption(args, '--files') ?? (directSafe ? '1' : '1')),
    affected_layers: readRepeatedOptions(args, '--layer'),
    affected_contracts: contracts,
    dependency_fanout: readDependencyFanout(args, '--fanout') ?? 'local' as const,
    impact_confidence: directSafe ? 'high' as const : readImpactConfidence(args, '--impact-confidence') ?? 'medium' as const,
    risk_tags: riskTags,
    reversibility: directSafe ? 'reversible' as const : readReversibility(args, '--reversibility') ?? 'unknown' as const,
    validation_clarity: directSafe ? 'clear' as const : readValidationClarity(args, '--validation') ?? 'partial' as const,
    validation_available: directSafe || args.includes('--validation-available'),
    validation_cost: directSafe ? 'cheap' as const : readValidationCost(args, '--validation-cost') ?? 'unknown' as const,
    policy_hits: readRepeatedOptions(args, '--policy'),
    permission_required: permissions,
    requires_agents: args.includes('--requires-agents'),
    handoff_count: Number(readOption(args, '--handoffs') ?? '0'),
    artifact_dependency: args.includes('--artifact-dependency'),
    runtime_recovery_need: args.includes('--runtime-recovery'),
    orchestration_uncertainty: directSafe ? 'low' as const : readOrchestrationUncertainty(args, '--orchestration') ?? 'medium' as const,
    human_checkpoint_required: args.includes('--checkpoint'),
    approval_reason: readRepeatedOptions(args, '--approval-reason'),
    source_artifacts: readRepeatedOptions(args, '--source-artifact'),
    can_scout_impact: !args.includes('--cannot-scout-impact'),
    architecture_decision_required: args.includes('--architecture'),
    external_unknown: args.includes('--external-unknown')
  };
}

function readRepeatedOptions(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) {
      values.push(args[index + 1]);
      index += 1;
    }
  }
  return values;
}

function readSignalClarity(args: string[], name: string): 'high' | 'medium' | 'low' | null {
  const value = readOption(args, name);
  return value === 'high' || value === 'medium' || value === 'low' ? value : null;
}

function readEstimatedChangeSize(args: string[], name: string): 'tiny' | 'small' | 'medium' | 'large' | null {
  const value = readOption(args, name);
  return value === 'tiny' || value === 'small' || value === 'medium' || value === 'large' ? value : null;
}

function readImpactConfidence(args: string[], name: string): 'high' | 'medium' | 'low' | null {
  return readSignalClarity(args, name);
}

function readValidationClarity(args: string[], name: string): 'clear' | 'partial' | 'unclear' | null {
  const value = readOption(args, name);
  return value === 'clear' || value === 'partial' || value === 'unclear' ? value : null;
}

function readValidationCost(args: string[], name: string): 'cheap' | 'moderate' | 'expensive' | 'unknown' | null {
  const value = readOption(args, name);
  return value === 'cheap' || value === 'moderate' || value === 'expensive' || value === 'unknown' ? value : null;
}

function readDependencyFanout(args: string[], name: string): 'none' | 'local' | 'multi_component' | 'unknown' | null {
  const value = readOption(args, name);
  return value === 'none' || value === 'local' || value === 'multi_component' || value === 'unknown' ? value : null;
}

function readReversibility(args: string[], name: string): 'reversible' | 'irreversible' | 'unknown' | null {
  const value = readOption(args, name);
  return value === 'reversible' || value === 'irreversible' || value === 'unknown' ? value : null;
}

function readOrchestrationUncertainty(args: string[], name: string): 'low' | 'medium' | 'high' | null {
  const value = readOption(args, name);
  return value === 'low' || value === 'medium' || value === 'high' ? value : null;
}

function taskFormatText(): string {
  return `# Canonical sdd-task format

\`\`\`sdd-task
id: T1
status: pending
wave: 1
depends_on: []
affected_files:
  - path/to/file
validation:
  - command string
risk: []
\`\`\`

Companion sections such as #### Boundary, #### Acceptance, and #### Implementation Notes must stay outside the fenced sdd-task metadata block. Keep only metadata inside the fence.

#### Boundary

Allowed implementation scope. Explicitly list forbidden scope when relevant.

#### Acceptance

- Verifiable acceptance item.

#### Implementation Notes

Reserved for approved sync-back notes and artifact links.
`;
}

main(process.argv.slice(2))
  .then((result) => {
    if (result.output) {
      console.log(result.output);
    }
    if (result.error) {
      console.error(result.error);
    }
    process.exitCode = result.exitCode;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
