import type {
  ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION,
  DELEGATION_LIVENESS_CONTRACT,
  DELEGATION_LIVENESS_VERSION,
  EVENT_LOG_CONTRACT,
  INVOCATION_LEDGER_CONTRACT_VERSION,
  LEGACY_LIFECYCLE_DECISION_CONTRACT,
  LIFECYCLE_DECISION_CONTRACT,
  LIFECYCLE_DECISION_VERSION,
  RUN_STATE_CONTRACT,
  RUNTIME_VERSION
} from '../contracts.js';

export type RunStatus = 'created' | 'running' | 'completed' | 'blocked' | 'failed' | 'archived';

export interface ArtifactIndexEntry {
  path: string;
  kind: string;
  task: string | null;
  agent: string | null;
  createdAt: string;
}

export interface RunDocumentSnapshot {
  specHash: string | null;
  planHash: string | null;
  tasksHash: string | null;
  planBasedOnSpecHash: string | null;
  tasksBasedOnPlanHash: string | null;
}

export interface RunStateContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

export interface RunStateTaskGap {
  type: 'Document Gap' | 'Task Gap' | 'Dependency Gap';
  severity: 'blocking' | 'warning';
  taskId: string | null;
  field: string;
  message: string;
  recommendation: string;
}

export interface RunStateLifecycleDecisionRecord {
  contract: typeof LIFECYCLE_DECISION_CONTRACT | typeof LEGACY_LIFECYCLE_DECISION_CONTRACT;
  version?: typeof LIFECYCLE_DECISION_VERSION;
  model_version: string;
  input_summary: Record<string, unknown>;
  decision: {
    profile: string | null;
    confidence: string | null;
    hard_gate_hits: string[];
    required_stages: string[];
    skipped_stages: string[];
    human_checkpoint_required: boolean;
  };
  reasons: string[];
  escalation_triggers: string[];
  downgrade_reason: string | null;
  audit: {
    decided_at: string | null;
    decided_by: string | null;
    policy_version: string;
    source_artifacts: string[];
  };
}

export interface RunStateDelegationRecord {
  contract: typeof DELEGATION_LIVENESS_CONTRACT;
  version: typeof DELEGATION_LIVENESS_VERSION;
  delegationId: string;
  task: string;
  agent: string;
  runMode: 'foreground' | 'background';
  blocking: boolean;
  requiredForPhaseExit: boolean;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED' | 'RECOVERABLE' | 'STALE';
  startedAt: string;
  lastHeartbeatAt: string | null;
  timeoutSeconds: number;
  expectedArtifact: string;
  terminalEventRequired: boolean;
  terminalEventAt?: string | null;
}

export interface RunStateArtifactIngestionRecord {
  contract: typeof ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION;
  runId: string;
  delegationId: string;
  task: string;
  agent: string;
  artifactPath: string;
  status: 'accepted' | 'rejected';
  resultStatus: 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED' | 'TIMED_OUT' | 'CANCELLED' | null;
  delegationStatus: RunStateDelegationRecord['status'] | null;
  ingestedAt: string;
  issues: RunStateContractValidationIssue[];
  gaps: RunStateTaskGap[];
}

export interface RunStateWorktreeLifecycleRecord {
  contract: 'phase-3.8-worktree-lifecycle-v1';
  runId: string;
  taskId: string;
  worktreeId: string;
  status: 'created' | 'kept' | 'removed';
  branchName: string;
  worktreePath: string;
  baseRef: string;
  createdAt: string;
  updatedAt: string;
  removedAt: string | null;
  keepReason: string | null;
  dirty: boolean;
}

export interface RunState {
  contract: typeof RUN_STATE_CONTRACT;
  runtimeVersion: typeof RUNTIME_VERSION;
  runId: string;
  status: RunStatus;
  phase: string | null;
  currentTask: string | null;
  partition: string | null;
  gitBranch: string | null;
  taskId: string | null;
  affectedFiles: string[];
  documentSnapshot: RunDocumentSnapshot;
  createdAt: string;
  updatedAt: string;
  projectRoot: string;
  projectConfigPath: string;
  eventLogPath: string;
  artifactRoot: string;
  lifecycleDecision: RunStateLifecycleDecisionRecord | null;
  tasks: Record<string, unknown>;
  agents: Record<string, unknown>;
  delegations: Record<string, RunStateDelegationRecord>;
  artifacts: ArtifactIndexEntry[];
  artifactIngestions: Record<string, RunStateArtifactIngestionRecord>;
  worktrees: Record<string, RunStateWorktreeLifecycleRecord>;
  validation: {
    status: 'not_run' | 'pass' | 'pass_with_gaps' | 'fail' | 'blocked';
    commands: string[];
    evidence: string[];
  };
  syncBack: {
    mode: 'proposal';
    proposalPath: string | null;
    proposalDigest?: string | null;
    sourceVerifyStatus?: 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED' | 'completed' | 'blocked' | 'failed' | null;
    status: 'not_created' | 'proposed' | 'applied';
  };
}

export interface RunSummary {
  runId: string;
  status: RunStatus;
  phase: string | null;
  currentTask: string | null;
  partition: string | null;
  gitBranch: string | null;
  taskId: string | null;
  affectedFiles: string[];
  documentSnapshot: RunDocumentSnapshot;
  createdAt: string;
  updatedAt: string;
  validationStatus: RunState['validation']['status'];
  syncBackStatus: RunState['syncBack']['status'];
  taskIds: string[];
  artifactCount: number;
}

export interface RuntimeEvent {
  contract: typeof EVENT_LOG_CONTRACT;
  time: string;
  event: string;
  runId: string;
  summary?: string;
  data?: Record<string, unknown>;
}

export type InvocationLedgerKind = 'command' | 'tool_invocation' | 'agent' | 'skill' | 'material' | 'policy_evaluation' | 'cache' | 'artifact_hash';

export interface InvocationLedgerEntry {
  contract: 'sdd-invocation-ledger-v1';
  version: typeof INVOCATION_LEDGER_CONTRACT_VERSION;
  entryId: string;
  runId: string;
  taskId: string | null;
  branch: string | null;
  kind: InvocationLedgerKind;
  ref: string;
  status: string;
  timestamp: string;
  artifactPath?: string | null;
  inputHash?: string | null;
  outputHash?: string | null;
  materialRefs: string[];
  metadata: Record<string, string | number | boolean | null>;
}