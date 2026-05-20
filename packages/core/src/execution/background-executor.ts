import { BACKGROUND_EXECUTOR_CONTRACT_VERSION } from '../contracts.js';
import { contractIssue, type ContractValidationIssue } from '../contracts/issues.js';
import { ingestArtifactResult, inspectArtifactResultIngestions } from '../artifacts/ingestion.js';
import type { ArtifactResultIngestionRecord } from '../artifacts/ingestion.js';
import { createDelegationRecord, isDelegationTerminal } from '../delegation/validation.js';
import { listDelegationQueueItems } from '../delegation/queue.js';
import { persistDelegation } from '../delegation/run-state.js';
import { evaluateGovernancePolicy } from '../governance/policy.js';
import { getRunRelativeArtifactPath, toArtifactRootRelativePath } from '../runtime-paths.js';
import { appendEvent } from '../run-state/events.js';
import { createRun, readRunState, writeRunState } from '../run-state/run-state.js';
import type { DelegationQueueItem } from '../run-state/run-index.js';
import { inspectWorkerAdapterContract } from '../registries/worker-adapters.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { bindRunStateToTaskContext } from '../sdd-docs/run-binding.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import { routeSddTask } from '../router/route-sdd-task.js';
import { ensureExecutionOrchestration, completeExecutionOrchestration } from '../orchestration/runtime.js';
import { inspectWorktreeIsolation } from '../worktree/isolation.js';
import { buildAgentExecutionRecord, writeAgentExecutionRecord } from './agent-execution-records.js';
import { invokeClaudeCodeSubagentHost, type HostInvocationCommandOptions, type HostInvocationResult } from './host-invocation.js';

export type BackgroundExecutorStatus = 'claimed' | 'completed' | 'failed' | 'blocked';

export interface BackgroundExecutorRunOptions {
  branch?: string;
  runId?: string;
  taskId: string;
  agent?: string;
  workerAdapterId?: string;
  artifactPath?: string;
  delegationId?: string;
  timeoutSeconds?: number;
  hostInvocation?: HostInvocationCommandOptions;
  approved?: boolean;
}

export interface BackgroundExecutorResult {
  version: typeof BACKGROUND_EXECUTOR_CONTRACT_VERSION;
  runId: string;
  taskId: string;
  delegationId: string | null;
  queueItemId: string | null;
  workerAdapterId: string;
  status: BackgroundExecutorStatus;
  artifactPath: string | null;
  ingestion: ArtifactResultIngestionRecord | null;
  hostInvocation: HostInvocationResult | null;
  issues: ContractValidationIssue[];
  message: string;
}

export interface BackgroundExecutorInspection {
  version: typeof BACKGROUND_EXECUTOR_CONTRACT_VERSION;
  runId: string;
  delegations: DelegationQueueItem[];
  artifactIngestions: ArtifactResultIngestionRecord[];
  runningDelegations: number;
  terminalDelegations: number;
  valid: boolean;
  issues: ContractValidationIssue[];
}

export async function inspectBackgroundExecutor(projectRoot: string, runId: string): Promise<BackgroundExecutorInspection> {
  const [snapshot, ingestionInspection] = await Promise.all([
    listDelegationQueueItems(projectRoot, { runId }),
    inspectArtifactResultIngestions(projectRoot, runId)
  ]);
  const issues = [...ingestionInspection.issues];
  return {
    version: BACKGROUND_EXECUTOR_CONTRACT_VERSION,
    runId,
    delegations: snapshot.items,
    artifactIngestions: ingestionInspection.records,
    runningDelegations: snapshot.items.filter((item) => item.status === 'RUNNING').length,
    terminalDelegations: snapshot.items.filter((item) => isDelegationTerminal(item.status)).length,
    valid: issues.length === 0,
    issues
  };
}

export async function runBackgroundExecutor(projectRoot: string, options: BackgroundExecutorRunOptions): Promise<BackgroundExecutorResult> {
  const context = await resolveSddContext(projectRoot, options.branch ? { branch: options.branch, branchSource: 'cli_option' } : {});
  const branch = context.partition;
  const agent = options.agent ?? 'implementer';
  const workerAdapterId = options.workerAdapterId ?? 'sdd-cli-task-worker';
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  const runState = options.runId ? await readRunState(projectRoot, options.runId) : await createRun(projectRoot);
  const boundRunState = await bindRunStateToTaskContext(projectRoot, runState, context, model, inspected.task ?? null, options.taskId);
  const runId = boundRunState.runId;
  const worker = await inspectWorkerAdapterContract(projectRoot, workerAdapterId);
  const issues: ContractValidationIssue[] = [];

  if (!worker) {
    issues.push(contractIssue('workerAdapterId', `Worker adapter ${workerAdapterId} is not declared.`, 'Use a worker adapter declared by the Phase 3.5 worker adapter contract.'));
  }
  if (worker?.kind === 'manual_handoff') {
    issues.push(contractIssue('workerAdapterId', `Worker adapter ${workerAdapterId} is manual handoff only.`, 'Use a runnable worker adapter for background executor claim/run/ingest.'));
  }

  const route = await routeSddTask(projectRoot, { taskId: options.taskId, branch, agent, approved: options.approved });
  if (!inspected.task || inspected.gaps.some((gap) => gap.severity === 'blocking')) {
    issues.push(...inspected.gaps.map((gap) => contractIssue(gap.field, gap.message, gap.recommendation)));
  }
  if (route.blockedReason) {
    issues.push(contractIssue('agent_router', route.blockedReason, route.nextAction));
  }
  if (route.toolPermission?.policy === 'deny') {
    issues.push(contractIssue('tool_permission', 'Agent router denied required tool permission for this task.', 'Change task scope, tool policy, or route through a permitted profile before execution.'));
  }

  const decision = await inspectWorktreeIsolation(projectRoot, { branch, taskId: options.taskId, capabilityId: worker?.capabilityId ?? 'sdd-cli' });
  if (decision.mode === 'blocked' || decision.mode === 'manual' && options.approved !== true) {
    for (const reason of decision.reasons) {
      issues.push(contractIssue('isolation', reason, 'Resolve isolation gates or pass --approved after explicit user approval before running the background executor.'));
    }
  }

  const delegationId = options.delegationId ?? `B-${options.taskId}-${agent}-001`;
  const expectedArtifact = options.artifactPath ? getRunRelativeArtifactPath(toArtifactRootRelativePath(options.artifactPath)) : `artifacts/${agent}-${options.taskId}.md`;
  const existingDelegation = boundRunState.delegations[delegationId];
  if (existingDelegation && isDelegationTerminal(existingDelegation.status)) {
    issues.push(contractIssue('delegationId', `Delegation ${delegationId} is already terminal.`, 'Create a new delegation id for retry instead of reopening a terminal delegation.'));
  }

  const governance = await evaluateGovernancePolicy(projectRoot, {
    operation: 'background_executor',
    runId,
    taskId: options.taskId,
    workerAdapterId,
    riskTags: inspected.task?.risk ?? [],
    approved: options.approved,
    excludeQueueItemId: `${runId}:${delegationId}`
  });
  if (!governance.allowed) {
    issues.push(...governance.issues);
    await appendEvent(projectRoot, runId, { event: 'governance_policy_blocked', runId, summary: `Governance policy blocked background executor for ${options.taskId}`, data: { taskId: options.taskId, delegationId, decision: governance } });
  }

  if (issues.length > 0) {
    await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
      runId,
      taskId: options.taskId,
      agent,
      route,
      status: 'blocked',
      delegationId,
      queueItemId: null,
      artifactPath: options.artifactPath ?? null,
      evidenceSummary: `Background executor blocked before delegation claim with ${issues.length} issue(s).`
    }));
    await appendEvent(projectRoot, runId, { event: 'background_executor_blocked', runId, summary: `Background executor blocked for ${options.taskId}`, data: { taskId: options.taskId, delegationId, issues } });
    return {
      version: BACKGROUND_EXECUTOR_CONTRACT_VERSION,
      runId,
      taskId: options.taskId,
      delegationId: null,
      queueItemId: null,
      workerAdapterId,
      status: 'blocked',
      artifactPath: options.artifactPath ?? null,
      ingestion: null,
      issues,
      hostInvocation: null,
      message: 'Background executor blocked before delegation claim.'
    };
  }

  await ensureExecutionOrchestration(projectRoot, model, inspected.task ?? null, {
    branch,
    runId,
    taskId: options.taskId,
    agent,
    workerKind: worker?.kind ?? null,
    delegationId,
    expectedArtifact,
    dispatchBlocking: worker?.kind === 'claude_code_subagent'
  });

  const delegation = existingDelegation ?? createDelegationRecord({
    delegationId,
    task: options.taskId,
    agent,
    runMode: 'background',
    blocking: true,
    requiredForPhaseExit: true,
    expectedArtifact,
    timeoutSeconds: options.timeoutSeconds
  });
  await persistDelegation(projectRoot, runId, delegation);
  const claimedState = await readRunState(projectRoot, runId);
  await writeRunState(projectRoot, {
    ...claimedState,
    status: 'running',
    phase: 'background',
    currentTask: options.taskId
  });
  await appendEvent(projectRoot, runId, {
    event: existingDelegation ? 'background_executor_resumed' : 'delegation_started',
    runId,
    summary: `Background executor claimed ${delegationId} for ${options.taskId}`,
    data: { delegationId, taskId: options.taskId, agent, workerAdapterId, expectedArtifact, queueItemId: `${runId}:${delegationId}` }
  });
  await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
    runId,
    taskId: options.taskId,
    agent,
    route,
    status: 'claimed',
    delegationId,
    queueItemId: `${runId}:${delegationId}`,
    evidenceSummary: `Background executor claimed ${delegationId}; host execution remains provenance until artifact ingestion.`
  }));

  let hostInvocation: HostInvocationResult | null = null;
  let artifactPath = options.artifactPath ?? null;

  if (!artifactPath && worker?.kind === 'claude_code_subagent') {
    hostInvocation = await invokeClaudeCodeSubagentHost({
      projectRoot,
      runId,
      taskId: options.taskId,
      agent,
      delegationId,
      queueItemId: `${runId}:${delegationId}`,
      expectedArtifact,
      timeoutSeconds: options.timeoutSeconds,
      commandOptions: options.hostInvocation
    });
    artifactPath = hostInvocation.artifactPath;
    await appendEvent(projectRoot, runId, {
      event: 'host_invocation_completed',
      runId,
      summary: `Host invocation completed for ${delegationId}`,
      data: { delegationId, taskId: options.taskId, workerAdapterId, artifactPath, exitCode: hostInvocation.exitCode, signal: hostInvocation.signal, timedOut: hostInvocation.timedOut }
    });
  }

  if (!artifactPath) {
    return {
      version: BACKGROUND_EXECUTOR_CONTRACT_VERSION,
      runId,
      taskId: options.taskId,
      delegationId,
      queueItemId: `${runId}:${delegationId}`,
      workerAdapterId,
      status: 'claimed',
      artifactPath: null,
      ingestion: null,
      hostInvocation: null,
      issues: [],
      message: `Background executor claimed ${delegationId}; provide ${expectedArtifact} and rerun with --artifact to ingest terminal evidence.`
    };
  }

  const ingestion = await ingestArtifactResult(projectRoot, runId, { delegationId, artifactPath });
  const executorStatus = ingestion.valid ? ingestion.record.delegationStatus === 'COMPLETED' ? 'completed' : 'failed' : 'blocked';
  await completeExecutionOrchestration(projectRoot, model, inspected.task ?? null, {
    branch,
    runId,
    taskId: options.taskId,
    agent,
    workerKind: worker?.kind ?? null,
    delegationId,
    expectedArtifact,
    artifactPath: ingestion.record.artifactPath,
    resultStatus: ingestion.record.resultStatus,
    completed: executorStatus === 'completed',
    dispatchBlocking: worker?.kind === 'claude_code_subagent'
  });
  const ingestedState = await readRunState(projectRoot, runId);
  await writeRunState(projectRoot, {
    ...ingestedState,
    status: executorStatus === 'completed' ? 'completed' : executorStatus === 'failed' ? 'failed' : 'blocked',
    phase: 'background',
    currentTask: options.taskId
  });
  await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
    runId,
    taskId: options.taskId,
    agent,
    route,
    status: executorStatus,
    delegationId,
    queueItemId: `${runId}:${delegationId}`,
    ingestion: ingestion.record,
    evidenceSummary: ingestion.valid ? `Background executor ingested terminal artifact for ${delegationId}.` : `Background executor artifact ingestion blocked for ${delegationId}.`
  }));
  return {
    version: BACKGROUND_EXECUTOR_CONTRACT_VERSION,
    runId,
    taskId: options.taskId,
    delegationId,
    queueItemId: `${runId}:${delegationId}`,
    workerAdapterId,
    status: executorStatus,
    artifactPath: ingestion.record.artifactPath,
    ingestion: ingestion.record,
    hostInvocation,
    issues: ingestion.record.issues,
    message: ingestion.valid ? `Background executor ingested terminal artifact for ${delegationId}.` : `Background executor artifact ingestion blocked for ${delegationId}.`
  };
}
