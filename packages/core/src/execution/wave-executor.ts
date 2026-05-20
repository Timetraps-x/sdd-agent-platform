import { WAVE_EXECUTOR_CONTRACT_VERSION } from '../contracts.js';
import { contractIssue, type ContractValidationIssue } from '../contracts/issues.js';
import { evaluateGovernancePolicy } from '../governance/policy.js';
import { inspectWavePlan } from '../planning/wave-plan.js';
import { appendEvent, readRunEvents } from '../run-state/events.js';
import type { RuntimeEvent } from '../run-state/model.js';
import { createRun, readRunState, writeRunState } from '../run-state/run-state.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import type { WavePlanGate } from '../planning/wave-plan.js';
import { inspectBackgroundExecutor, runBackgroundExecutor } from './background-executor.js';
import type { BackgroundExecutorInspection, BackgroundExecutorResult } from './background-executor.js';

export type WaveExecutorStrategy = 'fast-stop' | 'safe-continue';
export type WaveExecutorStatus = 'claimed' | 'completed' | 'failed' | 'blocked';

export interface WaveExecutorRunOptions {
  branch?: string;
  runId?: string;
  capabilityId?: string;
  agent?: string;
  workerAdapterId?: string;
  strategy?: WaveExecutorStrategy;
  artifactPaths?: Record<string, string>;
}

export interface WaveExecutorTaskResult {
  waveIndex: number;
  taskId: string;
  result: BackgroundExecutorResult;
}

export interface WaveExecutorResult {
  version: typeof WAVE_EXECUTOR_CONTRACT_VERSION;
  runId: string;
  branch: string;
  strategy: WaveExecutorStrategy;
  status: WaveExecutorStatus;
  plannedWaves: number;
  executedWaves: number;
  taskResults: WaveExecutorTaskResult[];
  manualGates: WavePlanGate[];
  blockedTasks: WavePlanGate[];
  issues: ContractValidationIssue[];
  message: string;
}

export interface WaveExecutorInspection {
  version: typeof WAVE_EXECUTOR_CONTRACT_VERSION;
  runId: string;
  background: BackgroundExecutorInspection;
  waveEvents: RuntimeEvent[];
  valid: boolean;
  issues: ContractValidationIssue[];
}

export async function inspectWaveExecutor(projectRoot: string, runId: string): Promise<WaveExecutorInspection> {
  const [background, events] = await Promise.all([
    inspectBackgroundExecutor(projectRoot, runId),
    readRunEvents(projectRoot, runId)
  ]);
  const waveEvents = events.filter((event) => event.event.startsWith('wave_executor_'));
  const issues = [...background.issues];
  if (waveEvents.length === 0) {
    issues.push(contractIssue('wave_executor', `Run ${runId} has no wave executor events.`, 'Run sdd wave run before inspecting wave executor evidence.'));
  }
  return {
    version: WAVE_EXECUTOR_CONTRACT_VERSION,
    runId,
    background,
    waveEvents,
    valid: issues.length === 0,
    issues
  };
}

export async function runWaveExecutor(projectRoot: string, options: WaveExecutorRunOptions = {}): Promise<WaveExecutorResult> {
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const strategy = options.strategy ?? 'fast-stop';
  const agent = options.agent ?? 'implementer';
  const workerAdapterId = options.workerAdapterId ?? 'sdd-cli-task-worker';
  const runState = options.runId ? await readRunState(projectRoot, options.runId) : await createRun(projectRoot);
  const runId = runState.runId;
  const plan = await inspectWavePlan(projectRoot, { branch, capabilityId: options.capabilityId ?? 'native-file-edit' });
  const issues: ContractValidationIssue[] = [];
  const taskResults: WaveExecutorTaskResult[] = [];

  const governance = await evaluateGovernancePolicy(projectRoot, {
    operation: 'wave_executor',
    runId,
    workerAdapterId,
    riskTags: plan.manualGates.flatMap((gate) => gate.reasons)
  });
  if (!governance.allowed) {
    await appendEvent(projectRoot, runId, { event: 'governance_policy_blocked', runId, summary: `Governance policy blocked wave executor for ${branch}`, data: { branch, strategy, decision: governance } });
    await writeRunState(projectRoot, { ...runState, status: 'blocked', phase: 'wave', currentTask: null });
    return {
      version: WAVE_EXECUTOR_CONTRACT_VERSION,
      runId,
      branch,
      strategy,
      status: 'blocked',
      plannedWaves: plan.waves.length,
      executedWaves: 0,
      taskResults,
      manualGates: plan.manualGates,
      blockedTasks: plan.blockedTasks,
      issues: governance.issues,
      message: 'Wave executor blocked by governance policy.'
    };
  }

  await writeRunState(projectRoot, {
    ...runState,
    status: 'running',
    phase: 'wave',
    currentTask: null
  });
  await appendEvent(projectRoot, runId, {
    event: 'wave_executor_started',
    runId,
    summary: `Wave executor started for ${branch}`,
    data: { branch, strategy, plannedWaves: plan.waves.length }
  });

  if (!plan.valid || plan.manualGates.length > 0 || plan.blockedTasks.length > 0) {
    for (const gate of [...plan.manualGates, ...plan.blockedTasks]) {
      issues.push(contractIssue(`task:${gate.taskId}`, gate.reasons.join(' | '), 'Resolve manual or blocked wave gates before running the wave executor.'));
    }
    await appendEvent(projectRoot, runId, {
      event: 'wave_executor_blocked',
      runId,
      summary: `Wave executor blocked for ${branch}`,
      data: { branch, manualGates: plan.manualGates, blockedTasks: plan.blockedTasks, issues }
    });
    const blockedState = await readRunState(projectRoot, runId);
    await writeRunState(projectRoot, { ...blockedState, status: 'blocked', phase: 'wave', currentTask: null });
    return {
      version: WAVE_EXECUTOR_CONTRACT_VERSION,
      runId,
      branch,
      strategy,
      status: 'blocked',
      plannedWaves: plan.waves.length,
      executedWaves: 0,
      taskResults,
      manualGates: plan.manualGates,
      blockedTasks: plan.blockedTasks,
      issues,
      message: 'Wave executor blocked before executing planned tasks.'
    };
  }

  let executedWaves = 0;
  let stopAfterWave = false;
  for (const wave of plan.waves) {
    executedWaves += 1;
    await appendEvent(projectRoot, runId, {
      event: 'wave_executor_wave_started',
      runId,
      summary: `Wave ${wave.index} started`,
      data: { branch, waveIndex: wave.index, taskIds: wave.tasks.map((task) => task.taskId) }
    });
    let waveTerminalCompleted = true;
    for (const task of wave.tasks) {
      const result = await runBackgroundExecutor(projectRoot, {
        branch,
        runId,
        taskId: task.taskId,
        agent,
        workerAdapterId,
        artifactPath: options.artifactPaths?.[task.taskId],
        delegationId: `W${wave.index}-${task.taskId}-${agent}-001`
      });
      taskResults.push({ waveIndex: wave.index, taskId: task.taskId, result });
      issues.push(...result.issues);
      if (result.status !== 'completed') {
        waveTerminalCompleted = false;
        stopAfterWave = true;
        if (strategy === 'fast-stop') {
          break;
        }
      }
    }
    await appendEvent(projectRoot, runId, {
      event: 'wave_executor_wave_completed',
      runId,
      summary: `Wave ${wave.index} ${waveTerminalCompleted ? 'completed' : 'stopped'}`,
      data: { branch, waveIndex: wave.index, completed: waveTerminalCompleted }
    });
    if (stopAfterWave) {
      break;
    }
  }

  const statuses = taskResults.map((task) => task.result.status);
  const status: WaveExecutorStatus = statuses.includes('blocked')
    ? 'blocked'
    : statuses.includes('failed')
      ? 'failed'
      : statuses.includes('claimed') || taskResults.length < plan.summary.plannedTasks
        ? 'claimed'
        : 'completed';
  const completedState = await readRunState(projectRoot, runId);
  await writeRunState(projectRoot, {
    ...completedState,
    status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : status === 'blocked' ? 'blocked' : 'running',
    phase: 'wave',
    currentTask: null
  });
  await appendEvent(projectRoot, runId, {
    event: status === 'completed' ? 'wave_executor_completed' : 'wave_executor_stopped',
    runId,
    summary: `Wave executor ${status} for ${branch}`,
    data: { branch, strategy, status, executedWaves, taskResults: taskResults.map((task) => ({ waveIndex: task.waveIndex, taskId: task.taskId, status: task.result.status })) }
  });

  return {
    version: WAVE_EXECUTOR_CONTRACT_VERSION,
    runId,
    branch,
    strategy,
    status,
    plannedWaves: plan.waves.length,
    executedWaves,
    taskResults,
    manualGates: [],
    blockedTasks: [],
    issues,
    message: `Wave executor ${status} after ${executedWaves} wave(s).`
  };
}
