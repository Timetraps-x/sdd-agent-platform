import {
  AGENT_EXECUTION_RECORD_CONTRACT_VERSION,
  AGENT_ROUTER_CONTRACT_VERSION,
  TEAM_MODE_POLICY_VERSION,
  TEAM_SESSION_RECORD_CONTRACT_VERSION
} from '../../contracts.js';
import { contractIssue, type ContractValidationIssue } from '../../contracts/issues.js';
import type { AgentExecutionRecord, AgentExecutionRecordStatus, TeamSessionRecord, TeamSessionRecordStatus } from '../../router/agent-runtime.js';

export function validateAgentExecutionRecordShape(runId: string, record: AgentExecutionRecord): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (record.version !== AGENT_EXECUTION_RECORD_CONTRACT_VERSION) {
    issues.push(contractIssue('version', `Expected ${AGENT_EXECUTION_RECORD_CONTRACT_VERSION}.`, 'Rewrite the execution record through the Phase 6 runtime record writer.'));
  }
  if (record.runId !== runId) {
    issues.push(contractIssue('runId', `Expected runId ${runId}.`, 'Keep agent execution records under the matching run directory.'));
  }
  if (!record.executionId) {
    issues.push(contractIssue('executionId', 'Agent execution record is missing executionId.', 'Persist the record with a stable execution id.'));
  }
  if (!record.taskId) {
    issues.push(contractIssue('taskId', 'Agent execution record is missing taskId.', 'Route execution records through a concrete SDD task.'));
  }
  if (!isAgentExecutionRecordStatus(record.status)) {
    issues.push(contractIssue('status', `Unknown agent execution status ${String(record.status)}.`, 'Use claimed/completed/failed/blocked/skipped.'));
  }
  if (!isStringList(record.capabilitiesUsed)) {
    issues.push(contractIssue('capabilitiesUsed', 'Agent execution capabilities must be a string array.', 'Record capability ids selected by AgentRouterDecision.'));
  }
  if (!isStringList(record.artifacts)) {
    issues.push(contractIssue('artifacts', 'Agent execution artifacts must be a string array.', 'Record run-relative artifact paths.'));
  }
  if (!isRecord(record.routeDecision) || record.routeDecision.version !== AGENT_ROUTER_CONTRACT_VERSION) {
    issues.push(contractIssue('routeDecision', 'Agent execution record must embed the Phase 6 router decision snapshot.', 'Persist records via router preflight or host adapter ingestion.'));
  }
  return issues;
}

export function validateTeamSessionRecordShape(runId: string, record: TeamSessionRecord): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (record.version !== TEAM_SESSION_RECORD_CONTRACT_VERSION) {
    issues.push(contractIssue('version', `Expected ${TEAM_SESSION_RECORD_CONTRACT_VERSION}.`, 'Rewrite the team session record through the Phase 6 runtime record writer.'));
  }
  if (record.runId !== runId) {
    issues.push(contractIssue('runId', `Expected runId ${runId}.`, 'Keep team session records under the matching run directory.'));
  }
  if (!record.teamId) {
    issues.push(contractIssue('teamId', 'Team session record is missing teamId.', 'Persist the record with a stable team id.'));
  }
  if (!isTeamSessionRecordStatus(record.status)) {
    issues.push(contractIssue('status', `Unknown team session status ${String(record.status)}.`, 'Use created/completed/blocked/disabled.'));
  }
  if (!isStringList(record.memberProfiles)) {
    issues.push(contractIssue('memberProfiles', 'Team member profiles must be a string array.', 'Record selected team member profiles from TeamModePolicy.'));
  }
  if (!Array.isArray(record.messages)) {
    issues.push(contractIssue('messages', 'Team messages must be an array.', 'Record structured TeamMessageRecord entries.'));
  }
  if (!isRecord(record.teamMode) || record.teamMode.version !== TEAM_MODE_POLICY_VERSION) {
    issues.push(contractIssue('teamMode', 'Team session record must embed TeamModePolicy.', 'Persist records via team-mode preflight.'));
  }
  return issues;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAgentExecutionRecordStatus(value: unknown): value is AgentExecutionRecordStatus {
  return value === 'claimed' || value === 'completed' || value === 'failed' || value === 'blocked' || value === 'skipped';
}

function isTeamSessionRecordStatus(value: unknown): value is TeamSessionRecordStatus {
  return value === 'created' || value === 'completed' || value === 'blocked' || value === 'disabled';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
