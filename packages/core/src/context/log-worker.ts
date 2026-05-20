import { LOG_WORKER_SUMMARY_CONTRACT_VERSION } from '../contracts.js';
import type { ContractValidationIssue } from '../delegation/state-machine.js';
import type { ContextSourceRef } from './source-refs.js';

export interface LogWorkerSummary {
  contract: typeof LOG_WORKER_SUMMARY_CONTRACT_VERSION;
  authoritative: false;
  usableForPass: false;
  runId: string;
  taskId: string | null;
  workerId: string;
  sources: ContextSourceRef[];
  highlights: string[];
  forbiddenAuthority: string[];
}

export interface LogWorkerSummaryValidation {
  valid: boolean;
  issues: ContractValidationIssue[];
}

export function validateLogWorkerSummary(summary: LogWorkerSummary): LogWorkerSummaryValidation {
  const issues: ContractValidationIssue[] = [];
  const candidate = summary as LogWorkerSummary & Record<string, unknown>;
  if (candidate.contract !== LOG_WORKER_SUMMARY_CONTRACT_VERSION) {
    issues.push(contractIssue('contract', 'Log worker summary contract is invalid.', `Use ${LOG_WORKER_SUMMARY_CONTRACT_VERSION}.`));
  }
  if (candidate.authoritative !== false) {
    issues.push(contractIssue('authoritative', 'Log worker summary must be non-authoritative.', 'Set authoritative=false and keep workflow decisions in core runtime.'));
  }
  if (candidate.usableForPass !== false) {
    issues.push(contractIssue('usableForPass', 'Log worker summary cannot be used for PASS evidence.', 'Set usableForPass=false and reference source artifacts for PASS evidence.'));
  }
  const forbiddenAuthority = Array.isArray(candidate.forbiddenAuthority) ? candidate.forbiddenAuthority.filter((item) => typeof item === 'string') : [];
  if (forbiddenAuthority.length > 0) {
    issues.push(contractIssue('forbiddenAuthority', `Log worker summary claims forbidden workflow authority: ${forbiddenAuthority.join(', ')}.`, 'Remove PASS/BLOCKED/route/doctor/sync-back decisions from worker summaries.'));
  }
  for (const field of ['status', 'verdict', 'routeDecision', 'doctorVerdict', 'syncBackReady']) {
    if (field in candidate) {
      issues.push(contractIssue(field, `Log worker summary must not expose workflow decision field ${field}.`, 'Keep decision fields in core runtime outputs only.'));
    }
  }
  return { valid: issues.length === 0, issues };
}

function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
}
