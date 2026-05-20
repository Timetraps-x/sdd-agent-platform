import {
  GOVERNANCE_POLICY_CONTRACT_VERSION
} from '../contracts.js';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';
import { readFile } from 'node:fs/promises';
import { listDelegationQueueItems } from '../delegation/queue.js';
import { readAllRunStates } from '../run-state/run-state.js';

export type GovernancePolicyOperation = 'background_executor' | 'wave_executor' | 'sync_back_apply' | 'destructive_git' | 'external_interaction' | 'cleanup';
export type GovernancePolicyDecisionStatus = 'allow' | 'block' | 'confirm';

export interface GovernancePolicy {
  version: typeof GOVERNANCE_POLICY_CONTRACT_VERSION;
  concurrency: {
    maxBackgroundDelegations: number;
    maxWaveExecutors: number;
  };
  manualConfirmation: {
    operations: GovernancePolicyOperation[];
    workerAdapters: string[];
    riskTags: string[];
  };
  cleanup: {
    archiveOnly: true;
    deleteRunHistory: false;
  };
  retry: {
    reopenTerminalDelegation: false;
    maxAttemptsPerDelegation: number;
  };
  stopConditions: string[];
  audit: {
    requiredEvents: string[];
    requiredEvidence: string[];
  };
}

export interface GovernancePolicyDecisionInput {
  operation: GovernancePolicyOperation;
  runId?: string;
  taskId?: string;
  workerAdapterId?: string;
  riskTags?: string[];
  approved?: boolean;
  excludeQueueItemId?: string;
}

export interface GovernancePolicyIssue {
  field: string;
  message: string;
  recommendation: string;
}

export interface GovernancePolicyDecision {
  version: typeof GOVERNANCE_POLICY_CONTRACT_VERSION;
  operation: GovernancePolicyOperation;
  status: GovernancePolicyDecisionStatus;
  allowed: boolean;
  reasons: string[];
  issues: GovernancePolicyIssue[];
  policy: GovernancePolicy;
}

const BUILT_IN_GOVERNANCE_POLICY: GovernancePolicy = {
  version: GOVERNANCE_POLICY_CONTRACT_VERSION,
  concurrency: {
    maxBackgroundDelegations: 4,
    maxWaveExecutors: 1
  },
  manualConfirmation: {
    operations: ['sync_back_apply', 'destructive_git', 'external_interaction', 'cleanup'],
    workerAdapters: ['manual-handoff-worker'],
    riskTags: ['database', 'security', 'permission', 'external', 'destructive-git', 'data-loss']
  },
  cleanup: {
    archiveOnly: true,
    deleteRunHistory: false
  },
  retry: {
    reopenTerminalDelegation: false,
    maxAttemptsPerDelegation: 1
  },
  stopConditions: ['manual_confirmation_required', 'concurrency_limit_reached', 'terminal_delegation_reopen', 'planner_manual_gate', 'invalid_artifact_evidence'],
  audit: {
    requiredEvents: ['governance_policy_blocked', 'governance_policy_confirmed'],
    requiredEvidence: ['policy version', 'operation', 'decision status', 'reason']
  }
};

export async function inspectGovernancePolicy(projectRoot: string): Promise<GovernancePolicy> {
  await assertProjectConfigReadable(projectRoot);
  return {
    ...BUILT_IN_GOVERNANCE_POLICY,
    concurrency: { ...BUILT_IN_GOVERNANCE_POLICY.concurrency },
    manualConfirmation: {
      operations: [...BUILT_IN_GOVERNANCE_POLICY.manualConfirmation.operations],
      workerAdapters: [...BUILT_IN_GOVERNANCE_POLICY.manualConfirmation.workerAdapters],
      riskTags: [...BUILT_IN_GOVERNANCE_POLICY.manualConfirmation.riskTags]
    },
    cleanup: { ...BUILT_IN_GOVERNANCE_POLICY.cleanup },
    retry: { ...BUILT_IN_GOVERNANCE_POLICY.retry },
    stopConditions: [...BUILT_IN_GOVERNANCE_POLICY.stopConditions],
    audit: {
      requiredEvents: [...BUILT_IN_GOVERNANCE_POLICY.audit.requiredEvents],
      requiredEvidence: [...BUILT_IN_GOVERNANCE_POLICY.audit.requiredEvidence]
    }
  };
}

export async function evaluateGovernancePolicy(projectRoot: string, input: GovernancePolicyDecisionInput): Promise<GovernancePolicyDecision> {
  const policy = await inspectGovernancePolicy(projectRoot);
  const issues: GovernancePolicyIssue[] = [];
  const reasons: string[] = [];
  const queue = await listDelegationQueueItems(projectRoot);
  const runningDelegations = queue.items.filter((item) => item.status === 'RUNNING' && item.id !== input.excludeQueueItemId).length;
  const runningWaveExecutors = (await readAllRunStates(projectRoot)).filter((state) => state.status === 'running' && state.phase === 'wave').length;

  if ((input.operation === 'background_executor' || input.operation === 'wave_executor') && runningDelegations >= policy.concurrency.maxBackgroundDelegations) {
    const reason = `Running delegation count ${runningDelegations} reached governance limit ${policy.concurrency.maxBackgroundDelegations}.`;
    reasons.push(reason);
    issues.push(governanceIssue('governance.concurrency', reason, 'Wait for existing delegations to finish, archive stale exploratory runs, or inspect governance policy before starting more background work.'));
  }
  if (input.operation === 'wave_executor' && runningWaveExecutors >= policy.concurrency.maxWaveExecutors) {
    const reason = `Running wave executor count ${runningWaveExecutors} reached governance limit ${policy.concurrency.maxWaveExecutors}.`;
    reasons.push(reason);
    issues.push(governanceIssue('governance.wave_concurrency', reason, 'Wait for the running wave executor to finish or archive the stale run before starting another wave.'));
  }

  const confirmationReasons: string[] = [];
  if (policy.manualConfirmation.operations.includes(input.operation)) {
    confirmationReasons.push(`Operation ${input.operation} requires explicit confirmation.`);
  }
  if (input.workerAdapterId && policy.manualConfirmation.workerAdapters.includes(input.workerAdapterId)) {
    confirmationReasons.push(`Worker adapter ${input.workerAdapterId} requires manual confirmation.`);
  }
  const riskHits = (input.riskTags ?? []).filter((tag) => policy.manualConfirmation.riskTags.includes(tag));
  if (riskHits.length > 0) {
    confirmationReasons.push(`Risk tag(s) require confirmation: ${riskHits.join(', ')}.`);
  }
  if (confirmationReasons.length > 0 && !input.approved) {
    reasons.push(...confirmationReasons);
    for (const reason of confirmationReasons) {
      issues.push(governanceIssue('governance.confirmation', reason, 'Get explicit user confirmation before continuing this governed operation.'));
    }
  }
  if (confirmationReasons.length > 0 && input.approved) {
    reasons.push(...confirmationReasons.map((reason) => `${reason} Approval recorded.`));
  }

  const status: GovernancePolicyDecisionStatus = issues.length > 0
    ? confirmationReasons.length > 0 && issues.every((issue) => issue.field === 'governance.confirmation')
      ? 'confirm'
      : 'block'
    : 'allow';
  return {
    version: GOVERNANCE_POLICY_CONTRACT_VERSION,
    operation: input.operation,
    status,
    allowed: status === 'allow',
    reasons: reasons.length > 0 ? reasons : [`Operation ${input.operation} is allowed by governance policy.`],
    issues,
    policy
  };
}

function governanceIssue(field: string, message: string, recommendation: string): GovernancePolicyIssue {
  return { field, message, recommendation };
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
