#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import {
  writeArtifact,
  archiveRun,
  applyAiToolEntries,
  applySyncBack,
  createWorktreeLifecycle,
  createRun,
  doctor,
  evaluateLifecycleDecisionGate,
  extractLifecycleRiskSignalsFromText,
  evaluateGovernancePolicy,
  getProjectStatus,
  getDelegationStateMachine,
  getSddInstructions,
  initProject,
  inspectRun,
  claimResidentWorkerRuntime,
  heartbeatResidentWorkerRuntime,
  inspectSddTask,
  inspectToolPluginContract,
  inspectToolCapability,
  inspectDelegationQueueItem,
  inspectSyncBack,
  inspectTaskGraph,
  inspectWavePlan,
  inspectWaveExecutor,
  inspectBackgroundExecutor,
  inspectResidentWorkerRuntime,
  inspectArtifactResultIngestions,
  inspectWorktreeLifecycle,
  inspectWorkerAdapterContract,
  inspectWorktreeIsolation,
  inspectGovernancePolicy,
  inspectWorkflowGate,
  inspectAgentRegistryEntry,
  inspectQueryStatusContract,
  inspectSkillAgentEvalContract,
  inspectHarnessLearningContract,
  inspectProjectContextPackContract,
  inspectAgentSkillTeamRuntime,
  inspectSkillCapability,
  inspectCapabilitySource,
  inspectExternalAgentPackImport,
  inspectTeamModePolicy,
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
  listResidentWorkerRuntimes,
  listWorkflowGates,
  listAgentRegistry,
  listSkillCapabilities,
  listCapabilitySources,
  ingestArtifactResult,
  parseSddBranch,
  readRunState,
  resolveSddContext,
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
  validateWorkflowGates,
  validateAgentRegistry,
  validateQueryStatusContract,
  validateSkillAgentEvalContract,
  validateHarnessLearningContract,
  validateProjectContextPackContract,
  routeSddTask,
  validateAgentSkillTeamRuntime,
  toArtifactRootRelativePath,
  type SddResultStatus,
  type AiToolSelection,
  type ContextBranchSource,
  type ProjectStatus,
  type LifecycleDecisionSignals,
  type LifecycleRiskGateExtraction,
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
  type WorkflowGateContract,
  type WorkflowGateValidation,
  type AgentRegistryEntry,
  type AgentRegistryValidation,
  type QueryStatusContract,
  type QueryStatusValidation,
  type SkillAgentEvalContract,
  type SkillAgentEvalValidation,
  type HarnessLearningContract,
  type HarnessLearningValidation,
  type ProjectContextPackContract,
  type ProjectContextPackValidation,
  type AgentRouterDecision,
  type AgentSkillTeamRuntimeInspection,
  type AgentSkillTeamRuntimeValidation,
  type CapabilitySourceCatalogEntry,
  type ExternalAgentPackImportInspection,
  type RuntimeRegistryEntrySource,
  type SkillCapabilityContract,
  type TeamModePolicy,
  type TeamModeActivation,
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
  type ResidentWorkerRuntimeClaimResult,
  type ResidentWorkerRuntimeHeartbeatResult,
  type ResidentWorkerRuntimeInspection,
  type ResidentWorkerRuntimeList,
  type InitProjectResult
} from '../../core/src/index.js';
import { readOption, readPositiveIntegerOption, readRepeatedOption, readRepeatedOptions } from './options.js';

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

  if (command === 'help') {
    return {
      exitCode: 0,
      output: helpText(subcommand)
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
    const branch = readOption(initArgs, '--branch') ?? undefined;
    const scaffoldDocuments = initArgs.includes('--no-scaffold-docs') ? false : initArgs.includes('--scaffold-docs') || branch !== undefined;
    const result = await initProject(projectRoot, { force, aiTool, branch, scaffoldDocuments });
    const json = wantsJson(initArgs);
    return {
      exitCode: 0,
      output: json ? jsonOutput({ command: 'init', ...result }, initArgs) : renderInitResult(result)
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
    return {
      exitCode: 0,
      output: renderTextOrJson(instructionArgs, payload, renderSddInstructions)
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
    const json = wantsJson(doctorArgs);
    return {
      exitCode: report.status === 'FAIL' ? 1 : 0,
      output: json ? jsonOutput(report, doctorArgs) : renderDoctorReport(report)
    };
  }

  if (command === 'status') {
    const statusArgs = [subcommand, ...rest].filter(Boolean);
    const result = await getProjectStatus(projectRoot, readBranchContext(statusArgs));
    const json = wantsJson(statusArgs);
    return {
      exitCode: result.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
      output: json ? jsonOutput(result, statusArgs) : renderProjectStatus(result)
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
    const json = wantsJson(rest);
    if (action === 'rebuild') {
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

  if (command === 'run' && subcommand === 'inspect') {
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

  if (command === 'sync-back' && subcommand === 'apply') {
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

  if (command === 'tasks' && subcommand === 'format') {
    return {
      exitCode: 0,
      output: taskFormatText()
    };
  }

  if (command === 'tasks' && subcommand === 'list') {
    const model = await parseSddBranch(projectRoot, await readResolvedBranch(projectRoot, rest));
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

  if (command === 'tasks' && subcommand === 'route') {
    const taskId = rest.find((item) => !item.startsWith('--'));
    if (!taskId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd tasks route <task_id> [--branch <branch>] [--team-mode [auto|force|off]] [--no-team-mode] [--json]'
      };
    }
    const decision = await routeSddTask(projectRoot, {
      taskId,
      branch: readBranchOption(rest),
      teamModeActivation: readTeamModeActivation(rest)
    });
    return {
      exitCode: decision.blockedReason ? 1 : 0,
      output: wantsJson(rest) ? jsonOutput(decision, rest) : renderAgentRouterDecision(decision)
    };
  }

  if (command === 'tasks' && subcommand === 'gaps') {
    const model = await parseSddBranch(projectRoot, await readResolvedBranch(projectRoot, rest));
    return {
      exitCode: model.gaps.some((gap) => gap.severity === 'blocking') ? 1 : 0,
      output: renderTaskGapReport(model)
    };
  }

  if (command === 'lifecycle' && subcommand === 'decide') {
    const lifecycleInput = await readLifecycleSignalOptions(rest);
    if (lifecycleInput.error) {
      return {
        exitCode: 2,
        error: lifecycleInput.error
      };
    }
    const result = evaluateLifecycleDecisionGate(lifecycleInput.signals);
    const runId = readOption(rest, '--run');
    if (runId) {
      await recordLifecycleDecision(projectRoot, runId, result.record);
    }
    const json = rest.includes('--json');
    return {
      exitCode: 0,
      output: json
        ? JSON.stringify({ riskExtraction: lifecycleInput.riskExtraction, ...result, recordedRunId: runId ?? null }, null, 2)
        : `${renderLifecycleRiskExtraction(lifecycleInput.riskExtraction)}${renderLifecycleDecisionGate(result)}${runId ? `\nrecorded_run=${runId}` : ''}`
    };
  }

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

  if (command === 'workflow' && subcommand === 'list') {
    const registry = await listWorkflowGates(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderWorkflowGateList(registry.workflows)
    };
  }

  if (command === 'workflow' && subcommand === 'inspect') {
    const workflowId = rest.find((item) => !item.startsWith('--'));
    if (!workflowId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd workflow inspect <workflow_id> [--json]'
      };
    }
    const workflow = await inspectWorkflowGate(projectRoot, workflowId);
    if (!workflow) {
      return {
        exitCode: 1,
        error: `Unknown workflow: ${workflowId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(workflow, null, 2) : renderWorkflowGateInspect(workflow)
    };
  }

  if (command === 'workflow' && subcommand === 'validate') {
    const result = await validateWorkflowGates(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderWorkflowGateValidation(result)
    };
  }

  if (command === 'agents' && subcommand === 'list') {
    const registry = await listAgentRegistry(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderAgentRegistryList(registry.agents)
    };
  }

  if (command === 'agents' && subcommand === 'inspect') {
    const agentId = rest.find((item) => !item.startsWith('--'));
    if (!agentId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd agents inspect <agent_id> [--json]'
      };
    }
    const agent = await inspectAgentRegistryEntry(projectRoot, agentId);
    if (!agent) {
      return {
        exitCode: 1,
        error: `Unknown agent: ${agentId}`
      };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(agent, null, 2) : renderAgentRegistryInspect(agent)
    };
  }

  if (command === 'agents' && subcommand === 'validate') {
    const result = await validateAgentRegistry(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderAgentRegistryValidation(result)
    };
  }

  if (command === 'agent-runtime' && subcommand === 'inspect') {
    const inspection = await inspectAgentSkillTeamRuntime(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(inspection, null, 2) : renderAgentSkillTeamRuntimeInspection(inspection)
    };
  }

  if (command === 'agent-runtime' && subcommand === 'validate') {
    const result = await validateAgentSkillTeamRuntime(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderAgentSkillTeamRuntimeValidation(result)
    };
  }

  if (command === 'skill-capabilities' && subcommand === 'list') {
    const registry = await listSkillCapabilities(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderSkillCapabilityList(registry.capabilities, registry.registrySources)
    };
  }

  if (command === 'skill-capabilities' && subcommand === 'inspect') {
    const capabilityId = rest.find((item) => !item.startsWith('--'));
    if (!capabilityId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd skill-capabilities inspect <capability_id> [--json]'
      };
    }
    const capability = await inspectSkillCapability(projectRoot, capabilityId);
    if (!capability) {
      return { exitCode: 1, error: `Unknown skill capability: ${capabilityId}` };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(capability, null, 2) : renderSkillCapabilityInspect(capability)
    };
  }

  if (command === 'capability-sources' && subcommand === 'list') {
    const catalog = await listCapabilitySources(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(catalog, null, 2) : renderCapabilitySourceList(catalog.sources, catalog.registrySources)
    };
  }

  if (command === 'capability-sources' && subcommand === 'inspect') {
    const sourceId = rest.find((item) => !item.startsWith('--'));
    if (!sourceId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd capability-sources inspect <source_id> [--json]'
      };
    }
    const source = await inspectCapabilitySource(projectRoot, sourceId);
    if (!source) {
      return { exitCode: 1, error: `Unknown capability source: ${sourceId}` };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(source, null, 2) : renderCapabilitySourceInspect(source)
    };
  }

  if (command === 'external-packs' && subcommand === 'inspect') {
    const sourceId = rest.find((item) => !item.startsWith('--'));
    if (!sourceId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd external-packs inspect <source_id> [--json]'
      };
    }
    const inspection = await inspectExternalAgentPackImport(projectRoot, sourceId);
    return {
      exitCode: inspection.status === 'denied' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(inspection, null, 2) : renderExternalAgentPackImportInspection(inspection)
    };
  }

  if (command === 'team-mode' && subcommand === 'inspect') {
    const policy = await inspectTeamModePolicy(projectRoot, {
      taskId: readOption(rest, '--task') ?? undefined,
      branch: readBranchOption(rest),
      teamModeActivation: readTeamModeActivation(rest, rest.includes('--enabled') ? 'force' : undefined)
    });
    return {
      exitCode: policy.decision === 'blocked' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(policy, null, 2) : renderTeamModePolicy(policy)
    };
  }

  if (command === 'query-status' && subcommand === 'inspect') {
    const contract = await inspectQueryStatusContract(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderQueryStatusContract(contract)
    };
  }

  if (command === 'query-status' && subcommand === 'validate') {
    const result = await validateQueryStatusContract(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderQueryStatusValidation(result)
    };
  }

  if (command === 'eval' && subcommand === 'inspect') {
    const contract = await inspectSkillAgentEvalContract(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderSkillAgentEvalContract(contract)
    };
  }

  if (command === 'eval' && subcommand === 'validate') {
    const result = await validateSkillAgentEvalContract(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderSkillAgentEvalValidation(result)
    };
  }

  if (command === 'learning' && subcommand === 'inspect') {
    const contract = await inspectHarnessLearningContract(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderHarnessLearningContract(contract)
    };
  }

  if (command === 'learning' && subcommand === 'validate') {
    const result = await validateHarnessLearningContract(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderHarnessLearningValidation(result)
    };
  }

  if (command === 'context-pack' && subcommand === 'inspect') {
    const contract = await inspectProjectContextPackContract(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(contract, null, 2) : renderProjectContextPackContract(contract)
    };
  }

  if (command === 'context-pack' && subcommand === 'validate') {
    const result = await validateProjectContextPackContract(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderProjectContextPackValidation(result)
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
        error: 'Usage: sdd artifact template <artifacts/path.md> --task <task_id> --agent <agent> [--run <run_id> --write] [--branch <branch>] [--status <status>]'
      };
    }
    const template = await renderSddResultArtifactTemplate(projectRoot, {
      artifactPath,
      taskId,
      agent,
      branch: readBranchOption(rest),
      status: readSddResultStatus(rest, '--status') ?? 'PASS'
    });
    const runId = readOption(rest, '--run');
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

  if (command === 'artifact' && subcommand === 'validate') {
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

function helpText(topic?: string): string {
  if (topic === 'advanced') {
    return advancedHelpText();
  }
  if (topic === 'workflow') {
    return workflowHelpText();
  }
  return `sdd Phase 2 platform CLI

Common workflow:
  sdd init [--force] [--ai <mode>] [--scaffold-docs] [--json]
  sdd status [--branch <branch>] [--json|--compact-json]
  sdd tasks inspect <task_id> [--branch <branch>] [--json|--compact-json]
  sdd tasks route <task_id> [--branch <branch>] [--json|--compact-json]
  sdd do task <task_id> [options]
  sdd verify task <task_id> [--branch <branch>] [--run <run_id>] [--json|--compact-json]
  sdd sync-back inspect [<run_id>] [--task <task_id>] [--branch <branch>] [--json|--compact-json]
  sdd sync-back apply [<run_id>] [--task <task_id>] [--branch <branch>] [--approved] [--json|--compact-json]
  sdd doctor [--latest-only] [--all-runs] [--json|--compact-json]

Evidence helpers:
  sdd run create
  sdd run list [--json]
  sdd run inspect <run_id> [--json|--compact-json]
  sdd run index rebuild|inspect|query [options] [--json|--compact-json]
  sdd artifact template <path> --task <task_id> --agent <agent> [--run <run_id> --write]
  sdd artifact validate <run_id> <path> [--task <task_id>] [--agent <agent>] [--json|--compact-json]

Generated AI entries:
  sdd update [--check] [--ai <mode>]
  sdd instructions [action] [--json|--compact-json]

More help:
  sdd help workflow     Show core workflow options.
  sdd help advanced     Show platform/agent/runtime commands.

Notes:
  /sdd:spec owns workflow partition docs after project init.
  init --branch is legacy starter-doc scaffolding; prefer sdd status --branch or /sdd:spec --branch for workflow partitions.
`;
}

function workflowHelpText(): string {
  return `sdd workflow help

Core path:
  1. sdd status [--branch <branch>]
  2. sdd tasks inspect <task_id> [--branch <branch>]
  3. sdd tasks route <task_id> [--branch <branch>]
  4. sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent> --run <run_id> --write
  5. sdd do task <task_id> --run <run_id> --implement-artifact <path> --review-artifact <path> --validation-artifact <path>
  6. sdd verify task <task_id> [--branch <branch>]
  7. sdd sync-back inspect --task <task_id> [--branch <branch>]
  8. sdd sync-back apply --task <task_id> [--branch <branch>]

JSON:
  --json prints readable JSON; --compact-json prints one-line JSON for logs and scripts.
`;
}

function advancedHelpText(): string {
  return `sdd advanced help

Runtime/catalog:
  sdd agent-runtime inspect|validate [--json]
  sdd skill-capabilities list|inspect [--json]
  sdd capability-sources list|inspect [--json]
  sdd external-packs inspect <source_id> [--json]
  sdd team-mode inspect [--task <id>] [--team-mode [auto|force|off]] [--no-team-mode] [--json]

Harness/platform:
  sdd workflow list|inspect|validate [--json]
  sdd agents list|inspect|validate [--json]
  sdd query-status inspect|validate [--json]
  sdd eval inspect|validate [--json]
  sdd learning inspect|validate [--json]
  sdd context-pack inspect|validate [--json]
  sdd capabilities list|inspect [--json]
  sdd governance inspect|evaluate [options]
  sdd plugins list|inspect [--json]
  sdd queue list|inspect [options]
  sdd state-machine inspect [--json]
  sdd workers list|inspect [--json]

Execution/isolation:
  sdd background run|inspect [options]
  sdd worker-runtime claim|heartbeat|status|inspect [options]
  sdd isolation inspect <task_id> [options]
  sdd graph inspect [--branch <branch>] [--json]
  sdd wave inspect|run|executor [options]
  sdd worktree create|inspect|keep|remove [options]

Legacy init partition option:
  sdd init --branch <branch> creates starter docs for that branch, but normal workflow partitioning belongs to /sdd:spec and sdd status --branch.
`;
}

function wantsJson(args: string[]): boolean {
  return args.includes('--json') || args.includes('--compact-json');
}

function jsonOutput(value: unknown, args: string[]): string {
  return JSON.stringify(value, null, args.includes('--compact-json') ? 0 : 2);
}

function renderTextOrJson<T>(args: string[], value: T, renderText: (value: T) => string): string {
  return wantsJson(args) ? jsonOutput(value, args) : renderText(value);
}

function renderInitResult(result: InitProjectResult): string {
  const aiEntries = result.aiTools.flatMap((tool) => tool.entries);
  const aiCounts = new Map<string, number>();
  for (const entry of aiEntries) {
    aiCounts.set(entry.status, (aiCounts.get(entry.status) ?? 0) + 1);
  }
  const aiSummary = Array.from(aiCounts.entries()).map(([status, count]) => `${status}=${count}`).join(' ') || 'none';
  const scaffoldedDocuments = result.documents.documents.filter((document) => document.status !== 'skipped');
  const lines = ['SDD init', 'changed'];
  lines.push(`- config ${result.created ? 'created/updated' : 'unchanged'} at ${result.configPath}`);
  lines.push(`- semantic docs ${scaffoldedDocuments.map((document) => `${document.status}:${document.relativePath}`).join(', ') || 'none'}`);
  lines.push(`- ai entries ${aiSummary}`);
  lines.push('decision');
  if (scaffoldedDocuments.length > 0) {
    lines.push(`- legacy_scaffold_branch=${result.documents.branch}`);
    lines.push(`- legacy_spec_dir=${result.documents.root}`);
  }
  lines.push('- sdd init is project-level setup; /sdd:spec is the workflow partition/spec entry');
  lines.push('evidence');
  for (const document of scaffoldedDocuments) {
    lines.push(`- [${document.status}] ${document.relativePath}: ${document.message}`);
  }
  if (aiEntries.length === 0) {
    lines.push('- ai entries skipped');
  } else {
    lines.push(`- ${aiEntries.length} managed AI entry projection(s) checked/applied`);
  }
  lines.push('- doctor checks git repository health; run git init first in fresh temporary projects before relying on doctor/run-index checks');
  lines.push('gaps');
  const driftEntries = aiEntries.filter((entry) => entry.status === 'drifted' || entry.status === 'user-modified' || entry.status === 'foreign' || entry.status === 'conflict');
  if (driftEntries.length === 0) {
    lines.push('- none');
  } else {
    for (const entry of driftEntries) {
      lines.push(`- [${entry.status}] ${entry.relativePath}: ${entry.action ?? entry.message}`);
    }
  }
  lines.push('next');
  lines.push('- /sdd:spec');
  return lines.join('\n');
}


function renderProjectStatus(status: ProjectStatus): string {
  const lines = [`SDD status for ${status.branch}`];
  const staleDocuments = [
    status.documents.planStale ? 'plan' : null,
    status.documents.tasksStale ? 'tasks' : null
  ].filter((item): item is string => item !== null);
  const hasDocumentHashes = Boolean(
    status.documents.specHash
    || status.documents.planHash
    || status.documents.tasksHash
    || status.documents.planBasedOnSpecHash
    || status.documents.tasksBasedOnPlanHash
  );
  lines.push('decision');
  lines.push(`- workflow_status=${status.workflowStatus}`);
  lines.push(`- context raw_branch=${status.context.rawBranch} partition=${status.context.partition} source=${status.context.branchSource} spec_dir=${status.context.specDir}`);
  lines.push(`- git current_branch=${status.context.currentGitBranch ?? 'none'} working_tree_matched=${status.context.workingTreeMatched ?? 'unknown'}`);
  lines.push(`- documents spec=${status.documents.specExists} plan=${status.documents.planExists} tasks=${status.documents.tasksExists} stale=${staleDocuments.join(',') || 'none'}`);
  if (hasDocumentHashes) {
    lines.push(`- document_hashes spec=${status.documents.specHash ?? 'none'} plan=${status.documents.planHash ?? 'none'} tasks=${status.documents.tasksHash ?? 'none'} plan_based_on_spec=${status.documents.planBasedOnSpecHash ?? 'none'} tasks_based_on_plan=${status.documents.tasksBasedOnPlanHash ?? 'none'}`);
  }
  lines.push(`- tasks total=${status.tasks.total} pending=${status.tasks.pending} in_progress=${status.tasks.inProgress} completed=${status.tasks.completed} blocked=${status.tasks.blocked} deferred=${status.tasks.deferred} unknown=${status.tasks.unknown} gaps=${status.tasks.gaps}`);
  if (status.latestRun) {
    lines.push(`- latest_run ${status.latestRun.runId} status=${status.latestRun.status} phase=${status.latestRun.phase ?? 'n/a'} task=${status.latestRun.currentTask ?? 'n/a'} validation=${status.latestRun.validationStatus} sync_back=${status.latestRun.syncBackStatus}`);
    if (status.latestRunEvidence) {
      lines.push(`- latest_run_evidence route_preflight=${status.latestRunEvidence.routePreflight} agent_executions=${status.latestRunEvidence.agentExecutions} team_sessions=${status.latestRunEvidence.teamSessions} worker_runtimes=${status.latestRunEvidence.workerRuntimes} stale_worker_runtimes=${status.latestRunEvidence.staleWorkerRuntimes} artifact_ingestions=${status.latestRunEvidence.artifactIngestions}`);
      if (status.latestRunEvidence.tasksChangedAfterRun && status.latestRun.syncBackStatus !== 'applied') {
        lines.push('- latest_run_evidence may be stale: tasks.md changed after the latest run; inspect the task or rerun before relying on this run.');
      } else if (status.latestRunEvidence.tasksChangedAfterRun) {
        lines.push('- latest_run_evidence tasks.md changed after sync-back apply; task completion state is already recorded.');
      }
    }
  } else {
    lines.push('- latest_run none');
  }
  lines.push('evidence');
  lines.push(`- branch documents loaded from ${status.context.specDir}`);
  lines.push(status.gitRoot
    ? `- git repository detected at ${status.gitRoot}; doctor and run-index checks can use Git repository context`
    : '- doctor and run-index checks expect Git repository context; run git init first in fresh temporary projects');
  renderDocumentGaps(lines, status.gaps);
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
  renderIssues(lines, inspection.issues);
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
  renderIssues(lines, decision.issues);
  return lines.join('\n');
}

function renderRunInspection(inspection: RunInspection): string {
  const lines = [`SDD run ${inspection.summary.runId}`];
  lines.push(`status=${inspection.summary.status} phase=${inspection.summary.phase ?? 'n/a'} task=${inspection.summary.currentTask ?? 'n/a'} updated=${inspection.summary.updatedAt}`);
  lines.push(`validation=${inspection.validation.status} evidence=${inspection.validation.evidence.join(',') || 'none'}`);
  lines.push(`sync_back=${inspection.syncBack.status} proposal=${inspection.syncBack.proposalPath ?? 'none'}`);
  lines.push(`task_run_evidence=${inspection.taskRunEvidence.version} gaps=${inspection.taskRunEvidence.gaps.length} sync_back=${inspection.taskRunEvidence.syncBackProposal ?? 'none'}`);
  lines.push(`artifacts=${inspection.artifacts.length}`);
  for (const artifact of inspection.artifacts) {
    lines.push(`- ${artifact.path} kind=${artifact.kind} task=${artifact.task ?? 'n/a'} agent=${artifact.agent ?? 'n/a'}`);
  }
  lines.push(`artifact_ingestions=${inspection.artifactIngestions.length}`);
  for (const ingestion of inspection.artifactIngestions) {
    lines.push(`- ${ingestion.delegationId} ${ingestion.status} artifact=${ingestion.artifactPath} result=${ingestion.resultStatus ?? 'n/a'} delegation=${ingestion.delegationStatus ?? 'n/a'}`);
  }
  lines.push(`agent_executions=${inspection.agentExecutions.length}`);
  for (const execution of inspection.agentExecutions) {
    lines.push(`- ${execution.executionId} profile=${execution.profile} status=${execution.status} task=${execution.taskId} artifacts=${execution.artifacts.join(',') || 'none'}`);
  }
  lines.push(`team_sessions=${inspection.teamSessions.length}`);
  for (const session of inspection.teamSessions) {
    lines.push(`- ${session.teamId} status=${session.status} mode=${session.teamMode.mode} activation=${session.teamMode.activation} cost=${session.teamMode.costClass} chief=${session.chiefProfile} members=${session.memberProfiles.join(',') || 'none'} artifacts=${session.artifacts.join(',') || 'none'}`);
  }
  lines.push(`worker_runtimes=${inspection.workerRuntimes.length}`);
  for (const runtime of inspection.workerRuntimes) {
    lines.push(`- ${runtime.runtimeId} status=${runtime.status} task=${runtime.taskId} agent=${runtime.agent} delegation=${runtime.delegationId} lease_expires=${runtime.leaseExpiresAt}`);
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
  renderDocumentGaps(lines, inspection.gaps);
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

function renderWorkflowGateList(workflows: WorkflowGateContract[]): string {
  const lines = ['SDD workflow gates'];
  for (const workflow of workflows) {
    lines.push(`- ${workflow.id} command=${workflow.command} agents=${workflow.allowedAgents.join(',') || 'none'}`);
  }
  return lines.join('\n');
}

function renderWorkflowGateInspect(workflow: WorkflowGateContract): string {
  const lines = [`Workflow gate ${workflow.id}`];
  lines.push(`version=${workflow.version}`);
  lines.push(`command=${workflow.command}`);
  lines.push(`agents=${workflow.allowedAgents.join(',') || 'none'}`);
  lines.push('required_inputs');
  for (const input of workflow.requiredInputs) {
    lines.push(`- ${input}`);
  }
  lines.push('required_artifacts');
  for (const artifact of workflow.requiredArtifacts) {
    lines.push(`- ${artifact}`);
  }
  lines.push('gate_conditions');
  for (const condition of workflow.gateConditions) {
    lines.push(`- ${condition}`);
  }
  lines.push(`gap_closure=${workflow.gapClosureBehavior}`);
  lines.push(`next=${workflow.nextAction}`);
  return lines.join('\n');
}

function renderWorkflowGateValidation(result: WorkflowGateValidation): string {
  const lines = ['SDD workflow gate validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`workflows=${result.workflows.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

function renderAgentRegistryList(agents: AgentRegistryEntry[]): string {
  const lines = ['SDD agent registry'];
  for (const agent of agents) {
    lines.push(`- ${agent.id} stages=${agent.allowedStages.join(',')} autonomy=${agent.autonomyCeiling}`);
  }
  return lines.join('\n');
}

function renderAgentRegistryInspect(agent: AgentRegistryEntry): string {
  const lines = [`Agent ${agent.id}`];
  lines.push(`version=${agent.version}`);
  lines.push(`role=${agent.role}`);
  lines.push(`allowed_stages=${agent.allowedStages.join(',')}`);
  lines.push(`autonomy_ceiling=${agent.autonomyCeiling}`);
  lines.push(`required_artifact=${agent.requiredArtifact}`);
  lines.push(`verification=${agent.verificationExpectation}`);
  lines.push('capabilities');
  for (const capability of agent.capabilities) {
    lines.push(`- ${capability}`);
  }
  lines.push('read_boundary');
  for (const item of agent.readBoundary) {
    lines.push(`- ${item}`);
  }
  lines.push('write_boundary');
  for (const item of agent.writeBoundary) {
    lines.push(`- ${item}`);
  }
  lines.push('tool_allowlist');
  for (const tool of agent.toolAllowlist) {
    lines.push(`- ${tool}`);
  }
  lines.push(`stop_condition=${agent.stopCondition}`);
  return lines.join('\n');
}

function renderAgentRegistryValidation(result: AgentRegistryValidation): string {
  const lines = ['SDD agent registry validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`agents=${result.agents.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

function renderRegistryOriginCounts(sources: RuntimeRegistryEntrySource[] | undefined): string {
  if (!sources || sources.length === 0) {
    return 'none';
  }
  const counts = new Map<string, number>();
  for (const source of sources) {
    counts.set(source.origin, (counts.get(source.origin) ?? 0) + 1);
  }
  return [...counts.entries()].map(([origin, count]) => `${origin}:${count}`).join(',');
}

function idsByOrigin(sources: RuntimeRegistryEntrySource[] | undefined, kind: RuntimeRegistryEntrySource['kind'], origin: RuntimeRegistryEntrySource['origin']): string {
  const ids = sources?.filter((source) => source.kind === kind && source.origin === origin).map((source) => source.id) ?? [];
  return ids.join(',') || 'none';
}

function renderAgentRouterDecision(decision: AgentRouterDecision): string {
  const lines = [`Agent router decision ${decision.taskId}`];
  lines.push(`version=${decision.version}`);
  lines.push(`branch=${decision.branch} category=${decision.category}`);
  lines.push(`recommended_profile=${decision.recommendedProfile ?? 'none'} autonomy_ceiling=${decision.autonomyCeiling}`);
  lines.push(`allowed_profiles=${decision.allowedProfiles.join(',') || 'none'}`);
  lines.push(`required_capabilities=${decision.requiredCapabilities.join(',') || 'none'}`);
  lines.push(`source_capability=${decision.sourceCapability ?? 'none'} reuse=${decision.reuseDecision ?? 'none'}`);
  if (decision.registrySources && decision.registrySources.length > 0) {
    lines.push(`registry_sources=${decision.registrySources.map((source) => `${source.kind}:${source.id}:${source.origin}`).join(',')}`);
  }
  if (decision.resolvedAliases && decision.resolvedAliases.length > 0) {
    lines.push(`alias_resolutions=${decision.resolvedAliases.map((alias) => `${alias.input}->${alias.resolved}:${alias.source}`).join(',')}`);
  }
  if (decision.routingRuleHits && decision.routingRuleHits.length > 0) {
    lines.push(`routing_rule_hits=${decision.routingRuleHits.join(',')}`);
  }
  if (decision.quarantineWarnings && decision.quarantineWarnings.length > 0) {
    lines.push('quarantine_warnings');
    for (const warning of decision.quarantineWarnings) {
      lines.push(`- ${warning}`);
    }
  }
  if (decision.adapterMapping) {
    lines.push(`adapter_mapping profile=${decision.adapterMapping.profile} host=${decision.adapterMapping.hostAdapter} projection=${decision.adapterMapping.projection}`);
  }
  if (decision.toolPermission) {
    lines.push(`tool_permission profile=${decision.toolPermission.profile} policy=${decision.toolPermission.policy} groups=${decision.toolPermission.toolGroups.join(',')}`);
    lines.push(`approval=${decision.toolPermission.approvalPolicy}`);
  }
  lines.push(`model_policy=${decision.modelPolicy.id} category=${decision.modelPolicy.category}`);
  lines.push(`team_mode=${decision.teamMode.decision} mode=${decision.teamMode.mode} activation=${decision.teamMode.activation} cost=${decision.teamMode.costClass} waves=${decision.teamMode.waveRecommendation.join(',') || 'none'}`);
  lines.push(`team_mode_reason=${decision.teamMode.reason}`);
  lines.push(`required_artifacts=${decision.requiredArtifacts.join(',') || 'none'}`);
  if (decision.blockedReason) {
    lines.push(`blocked_reason=${decision.blockedReason}`);
  }
  lines.push(`next=${decision.nextAction}`);
  return lines.join('\n');
}

function renderAgentSkillTeamRuntimeInspection(inspection: AgentSkillTeamRuntimeInspection): string {
  const lines = ['SDD agent/skill/team runtime'];
  lines.push(`version=${inspection.version}`);
  lines.push(`profiles=${inspection.profiles.length} skill_capabilities=${inspection.skillCapabilities.length} capability_sources=${inspection.capabilitySources.length}`);
  lines.push(`registry_origins=${renderRegistryOriginCounts(inspection.registrySources)}`);
  lines.push(`project_profiles=${idsByOrigin(inspection.registrySources, 'profile', 'project_config')}`);
  lines.push(`project_capabilities=${idsByOrigin(inspection.registrySources, 'skill_capability', 'project_config')}`);
  lines.push(`project_sources=${idsByOrigin(inspection.registrySources, 'capability_source', 'project_config')}`);
  if (inspection.aliases && Object.keys(inspection.aliases).length > 0) {
    lines.push(`aliases=${Object.entries(inspection.aliases).map(([alias, target]) => `${alias}->${target}`).join(',')}`);
  }
  if (inspection.routingRules && inspection.routingRules.length > 0) {
    lines.push(`routing_rules=${inspection.routingRules.map((rule) => rule.id).join(',')}`);
  }
  if (inspection.adapterMappings && inspection.adapterMappings.length > 0) {
    lines.push(`adapter_mappings=${inspection.adapterMappings.map((mapping) => `${mapping.profile}:${mapping.hostAdapter}`).join(',')}`);
  }
  lines.push(`host_adapter=${inspection.hostAdapter.id} host=${inspection.hostAdapter.host}`);
  lines.push(`team_mode_default=${inspection.teamMode.decision}`);
  lines.push(`reuse_policy=${inspection.reusePolicy}`);
  lines.push('profiles');
  for (const profile of inspection.profiles) {
    lines.push(`- ${profile.id} stages=${profile.stageScope.join(',')} risk_ceiling=${profile.riskCeiling}`);
  }
  lines.push('capabilities');
  for (const capability of inspection.skillCapabilities) {
    lines.push(`- ${capability.id} reuse=${capability.reuseDecision} evidence=${capability.evidenceType}`);
  }
  return lines.join('\n');
}

function renderAgentSkillTeamRuntimeValidation(result: AgentSkillTeamRuntimeValidation): string {
  const lines = ['SDD agent/skill/team runtime validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`profiles=${result.inspection.profiles.length}`);
  lines.push(`capabilities=${result.inspection.skillCapabilities.length}`);
  lines.push(`registry_origins=${renderRegistryOriginCounts(result.inspection.registrySources)}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

function renderSkillCapabilityList(capabilities: SkillCapabilityContract[], registrySources?: RuntimeRegistryEntrySource[]): string {
  const lines = ['SDD skill capabilities'];
  lines.push(`registry_origins=${renderRegistryOriginCounts(registrySources)}`);
  for (const capability of capabilities) {
    const source = registrySources?.find((candidate) => candidate.kind === 'skill_capability' && candidate.id === capability.id);
    lines.push(`- ${capability.id} domain=${capability.capabilityDomain.join(',')} reuse=${capability.reuseDecision} evidence=${capability.evidenceType} origin=${source?.origin ?? 'unknown'}`);
  }
  return lines.join('\n');
}

function renderSkillCapabilityInspect(capability: SkillCapabilityContract): string {
  const lines = [`Skill capability ${capability.id}`];
  lines.push(`version=${capability.version}`);
  lines.push(`name=${capability.name}`);
  lines.push(`kind=${capability.kind} source=${capability.source} source_ref=${capability.sourceRef}`);
  lines.push(`domain=${capability.capabilityDomain.join(',')}`);
  lines.push(`allowed_stages=${capability.allowedStages.join(',')}`);
  lines.push(`risk_ceiling=${capability.requiredRiskCeiling}`);
  lines.push(`evidence_type=${capability.evidenceType}`);
  lines.push(`reuse_decision=${capability.reuseDecision}`);
  if (capability.buildExceptionReason) {
    lines.push(`build_exception=${capability.buildExceptionReason}`);
  }
  return lines.join('\n');
}

function renderCapabilitySourceList(sources: CapabilitySourceCatalogEntry[], registrySources?: RuntimeRegistryEntrySource[]): string {
  const lines = ['SDD capability sources'];
  lines.push(`registry_origins=${renderRegistryOriginCounts(registrySources)}`);
  for (const source of sources) {
    const registrySource = registrySources?.find((candidate) => candidate.kind === 'capability_source' && candidate.id === source.id);
    lines.push(`- ${source.id} kind=${source.kind} reuse=${source.reuseDecision} quarantine=${source.quarantineRequired} origin=${registrySource?.origin ?? 'unknown'}`);
  }
  return lines.join('\n');
}

function renderCapabilitySourceInspect(source: CapabilitySourceCatalogEntry): string {
  const lines = [`Capability source ${source.id}`];
  lines.push(`version=${source.version}`);
  lines.push(`name=${source.name}`);
  lines.push(`kind=${source.kind} reuse=${source.reuseDecision} quarantine=${source.quarantineRequired}`);
  lines.push(`source_ref=${source.sourceRef}`);
  lines.push(`allowed_use=${source.allowedUse}`);
  lines.push(`attribution=${source.attribution}`);
  lines.push(`rationale=${source.rationale}`);
  return lines.join('\n');
}

function renderExternalAgentPackImportInspection(inspection: ExternalAgentPackImportInspection): string {
  const lines = [`External pack import ${inspection.sourceId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`status=${inspection.status} risk_ceiling=${inspection.riskCeiling}`);
  lines.push(`allowed_profiles=${inspection.allowedProfiles.join(',') || 'none'}`);
  lines.push(`mapping=${inspection.mappingResult}`);
  lines.push(`reason=${inspection.reason}`);
  lines.push('checks');
  for (const check of inspection.checks) {
    lines.push(`- ${check.check} status=${check.status} evidence=${check.evidence}`);
  }
  return lines.join('\n');
}

function renderTeamModePolicy(policy: TeamModePolicy): string {
  const lines = ['SDD team-mode policy'];
  lines.push(`version=${policy.version}`);
  lines.push(`enabled=${policy.enabled} decision=${policy.decision} mode=${policy.mode} activation=${policy.activation} cost=${policy.costClass}`);
  lines.push(`reason=${policy.reason}`);
  lines.push(`chief=${policy.chiefProfile} members=${policy.memberProfiles.join(',') || 'none'} max_members=${policy.maxMembers}`);
  lines.push(`require_artifacts=${policy.requireArtifacts}`);
  lines.push(`waves=${policy.waveRecommendation.join(',') || 'none'}`);
  if (policy.blockedReason) {
    lines.push(`blocked_reason=${policy.blockedReason}`);
  }
  for (const wave of policy.allowedWaves) {
    lines.push(`- ${wave.id} kind=${wave.waveKind} members=${wave.memberProfiles.join(',')} merge_gate=${wave.mergeGate}`);
  }
  return lines.join('\n');
}

function renderQueryStatusContract(contract: QueryStatusContract): string {
  const lines = ['SDD query status contract'];
  lines.push(`version=${contract.version}`);
  lines.push(`source=${contract.sourceDocument}`);
  for (const surface of contract.surfaces) {
    lines.push(`- ${surface.id} command=${surface.command}`);
    lines.push(`  responsibility=${surface.responsibility}`);
    lines.push(`  includes=${surface.includes.join(',')}`);
    lines.push(`  excludes=${surface.excludes.join(',')}`);
    lines.push(`  next=${surface.nextActionRule}`);
  }
  return lines.join('\n');
}

function renderQueryStatusValidation(result: QueryStatusValidation): string {
  const lines = ['SDD query status validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`surfaces=${result.surfaces.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

function renderSkillAgentEvalContract(contract: SkillAgentEvalContract): string {
  const lines = ['SDD skill/agent eval contract'];
  lines.push(`version=${contract.version}`);
  lines.push(`source=${contract.sourceReport}`);
  lines.push(`corpus=${contract.corpus.length}`);
  lines.push('dimensions');
  for (const dimension of contract.dimensions) {
    lines.push(`- ${dimension.id} threshold=${dimension.passThreshold}`);
    lines.push(`  expectation=${dimension.expectation}`);
    lines.push(`  baseline=${dimension.baselineFinding}`);
  }
  lines.push('regression_assertions');
  for (const assertion of contract.regressionAssertions) {
    lines.push(`- ${assertion}`);
  }
  return lines.join('\n');
}

function renderSkillAgentEvalValidation(result: SkillAgentEvalValidation): string {
  const lines = ['SDD skill/agent eval validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`dimensions=${result.contract.dimensions.length}`);
  lines.push(`corpus=${result.contract.corpus.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

function renderHarnessLearningContract(contract: HarnessLearningContract): string {
  const lines = ['SDD harness learning contract'];
  lines.push(`version=${contract.version}`);
  lines.push(`source=${contract.sourceTrial}`);
  lines.push(`promotion=${contract.promotionRule}`);
  lines.push('allowed_sinks');
  for (const sink of contract.allowedSinks) {
    lines.push(`- ${sink.id}: ${sink.output}`);
    lines.push(`  boundary=${sink.boundary}`);
  }
  lines.push('forbidden_outputs');
  for (const output of contract.forbiddenOutputs) {
    lines.push(`- ${output}`);
  }
  return lines.join('\n');
}

function renderHarnessLearningValidation(result: HarnessLearningValidation): string {
  const lines = ['SDD harness learning validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`allowed_sinks=${result.contract.allowedSinks.length}`);
  lines.push(`forbidden_outputs=${result.contract.forbiddenOutputs.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

function renderProjectContextPackContract(contract: ProjectContextPackContract): string {
  const lines = ['SDD project context pack contract'];
  lines.push(`version=${contract.version}`);
  lines.push(`entry=${contract.entryPoint}`);
  lines.push('durable_context');
  for (const item of contract.durableContext) {
    lines.push(`- ${item}`);
  }
  lines.push('runtime_sources_of_truth');
  for (const source of contract.runtimeSourcesOfTruth) {
    lines.push(`- ${source}`);
  }
  lines.push('boundaries');
  for (const boundary of contract.boundaries) {
    lines.push(`- ${boundary}`);
  }
  return lines.join('\n');
}

function renderProjectContextPackValidation(result: ProjectContextPackValidation): string {
  const lines = ['SDD project context pack validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`entry=${result.contract.entryPoint}`);
  lines.push(`runtime_sources=${result.contract.runtimeSourcesOfTruth.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
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
  renderIssues(lines, inspection.issues);
  return lines.join('\n');
}

function renderBackgroundExecutorResult(result: BackgroundExecutorResult): string {
  const lines = [`Background executor ${result.status} for ${result.taskId}`];
  lines.push(`version=${result.version}`);
  lines.push(`run=${result.runId} delegation=${result.delegationId ?? 'n/a'} queue=${result.queueItemId ?? 'n/a'} worker=${result.workerAdapterId}`);
  lines.push(`artifact=${result.artifactPath ?? 'pending'}`);
  lines.push(result.message);
  renderIssues(lines, result.issues);
  return lines.join('\n');
}

function renderBackgroundExecutorInspection(inspection: BackgroundExecutorInspection): string {
  const lines = [`Background executor ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`delegations=${inspection.delegations.length} running=${inspection.runningDelegations} terminal=${inspection.terminalDelegations} ingestions=${inspection.artifactIngestions.length}`);
  for (const delegation of inspection.delegations) {
    lines.push(`- ${delegation.delegationId} ${delegation.status} task=${delegation.taskId} agent=${delegation.agent} artifact=${delegation.expectedArtifact}`);
  }
  renderIssues(lines, inspection.issues);
  return lines.join('\n');
}

function renderResidentWorkerRuntimeClaimResult(result: ResidentWorkerRuntimeClaimResult): string {
  const lines = [`Resident worker runtime ${result.status} for ${result.taskId}`];
  lines.push(`version=${result.version}`);
  lines.push(`run=${result.runId} runtime=${result.runtimeId ?? 'n/a'} delegation=${result.delegationId ?? 'n/a'} queue=${result.queueItemId ?? 'n/a'} worker=${result.workerAdapterId}`);
  lines.push(`artifact=${result.expectedArtifact ?? 'pending'} lease_expires=${result.leaseExpiresAt ?? 'n/a'}`);
  lines.push(result.message);
  renderIssues(lines, result.issues);
  if (result.runtimeId && result.leaseExpiresAt) {
    lines.push(`next sdd worker-runtime heartbeat ${result.runtimeId} --run ${result.runId}`);
    lines.push(`inspect sdd worker-runtime inspect ${result.runtimeId} --run ${result.runId}`);
  }
  return lines.join('\n');
}

function renderResidentWorkerRuntimeHeartbeatResult(result: ResidentWorkerRuntimeHeartbeatResult): string {
  const lines = [`Resident worker runtime ${result.status}: ${result.runtimeId}`];
  lines.push(`version=${result.version}`);
  lines.push(`run=${result.runId} lease_expires=${result.leaseExpiresAt ?? 'n/a'}`);
  lines.push(result.message);
  renderIssues(lines, result.issues);
  if (result.runtime) {
    lines.push(`next ${result.status === 'terminal' ? `sdd background inspect ${result.runId}` : `sdd worker-runtime inspect ${result.runtimeId} --run ${result.runId}`}`);
  }
  return lines.join('\n');
}

function renderResidentWorkerRuntimeList(result: ResidentWorkerRuntimeList): string {
  const lines = [`Resident worker runtimes for ${result.runId}`];
  lines.push(`version=${result.version}`);
  lines.push(`runtimes=${result.runtimes.length} active=${result.activeRuntimes} stale=${result.staleRuntimes} terminal=${result.terminalRuntimes} blocked=${result.blockedRuntimes}`);
  for (const runtime of result.runtimes) {
    lines.push(`- ${runtime.runtimeId} ${runtime.status} task=${runtime.taskId} agent=${runtime.agent} delegation=${runtime.delegationId} lease_expires=${runtime.leaseExpiresAt}`);
  }
  renderIssues(lines, result.issues);
  return lines.join('\n');
}

function renderResidentWorkerRuntimeInspection(inspection: ResidentWorkerRuntimeInspection): string {
  const lines = [`Resident worker runtime ${inspection.status}: ${inspection.runtimeId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`run=${inspection.runId} valid=${inspection.valid} lease_expired=${inspection.leaseExpired}`);
  if (inspection.runtime) {
    lines.push(`task=${inspection.runtime.taskId} agent=${inspection.runtime.agent} worker=${inspection.runtime.workerAdapterId}`);
    lines.push(`delegation=${inspection.runtime.delegationId} queue=${inspection.runtime.queueItemId} artifact=${inspection.runtime.expectedArtifact}`);
    lines.push(`claimed=${inspection.runtime.claimedAt} heartbeat=${inspection.runtime.lastHeartbeatAt ?? 'none'} lease_expires=${inspection.runtime.leaseExpiresAt}`);
    lines.push(`evidence=${inspection.runtime.evidenceSummary}`);
  }
  lines.push(`queue_status=${inspection.queueItem?.status ?? 'missing'} adapter=${inspection.workerAdapter?.id ?? 'missing'}`);
  lines.push(`next ${inspection.recommendedNextCommand}`);
  renderIssues(lines, inspection.issues);
  return lines.join('\n');
}

function renderIssues(lines: string[], issues: Array<{ field: string; message: string; recommendation: string }>): void {
  if (issues.length === 0) {
    return;
  }
  lines.push('issues');
  for (const issue of issues) {
    lines.push(`- ${issue.field}: ${issue.message}`);
    lines.push(`  recommendation: ${issue.recommendation}`);
  }
}

function renderDocumentGaps(lines: string[], gaps: Array<{ severity: string; type: string; taskId?: string | null; field: string; message: string }>): void {
  if (gaps.length === 0) {
    return;
  }
  lines.push('gaps');
  for (const gap of gaps) {
    lines.push(`- [${gap.severity}] ${gap.type} ${gap.taskId ?? 'document'} ${gap.field}: ${gap.message}`);
  }
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
  renderIssues(lines, result.issues);
  return lines.join('\n');
}

function renderWaveExecutorInspection(inspection: WaveExecutorInspection): string {
  const lines = [`Wave executor ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`version=${inspection.version}`);
  lines.push(`events=${inspection.waveEvents.length} delegations=${inspection.background.delegations.length} terminal=${inspection.background.terminalDelegations}`);
  for (const event of inspection.waveEvents) {
    lines.push(`- ${event.event}: ${event.summary ?? ''}`);
  }
  renderIssues(lines, inspection.issues);
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
  renderIssues(lines, inspection.issues);
  return lines.join('\n');
}

function renderTaskGraphPlan(graph: TaskGraphPlan): string {
  const lines = [`Task graph ${graph.valid ? 'valid' : 'blocked'} for ${graph.branch}`];
  lines.push(`version=${graph.version}`);
  lines.push(`contract=${graph.contract}`);
  lines.push(`tasks=${graph.summary.tasks} dependencies=${graph.summary.dependencies} file_overlaps=${graph.summary.fileOverlaps}`);
  lines.push(`high_risk_tasks=${graph.summary.highRiskTasks.length > 0 ? graph.summary.highRiskTasks.join(',') : 'none'}`);
  lines.push(`validation=${graph.summary.validationCommands.length > 0 ? graph.summary.validationCommands.join(' | ') : 'none'}`);
  lines.push('nodes');
  for (const node of graph.nodes) {
    lines.push(`- ${node.taskId} status=${node.status} wave=${node.wave ?? 'n/a'} deps=${node.dependsOn.join(',') || 'none'} files=${node.affectedFiles.length} agent_fit=${node.agentFit.join(',') || 'none'} verification=${node.verificationAvailability.join(',') || 'none'} autonomy=${node.autonomy ?? 'n/a'}`);
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

function readTeamModeActivation(args: string[], fallback?: TeamModeActivation): TeamModeActivation | undefined {
  if (args.includes('--no-team-mode')) {
    return 'off';
  }
  const inline = args.find((item) => item.startsWith('--team-mode='));
  const inlineValue = inline?.split('=', 2)[1];
  if (inlineValue === 'auto' || inlineValue === 'force' || inlineValue === 'off') {
    return inlineValue;
  }
  const index = args.indexOf('--team-mode');
  if (index >= 0) {
    const value = args[index + 1];
    if (value === 'auto' || value === 'force' || value === 'off') {
      return value;
    }
    return 'force';
  }
  return fallback;
}


function readBranchContext(args: string[]): { branch?: string; branchSource?: ContextBranchSource } {
  const branch = readBranchOption(args);
  return branch ? { branch, branchSource: 'cli_option' } : {};
}

function readBranchOption(args: string[]): string | undefined {
  return readOption(args, '--branch') ?? undefined;
}

function readOptionalPositionalArgument(args: string[]): string | undefined {
  const booleanOptions = new Set(['--approved', '--json', '--no-team-mode', '--force', '--check', '--latest-only', '--all-runs', '--scaffold-docs', '--no-scaffold-docs', '--direct-safe', '--external-unknown', '--architecture', '--checkpoint']);
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item.startsWith('--')) {
      return item;
    }
    if (item.includes('=')) {
      continue;
    }
    if (!booleanOptions.has(item) && args[index + 1] && !args[index + 1].startsWith('--')) {
      index += 1;
    }
  }
  return undefined;
}

async function readResolvedBranch(projectRoot: string, args: string[]): Promise<string> {
  return (await resolveSddContext(projectRoot, readBranchContext(args))).branch;
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

async function readLifecycleSignalOptions(args: string[]): Promise<{ signals: Partial<LifecycleDecisionSignals>; riskExtraction: LifecycleRiskGateExtraction | null; error?: string }> {
  const directSafe = args.includes('--direct-safe');
  const riskTags = readRepeatedOptions(args, '--risk');
  const contracts = readRepeatedOptions(args, '--contract');
  const permissions = readRepeatedOptions(args, '--permission');
  const fromText = readOption(args, '--from-text');
  const fromFile = readOption(args, '--from-file');
  if (fromText && fromFile) {
    return { signals: {}, riskExtraction: null, error: 'Usage: sdd lifecycle decide accepts only one of --from-text or --from-file' };
  }
  const riskExtraction = fromText
    ? extractLifecycleRiskSignalsFromText(fromText, 'from_text')
    : fromFile
      ? extractLifecycleRiskSignalsFromText(await readFile(fromFile, 'utf8'), 'from_file')
      : null;
  const extracted = riskExtraction?.signals ?? {};
  const signals: Partial<LifecycleDecisionSignals> = {
    intent_clarity: directSafe ? 'high' as const : readSignalClarity(args, '--intent') ?? 'medium' as const,
    acceptance_clarity: directSafe ? 'high' as const : readSignalClarity(args, '--acceptance') ?? 'medium' as const,
    estimated_change_size: directSafe ? 'tiny' as const : readEstimatedChangeSize(args, '--size') ?? 'small' as const,
    task_count_estimate: Number(readOption(args, '--tasks') ?? (directSafe ? '1' : '1')),
    file_count_estimate: Number(readOption(args, '--files') ?? (directSafe ? '1' : '1')),
    affected_layers: readRepeatedOptions(args, '--layer'),
    affected_contracts: uniqueCliStrings([...contracts, ...(extracted.affected_contracts ?? [])]),
    dependency_fanout: readDependencyFanout(args, '--fanout') ?? 'local' as const,
    impact_confidence: directSafe ? 'high' as const : extracted.impact_confidence ?? readImpactConfidence(args, '--impact-confidence') ?? 'medium' as const,
    risk_tags: uniqueCliStrings([...riskTags, ...(extracted.risk_tags ?? [])]),
    reversibility: directSafe ? 'reversible' as const : extracted.reversibility ?? readReversibility(args, '--reversibility') ?? 'unknown' as const,
    validation_clarity: directSafe ? 'clear' as const : extracted.validation_clarity ?? readValidationClarity(args, '--validation') ?? 'partial' as const,
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
    source_artifacts: uniqueCliStrings([...readRepeatedOptions(args, '--source-artifact'), ...(fromFile ? [fromFile] : [])]),
    can_scout_impact: !args.includes('--cannot-scout-impact'),
    architecture_decision_required: args.includes('--architecture') || Boolean(extracted.architecture_decision_required),
    external_unknown: args.includes('--external-unknown') || Boolean(extracted.external_unknown)
  };
  return { signals, riskExtraction };
}


function uniqueCliStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function renderLifecycleRiskExtraction(extraction: LifecycleRiskGateExtraction | null): string {
  if (!extraction) {
    return '';
  }
  const lines = [
    'Lifecycle Risk Gate',
    'changed',
    '- deterministic risk signals extracted',
    'decision',
    `- source=${extraction.source}`,
    `- risk_tags=${extraction.riskTags.join(',') || 'none'}`,
    `- affected_contracts=${extraction.affectedContracts.join(',') || 'none'}`,
    `- external_unknown=${extraction.externalUnknown}`,
    'evidence'
  ];
  if (extraction.evidence.length === 0) {
    lines.push('- none');
  } else {
    for (const item of extraction.evidence) {
      lines.push(`- ${item.category}: ${item.matched} -> ${item.riskTag}`);
    }
  }
  lines.push('gaps');
  lines.push('- none');
  lines.push('next');
  lines.push('- Evaluate extracted signals with lifecycle decision gate.');
  return `${lines.join('\n')}\n`;
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
acceptance_refs:
  - AC-1
plan_refs:
  - "§4 Target Design Overview"
affected_files:
  - path/to/file
validation:
  - command string
risk:
  - state-machine
agent_fit:
  - scout
  - implementer
  - reviewer
  - validator
verification_availability:
  - unit:command string
  - build:command string
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - scout
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/review-T1.md
  - artifacts/validation-T1.md
\`\`\`

Put contract metadata inside the fenced block: acceptance_refs, plan_refs, agent_fit, verification_availability, autonomy, allowed_agents, and required_artifacts. Companion sections such as #### Boundary, #### Acceptance, and #### Implementation Notes must stay outside the fenced sdd-task metadata block.

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
