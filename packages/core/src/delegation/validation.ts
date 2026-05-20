import { DELEGATION_LIVENESS_CONTRACT, DELEGATION_LIVENESS_VERSION } from '../contracts.js';
import { toArtifactRootRelativePath } from '../runtime-paths.js';
import { validateSddResultArtifact } from '../artifacts/sdd-result.js';
import type { DelegationRecord, DelegationStatus } from './model.js';

export interface ContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

export interface DelegationValidationReport {
  valid: boolean;
  delegation: DelegationRecord;
  terminal: boolean;
  stale: boolean;
  issues: ContractValidationIssue[];
}

export function createDelegationRecord(input: { delegationId: string; task: string; agent: string; expectedArtifact: string; runMode?: DelegationRecord['runMode']; blocking?: boolean; requiredForPhaseExit?: boolean; startedAt?: string; timeoutSeconds?: number; status?: DelegationStatus }): DelegationRecord {
  return {
    contract: DELEGATION_LIVENESS_CONTRACT,
    version: DELEGATION_LIVENESS_VERSION,
    delegationId: input.delegationId,
    task: input.task,
    agent: input.agent,
    runMode: input.runMode ?? 'foreground',
    blocking: input.blocking ?? true,
    requiredForPhaseExit: input.requiredForPhaseExit ?? true,
    status: input.status ?? 'RUNNING',
    startedAt: input.startedAt ?? new Date().toISOString(),
    lastHeartbeatAt: null,
    timeoutSeconds: input.timeoutSeconds ?? 900,
    expectedArtifact: input.expectedArtifact,
    terminalEventRequired: true,
    terminalEventAt: null
  };
}

export function isDelegationTerminal(status: DelegationStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'TIMED_OUT' || status === 'CANCELLED';
}

export function isDelegationStale(delegation: DelegationRecord, now = new Date()): boolean {
  if (delegation.status !== 'RUNNING') {
    return false;
  }
  const heartbeatOrStart = delegation.lastHeartbeatAt ?? delegation.startedAt;
  const timestamp = Date.parse(heartbeatOrStart);
  if (Number.isNaN(timestamp) || delegation.timeoutSeconds <= 0) {
    return true;
  }
  return now.getTime() - timestamp > delegation.timeoutSeconds * 1000;
}

export async function validateDelegationRecord(projectRoot: string, runId: string, delegation: DelegationRecord, now = new Date()): Promise<DelegationValidationReport> {
  const issues: ContractValidationIssue[] = [];
  const terminal = isDelegationTerminal(delegation.status);
  const stale = isDelegationStale(delegation, now);
  issues.push(...validateDelegationShape(delegation));

  if (stale) {
    issues.push(contractIssue('status', `Delegation ${delegation.delegationId} is RUNNING but stale.`, 'Record TIMED_OUT/FAILED/CANCELLED or heartbeat before phase exit.'));
  }
  if (delegation.requiredForPhaseExit && delegation.terminalEventRequired && terminal && !delegation.terminalEventAt) {
    issues.push(contractIssue('terminalEventAt', `Delegation ${delegation.delegationId} is terminal without a terminal event timestamp.`, 'Append and persist the terminal delegation event timestamp.'));
  }
  if (delegation.status === 'COMPLETED') {
    const resultReport = await validateSddResultArtifact(projectRoot, runId, delegation.expectedArtifact, { expectedTask: delegation.task, expectedAgent: delegation.agent });
    issues.push(...resultReport.issues);
  }

  return { valid: issues.length === 0, delegation, terminal, stale, issues };
}

function validateDelegationShape(delegation: DelegationRecord): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (delegation.contract !== DELEGATION_LIVENESS_CONTRACT) {
    issues.push(contractIssue('contract', `Expected ${DELEGATION_LIVENESS_CONTRACT}, got ${delegation.contract}.`, 'Use the delegation liveness contract id.'));
  }
  if (delegation.version !== DELEGATION_LIVENESS_VERSION) {
    issues.push(contractIssue('version', `Expected ${DELEGATION_LIVENESS_VERSION}, got ${delegation.version}.`, 'Use version: 1.3.0 until a new contract version is introduced.'));
  }
  if (!delegation.delegationId) {
    issues.push(contractIssue('delegationId', 'delegationId is required.', 'Persist a stable delegation id.'));
  }
  if (!delegation.task) {
    issues.push(contractIssue('task', 'delegation task is required.', 'Persist the delegated task id.'));
  }
  if (!delegation.agent) {
    issues.push(contractIssue('agent', 'delegation agent is required.', 'Persist the delegated agent name.'));
  }
  if (delegation.runMode !== 'foreground' && delegation.runMode !== 'background') {
    issues.push(contractIssue('runMode', `Unsupported runMode ${delegation.runMode}.`, 'Use foreground or background.'));
  }
  if (!isDelegationStatus(delegation.status)) {
    issues.push(contractIssue('status', `Unsupported delegation status ${delegation.status}.`, 'Use a status from the delegation liveness contract.'));
  }
  if (!Number.isInteger(delegation.timeoutSeconds) || delegation.timeoutSeconds <= 0) {
    issues.push(contractIssue('timeoutSeconds', 'timeoutSeconds must be a positive integer.', 'Set an explicit positive timeout.'));
  }
  validateRunRelativeArtifactReference(delegation.expectedArtifact, issues, 'expectedArtifact');
  return issues;
}

function validateRunRelativeArtifactReference(value: string, issues: ContractValidationIssue[], field = 'artifacts'): void {
  try {
    toArtifactRootRelativePath(value);
  } catch (error) {
    issues.push(contractIssue(field, messageFromError(error), 'Use run-relative artifacts/<file> paths that stay under the run artifact directory.'));
  }
}

function isDelegationStatus(value: string): value is DelegationStatus {
  return value === 'PENDING' || value === 'RUNNING' || value === 'COMPLETED' || value === 'FAILED' || value === 'TIMED_OUT' || value === 'CANCELLED' || value === 'RECOVERABLE' || value === 'STALE';
}

function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
