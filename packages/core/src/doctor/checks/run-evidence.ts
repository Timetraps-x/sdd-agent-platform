import { readdir } from 'node:fs/promises';
import { inspectArtifactResultIngestions } from '../../artifacts/ingestion.js';
import { messageFromError } from '../../contracts/issues.js';
import type { DelegationStatus } from '../../delegation/model.js';
import { validateDelegationStateTransition } from '../../delegation/state-machine.js';
import { isDelegationTerminal, validateDelegationRecord } from '../../delegation/validation.js';
import { listAgentExecutionRecords, listTeamSessionRecords } from '../../execution/agent-execution-records.js';
import { listResidentWorkerRuntimes } from '../../execution/resident-worker.js';
import { branchToSafePartition } from '../../path-safety.js';
import { listInvocationLedgerEntries } from '../../run-state/invocation-ledger.js';
import type { RunState, RuntimeEvent } from '../../run-state/model.js';
import { readRunEvents } from '../../run-state/events.js';
import { readRunState } from '../../run-state/run-state.js';
import { getRunsDir } from '../../runtime-paths.js';
import type { AgentProfileId } from '../../router/agent-runtime.js';
import { inspectWorktreeLifecycle } from '../../worktree/lifecycle.js';
import type { DoctorCheck } from '../model.js';
import { validateAgentExecutionRecordShape, validateTeamSessionRecordShape } from './run-records.js';
import { inspectRunTrustEvidence } from './run-trust.js';

export async function inspectRunEvidence(projectRoot: string, options: { allRuns?: boolean; latestOnly?: boolean; branch?: string | null } = {}): Promise<DoctorCheck[]> {
  const runsDir = getRunsDir(projectRoot);
  const entries = await readdir(runsDir, { withFileTypes: true });
  const runDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const checks: DoctorCheck[] = [];
  const states: Array<{ runId: string; state: RunState }> = [];
  const unreadableRunIds: string[] = [];
  let issueCount = 0;

  for (const runId of runDirs) {
    try {
      states.push({ runId, state: await readRunState(projectRoot, runId) });
    } catch {
      unreadableRunIds.push(runId);
    }
  }

  const branchPartition = options.branch ? branchToSafePartition(options.branch) : null;
  const scopedStates = branchPartition
    ? states.filter((entry) => runStateMatchesPartition(entry.state, branchPartition))
    : states;
  const nonArchived = scopedStates.filter((entry) => entry.state.status !== 'archived');
  let inspected = options.allRuns ? scopedStates : nonArchived;
  if (!options.allRuns && options.latestOnly && inspected.length > 0) {
    inspected = [inspected.slice().sort((left, right) => Date.parse(right.state.updatedAt) - Date.parse(left.state.updatedAt))[0]];
  }
  const inspectedRunIds = new Set(inspected.map((entry) => entry.runId));
  const skippedArchived = scopedStates.length - nonArchived.length;
  const skippedByScope = scopedStates.filter((entry) => !inspectedRunIds.has(entry.runId) && entry.state.status !== 'archived').length;

  if (skippedArchived > 0 && !options.allRuns) {
    checks.push({ level: 'PASS', check: 'run_evidence_scope', message: `Skipped ${skippedArchived} archived run(s); use sdd doctor --all-runs for historical audit.` });
  }
  if (options.latestOnly && !options.allRuns && skippedByScope > 0) {
    checks.push({ level: 'PASS', check: 'run_evidence_scope', message: `Latest-only doctor inspected 1 run and skipped ${skippedByScope} older non-archived run(s).` });
  }
  if (options.allRuns && skippedArchived > 0) {
    checks.push({ level: 'PASS', check: 'run_evidence_scope', message: `All-runs doctor includes ${skippedArchived} archived run(s).` });
  }

  for (const { runId } of inspected) {
    try {
      const state = await readRunState(projectRoot, runId);
      const events = await readRunEvents(projectRoot, runId);
      const terminalDelegationIds = terminalDelegationIdsFromEvents(events);
      const transitionChecks = inspectRuntimeDelegationTransitions(runId, events);
      issueCount += transitionChecks.length;
      checks.push(...transitionChecks);
      const ingestionInspection = await inspectArtifactResultIngestions(projectRoot, runId);
      for (const issue of ingestionInspection.issues) {
        issueCount += 1;
        checks.push({ level: 'FAIL', check: 'artifact_result_ingestion', message: `${runId}: ${issue.message}`, action: issue.recommendation });
      }
      const worktreeInspection = await inspectWorktreeLifecycle(projectRoot, runId);
      for (const issue of worktreeInspection.issues) {
        issueCount += 1;
        checks.push({ level: 'FAIL', check: 'worktree_lifecycle', message: `${runId}: ${issue.message}`, action: issue.recommendation });
      }
      const agentExecutionRecords = await listAgentExecutionRecords(projectRoot, runId);
      const teamSessionRecords = await listTeamSessionRecords(projectRoot, runId);
      const workerRuntimeList = await listResidentWorkerRuntimes(projectRoot, { runId });
      const routePreflightEvents = events.filter((event) => event.event === 'agent_router_preflight');
      const invocationLedger = await listInvocationLedgerEntries(projectRoot, runId);
      for (const record of agentExecutionRecords) {
        for (const issue of validateAgentExecutionRecordShape(runId, record)) {
          issueCount += 1;
          checks.push({ level: 'FAIL', check: 'agent_execution_record', message: `${runId}/${record.executionId ?? 'unknown'}: ${issue.message}`, action: issue.recommendation });
        }
        const delegation = record.delegationId ? state.delegations[record.delegationId] : null;
        if (delegation) {
          const expectedProfile = toAgentProfileId(delegation.agent);
          if (record.taskId !== delegation.task) {
            issueCount += 1;
            checks.push({ level: 'FAIL', check: 'agent_route_consistency', message: `${runId}/${record.executionId}: execution task ${record.taskId} does not match delegation task ${delegation.task}.`, action: 'Persist per-delegation execution records from the matching route decision.' });
          }
          if (expectedProfile && (record.profile !== expectedProfile || record.toolPermission?.profile !== expectedProfile || record.routeDecision.recommendedProfile !== expectedProfile)) {
            issueCount += 1;
            checks.push({ level: 'FAIL', check: 'agent_route_consistency', message: `${runId}/${record.executionId}: execution profile/tool-permission/route does not match delegation agent ${delegation.agent}.`, action: 'Route each delegation independently and persist matching profile, tool permission, and route decision.' });
          }
        }
      }
      for (const record of teamSessionRecords) {
        for (const issue of validateTeamSessionRecordShape(runId, record)) {
          issueCount += 1;
          checks.push({ level: 'FAIL', check: 'team_session_record', message: `${runId}/${record.teamId ?? 'unknown'}: ${issue.message}`, action: issue.recommendation });
        }
      }
      for (const issue of workerRuntimeList.issues) {
        issueCount += 1;
        checks.push({ level: 'WARN', check: 'resident_worker_runtime', message: `${runId}: ${issue.message}`, action: issue.recommendation });
      }
      if (workerRuntimeList.runtimes.length > 0 && workerRuntimeList.issues.length === 0) {
        checks.push({ level: 'PASS', check: 'resident_worker_runtime', message: `${runId}: inspected ${workerRuntimeList.runtimes.length} resident worker runtime(s); active=${workerRuntimeList.activeRuntimes} stale=${workerRuntimeList.staleRuntimes} terminal=${workerRuntimeList.terminalRuntimes}.` });
      }
      if (routePreflightEvents.length > 0 && agentExecutionRecords.length === 0) {
        issueCount += 1;
        checks.push({ level: 'FAIL', check: 'agent_execution_record', message: `${runId}: agent_router_preflight exists but no AgentExecutionRecord was persisted.`, action: 'Persist blocked/skipped/claimed/completed execution provenance under .sdd/runs/<run_id>/agent-executions/.' });
      }
      if (routePreflightEvents.some(routePreflightNeedsTeamSession) && teamSessionRecords.length === 0) {
        issueCount += 1;
        checks.push({ level: 'FAIL', check: 'team_session_record', message: `${runId}: team-mode preflight exists but no TeamSessionRecord was persisted.`, action: 'Persist team-mode provenance under .sdd/runs/<run_id>/team-sessions/.' });
      }
      for (const delegation of Object.values(state.delegations).filter((candidate) => isDelegationTerminal(candidate.status))) {
        if (agentExecutionRecords.length > 0 && !agentExecutionRecords.some((record) => record.delegationId === delegation.delegationId)) {
          issueCount += 1;
          checks.push({ level: delegation.requiredForPhaseExit ? 'FAIL' : 'WARN', check: 'agent_execution_record', message: `${runId}/${delegation.delegationId} is terminal but has no matching AgentExecutionRecord.`, action: 'Persist host execution provenance before verify/doctor treats the run as complete.' });
        }
      }
      if (agentExecutionRecords.length > 0 || teamSessionRecords.length > 0 || routePreflightEvents.length > 0) {
        checks.push({ level: 'PASS', check: 'agent_team_execution_records', message: `${runId}: inspected ${agentExecutionRecords.length} agent execution record(s), ${teamSessionRecords.length} team session record(s), and ${routePreflightEvents.length} router preflight event(s).` });
      }
      for (const check of await inspectRunTrustEvidence(projectRoot, state, invocationLedger)) {
        issueCount += check.level === 'PASS' ? 0 : 1;
        checks.push(check);
      }
      for (const delegation of Object.values(state.delegations)) {
        const report = await validateDelegationRecord(projectRoot, runId, delegation);
        if (report.stale) {
          issueCount += 1;
          checks.push({ level: delegation.blocking ? 'FAIL' : 'WARN', check: 'stale_delegation', message: `${runId}/${delegation.delegationId} is RUNNING past timeout.`, action: 'Record a recovery proposal; do not auto-fix or mark completed.' });
        }
        if (delegation.terminalEventRequired && isDelegationTerminal(delegation.status) && !terminalDelegationIds.has(delegation.delegationId)) {
          issueCount += 1;
          checks.push({ level: delegation.requiredForPhaseExit ? 'FAIL' : 'WARN', check: 'terminal_event_missing', message: `${runId}/${delegation.delegationId} is ${delegation.status} but has no terminal delegation event.`, action: 'Append correct terminal event through runtime or inspect the run manually.' });
        }
        for (const issue of report.issues) {
          if (issue.field === 'status' && !report.stale) {
            issueCount += 1;
            checks.push({ level: delegation.requiredForPhaseExit ? 'FAIL' : 'WARN', check: 'delegation_state_machine', message: `${runId}/${delegation.delegationId}: ${issue.message}`, action: issue.recommendation });
          } else if (issue.field !== 'status' && issue.field !== 'terminalEventAt') {
            issueCount += 1;
            checks.push({ level: delegation.requiredForPhaseExit ? 'FAIL' : 'WARN', check: 'artifact_invalid', message: `${runId}/${delegation.delegationId}: ${issue.message}`, action: issue.recommendation });
          }
        }
      }
      for (const event of events.filter((candidate) => candidate.event === 'delegation_started')) {
        const delegationId = String(event.data?.delegationId ?? '');
        if (delegationId && !terminalDelegationIds.has(delegationId)) {
          const delegation = state.delegations[delegationId];
          if (!delegation || !isDelegationTerminal(delegation.status)) {
            issueCount += 1;
            checks.push({ level: delegation?.blocking === false ? 'WARN' : 'FAIL', check: 'terminal_event_missing', message: `${runId}/${delegationId} has delegation_started without terminal event.`, action: 'Record delegation_completed/delegation_failed/delegation_timeout/delegation_cancelled before phase exit.' });
          }
        }
      }
    } catch (error) {
      issueCount += 1;
      checks.push({ level: 'FAIL', check: 'run_state', message: `Cannot inspect run ${runId}: ${messageFromError(error)}`, action: 'Inspect state.json/events.jsonl manually; doctor does not auto-fix.' });
    }
  }

  for (const runId of unreadableRunIds) {
    if (options.allRuns || inspectedRunIds.has(runId)) {
      issueCount += 1;
      checks.push({ level: 'FAIL', check: 'run_state', message: `Cannot inspect run ${runId}.`, action: 'Inspect state.json/events.jsonl manually; doctor does not auto-fix.' });
    }
  }

  if (runDirs.length === 0) {
    checks.push({ level: 'WARN', check: 'run_evidence', message: 'No runs found under .sdd/runs.', action: 'Create a run before /sdd-do or /sdd-verify.' });
  } else if (inspected.length === 0 && issueCount === 0) {
    checks.push({ level: 'WARN', check: 'run_evidence', message: branchPartition ? `No non-archived runs were inspected for branch ${branchPartition}.` : 'No non-archived runs were inspected.', action: 'Use sdd doctor --all-runs to audit archived history or create a new run.' });
  } else if (issueCount === 0) {
    checks.push({ level: 'PASS', check: 'run_evidence', message: `Inspected ${inspected.length} run(s); no stale delegation, invalid artifact, terminal event gap, trust evidence, or resident worker runtime issue found.` });
  }
  return checks;
}

function routePreflightNeedsTeamSession(event: RuntimeEvent): boolean {
  const decision = event.data?.decision;
  if (!isRecord(decision)) {
    return false;
  }
  const teamMode = decision.teamMode;
  return isRecord(teamMode) && (teamMode.decision === 'enabled' || teamMode.decision === 'blocked');
}

function runStateMatchesPartition(state: RunState, partition: string): boolean {
  if (state.partition === partition) {
    return true;
  }
  return state.gitBranch ? branchToSafePartition(state.gitBranch) === partition : false;
}

function terminalDelegationIdsFromEvents(events: RuntimeEvent[]): Set<string> {
  const terminalEvents = new Set(['delegation_completed', 'delegation_failed', 'delegation_timeout', 'delegation_cancelled']);
  const ids = new Set<string>();
  for (const event of events) {
    if (terminalEvents.has(event.event)) {
      const delegationId = event.data?.delegationId;
      if (typeof delegationId === 'string' && delegationId.length > 0) {
        ids.add(delegationId);
      }
    }
  }
  return ids;
}

function inspectRuntimeDelegationTransitions(runId: string, events: RuntimeEvent[]): DoctorCheck[] {
  const statusByDelegation = new Map<string, DelegationStatus>();
  const checks: DoctorCheck[] = [];
  for (const event of events) {
    const delegationId = event.data?.delegationId;
    if (typeof delegationId !== 'string' || delegationId.length === 0) {
      continue;
    }
    const nextStatus = delegationStatusFromRuntimeEvent(event.event);
    if (!nextStatus) {
      continue;
    }
    const currentStatus = statusByDelegation.get(delegationId) ?? 'PENDING';
    const validation = validateDelegationStateTransition(currentStatus, nextStatus, event.event);
    if (!validation.valid) {
      checks.push({
        level: 'FAIL',
        check: 'delegation_state_transition',
        message: `${runId}/${delegationId} cannot transition ${currentStatus} -> ${nextStatus} on ${event.event}.`,
        action: validation.issues[0]?.recommendation ?? 'Use a declared Phase 3.4 delegation state transition.'
      });
      continue;
    }
    statusByDelegation.set(delegationId, nextStatus);
  }
  return checks;
}

function delegationStatusFromRuntimeEvent(event: string): DelegationStatus | null {
  if (event === 'delegation_started' || event === 'delegation_retry_started' || event === 'delegation_heartbeat') {
    return 'RUNNING';
  }
  if (event === 'delegation_completed') {
    return 'COMPLETED';
  }
  if (event === 'delegation_failed') {
    return 'FAILED';
  }
  if (event === 'delegation_timeout') {
    return 'TIMED_OUT';
  }
  if (event === 'delegation_cancelled') {
    return 'CANCELLED';
  }
  if (event === 'artifact_invalid') {
    return 'RECOVERABLE';
  }
  if (event === 'delegation_stale') {
    return 'STALE';
  }
  return null;
}

function toAgentProfileId(agent: string): AgentProfileId | null {
  const normalized = agent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
