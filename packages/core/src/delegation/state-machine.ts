export const DELEGATION_STATE_MACHINE_VERSION = 'phase-3.4-delegation-state-machine-v1';

export type DelegationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED' | 'RECOVERABLE' | 'STALE';

export interface ContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

export interface DelegationStateTransition {
  from: DelegationStatus;
  to: DelegationStatus;
  event: string;
  terminal: boolean;
}

export interface DelegationStateMachine {
  version: string;
  statuses: DelegationStatus[];
  terminalStatuses: DelegationStatus[];
  transitions: DelegationStateTransition[];
}

export interface DelegationStateTransitionValidation {
  valid: boolean;
  from: DelegationStatus;
  to: DelegationStatus;
  event: string | null;
  issues: ContractValidationIssue[];
}

export const DELEGATION_STATUSES: DelegationStatus[] = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED', 'RECOVERABLE', 'STALE'];
export const TERMINAL_DELEGATION_STATUSES: DelegationStatus[] = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'];

const DELEGATION_STATE_TRANSITIONS: DelegationStateTransition[] = [
  { from: 'PENDING', to: 'RUNNING', event: 'delegation_started', terminal: false },
  { from: 'PENDING', to: 'CANCELLED', event: 'delegation_cancelled', terminal: true },
  { from: 'RUNNING', to: 'COMPLETED', event: 'delegation_completed', terminal: true },
  { from: 'RUNNING', to: 'FAILED', event: 'delegation_failed', terminal: true },
  { from: 'RUNNING', to: 'TIMED_OUT', event: 'delegation_timeout', terminal: true },
  { from: 'RUNNING', to: 'CANCELLED', event: 'delegation_cancelled', terminal: true },
  { from: 'RUNNING', to: 'RECOVERABLE', event: 'artifact_invalid', terminal: false },
  { from: 'RUNNING', to: 'STALE', event: 'delegation_stale', terminal: false },
  { from: 'RECOVERABLE', to: 'RUNNING', event: 'delegation_retry_started', terminal: false },
  { from: 'RECOVERABLE', to: 'FAILED', event: 'delegation_failed', terminal: true },
  { from: 'RECOVERABLE', to: 'CANCELLED', event: 'delegation_cancelled', terminal: true },
  { from: 'STALE', to: 'RUNNING', event: 'delegation_heartbeat', terminal: false },
  { from: 'STALE', to: 'TIMED_OUT', event: 'delegation_timeout', terminal: true },
  { from: 'STALE', to: 'FAILED', event: 'delegation_failed', terminal: true },
  { from: 'STALE', to: 'CANCELLED', event: 'delegation_cancelled', terminal: true }
];

export function getDelegationStateMachine(): DelegationStateMachine {
  return {
    version: DELEGATION_STATE_MACHINE_VERSION,
    statuses: [...DELEGATION_STATUSES],
    terminalStatuses: [...TERMINAL_DELEGATION_STATUSES],
    transitions: DELEGATION_STATE_TRANSITIONS.map((transition) => ({ ...transition }))
  };
}

export function validateDelegationStateTransition(from: DelegationStatus, to: DelegationStatus, event: string | null = null): DelegationStateTransitionValidation {
  const issues: ContractValidationIssue[] = [];
  if (!DELEGATION_STATUSES.includes(from)) {
    issues.push(contractIssue('from', `Unsupported delegation status ${from}.`, 'Use a status declared by the Phase 3.4 delegation state machine.'));
  }
  if (!DELEGATION_STATUSES.includes(to)) {
    issues.push(contractIssue('to', `Unsupported delegation status ${to}.`, 'Use a status declared by the Phase 3.4 delegation state machine.'));
  }
  if (TERMINAL_DELEGATION_STATUSES.includes(from)) {
    issues.push(contractIssue('from', `Terminal delegation status ${from} cannot transition to ${to}.`, 'Create a new delegation id for retry instead of reopening a terminal delegation.'));
  }
  const transition = DELEGATION_STATE_TRANSITIONS.find((candidate) => candidate.from === from && candidate.to === to && (event === null || candidate.event === event));
  if (!transition) {
    const eventText = event === null ? '' : ` on ${event}`;
    issues.push(contractIssue('transition', `Transition ${from} -> ${to}${eventText} is not allowed.`, 'Use one of the declared Phase 3.4 delegation state machine transitions.'));
  }
  return {
    valid: issues.length === 0,
    from,
    to,
    event,
    issues
  };
}

function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
}
