import { createHash } from 'node:crypto';
import { appendFile, access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { applyAiToolEntries, checkAiToolEntryDrift, type AiProjectionResult, type AiToolSelection } from './ai-tools.js';
import { assertSafePathSegment, branchToSafePartition, normalizePortablePath, safeBranchOrNull } from './path-safety.js';

export * from './ai-tools.js';
export * from './instructions.js';
const execFileAsync = promisify(execFile);

export const RUNTIME_VERSION = 'phase-1.2-runtime-skeleton';
export const PROJECT_CONFIG_CONTRACT = 'phase-1.2-project-contract';
export const RUN_STATE_CONTRACT = 'phase-1.2-run-state-contract';
export const EVENT_LOG_CONTRACT = 'phase-1.2-event-log-contract';
export const ARTIFACT_PATH_CONTRACT = 'phase-1.2-artifact-path-contract';
export const LEGACY_LIFECYCLE_DECISION_CONTRACT = 'phase-1.2-lifecycle-decision-contract';
export const LIFECYCLE_DECISION_CONTRACT = 'sdd-lifecycle-decision-v1';
export const LIFECYCLE_DECISION_VERSION = '1.3.0';
export const SDD_RESULT_CONTRACT = 'sdd-result-v1';
export const SDD_RESULT_VERSION = '1.3.0';
export const DELEGATION_LIVENESS_CONTRACT = 'sdd-delegation-liveness-v1';
export const DELEGATION_LIVENESS_VERSION = '1.3.0';

export const ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION = 'phase-3.6-artifact-result-ingestion-v1';
export const TASK_GRAPH_PLANNER_CONTRACT_VERSION = 'phase-3.9-task-graph-planner-v1';
export const WAVE_PLANNER_CONTRACT_VERSION = 'phase-3.10-wave-planner-v1';
export const BACKGROUND_EXECUTOR_CONTRACT_VERSION = 'phase-3.11-background-executor-v1';
export const WAVE_EXECUTOR_CONTRACT_VERSION = 'phase-3.12-wave-executor-v1';
export const LOCAL_RUN_INDEX_CONTRACT_VERSION = 'phase-3.13-local-run-index-v1';
export const GOVERNANCE_POLICY_CONTRACT_VERSION = 'phase-3.14-governance-policy-v1';
export const CONTEXT_RESOLVER_CONTRACT_VERSION = 'phase-5.1-context-resolver-v1';
export const LIFECYCLE_RISK_GATE_CONTRACT_VERSION = 'phase-5.1-lifecycle-risk-gate-v1';
export const OUTPUT_QUALITY_CONTRACT_VERSION = 'phase-5.1-output-quality-v1';
export const WORKFLOW_GATE_CONTRACT_VERSION = 'phase-5.2-workflow-gate-v1';
export const AGENT_REGISTRY_CONTRACT_VERSION = 'phase-5.2-agent-registry-v1';
export const TASK_GRAPH_CONTRACT_VERSION = 'phase-5.3-task-graph-v1';
export const TASK_RUN_EVIDENCE_CONTRACT_VERSION = 'phase-5.3-task-run-evidence-v1';
export const QUERY_STATUS_CONTRACT_VERSION = 'phase-5.4-query-status-v1';
export const SKILL_AGENT_EVAL_CONTRACT_VERSION = 'phase-5.5-skill-agent-eval-v1';
export const HARNESS_LEARNING_CONTRACT_VERSION = 'phase-5.5-harness-learning-v1';
export const PROJECT_CONTEXT_PACK_CONTRACT_VERSION = 'phase-5.5-project-context-pack-v1';
export const AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION = 'phase-6.0-agent-skill-team-runtime-v1';
export const CAPABILITY_SOURCE_CATALOG_VERSION = 'phase-6.0-capability-source-catalog-v1';
export const EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION = 'phase-6.0-external-agent-pack-import-policy-v1';
export const TOOL_PERMISSION_SPEC_VERSION = 'phase-6.0-tool-permission-spec-v1';
export const HOST_ADAPTER_CONTRACT_VERSION = 'phase-6.0-host-adapter-contract-v1';
export const AGENT_ROUTER_CONTRACT_VERSION = 'phase-6.0-agent-router-v1';
export const TEAM_MODE_POLICY_VERSION = 'phase-6.0-team-mode-policy-v1';
export const EVIDENCE_INGESTION_CONTRACT_VERSION = 'phase-6.0-evidence-ingestion-v1';
export const AGENT_EXECUTION_RECORD_CONTRACT_VERSION = 'phase-6.0-agent-execution-record-v1';
export const TEAM_SESSION_RECORD_CONTRACT_VERSION = 'phase-6.0-team-session-record-v1';
export const RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION = 'phase-6.1-resident-worker-runtime-v1';
const DEFAULT_RESIDENT_WORKER_LEASE_SECONDS = 900;
export type DoctorLevel = 'PASS' | 'WARN' | 'FAIL';
export type RunStatus = 'created' | 'running' | 'completed' | 'blocked' | 'failed' | 'archived';
export type LifecycleProfile = 'direct' | 'compact' | 'full' | 'research';
export type LifecycleConfidence = 'high' | 'medium' | 'low';
export type SddResultStatus = 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED' | 'TIMED_OUT' | 'CANCELLED';
export type DelegationRunMode = 'foreground' | 'background';
export type DelegationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED' | 'RECOVERABLE' | 'STALE';
export type GoalVerifyStatus = 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED';
export type HarnessVerifyStatus = 'PASS' | 'GAPS' | 'BLOCKED' | 'HUMAN_NEEDED';
export type ArtifactResultIngestionStatus = 'accepted' | 'rejected';

export type DetectionConfidence = 'high' | 'medium' | 'low';

export interface DetectionEvidence {
  kind: string;
  detail: string;
  weight: number;
}

export interface ProjectDetectionCandidate {
  id: string;
  language: string;
  framework: string;
  score: number;
  confidence: DetectionConfidence;
  evidence: DetectionEvidence[];
  validationDefault: string[];
}

export interface ProjectDetection {
  primary: ProjectDetectionCandidate;
  candidates: ProjectDetectionCandidate[];
  mixed_stack: boolean;
}

export interface ProjectConfig {
  contract: typeof PROJECT_CONFIG_CONTRACT;
  project: {
    name: string;
    language: string;
    framework: string;
  };
  detection?: {
    confidence: DetectionConfidence;
    mixed_stack: boolean;
    primary: string;
    candidates: Array<{
      id: string;
      confidence: DetectionConfidence;
      score: number;
    }>;
  };
  sdd: {
    spec_dir: string;
    default_branch?: string;
    docs_language: string;
    compatible_with: string;
  };
  validation: {
    default: string[];
  };
  editing: {
    prefer_hashline: boolean;
    native_edit_fallback: boolean;
  };
  runtime: {
    background_write: boolean;
    worktree_isolation: boolean;
    sync_back_mode: 'proposal';
  };
  lifecycle: {
    decision_required: boolean;
    profiles: LifecycleProfile[];
  };
  agentRuntime?: ProjectAgentRuntimeConfig;
}

export type ToolCapabilityCategory = 'runtime' | 'editing' | 'git' | 'validation' | 'browser' | 'artifact' | 'governance';
export type ToolCapabilitySideEffect = 'read_only' | 'local_write' | 'command_execution' | 'external_interaction';

export interface ToolCapability {
  id: string;
  title: string;
  category: ToolCapabilityCategory;
  summary: string;
  sideEffect: ToolCapabilitySideEffect;
  defaultAvailable: boolean;
  allowedStages: string[];
  requiredEvidence: string[];
  forbiddenUses: string[];
}

export interface ToolCapabilityRegistry {
  version: string;
  capabilities: ToolCapability[];
}

export type ToolPluginEntryKind = 'cli' | 'adapter' | 'command' | 'manual';
export type ToolPluginLoadMode = 'static_manifest' | 'readonly_asset';

export interface ToolPluginContract {
  id: string;
  title: string;
  version: string;
  capabilityId: string;
  entryKind: ToolPluginEntryKind;
  assetPath: string;
  loadMode: ToolPluginLoadMode;
  checksum: string | null;
  requiredEvidence: string[];
  forbiddenUses: string[];
}

export interface ToolPluginContractRegistry {
  version: string;
  contracts: ToolPluginContract[];
}

export type DelegationQueueStatusSource = 'run_state_delegation';

export interface DelegationQueueItem {
  id: string;
  runId: string;
  delegationId: string;
  taskId: string;
  agent: string;
  requestedCapabilityId: string;
  dedupeKey: string;
  status: DelegationStatus;
  statusSource: DelegationQueueStatusSource;
  runMode: DelegationRunMode;
  expectedArtifact: string;
  requiredEvidence: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DelegationQueueSnapshot {
  version: string;
  items: DelegationQueueItem[];
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

export type WorkerAdapterKind = 'claude_code_subagent' | 'sdd_cli_task' | 'manual_handoff';
export type WorkerAdapterExitStatus = 'completed' | 'failed' | 'cancelled' | 'timed_out' | 'blocked';

export interface WorkerAdapterPayloadContract {
  queueItemId: string;
  runId: string;
  taskId: string;
  delegationId: string;
  stateMachineVersion: string;
}

export interface WorkerAdapterOutputContract {
  artifactReference: string;
  terminalStatus: DelegationStatus[];
  exitStatuses: WorkerAdapterExitStatus[];
  requiredEvents: string[];
}

export interface WorkerAdapterContract {
  id: string;
  title: string;
  version: string;
  kind: WorkerAdapterKind;
  capabilityId: string;
  pluginContractId: string;
  input: WorkerAdapterPayloadContract;
  output: WorkerAdapterOutputContract;
  sideEffect: ToolCapabilitySideEffect;
  permissionPrompt: string;
  requiredEvidence: string[];
  forbiddenUses: string[];
}

export interface WorkerAdapterContractRegistry {
  version: string;
  adapters: WorkerAdapterContract[];
}

export type WorktreeIsolationMode = 'none' | 'required' | 'blocked' | 'manual';

export interface WorktreeIsolationPeer {
  taskId: string;
  affectedFiles: string[];
  risk: string[];
}

export interface WorktreeIsolationGate {
  name: string;
  passed: boolean;
  message: string;
}

export interface WorktreeIsolationDecision {
  version: string;
  taskId: string;
  mode: WorktreeIsolationMode;
  safeConcurrency: boolean;
  capabilityId: string;
  capabilitySideEffect: ToolCapabilitySideEffect;
  affectedFiles: string[];
  risk: string[];
  peers: WorktreeIsolationPeer[];
  overlaps: Array<{ peerTaskId: string; files: string[] }>;
  gates: WorktreeIsolationGate[];
  reasons: string[];
}

export type WorktreeLifecycleStatus = 'created' | 'kept' | 'removed';

export interface WorktreeLifecycleRecord {
  contract: typeof WORKTREE_LIFECYCLE_CONTRACT_VERSION;
  runId: string;
  taskId: string;
  worktreeId: string;
  status: WorktreeLifecycleStatus;
  branchName: string;
  worktreePath: string;
  baseRef: string;
  createdAt: string;
  updatedAt: string;
  removedAt: string | null;
  keepReason: string | null;
  dirty: boolean;
}

export interface WorktreeLifecycleInspection {
  runId: string;
  contract: typeof WORKTREE_LIFECYCLE_CONTRACT_VERSION;
  records: WorktreeLifecycleRecord[];
  valid: boolean;
  issues: ContractValidationIssue[];
}
export interface ArtifactResultIngestionRecord {
  contract: typeof ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION;
  runId: string;
  delegationId: string;
  task: string;
  agent: string;
  artifactPath: string;
  status: ArtifactResultIngestionStatus;
  resultStatus: SddResultStatus | null;
  delegationStatus: DelegationStatus | null;
  ingestedAt: string;
  issues: ContractValidationIssue[];
  gaps: SddTaskGap[];
}

export interface ArtifactResultIngestionResult {
  valid: boolean;
  duplicate: boolean;
  record: ArtifactResultIngestionRecord;
  delegation: DelegationRecord | null;
}

export interface ArtifactResultIngestionInspection {
  runId: string;
  contract: typeof ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION;
  records: ArtifactResultIngestionRecord[];
  valid: boolean;
  issues: ContractValidationIssue[];
}

export interface LifecycleDecisionRecord {
  contract: typeof LIFECYCLE_DECISION_CONTRACT | typeof LEGACY_LIFECYCLE_DECISION_CONTRACT;
  version?: typeof LIFECYCLE_DECISION_VERSION;
  model_version: string;
  input_summary: Record<string, unknown>;
  decision: {
    profile: LifecycleProfile | null;
    confidence: LifecycleConfidence | null;
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
    decided_by: 'command' | 'runtime' | 'user_override' | null;
    policy_version: string;
    source_artifacts: string[];
  };
}

export type SignalClarity = 'high' | 'medium' | 'low';
export type EstimatedChangeSize = 'tiny' | 'small' | 'medium' | 'large';
export type ImpactConfidence = 'high' | 'medium' | 'low';
export type ValidationClarity = 'clear' | 'partial' | 'unclear';
export type OrchestrationUncertainty = 'low' | 'medium' | 'high';
export type Reversibility = 'reversible' | 'irreversible' | 'unknown';

export type ContextBranchSource = 'explicit_option' | 'cli_option' | 'project_config' | 'git_branch';

export interface ContextResolverContract {
  contract: typeof CONTEXT_RESOLVER_CONTRACT_VERSION;
  branch: string;
  partition: string;
  rawBranch: string;
  branchSource: ContextBranchSource;
  currentGitBranch: string | null;
  workingTreeMatched: boolean | null;
  specDir: string;
}

export type LifecycleRiskCategory = 'state_machine' | 'concurrency' | 'database_data_loss' | 'security' | 'sql' | 'api_schema' | 'ci_build' | 'external_unknown';
export type LifecycleRiskExtractionSource = 'from_text' | 'from_file' | 'none';

export interface LifecycleRiskExtractionEvidence {
  category: LifecycleRiskCategory;
  matched: string;
  riskTag: string;
}

export interface LifecycleRiskGateExtraction {
  contract: typeof LIFECYCLE_RISK_GATE_CONTRACT_VERSION;
  source: LifecycleRiskExtractionSource;
  riskTags: string[];
  affectedContracts: string[];
  externalUnknown: boolean;
  architectureDecisionRequired: boolean;
  reversibility?: Reversibility;
  validationClarity?: ValidationClarity;
  impactConfidence?: ImpactConfidence;
  evidence: LifecycleRiskExtractionEvidence[];
  signals: Partial<LifecycleDecisionSignals>;
}

export type LifecycleAutonomyCeiling = 'direct_execution_allowed' | 'compact_boundary_only' | 'full_sdd_with_checkpoint' | 'research_before_implementation';

export interface LifecycleDecisionSignals {
  intent_clarity: SignalClarity;
  acceptance_clarity: SignalClarity;
  estimated_change_size: EstimatedChangeSize;
  task_count_estimate: number;
  file_count_estimate: number;
  affected_layers: string[];
  affected_contracts: string[];
  dependency_fanout: 'none' | 'local' | 'multi_component' | 'unknown';
  impact_confidence: ImpactConfidence;
  risk_tags: string[];
  reversibility: Reversibility;
  validation_clarity: ValidationClarity;
  validation_available: boolean;
  validation_cost: 'cheap' | 'moderate' | 'expensive' | 'unknown';
  policy_hits: string[];
  permission_required: string[];
  requires_agents: boolean;
  handoff_count: number;
  artifact_dependency: boolean;
  runtime_recovery_need: boolean;
  orchestration_uncertainty: OrchestrationUncertainty;
  human_checkpoint_required: boolean;
  approval_reason: string[];
  source_artifacts: string[];
  can_scout_impact: boolean;
  architecture_decision_required: boolean;
  external_unknown: boolean;
}

export interface LifecycleDecisionGateResult {
  record: LifecycleDecisionRecord;
  checkpointRequired: boolean;
  boundaries: string[];
  autonomyCeiling: LifecycleAutonomyCeiling;
}

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
  lifecycleDecision: LifecycleDecisionRecord | null;
  tasks: Record<string, unknown>;
  agents: Record<string, unknown>;
  delegations: Record<string, DelegationRecord>;
  artifacts: ArtifactIndexEntry[];
  artifactIngestions: Record<string, ArtifactResultIngestionRecord>;
  worktrees: Record<string, WorktreeLifecycleRecord>;
  validation: {
    status: 'not_run' | 'pass' | 'pass_with_gaps' | 'fail' | 'blocked';
    commands: string[];
    evidence: string[];
  };
  syncBack: {
    mode: 'proposal';
    proposalPath: string | null;
    status: 'not_created' | 'proposed' | 'applied';
  };
}

export interface RuntimeEvent {
  contract: typeof EVENT_LOG_CONTRACT;
  time: string;
  event: string;
  runId: string;
  summary?: string;
  data?: Record<string, unknown>;
}

export interface DoctorCheck {
  level: DoctorLevel;
  check: string;
  message: string;
  action?: string;
}

export interface DoctorReport {
  status: DoctorLevel;
  checks: DoctorCheck[];
}

export type SddTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'deferred' | 'unknown';
export type SddGapSeverity = 'blocking' | 'warning';
export type SddGapType = 'Document Gap' | 'Task Gap' | 'Dependency Gap';

export interface SddTaskSourceLocation {
  filePath: string;
  heading: string | null;
  lineStart: number;
  lineEnd: number;
}

export interface SddTask {
  id: string;
  title: string | null;
  status: SddTaskStatus;
  wave: number | null;
  dependsOn: string[];
  affectedFiles: string[];
  validation: string[];
  risk: string[];
  acceptanceRefs: string[];
  planRefs: string[];
  fileOwnership: string[];
  agentFit: string[];
  verificationAvailability: string[];
  autonomy: string | null;
  allowedAgents: string[];
  requiredArtifacts: string[];
  gapState: string | null;
  boundary: string | null;
  acceptance: string[];
  implementationNotes: string | null;
  rawMetadata: Record<string, string | string[]>;
  source: SddTaskSourceLocation;
}

export interface SddTaskGap {
  type: SddGapType;
  severity: SddGapSeverity;
  taskId: string | null;
  field: string;
  message: string;
  recommendation: string;
}

export interface SddTaskModel {
  branch: string;
  specPath: string;
  planPath: string;
  tasksPath: string;
  documents: {
    specExists: boolean;
    planExists: boolean;
    tasksExists: boolean;
    specHash?: string | null;
    planHash?: string | null;
    tasksHash?: string | null;
    planBasedOnSpecHash?: string | null;
    tasksBasedOnPlanHash?: string | null;
    planStale?: boolean;
    tasksStale?: boolean;
  };
  tasks: SddTask[];
  gaps: SddTaskGap[];
}

export type TaskGraphEdgeType = 'depends_on' | 'file_overlap';

export interface TaskGraphNode {
  taskId: string;
  title: string | null;
  status: SddTaskStatus;
  wave: number | null;
  dependsOn: string[];
  affectedFiles: string[];
  risk: string[];
  validation: string[];
  acceptanceRefs: string[];
  planRefs: string[];
  fileOwnership: string[];
  agentFit: string[];
  verificationAvailability: string[];
  autonomy: string | null;
  allowedAgents: string[];
  requiredArtifacts: string[];
  gapState: string | null;
  source: SddTaskSourceLocation;
}

export interface TaskGraphEdge {
  from: string;
  to: string;
  type: TaskGraphEdgeType;
  files: string[];
}

export interface TaskGraphDiagnostic {
  severity: SddGapSeverity;
  taskId: string | null;
  field: string;
  message: string;
  recommendation: string;
}

export interface TaskGraphPlan {
  contract: typeof TASK_GRAPH_CONTRACT_VERSION;
  version: typeof TASK_GRAPH_PLANNER_CONTRACT_VERSION;
  branch: string;
  valid: boolean;
  nodes: TaskGraphNode[];
  dependencyEdges: TaskGraphEdge[];
  fileOverlapEdges: TaskGraphEdge[];
  diagnostics: TaskGraphDiagnostic[];
  summary: {
    tasks: number;
    dependencies: number;
    fileOverlaps: number;
    highRiskTasks: string[];
    validationCommands: string[];
  };
}

export interface WavePlanTask {
  taskId: string;
  isolationMode: WorktreeIsolationMode;
  reasons: string[];
}

export interface WavePlanWave {
  index: number;
  tasks: WavePlanTask[];
}

export interface WavePlanGate {
  taskId: string;
  gate: 'manual' | 'blocked';
  reasons: string[];
}

export interface WavePlan {
  version: typeof WAVE_PLANNER_CONTRACT_VERSION;
  branch: string;
  valid: boolean;
  waves: WavePlanWave[];
  manualGates: WavePlanGate[];
  blockedTasks: WavePlanGate[];
  diagnostics: TaskGraphDiagnostic[];
  summary: {
    tasks: number;
    waves: number;
    plannedTasks: number;
    manualTasks: number;
    blockedTasks: number;
  };
}

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

export type ResidentWorkerRuntimeStatus = 'claimed' | 'active' | 'stale' | 'terminal' | 'blocked';

export interface ResidentWorkerRuntimeRecord {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runtimeId: string;
  runId: string;
  taskId: string;
  agent: string;
  workerAdapterId: string;
  delegationId: string;
  queueItemId: string;
  expectedArtifact: string;
  status: ResidentWorkerRuntimeStatus;
  claimedAt: string;
  lastHeartbeatAt: string | null;
  leaseSeconds: number;
  leaseExpiresAt: string;
  updatedAt: string;
  evidenceSummary: string;
}

export interface ResidentWorkerRuntimeClaimOptions {
  branch?: string;
  runId?: string;
  taskId: string;
  runtimeId?: string;
  agent?: string;
  workerAdapterId?: string;
  delegationId?: string;
  leaseSeconds?: number;
}

export interface ResidentWorkerRuntimeClaimResult {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runId: string;
  runtimeId: string | null;
  taskId: string;
  agent: string;
  workerAdapterId: string;
  delegationId: string | null;
  queueItemId: string | null;
  expectedArtifact: string | null;
  status: ResidentWorkerRuntimeStatus;
  leaseExpiresAt: string | null;
  runtime: ResidentWorkerRuntimeRecord | null;
  issues: ContractValidationIssue[];
  message: string;
}

export interface ResidentWorkerRuntimeHeartbeatOptions {
  runId: string;
  runtimeId: string;
  leaseSeconds?: number;
}

export interface ResidentWorkerRuntimeHeartbeatResult {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runId: string;
  runtimeId: string;
  status: ResidentWorkerRuntimeStatus;
  leaseExpiresAt: string | null;
  runtime: ResidentWorkerRuntimeRecord | null;
  issues: ContractValidationIssue[];
  message: string;
}

export interface ResidentWorkerRuntimeInspection {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runId: string;
  runtimeId: string;
  runtime: ResidentWorkerRuntimeRecord | null;
  queueItem: DelegationQueueItem | null;
  workerAdapter: WorkerAdapterContract | null;
  status: ResidentWorkerRuntimeStatus;
  leaseExpired: boolean;
  valid: boolean;
  issues: ContractValidationIssue[];
  recommendedNextCommand: string;
}

export interface ResidentWorkerRuntimeList {
  version: typeof RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION;
  runId: string;
  runtimes: ResidentWorkerRuntimeRecord[];
  activeRuntimes: number;
  staleRuntimes: number;
  terminalRuntimes: number;
  blockedRuntimes: number;
  valid: boolean;
  issues: ContractValidationIssue[];
}

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

export interface GovernancePolicyDecision {
  version: typeof GOVERNANCE_POLICY_CONTRACT_VERSION;
  operation: GovernancePolicyOperation;
  status: GovernancePolicyDecisionStatus;
  allowed: boolean;
  reasons: string[];
  issues: ContractValidationIssue[];
  policy: GovernancePolicy;
}

export type WorkflowGateId = 'spec' | 'plan' | 'tasks' | 'do' | 'verify' | 'doctor';

export interface WorkflowGateContract {
  version: typeof WORKFLOW_GATE_CONTRACT_VERSION;
  id: WorkflowGateId;
  command: string;
  requiredInputs: string[];
  allowedAgents: string[];
  requiredArtifacts: string[];
  gateConditions: string[];
  gapClosureBehavior: string;
  nextAction: string;
}

export interface WorkflowGateRegistry {
  version: typeof WORKFLOW_GATE_CONTRACT_VERSION;
  workflows: WorkflowGateContract[];
}

export interface WorkflowGateValidation {
  version: typeof WORKFLOW_GATE_CONTRACT_VERSION;
  valid: boolean;
  workflows: WorkflowGateContract[];
  issues: ContractValidationIssue[];
}

export type AgentAutonomyCeiling = 'read_only' | 'foreground_write' | 'validation_only' | 'review_only';

export interface AgentRegistryEntry {
  version: typeof AGENT_REGISTRY_CONTRACT_VERSION;
  id: string;
  role: string;
  allowedStages: string[];
  capabilities: string[];
  readBoundary: string[];
  writeBoundary: string[];
  toolAllowlist: string[];
  requiredArtifact: string;
  verificationExpectation: string;
  autonomyCeiling: AgentAutonomyCeiling;
  stopCondition: string;
}

export interface AgentRegistry {
  version: typeof AGENT_REGISTRY_CONTRACT_VERSION;
  agents: AgentRegistryEntry[];
}

export interface AgentRegistryValidation {
  version: typeof AGENT_REGISTRY_CONTRACT_VERSION;
  valid: boolean;
  agents: AgentRegistryEntry[];
  issues: ContractValidationIssue[];
}

export type BuiltInAgentProfileId = 'planner' | 'architect' | 'implementer' | 'reviewer' | 'validator' | 'researcher' | 'orchestrator' | 'security' | 'domain_expert';
export type AgentProfileId = BuiltInAgentProfileId | string;
export type CapabilityReuseDecision = 'reuse_direct' | 'adapt_via_host_adapter' | 'borrow_mechanism' | 'avoid';
export type SkillCapabilityKind = 'skill' | 'mcp' | 'cli_tool' | 'host_tool' | 'project_agent' | 'external_pattern';
export type SkillCapabilitySource = 'project' | 'user_global' | 'claude_code' | 'mcp' | 'open_source' | 'host';
export type SkillCapabilityEvidenceType = 'none' | 'command_output' | 'test_result' | 'browser_snapshot' | 'artifact' | 'external_source' | 'execution_record';
export type CapabilitySourceKind = 'native_host' | 'mcp_tool' | 'open_source_material' | 'mechanism_reference' | 'future_adapter' | 'project_material';
export type ExternalPackImportStatus = 'approved' | 'quarantined' | 'denied';
export type ExternalPackCheckStatus = 'pass' | 'warn' | 'fail' | 'not_run';
export type ToolPermissionPolicy = 'allow' | 'ask' | 'deny';
export type AgentRouterCategory = 'planning' | 'implementation' | 'implementation_review' | 'validation' | 'security_research' | 'external_research' | 'blocked';
export type TeamModeDecisionStatus = 'disabled' | 'enabled' | 'blocked';
export type TeamModeActivation = 'auto' | 'force' | 'off';
export type TeamModeSelection = 'off' | 'inspect' | 'review-lite' | 'hyperplan' | 'security-research';
export type TeamModeCostClass = 'none' | 'low' | 'medium' | 'high';
export type AgentExecutionRecordStatus = 'claimed' | 'completed' | 'failed' | 'blocked' | 'skipped';
export type TeamSessionRecordStatus = 'created' | 'completed' | 'blocked' | 'disabled';

export interface AgentProfileContract {
  version: typeof AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION;
  id: AgentProfileId;
  stageScope: string[];
  riskCeiling: LifecycleAutonomyCeiling;
  defaultAutonomy: LifecycleAutonomyCeiling;
  requiredArtifacts: string[];
  toolScope: string[];
  modelPolicyId: string;
  hostCapabilityRequirements: string[];
  boundaries: string[];
}

export interface SkillCapabilityContract {
  version: typeof AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION;
  id: string;
  name: string;
  kind: SkillCapabilityKind;
  source: SkillCapabilitySource;
  sourceRef: string;
  capabilityDomain: string[];
  allowedStages: string[];
  requiredRiskCeiling: LifecycleAutonomyCeiling;
  evidenceType: SkillCapabilityEvidenceType;
  reuseDecision: CapabilityReuseDecision;
  buildExceptionReason: string | null;
}

export interface CapabilitySourceCatalogEntry {
  version: typeof CAPABILITY_SOURCE_CATALOG_VERSION;
  id: string;
  name: string;
  kind: CapabilitySourceKind;
  sourceRef: string;
  reuseDecision: CapabilityReuseDecision;
  quarantineRequired: boolean;
  allowedUse: string;
  attribution: string;
  rationale: string;
}

export type RuntimeRegistryOrigin = 'built_in' | 'project_config' | 'external_manifest';

export interface RuntimeRegistryEntrySource {
  id: string;
  kind: 'profile' | 'skill_capability' | 'capability_source';
  origin: RuntimeRegistryOrigin;
  sourceId: string | null;
  quarantineRequired: boolean;
}

export interface AgentRuntimeRoutingRuleWhen {
  keywords: string[];
  affectedFileGlobs: string[];
}

export interface AgentRuntimeRoutingRule {
  id: string;
  when: AgentRuntimeRoutingRuleWhen;
  preferProfile: AgentProfileId;
  requireCapabilities: string[];
  category: AgentRouterCategory | null;
}

export interface AgentRuntimeAdapterMapping {
  profile: AgentProfileId;
  hostAdapter: string;
  projection: string;
  permissionPolicy: string;
}

export interface AgentRuntimeAliasResolution {
  input: string;
  resolved: AgentProfileId;
  source: 'built_in' | 'project_config';
}

export interface ProjectAgentRuntimeConfig {
  profiles: AgentProfileContract[];
  skillCapabilities: SkillCapabilityContract[];
  capabilitySources: CapabilitySourceCatalogEntry[];
  aliases: Record<string, string>;
  routingRules: AgentRuntimeRoutingRule[];
  adapterMappings: AgentRuntimeAdapterMapping[];
}

export interface ExternalAgentPackImportCheck {
  check: string;
  status: ExternalPackCheckStatus;
  evidence: string;
}

export interface ExternalAgentPackImportInspection {
  version: typeof EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION;
  sourceId: string;
  status: ExternalPackImportStatus;
  checks: ExternalAgentPackImportCheck[];
  mappingResult: string;
  allowedProfiles: AgentProfileId[];
  riskCeiling: LifecycleAutonomyCeiling;
  reason: string;
}

export interface ModelPolicyContract {
  id: string;
  category: string;
  fallbackPolicy: string;
  hostProjection: string;
}

export interface ToolPermissionSpec {
  version: typeof TOOL_PERMISSION_SPEC_VERSION;
  profile: AgentProfileId;
  risk: string[];
  toolGroups: string[];
  fileScope: string[];
  policy: ToolPermissionPolicy;
  approvalPolicy: string;
  runtimeValidationRequired: boolean;
  deniedTools: string[];
  hostPermissionProjection: string;
}

export interface HostAdapterContract {
  version: typeof HOST_ADAPTER_CONTRACT_VERSION;
  id: string;
  host: string;
  responsibilities: string[];
  forbiddenAuthority: string[];
  projections: string[];
}

export interface DelegationWavePolicy {
  id: string;
  waveKind: 'hyperplan' | 'security_research' | 'implementation_review' | 'validation';
  memberProfiles: AgentProfileId[];
  requiredArtifacts: string[];
  fileOwnershipRequired: boolean;
  mergeGate: string;
}

export interface TeamModePolicy {
  version: typeof TEAM_MODE_POLICY_VERSION;
  enabled: boolean;
  decision: TeamModeDecisionStatus;
  mode: TeamModeSelection;
  activation: TeamModeActivation;
  costClass: TeamModeCostClass;
  reason: string;
  chiefProfile: AgentProfileId;
  memberProfiles: AgentProfileId[];
  allowedWaves: DelegationWavePolicy[];
  maxMembers: number;
  requireArtifacts: boolean;
  blockedReason: string | null;
  waveRecommendation: string[];
}

export interface EvidenceIngestionContract {
  version: typeof EVIDENCE_INGESTION_CONTRACT_VERSION;
  sourceOutputs: string[];
  evidenceTargets: string[];
  canonicalTruth: string;
  forbiddenTruthSources: string[];
}

export interface AgentExecutionRecord {
  version: typeof AGENT_EXECUTION_RECORD_CONTRACT_VERSION;
  executionId: string;
  runId: string;
  taskId: string;
  profile: AgentProfileId;
  category: AgentRouterCategory;
  host: string;
  hostSessionId: string | null;
  hostTaskId: string | null;
  modelPolicy: ModelPolicyContract;
  toolPermission: ToolPermissionSpec | null;
  capabilitiesUsed: string[];
  sourceAttribution: string[];
  artifacts: string[];
  status: AgentExecutionRecordStatus;
  delegationId: string | null;
  queueItemId: string | null;
  ingestionStatus: ArtifactResultIngestionStatus | null;
  resultStatus: SddResultStatus | null;
  routeDecision: Pick<AgentRouterDecision, 'version' | 'category' | 'recommendedProfile' | 'autonomyCeiling' | 'requiredCapabilities' | 'blockedReason'>;
  evidenceSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMessageRecord {
  sender: AgentProfileId | 'runtime';
  receiver: AgentProfileId | 'team' | 'runtime';
  taskRef: string | null;
  artifactRefs: string[];
  blocker: string | null;
  evidenceSummary: string;
  createdAt: string;
}

export interface TeamSessionRecord {
  version: typeof TEAM_SESSION_RECORD_CONTRACT_VERSION;
  teamId: string;
  runId: string;
  taskId: string | null;
  status: TeamSessionRecordStatus;
  chiefProfile: AgentProfileId;
  memberProfiles: AgentProfileId[];
  hostLayout: string | null;
  teamMode: TeamModePolicy;
  waves: DelegationWavePolicy[];
  messages: TeamMessageRecord[];
  artifacts: string[];
  evidenceSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRouterRejectedProfile {
  profile: AgentProfileId;
  reason: string;
}

export interface AgentRouterDecision {
  version: typeof AGENT_ROUTER_CONTRACT_VERSION;
  taskId: string;
  branch: string;
  category: AgentRouterCategory;
  recommendedProfile: AgentProfileId | null;
  allowedProfiles: AgentProfileId[];
  rejectedProfiles: AgentRouterRejectedProfile[];
  requiredCapabilities: string[];
  sourceCapability: string | null;
  reuseDecision: CapabilityReuseDecision | null;
  toolPermission: ToolPermissionSpec | null;
  modelPolicy: ModelPolicyContract;
  teamMode: TeamModePolicy;
  autonomyCeiling: LifecycleAutonomyCeiling;
  requiredArtifacts: string[];
  blockedReason: string | null;
  nextAction: string;
  registrySources?: RuntimeRegistryEntrySource[];
  resolvedAliases?: AgentRuntimeAliasResolution[];
  routingRuleHits?: string[];
  quarantineWarnings?: string[];
  adapterMapping?: AgentRuntimeAdapterMapping | null;
}

export interface AgentSkillTeamRuntimeInspection {
  version: typeof AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION;
  profiles: AgentProfileContract[];
  skillCapabilities: SkillCapabilityContract[];
  capabilitySources: CapabilitySourceCatalogEntry[];
  hostAdapter: HostAdapterContract;
  evidenceIngestion: EvidenceIngestionContract;
  teamMode: TeamModePolicy;
  reusePolicy: string;
  registrySources?: RuntimeRegistryEntrySource[];
  aliases?: Record<string, string>;
  routingRules?: AgentRuntimeRoutingRule[];
  adapterMappings?: AgentRuntimeAdapterMapping[];
}

export interface SkillCapabilityRegistry {
  version: typeof AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION;
  capabilities: SkillCapabilityContract[];
  registrySources?: RuntimeRegistryEntrySource[];
}

export interface CapabilitySourceCatalog {
  version: typeof CAPABILITY_SOURCE_CATALOG_VERSION;
  sources: CapabilitySourceCatalogEntry[];
  registrySources?: RuntimeRegistryEntrySource[];
}

export interface AgentSkillTeamRuntimeValidation {
  version: typeof AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION;
  valid: boolean;
  inspection: AgentSkillTeamRuntimeInspection;
  issues: ContractValidationIssue[];
}


export type QuerySurfaceId = 'status' | 'doctor' | 'run_inspect' | 'debug';

export interface QueryStatusSurface {
  id: QuerySurfaceId;
  command: string;
  responsibility: string;
  includes: string[];
  excludes: string[];
  nextActionRule: string;
}

export interface QueryStatusContract {
  version: typeof QUERY_STATUS_CONTRACT_VERSION;
  sourceDocument: string;
  surfaces: QueryStatusSurface[];
}

export interface QueryStatusValidation {
  version: typeof QUERY_STATUS_CONTRACT_VERSION;
  valid: boolean;
  surfaces: QueryStatusSurface[];
  issues: ContractValidationIssue[];
}

export type SkillAgentEvalDimensionId = 'novel_judgment' | 'risk_identification' | 'task_slicing' | 'agent_evidence' | 'output_concision' | 'verification_executability' | 'autonomy_correctness' | 'agent_fit' | 'verification_availability' | 'gap_closure';

export interface SkillAgentEvalDimension {
  id: SkillAgentEvalDimensionId;
  expectation: string;
  baselineFinding: string;
  passThreshold: number;
}

export interface SkillAgentEvalContract {
  version: typeof SKILL_AGENT_EVAL_CONTRACT_VERSION;
  corpus: string[];
  sourceReport: string;
  dimensions: SkillAgentEvalDimension[];
  regressionAssertions: string[];
}

export interface SkillAgentEvalValidation {
  version: typeof SKILL_AGENT_EVAL_CONTRACT_VERSION;
  valid: boolean;
  contract: SkillAgentEvalContract;
  issues: ContractValidationIssue[];
}

export type HarnessLearningSinkId = 'project_context_pack' | 'risk_vocabulary' | 'checklist' | 'doctor_check' | 'eval_assertion' | 'generated_entry_guidance';

export interface HarnessLearningSink {
  id: HarnessLearningSinkId;
  output: string;
  boundary: string;
}

export interface HarnessLearningContract {
  version: typeof HARNESS_LEARNING_CONTRACT_VERSION;
  sourceTrial: string;
  allowedSinks: HarnessLearningSink[];
  forbiddenOutputs: string[];
  promotionRule: string;
}

export interface HarnessLearningValidation {
  version: typeof HARNESS_LEARNING_CONTRACT_VERSION;
  valid: boolean;
  contract: HarnessLearningContract;
  issues: ContractValidationIssue[];
}

export interface ProjectContextPackContract {
  version: typeof PROJECT_CONTEXT_PACK_CONTRACT_VERSION;
  entryPoint: string;
  durableContext: string[];
  runtimeSourcesOfTruth: string[];
  boundaries: string[];
}

export interface ProjectContextPackValidation {
  version: typeof PROJECT_CONTEXT_PACK_CONTRACT_VERSION;
  valid: boolean;
  contract: ProjectContextPackContract;
  issues: ContractValidationIssue[];
}
export interface SddResult {
  contract: typeof SDD_RESULT_CONTRACT;
  version: typeof SDD_RESULT_VERSION;
  agent: string;
  task: string;
  status: SddResultStatus;
  artifacts: string[];
  rawMetadata: Record<string, string | string[]>;
}

export interface ContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

export interface SddResultValidationReport {
  valid: boolean;
  result: SddResult | null;
  issues: ContractValidationIssue[];
}

export interface SddResultArtifactTemplateOptions {
  branch?: string;
  taskId: string;
  agent: string;
  artifactPath: string;
  status?: SddResultStatus;
}

export interface DelegationRecord {
  contract: typeof DELEGATION_LIVENESS_CONTRACT;
  version: typeof DELEGATION_LIVENESS_VERSION;
  delegationId: string;
  task: string;
  agent: string;
  runMode: DelegationRunMode;
  blocking: boolean;
  requiredForPhaseExit: boolean;
  status: DelegationStatus;
  startedAt: string;
  lastHeartbeatAt: string | null;
  timeoutSeconds: number;
  expectedArtifact: string;
  terminalEventRequired: boolean;
  terminalEventAt?: string | null;
}

export interface DelegationValidationReport {
  valid: boolean;
  delegation: DelegationRecord;
  terminal: boolean;
  stale: boolean;
  issues: ContractValidationIssue[];
}

export type SingleTaskLoopStatus = 'completed' | 'blocked' | 'failed';

export interface SingleTaskLoopOptions {
  branch?: string;
  taskId: string;
  runId?: string;
  implementArtifact?: string;
  reviewArtifact?: string;
  validationArtifact?: string;
  debugArtifact?: string;
  teamModeEnabled?: boolean;
  teamModeActivation?: TeamModeActivation;
}

export interface SingleTaskLoopResult {
  runId: string;
  taskId: string;
  status: SingleTaskLoopStatus;
  task: SddTask | null;
  gaps: SddTaskGap[];
  requiredArtifacts: string[];
  acceptedArtifacts: string[];
  syncBackProposalPath: string;
  routeDecision: AgentRouterDecision;
  message: string;
}

export interface GoalVerifyOptions {
  branch?: string;
  taskId: string;
  runId?: string;
  reviewArtifact?: string;
  validationArtifact?: string;
}

export interface AcceptanceCoverageItem {
  acceptance: string;
  status: GoalVerifyStatus | 'GAP';
  evidence: string;
}

export interface GoalVerifyResult {
  runId: string;
  taskId: string;
  status: GoalVerifyStatus;
  task: SddTask | null;
  reviewArtifact: string | null;
  validationArtifact: string | null;
  coverageArtifactPath: string;
  syncBackProposalPath: string;
  acceptanceCoverage: AcceptanceCoverageItem[];
  gaps: SddTaskGap[];
  commands: string[];
  standardStatus: HarnessVerifyStatus;
  message: string;
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

export interface LocalRunIndexTaskEntry {
  taskId: string;
  partition: string | null;
  gitBranch: string | null;
  affectedFiles: string[];
  status: string | null;
  runId: string;
  runStatus: RunStatus;
  updatedAt: string;
}

export interface LocalRunIndexArtifactEntry {
  path: string;
  kind: string;
  task: string | null;
  agent: string | null;
  runId: string;
  createdAt: string;
}

export interface LocalRunIndexWaveSummary {
  runId: string;
  eventCount: number;
  lastEvent: string | null;
}

export interface LocalRunIndexPartitionTaskEntry {
  partition: string;
  gitBranch: string | null;
  taskId: string;
  runId: string;
  runStatus: RunStatus;
  validationStatus: RunState['validation']['status'];
  syncBackStatus: RunState['syncBack']['status'];
  affectedFiles: string[];
  updatedAt: string;
}

export interface LocalRunIndexAffectedFileEntry {
  file: string;
  partition: string;
  gitBranch: string | null;
  taskId: string;
  runId: string;
  runStatus: RunStatus;
  syncBackStatus: RunState['syncBack']['status'];
  updatedAt: string;
}

export interface LocalRunIndexQuery {
  runId?: string;
  taskId?: string;
  partition?: string;
  status?: RunStatus;
  artifact?: string;
}

export interface LocalRunIndex {
  contract: typeof LOCAL_RUN_INDEX_CONTRACT_VERSION;
  generatedAt: string;
  runs: RunSummary[];
  tasks: LocalRunIndexTaskEntry[];
  delegations: DelegationQueueItem[];
  artifacts: LocalRunIndexArtifactEntry[];
  waves: LocalRunIndexWaveSummary[];
  latestByPartitionTask: LocalRunIndexPartitionTaskEntry[];
  activeByAffectedFile: LocalRunIndexAffectedFileEntry[];
}

export interface LocalRunIndexInspection {
  valid: boolean;
  exists: boolean;
  indexPath: string;
  index: LocalRunIndex | null;
  issues: ContractValidationIssue[];
}

export interface TaskRunEvidenceContract {
  version: typeof TASK_RUN_EVIDENCE_CONTRACT_VERSION;
  runId: string;
  state: { status: RunStatus; phase: string | null; currentTask: string | null };
  events: Array<{ event: string; summary: string | null; task: string | null; agent: string | null; gate: string | null; validation: string | null; gap: string | null }>;
  artifacts: ArtifactIndexEntry[];
  validation: RunState['validation'];
  gaps: SddTaskGap[];
  syncBackProposal: string | null;
  agentExecutions: AgentExecutionRecord[];
  teamSessions: TeamSessionRecord[];
  workerRuntimes: ResidentWorkerRuntimeRecord[];
}

export interface RunInspection {
  summary: RunSummary;
  state: RunState;
  events: RuntimeEvent[];
  eventCount: number;
  recentEvents: RuntimeEvent[];
  artifacts: ArtifactIndexEntry[];
  artifactIngestions: ArtifactResultIngestionRecord[];
  worktrees: WorktreeLifecycleRecord[];
  validation: RunState['validation'];
  syncBack: RunState['syncBack'];
  tasks: Record<string, unknown>;
  taskRunEvidence: TaskRunEvidenceContract;
  agentExecutions: AgentExecutionRecord[];
  teamSessions: TeamSessionRecord[];
  workerRuntimes: ResidentWorkerRuntimeRecord[];
}

export interface RunEvidenceSummary {
  agentExecutions: number;
  teamSessions: number;
  artifactIngestions: number;
  workerRuntimes: number;
  staleWorkerRuntimes: number;
  routePreflight: boolean;
  tasksChangedAfterRun: boolean;
  tasksUpdatedAt: string | null;
  runUpdatedAt: string | null;
}

export interface ResolvedTaskRun {
  runId: string;
  state: RunState;
  context: ContextResolverContract;
  model: SddTaskModel;
  task: SddTask | null;
  explicitRunId: boolean;
  staleReasons: string[];
  affectedFileConflicts: LocalRunIndexAffectedFileEntry[];
}

export interface ProjectStatus {
  branch: string;
  workflowStatus: 'active' | 'not_started';
  context: ContextResolverContract;
  gitRoot: string | null;
  documents: SddTaskModel['documents'];
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    blocked: number;
    deferred: number;
    unknown: number;
    gaps: number;
  };
  latestRun: RunSummary | null;
  latestRunsByTask: LocalRunIndexPartitionTaskEntry[];
  latestRunEvidence: RunEvidenceSummary | null;
  latestRunStaleReasons: string[];
  affectedFileConflicts: LocalRunIndexAffectedFileEntry[];
  recommendedNextCommand: string;
  gaps: SddTaskGap[];
}

export interface SyncBackApplyPolicy {
  mode: 'direct' | 'confirm';
  requiresApproval: boolean;
  reasons: string[];
}

export interface SyncBackInspection {
  runId: string;
  branch: string;
  taskId: string | null;
  status: 'ready' | 'blocked' | 'applied';
  reasons: string[];
  proposalPath: string | null;
  proposal: string | null;
  runTaskStatus: string | null;
  markdownTask: SddTask | null;
  markdownStatus: SddTaskStatus | null;
  targetTasksPath: string;
  artifacts: string[];
  gaps: SddTaskGap[];
  applyPolicy: SyncBackApplyPolicy;
  staleReasons: string[];
  affectedFileConflicts: LocalRunIndexAffectedFileEntry[];
}

export interface SyncBackApplyResult {
  runId: string;
  taskId: string;
  applied: boolean;
  tasksPath: string;
  inspection: SyncBackInspection;
  message: string;
}

export function getWorktreesDir(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'worktrees');
}

interface LoopAgentStep {
  agent: 'implementer' | 'reviewer' | 'debugger' | 'validator';
  suppliedArtifact?: string;
  expectedArtifact: string;
  required: boolean;
}

export function getSddDir(projectRoot: string): string {
  return path.join(projectRoot, '.sdd');
}

export function getProjectConfigPath(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'project.yml');
}

export function getRunsDir(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'runs');
}

export function getLocalRunIndexPath(projectRoot: string): string {
  return path.join(getSddDir(projectRoot), 'run-index.json');
}

export function getRunDir(projectRoot: string, runId: string): string {
  assertSafePathSegment(runId, 'runId');
  return path.join(getRunsDir(projectRoot), runId);
}

export function getArtifactsDir(projectRoot: string, runId: string): string {
  return path.join(getRunDir(projectRoot, runId), 'artifacts');
}

export function getAgentExecutionsDir(projectRoot: string, runId: string): string {
  return path.join(getRunDir(projectRoot, runId), 'agent-executions');
}

export function getTeamSessionsDir(projectRoot: string, runId: string): string {
  return path.join(getRunDir(projectRoot, runId), 'team-sessions');
}

export function getWorkerRuntimesDir(projectRoot: string, runId: string): string {
  return path.join(getRunDir(projectRoot, runId), 'worker-runtimes');
}

export function getWorkerRuntimeRecordPath(projectRoot: string, runId: string, runtimeId: string): string {
  assertSafePathSegment(runtimeId, 'runtimeId');
  return path.join(getWorkerRuntimesDir(projectRoot, runId), `${runtimeId}.json`);
}

export function getAgentExecutionRecordPath(projectRoot: string, runId: string, executionId: string): string {
  assertSafePathSegment(executionId, 'executionId');
  return path.join(getAgentExecutionsDir(projectRoot, runId), `${executionId}.json`);
}

export function getTeamSessionRecordPath(projectRoot: string, runId: string, teamId: string): string {
  assertSafePathSegment(teamId, 'teamId');
  return path.join(getTeamSessionsDir(projectRoot, runId), `${teamId}.json`);
}

export function getArtifactPath(projectRoot: string, runId: string, relativeArtifactPath: string): string {
  const artifactsDir = getArtifactsDir(projectRoot, runId);
  const resolved = path.resolve(artifactsDir, relativeArtifactPath);
  if (!resolved.startsWith(path.resolve(artifactsDir) + path.sep) && resolved !== path.resolve(artifactsDir)) {
    throw new Error(`Artifact path escapes artifacts directory: ${relativeArtifactPath}`);
  }
  return resolved;
}

export function getRunRelativeArtifactPath(artifactRootRelativePath: string): string {
  return `artifacts/${normalizeArtifactRootRelativePath(artifactRootRelativePath)}`;
}

export function toArtifactRootRelativePath(runRelativeArtifactPath: string): string {
  const portablePath = runRelativeArtifactPath.replace(/\\/g, '/');
  if (!portablePath.startsWith('artifacts/')) {
    throw new Error(`Run-relative artifact path must start with artifacts/: ${runRelativeArtifactPath}`);
  }
  return normalizeArtifactRootRelativePath(portablePath.slice('artifacts/'.length));
}

export async function writeArtifact(projectRoot: string, runId: string, artifactRootRelativePath: string, content: string): Promise<{ absolutePath: string; runRelativePath: string }> {
  const normalized = normalizeArtifactRootRelativePath(artifactRootRelativePath);
  const absolutePath = getArtifactPath(projectRoot, runId, normalized);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  return { absolutePath, runRelativePath: getRunRelativeArtifactPath(normalized) };
}

export async function readArtifact(projectRoot: string, runId: string, artifactRootRelativePath: string): Promise<string> {
  return readFile(getArtifactPath(projectRoot, runId, normalizeArtifactRootRelativePath(artifactRootRelativePath)), 'utf8');
}

export async function writeAgentExecutionRecord(projectRoot: string, record: AgentExecutionRecord): Promise<AgentExecutionRecord> {
  await mkdir(getAgentExecutionsDir(projectRoot, record.runId), { recursive: true });
  await writeFile(getAgentExecutionRecordPath(projectRoot, record.runId, record.executionId), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return record;
}

export async function writeTeamSessionRecord(projectRoot: string, record: TeamSessionRecord): Promise<TeamSessionRecord> {
  await mkdir(getTeamSessionsDir(projectRoot, record.runId), { recursive: true });
  await writeFile(getTeamSessionRecordPath(projectRoot, record.runId, record.teamId), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return record;
}

export async function writeResidentWorkerRuntimeRecord(projectRoot: string, record: ResidentWorkerRuntimeRecord): Promise<ResidentWorkerRuntimeRecord> {
  await mkdir(getWorkerRuntimesDir(projectRoot, record.runId), { recursive: true });
  await writeFile(getWorkerRuntimeRecordPath(projectRoot, record.runId, record.runtimeId), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return record;
}

export async function listAgentExecutionRecords(projectRoot: string, runId: string): Promise<AgentExecutionRecord[]> {
  const recordsDir = getAgentExecutionsDir(projectRoot, runId);
  if (!await exists(recordsDir)) {
    return [];
  }
  const entries = await readdir(recordsDir, { withFileTypes: true });
  const records: AgentExecutionRecord[] = [];
  for (const entry of entries.filter((candidate) => candidate.isFile() && candidate.name.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(recordsDir, entry.name), 'utf8');
      records.push(JSON.parse(raw) as AgentExecutionRecord);
    } catch {
      continue;
    }
  }
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.executionId.localeCompare(right.executionId));
}

export async function listTeamSessionRecords(projectRoot: string, runId: string): Promise<TeamSessionRecord[]> {
  const recordsDir = getTeamSessionsDir(projectRoot, runId);
  if (!await exists(recordsDir)) {
    return [];
  }
  const entries = await readdir(recordsDir, { withFileTypes: true });
  const records: TeamSessionRecord[] = [];
  for (const entry of entries.filter((candidate) => candidate.isFile() && candidate.name.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(recordsDir, entry.name), 'utf8');
      records.push(JSON.parse(raw) as TeamSessionRecord);
    } catch {
      continue;
    }
  }
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.teamId.localeCompare(right.teamId));
}

export async function readResidentWorkerRuntimeRecord(projectRoot: string, runId: string, runtimeId: string): Promise<ResidentWorkerRuntimeRecord> {
  const raw = await readFile(getWorkerRuntimeRecordPath(projectRoot, runId, runtimeId), 'utf8');
  return JSON.parse(raw) as ResidentWorkerRuntimeRecord;
}

export async function listResidentWorkerRuntimeRecords(projectRoot: string, runId: string): Promise<ResidentWorkerRuntimeRecord[]> {
  const recordsDir = getWorkerRuntimesDir(projectRoot, runId);
  if (!await exists(recordsDir)) {
    return [];
  }
  const entries = await readdir(recordsDir, { withFileTypes: true });
  const records: ResidentWorkerRuntimeRecord[] = [];
  for (const entry of entries.filter((candidate) => candidate.isFile() && candidate.name.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(recordsDir, entry.name), 'utf8');
      records.push(JSON.parse(raw) as ResidentWorkerRuntimeRecord);
    } catch {
      continue;
    }
  }
  return records.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt) || left.runtimeId.localeCompare(right.runtimeId));
}


export type InitDocumentStatus = 'created' | 'unchanged' | 'overwritten' | 'skipped';

export interface InitDocumentReport {
  branch: string;
  relativePath: string;
  status: InitDocumentStatus;
  message: string;
}

export interface InitDocumentsResult {
  branch: string;
  root: string;
  documents: InitDocumentReport[];
}

export interface InitProjectResult {
  configPath: string;
  created: boolean;
  documents: InitDocumentsResult;
  aiTools: AiProjectionResult[];
}

export async function initProject(projectRoot: string, options: { force?: boolean; aiTool?: AiToolSelection; branch?: string; scaffoldDocuments?: boolean } = {}): Promise<InitProjectResult> {
  const sddDir = getSddDir(projectRoot);
  const runsDir = getRunsDir(projectRoot);
  const configPath = getProjectConfigPath(projectRoot);
  const requestedBranch = options.branch?.trim();
  const scaffoldDocuments = options.scaffoldDocuments ?? true;
  const branch = requestedBranch || 'master';
  assertSafePathSegment(branch, 'branch');
  await mkdir(runsDir, { recursive: true });

  let created = false;
  let projectConfig: ProjectConfig | null = null;
  if (options.force || !await exists(configPath)) {
    const projectName = path.basename(path.resolve(projectRoot));
    const config = await detectProjectConfig(projectRoot, projectName);
    config.sdd.default_branch = requestedBranch || (scaffoldDocuments ? branch : undefined);
    await writeFile(configPath, renderProjectConfig(config), 'utf8');
    projectConfig = config;
    created = true;
  }

  if (!projectConfig) {
    projectConfig = await readProjectConfig(projectRoot);
  }

  const documents = await applyInitDocuments(projectRoot, {
    branch,
    force: options.force,
    scaffoldDocuments,
    docsLanguage: projectConfig.sdd.docs_language
  });

  await mkdir(sddDir, { recursive: true });
  const aiTools = await applyAiToolEntries(projectRoot, { tool: options.aiTool ?? 'auto' });
  return { configPath, created, documents, aiTools };
}

async function applyInitDocuments(projectRoot: string, options: { branch: string; force?: boolean; scaffoldDocuments: boolean; docsLanguage: string }): Promise<InitDocumentsResult> {
  assertSafePathSegment(options.branch, 'branch');
  const docsRoot = path.join(projectRoot, 'specs', options.branch);
  const now = new Date().toISOString();
  const documents = [
    { name: 'spec.md', content: renderInitSpecDocument(options.branch, now, options.docsLanguage) },
    { name: 'plan.md', content: renderInitPlanDocument(options.branch, now, options.docsLanguage) },
    { name: 'tasks.md', content: renderInitTasksDocument(options.branch, now, options.docsLanguage) }
  ];

  if (!options.scaffoldDocuments) {
    return {
      branch: options.branch,
      root: path.relative(projectRoot, docsRoot),
      documents: documents.map((document) => ({
        branch: options.branch,
        relativePath: `specs/${options.branch}/${document.name}`,
        status: 'skipped',
        message: 'Starter semantic document scaffold skipped.'
      }))
    };
  }

  await mkdir(docsRoot, { recursive: true });
  const reports: InitDocumentReport[] = [];
  for (const document of documents) {
    const absolutePath = path.join(docsRoot, document.name);
    const relativePath = `specs/${options.branch}/${document.name}`;
    const existed = await exists(absolutePath);
    if (existed && !options.force) {
      reports.push({
        branch: options.branch,
        relativePath,
        status: 'unchanged',
        message: 'Existing semantic document preserved.'
      });
      continue;
    }

    await writeFile(absolutePath, document.content, 'utf8');
    reports.push({
      branch: options.branch,
      relativePath,
      status: existed ? 'overwritten' : 'created',
      message: existed ? 'Starter semantic document overwritten by explicit force.' : 'Starter semantic document created.'
    });
  }

  return { branch: options.branch, root: path.relative(projectRoot, docsRoot), documents: reports };
}

function usesChineseInitDocs(value: string): boolean {
  return value === 'zh-CN';
}

function renderInitSpecDocument(branch: string, timestamp: string, docsLanguage: string): string {
  const zh = usesChineseInitDocs(docsLanguage);
  const title = zh ? '# Spec: Project Onboarding / 项目入门' : '# Spec: Project Onboarding';
  const objectiveLines = zh ? `- User value: 仓库在第一个真实变更前已有可见的 SDD 入口。
- Business value: 待补充；请替换为第一个真实功能或变更目标。
- Engineering value: semantic documents、runtime config 与托管 AI entries 已安全初始化。
- Observable success: \`sdd status --branch ${branch}\` 报告 spec、plan、tasks 均已存在。` : `- User value: the repository has a visible SDD entrypoint before the first real change.
- Business value: pending; replace with the first real feature/change objective.
- Engineering value: semantic documents, runtime config, and managed AI entries are initialized safely.
- Observable success: \`sdd status --branch ${branch}\` reports spec, plan, and tasks as present.`;
  const problemIntent = zh
    ? '此项目已初始化 SDD。请在实现前用第一个真实功能或变更请求替换这份 onboarding spec。'
    : 'This project has been initialized for SDD. Replace this onboarding spec with the first real feature or change request before implementation.';
  const actorRow = zh
    ? '| repository maintainer | 安全的 SDD 起点 | 还没有写入项目专属的 SDD 请求 |'
    : '| repository maintainer | a safe SDD starting point | no project-specific SDD request has been written yet |';
  const story = zh
    ? 'As a repository maintainer, I want starter SDD documents, so that the first real change can be captured as requirements、design 与 executable tasks。'
    : 'As a repository maintainer, I want starter SDD documents, so that the first real change can be captured as requirements, design, and executable tasks.';
  return `---
template: sdd-init-onboarding-spec-v1
version: 1.4.0
contract: sdd-spec-doc-v1
sdd_managed_starter: true
---

${title}

## 0. Metadata

- spec_id: \`onboarding\`
- branch: \`${branch}\`
- lifecycle_profile: \`direct\`
- source_request: \`Created by sdd init\`
- status: \`draft\`
- created_at: \`${timestamp}\`
- updated_at: \`${timestamp}\`

## 1. Objective / Customer Value

${objectiveLines}

## 2. Problem / Intent

${problemIntent}

## 3. Users / Actors

| Actor | Need / Expectation | Current Pain |
|---|---|---|
${actorRow}

## 4. User Stories / Scenarios

### Story US-1

${story}

### Scenario S1: initialized repository

- Given: \`sdd init\` has run for branch \`${branch}\`.
- When: the maintainer runs \`sdd status --branch ${branch}\`.
- Then: the CLI reports starter spec, plan, and tasks documents as present.

## 5. Scope

### In Scope

- Confirm the project is initialized.
- Replace onboarding placeholders with a real spec, plan, and tasks when ready.

### Out of Scope

- Running background agents.
- Creating worktrees.
- Applying sync-back without explicit user approval.

## 6. Requirements

### Functional Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-1 | \`sdd init\` creates the SDD runtime config and starter semantic documents. | Must | init |
| FR-2 | \`sdd status --branch ${branch}\` can inspect the initialized branch without missing document gaps. | Must | status |

### Non-functional Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| NFR-1 | Initialization must not overwrite user-authored SDD documents unless force is explicitly requested. | Must | safety |

## 7. Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-1 | \`sdd status --branch ${branch}\` reports all three semantic documents as present. | CLI status | Must |
| AC-2 | Existing user-authored semantic documents are preserved by default. | init preserve behavior | Must |

## 8. Assumptions / Dependencies

| Item | Description | Impact if Wrong |
|---|---|---|
| first real request pending | onboarding docs are placeholders | implementation must not start from this scaffold |

## 9. Risks / Hard Gates

| Risk | Why it matters | Required Handling |
|---|---|---|
| scaffold mistaken for approved spec | could authorize vague implementation | replace with a real requirement contract before coding |

## 10. Open Questions

| ID | Question | Owner | Required Before |
|---|---|---|---|
| Q-1 | What is the first real feature or change request? | user | plan |

## 11. Lifecycle Decision Reference

- decision_artifact: \`pending\`
- canonical_model: \`docs/architecture/lifecycle-decision-model.md\`
- recommended_profile: \`direct\`
- risk_signals: []
- autonomy_ceiling: \`direct_execution_allowed\`
`;
}

function renderInitPlanDocument(branch: string, timestamp: string, docsLanguage: string): string {
  const zh = usesChineseInitDocs(docsLanguage);
  const title = zh ? '# Plan: Project Onboarding / 项目入门' : '# Plan: Project Onboarding';
  const background = zh
    ? '在实现开始前，请用第一个真实功能或变更请求的业务背景与技术背景替换这份 starter plan。'
    : 'Replace this starter plan with the business and technical context for the first real feature or change request before implementation begins.';
  const goals = zh
    ? '- Goals: 写明本次变更必须交付的结果。\n- Non-goals: 写明防止范围蔓延的边界。'
    : '- Goals: replace with the outcomes this change must deliver.\n- Non-goals: replace with boundaries that prevent scope creep.';
  const currentState = zh
    ? '描述当前流程、代码区域、state/data/API 行为以及已知约束。'
    : 'Describe the current flow, code areas, state/data/API behavior, and known constraints.';
  const targetDesign = zh
    ? '描述已选择的技术方案，以及它为什么是从 spec 到 implementation 最安全的 task-ready 路径。'
    : 'Describe the selected technical solution and why it is the safest task-ready path from spec to implementation.';
  return `---
template: sdd-init-onboarding-plan-v1
version: 1.4.0
contract: sdd-plan-doc-v1
sdd_managed_starter: true
---

${title}

## Metadata

- spec_id: \`onboarding\`
- plan_id: \`onboarding\`
- branch: \`${branch}\`
- created_at: \`${timestamp}\`
- updated_at: \`${timestamp}\`

## 0.1 Requirement Trace

| Spec Item | Plan Section | Design Response |
|---|---|---|
| AC-1 | §13 Validation Plan | onboarding status check maps to validation evidence |
| AC-2 | §14 Task Breakdown Rationale | starter task boundary protects user-authored documents |

## 1. Background / Context

${background}

## 2. Goals and Non-goals

${goals}

## 3. Current State Analysis

${currentState}

## 4. Target Design Overview

${targetDesign}

## 5. Architecture / Component Design

Use PlantUML when component impact is non-trivial.

\`\`\`plantuml
@startuml
title Component Impact
component \"Existing Module\" as Existing
component \"Changed Module\" as Changed
database \"Data Store\" as DB
Existing --> Changed : call / event
Changed --> DB : read / write
@enduml
\`\`\`

## 6. Interaction / Sequence Design

Add a PlantUML sequence or activity diagram when cross-component flow, async work, or concurrency matters.

## 7. State / Data Design

Describe state machines, data model changes, persistence, idempotency, and migration/rollback impact.

## 8. Interface / API / Schema Design

Describe API, DTO, event, contract, or schema compatibility impact. Write \`None\` only after checking.

## 9. Concurrency / Transaction / Consistency Design

Describe transaction boundaries, locking/idempotency/retry behavior, and consistency guarantees when relevant.

## 10. Key Design Decisions

| Decision | Reason | Tradeoff | Rejected alternatives |
|---|---|---|---|
| Replace with decision | Replace with reason | Replace with tradeoff | Replace with alternatives |

## 11. Risk Control

| Risk | Impact | Control |
|---|---|---|
| Replace with risk | Replace with impact | Replace with mitigation |

## 12. Compatibility / Rollout / Rollback

Describe compatibility, rollout, feature flag/manual gate if needed, and rollback strategy.

## 13. Validation Plan

| Acceptance | Validation Method | Command / Evidence |
|---|---|---|
| AC-1 | Manual/automated check | \`<command or artifact>\` |

## 14. Task Breakdown Rationale

Explain why \`specs/${branch}/tasks.md\` should be split into the planned task boundaries.

## 15. Gaps / Assumptions

- Gap or assumption.

## 16. Risk-driven Plan Requirements

- state-machine risk: include state/data design and a PlantUML state diagram.
- concurrency risk: include sequence/activity diagram plus transaction/consistency design.
- database risk: include data, transaction, migration, and rollback design.
- api_schema risk: include interface/schema compatibility design.
- security/sql risk: include explicit risk controls.

## Phase Gate Checkpoint

- ready_for_tasks: \`true | false\`
- blockers: []
- required_user_decisions: []
`;
}

function renderInitTasksDocument(branch: string, timestamp: string, docsLanguage: string): string {
  const zh = usesChineseInitDocs(docsLanguage);
  const title = zh ? '# Tasks: Project Onboarding / 项目入门' : '# Tasks: Project Onboarding';
  const boundary = zh
    ? 'Allowed scope 仅限于把 starter onboarding scaffold 替换为项目专属的 SDD requirements、plan 和 tasks。'
    : 'Allowed scope is limited to replacing this starter onboarding scaffold with project-specific SDD requirements, plan, and tasks.';
  const implementationNotes = zh
    ? '由 \`sdd init\` 创建，用作安全的 onboarding placeholder。开始真实 implementation 前必须替换。'
    : 'Created by \`sdd init\` as a safe onboarding placeholder. Replace before real implementation.';
  return `---
template: sdd-init-onboarding-tasks-v1
version: 1.4.0
contract: sdd-tasks-doc-v1
sdd_managed_starter: true
---

${title}

## 0. Metadata

- tasks_id: \`onboarding\`
- spec_id: \`onboarding\`
- plan_id: \`onboarding\`
- branch: \`${branch}\`
- lifecycle_profile: \`direct\`
- status: \`draft\`
- created_at: \`${timestamp}\`
- updated_at: \`${timestamp}\`

## 1. Delivery Map

| Task | Spec Acceptance | Plan Section | Boundary Reason |
|---|---|---|---|
| ONBOARDING-1 | AC-1, AC-2 | §13 Validation Plan, §14 Task Breakdown Rationale | replace placeholders before real implementation |

## 2. Wave Plan

| Wave | Tasks | Gate |
|---|---|---|
| 1 | ONBOARDING-1 | user provides the first real feature/change request |

## 3. Task List

### ONBOARDING-1: Replace starter SDD documents with the first real task

\`\`\`sdd-task
id: ONBOARDING-1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
  - AC-2
plan_refs:
  - "§13 Validation Plan"
  - "§14 Task Breakdown Rationale"
affected_files:
  - specs/${branch}/spec.md
  - specs/${branch}/plan.md
  - specs/${branch}/tasks.md
validation:
  - sdd status --branch ${branch}
risk: []
agent_fit:
  - scout
  - planner
  - spec-reviewer
allowed_agents:
  - scout
  - planner
  - spec-reviewer
required_artifacts: []
verification_availability:
  - inspect:sdd status --branch ${branch}
autonomy: direct_execution_allowed
\`\`\`

#### Boundary

${boundary}

Forbidden scope:

- Do not create worktrees.
- Do not start background agents.
- Do not commit changes.
- Do not apply sync-back automatically.

#### Acceptance

- AC-1: \`specs/${branch}/spec.md\` becomes a real requirement contract with objective, actors/scenarios, scoped requirements, AC IDs, assumptions/dependencies, and risk gates.
- AC-2: \`specs/${branch}/plan.md\` maps spec acceptance to a task-ready technical solution document with risk-driven design sections and validation evidence.
- AC-3: \`specs/${branch}/tasks.md\` maps acceptance/design refs to executable task blocks with boundary, agent/artifact/verification/autonomy fields, Definition of Done, and evidence expectations.

#### Definition of Done

- Starter placeholders are replaced by a real request.
- Every task maps to spec acceptance refs.
- High-risk tasks define required artifacts and reviewer/validator expectations.
- \`sdd status --branch ${branch}\` reports no blocking document or task parser gaps.

#### Evidence Expectations

| Artifact | Expected Content |
|---|---|
| spec document | requirement contract with AC IDs |
| plan document | technical solution with requirement trace and validation matrix |
| tasks document | execution/evidence contract with task boundary and refs |

#### Implementation Notes

${implementationNotes}

## 4. Dependency Notes

- Single starter task only.
- The \`wave: 1\` field is present only because the current parser requires a positive wave value; it must not be interpreted as permission to run background agents or multi-wave orchestration.

## 5. Phase Gate Checkpoint

- ready_for_implementation: \`false\`
- blockers:
  - Replace onboarding placeholders with real project requirements before implementation.
- required_user_decisions:
  - Confirm the first real feature/change request.
`;
}

export async function readProjectConfig(projectRoot: string): Promise<ProjectConfig> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  return parseProjectConfig(raw, configPath);
}

export async function createRun(projectRoot: string, options: { runId?: string; lifecycleDecision?: LifecycleDecisionRecord } = {}): Promise<RunState> {
  await readProjectConfig(projectRoot);
  await mkdir(getRunsDir(projectRoot), { recursive: true });
  const runId = options.runId ?? await createUniqueRunId(projectRoot);
  const runDir = getRunDir(projectRoot, runId);
  const artifactsDir = getArtifactsDir(projectRoot, runId);
  const agentExecutionsDir = getAgentExecutionsDir(projectRoot, runId);
  const teamSessionsDir = getTeamSessionsDir(projectRoot, runId);
  const workerRuntimesDir = getWorkerRuntimesDir(projectRoot, runId);
  await Promise.all([
    mkdir(artifactsDir, { recursive: true }),
    mkdir(agentExecutionsDir, { recursive: true }),
    mkdir(teamSessionsDir, { recursive: true }),
    mkdir(workerRuntimesDir, { recursive: true })
  ]);

  const now = new Date().toISOString();
  const state: RunState = {
    contract: RUN_STATE_CONTRACT,
    runtimeVersion: RUNTIME_VERSION,
    runId,
    status: 'created',
    phase: null,
    currentTask: null,
    partition: null,
    gitBranch: null,
    taskId: null,
    affectedFiles: [],
    documentSnapshot: emptyRunDocumentSnapshot(),
    createdAt: now,
    updatedAt: now,
    projectRoot: path.resolve(projectRoot),
    projectConfigPath: path.relative(projectRoot, getProjectConfigPath(projectRoot)),
    eventLogPath: path.relative(projectRoot, path.join(runDir, 'events.jsonl')),
    artifactRoot: path.relative(projectRoot, artifactsDir),
    lifecycleDecision: options.lifecycleDecision ?? emptyLifecycleDecisionRecord(),
    tasks: {},
    agents: {},
    delegations: {},
    artifacts: [],
    artifactIngestions: {},
    worktrees: {},
    validation: {
      status: 'not_run',
      commands: [],
      evidence: []
    },
    syncBack: {
      mode: 'proposal',
      proposalPath: null,
      status: 'not_created'
    }
  };

  await writeRunState(projectRoot, state);
  await appendEvent(projectRoot, runId, {
    event: 'run_started',
    runId,
    summary: 'Run created by Phase 1.2 runtime skeleton',
    data: {
      runtimeVersion: RUNTIME_VERSION,
      statePath: path.relative(projectRoot, path.join(runDir, 'state.json'))
    }
  });
  if (state.lifecycleDecision) {
    await appendEvent(projectRoot, runId, {
      event: 'lifecycle_decision_recorded',
      runId,
      summary: 'Lifecycle decision placeholder recorded for Phase 1.7 command gate',
      data: {
        contract: LIFECYCLE_DECISION_CONTRACT,
        modelVersion: state.lifecycleDecision.model_version,
        profile: state.lifecycleDecision.decision.profile,
        confidence: state.lifecycleDecision.decision.confidence
      }
    });
  }
  return state;
}

export async function readRunState(projectRoot: string, runId: string): Promise<RunState> {
  const statePath = path.join(getRunDir(projectRoot, runId), 'state.json');
  const raw = await readFile(statePath, 'utf8');
  return normalizeRunState(JSON.parse(raw) as Partial<RunState>);
}

export async function writeRunState(projectRoot: string, state: RunState): Promise<void> {
  const nextState = normalizeRunState({
    ...state,
    updatedAt: new Date().toISOString()
  });
  const statePath = path.join(getRunDir(projectRoot, state.runId), 'state.json');
  await writeFile(statePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
}

function normalizeRunState(state: Partial<RunState>): RunState {
  return {
    ...state,
    partition: typeof state.partition === 'string' ? state.partition : null,
    gitBranch: typeof state.gitBranch === 'string' ? state.gitBranch : null,
    taskId: typeof state.taskId === 'string' ? state.taskId : state.currentTask ?? null,
    affectedFiles: Array.isArray(state.affectedFiles) ? state.affectedFiles.filter((file): file is string => typeof file === 'string') : [],
    documentSnapshot: normalizeRunDocumentSnapshot(state.documentSnapshot),
    artifactIngestions: state.artifactIngestions ?? {},
    worktrees: state.worktrees ?? {}
  } as RunState;
}

function normalizeRunDocumentSnapshot(snapshot: unknown): RunDocumentSnapshot {
  if (!isRecord(snapshot)) {
    return emptyRunDocumentSnapshot();
  }
  return {
    specHash: stringOrNull(snapshot.specHash),
    planHash: stringOrNull(snapshot.planHash),
    tasksHash: stringOrNull(snapshot.tasksHash),
    planBasedOnSpecHash: stringOrNull(snapshot.planBasedOnSpecHash),
    tasksBasedOnPlanHash: stringOrNull(snapshot.tasksBasedOnPlanHash)
  };
}

function emptyRunDocumentSnapshot(): RunDocumentSnapshot {
  return {
    specHash: null,
    planHash: null,
    tasksHash: null,
    planBasedOnSpecHash: null,
    tasksBasedOnPlanHash: null
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export async function appendEvent(projectRoot: string, runId: string, event: Omit<RuntimeEvent, 'contract' | 'time'>): Promise<RuntimeEvent> {
  const nextEvent: RuntimeEvent = {
    contract: EVENT_LOG_CONTRACT,
    time: new Date().toISOString(),
    ...event
  };
  const eventPath = path.join(getRunDir(projectRoot, runId), 'events.jsonl');
  await appendFile(eventPath, `${JSON.stringify(nextEvent)}\n`, 'utf8');
  return nextEvent;
}

export async function archiveRun(projectRoot: string, runId: string, options: { reason?: string } = {}): Promise<RunState> {
  const state = await readRunState(projectRoot, runId);
  const terminalEventAt = new Date().toISOString();
  const delegations = Object.fromEntries(Object.entries(state.delegations).map(([delegationId, delegation]) => [
    delegationId,
    delegation.status === 'RUNNING'
      ? { ...delegation, status: 'CANCELLED' as const, terminalEventAt }
      : delegation
  ]));

  for (const delegation of Object.values(delegations)) {
    if (delegation.status === 'CANCELLED' && state.delegations[delegation.delegationId]?.status === 'RUNNING') {
      await appendEvent(projectRoot, runId, {
        event: 'delegation_cancelled',
        runId,
        summary: `${delegation.delegationId} cancelled because run was archived.`,
        data: { delegationId: delegation.delegationId, reason: options.reason ?? null }
      });
    }
  }

  await writeRunState(projectRoot, {
    ...state,
    status: 'archived',
    delegations
  });
  await appendEvent(projectRoot, runId, {
    event: 'run_archived',
    runId,
    summary: options.reason ? `Run archived: ${options.reason}` : 'Run archived.',
    data: { reason: options.reason ?? null }
  });
  return readRunState(projectRoot, runId);
}

export async function listRuns(projectRoot: string): Promise<RunSummary[]> {
  const runsDir = getRunsDir(projectRoot);
  if (!await exists(runsDir)) {
    return [];
  }
  const entries = await readdir(runsDir, { withFileTypes: true });
  const summaries: RunSummary[] = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    try {
      const state = await readRunState(projectRoot, entry.name);
      summaries.push(summarizeRunState(state));
    } catch {
      continue;
    }
  }
  return summaries.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export async function rebuildLocalRunIndex(projectRoot: string): Promise<LocalRunIndex> {
  const index = await buildLocalRunIndexSnapshot(projectRoot);
  await writeFile(getLocalRunIndexPath(projectRoot), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

export async function readLocalRunIndex(projectRoot: string): Promise<LocalRunIndex> {
  const raw = await readFile(getLocalRunIndexPath(projectRoot), 'utf8');
  return normalizeLocalRunIndex(JSON.parse(raw) as Partial<LocalRunIndex>);
}

export async function queryLocalRunIndex(projectRoot: string, query: LocalRunIndexQuery = {}): Promise<LocalRunIndex> {
  const index = await readLocalRunIndex(projectRoot);
  const runIds = new Set(index.runs
    .filter((run) => !query.runId || run.runId === query.runId)
    .filter((run) => !query.status || run.status === query.status)
    .filter((run) => !query.taskId || run.taskIds.includes(query.taskId))
    .filter((run) => !query.artifact || index.artifacts.some((artifact) => artifact.runId === run.runId && artifact.path === query.artifact))
    .map((run) => run.runId));
  return {
    ...index,
    runs: index.runs.filter((run) => runIds.has(run.runId)),
    tasks: index.tasks.filter((task) => runIds.has(task.runId) && (!query.taskId || task.taskId === query.taskId) && (!query.partition || task.partition === query.partition)),
    delegations: index.delegations.filter((delegation) => runIds.has(delegation.runId) && (!query.taskId || delegation.taskId === query.taskId)),
    artifacts: index.artifacts.filter((artifact) => runIds.has(artifact.runId) && (!query.taskId || artifact.task === query.taskId) && (!query.artifact || artifact.path === query.artifact)),
    waves: index.waves.filter((wave) => runIds.has(wave.runId)),
    latestByPartitionTask: index.latestByPartitionTask.filter((entry) => runIds.has(entry.runId) && (!query.partition || entry.partition === query.partition) && (!query.taskId || entry.taskId === query.taskId)),
    activeByAffectedFile: index.activeByAffectedFile.filter((entry) => runIds.has(entry.runId) && (!query.partition || entry.partition === query.partition) && (!query.taskId || entry.taskId === query.taskId))
  };
}

export async function inspectLocalRunIndex(projectRoot: string): Promise<LocalRunIndexInspection> {
  const indexPath = getLocalRunIndexPath(projectRoot);
  if (!await exists(indexPath)) {
    return {
      valid: false,
      exists: false,
      indexPath,
      index: null,
      issues: [contractIssue('run_index', 'Local run index is missing.', 'Run sdd run index rebuild to recreate the derived index from .sdd/runs.')]
    };
  }

  try {
    const index = await readLocalRunIndex(projectRoot);
    const rebuilt = await buildLocalRunIndexSnapshot(projectRoot);
    const issues: ContractValidationIssue[] = [];
    if (index.contract !== LOCAL_RUN_INDEX_CONTRACT_VERSION) {
      issues.push(contractIssue('contract', `Local run index contract is ${index.contract}.`, 'Run sdd run index rebuild to refresh the index contract.'));
    }
    if (JSON.stringify(index.runs) !== JSON.stringify(rebuilt.runs)) {
      issues.push(contractIssue('runs', 'Local run index run summaries differ from .sdd/runs state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.tasks) !== JSON.stringify(rebuilt.tasks)) {
      issues.push(contractIssue('tasks', 'Local run index task entries differ from .sdd/runs state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.delegations) !== JSON.stringify(rebuilt.delegations)) {
      issues.push(contractIssue('delegations', 'Local run index delegation entries differ from .sdd/runs state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.artifacts) !== JSON.stringify(rebuilt.artifacts)) {
      issues.push(contractIssue('artifacts', 'Local run index artifact entries differ from .sdd/runs state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.waves) !== JSON.stringify(rebuilt.waves)) {
      issues.push(contractIssue('waves', 'Local run index wave summaries differ from .sdd/runs events.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.latestByPartitionTask) !== JSON.stringify(rebuilt.latestByPartitionTask)) {
      issues.push(contractIssue('latestByPartitionTask', 'Local run index partition/task latest view differs from .sdd/runs state.', 'Run sdd run index rebuild.'));
    }
    if (JSON.stringify(index.activeByAffectedFile) !== JSON.stringify(rebuilt.activeByAffectedFile)) {
      issues.push(contractIssue('activeByAffectedFile', 'Local run index affected-file active view differs from .sdd/runs state.', 'Run sdd run index rebuild.'));
    }
    return {
      valid: issues.length === 0,
      exists: true,
      indexPath,
      index,
      issues
    };
  } catch (error) {
    return {
      valid: false,
      exists: true,
      indexPath,
      index: null,
      issues: [contractIssue('run_index', `Cannot read local run index: ${messageFromError(error)}`, 'Run sdd run index rebuild to recreate the derived index.')]
    };
  }
}

async function buildLocalRunIndexSnapshot(projectRoot: string): Promise<LocalRunIndex> {
  const runsDir = getRunsDir(projectRoot);
  const states: RunState[] = [];
  if (await exists(runsDir)) {
    const entries = await readdir(runsDir, { withFileTypes: true });
    for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
      try {
        states.push(await readRunState(projectRoot, entry.name));
      } catch {
        continue;
      }
    }
  }

  const tasks: LocalRunIndexTaskEntry[] = [];
  const artifacts: LocalRunIndexArtifactEntry[] = [];
  const delegations: DelegationQueueItem[] = [];
  const waves: LocalRunIndexWaveSummary[] = [];
  const latestByPartitionTask = new Map<string, LocalRunIndexPartitionTaskEntry>();
  const activeByAffectedFile: LocalRunIndexAffectedFileEntry[] = [];

  for (const state of states) {
    for (const [taskId, taskState] of Object.entries(state.tasks)) {
      tasks.push({
        taskId,
        partition: state.partition,
        gitBranch: state.gitBranch,
        affectedFiles: state.affectedFiles,
        status: runtimeTaskStatus(taskState),
        runId: state.runId,
        runStatus: state.status,
        updatedAt: state.updatedAt
      });
    }
    if (state.partition && state.taskId && state.status !== 'archived') {
      const entry: LocalRunIndexPartitionTaskEntry = {
        partition: state.partition,
        gitBranch: state.gitBranch,
        taskId: state.taskId,
        runId: state.runId,
        runStatus: state.status,
        validationStatus: state.validation.status,
        syncBackStatus: state.syncBack.status,
        affectedFiles: state.affectedFiles,
        updatedAt: state.updatedAt
      };
      const key = partitionTaskKey(state.partition, state.taskId);
      const existing = latestByPartitionTask.get(key);
      if (!existing || Date.parse(entry.updatedAt) > Date.parse(existing.updatedAt) || (entry.updatedAt === existing.updatedAt && entry.runId.localeCompare(existing.runId) > 0)) {
        latestByPartitionTask.set(key, entry);
      }
      if (isActiveRunForAffectedFile(state)) {
        for (const file of state.affectedFiles) {
          activeByAffectedFile.push({
            file,
            partition: state.partition,
            gitBranch: state.gitBranch,
            taskId: state.taskId,
            runId: state.runId,
            runStatus: state.status,
            syncBackStatus: state.syncBack.status,
            updatedAt: state.updatedAt
          });
        }
      }
    }
    for (const artifact of state.artifacts) {
      artifacts.push({
        ...artifact,
        runId: state.runId
      });
    }
    delegations.push(...Object.values(state.delegations).map((delegation) => delegationQueueItemFromRunState(state, delegation)));
    const waveEvents = (await readRunEvents(projectRoot, state.runId)).filter((event) => event.event.startsWith('wave_executor_'));
    if (waveEvents.length > 0) {
      waves.push({
        runId: state.runId,
        eventCount: waveEvents.length,
        lastEvent: waveEvents[waveEvents.length - 1]?.event ?? null
      });
    }
  }

  return {
    contract: LOCAL_RUN_INDEX_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    runs: states.map((state) => summarizeRunState(state)).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
    tasks: tasks.sort((left, right) => (left.partition ?? '').localeCompare(right.partition ?? '') || left.taskId.localeCompare(right.taskId) || left.runId.localeCompare(right.runId)),
    delegations: delegations.sort((left, right) => left.id.localeCompare(right.id)),
    artifacts: artifacts.sort((left, right) => left.path.localeCompare(right.path) || left.runId.localeCompare(right.runId)),
    waves: waves.sort((left, right) => left.runId.localeCompare(right.runId)),
    latestByPartitionTask: Array.from(latestByPartitionTask.values()).sort((left, right) => left.partition.localeCompare(right.partition) || left.taskId.localeCompare(right.taskId)),
    activeByAffectedFile: activeByAffectedFile.sort((left, right) => left.file.localeCompare(right.file) || left.partition.localeCompare(right.partition) || left.taskId.localeCompare(right.taskId) || left.runId.localeCompare(right.runId))
  };
}

function normalizeLocalRunIndex(index: Partial<LocalRunIndex>): LocalRunIndex {
  return {
    contract: index.contract ?? LOCAL_RUN_INDEX_CONTRACT_VERSION,
    generatedAt: index.generatedAt ?? new Date().toISOString(),
    runs: index.runs ?? [],
    tasks: index.tasks ?? [],
    delegations: index.delegations ?? [],
    artifacts: index.artifacts ?? [],
    waves: index.waves ?? [],
    latestByPartitionTask: index.latestByPartitionTask ?? [],
    activeByAffectedFile: index.activeByAffectedFile ?? []
  };
}

function partitionTaskKey(partition: string, taskId: string): string {
  return `${partition}::${taskId}`;
}

function isActiveRunForAffectedFile(state: RunState): boolean {
  return state.status !== 'archived' && state.syncBack.status !== 'applied' && state.affectedFiles.length > 0;
}

export async function inspectRun(projectRoot: string, runId: string): Promise<RunInspection> {
  const state = await readRunState(projectRoot, runId);
  const [events, agentExecutions, teamSessions, workerRuntimes] = await Promise.all([
    readRunEvents(projectRoot, runId),
    listAgentExecutionRecords(projectRoot, runId),
    listTeamSessionRecords(projectRoot, runId),
    listResidentWorkerRuntimeRecords(projectRoot, runId)
  ]);
  return {
    summary: summarizeRunState(state),
    state,
    events,
    eventCount: events.length,
    recentEvents: events.slice(-10),
    artifacts: state.artifacts,
    artifactIngestions: Object.values(state.artifactIngestions ?? {}),
    worktrees: Object.values(state.worktrees ?? {}),
    validation: state.validation,
    syncBack: state.syncBack,
    taskRunEvidence: buildTaskRunEvidence(state, events, agentExecutions, teamSessions, workerRuntimes),
    tasks: state.tasks,
    agentExecutions,
    teamSessions,
    workerRuntimes
  };
}

function buildTaskRunEvidence(state: RunState, events: RuntimeEvent[], agentExecutions: AgentExecutionRecord[] = [], teamSessions: TeamSessionRecord[] = [], workerRuntimes: ResidentWorkerRuntimeRecord[] = []): TaskRunEvidenceContract {
  return {
    version: TASK_RUN_EVIDENCE_CONTRACT_VERSION,
    runId: state.runId,
    state: { status: state.status, phase: state.phase, currentTask: state.currentTask },
    events: events.map((event) => ({
      event: event.event,
      summary: event.summary ?? null,
      task: stringData(event.data, 'task'),
      agent: stringData(event.data, 'agent'),
      gate: stringData(event.data, 'gate'),
      validation: stringData(event.data, 'status') ?? stringData(event.data, 'validation'),
      gap: stringData(event.data, 'gap')
    })),
    artifacts: state.artifacts,
    validation: state.validation,
    gaps: Object.values(state.tasks).flatMap(extractTaskGaps),
    syncBackProposal: state.syncBack.proposalPath,
    agentExecutions,
    teamSessions,
    workerRuntimes
  };
}

function stringData(data: Record<string, unknown> | undefined, key: string): string | null {
  const value = data?.[key];
  return typeof value === 'string' ? value : null;
}

function extractTaskGaps(taskState: unknown): SddTaskGap[] {
  if (!taskState || typeof taskState !== 'object' || !('gaps' in taskState)) {
    return [];
  }
  const gaps = (taskState as { gaps?: unknown }).gaps;
  return Array.isArray(gaps) ? gaps.filter(isSddTaskGap) : [];
}

function isSddTaskGap(value: unknown): value is SddTaskGap {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const gap = value as Partial<SddTaskGap>;
  return typeof gap.type === 'string' && typeof gap.severity === 'string' && typeof gap.field === 'string' && typeof gap.message === 'string' && typeof gap.recommendation === 'string';
}

export async function resolveSddContext(projectRoot: string, options: { branch?: string | null; branchSource?: ContextBranchSource } = {}): Promise<ContextResolverContract> {
  const currentGitBranch = await getCurrentGitBranch(projectRoot);
  const requestedBranch = options.branch?.trim();
  if (requestedBranch) {
    return resolvedContext(projectRoot, requestedBranch, options.branchSource ?? 'explicit_option', currentGitBranch);
  }

  if (currentGitBranch) {
    return resolvedContext(projectRoot, currentGitBranch, 'git_branch', currentGitBranch);
  }

  const projectConfigBranch = await resolveProjectConfigBranch(projectRoot);
  if (projectConfigBranch) {
    return resolvedContext(projectRoot, projectConfigBranch, 'project_config', currentGitBranch);
  }

  throw new Error('Cannot resolve SDD branch. Run from a Git branch, pass --branch <branch>, or set sdd.default_branch in .sdd/project.yml. /sdd:spec is the workflow partition entry.');
}

function resolvedContext(projectRoot: string, rawBranch: string, branchSource: ContextBranchSource, currentGitBranch: string | null): ContextResolverContract {
  const partition = branchToSafePartition(rawBranch);
  return {
    contract: CONTEXT_RESOLVER_CONTRACT_VERSION,
    branch: partition,
    partition,
    rawBranch,
    branchSource,
    currentGitBranch,
    workingTreeMatched: currentGitBranch ? currentGitBranch === rawBranch : null,
    specDir: normalizePortablePath(path.relative(projectRoot, path.join(projectRoot, 'specs', partition)))
  };
}

async function resolveRunStateContext(projectRoot: string, state: RunState): Promise<ContextResolverContract> {
  if (!state.partition && !state.gitBranch) {
    return resolveSddContext(projectRoot);
  }

  const currentGitBranch = await getCurrentGitBranch(projectRoot);
  const partition = state.partition ?? branchToSafePartition(state.gitBranch ?? '');
  const rawBranch = state.gitBranch ?? state.partition ?? partition;
  return {
    contract: CONTEXT_RESOLVER_CONTRACT_VERSION,
    branch: partition,
    partition,
    rawBranch,
    branchSource: 'explicit_option',
    currentGitBranch,
    workingTreeMatched: currentGitBranch ? currentGitBranch === rawBranch : null,
    specDir: normalizePortablePath(path.relative(projectRoot, path.join(projectRoot, 'specs', partition)))
  };
}

async function resolveProjectConfigBranch(projectRoot: string): Promise<string | null> {
  try {
    const config = await readProjectConfig(projectRoot);
    const defaultBranch = safeBranchOrNull(config.sdd.default_branch ?? '');
    if (defaultBranch) {
      return defaultBranch;
    }

    const specDir = normalizePortablePath(config.sdd.spec_dir);
    if (specDir.includes('<branch>')) {
      return null;
    }
    const parts = specDir.split('/');
    if (parts.length === 2 && parts[0] === 'specs') {
      return safeBranchOrNull(parts[1]);
    }
    return null;
  } catch {
    return null;
  }
}


async function inspectRunEvidenceSummary(projectRoot: string, runId: string): Promise<RunEvidenceSummary> {
  const [state, events, agentExecutions, teamSessions, workerRuntimeList] = await Promise.all([
    readRunState(projectRoot, runId),
    readRunEvents(projectRoot, runId),
    listAgentExecutionRecords(projectRoot, runId),
    listTeamSessionRecords(projectRoot, runId),
    listResidentWorkerRuntimes(projectRoot, { runId })
  ]);
  return {
    agentExecutions: agentExecutions.length,
    teamSessions: teamSessions.length,
    artifactIngestions: Object.keys(state.artifactIngestions ?? {}).length,
    workerRuntimes: workerRuntimeList.runtimes.length,
    staleWorkerRuntimes: workerRuntimeList.staleRuntimes,
    routePreflight: events.some((event) => event.event === 'agent_router_preflight'),
    tasksChangedAfterRun: false,
    tasksUpdatedAt: null,
    runUpdatedAt: state.updatedAt ?? null
  };
}


export async function getProjectStatus(projectRoot: string, options: { branch?: string | null; branchSource?: ContextBranchSource } = {}): Promise<ProjectStatus> {
  const context = await resolveSddContext(projectRoot, options);
  const branch = context.partition;
  const [model, index, gitRoot] = await Promise.all([parseSddBranch(projectRoot, branch), rebuildLocalRunIndex(projectRoot), getGitRoot(projectRoot)]);
  const latestRunsByTask = index.latestByPartitionTask.filter((entry) => entry.partition === branch);
  const latestPartitionRun = [...latestRunsByTask].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
  const latestRun = latestPartitionRun ? index.runs.find((run) => run.runId === latestPartitionRun.runId) ?? null : null;
  const latestRunState = latestRun ? await readRunState(projectRoot, latestRun.runId) : null;
  const latestRunEvidence = latestRun ? await inspectRunEvidenceSummary(projectRoot, latestRun.runId) : null;
  const enrichedLatestRunEvidence = latestRun && latestRunEvidence
    ? await addTaskDocumentStalenessToRunEvidence(model.tasksPath, latestRun, latestRunEvidence)
    : latestRunEvidence;
  const latestRunStaleReasons = latestRunState ? await runDocumentStaleReasons(projectRoot, latestRunState, model) : [];
  const affectedFileConflicts = latestRunState ? await affectedFileConflictsForRun(projectRoot, latestRunState) : [];
  const pendingTask = model.tasks.find((task) => task.status === 'pending');
  const blockingGaps = model.gaps.filter((gap) => gap.severity === 'blocking');
  const workflowStatus = model.documents.specExists || model.documents.planExists || model.documents.tasksExists ? 'active' : 'not_started';
  const visibleGaps = workflowStatus === 'not_started' ? [] : model.gaps;
  return {
    branch,
    workflowStatus,
    context,
    gitRoot,
    documents: model.documents,
    tasks: {
      total: model.tasks.length,
      pending: model.tasks.filter((task) => task.status === 'pending').length,
      inProgress: model.tasks.filter((task) => task.status === 'in_progress').length,
      completed: model.tasks.filter((task) => task.status === 'completed').length,
      blocked: model.tasks.filter((task) => task.status === 'blocked').length,
      deferred: model.tasks.filter((task) => task.status === 'deferred').length,
      unknown: model.tasks.filter((task) => task.status === 'unknown').length,
      gaps: visibleGaps.length
    },
    latestRun,
    latestRunsByTask,
    latestRunEvidence: enrichedLatestRunEvidence,
    latestRunStaleReasons,
    affectedFileConflicts,
    recommendedNextCommand: workflowStatus === 'not_started'
      ? specEntryCommand(context)
      : blockingGaps.length > 0
        ? `sdd tasks gaps --branch ${branch}`
        : latestRun?.syncBackStatus === 'proposed' && latestRun.currentTask
          ? `sdd sync-back inspect --branch ${branch} --task ${latestRun.currentTask}`
          : pendingTask
            ? `sdd tasks inspect ${pendingTask.id} --branch ${branch}`
            : `sdd tasks list --branch ${branch}`,
    gaps: visibleGaps
  };
}

function specEntryCommand(context: ContextResolverContract): string {
  return context.branchSource === 'git_branch' ? '/sdd:spec' : `/sdd:spec --branch ${context.rawBranch}`;
}

async function addTaskDocumentStalenessToRunEvidence(tasksPath: string, latestRun: RunSummary, evidence: RunEvidenceSummary): Promise<RunEvidenceSummary> {
  try {
    const tasksStat = await stat(tasksPath);
    const runUpdatedAtMs = Date.parse(latestRun.updatedAt);
    if (Number.isNaN(runUpdatedAtMs)) {
      return { ...evidence, runUpdatedAt: latestRun.updatedAt };
    }
    return {
      ...evidence,
      tasksChangedAfterRun: tasksStat.mtimeMs > runUpdatedAtMs,
      tasksUpdatedAt: tasksStat.mtime.toISOString(),
      runUpdatedAt: latestRun.updatedAt
    };
  } catch {
    return { ...evidence, runUpdatedAt: latestRun.updatedAt };
  }
}

export async function resolveTaskRun(projectRoot: string, options: { runId?: string; branch?: string; taskId: string }): Promise<ResolvedTaskRun> {
  if (options.runId) {
    const state = await readRunState(projectRoot, options.runId);
    const context = options.branch
      ? await resolveSddContext(projectRoot, { branch: options.branch, branchSource: 'cli_option' })
      : await resolveRunStateContext(projectRoot, state);
    const model = await parseSddBranch(projectRoot, context.partition);
    const inspected = inspectSddTask(model, options.taskId);
    if (state.partition && state.partition !== context.partition) {
      throw new Error(`Run ${state.runId} belongs to partition ${state.partition}, not ${context.partition}.`);
    }
    if (state.taskId && state.taskId !== options.taskId) {
      throw new Error(`Run ${state.runId} belongs to task ${state.taskId}, not ${options.taskId}.`);
    }
    return {
      runId: state.runId,
      state,
      context,
      model,
      task: inspected.task,
      explicitRunId: true,
      staleReasons: await runDocumentStaleReasons(projectRoot, state, model),
      affectedFileConflicts: await affectedFileConflictsForRun(projectRoot, state)
    };
  }

  const context = await resolveSddContext(projectRoot, options.branch ? { branch: options.branch, branchSource: 'cli_option' } : {});
  const model = await parseSddBranch(projectRoot, context.partition);
  const inspected = inspectSddTask(model, options.taskId);
  const index = await rebuildLocalRunIndex(projectRoot);
  const candidates = index.latestByPartitionTask.filter((entry) => entry.partition === context.partition && entry.taskId === options.taskId);
  if (candidates.length === 0) {
    throw new Error(`No eligible run found for ${context.partition}/${options.taskId}. Run sdd do task ${options.taskId} first, or pass --run <run_id>.`);
  }
  if (candidates.length > 1) {
    throw new Error(`Ambiguous runs found for ${context.partition}/${options.taskId}: ${candidates.map((candidate) => candidate.runId).join(', ')}. Pass --run <run_id>.`);
  }
  const state = await readRunState(projectRoot, candidates[0].runId);
  return {
    runId: state.runId,
    state,
    context,
    model,
    task: inspected.task,
    explicitRunId: false,
    staleReasons: await runDocumentStaleReasons(projectRoot, state, model),
    affectedFileConflicts: await affectedFileConflictsForRun(projectRoot, state)
  };
}

async function runDocumentStaleReasons(projectRoot: string, state: RunState, model: SddTaskModel): Promise<string[]> {
  const reasons: string[] = [];
  const snapshot = state.documentSnapshot;
  if (!snapshot.specHash && !snapshot.planHash && !snapshot.tasksHash) {
    reasons.push('Run has no document snapshot hashes; rerun do task before verify or sync-back apply.');
  }
  appendDocumentHashMismatch(reasons, 'spec.md', snapshot.specHash, model.documents.specHash ?? null);
  appendDocumentHashMismatch(reasons, 'plan.md', snapshot.planHash, model.documents.planHash ?? null);
  const tasksHash = model.documents.tasksHash ?? null;
  if (shouldReportDocumentHashMismatch(snapshot.tasksHash, tasksHash)) {
    const suppressTasksMismatch = await isAppliedSyncBackTasksWritebackCurrent(projectRoot, state, model.tasksPath);
    if (!suppressTasksMismatch) {
      appendDocumentHashMismatch(reasons, 'tasks.md', snapshot.tasksHash, tasksHash);
    }
  }
  if (model.documents.planStale) {
    reasons.push('Current plan.md is stale against spec.md.');
  }
  if (model.documents.tasksStale) {
    reasons.push('Current tasks.md is stale against plan.md or spec.md.');
  }
  return reasons;
}

function shouldReportDocumentHashMismatch(expected: string | null, actual: string | null): boolean {
  if (!expected && !actual) {
    return false;
  }
  return !expected || !actual || !documentHashMatches(expected, actual);
}

function appendDocumentHashMismatch(reasons: string[], documentName: string, expected: string | null, actual: string | null): void {
  if (shouldReportDocumentHashMismatch(expected, actual)) {
    reasons.push(`Run snapshot for ${documentName} is ${expected ?? 'missing'}, current hash is ${actual ?? 'missing'}.`);
  }
}

async function isAppliedSyncBackTasksWritebackCurrent(projectRoot: string, state: RunState, tasksPath: string): Promise<boolean> {
  if (state.syncBack.status !== 'applied') {
    return false;
  }
  try {
    const [tasksStat, events] = await Promise.all([stat(tasksPath), readRunEvents(projectRoot, state.runId)]);
    const relativeTasksPath = normalizePortablePath(path.relative(projectRoot, tasksPath));
    const appliedAtMs = Math.max(...events
      .filter((event) => {
        if (event.event !== 'sync_back_applied') {
          return false;
        }
        const eventTasksPath = typeof event.data?.tasksPath === 'string' ? normalizePortablePath(event.data.tasksPath) : null;
        return !eventTasksPath || eventTasksPath === relativeTasksPath;
      })
      .map((event) => Date.parse(event.time))
      .filter((time) => Number.isFinite(time)));
    return Number.isFinite(appliedAtMs) && tasksStat.mtimeMs <= appliedAtMs + 1;
  } catch {
    return false;
  }
}

async function affectedFileConflictsForRun(projectRoot: string, state: RunState): Promise<LocalRunIndexAffectedFileEntry[]> {
  if (!state.partition || !state.taskId || state.affectedFiles.length === 0) {
    return [];
  }
  const files = new Set(state.affectedFiles);
  const index = await rebuildLocalRunIndex(projectRoot);
  return index.activeByAffectedFile.filter((entry) => entry.runId !== state.runId && files.has(entry.file));
}

function deriveSyncBackApplyPolicy(state: RunState, task: SddTask | null): SyncBackApplyPolicy {
  const reasons: string[] = [];
  const decision = state.lifecycleDecision?.decision;

  if (!task) {
    reasons.push('Target task is missing, so sync-back apply cannot be classified as direct-safe.');
  }
  if (decision?.human_checkpoint_required === true) {
    reasons.push('Lifecycle decision requires a human checkpoint.');
  }
  if (decision?.profile === 'full' || decision?.profile === 'research') {
    reasons.push(`Lifecycle profile is ${decision.profile}.`);
  }
  if ((decision?.hard_gate_hits.length ?? 0) > 0) {
    reasons.push(`Lifecycle hard gates were hit: ${decision?.hard_gate_hits.join(', ')}.`);
  }
  if ((task?.risk.length ?? 0) > 0) {
    reasons.push(`Task declares risk tags: ${task?.risk.join(', ')}.`);
  }
  if ((task?.dependsOn.length ?? 0) > 0) {
    reasons.push(`Task depends on ${task?.dependsOn.length} other task(s).`);
  }
  if ((task?.affectedFiles.length ?? 0) > 3) {
    reasons.push(`Task affects ${task?.affectedFiles.length} files.`);
  }

  if (reasons.length > 0) {
    return {
      mode: 'confirm',
      requiresApproval: true,
      reasons
    };
  }

  return {
    mode: 'direct',
    requiresApproval: false,
    reasons: ['Task is direct-safe: no checkpoint, hard gate, risk tag, dependency, or broad file fan-out was detected.']
  };
}

function requireSyncBackApproval(policy: SyncBackApplyPolicy, reason: string): SyncBackApplyPolicy {
  return {
    mode: 'confirm',
    requiresApproval: true,
    reasons: policy.reasons.includes(reason) ? policy.reasons : [...policy.reasons, reason]
  };
}

export async function inspectSyncBack(projectRoot: string, options: { runId?: string; branch?: string; taskId?: string }): Promise<SyncBackInspection> {
  const taskId = options.taskId ?? (options.runId ? await taskIdFromRun(projectRoot, options.runId) : null);
  if (!taskId) {
    throw new Error('Cannot inspect sync-back without a task id. Pass --task <task_id> or use a run with currentTask.');
  }

  const resolved = await resolveTaskRun(projectRoot, { runId: options.runId, branch: options.branch, taskId });
  const branch = resolved.context.partition;
  const state = resolved.state;
  const model = resolved.model;
  const inspected = inspectSddTask(model, taskId);
  const reasons: string[] = [];
  const markdownTask = inspected.task;
  const taskGaps = inspected.gaps;
  if (!inspected.task) {
    reasons.push(`Task ${taskId} is missing or ambiguous in specs/${branch}/tasks.md.`);
  }
  for (const reason of resolved.staleReasons) {
    reasons.push(reason);
  }
  for (const conflict of resolved.affectedFileConflicts) {
    reasons.push(`Affected file ${conflict.file} is active in run ${conflict.runId} for ${conflict.partition}/${conflict.taskId}.`);
  }

  const proposalPath = state.syncBack.proposalPath;
  let proposal: string | null = null;
  if (!proposalPath) {
    reasons.push('Run has no sync-back proposal.');
  } else {
    try {
      proposal = await readArtifact(projectRoot, state.runId, toArtifactRootRelativePath(proposalPath));
    } catch (error) {
      reasons.push(`Cannot read sync-back proposal ${proposalPath}: ${messageFromError(error)}`);
    }
  }

  const runtimeGaps = runtimeTaskGaps(state.tasks[taskId]);
  const blockingGaps = [...taskGaps, ...runtimeGaps].filter((gap) => gap.severity === 'blocking');
  if (state.status !== 'completed') {
    reasons.push(`Run status is ${state.status}, expected completed.`);
  }
  if (state.validation.status !== 'pass') {
    reasons.push(`Run validation status is ${state.validation.status}, expected pass.`);
  }
  if (blockingGaps.length > 0) {
    reasons.push(`Sync-back is blocked by ${blockingGaps.length} blocking gap(s).`);
  }

  let applyPolicy = deriveSyncBackApplyPolicy(state, markdownTask);
  if (state.gitBranch && resolved.context.currentGitBranch && state.gitBranch !== resolved.context.currentGitBranch) {
    applyPolicy = requireSyncBackApproval(applyPolicy, `Current Git branch is ${resolved.context.currentGitBranch}, but run ${state.runId} belongs to ${state.gitBranch}.`);
  }

  return {
    runId: state.runId,
    branch,
    taskId,
    status: state.syncBack.status === 'applied' ? 'applied' : reasons.length === 0 ? 'ready' : 'blocked',
    reasons,
    proposalPath,
    proposal,
    runTaskStatus: runtimeTaskStatus(state.tasks[taskId]),
    markdownTask,
    markdownStatus: markdownTask?.status ?? null,
    targetTasksPath: model.tasksPath,
    artifacts: state.validation.evidence.length > 0 ? state.validation.evidence : state.artifacts.map((artifact) => artifact.path),
    gaps: [...taskGaps, ...runtimeGaps],
    applyPolicy,
    staleReasons: resolved.staleReasons,
    affectedFileConflicts: resolved.affectedFileConflicts
  };
}

async function taskIdFromRun(projectRoot: string, runId: string): Promise<string | null> {
  const state = await readRunState(projectRoot, runId);
  return state.taskId ?? state.currentTask;
}

export async function applySyncBack(projectRoot: string, options: { runId?: string; branch?: string; taskId?: string; approved?: boolean }): Promise<SyncBackApplyResult> {
  const inspection = await inspectSyncBack(projectRoot, options);
  if (!inspection.taskId) {
    throw new Error('Cannot apply sync-back without a task id.');
  }
  if (inspection.status === 'blocked') {
    throw new Error(`Cannot apply sync-back for ${inspection.runId}: ${inspection.reasons.join(' ')}`);
  }
  if (!inspection.markdownTask) {
    throw new Error(`Cannot apply sync-back for ${inspection.runId}: target task is missing.`);
  }
  if (inspection.status === 'applied') {
    return {
      runId: inspection.runId,
      taskId: inspection.taskId,
      applied: false,
      tasksPath: inspection.markdownTask.source.filePath,
      inspection,
      message: `Sync-back for ${inspection.runId}/${inspection.taskId} was already applied.`
    };
  }
  if (inspection.applyPolicy.requiresApproval && options.approved !== true) {
    throw new Error(`Cannot apply sync-back for ${inspection.runId}: ${inspection.applyPolicy.reasons.join(' ')} Re-run with --approved after human confirmation.`);
  }

  const state = await readRunState(projectRoot, inspection.runId);
  const tasksPath = inspection.markdownTask.source.filePath;
  const rawTasks = await readFile(tasksPath, 'utf8');
  const note = syncBackImplementationNote(state, inspection);
  const nextTasks = applySyncBackToTasksMarkdown(rawTasks, inspection.markdownTask, note);
  await writeFile(tasksPath, nextTasks, 'utf8');
  const appliedModel = await parseSddBranch(projectRoot, inspection.branch);
  await writeRunState(projectRoot, {
    ...state,
    documentSnapshot: documentSnapshotFromModel(appliedModel),
    syncBack: {
      ...state.syncBack,
      status: 'applied'
    }
  });
  await appendEvent(projectRoot, state.runId, {
    event: 'sync_back_applied',
    runId: state.runId,
    summary: `Sync-back applied for ${inspection.taskId}`,
    data: {
      task: inspection.taskId,
      branch: inspection.branch,
      tasksPath: path.relative(projectRoot, tasksPath),
      proposal: inspection.proposalPath
    }
  });

  await rebuildLocalRunIndex(projectRoot);

  const appliedInspection = await inspectSyncBack(projectRoot, { ...options, runId: inspection.runId, taskId: inspection.taskId });
  return {
    runId: state.runId,
    taskId: inspection.taskId,
    applied: true,
    tasksPath,
    inspection: appliedInspection,
    message: `Sync-back applied for ${state.runId}/${inspection.taskId}.`
  };
}

export async function doctor(projectRoot: string, options: { allRuns?: boolean; latestOnly?: boolean } = {}): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const gitRoot = await getGitRoot(projectRoot);
  checks.push(gitRoot
    ? { level: 'PASS', check: 'git_repo', message: `Git repository detected at ${gitRoot}` }
    : { level: 'FAIL', check: 'git_repo', message: 'Current directory is not inside a Git repository; doctor and run-index checks expect git context.', action: 'Run from a project Git repository, or run git init first for a fresh temporary/project sandbox.' });

  const configPath = getProjectConfigPath(projectRoot);
  if (await exists(configPath)) {
    try {
      await readProjectConfig(projectRoot);
      checks.push({ level: 'PASS', check: 'project_config', message: `.sdd/project.yml is readable and uses ${PROJECT_CONFIG_CONTRACT}.` });
    } catch (error) {
      checks.push({ level: 'FAIL', check: 'project_config', message: `Cannot parse .sdd/project.yml: ${messageFromError(error)}`, action: 'Run sdd init or fix the required project.yml keys.' });
    }
  } else {
    checks.push({ level: 'FAIL', check: 'project_config', message: '.sdd/project.yml is missing.', action: 'Run sdd init.' });
  }

  const runsDir = getRunsDir(projectRoot);
  if (await exists(runsDir)) {
    try {
      await access(runsDir, constants.R_OK | constants.W_OK);
      checks.push({ level: 'PASS', check: 'runs_dir', message: '.sdd/runs exists and is readable/writable.' });
      checks.push(...await inspectRunEvidence(projectRoot, options));
      checks.push(...await inspectLocalRunIndexEvidence(projectRoot));
    } catch {
      checks.push({ level: 'FAIL', check: 'runs_dir', message: '.sdd/runs is not readable/writable.', action: 'Fix filesystem permissions for .sdd/runs.' });
    }
  } else {
    checks.push({ level: 'WARN', check: 'runs_dir', message: '.sdd/runs does not exist yet.', action: 'Run sdd init or sdd run create.' });
  }

  const specsDir = path.join(projectRoot, 'specs');
  checks.push(await exists(specsDir)
    ? { level: 'PASS', check: 'specs_dir', message: 'specs directory exists.' }
    : { level: 'WARN', check: 'specs_dir', message: 'specs directory is missing.', action: 'Create specs/<branch>/ documents before full SDD execution.' });

  checks.push(...await inspectDocumentChainEvidence(projectRoot));
  if (await exists(configPath)) {
    checks.push(...await inspectAiToolEntryEvidence(projectRoot));
  }
  checks.push(...await inspectCapabilityRegistry(projectRoot));
  checks.push(...await inspectToolPluginContracts(projectRoot));
  checks.push(...await inspectDelegationQueueContract(projectRoot));
  checks.push(...await inspectDelegationStateMachineContract(projectRoot));
  checks.push(...await inspectWorkerAdapterContracts(projectRoot));
  checks.push(...await inspectWorktreeIsolationContract(projectRoot));
  checks.push(...await inspectWorktreeLifecycleContract(projectRoot));
  checks.push(...await inspectTaskGraphPlannerContract(projectRoot));
  checks.push(...await inspectWavePlannerContract(projectRoot));
  checks.push(...await inspectBackgroundExecutorContract(projectRoot));
  checks.push(...await inspectWaveExecutorContract(projectRoot));
  checks.push(...await inspectLocalRunIndexContract(projectRoot));
  checks.push(...await inspectGovernancePolicyContract(projectRoot));
  checks.push(...await inspectQueryStatusBoundaryContract(projectRoot));
  checks.push(...await inspectAgentSkillTeamRuntimeDoctorContract(projectRoot));
  checks.push(...await inspectSkillAgentEvalDoctorContract(projectRoot));
  checks.push(...await inspectHarnessLearningDoctorContract(projectRoot));
  checks.push(...await inspectProjectContextPackDoctorContract(projectRoot));

  return {
    status: summarizeDoctorStatus(checks),
    checks
  };
}

export async function parseSddBranch(projectRoot: string, branch = 'master'): Promise<SddTaskModel> {
  assertSafePathSegment(branch, 'branch');
  const specPath = path.join(projectRoot, 'specs', branch, 'spec.md');
  const planPath = path.join(projectRoot, 'specs', branch, 'plan.md');
  const tasksPath = path.join(projectRoot, 'specs', branch, 'tasks.md');
  const [specExists, planExists, tasksExists] = await Promise.all([exists(specPath), exists(planPath), exists(tasksPath)]);
  const [rawSpec, rawPlan, rawTasks] = await Promise.all([
    specExists ? readFile(specPath, 'utf8') : Promise.resolve(null),
    planExists ? readFile(planPath, 'utf8') : Promise.resolve(null),
    tasksExists ? readFile(tasksPath, 'utf8') : Promise.resolve(null)
  ]);
  const documents = buildDocumentChainState({ specExists, planExists, tasksExists, rawSpec, rawPlan, rawTasks });
  const gaps: SddTaskGap[] = [];

  if (documents.planStale) {
    gaps.push(documentGap('plan.md', `Plan document is stale because based_on_spec_hash ${documents.planBasedOnSpecHash} no longer matches current spec hash ${documents.specHash}.`, 'Re-run /sdd:plan for this partition before updating tasks or executing implementation.'));
  }
  if (documents.tasksStale) {
    gaps.push(documentGap('tasks.md', `Tasks document is stale because based_on_plan_hash ${documents.tasksBasedOnPlanHash} no longer matches current plan hash ${documents.planHash}.`, 'Re-run /sdd:tasks for this partition before executing implementation.'));
  }
  if (!specExists) {
    gaps.push(documentGap('spec.md', 'Spec document is missing.', 'Create or restore specs/<branch>/spec.md before full SDD execution.'));
  }
  if (!planExists) {
    gaps.push(documentGap('plan.md', 'Plan document is missing.', 'Create or restore specs/<branch>/plan.md before task execution.'));
  }
  if (!tasksExists || rawTasks === null) {
    gaps.push(documentGap('tasks.md', 'Tasks document is missing.', 'Create specs/<branch>/tasks.md with sdd-task fenced blocks.'));
    return {
      branch,
      specPath,
      planPath,
      tasksPath,
      documents,
      tasks: [],
      gaps
    };
  }

  const taskModel = parseSddTasksMarkdown(rawTasks, { tasksPath });
  if (taskModel.tasks.length === 0 && !path.basename(tasksPath).startsWith('phase')) {
    const retainedModel = await parseRetainedPhaseTasks(path.dirname(tasksPath));
    if (retainedModel.tasks.length > 0) {
      return {
        branch,
        specPath,
        planPath,
        tasksPath,
        documents,
        tasks: retainedModel.tasks,
        gaps: [...gaps, ...retainedModel.gaps]
      };
    }
  }
  return {
    branch,
    specPath,
    planPath,
    tasksPath,
    documents,
    tasks: taskModel.tasks,
    gaps: [...gaps, ...taskModel.gaps]
  };
}

function buildDocumentChainState(input: { specExists: boolean; planExists: boolean; tasksExists: boolean; rawSpec: string | null; rawPlan: string | null; rawTasks: string | null }): SddTaskModel['documents'] {
  const specHash = input.rawSpec === null ? null : hashDocumentContent(input.rawSpec);
  const planHash = input.rawPlan === null ? null : hashDocumentContent(input.rawPlan);
  const tasksHash = input.rawTasks === null ? null : hashDocumentContent(input.rawTasks);
  const planBasedOnSpecHash = input.rawPlan === null ? null : readDocumentScalar(input.rawPlan, 'based_on_spec_hash');
  const tasksBasedOnPlanHash = input.rawTasks === null ? null : readDocumentScalar(input.rawTasks, 'based_on_plan_hash');

  const planStale = Boolean(planBasedOnSpecHash && specHash && !documentHashMatches(planBasedOnSpecHash, specHash));
  const tasksHashMismatch = Boolean(tasksBasedOnPlanHash && planHash && !documentHashMatches(tasksBasedOnPlanHash, planHash));

  return {
    specExists: input.specExists,
    planExists: input.planExists,
    tasksExists: input.tasksExists,
    specHash,
    planHash,
    tasksHash,
    planBasedOnSpecHash,
    tasksBasedOnPlanHash,
    planStale,
    tasksStale: planStale || tasksHashMismatch
  };
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function readDocumentScalar(raw: string, key: string): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = raw.match(new RegExp(`^\\s*(?:-\\s*)?${escapedKey}:\\s*(.+?)\\s*$`, 'm'));
  return match?.[1]?.trim().replace(/^["'`]|["'`]$/g, '') ?? null;
}

function documentHashMatches(expected: string, actual: string): boolean {
  return expected.replace(/^sha256:/, '') === actual;
}


export function parseSddTasksMarkdown(raw: string, options: { branch?: string; tasksPath?: string; validateDependencies?: boolean } = {}): Pick<SddTaskModel, 'tasks' | 'gaps'> {
  const tasksPath = options.tasksPath ?? 'tasks.md';
  const fencedBlocks = Array.from(raw.matchAll(/^\s*```sdd-task\s*\r?\n([\s\S]*?)\r?^\s*```\s*$/gm));
  const tasks: SddTask[] = [];
  const gaps: SddTaskGap[] = [];

  if (fencedBlocks.length === 0) {
    gaps.push({
      type: 'Task Gap',
      severity: 'blocking',
      taskId: null,
      field: 'sdd-task',
      message: 'No sdd-task fenced blocks found in tasks.md.',
      recommendation: 'Add one sdd-task fenced block per executable task.'
    });
    return { tasks, gaps };
  }

  const seenIds = new Map<string, SddTaskSourceLocation>();
  for (let blockIndex = 0; blockIndex < fencedBlocks.length; blockIndex += 1) {
    const blockMatch = fencedBlocks[blockIndex];
    const block = blockMatch[1] ?? '';
    const blockStart = blockMatch.index ?? 0;
    const blockEnd = blockStart + blockMatch[0].length;
    const nextBlockStart = fencedBlocks[blockIndex + 1]?.index ?? raw.length;
    const lineStart = lineNumberAt(raw, blockStart);
    const lineEnd = lineNumberAt(raw, blockEnd);
    const heading = nearestTaskHeading(raw.slice(0, blockStart));
    const metadata = parseSimpleYamlBlock(block);
    const id = scalarValue(metadata.id);
    const taskId = id || heading?.id || null;
    const section = raw.slice(blockEnd, nextTaskStart(raw, blockEnd, nextBlockStart));
    const parsedSections = parseTaskCompanionSections(section);
    if (!taskId) {
      gaps.push({
        type: 'Task Gap',
        severity: 'blocking',
        taskId: null,
        field: 'id',
        message: `sdd-task block starting at line ${lineStart} is missing id.`,
        recommendation: 'Add a stable id field such as id: T1.'
      });
      continue;
    }

    const source: SddTaskSourceLocation = {
      filePath: tasksPath,
      heading: heading?.raw ?? null,
      lineStart,
      lineEnd
    };
    const priorSource = seenIds.get(taskId);
    if (priorSource) {
      gaps.push({
        type: 'Task Gap',
        severity: 'blocking',
        taskId,
        field: 'id',
        message: `Duplicate task id ${taskId} in ${taskSourceEvidence({ id: taskId, source })} and ${sourceLocationEvidence(priorSource)}.`,
        recommendation: 'Keep task ids unique within a spec branch.'
      });
    }
    seenIds.set(taskId, source);

    const task: SddTask = {
      id: taskId,
      title: heading?.title ?? null,
      status: parseTaskStatus(scalarValue(metadata.status)),
      wave: parseWave(scalarValue(metadata.wave)),
      dependsOn: listValue(metadata.depends_on),
      affectedFiles: listValue(metadata.affected_files),
      validation: listValue(metadata.validation),
      risk: listValue(metadata.risk),
      acceptanceRefs: listValue(metadata.acceptance_refs),
      planRefs: listValue(metadata.plan_refs),
      fileOwnership: listValue(metadata.file_ownership),
      agentFit: listValue(metadata.agent_fit),
      verificationAvailability: listValue(metadata.verification_availability),
      autonomy: scalarValue(metadata.autonomy),
      allowedAgents: listValue(metadata.allowed_agents),
      requiredArtifacts: listValue(metadata.required_artifacts),
      gapState: scalarValue(metadata.gap_state),
      boundary: parsedSections.boundary,
      acceptance: parsedSections.acceptance,
      implementationNotes: parsedSections.implementationNotes,
      rawMetadata: metadata,
      source
    };
    tasks.push(task);
    gaps.push(...validateTask(task));
  }

  if (options.validateDependencies !== false) {
    gaps.push(...validateAggregateTaskSet(tasks));
  }

  return { tasks, gaps };
}

export async function renderSddResultArtifactTemplate(projectRoot: string, options: SddResultArtifactTemplateOptions): Promise<string> {
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const status = options.status ?? 'PASS';
  if (!isSddResultStatus(status)) {
    throw new Error(`Unsupported sdd-result status ${status}.`);
  }
  const artifactRootRelativePath = toArtifactRootRelativePath(options.artifactPath);
  const runRelativeArtifactPath = getRunRelativeArtifactPath(artifactRootRelativePath);
  const lines = [
    `# ${options.agent} result`,
    '',
    '```sdd-result',
    `contract: ${SDD_RESULT_CONTRACT}`,
    `version: ${SDD_RESULT_VERSION}`,
    `agent: ${options.agent}`,
    `task: ${options.taskId}`,
    `status: ${status}`,
    'artifacts:',
    `  - ${runRelativeArtifactPath}`,
    '```',
    ''
  ];

  let warning: string | null = null;
  let task: SddTask | null = null;
  try {
    const model = await parseSddBranch(projectRoot, branch);
    const inspected = inspectSddTask(model, options.taskId);
    task = inspected.task;
    if (!task) {
      warning = `Task ${options.taskId} was not found in specs/${branch}/tasks.md.`;
    }
  } catch (error) {
    warning = `Could not inspect task ${options.taskId} on branch ${branch}: ${messageFromError(error)}`;
  }

  if (warning) {
    lines.push('## Warning', '', `- ${warning}`, '');
  }

  if (options.agent === 'validator' && task) {
    lines.push('## Acceptance Mapping', '');
    const targets = taskAcceptanceCoverageTargets(task);
    lines.push(...(targets.length > 0
      ? targets.map((target) => `- Acceptance ${target.label}: TODO. Add validation evidence${target.description ? ` for ${target.description}` : ''}.`)
      : ['- No Acceptance items are declared for this task.']));
    lines.push('', '## Evidence', '');
    lines.push(...(task.validation.length > 0
      ? task.validation.map((command) => `- TODO run validation command: ${command}`)
      : ['- TODO add validation evidence.']));
    lines.push('');
  } else {
    lines.push('## Evidence', '', `- TODO cite files, commands, and task ${options.taskId} evidence here.`, '');
  }

  return lines.join('\n');
}

export async function validateSddResultArtifact(projectRoot: string, runId: string, runRelativeArtifactPath: string, options: { expectedTask?: string; expectedAgent?: string } = {}): Promise<SddResultValidationReport> {
  const issues: ContractValidationIssue[] = [];
  let artifactRootRelativePath: string;
  try {
    artifactRootRelativePath = toArtifactRootRelativePath(runRelativeArtifactPath);
  } catch (error) {
    return { valid: false, result: null, issues: [contractIssue('artifacts', messageFromError(error), 'Use a run-relative artifacts/<file> path; the physical file lives under .sdd/runs/<run_id>/artifacts/<file>. Source/test files belong in ## Evidence, not in sdd-result.artifacts.')] };
  }

  let raw: string;
  try {
    raw = await readArtifact(projectRoot, runId, artifactRootRelativePath);
  } catch (error) {
    return { valid: false, result: null, issues: [contractIssue('artifacts', `Cannot read artifact ${runRelativeArtifactPath}: ${messageFromError(error)}`, `Create the expected artifact at .sdd/runs/${runId}/${runRelativeArtifactPath} and pass the run-relative path ${runRelativeArtifactPath}.`)] };
  }

  if (raw.trim().length === 0) {
    issues.push(contractIssue('artifacts', `Artifact ${runRelativeArtifactPath} is empty.`, 'Write non-empty evidence and an sdd-result block.'));
  }
  const parsed = parseSddResultMarkdown(raw);
  issues.push(...parsed.issues);
  if (parsed.result) {
    issues.push(...validateSddResult(parsed.result, { ...options, runRelativeArtifactPath }));
  }

  return { valid: issues.length === 0 && parsed.result !== null, result: parsed.result, issues };
}

export function parseSddResultMarkdown(raw: string): SddResultValidationReport {
  const matches = Array.from(raw.matchAll(/^\s*```sdd-result\s*\r?\n([\s\S]*?)\r?^\s*```\s*$/gm));
  if (matches.length !== 1) {
    return {
      valid: false,
      result: null,
      issues: [contractIssue('sdd-result', matches.length === 0 ? 'No sdd-result fenced block found.' : `Expected exactly one sdd-result fenced block, found ${matches.length}.`, 'Embed one machine-readable sdd-result block in the artifact.')]
    };
  }
  const metadata = parseSimpleYamlBlock(matches[0][1] ?? '');
  const result = buildSddResult(metadata);
  const issues = result ? validateSddResult(result) : validateSddResultMetadata(metadata);
  return { valid: issues.length === 0 && result !== null, result, issues };
}

export function validateSddResult(result: SddResult, options: { expectedTask?: string; expectedAgent?: string; runRelativeArtifactPath?: string } = {}): ContractValidationIssue[] {
  const issues = validateSddResultMetadata(result.rawMetadata);
  if (options.expectedTask && result.task !== options.expectedTask) {
    issues.push(contractIssue('task', `sdd-result task ${result.task} does not match expected task ${options.expectedTask}.`, 'Write the delegated task id into the sdd-result task field.'));
  }
  if (options.expectedAgent && result.agent !== options.expectedAgent) {
    issues.push(contractIssue('agent', `sdd-result agent ${result.agent} does not match expected agent ${options.expectedAgent}.`, 'Write the delegated agent name into the sdd-result agent field.'));
  }
  if (options.runRelativeArtifactPath && !result.artifacts.includes(options.runRelativeArtifactPath)) {
    issues.push(contractIssue('artifacts', `sdd-result artifacts does not include its own path ${options.runRelativeArtifactPath}.`, `Add the current artifact path exactly: ${options.runRelativeArtifactPath}.`));
  }
  return issues;
}

export function createDelegationRecord(input: { delegationId: string; task: string; agent: string; expectedArtifact: string; runMode?: DelegationRunMode; blocking?: boolean; requiredForPhaseExit?: boolean; startedAt?: string; timeoutSeconds?: number; status?: DelegationStatus }): DelegationRecord {
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

export async function ingestArtifactResult(projectRoot: string, runId: string, input: { delegationId: string; artifactPath: string }): Promise<ArtifactResultIngestionResult> {
  const state = await readRunState(projectRoot, runId);
  const delegation = state.delegations[input.delegationId];
  if (!delegation) {
    throw new Error(`Unknown delegation ${input.delegationId} in run ${runId}.`);
  }

  const artifactPath = getRunRelativeArtifactPath(toArtifactRootRelativePath(input.artifactPath));
  const key = artifactIngestionKey(input.delegationId, artifactPath);
  const existing = (state.artifactIngestions ?? {})[key];
  if (existing) {
    return { valid: existing.status === 'accepted', duplicate: true, record: existing, delegation };
  }

  const report = await validateSddResultArtifact(projectRoot, runId, artifactPath, { expectedTask: delegation.task, expectedAgent: delegation.agent });
  const issues = [...report.issues];
  if (isDelegationTerminal(delegation.status)) {
    issues.push(contractIssue('delegation', `Delegation ${delegation.delegationId} is already terminal with status ${delegation.status}.`, 'Do not ingest a new artifact into a terminal delegation; create a new delegation id for retry.'));
  }
  if (report.valid && delegation.status !== 'RUNNING') {
    issues.push(contractIssue('delegation', `Delegation ${delegation.delegationId} must be RUNNING before accepting artifact ingestion.`, 'Start or retry the delegation before ingesting terminal result evidence.'));
  }

  const now = new Date().toISOString();
  const targetStatus = report.valid && report.result ? delegationStatusFromResultStatus(report.result.status) : null;
  const accepted = issues.length === 0 && report.valid && report.result !== null && targetStatus !== null;
  const gaps = report.result ? artifactIngestionGaps(delegation, report.result.status) : [];
  const record: ArtifactResultIngestionRecord = {
    contract: ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION,
    runId,
    delegationId: delegation.delegationId,
    task: delegation.task,
    agent: delegation.agent,
    artifactPath,
    status: accepted ? 'accepted' : 'rejected',
    resultStatus: report.result?.status ?? null,
    delegationStatus: accepted ? targetStatus : (report.valid ? null : 'RECOVERABLE'),
    ingestedAt: now,
    issues,
    gaps: accepted ? gaps : []
  };

  const nextDelegation = accepted
    ? { ...delegation, status: targetStatus, expectedArtifact: artifactPath, terminalEventAt: now }
    : report.valid || delegation.status !== 'RUNNING'
      ? delegation
      : { ...delegation, status: 'RECOVERABLE' as const, expectedArtifact: artifactPath };
  const knownArtifacts = new Set(state.artifacts.map((artifact) => artifact.path));
  const nextArtifacts = accepted && !knownArtifacts.has(artifactPath)
    ? [...state.artifacts, { path: artifactPath, kind: artifactKind(artifactPath), task: delegation.task, agent: delegation.agent, createdAt: now }]
    : state.artifacts;

  await writeRunState(projectRoot, {
    ...state,
    status: accepted && targetStatus === 'COMPLETED' ? state.status : accepted && targetStatus !== 'COMPLETED' ? 'blocked' : state.status,
    delegations: {
      ...state.delegations,
      [delegation.delegationId]: nextDelegation
    },
    artifacts: nextArtifacts,
    artifactIngestions: {
      ...(state.artifactIngestions ?? {}),
      [key]: record
    }
  });

  if (!accepted && delegation.status === 'RUNNING' && !report.valid) {
    await appendEvent(projectRoot, runId, { event: 'artifact_invalid', runId, summary: `Artifact ingestion rejected for ${delegation.delegationId}`, data: { delegationId: delegation.delegationId, artifact: artifactPath, issues } });
  }
  await appendEvent(projectRoot, runId, { event: accepted ? 'artifact_ingested' : 'artifact_ingestion_rejected', runId, summary: `Artifact ingestion ${record.status} for ${delegation.delegationId}`, data: { delegationId: delegation.delegationId, artifact: artifactPath, status: record.resultStatus, issues } });
  if (accepted) {
    await appendEvent(projectRoot, runId, { event: terminalEventForDelegationStatus(targetStatus), runId, summary: `Delegation ${delegation.delegationId} finished through artifact ingestion`, data: { delegationId: delegation.delegationId, artifact: artifactPath, status: record.resultStatus } });
  }
  return { valid: accepted, duplicate: false, record, delegation: nextDelegation };
}

export async function inspectArtifactResultIngestions(projectRoot: string, runId: string): Promise<ArtifactResultIngestionInspection> {
  const state = await readRunState(projectRoot, runId);
  const records = Object.values(state.artifactIngestions ?? {}).sort((left, right) => left.ingestedAt.localeCompare(right.ingestedAt));
  const issues: ContractValidationIssue[] = [];
  const hasLedger = Object.prototype.hasOwnProperty.call(state, 'artifactIngestions');
  const artifactPaths = new Set(state.artifacts.map((artifact) => artifact.path));

  for (const record of records) {
    const delegation = state.delegations[record.delegationId];
    if (!delegation) {
      issues.push(contractIssue('delegation', `Ingestion record references missing delegation ${record.delegationId}.`, 'Restore the delegation state or remove the invalid ingestion record from the run evidence.'));
      continue;
    }
    const report = await validateSddResultArtifact(projectRoot, runId, record.artifactPath, { expectedTask: record.task, expectedAgent: record.agent });
    if (record.status === 'accepted') {
      if (!report.valid) {
        issues.push(contractIssue('artifact', `Accepted ingestion artifact ${record.artifactPath} is no longer valid.`, 'Restore the accepted sdd-result artifact or mark the delegation with a new retry id.'));
      }
      if (delegation.expectedArtifact !== record.artifactPath || delegation.status !== record.delegationStatus) {
        issues.push(contractIssue('delegation', `Accepted ingestion ${record.delegationId}/${record.artifactPath} does not match delegation state.`, 'Keep delegation expectedArtifact/status aligned with accepted artifact ingestion evidence.'));
      }
      if (!artifactPaths.has(record.artifactPath)) {
        issues.push(contractIssue('artifacts', `Accepted ingestion artifact ${record.artifactPath} is missing from run artifact index.`, 'Add accepted artifact evidence to state.artifacts through artifact ingestion.'));
      }
    } else if (artifactPaths.has(record.artifactPath)) {
      issues.push(contractIssue('artifacts', `Rejected ingestion artifact ${record.artifactPath} is present in run artifact index.`, 'Rejected artifacts must not be indexed as accepted run evidence.'));
    }
  }

  if (hasLedger) {
    for (const delegation of Object.values(state.delegations)) {
      if (isDelegationTerminal(delegation.status) && delegation.expectedArtifact) {
        const key = artifactIngestionKey(delegation.delegationId, delegation.expectedArtifact);
        if (!(state.artifactIngestions ?? {})[key]) {
          issues.push(contractIssue('artifactIngestions', `Terminal delegation ${delegation.delegationId} has no artifact ingestion record for ${delegation.expectedArtifact}.`, 'Ingest terminal artifact evidence through the Phase 3.6 artifact ingestion API.'));
        }
      }
    }
  }

  return { runId, contract: ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION, records, valid: issues.length === 0, issues };
}


export function evaluateLifecycleDecisionGate(input: Partial<LifecycleDecisionSignals> = {}, decidedAt = new Date()): LifecycleDecisionGateResult {
  const signals = normalizeLifecycleSignals(input);
  const hardGateHits = evaluateLifecycleHardGates(signals);
  const reasons: string[] = [];
  const escalationTriggers = defaultEscalationTriggers();
  let profile: LifecycleProfile;

  if (hardGateHits.includes('external_unknown') || hardGateHits.includes('architecture_decision_required')) {
    profile = 'research';
    reasons.push('External unknowns or architecture decisions require research before implementation.');
  } else if (hardGateHits.some((gate) => FULL_PROFILE_HARD_GATES.includes(gate))) {
    profile = 'full';
    reasons.push('Hard gate requires full SDD path with explicit spec, plan, tasks, review, and validation evidence.');
  } else if (signals.impact_confidence === 'low') {
    profile = signals.can_scout_impact ? 'compact' : 'research';
    reasons.push(signals.can_scout_impact ? 'Impact confidence is low but can be bounded by scout evidence, so direct is not allowed.' : 'Impact cannot be estimated safely, so research is required.');
  } else if (signals.acceptance_clarity === 'low' || signals.validation_clarity === 'unclear') {
    profile = signals.external_unknown ? 'research' : 'compact';
    reasons.push('Acceptance or validation signals are insufficient for direct execution.');
  } else if (matchesDirectWhitelist(signals, hardGateHits)) {
    profile = 'direct';
    reasons.push('All direct whitelist conditions hold: clear intent, clear acceptance, high impact confidence, no risk tags, reversible change, and cheap local validation.');
  } else if (isBoundedCompactChange(signals)) {
    profile = 'compact';
    reasons.push('Change is bounded but needs lightweight task boundary or validation context.');
  } else {
    profile = 'full';
    reasons.push('Signals exceed compact boundary or require multi-step SDD evidence.');
  }

  if (hardGateHits.length > 0) {
    reasons.push(`Hard gates hit: ${hardGateHits.join(', ')}.`);
  }
  if (signals.policy_hits.length > 0) {
    reasons.push(`Policy hits require checkpoint attention: ${signals.policy_hits.join(', ')}.`);
  }
  if (signals.permission_required.length > 0) {
    reasons.push(`Permissions require explicit user/Claude Code confirmation: ${signals.permission_required.join(', ')}.`);
  }

  const confidence = estimateLifecycleConfidence(signals, hardGateHits);
  const checkpointRequired = signals.human_checkpoint_required || hardGateHits.includes('database_or_data_loss') || signals.reversibility === 'irreversible' || signals.policy_hits.length > 0 || signals.permission_required.length > 0 || (confidence === 'low' && profile !== 'research');
  const record: LifecycleDecisionRecord = {
    contract: LIFECYCLE_DECISION_CONTRACT,
    version: LIFECYCLE_DECISION_VERSION,
    model_version: 'phase1.0-final',
    input_summary: {
      intent_clarity: signals.intent_clarity,
      acceptance_clarity: signals.acceptance_clarity,
      estimated_change_size: signals.estimated_change_size,
      task_count_estimate: signals.task_count_estimate,
      file_count_estimate: signals.file_count_estimate,
      impact_surface: signals.affected_layers,
      affected_contracts: signals.affected_contracts,
      dependency_fanout: signals.dependency_fanout,
      impact_confidence: signals.impact_confidence,
      risk_tags: signals.risk_tags,
      reversibility: signals.reversibility,
      validation_clarity: signals.validation_clarity,
      validation_available: signals.validation_available,
      validation_cost: signals.validation_cost,
      orchestration_uncertainty: signals.orchestration_uncertainty,
      policy_hits: signals.policy_hits,
      permission_required: signals.permission_required
    },
    decision: {
      profile,
      confidence,
      hard_gate_hits: hardGateHits,
      required_stages: requiredStagesForProfile(profile),
      skipped_stages: skippedStagesForProfile(profile),
      human_checkpoint_required: checkpointRequired
    },
    reasons,
    escalation_triggers: escalationTriggers,
    downgrade_reason: null,
    audit: {
      decided_at: decidedAt.toISOString(),
      decided_by: 'command',
      policy_version: 'phase1.0-final',
      source_artifacts: uniqueStrings(['docs/architecture/lifecycle-decision-model.md', ...signals.source_artifacts])
    }
  };

  return {
    record,
    checkpointRequired,
    boundaries: commandIntegrationBoundaries(profile),
    autonomyCeiling: lifecycleAutonomyCeiling(record)
  };
}

export async function recordLifecycleDecision(projectRoot: string, runId: string, record: LifecycleDecisionRecord): Promise<RunState> {
  const state = await readRunState(projectRoot, runId);
  const nextState: RunState = {
    ...state,
    lifecycleDecision: record
  };
  await writeRunState(projectRoot, nextState);
  await appendEvent(projectRoot, runId, {
    event: 'lifecycle_decision_recorded',
    runId,
    summary: `Lifecycle decision recorded by Phase 1.7 command gate: ${record.decision.profile ?? 'unknown'} / ${record.decision.confidence ?? 'unknown'}`,
    data: {
      contract: record.contract,
      modelVersion: record.model_version,
      profile: record.decision.profile,
      confidence: record.decision.confidence,
      hardGateHits: record.decision.hard_gate_hits,
      humanCheckpointRequired: record.decision.human_checkpoint_required
    }
  });
  return readRunState(projectRoot, runId);
}

async function bindRunStateToTask(projectRoot: string, state: RunState, context: ContextResolverContract, model: SddTaskModel, task: SddTask | null, taskId: string): Promise<RunState> {
  if (state.partition && state.partition !== context.partition) {
    throw new Error(`Run ${state.runId} belongs to partition ${state.partition}, not ${context.partition}.`);
  }
  if (state.taskId && state.taskId !== taskId) {
    throw new Error(`Run ${state.runId} belongs to task ${state.taskId}, not ${taskId}.`);
  }
  if (state.gitBranch && state.gitBranch !== context.rawBranch) {
    throw new Error(`Run ${state.runId} belongs to Git branch ${state.gitBranch}, not ${context.rawBranch}.`);
  }

  const nextState: RunState = {
    ...state,
    currentTask: taskId,
    partition: context.partition,
    gitBranch: context.rawBranch,
    taskId,
    affectedFiles: task?.affectedFiles ?? state.affectedFiles,
    documentSnapshot: documentSnapshotFromModel(model)
  };
  await writeRunState(projectRoot, nextState);
  await appendEvent(projectRoot, state.runId, {
    event: 'run_context_bound',
    runId: state.runId,
    summary: `Run bound to ${context.partition}/${taskId}`,
    data: {
      partition: context.partition,
      gitBranch: context.rawBranch,
      task: taskId,
      affectedFiles: nextState.affectedFiles,
      documentSnapshot: nextState.documentSnapshot
    }
  });
  return readRunState(projectRoot, state.runId);
}

async function bindRunStateToTaskContext(projectRoot: string, state: RunState, context: ContextResolverContract, model: SddTaskModel, task: SddTask | null, taskId: string): Promise<RunState> {
  if (!state.taskId || state.taskId === taskId) {
    return bindRunStateToTask(projectRoot, state, context, model, task, taskId);
  }
  if (state.partition && state.partition !== context.partition) {
    throw new Error(`Run ${state.runId} belongs to partition ${state.partition}, not ${context.partition}.`);
  }
  if (state.gitBranch && state.gitBranch !== context.rawBranch) {
    throw new Error(`Run ${state.runId} belongs to Git branch ${state.gitBranch}, not ${context.rawBranch}.`);
  }

  const nextState: RunState = {
    ...state,
    currentTask: taskId,
    partition: context.partition,
    gitBranch: context.rawBranch,
    affectedFiles: [...new Set([...state.affectedFiles, ...(task?.affectedFiles ?? [])])],
    documentSnapshot: documentSnapshotFromModel(model)
  };
  await writeRunState(projectRoot, nextState);
  await appendEvent(projectRoot, state.runId, {
    event: 'run_context_bound',
    runId: state.runId,
    summary: `Run context updated for ${context.partition}/${taskId}`,
    data: {
      partition: context.partition,
      gitBranch: context.rawBranch,
      task: taskId,
      affectedFiles: nextState.affectedFiles,
      documentSnapshot: nextState.documentSnapshot
    }
  });
  return readRunState(projectRoot, state.runId);
}

function documentSnapshotFromModel(model: SddTaskModel): RunDocumentSnapshot {
  return {
    specHash: model.documents.specHash ?? null,
    planHash: model.documents.planHash ?? null,
    tasksHash: model.documents.tasksHash ?? null,
    planBasedOnSpecHash: model.documents.planBasedOnSpecHash ?? null,
    tasksBasedOnPlanHash: model.documents.tasksBasedOnPlanHash ?? null
  };
}

export async function runSingleTaskLoop(projectRoot: string, options: SingleTaskLoopOptions): Promise<SingleTaskLoopResult> {
  const context = await resolveSddContext(projectRoot, options.branch ? { branch: options.branch, branchSource: 'cli_option' } : {});
  const branch = context.partition;
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  const runState = options.runId ? await readRunState(projectRoot, options.runId) : await createRun(projectRoot);
  const boundRunState = await bindRunStateToTask(projectRoot, runState, context, model, inspected.task ?? null, options.taskId);
  const runId = boundRunState.runId;
  const routeDecision = await routeSddTask(projectRoot, { taskId: options.taskId, branch, teamModeEnabled: options.teamModeEnabled, teamModeActivation: options.teamModeActivation });
  await appendEvent(projectRoot, runId, {
    event: 'agent_router_preflight',
    runId,
    summary: `Agent router preflight ${routeDecision.blockedReason ? 'blocked' : 'passed'} for ${options.taskId}`,
    data: { taskId: options.taskId, decision: routeDecision }
  });
  if (routeDecision.teamMode.enabled || routeDecision.teamMode.decision !== 'disabled') {
    await writeTeamSessionRecord(projectRoot, buildTeamSessionRecord({
      runId,
      taskId: options.taskId,
      route: routeDecision,
      status: routeDecision.teamMode.decision === 'enabled' ? 'created' : routeDecision.teamMode.decision === 'blocked' ? 'blocked' : 'disabled',
      artifacts: [],
      evidenceSummary: `Team-mode ${routeDecision.teamMode.decision} during task preflight.`
    }));
  }

  await appendEvent(projectRoot, runId, {
    event: 'phase_started',
    runId,
    summary: `Phase 3.15 ingestion-aware task loop started for ${options.taskId}`,
    data: { phase: 'do', branch, task: options.taskId }
  });

  if (routeDecision.blockedReason || routeDecision.toolPermission?.policy === 'deny' || !inspected.task || inspected.gaps.some((gap) => gap.severity === 'blocking')) {
    const routeGap = routeDecision.blockedReason ? [taskGap(options.taskId, 'agent_router', routeDecision.blockedReason, routeDecision.nextAction)] : [];
    const toolPermissionGap = routeDecision.toolPermission?.policy === 'deny' ? [taskGap(options.taskId, 'tool_permission', 'Agent router denied required tool permission for this task.', 'Change task scope, tool policy, or route through a permitted profile before execution.')] : [];
    const allGaps = [...routeGap, ...toolPermissionGap, ...inspected.gaps];
    const gapArtifact = await writeArtifact(projectRoot, runId, `gap-report-${options.taskId}.md`, renderLoopGapReport(options.taskId, allGaps));
    const proposal = await writeSyncBackProposal(projectRoot, runId, options.taskId, 'blocked', [gapArtifact.runRelativePath], allGaps, 'Task selection is blocked by router preflight or parser/task gaps.');
    await persistLoopState(projectRoot, runId, {
      status: 'blocked',
      phase: 'do',
      taskId: options.taskId,
      taskState: { status: 'blocked', gaps: allGaps, artifacts: [gapArtifact.runRelativePath] },
      validationStatus: 'blocked',
      syncBackProposalPath: proposal.runRelativePath,
      artifacts: [{ path: gapArtifact.runRelativePath, kind: 'gap-report', task: options.taskId, agent: 'runtime' }]
    });
    await appendEvent(projectRoot, runId, {
      event: 'gap_detected',
      runId,
      summary: `Task ${options.taskId} is blocked before implementation.`,
      data: { gaps: allGaps, artifact: gapArtifact.runRelativePath, routeDecision }
    });
    await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
      runId,
      taskId: options.taskId,
      agent: 'orchestrator',
      route: routeDecision,
      status: 'blocked',
      delegationId: `P-${options.taskId}-router-001`,
      artifactPath: gapArtifact.runRelativePath,
      evidenceSummary: `Task loop blocked before implementation by router preflight or task gaps with ${allGaps.length} issue(s).`
    }));
    return {
      runId,
      taskId: options.taskId,
      status: 'blocked',
      task: inspected.task,
      gaps: allGaps,
      requiredArtifacts: [],
      acceptedArtifacts: [gapArtifact.runRelativePath],
      syncBackProposalPath: proposal.runRelativePath,
      routeDecision,
      message: 'Task loop blocked before implementation by router preflight or task gaps.'
    };
  }

  await appendEvent(projectRoot, runId, {
    event: 'task_selected',
    runId,
    summary: `Task selected for ingestion-aware task loop: ${options.taskId}`,
    data: { task: options.taskId, title: inspected.task.title, source: inspected.task.source }
  });

  const steps = buildLoopSteps(options.taskId, options);
  const acceptedArtifacts: string[] = [];
  const gaps: SddTaskGap[] = [];
  let terminalStatus: SingleTaskLoopStatus = 'completed';
  let validationStatus: RunState['validation']['status'] = 'pass';

  for (const step of steps) {
    if (!step.suppliedArtifact) {
      if (!step.required) {
        await appendEvent(projectRoot, runId, {
          event: 'delegation_cancelled',
          runId,
          summary: `${step.agent} artifact not supplied; optional step skipped for ${options.taskId}`,
          data: { agent: step.agent, expectedArtifact: step.expectedArtifact }
        });
        await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
          runId,
          taskId: options.taskId,
          agent: step.agent,
          route: routeDecision,
          status: 'skipped',
          delegationId: `B-${options.taskId}-${step.agent}-001`,
          evidenceSummary: `${step.agent} artifact was not supplied and the step is optional.`
        }));
        continue;
      }
      const gap = taskGap(options.taskId, step.agent, `${step.agent} artifact was not supplied; the task loop facade does not invoke external agents directly.`, `Run the ${step.agent} step in Claude Code and pass ${artifactOptionName(step.agent)} artifacts/<file>; physical file path is .sdd/runs/${runId}/artifacts/<file>.`);
      gaps.push(gap);
      await appendEvent(projectRoot, runId, {
        event: 'delegation_failed',
        runId,
        summary: `${step.agent} artifact missing for ${options.taskId}`,
        data: { agent: step.agent, expectedArtifact: step.expectedArtifact }
      });
      await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
        runId,
        taskId: options.taskId,
        agent: step.agent,
        route: routeDecision,
        status: 'blocked',
        delegationId: `B-${options.taskId}-${step.agent}-001`,
        evidenceSummary: `${step.agent} artifact was not supplied; execution is blocked before host invocation.`
      }));
      terminalStatus = 'blocked';
      validationStatus = step.agent === 'validator' ? 'blocked' : validationStatus;
      break;
    }

    const result = await runBackgroundExecutor(projectRoot, {
      branch,
      runId,
      taskId: options.taskId,
      agent: step.agent,
      artifactPath: step.suppliedArtifact,
      delegationId: `B-${options.taskId}-${step.agent}-001`
    });

    if (!result.ingestion || !result.ingestion.resultStatus) {
      const issueText = result.issues.map((issue) => issue.message).join('; ') || result.message;
      const recommendation = issueText.includes('manual isolation gate') || issueText.includes('requires confirmation')
        ? 'Resolve the manual isolation or approval gate for this high-risk task before ingesting execution artifacts.'
        : `Fix ${step.suppliedArtifact} so the Phase 3 executor can ingest one valid sdd-result block for ${step.agent}/${options.taskId}.`;
      gaps.push(taskGap(options.taskId, step.agent, `${step.agent} artifact ${step.suppliedArtifact} could not be ingested: ${issueText}`, recommendation));
      terminalStatus = 'blocked';
      validationStatus = step.agent === 'validator' ? 'blocked' : validationStatus;
      break;
    }

    acceptedArtifacts.push(result.ingestion.artifactPath);

    if (step.agent === 'reviewer') {
      if (result.ingestion.resultStatus === 'PASS') {
        await appendEvent(projectRoot, runId, { event: 'review_passed', runId, summary: `Review passed for ${options.taskId}`, data: { artifact: result.ingestion.artifactPath } });
      } else {
        await appendEvent(projectRoot, runId, { event: 'review_failed', runId, summary: `Review did not pass for ${options.taskId}; debugger may be supplied once.`, data: { artifact: result.ingestion.artifactPath, status: result.ingestion.resultStatus } });
        if (!options.debugArtifact) {
          gaps.push(taskGap(options.taskId, 'debugger', 'Review did not pass and no debugger artifact was supplied.', 'Run one debugger attempt or create a gap report; the task loop allows only one debugger pass.'));
          terminalStatus = result.ingestion.resultStatus === 'BLOCKED' ? 'blocked' : 'failed';
          validationStatus = 'fail';
          break;
        }
      }
    }

    if (step.agent === 'validator') {
      if (result.ingestion.resultStatus === 'PASS') {
        await appendEvent(projectRoot, runId, { event: 'validation_passed', runId, summary: `Validation passed for ${options.taskId}`, data: { artifact: result.ingestion.artifactPath } });
        validationStatus = 'pass';
      } else if (result.ingestion.resultStatus === 'PASS_WITH_GAPS') {
        await appendEvent(projectRoot, runId, { event: 'validation_passed', runId, summary: `Validation passed with gaps for ${options.taskId}; task remains blocked until gaps are resolved.`, data: { artifact: result.ingestion.artifactPath, status: result.ingestion.resultStatus } });
        gaps.push(taskGap(options.taskId, 'validation_gaps', 'Validator returned PASS_WITH_GAPS; the task loop cannot mark the task completed without structured gap evidence and explicit sync-back proposal semantics.', 'Inspect the validator artifact, resolve or defer each validation gap, then rerun with PASS validation evidence.'));
        validationStatus = 'pass_with_gaps';
        terminalStatus = 'blocked';
      } else {
        await appendEvent(projectRoot, runId, { event: 'validation_failed', runId, summary: `Validation failed for ${options.taskId}`, data: { artifact: result.ingestion.artifactPath, status: result.ingestion.resultStatus } });
        gaps.push(taskGap(options.taskId, 'validation', `Validator returned ${result.ingestion.resultStatus}.`, 'Do not mark the task completed; create a gap report or revise the task/plan.'));
        validationStatus = result.ingestion.resultStatus === 'BLOCKED' ? 'blocked' : 'fail';
        terminalStatus = result.ingestion.resultStatus === 'BLOCKED' ? 'blocked' : 'failed';
      }
    }
  }

  if (gaps.length > 0 && terminalStatus !== 'completed') {
    const gapArtifact = await writeArtifact(projectRoot, runId, `gap-report-${options.taskId}.md`, renderLoopGapReport(options.taskId, gaps));
    acceptedArtifacts.push(gapArtifact.runRelativePath);
    await appendEvent(projectRoot, runId, {
      event: 'gap_created',
      runId,
      summary: `Gap report created for ${options.taskId}`,
      data: { artifact: gapArtifact.runRelativePath, gaps }
    });
  }

  const proposal = await writeSyncBackProposal(projectRoot, runId, options.taskId, terminalStatus === 'completed' ? 'completed' : terminalStatus, acceptedArtifacts, gaps, terminalStatus === 'completed' ? 'Ingestion-aware task loop has accepted required artifacts through the Phase 3 executor.' : terminalStatus === 'blocked' && validationStatus === 'pass_with_gaps' ? 'Ingestion-aware task loop stopped because validator returned PASS_WITH_GAPS; sync-back is a blocked gap proposal, not task completion.' : 'Ingestion-aware task loop stopped with blocking/failing evidence.');
  await persistLoopState(projectRoot, runId, {
    status: terminalStatus,
    phase: 'do',
    taskId: options.taskId,
    taskState: { status: terminalStatus, gaps, artifacts: acceptedArtifacts },
    validationStatus,
    syncBackProposalPath: proposal.runRelativePath,
    artifacts: acceptedArtifacts.map((artifactPath) => ({ path: artifactPath, kind: artifactKind(artifactPath), task: options.taskId, agent: agentFromArtifactPath(artifactPath) }))
  });
  await appendEvent(projectRoot, runId, {
    event: 'sync_back_proposed',
    runId,
    summary: `Sync-back proposal created for ${options.taskId}`,
    data: { proposal: proposal.runRelativePath, status: terminalStatus }
  });
  await appendEvent(projectRoot, runId, {
    event: terminalStatus === 'completed' ? 'run_completed' : terminalStatus === 'blocked' ? 'gap_escalated' : 'validation_failed',
    runId,
    summary: `Phase 3.15 ingestion-aware task loop ${terminalStatus} for ${options.taskId}`,
    data: { task: options.taskId, artifacts: acceptedArtifacts, gaps }
  });
  if (routeDecision.teamMode.enabled || routeDecision.teamMode.decision !== 'disabled') {
    await writeTeamSessionRecord(projectRoot, buildTeamSessionRecord({
      runId,
      taskId: options.taskId,
      route: routeDecision,
      status: terminalStatus === 'completed' ? 'completed' : 'blocked',
      artifacts: acceptedArtifacts,
      evidenceSummary: `Team-mode ${routeDecision.teamMode.decision}; task loop ${terminalStatus} with ${acceptedArtifacts.length} artifact(s).`
    }));
  }

  return {
    runId,
    taskId: options.taskId,
    status: terminalStatus,
    task: inspected.task,
    gaps,
    requiredArtifacts: steps.map((step) => step.expectedArtifact),
    acceptedArtifacts,
    syncBackProposalPath: proposal.runRelativePath,
    routeDecision,
    message: terminalStatus === 'completed' ? 'Task loop completed through Phase 3 executor artifact ingestion.' : validationStatus === 'pass_with_gaps' ? 'Task loop blocked because validator returned PASS_WITH_GAPS; inspect gap report and sync-back proposal.' : 'Task loop stopped; inspect gap report and sync-back proposal.'
  };
}

export async function runGoalVerify(projectRoot: string, options: GoalVerifyOptions): Promise<GoalVerifyResult> {
  const resolved = await resolveTaskRun(projectRoot, { runId: options.runId, branch: options.branch, taskId: options.taskId });
  const branch = resolved.context.partition;
  const model = resolved.model;
  const inspected = { task: resolved.task, gaps: inspectSddTask(model, options.taskId).gaps };
  const runId = resolved.runId;
  const state = resolved.state;
  const reviewArtifact = options.reviewArtifact ?? artifactPathForAgent(state, options.taskId, 'reviewer');
  const validationArtifact = options.validationArtifact ?? artifactPathForAgent(state, options.taskId, 'validator');
  const gaps: SddTaskGap[] = [...inspected.gaps];
  for (const reason of resolved.staleReasons) {
    gaps.push(taskGap(options.taskId, 'run_snapshot', reason, 'Rerun sdd do task for the current partition before verify.'));
  }
  for (const conflict of resolved.affectedFileConflicts) {
    gaps.push(taskGap(options.taskId, 'affected_files', `Affected file ${conflict.file} is active in run ${conflict.runId} for ${conflict.partition}/${conflict.taskId}.`, 'Resolve or archive the conflicting active run before verify.'));
  }
  const acceptanceCoverage: AcceptanceCoverageItem[] = [];
  const acceptedArtifacts: string[] = [];
  let reviewStatus: SddResultStatus | null = null;
  let validationStatus: SddResultStatus | null = null;

  await appendEvent(projectRoot, runId, {
    event: 'phase_started',
    runId,
    summary: `Phase 1.9 goal-level verify started for ${options.taskId}`,
    data: { phase: 'verify', branch, task: options.taskId }
  });

  if (!inspected.task) {
    gaps.push(taskGap(options.taskId, 'task', `Task ${options.taskId} was not found for goal-level verification.`, 'Create the task or choose an existing task id before verify.'));
  }

  if (!reviewArtifact) {
    gaps.push(taskGap(options.taskId, 'review_artifact', 'No reviewer artifact was supplied or found in run state.', 'Run review first or pass --review-artifact artifacts/<file>.'));
  } else {
    const reviewReport = await validateSddResultArtifact(projectRoot, runId, reviewArtifact, { expectedTask: options.taskId, expectedAgent: 'reviewer' });
    if (!reviewReport.valid || !reviewReport.result) {
      gaps.push(taskGap(options.taskId, 'review_artifact', `Reviewer artifact ${reviewArtifact} is invalid: ${reviewReport.issues.map((issue) => issue.message).join('; ')}`, 'Fix reviewer artifact contract before goal-level verify.'));
    } else {
      reviewStatus = reviewReport.result.status;
      acceptedArtifacts.push(reviewArtifact);
      if (reviewReport.result.status !== 'PASS') {
        gaps.push(taskGap(options.taskId, 'review_status', `Reviewer status is ${reviewReport.result.status}, not PASS.`, 'Resolve review findings before marking verification PASS.'));
      }
    }
  }

  if (!validationArtifact) {
    gaps.push(taskGap(options.taskId, 'validation_artifact', 'No validator artifact was supplied or found in run state.', 'Run validation first or pass --validation-artifact artifacts/<file>.'));
  } else {
    const validationReport = await validateSddResultArtifact(projectRoot, runId, validationArtifact, { expectedTask: options.taskId, expectedAgent: 'validator' });
    if (!validationReport.valid || !validationReport.result) {
      gaps.push(taskGap(options.taskId, 'validation_artifact', `Validator artifact ${validationArtifact} is invalid: ${validationReport.issues.map((issue) => issue.message).join('; ')}`, 'Fix validator artifact contract before goal-level verify.'));
    } else {
      validationStatus = validationReport.result.status;
      acceptedArtifacts.push(validationArtifact);
      if (validationReport.result.status === 'FAIL' || validationReport.result.status === 'BLOCKED') {
        gaps.push(taskGap(options.taskId, 'validation_status', `Validator status is ${validationReport.result.status}.`, 'Do not mark task completed; inspect validation gaps and recovery proposal.'));
      }
    }
  }

  if (inspected.task) {
    const validationRaw = validationArtifact ? await readArtifactIfExists(projectRoot, runId, validationArtifact) : '';
    for (const target of taskAcceptanceCoverageTargets(inspected.task)) {
      const covered = target.matchTexts.some((text) => validationRaw.toLowerCase().includes(text.toLowerCase()));
      acceptanceCoverage.push({
        acceptance: target.label,
        status: covered ? statusFromValidation(validationStatus) : 'GAP',
        evidence: covered ? `Mentioned in ${validationArtifact}.` : 'No matching acceptance evidence found in validator artifact.'
      });
      if (!covered) {
        gaps.push(taskGap(options.taskId, 'acceptance_coverage', `Acceptance target is not covered by validator evidence: ${target.label}`, 'Update the validator artifact so it includes the acceptance ref or exact Acceptance text, preferably under ## Acceptance Mapping; use sdd artifact template to generate the mapping skeleton.'));
      }
    }
  }

  const status = deriveGoalVerifyStatus(reviewStatus, validationStatus, gaps);
  const standardStatus = toHarnessVerifyStatus(status, reviewStatus, validationStatus, gaps);
  const coverageArtifact = await writeArtifact(projectRoot, runId, `acceptance-coverage-${options.taskId}.md`, renderAcceptanceCoverageArtifact(options.taskId, status, inspected.task, reviewArtifact, validationArtifact, acceptanceCoverage, gaps));
  const allArtifacts = [...acceptedArtifacts, coverageArtifact.runRelativePath];
  const proposal = await writeSyncBackProposal(projectRoot, runId, options.taskId, status === 'PASS' ? 'verified' : 'blocked', allArtifacts, gaps, status === 'PASS' ? 'Goal-level verify mapped validator evidence to all acceptance items.' : 'Goal-level verify found gaps; sync-back is a verification gap proposal, not task completion.');

  await persistVerifyState(projectRoot, runId, {
    status,
    taskId: options.taskId,
    taskState: { status: status === 'PASS' ? 'verified' : 'blocked', verifyStatus: status, gaps, artifacts: allArtifacts, acceptanceCoverage },
    commands: inspected.task?.validation ?? [],
    evidence: allArtifacts,
    syncBackProposalPath: proposal.runRelativePath,
    artifacts: allArtifacts.map((artifactPath) => ({ path: artifactPath, kind: artifactKind(artifactPath), task: options.taskId, agent: agentFromArtifactPath(artifactPath) }))
  });
  await appendEvent(projectRoot, runId, {
    event: status === 'PASS' ? 'validation_passed' : 'validation_failed',
    runId,
    summary: `Phase 1.9 goal-level verify ${status} for ${options.taskId}`,
    data: { task: options.taskId, status, coverageArtifact: coverageArtifact.runRelativePath, gaps }
  });
  await appendEvent(projectRoot, runId, {
    event: 'sync_back_proposed',
    runId,
    summary: `Verify sync-back proposal created for ${options.taskId}`,
    data: { proposal: proposal.runRelativePath, status }
  });

  return {
    runId,
    taskId: options.taskId,
    status,
    task: inspected.task,
    reviewArtifact,
    validationArtifact,
    coverageArtifactPath: coverageArtifact.runRelativePath,
    syncBackProposalPath: proposal.runRelativePath,
    acceptanceCoverage,
    gaps,
    commands: inspected.task?.validation ?? [],
    standardStatus,
    message: status === 'PASS' ? 'Goal-level verify passed with explicit acceptance coverage.' : 'Goal-level verify found gaps; inspect coverage artifact and sync-back proposal.'
  };
}

export function renderGoalVerifyResult(result: GoalVerifyResult): string {
  const lines = ['SDD verify task result', 'changed'];
  lines.push(`- acceptance coverage written to ${result.coverageArtifactPath}`);
  lines.push(`- sync-back proposal written to ${result.syncBackProposalPath}`);
  lines.push('decision');
  lines.push(`- status=${result.status}`);
  lines.push(`- standard_status=${result.standardStatus}`);
  lines.push(`- message=${result.message}`);
  lines.push('evidence');
  lines.push(`- run=${result.runId}`);
  lines.push(`- task=${result.taskId}`);
  lines.push('- artifact_path_scope=CLI flags use run-relative artifacts/<file>; physical files live under .sdd/runs/<run_id>/artifacts/<file>');
  lines.push(`- review_artifact=${result.reviewArtifact ?? 'none'}`);
  lines.push(`- validation_artifact=${result.validationArtifact ?? 'none'}`);
  lines.push(`- commands=${result.commands.join(', ') || 'none'}`);
  if (result.acceptanceCoverage.length === 0) {
    lines.push('- acceptance_coverage=none');
  } else {
    for (const item of result.acceptanceCoverage) {
      lines.push(`- acceptance ${item.status}: ${item.acceptance} evidence=${item.evidence}`);
    }
  }
  lines.push('gaps');
  if (result.gaps.length === 0) {
    lines.push('- none');
  } else {
    appendTaskGaps(lines, result.gaps, result.taskId);
  }
  lines.push('next');
  if (result.status === 'PASS') {
    lines.push(`- sdd sync-back inspect ${result.runId} --task ${result.taskId}`);
  } else {
    lines.push(`- update review/validator artifacts and rerun sdd verify task ${result.taskId} --run ${result.runId}`);
  }
  return lines.join('\n');
}

export function renderSingleTaskLoopResult(result: SingleTaskLoopResult): string {
  const lines = ['SDD do task result', 'changed'];
  lines.push(`- run ${result.runId} created or updated for task ${result.taskId}`);
  if (result.acceptedArtifacts.length > 0) {
    lines.push(`- accepted artifacts: ${result.acceptedArtifacts.join(', ')}`);
  }
  lines.push('decision');
  lines.push(`- status=${result.status}`);
  lines.push(`- message=${result.message}`);
  lines.push(`- router category=${result.routeDecision.category} recommended_profile=${result.routeDecision.recommendedProfile ?? 'none'} autonomy=${result.routeDecision.autonomyCeiling}`);
  lines.push(`- team_mode=${result.routeDecision.teamMode.decision} mode=${result.routeDecision.teamMode.mode} activation=${result.routeDecision.teamMode.activation} cost=${result.routeDecision.teamMode.costClass}`);
  lines.push('evidence');
  lines.push('- artifact_path_scope=CLI flags use run-relative artifacts/<file>; physical files live under .sdd/runs/<run_id>/artifacts/<file>');
  lines.push(`- required_artifacts=${result.requiredArtifacts.join(',') || 'none'}`);
  lines.push(`- accepted_artifacts=${result.acceptedArtifacts.join(',') || 'none'}`);
  lines.push(`- sync_back_proposal=${result.syncBackProposalPath || 'none'}`);
  lines.push(`- agent_execution_records=.sdd/runs/${result.runId}/agent-executions/`);
  lines.push(`- team_session_records=.sdd/runs/${result.runId}/team-sessions/`);
  lines.push('gaps');
  if (result.gaps.length === 0) {
    lines.push('- none');
  } else {
    appendTaskGaps(lines, result.gaps, result.taskId);
  }
  lines.push('next');
  if (result.status === 'completed') {
    lines.push(`- sdd verify task ${result.taskId} --run ${result.runId}`);
  } else {
    const missingArtifacts = result.requiredArtifacts.filter((artifact) => !result.acceptedArtifacts.includes(artifact));
    if (missingArtifacts.length > 0) {
      lines.push(`- create or validate missing run-relative artifacts: ${missingArtifacts.join(', ')}`);
      lines.push(`- physical artifact files belong under .sdd/runs/${result.runId}/artifacts/`);
    }
    const artifactFlags = missingArtifacts
      .map((artifact) => ({ artifact, agent: agentForLoopArtifact(artifact) }))
      .filter((item): item is { artifact: string; agent: LoopAgentStep['agent'] } => Boolean(item.agent));
    for (const item of artifactFlags) {
      lines.push(`- sdd artifact template ${item.artifact} --task ${result.taskId} --agent ${item.agent} --run ${result.runId} --write`);
    }
    const rerunFlags = artifactFlags.map((item) => `${artifactOptionName(item.agent)} ${item.artifact}`).join(' ');
    lines.push(`- sdd do task ${result.taskId} --run ${result.runId}${rerunFlags ? ` ${rerunFlags}` : ''}`);
  }
  return lines.join('\n');
}

export function renderLifecycleDecisionGate(result: LifecycleDecisionGateResult): string {
  const decision = result.record.decision;
  const lines = [
    'Lifecycle Decision Gate',
    'changed',
    '- lifecycle decision evaluated',
    'decision',
    `- profile=${decision.profile ?? 'unknown'}`,
    `- confidence=${decision.confidence ?? 'unknown'}`,
    `- checkpoint_required=${decision.human_checkpoint_required}`,
    `- hard_gates=${decision.hard_gate_hits.join(',') || 'none'}`,
    `- required_stages=${decision.required_stages.join(' -> ') || 'none'}`,
    `- skipped_stages=${decision.skipped_stages.join(',') || 'none'}`,
    `- autonomy_ceiling=${result.autonomyCeiling}`,
    'evidence'
  ];
  for (const reason of result.record.reasons) {
    lines.push(`- ${reason}`);
  }
  lines.push('gaps');
  if (result.record.escalation_triggers.length === 0) {
    lines.push('- none');
  } else {
    for (const trigger of result.record.escalation_triggers) {
      lines.push(`- escalation_trigger: ${trigger}`);
    }
  }
  lines.push('next');
  if (decision.required_stages.length > 0) {
    lines.push(`- Complete required stages: ${decision.required_stages.join(' -> ')}.`);
  } else {
    lines.push('- No required stages were selected.');
  }
  lines.push('Command boundaries:');
  for (const boundary of result.boundaries) {
    lines.push(`- ${boundary}`);
  }
  return lines.join('\n');
}

export function inspectSddTask(model: SddTaskModel, taskId: string): { task: SddTask | null; gaps: SddTaskGap[] } {
  const matchingTasks = model.tasks.filter((candidate) => candidate.id === taskId);
  if (matchingTasks.length > 1) {
    return {
      task: null,
      gaps: [
        ...model.gaps.filter((gap) => gap.taskId === taskId),
        taskGap(
          taskId,
          'id',
          `Task id ${taskId} is ambiguous; ${matchingTasks.length} tasks share this id: ${matchingTasks.map(taskSourceEvidence).join('; ')}.`,
          'Inspect by a unique task id, or rename duplicate task ids before implementation.'
        )
      ]
    };
  }
  const task = matchingTasks[0] ?? null;
  return {
    task,
    gaps: model.gaps.filter((gap) => gap.taskId === taskId || (task === null && gap.taskId === null))
  };
}

export function renderTaskList(model: SddTaskModel): string {
  const lines = [`SDD tasks for ${model.branch}`];
  for (const task of model.tasks) {
    lines.push(`${task.id}\t${task.status}\twave=${task.wave ?? 'n/a'}\tdeps=${task.dependsOn.join(',') || 'none'}\t${task.title ?? ''}`.trim());
  }
  lines.push(`gaps=${model.gaps.length}`);
  return lines.join('\n');
}

export function renderTaskInspect(task: SddTask | null, gaps: SddTaskGap[] = []): string {
  if (task === null) {
    const lines = ['SDD task inspect', 'decision', '- task not found or ambiguous', 'gaps'];
    if (gaps.length === 0) {
      lines.push('- none');
    } else {
      appendTaskGaps(lines, gaps);
    }
    lines.push('next');
    lines.push('- run sdd tasks list or fix duplicate/missing task ids before implementation');
    return lines.join('\n');
  }

  const lines = [`SDD task ${task.id}`, 'changed', '- none', 'decision'];
  lines.push(`- title=${task.title ?? 'n/a'}`);
  lines.push(`- status=${task.status} wave=${task.wave ?? 'n/a'} depends_on=${task.dependsOn.join(',') || 'none'}`);
  lines.push(`- autonomy=${task.autonomy ?? 'n/a'}`);
  lines.push('evidence');
  lines.push(`- source=${task.source.filePath}:${task.source.lineStart}`);
  appendTextValue(lines, 'boundary', task.boundary);
  appendListValue(lines, 'acceptance', task.acceptance);
  appendListValue(lines, 'risk', task.risk);
  appendListValue(lines, 'acceptance_refs', task.acceptanceRefs);
  appendListValue(lines, 'plan_refs', task.planRefs);
  appendListValue(lines, 'affected_files', task.affectedFiles);
  appendListValue(lines, 'validation', task.validation);
  appendListValue(lines, 'agent_fit', task.agentFit);
  appendListValue(lines, 'verification_availability', task.verificationAvailability);
  appendListValue(lines, 'allowed_agents', task.allowedAgents);
  appendListValue(lines, 'required_artifacts', task.requiredArtifacts);
  lines.push('gaps');
  if (gaps.length === 0) {
    lines.push('- none');
  } else {
    appendTaskGaps(lines, gaps);
  }
  lines.push('next');
  if (gaps.some((gap) => gap.severity === 'blocking')) {
    lines.push(`- fix blocking task metadata gaps before running sdd do task ${task.id}`);
  } else {
    lines.push(`- sdd do task ${task.id}`);
  }
  return lines.join('\n');
}

function appendTextValue(lines: string[], label: string, value: string | null): void {
  lines.push(`- ${label}: ${value ?? 'none'}`);
}

function appendListValue(lines: string[], label: string, values: string[]): void {
  lines.push(`- ${label}: ${values.join(', ') || 'none'}`);
}

function appendTaskGaps(lines: string[], gaps: SddTaskGap[], fallbackTaskId = 'document'): void {
  for (const gap of gaps) {
    lines.push(`- [${gap.severity}] ${gap.type} ${gap.taskId ?? fallbackTaskId} ${gap.field}: ${gap.message}`);
    lines.push(`  recommendation: ${gap.recommendation}`);
  }
}

export function renderTaskGapReport(model: SddTaskModel): string {
  if (model.gaps.length === 0) {
    return 'PASS\nNo task gaps detected.';
  }
  const lines = ['BLOCKED', 'Task Gap Report'];
  for (const gap of model.gaps) {
    lines.push(`- [${gap.severity}] ${gap.type} ${gap.taskId ?? 'document'} ${gap.field}: ${gap.message} Recommendation: ${gap.recommendation}`);
  }
  return lines.join('\n');
}

export async function inspectTaskGraph(projectRoot: string, options: { branch?: string } = {}): Promise<TaskGraphPlan> {
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const model = await parseSddBranch(projectRoot, branch);
  const nodes = model.tasks.map((task): TaskGraphNode => ({
    taskId: task.id,
    title: task.title,
    status: task.status,
    wave: task.wave,
    dependsOn: task.dependsOn,
    affectedFiles: task.affectedFiles,
    risk: task.risk,
    validation: task.validation,
    acceptanceRefs: task.acceptanceRefs,
    planRefs: task.planRefs,
    fileOwnership: task.fileOwnership,
    agentFit: task.agentFit,
    verificationAvailability: task.verificationAvailability,
    autonomy: task.autonomy,
    allowedAgents: task.allowedAgents,
    requiredArtifacts: task.requiredArtifacts,
    gapState: task.gapState,
    source: task.source
  }));
  const diagnostics: TaskGraphDiagnostic[] = model.gaps.map((gap) => ({
    severity: gap.severity,
    taskId: gap.taskId,
    field: gap.field,
    message: gap.message,
    recommendation: gap.recommendation
  }));
  diagnostics.push(...detectTaskGraphCycles(model.tasks));
  const taskCounts = new Map<string, number>();
  for (const task of model.tasks) {
    taskCounts.set(task.id, (taskCounts.get(task.id) ?? 0) + 1);
  }
  const dependencyEdges = model.tasks.flatMap((task): TaskGraphEdge[] => task.dependsOn
    .filter((dependency) => taskCounts.get(dependency) === 1)
    .map((dependency) => ({ from: dependency, to: task.id, type: 'depends_on', files: [] })));
  const fileOverlapEdges: TaskGraphEdge[] = [];
  for (let leftIndex = 0; leftIndex < model.tasks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < model.tasks.length; rightIndex += 1) {
      const left = model.tasks[leftIndex];
      const right = model.tasks[rightIndex];
      const files = overlappingFiles(left.affectedFiles, right.affectedFiles);
      if (files.length > 0) {
        fileOverlapEdges.push({ from: left.id, to: right.id, type: 'file_overlap', files });
      }
    }
  }
  const validationCommands = [...new Set(model.tasks.flatMap((task) => task.validation))].sort();
  const highRiskTasks = model.tasks
    .filter((task) => task.risk.length > 0)
    .map((task) => task.id)
    .sort();

  return {
    contract: TASK_GRAPH_CONTRACT_VERSION,
    version: TASK_GRAPH_PLANNER_CONTRACT_VERSION,
    branch,
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== 'blocking'),
    nodes,
    dependencyEdges,
    fileOverlapEdges,
    diagnostics,
    summary: {
      tasks: nodes.length,
      dependencies: dependencyEdges.length,
      fileOverlaps: fileOverlapEdges.length,
      highRiskTasks,
      validationCommands
    }
  };
}

export async function inspectWavePlan(projectRoot: string, options: { branch?: string; capabilityId?: string } = {}): Promise<WavePlan> {
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const capabilityId = options.capabilityId ?? 'native-file-edit';
  const graph = await inspectTaskGraph(projectRoot, { branch });
  const taskIds = new Set(graph.nodes.map((node) => node.taskId));
  const blockingDiagnostics = graph.diagnostics.filter((diagnostic) => diagnostic.severity === 'blocking');
  const globalBlocking = blockingDiagnostics.filter((diagnostic) => diagnostic.taskId === null);
  const blockingByTask = new Map<string, string[]>();
  for (const diagnostic of blockingDiagnostics.filter((candidate) => candidate.taskId !== null)) {
    const reasons = blockingByTask.get(diagnostic.taskId ?? '') ?? [];
    reasons.push(diagnostic.message);
    blockingByTask.set(diagnostic.taskId ?? '', reasons);
  }

  const decisions = new Map<string, WorktreeIsolationDecision>();
  await Promise.all(graph.nodes.map(async (node) => {
    decisions.set(node.taskId, await inspectWorktreeIsolation(projectRoot, { branch, taskId: node.taskId, capabilityId }));
  }));

  const manualGates: WavePlanGate[] = [];
  const blockedTasks: WavePlanGate[] = [];
  const blockedTaskIds = new Set<string>();
  const manualTaskIds = new Set<string>();
  const candidates = new Map<string, TaskGraphNode>();

  for (const node of graph.nodes) {
    const decision = decisions.get(node.taskId);
    const diagnosticReasons = blockingByTask.get(node.taskId) ?? [];
    if (globalBlocking.length > 0) {
      blockedTasks.push({ taskId: node.taskId, gate: 'blocked', reasons: globalBlocking.map((diagnostic) => diagnostic.message) });
      blockedTaskIds.add(node.taskId);
    } else if (diagnosticReasons.length > 0) {
      blockedTasks.push({ taskId: node.taskId, gate: 'blocked', reasons: diagnosticReasons });
      blockedTaskIds.add(node.taskId);
    } else if (!decision || decision.mode === 'blocked') {
      blockedTasks.push({ taskId: node.taskId, gate: 'blocked', reasons: decision?.reasons ?? [`Task ${node.taskId} cannot be inspected for isolation.`] });
      blockedTaskIds.add(node.taskId);
    } else if (decision.mode === 'manual') {
      manualGates.push({ taskId: node.taskId, gate: 'manual', reasons: decision.reasons });
      manualTaskIds.add(node.taskId);
    } else {
      candidates.set(node.taskId, node);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [taskId, node] of [...candidates]) {
      const blockedDependencies = node.dependsOn.filter((dependency) => !taskIds.has(dependency) || blockedTaskIds.has(dependency) || manualTaskIds.has(dependency));
      if (blockedDependencies.length > 0) {
        blockedTasks.push({
          taskId,
          gate: 'blocked',
          reasons: [`Task ${taskId} depends on non-plannable task(s): ${blockedDependencies.join(', ')}.`]
        });
        blockedTaskIds.add(taskId);
        candidates.delete(taskId);
        changed = true;
      }
    }
  }

  const waves: WavePlanWave[] = [];
  const completed = new Set<string>();
  const remaining = new Map(candidates);
  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((node) => node.dependsOn.every((dependency) => completed.has(dependency)))
      .sort((left, right) => left.taskId.localeCompare(right.taskId));
    if (ready.length === 0) {
      for (const taskId of remaining.keys()) {
        blockedTasks.push({ taskId, gate: 'blocked', reasons: [`Task ${taskId} cannot be placed in a dependency wave.`] });
        blockedTaskIds.add(taskId);
      }
      break;
    }
    const waveNodes: TaskGraphNode[] = [];
    for (const node of ready) {
      if (!waveNodes.some((candidate) => graphTasksOverlap(graph, candidate.taskId, node.taskId))) {
        waveNodes.push(node);
      }
    }
    const tasks = waveNodes.map((node): WavePlanTask => ({
      taskId: node.taskId,
      isolationMode: decisions.get(node.taskId)?.mode ?? 'blocked',
      reasons: decisions.get(node.taskId)?.reasons ?? []
    }));
    waves.push({ index: waves.length + 1, tasks });
    for (const node of waveNodes) {
      remaining.delete(node.taskId);
      completed.add(node.taskId);
    }
  }

  const plannedTasks = waves.reduce((count, wave) => count + wave.tasks.length, 0);
  return {
    version: WAVE_PLANNER_CONTRACT_VERSION,
    branch,
    valid: graph.valid && blockedTasks.length === 0,
    waves,
    manualGates,
    blockedTasks,
    diagnostics: graph.diagnostics,
    summary: {
      tasks: graph.nodes.length,
      waves: waves.length,
      plannedTasks,
      manualTasks: manualGates.length,
      blockedTasks: blockedTasks.length
    }
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


  const route = await routeSddTask(projectRoot, { taskId: options.taskId, branch });
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
  if (decision.mode === 'blocked' || decision.mode === 'manual') {
    for (const reason of decision.reasons) {
      issues.push(contractIssue('isolation', reason, 'Resolve isolation gates or use explicit worktree/manual routing before running the background executor.'));
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
      message: 'Background executor blocked before delegation claim.'
    };
  }

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

  if (!options.artifactPath) {
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
      issues: [],
      message: `Background executor claimed ${delegationId}; provide ${expectedArtifact} and rerun with --artifact to ingest terminal evidence.`
    };
  }

  const ingestion = await ingestArtifactResult(projectRoot, runId, { delegationId, artifactPath: options.artifactPath });
  const executorStatus = ingestion.valid ? ingestion.record.delegationStatus === 'COMPLETED' ? 'completed' : 'failed' : 'blocked';
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
    issues: ingestion.record.issues,
    message: ingestion.valid ? `Background executor ingested terminal artifact for ${delegationId}.` : `Background executor artifact ingestion blocked for ${delegationId}.`
  };
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

export async function claimResidentWorkerRuntime(projectRoot: string, options: ResidentWorkerRuntimeClaimOptions): Promise<ResidentWorkerRuntimeClaimResult> {
  const agent = options.agent ?? 'implementer';
  const workerAdapterId = options.workerAdapterId ?? 'sdd-cli-task-worker';
  const leaseSeconds = normalizeResidentWorkerLeaseSeconds(options.leaseSeconds);
  const backgroundResult = await runBackgroundExecutor(projectRoot, {
    branch: options.branch,
    runId: options.runId,
    taskId: options.taskId,
    agent,
    workerAdapterId,
    delegationId: options.delegationId,
    timeoutSeconds: leaseSeconds
  });

  if (backgroundResult.status === 'blocked' || backgroundResult.status === 'failed' || !backgroundResult.delegationId || !backgroundResult.queueItemId) {
    return {
      version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
      runId: backgroundResult.runId,
      runtimeId: null,
      taskId: options.taskId,
      agent,
      workerAdapterId,
      delegationId: backgroundResult.delegationId,
      queueItemId: backgroundResult.queueItemId,
      expectedArtifact: null,
      status: 'blocked',
      leaseExpiresAt: null,
      runtime: null,
      issues: backgroundResult.issues,
      message: `Resident worker runtime blocked before claim: ${backgroundResult.message}`
    };
  }

  const runtimeId = toSafeRecordId(options.runtimeId ?? `R-${options.taskId}-${agent}-001`);
  const state = await readRunState(projectRoot, backgroundResult.runId);
  const delegation = state.delegations[backgroundResult.delegationId];
  const now = new Date().toISOString();
  const runtime: ResidentWorkerRuntimeRecord = {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runtimeId,
    runId: backgroundResult.runId,
    taskId: options.taskId,
    agent,
    workerAdapterId,
    delegationId: backgroundResult.delegationId,
    queueItemId: backgroundResult.queueItemId,
    expectedArtifact: delegation?.expectedArtifact ?? `artifacts/${agent}-${options.taskId}.md`,
    status: 'claimed',
    claimedAt: now,
    lastHeartbeatAt: null,
    leaseSeconds,
    leaseExpiresAt: residentWorkerLeaseExpiresAt(now, leaseSeconds),
    updatedAt: now,
    evidenceSummary: `Resident worker runtime ${runtimeId} claimed ${backgroundResult.delegationId}; completion still requires artifact ingestion and verify.`
  };
  await writeResidentWorkerRuntimeRecord(projectRoot, runtime);
  await appendEvent(projectRoot, runtime.runId, {
    event: 'worker_runtime_claimed',
    runId: runtime.runId,
    summary: `Resident worker runtime ${runtime.runtimeId} claimed ${runtime.delegationId}`,
    data: { runtimeId: runtime.runtimeId, taskId: runtime.taskId, agent: runtime.agent, workerAdapterId: runtime.workerAdapterId, delegationId: runtime.delegationId, queueItemId: runtime.queueItemId, leaseExpiresAt: runtime.leaseExpiresAt }
  });
  return {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runId: runtime.runId,
    runtimeId: runtime.runtimeId,
    taskId: runtime.taskId,
    agent: runtime.agent,
    workerAdapterId: runtime.workerAdapterId,
    delegationId: runtime.delegationId,
    queueItemId: runtime.queueItemId,
    expectedArtifact: runtime.expectedArtifact,
    status: runtime.status,
    leaseExpiresAt: runtime.leaseExpiresAt,
    runtime,
    issues: [],
    message: `Resident worker runtime ${runtime.runtimeId} claimed ${runtime.delegationId}; send heartbeat before ${runtime.leaseExpiresAt}.`
  };
}

export async function heartbeatResidentWorkerRuntime(projectRoot: string, options: ResidentWorkerRuntimeHeartbeatOptions): Promise<ResidentWorkerRuntimeHeartbeatResult> {
  let runtime: ResidentWorkerRuntimeRecord;
  try {
    runtime = await readResidentWorkerRuntimeRecord(projectRoot, options.runId, options.runtimeId);
  } catch (error) {
    return {
      version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
      runId: options.runId,
      runtimeId: options.runtimeId,
      status: 'blocked',
      leaseExpiresAt: null,
      runtime: null,
      issues: [contractIssue('runtimeId', `Cannot read resident worker runtime ${options.runtimeId}: ${messageFromError(error)}`, 'Run sdd worker-runtime status --run <run_id> or claim a new resident worker runtime.')],
      message: `Resident worker runtime ${options.runtimeId} is not readable.`
    };
  }

  const now = new Date().toISOString();
  const leaseSeconds = normalizeResidentWorkerLeaseSeconds(options.leaseSeconds ?? runtime.leaseSeconds);
  const queueItem = await findResidentWorkerQueueItem(projectRoot, runtime);
  if (queueItem && isDelegationTerminal(queueItem.status)) {
    const terminalRuntime = await writeResidentWorkerRuntimeRecord(projectRoot, {
      ...runtime,
      status: 'terminal',
      leaseSeconds,
      updatedAt: now,
      evidenceSummary: `Resident worker runtime ${runtime.runtimeId} is terminal because delegation ${runtime.delegationId} is ${queueItem.status}.`
    });
    await appendEvent(projectRoot, runtime.runId, { event: 'worker_runtime_terminal', runId: runtime.runId, summary: `Resident worker runtime ${runtime.runtimeId} observed terminal delegation ${runtime.delegationId}`, data: { runtimeId: runtime.runtimeId, delegationId: runtime.delegationId, status: queueItem.status } });
    return {
      version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
      runId: runtime.runId,
      runtimeId: runtime.runtimeId,
      status: 'terminal',
      leaseExpiresAt: terminalRuntime.leaseExpiresAt,
      runtime: terminalRuntime,
      issues: [],
      message: `Resident worker runtime ${runtime.runtimeId} is terminal; create a new delegation id for retry instead of reactivating it.`
    };
  }

  await heartbeatDelegationForRuntime(projectRoot, runtime, now, leaseSeconds);
  const activeRuntime = await writeResidentWorkerRuntimeRecord(projectRoot, {
    ...runtime,
    status: 'active',
    lastHeartbeatAt: now,
    leaseSeconds,
    leaseExpiresAt: residentWorkerLeaseExpiresAt(now, leaseSeconds),
    updatedAt: now,
    evidenceSummary: `Resident worker runtime ${runtime.runtimeId} heartbeat renewed until ${residentWorkerLeaseExpiresAt(now, leaseSeconds)}.`
  });
  await appendEvent(projectRoot, runtime.runId, { event: 'worker_runtime_heartbeat', runId: runtime.runId, summary: `Resident worker runtime ${runtime.runtimeId} heartbeat renewed`, data: { runtimeId: runtime.runtimeId, delegationId: runtime.delegationId, leaseExpiresAt: activeRuntime.leaseExpiresAt } });
  return {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runId: activeRuntime.runId,
    runtimeId: activeRuntime.runtimeId,
    status: activeRuntime.status,
    leaseExpiresAt: activeRuntime.leaseExpiresAt,
    runtime: activeRuntime,
    issues: [],
    message: `Resident worker runtime ${activeRuntime.runtimeId} active until ${activeRuntime.leaseExpiresAt}.`
  };
}

export async function listResidentWorkerRuntimes(projectRoot: string, options: { runId: string }): Promise<ResidentWorkerRuntimeList> {
  const records = await listResidentWorkerRuntimeRecords(projectRoot, options.runId);
  const queueSnapshot = await listDelegationQueueItems(projectRoot, { runId: options.runId });
  const queueItems = new Map(queueSnapshot.items.map((item) => [item.id, item]));
  const runtimes = records.map((record) => withDerivedResidentWorkerStatus(record, queueItems.get(record.queueItemId) ?? null));
  const issues: ContractValidationIssue[] = [];
  for (const runtime of runtimes) {
    issues.push(...await validateResidentWorkerRuntime(projectRoot, runtime, queueItems.get(runtime.queueItemId) ?? null));
  }
  return {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runId: options.runId,
    runtimes,
    activeRuntimes: runtimes.filter((runtime) => runtime.status === 'active' || runtime.status === 'claimed').length,
    staleRuntimes: runtimes.filter((runtime) => runtime.status === 'stale').length,
    terminalRuntimes: runtimes.filter((runtime) => runtime.status === 'terminal').length,
    blockedRuntimes: runtimes.filter((runtime) => runtime.status === 'blocked').length,
    valid: issues.length === 0,
    issues
  };
}

export async function inspectResidentWorkerRuntime(projectRoot: string, options: { runId: string; runtimeId: string }): Promise<ResidentWorkerRuntimeInspection> {
  let record: ResidentWorkerRuntimeRecord;
  try {
    record = await readResidentWorkerRuntimeRecord(projectRoot, options.runId, options.runtimeId);
  } catch (error) {
    const issues = [contractIssue('runtimeId', `Cannot read resident worker runtime ${options.runtimeId}: ${messageFromError(error)}`, 'Run sdd worker-runtime status --run <run_id> or claim a new resident worker runtime.')];
    return {
      version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
      runId: options.runId,
      runtimeId: options.runtimeId,
      runtime: null,
      queueItem: null,
      workerAdapter: null,
      status: 'blocked',
      leaseExpired: false,
      valid: false,
      issues,
      recommendedNextCommand: `sdd worker-runtime status --run ${options.runId}`
    };
  }
  const queueItem = await findResidentWorkerQueueItem(projectRoot, record);
  const workerAdapter = await inspectWorkerAdapterContract(projectRoot, record.workerAdapterId);
  const runtime = withDerivedResidentWorkerStatus(record, queueItem);
  const issues = await validateResidentWorkerRuntime(projectRoot, runtime, queueItem, workerAdapter);
  return {
    version: RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION,
    runId: options.runId,
    runtimeId: options.runtimeId,
    runtime,
    queueItem,
    workerAdapter,
    status: runtime.status,
    leaseExpired: isResidentWorkerLeaseExpired(runtime),
    valid: issues.length === 0,
    issues,
    recommendedNextCommand: residentWorkerRecommendedNextCommand(runtime)
  };
}

function normalizeResidentWorkerLeaseSeconds(value: number | undefined): number {
  if (value && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return DEFAULT_RESIDENT_WORKER_LEASE_SECONDS;
}

function residentWorkerLeaseExpiresAt(fromIso: string, leaseSeconds: number): string {
  const timestamp = Date.parse(fromIso);
  const start = Number.isNaN(timestamp) ? Date.now() : timestamp;
  return new Date(start + leaseSeconds * 1000).toISOString();
}

function isResidentWorkerLeaseExpired(runtime: ResidentWorkerRuntimeRecord, now = new Date()): boolean {
  const timestamp = Date.parse(runtime.leaseExpiresAt);
  return Number.isNaN(timestamp) || timestamp < now.getTime();
}

function withDerivedResidentWorkerStatus(runtime: ResidentWorkerRuntimeRecord, queueItem: DelegationQueueItem | null, now = new Date()): ResidentWorkerRuntimeRecord {
  if (runtime.status === 'blocked') {
    return runtime;
  }
  if (runtime.status === 'terminal' || (queueItem && isDelegationTerminal(queueItem.status))) {
    return { ...runtime, status: 'terminal' };
  }
  if (isResidentWorkerLeaseExpired(runtime, now)) {
    return { ...runtime, status: 'stale' };
  }
  if (runtime.lastHeartbeatAt) {
    return { ...runtime, status: 'active' };
  }
  return { ...runtime, status: 'claimed' };
}

async function findResidentWorkerQueueItem(projectRoot: string, runtime: ResidentWorkerRuntimeRecord): Promise<DelegationQueueItem | null> {
  const snapshot = await listDelegationQueueItems(projectRoot, { runId: runtime.runId });
  return snapshot.items.find((item) => item.id === runtime.queueItemId) ?? snapshot.items.find((item) => item.delegationId === runtime.delegationId) ?? null;
}

async function heartbeatDelegationForRuntime(projectRoot: string, runtime: ResidentWorkerRuntimeRecord, heartbeatAt: string, leaseSeconds: number): Promise<void> {
  const state = await readRunState(projectRoot, runtime.runId);
  const delegation = state.delegations[runtime.delegationId];
  if (!delegation || isDelegationTerminal(delegation.status)) {
    return;
  }
  await writeRunState(projectRoot, {
    ...state,
    delegations: {
      ...state.delegations,
      [runtime.delegationId]: {
        ...delegation,
        lastHeartbeatAt: heartbeatAt,
        timeoutSeconds: leaseSeconds
      }
    }
  });
}

async function validateResidentWorkerRuntime(projectRoot: string, runtime: ResidentWorkerRuntimeRecord, queueItem: DelegationQueueItem | null, workerAdapter?: WorkerAdapterContract | null): Promise<ContractValidationIssue[]> {
  const issues: ContractValidationIssue[] = [];
  if (runtime.version !== RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION) {
    issues.push(contractIssue('version', `Expected ${RESIDENT_WORKER_RUNTIME_CONTRACT_VERSION}.`, 'Rewrite the resident worker runtime record through sdd worker-runtime claim.'));
  }
  const adapter = workerAdapter === undefined ? await inspectWorkerAdapterContract(projectRoot, runtime.workerAdapterId) : workerAdapter;
  if (!adapter) {
    issues.push(contractIssue('workerAdapterId', `Resident worker runtime ${runtime.runtimeId} references unknown worker adapter ${runtime.workerAdapterId}.`, 'Claim the runtime with a declared worker adapter.'));
  }
  if (!queueItem) {
    issues.push(contractIssue('queueItemId', `Resident worker runtime ${runtime.runtimeId} references missing queue item ${runtime.queueItemId}.`, 'Inspect the run or claim a new resident worker runtime with a valid delegation.'));
  }
  if (runtime.status === 'stale' && queueItem?.status === 'RUNNING') {
    issues.push(contractIssue('lease', `Resident worker runtime ${runtime.runtimeId} is stale while delegation ${runtime.delegationId} is still RUNNING.`, `Run sdd worker-runtime heartbeat ${runtime.runtimeId} --run ${runtime.runId}, or inspect/reclaim with a new delegation id if the worker stopped.`));
  }
  return issues;
}

function residentWorkerRecommendedNextCommand(runtime: ResidentWorkerRuntimeRecord): string {
  if (runtime.status === 'stale') {
    return `sdd worker-runtime heartbeat ${runtime.runtimeId} --run ${runtime.runId}`;
  }
  if (runtime.status === 'terminal') {
    return `sdd background inspect ${runtime.runId}`;
  }
  return `sdd worker-runtime heartbeat ${runtime.runtimeId} --run ${runtime.runId}`;
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

function graphTasksOverlap(graph: TaskGraphPlan, leftTaskId: string, rightTaskId: string): boolean {
  return graph.fileOverlapEdges.some((edge) =>
    (edge.from === leftTaskId && edge.to === rightTaskId) || (edge.from === rightTaskId && edge.to === leftTaskId)
  );
}

export function renderDoctorReport(report: DoctorReport): string {
  const failures = report.checks.filter((check) => check.level === 'FAIL');
  const warnings = report.checks.filter((check) => check.level === 'WARN');
  const passes = report.checks.filter((check) => check.level === 'PASS');
  const lines = ['SDD doctor', 'decision'];
  lines.push(`- status=${report.status}`);
  lines.push(`- checks pass=${passes.length} warn=${warnings.length} fail=${failures.length}`);
  lines.push('evidence');
  const visibleChecks = [...failures, ...warnings, ...passes.slice(0, failures.length === 0 && warnings.length === 0 ? 5 : 2)];
  if (visibleChecks.length === 0) {
    lines.push('- no checks reported');
  } else {
    for (const check of visibleChecks) {
      const action = check.action ? ` action=${check.action}` : '';
      lines.push(`- [${check.level}] ${check.check}: ${check.message}${action}`);
    }
  }
  const hiddenPasses = passes.length - visibleChecks.filter((check) => check.level === 'PASS').length;
  if (hiddenPasses > 0) {
    lines.push(`- ${hiddenPasses} passing check(s) hidden; use --json for full details`);
  }
  lines.push('gaps');
  if (failures.length === 0 && warnings.length === 0) {
    lines.push('- none');
  } else {
    for (const check of [...failures, ...warnings]) {
      lines.push(`- [${check.level}] ${check.check}: ${check.action ?? check.message}`);
    }
  }
  lines.push('next');
  if (failures[0]?.action) {
    lines.push(`- ${failures[0].action}`);
  } else if (warnings[0]?.action) {
    lines.push(`- ${warnings[0].action}`);
  } else {
    lines.push('- sdd status');
  }
  return lines.join('\n');
}

function buildLoopSteps(taskId: string, options: SingleTaskLoopOptions): LoopAgentStep[] {
  const steps: LoopAgentStep[] = [
    { agent: 'implementer', suppliedArtifact: options.implementArtifact, expectedArtifact: `artifacts/implement-${taskId}.md`, required: false },
    { agent: 'reviewer', suppliedArtifact: options.reviewArtifact, expectedArtifact: `artifacts/review-${taskId}.md`, required: true }
  ];
  if (options.debugArtifact) {
    steps.push({ agent: 'debugger', suppliedArtifact: options.debugArtifact, expectedArtifact: `artifacts/debug-${taskId}.md`, required: false });
  }
  steps.push({ agent: 'validator', suppliedArtifact: options.validationArtifact, expectedArtifact: `artifacts/validation-${taskId}.md`, required: true });
  return steps;
}

async function persistDelegation(projectRoot: string, runId: string, delegation: DelegationRecord): Promise<void> {
  const state = await readRunState(projectRoot, runId);
  await writeRunState(projectRoot, {
    ...state,
    status: delegation.status === 'RUNNING' ? 'running' : state.status,
    delegations: {
      ...state.delegations,
      [delegation.delegationId]: delegation
    }
  });
}

async function persistLoopState(projectRoot: string, runId: string, input: { status: SingleTaskLoopStatus; phase: string; taskId: string; taskState: unknown; validationStatus: RunState['validation']['status']; syncBackProposalPath: string; artifacts: Array<{ path: string; kind: string; task: string; agent: string }> }): Promise<void> {
  const state = await readRunState(projectRoot, runId);
  const now = new Date().toISOString();
  const knownArtifactPaths = new Set(state.artifacts.map((artifact) => artifact.path));
  const newArtifacts = input.artifacts
    .filter((artifact) => !knownArtifactPaths.has(artifact.path))
    .map((artifact) => ({ ...artifact, createdAt: now }));
  await writeRunState(projectRoot, {
    ...state,
    status: input.status,
    phase: input.phase,
    currentTask: input.taskId,
    tasks: {
      ...state.tasks,
      [input.taskId]: input.taskState
    },
    artifacts: [...state.artifacts, ...newArtifacts],
    validation: {
      ...state.validation,
      status: input.validationStatus,
      evidence: input.artifacts.filter((artifact) => artifact.kind === 'validation').map((artifact) => artifact.path)
    },
    syncBack: {
      mode: 'proposal',
      proposalPath: input.syncBackProposalPath,
      status: 'proposed'
    }
  });
}

async function persistVerifyState(projectRoot: string, runId: string, input: { status: GoalVerifyStatus; taskId: string; taskState: unknown; commands: string[]; evidence: string[]; syncBackProposalPath: string; artifacts: Array<{ path: string; kind: string; task: string; agent: string }> }): Promise<void> {
  const state = await readRunState(projectRoot, runId);
  const now = new Date().toISOString();
  const knownArtifactPaths = new Set(state.artifacts.map((artifact) => artifact.path));
  const newArtifacts = input.artifacts
    .filter((artifact) => !knownArtifactPaths.has(artifact.path))
    .map((artifact) => ({ ...artifact, createdAt: now }));
  await writeRunState(projectRoot, {
    ...state,
    status: input.status === 'PASS' ? 'completed' : 'blocked',
    phase: 'verify',
    currentTask: input.taskId,
    tasks: {
      ...state.tasks,
      [input.taskId]: input.taskState
    },
    artifacts: [...state.artifacts, ...newArtifacts],
    validation: {
      status: input.status === 'PASS' ? 'pass' : input.status === 'PASS_WITH_GAPS' ? 'pass_with_gaps' : input.status === 'BLOCKED' ? 'blocked' : 'fail',
      commands: input.commands,
      evidence: input.evidence
    },
    syncBack: {
      mode: 'proposal',
      proposalPath: input.syncBackProposalPath,
      status: 'proposed'
    }
  });
}

async function writeSyncBackProposal(projectRoot: string, runId: string, taskId: string, status: string, artifacts: string[], gaps: SddTaskGap[], summary: string): Promise<{ absolutePath: string; runRelativePath: string }> {
  const content = `# Sync-back Proposal\n\n## ${taskId}\n\n- status: ${status}\n- summary: ${summary}\n- artifacts:\n${artifacts.length > 0 ? artifacts.map((artifact) => `  - ${artifact}`).join('\n') : '  - none'}\n- gaps:\n${gaps.length > 0 ? gaps.map((gap) => `  - [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message}`).join('\n') : '  - none'}\n\n## Boundaries\n\n- Proposal only; tasks.md/spec.md/plan.md were not modified by runtime.\n- Runtime modeled agent/verify steps through supplied artifacts and contract validation; no external agent API was invoked.\n`;
  return writeArtifact(projectRoot, runId, 'sync-back-proposal.md', content);
}

function toSafeRecordId(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized || 'record';
}

function routeRecordSnapshot(route: AgentRouterDecision): AgentExecutionRecord['routeDecision'] {
  return {
    version: route.version,
    category: route.category,
    recommendedProfile: route.recommendedProfile,
    autonomyCeiling: route.autonomyCeiling,
    requiredCapabilities: route.requiredCapabilities,
    blockedReason: route.blockedReason
  };
}

function sourceAttributionForCapabilities(capabilityIds: string[], route?: AgentRouterDecision): string[] {
  return capabilityIds.map((capabilityId) => {
    const routeSource = route?.registrySources?.find((source) => source.kind === 'skill_capability' && source.id === capabilityId);
    if (routeSource) {
      return `${capabilityId}:${routeSource.sourceId ?? routeSource.origin}`;
    }
    const capability = BUILT_IN_SKILL_CAPABILITIES.find((candidate) => candidate.id === capabilityId);
    return capability ? `${capability.id}:${capability.sourceRef}` : capabilityId;
  });
}

function executionProfile(agent: string, route: AgentRouterDecision): AgentProfileId {
  const normalized = normalizeAgentToken(agent);
  return route.allowedProfiles.find((profile) => normalizeAgentToken(profile) === normalized) ?? toAgentProfileId(agent) ?? route.recommendedProfile ?? 'implementer';
}

function buildAgentExecutionRecord(input: { runId: string; taskId: string; agent: string; route: AgentRouterDecision; status: AgentExecutionRecordStatus; delegationId?: string | null; queueItemId?: string | null; artifactPath?: string | null; ingestion?: ArtifactResultIngestionRecord | null; evidenceSummary: string }): AgentExecutionRecord {
  const now = new Date().toISOString();
  const profile = executionProfile(input.agent, input.route);
  return {
    version: AGENT_EXECUTION_RECORD_CONTRACT_VERSION,
    executionId: toSafeRecordId(input.delegationId ?? `${input.taskId}-${input.agent}`),
    runId: input.runId,
    taskId: input.taskId,
    profile,
    category: input.route.category,
    host: 'sdd-cli',
    hostSessionId: input.runId,
    hostTaskId: input.delegationId ?? null,
    modelPolicy: input.route.modelPolicy,
    toolPermission: input.route.toolPermission,
    capabilitiesUsed: input.route.requiredCapabilities,
    sourceAttribution: sourceAttributionForCapabilities(input.route.requiredCapabilities, input.route),
    artifacts: input.artifactPath ? [input.artifactPath] : input.ingestion?.artifactPath ? [input.ingestion.artifactPath] : [],
    status: input.status,
    delegationId: input.delegationId ?? null,
    queueItemId: input.queueItemId ?? null,
    ingestionStatus: input.ingestion?.status ?? null,
    resultStatus: input.ingestion?.resultStatus ?? null,
    routeDecision: routeRecordSnapshot(input.route),
    evidenceSummary: input.evidenceSummary,
    createdAt: now,
    updatedAt: now
  };
}

function buildTeamSessionRecord(input: { runId: string; taskId: string | null; route: AgentRouterDecision; status: TeamSessionRecordStatus; artifacts: string[]; evidenceSummary: string }): TeamSessionRecord {
  const now = new Date().toISOString();
  return {
    version: TEAM_SESSION_RECORD_CONTRACT_VERSION,
    teamId: toSafeRecordId(`team-${input.runId}-${input.taskId ?? 'branch'}`),
    runId: input.runId,
    taskId: input.taskId,
    status: input.status,
    chiefProfile: input.route.teamMode.chiefProfile,
    memberProfiles: input.route.teamMode.memberProfiles,
    hostLayout: null,
    teamMode: input.route.teamMode,
    waves: input.route.teamMode.allowedWaves,
    messages: [{
      sender: 'runtime',
      receiver: 'team',
      taskRef: input.taskId,
      artifactRefs: input.artifacts,
      blocker: input.route.teamMode.blockedReason,
      evidenceSummary: input.evidenceSummary,
      createdAt: now
    }],
    artifacts: input.artifacts,
    evidenceSummary: input.evidenceSummary,
    createdAt: now,
    updatedAt: now
  };
}


function renderLoopGapReport(taskId: string, gaps: SddTaskGap[]): string {
  return `# Gap Report ${taskId}\n\n\`\`\`sdd-result\ncontract: ${SDD_RESULT_CONTRACT}\nversion: ${SDD_RESULT_VERSION}\nagent: runtime\ntask: ${taskId}\nstatus: BLOCKED\nartifacts:\n  - artifacts/gap-report-${taskId}.md\n\`\`\`\n\n## Gaps\n\n${gaps.length > 0 ? gaps.map((gap) => `- [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message} Recommendation: ${gap.recommendation}`).join('\n') : '- No structured gaps were provided; inspect task selection and supplied artifacts.'}\n`;
}

function renderAcceptanceCoverageArtifact(taskId: string, status: GoalVerifyStatus, task: SddTask | null, reviewArtifact: string | null, validationArtifact: string | null, coverage: AcceptanceCoverageItem[], gaps: SddTaskGap[]): string {
  return `# Acceptance Coverage ${taskId}\n\n\`\`\`sdd-result\ncontract: ${SDD_RESULT_CONTRACT}\nversion: ${SDD_RESULT_VERSION}\nagent: validator\ntask: ${taskId}\nstatus: ${status}\nartifacts:\n  - artifacts/acceptance-coverage-${taskId}.md\n\`\`\`\n\n## Source Evidence\n\n- review_artifact: ${reviewArtifact ?? 'missing'}\n- validation_artifact: ${validationArtifact ?? 'missing'}\n- task_source: ${task ? sourceLocationEvidence(task.source) : 'missing'}\n\n## Commands Declared\n\n${task && task.validation.length > 0 ? task.validation.map((command) => `- ${command}`).join('\n') : '- none'}\n\n## Acceptance Mapping\n\n${coverage.length > 0 ? coverage.map((item) => `- [${item.status}] ${item.acceptance} Evidence: ${item.evidence}`).join('\n') : '- No acceptance items available.'}\n\n## Gaps\n\n${gaps.length > 0 ? gaps.map((gap) => `- [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message} Recommendation: ${gap.recommendation}`).join('\n') : '- none'}\n`;
}

interface AcceptanceCoverageTarget {
  label: string;
  description: string | null;
  matchTexts: string[];
}

function taskAcceptanceCoverageTargets(task: SddTask): AcceptanceCoverageTarget[] {
  if (task.acceptanceRefs.length > 0) {
    return task.acceptanceRefs.map((ref, index) => {
      const description = task.acceptance[index] ?? null;
      return {
        label: ref,
        description,
        matchTexts: description ? [ref, description] : [ref]
      };
    });
  }
  return task.acceptance.map((acceptance) => ({
    label: acceptance,
    description: null,
    matchTexts: [acceptance]
  }));
}

function statusFromValidation(status: SddResultStatus | null): GoalVerifyStatus | 'GAP' {
  if (status === 'PASS') {
    return 'PASS';
  }
  if (status === 'PASS_WITH_GAPS') {
    return 'PASS_WITH_GAPS';
  }
  if (status === 'FAIL') {
    return 'FAIL';
  }
  if (status === 'BLOCKED' || status === 'TIMED_OUT' || status === 'CANCELLED') {
    return 'BLOCKED';
  }
  return 'GAP';
}

function deriveGoalVerifyStatus(reviewStatus: SddResultStatus | null, validationStatus: SddResultStatus | null, gaps: SddTaskGap[]): GoalVerifyStatus {
  if (gaps.length > 0) {
    return validationStatus === 'PASS_WITH_GAPS' ? 'PASS_WITH_GAPS' : 'BLOCKED';
  }
  if (reviewStatus !== 'PASS' || !validationStatus) {
    return 'BLOCKED';
  }
  if (validationStatus === 'PASS') {
    return 'PASS';
  }
  if (validationStatus === 'PASS_WITH_GAPS') {
    return 'PASS_WITH_GAPS';
  }
  return validationStatus === 'FAIL' ? 'FAIL' : 'BLOCKED';
}

function toHarnessVerifyStatus(status: GoalVerifyStatus, reviewStatus: SddResultStatus | null, validationStatus: SddResultStatus | null, gaps: SddTaskGap[]): HarnessVerifyStatus {
  if (status === 'PASS') {
    return 'PASS';
  }
  if (status === 'PASS_WITH_GAPS') {
    return 'GAPS';
  }
  if (!reviewStatus || !validationStatus || gaps.some((gap) => gap.field === 'review_artifact' || gap.field === 'validation_artifact')) {
    return 'HUMAN_NEEDED';
  }
  return 'BLOCKED';
}

async function readArtifactIfExists(projectRoot: string, runId: string, runRelativeArtifactPath: string): Promise<string> {
  try {
    return await readArtifact(projectRoot, runId, toArtifactRootRelativePath(runRelativeArtifactPath));
  } catch {
    return '';
  }
}

function artifactPathForAgent(state: RunState, taskId: string, agent: string): string | null {
  const delegation = Object.values(state.delegations).find((candidate) => candidate.task === taskId && candidate.agent === agent && candidate.status === 'COMPLETED');
  if (delegation) {
    return delegation.expectedArtifact;
  }
  const artifact = state.artifacts.find((candidate) => candidate.task === taskId && candidate.agent === agent);
  return artifact?.path ?? null;
}

function agentForLoopArtifact(artifactPath: string): LoopAgentStep['agent'] | null {
  const filename = artifactPath.replace(/\\/g, '/').split('/').pop() ?? '';
  if (filename.startsWith('implement-')) {
    return 'implementer';
  }
  if (filename.startsWith('review-')) {
    return 'reviewer';
  }
  if (filename.startsWith('debug-')) {
    return 'debugger';
  }
  if (filename.startsWith('validation-')) {
    return 'validator';
  }
  return null;
}

function artifactOptionName(agent: string): string {
  if (agent === 'implementer') {
    return '--implement-artifact';
  }
  if (agent === 'reviewer') {
    return '--review-artifact';
  }
  if (agent === 'debugger') {
    return '--debug-artifact';
  }
  if (agent === 'validator') {
    return '--validation-artifact';
  }
  return '--artifact';
}

function artifactIngestionKey(delegationId: string, artifactPath: string): string {
  return `${delegationId}:${artifactPath}`;
}

function delegationStatusFromResultStatus(status: SddResultStatus): DelegationStatus {
  if (status === 'PASS' || status === 'PASS_WITH_GAPS') {
    return 'COMPLETED';
  }
  if (status === 'TIMED_OUT') {
    return 'TIMED_OUT';
  }
  if (status === 'CANCELLED') {
    return 'CANCELLED';
  }
  return 'FAILED';
}

function terminalEventForDelegationStatus(status: DelegationStatus): string {
  if (status === 'COMPLETED') {
    return 'delegation_completed';
  }
  if (status === 'TIMED_OUT') {
    return 'delegation_timeout';
  }
  if (status === 'CANCELLED') {
    return 'delegation_cancelled';
  }
  return 'delegation_failed';
}

function artifactIngestionGaps(delegation: DelegationRecord, status: SddResultStatus): SddTaskGap[] {
  if (status === 'PASS') {
    return [];
  }
  return [taskGap(delegation.task, delegation.agent, `Artifact ingestion returned ${status} for ${delegation.delegationId}.`, 'Inspect the ingested artifact evidence before verify or sync-back apply.')];
}

function overlappingFiles(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map(normalizeComparablePath));
  return left.filter((file) => rightSet.has(normalizeComparablePath(file)));
}

function normalizeComparablePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}
function artifactKind(artifactPath: string): string {
  const fileName = path.posix.basename(artifactPath.replace(/\\/g, '/'));
  if (fileName.startsWith('implement-')) {
    return 'implement';
  }
  if (fileName.startsWith('review-')) {
    return 'review';
  }
  if (fileName.startsWith('debug-')) {
    return 'debug';
  }
  if (fileName.startsWith('validation-')) {
    return 'validation';
  }
  if (fileName.startsWith('gap-report-')) {
    return 'gap-report';
  }
  if (fileName === 'sync-back-proposal.md') {
    return 'sync-back-proposal';
  }
  return 'artifact';
}

function agentFromArtifactPath(artifactPath: string): string {
  const kind = artifactKind(artifactPath);
  if (kind === 'implement') {
    return 'implementer';
  }
  if (kind === 'review' || kind === 'validation' || kind === 'debug') {
    return kind === 'debug' ? 'debugger' : kind === 'review' ? 'reviewer' : 'validator';
  }
  if (kind === 'gap-report' || kind === 'sync-back-proposal') {
    return 'runtime';
  }
  return 'unknown';
}

async function detectProjectConfig(projectRoot: string, projectName: string): Promise<ProjectConfig> {
  const config = defaultProjectConfig(projectName);
  const detection = await detectProject(projectRoot);
  config.project.language = detection.primary.language;
  config.project.framework = detection.primary.framework;
  config.validation.default = detection.primary.validationDefault;
  config.detection = {
    confidence: detection.primary.confidence,
    mixed_stack: detection.mixed_stack,
    primary: detection.primary.id,
    candidates: detection.candidates.map((candidate) => ({
      id: candidate.id,
      confidence: candidate.confidence,
      score: candidate.score
    }))
  };
  return config;
}

interface ProjectDetector {
  id: string;
  detect(projectRoot: string, rootEntries: string[]): Promise<ProjectDetectionCandidate>;
}

const PROJECT_DETECTORS: ProjectDetector[] = [
  {
    id: 'java-ssm-maven-multimodule',
    async detect(projectRoot, rootEntries) {
      const hasPom = rootEntries.includes('pom.xml');
      const pom = hasPom ? await readFile(path.join(projectRoot, 'pom.xml'), 'utf8') : '';
      const javaFiles = await countFiles(projectRoot, (filePath) => filePath.endsWith('.java'), 100);
      const springXmlFiles = await countFiles(projectRoot, (filePath) => filePath.endsWith('.xml') && filePath.includes('/src/main/') && /applicationContext|spring|dubbo|mybatis/i.test(path.basename(filePath)), 50);
      const mybatisMapperFiles = await countFiles(projectRoot, (filePath) => filePath.endsWith('Mapper.xml'), 50);
      const mavenMultimodule = /<packaging>\s*pom\s*<\/packaging>/i.test(pom) || /<modules>\s*<module>/is.test(pom);
      const ssmScore = springXmlFiles + mybatisMapperFiles + (/spring|mybatis|dubbo/i.test(pom) ? 3 : 0);
      const evidence = detectionEvidence([
        { kind: 'pom.xml', detail: hasPom ? 'root pom.xml present' : '', weight: hasPom ? 6 : 0 },
        { kind: 'maven_multimodule', detail: mavenMultimodule ? 'packaging pom or modules detected' : '', weight: mavenMultimodule ? 3 : 0 },
        { kind: 'java_sources', detail: `${javaFiles} Java source file(s)`, weight: Math.min(javaFiles, 10) },
        { kind: 'ssm_evidence', detail: `${ssmScore} Spring/MyBatis evidence point(s)`, weight: Math.min(ssmScore, 10) }
      ]);
      return detectionCandidate('java-ssm-maven-multimodule', 'java', mavenMultimodule || ssmScore > 0 ? 'ssm-maven-multimodule' : 'maven', evidence, ['mvn compile']);
    }
  },
  {
    id: 'typescript-node',
    async detect(projectRoot, rootEntries) {
      const hasPackageJson = rootEntries.includes('package.json');
      const packageJson = hasPackageJson ? await readFile(path.join(projectRoot, 'package.json'), 'utf8') : '';
      const tsFiles = await countFiles(projectRoot, (filePath) => filePath.endsWith('.ts') || filePath.endsWith('.tsx'), 100);
      const nodeSourceDirs = rootEntries.filter((entry) => ['src', 'app', 'pages'].includes(entry)).length;
      const typescriptEvidence = /typescript|tsx|ts-node|vite|next|nuxt/i.test(packageJson);
      const evidence = detectionEvidence([
        { kind: 'package.json', detail: hasPackageJson ? 'root package.json present' : '', weight: hasPackageJson ? 4 : 0 },
        { kind: 'typescript_sources', detail: `${tsFiles} TypeScript source file(s)`, weight: Math.min(tsFiles, 10) },
        { kind: 'typescript_package', detail: typescriptEvidence ? 'TypeScript-related package metadata detected' : '', weight: typescriptEvidence ? 3 : 0 },
        { kind: 'node_source_dirs', detail: `${nodeSourceDirs} common Node source dir(s)`, weight: nodeSourceDirs }
      ]);
      return detectionCandidate('typescript-node', 'typescript', typescriptEvidence || tsFiles > 0 ? 'typescript-node' : 'node', evidence, ['npm run typecheck']);
    }
  }
];

async function detectProject(projectRoot: string): Promise<ProjectDetection> {
  const rootEntries = await safeReadDir(projectRoot);
  const detected = await Promise.all(PROJECT_DETECTORS.map((detector) => detector.detect(projectRoot, rootEntries)));
  const candidates = detected.filter((candidate) => candidate.score > 0).sort((left, right) => right.score - left.score);
  const primary = candidates[0] ?? detectionCandidate('typescript-node', 'typescript', 'node', [], ['npm run typecheck']);
  return {
    primary,
    candidates: candidates.length > 0 ? candidates : [primary],
    mixed_stack: candidates.length > 1
  };
}

function detectionEvidence(items: DetectionEvidence[]): DetectionEvidence[] {
  return items.filter((item) => item.weight > 0);
}

function detectionCandidate(id: string, language: string, framework: string, evidence: DetectionEvidence[], validationDefault: string[]): ProjectDetectionCandidate {
  const score = evidence.reduce((total, item) => total + item.weight, 0);
  return {
    id,
    language,
    framework,
    score,
    confidence: detectionConfidence(score),
    evidence,
    validationDefault
  };
}

function detectionConfidence(score: number): DetectionConfidence {
  if (score >= 10) {
    return 'high';
  }
  if (score >= 5) {
    return 'medium';
  }
  return 'low';
}

async function safeReadDir(directory: string): Promise<string[]> {
  try {
    return await readdir(directory);
  } catch {
    return [];
  }
}

async function countFiles(root: string, predicate: (filePath: string) => boolean, limit: number): Promise<number> {
  let count = 0;
  const pending = [root];

  while (pending.length > 0 && count < limit) {
    const current = pending.pop() as string;
    for (const entry of await safeReadDir(current)) {
      if (['.git', 'node_modules', 'target', 'dist', '.sdd'].includes(entry)) {
        continue;
      }

      const fullPath = path.join(current, entry);
      const entryStat = await stat(fullPath).catch(() => null);
      if (!entryStat) {
        continue;
      }
      if (entryStat.isDirectory()) {
        pending.push(fullPath);
      } else if (predicate(fullPath.replace(/\\/g, '/'))) {
        count += 1;
        if (count >= limit) {
          return count;
        }
      }
    }
  }

  return count;
}

export function defaultProjectConfig(projectName: string): ProjectConfig {
  return {
    contract: PROJECT_CONFIG_CONTRACT,
    project: {
      name: projectName,
      language: 'typescript',
      framework: 'node'
    },
    sdd: {
      spec_dir: 'specs/<branch>',
      default_branch: 'master',
      docs_language: 'zh-CN',
      compatible_with: 'spec-kit'
    },
    validation: {
      default: ['npm run typecheck']
    },
    editing: {
      prefer_hashline: true,
      native_edit_fallback: true
    },
    runtime: {
      background_write: false,
      worktree_isolation: false,
      sync_back_mode: 'proposal'
    },
    lifecycle: {
      decision_required: true,
      profiles: ['direct', 'compact', 'full', 'research']
    }
  };
}

export const TOOL_CAPABILITY_REGISTRY_VERSION = 'phase-3.1-tool-capability-registry-v1';
export const TOOL_PLUGIN_CONTRACT_REGISTRY_VERSION = 'phase-3.2-tool-plugin-loading-contract-v1';
export const DELEGATION_QUEUE_CONTRACT_VERSION = 'phase-3.3-delegation-queue-contract-v1';
export const DELEGATION_STATE_MACHINE_VERSION = 'phase-3.4-delegation-state-machine-v1';
export const WORKER_ADAPTER_CONTRACT_REGISTRY_VERSION = 'phase-3.5-worker-adapter-contract-v1';
export const ARTIFACT_RESULT_INGESTION_REGISTRY_VERSION = ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION;
export const WORKTREE_ISOLATION_CONTRACT_VERSION = 'phase-3.7-worktree-isolation-contract-v1';
export const WORKTREE_LIFECYCLE_CONTRACT_VERSION = 'phase-3.8-worktree-lifecycle-v1';

const DELEGATION_STATUSES: DelegationStatus[] = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED', 'RECOVERABLE', 'STALE'];
const TERMINAL_DELEGATION_STATUSES: DelegationStatus[] = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'];
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

const BASELINE_WORKER_ADAPTER_IDS = [
  'claude-code-subagent-worker',
  'sdd-cli-task-worker',
  'manual-handoff-worker'
] as const;

const BASELINE_GOVERNANCE_POLICY_OPERATIONS: GovernancePolicyOperation[] = [
  'background_executor',
  'wave_executor',
  'sync_back_apply',
  'destructive_git',
  'external_interaction',
  'cleanup'
];

const BASELINE_TOOL_CAPABILITY_IDS = [
  'sdd-cli',
  'hashline-edit',
  'native-file-edit',
  'git-local',
  'validation-command',
  'artifact-run-hygiene',
  'browser-ui-check',
  'governance-policy'
] as const;

const BASELINE_TOOL_PLUGIN_CONTRACT_IDS = [
  'sdd-cli-runtime',
  'hashline-edit-adapter',
  'native-file-edit-adapter',
  'git-local-inspection',
  'validation-command-runner',
  'artifact-run-hygiene-tools',
  'browser-ui-check-adapter'
 ] as const;

const BUILT_IN_TOOL_CAPABILITIES: ToolCapability[] = [
  {
    id: 'artifact-run-hygiene',
    title: 'Artifact and run hygiene',
    category: 'artifact',
    summary: 'Generate and validate sdd-result artifacts, archive exploratory runs, and scope doctor run evidence checks.',
    sideEffect: 'local_write',
    defaultAvailable: true,
    allowedStages: ['do', 'verify', 'doctor'],
    requiredEvidence: ['sdd-result artifact', 'run event log', 'doctor report'],
    forbiddenUses: ['delete run evidence', 'auto apply sync-back', 'mark acceptance without validator evidence']
  },
  {
    id: 'browser-ui-check',
    title: 'Browser UI check',
    category: 'browser',
    summary: 'Use a browser to inspect frontend behavior when UI changes need manual verification.',
    sideEffect: 'external_interaction',
    defaultAvailable: true,
    allowedStages: ['validation', 'review'],
    requiredEvidence: ['manual UI observation', 'console/network findings when relevant'],
    forbiddenUses: ['bypass authentication policy', 'perform destructive production actions', 'publish sensitive data to third-party tools']
  },
  {
    id: 'git-local',
    title: 'Local Git inspection',
    category: 'git',
    summary: 'Inspect local repository status, diffs, and history for coordination and safety checks.',
    sideEffect: 'read_only',
    defaultAvailable: true,
    allowedStages: ['status', 'review', 'doctor'],
    requiredEvidence: ['git status or diff summary when used for decisions'],
    forbiddenUses: ['force push', 'destructive reset', 'delete branches without explicit approval']
  },
  {
    id: 'hashline-edit',
    title: 'Hashline UTF-8 text editing',
    category: 'editing',
    summary: 'Edit UTF-8 text files through stable line anchors for safer targeted modifications.',
    sideEffect: 'local_write',
    defaultAvailable: true,
    allowedStages: ['implementation', 'docs'],
    requiredEvidence: ['read anchors before edit', 'diff or readback after important edits'],
    forbiddenUses: ['edit binary files', 'retry stale anchors without rereading', 'overwrite unrelated user changes']
  },
  {
    id: 'native-file-edit',
    title: 'Native file read/edit/write fallback',
    category: 'editing',
    summary: 'Use native file tools for reads and targeted edits when hashline editing is unsuitable.',
    sideEffect: 'local_write',
    defaultAvailable: true,
    allowedStages: ['implementation', 'docs'],
    requiredEvidence: ['read before write', 'diff or readback after important edits'],
    forbiddenUses: ['create unsolicited docs', 'overwrite existing files without reading', 'write secrets']
  },
  {
    id: 'sdd-cli',
    title: 'SDD local CLI/runtime',
    category: 'runtime',
    summary: 'Read and update local SDD runtime state, semantic docs, artifacts, and generated entries through explicit commands.',
    sideEffect: 'command_execution',
    defaultAvailable: true,
    allowedStages: ['status', 'do', 'verify', 'sync-back', 'doctor'],
    requiredEvidence: ['command output', 'state/event/artifact path when runtime changes'],
    forbiddenUses: ['unapproved complex sync-back apply', 'automatic commit or push', 'background write orchestration']
  },
  {
    id: 'validation-command',
    title: 'Project validation commands',
    category: 'validation',
    summary: 'Run project-specific checks such as typecheck, tests, build, lint, or smoke commands.',
    sideEffect: 'command_execution',
    defaultAvailable: true,
    allowedStages: ['validation', 'verify', 'doctor'],
    requiredEvidence: ['command name', 'pass/fail status', 'relevant output excerpt'],
    forbiddenUses: ['skip failing checks without explanation', 'run destructive commands as validation', 'hide hook failures']
  },
  {
    id: 'governance-policy',
    title: 'Governance policy gate',
    category: 'governance',
    summary: 'Evaluate concurrency, confirmation, retry, cleanup, and risky-operation gates before runtime execution.',
    sideEffect: 'read_only',
    defaultAvailable: true,
    allowedStages: ['status', 'do', 'verify', 'doctor'],
    requiredEvidence: ['policy decision', 'blocked or confirmed operation reason', 'runtime event when execution is gated'],
    forbiddenUses: ['auto approve destructive operations', 'bypass permission prompts', 'delete run history']
  }
];

export async function listToolCapabilities(projectRoot: string): Promise<ToolCapabilityRegistry> {
  await readProjectConfig(projectRoot);
  return {
    version: TOOL_CAPABILITY_REGISTRY_VERSION,
    capabilities: [...BUILT_IN_TOOL_CAPABILITIES].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectToolCapability(projectRoot: string, capabilityId: string): Promise<ToolCapability | null> {
  const registry = await listToolCapabilities(projectRoot);
  return registry.capabilities.find((capability) => capability.id === capabilityId) ?? null;
}

export async function inspectWorktreeIsolation(projectRoot: string, options: { branch?: string; taskId: string; capabilityId?: string; peerTaskIds?: string[] }): Promise<WorktreeIsolationDecision> {
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const [model, capabilityRegistry] = await Promise.all([parseSddBranch(projectRoot, branch), listToolCapabilities(projectRoot)]);
  const inspected = inspectSddTask(model, options.taskId);
  const capabilityId = options.capabilityId ?? 'native-file-edit';
  const capability = capabilityRegistry.capabilities.find((candidate) => candidate.id === capabilityId);
  const task = inspected.task;
  const affectedFiles = task?.affectedFiles ?? [];
  const risk = task?.risk ?? [];
  const peers = (options.peerTaskIds ?? []).map((peerTaskId): WorktreeIsolationPeer => {
    const peer = inspectSddTask(model, peerTaskId).task;
    return { taskId: peerTaskId, affectedFiles: peer?.affectedFiles ?? [], risk: peer?.risk ?? [] };
  });
  const sideEffect = capability?.sideEffect ?? 'local_write';
  const overlaps = peers
    .map((peer) => ({ peerTaskId: peer.taskId, files: overlappingFiles(affectedFiles, peer.affectedFiles) }))
    .filter((overlap) => overlap.files.length > 0);
  const highRisk = risk.some((item) => ['database', 'schema', 'security', 'state-machine', 'ci'].includes(item));
  const manualRisk = risk.some((item) => ['database', 'security'].includes(item));
  const unsafeOverlap = overlaps.length > 0 && sideEffect !== 'read_only';
  const reasons: string[] = [];
  const gates: WorktreeIsolationGate[] = [];

  if (!task) {
    reasons.push(`Task ${options.taskId} is missing or ambiguous in specs/${branch}/tasks.md.`);
  }
  if (!capability) {
    reasons.push(`Capability ${capabilityId} is not declared in the Phase 3.1 capability registry.`);
  }
  if (unsafeOverlap) {
    reasons.push(`Writable task overlaps peer affected file(s): ${overlaps.map((overlap) => `${overlap.peerTaskId}:${overlap.files.join(',')}`).join('; ')}.`);
  }
  if (manualRisk) {
    reasons.push('Database/security risk requires manual isolation gate before worktree lifecycle automation.');
  } else if (highRisk && sideEffect !== 'read_only') {
    reasons.push('High-risk writable task requires worktree isolation.');
  } else if (sideEffect === 'read_only') {
    reasons.push('Read-only capability does not require worktree isolation.');
  } else if (sideEffect === 'local_write' || sideEffect === 'command_execution') {
    reasons.push('Writable or command-executing capability requires worktree isolation unless blocked by overlap.');
  }

  gates.push(
    { name: 'task_found', passed: task !== null, message: task ? `Task ${options.taskId} found.` : `Task ${options.taskId} missing or ambiguous.` },
    { name: 'capability_declared', passed: capability !== undefined, message: capability ? `Capability ${capabilityId} side_effect=${sideEffect}.` : `Capability ${capabilityId} missing.` },
    { name: 'files_overlap', passed: overlaps.length === 0, message: overlaps.length === 0 ? 'No peer affected_files overlap.' : `Overlaps: ${overlaps.map((overlap) => `${overlap.peerTaskId}:${overlap.files.join(',')}`).join('; ')}` },
    { name: 'unsafe_concurrency', passed: !unsafeOverlap, message: unsafeOverlap ? 'Writable overlapping tasks are not safe to run concurrently.' : 'No unsafe writable overlap detected.' },
    { name: 'read_only', passed: sideEffect === 'read_only', message: sideEffect === 'read_only' ? 'Read-only task can run without worktree.' : 'Task may mutate local state or execute commands.' }
  );

  const mode: WorktreeIsolationMode = !task || !capability || unsafeOverlap
    ? 'blocked'
    : manualRisk || sideEffect === 'external_interaction'
      ? 'manual'
      : sideEffect === 'read_only'
        ? 'none'
        : 'required';

  return {
    version: WORKTREE_ISOLATION_CONTRACT_VERSION,
    taskId: options.taskId,
    mode,
    safeConcurrency: mode !== 'blocked',
    capabilityId,
    capabilitySideEffect: sideEffect,
    affectedFiles,
    risk,
    peers,
    overlaps,
    gates,
    reasons
  };
}

export async function createWorktreeLifecycle(projectRoot: string, runId: string, options: { taskId: string; baseRef?: string; worktreeId?: string }): Promise<WorktreeLifecycleRecord> {
  await readProjectConfig(projectRoot);
  const state = await readRunState(projectRoot, runId);
  const decision = await inspectWorktreeIsolation(projectRoot, { taskId: options.taskId });
  if (decision.mode === 'blocked' || decision.mode === 'none') {
    throw new Error(`Cannot create worktree for ${options.taskId}: isolation mode is ${decision.mode}.`);
  }
  const gitRoot = await getGitRoot(projectRoot);
  if (!gitRoot) {
    throw new Error('Cannot create worktree outside a Git repository.');
  }

  const worktreeId = options.worktreeId ?? defaultWorktreeId(runId, options.taskId);
  assertSafePathSegment(worktreeId, 'worktreeId');
  const currentWorktrees = state.worktrees ?? {};
  const existing = currentWorktrees[worktreeId];
  if (existing && existing.status !== 'removed') {
    throw new Error(`Worktree ${worktreeId} already exists for run ${runId}.`);
  }

  const baseRef = options.baseRef ?? 'HEAD';
  const branchName = `sdd-${worktreeId}`;
  const worktreePath = path.join(getWorktreesDir(projectRoot), worktreeId);
  await mkdir(path.dirname(worktreePath), { recursive: true });
  await execFileAsync('git', ['-C', projectRoot, 'worktree', 'add', '-b', branchName, worktreePath, baseRef]);

  const now = new Date().toISOString();
  const record: WorktreeLifecycleRecord = {
    contract: WORKTREE_LIFECYCLE_CONTRACT_VERSION,
    runId,
    taskId: options.taskId,
    worktreeId,
    status: 'created',
    branchName,
    worktreePath: path.relative(projectRoot, worktreePath),
    baseRef,
    createdAt: now,
    updatedAt: now,
    removedAt: null,
    keepReason: null,
    dirty: false
  };
  await writeRunState(projectRoot, { ...state, worktrees: { ...currentWorktrees, [worktreeId]: record } });
  await appendEvent(projectRoot, runId, {
    event: 'worktree_created',
    runId,
    summary: `Worktree ${worktreeId} created for ${options.taskId}.`,
    data: { worktreeId, taskId: options.taskId, path: record.worktreePath, branchName, baseRef }
  });
  return record;
}

export async function inspectWorktreeLifecycle(projectRoot: string, runId: string): Promise<WorktreeLifecycleInspection> {
  const state = await readRunState(projectRoot, runId);
  const records = await Promise.all(Object.values(state.worktrees ?? {}).map(async (record) => ({
    ...record,
    dirty: record.status === 'removed' ? false : await isGitWorktreeDirty(projectRoot, record.worktreePath)
  })));
  const issues: ContractValidationIssue[] = [];
  const activePaths = new Set(records.filter((record) => record.status !== 'removed').map((record) => normalizeComparablePath(record.worktreePath)));
  const registeredPaths = await listGitWorktreePaths(projectRoot);

  for (const record of records) {
    const absolutePath = path.resolve(projectRoot, record.worktreePath);
    const comparablePath = normalizeComparablePath(record.worktreePath);
    const pathExists = await exists(absolutePath);
    if (record.contract !== WORKTREE_LIFECYCLE_CONTRACT_VERSION) {
      issues.push(contractIssue('contract', `${record.worktreeId} uses ${record.contract}.`, `Use ${WORKTREE_LIFECYCLE_CONTRACT_VERSION}.`));
    }
    if (record.status !== 'removed' && !pathExists) {
      issues.push(contractIssue('worktreePath', `${record.worktreeId} points to missing worktree path ${record.worktreePath}.`, 'Inspect worktree state and mark removed only through lifecycle remove.'));
    }
    if (record.status !== 'removed' && pathExists && !registeredPaths.has(normalizeComparablePath(absolutePath))) {
      issues.push(contractIssue('worktreePath', `${record.worktreeId} path is not registered in git worktree list.`, 'Inspect git worktree list and reconcile lifecycle state.'));
    }
    if (record.status === 'removed' && pathExists) {
      issues.push(contractIssue('status', `${record.worktreeId} is removed in state but path still exists.`, 'Inspect the path before deleting anything manually.'));
    }
    if (record.status !== 'removed' && record.dirty) {
      issues.push(contractIssue('dirty', `${record.worktreeId} has uncommitted changes.`, 'Keep the worktree or resolve changes before lifecycle remove.'));
    }
    if (record.status !== 'removed' && activePaths.has(comparablePath) && Array.from(activePaths).filter((item) => item === comparablePath).length > 1) {
      issues.push(contractIssue('worktreePath', `${record.worktreeId} shares a path with another active worktree.`, 'Use one lifecycle record per worktree path.'));
    }
  }

  for (const orphanPath of await listOrphanWorktreeDirs(projectRoot, activePaths)) {
    issues.push(contractIssue('orphan', `${orphanPath} exists without active lifecycle state.`, 'Inspect the directory before removing it or recreate lifecycle state.'));
  }

  return {
    runId,
    contract: WORKTREE_LIFECYCLE_CONTRACT_VERSION,
    records,
    valid: issues.length === 0,
    issues
  };
}

export async function keepWorktreeLifecycle(projectRoot: string, runId: string, worktreeId: string, options: { reason?: string } = {}): Promise<WorktreeLifecycleRecord> {
  assertSafePathSegment(worktreeId, 'worktreeId');
  const state = await readRunState(projectRoot, runId);
  const record = (state.worktrees ?? {})[worktreeId];
  if (!record) {
    throw new Error(`Unknown worktree ${worktreeId} for run ${runId}.`);
  }
  const now = new Date().toISOString();
  const nextRecord: WorktreeLifecycleRecord = {
    ...record,
    status: 'kept',
    updatedAt: now,
    keepReason: options.reason ?? 'kept for later inspection',
    dirty: await isGitWorktreeDirty(projectRoot, record.worktreePath)
  };
  await writeRunState(projectRoot, { ...state, worktrees: { ...(state.worktrees ?? {}), [worktreeId]: nextRecord } });
  await appendEvent(projectRoot, runId, {
    event: 'worktree_kept',
    runId,
    summary: `Worktree ${worktreeId} kept.`,
    data: { worktreeId, reason: nextRecord.keepReason, dirty: nextRecord.dirty }
  });
  return nextRecord;
}

export async function removeWorktreeLifecycle(projectRoot: string, runId: string, worktreeId: string): Promise<WorktreeLifecycleRecord> {
  assertSafePathSegment(worktreeId, 'worktreeId');
  const state = await readRunState(projectRoot, runId);
  const record = (state.worktrees ?? {})[worktreeId];
  if (!record) {
    throw new Error(`Unknown worktree ${worktreeId} for run ${runId}.`);
  }
  if (record.status === 'removed') {
    return record;
  }
  const dirty = await isGitWorktreeDirty(projectRoot, record.worktreePath);
  if (dirty) {
    throw new Error(`Refusing to remove dirty worktree ${worktreeId}. Commit, stash, or keep it first.`);
  }
  await execFileAsync('git', ['-C', projectRoot, 'worktree', 'remove', path.resolve(projectRoot, record.worktreePath)]);
  const now = new Date().toISOString();
  const nextRecord: WorktreeLifecycleRecord = {
    ...record,
    status: 'removed',
    updatedAt: now,
    removedAt: now,
    dirty: false
  };
  await writeRunState(projectRoot, { ...state, worktrees: { ...(state.worktrees ?? {}), [worktreeId]: nextRecord } });
  await appendEvent(projectRoot, runId, {
    event: 'worktree_removed',
    runId,
    summary: `Worktree ${worktreeId} removed.`,
    data: { worktreeId, path: record.worktreePath }
  });
  return nextRecord;
}

const BUILT_IN_TOOL_PLUGIN_CONTRACTS: ToolPluginContract[] = [
  {
    id: 'artifact-run-hygiene-tools',
    title: 'Artifact/run hygiene tools contract',
    version: '1.0.0',
    capabilityId: 'artifact-run-hygiene',
    entryKind: 'command',
    assetPath: 'packages/core/src/index.ts#artifact-run-hygiene',
    loadMode: 'static_manifest',
    checksum: null,
    requiredEvidence: ['sdd-result artifact', 'run event log', 'doctor report'],
    forbiddenUses: ['dynamic plugin execution', 'delete run evidence', 'auto apply sync-back', 'background write orchestration']
  },
  {
    id: 'browser-ui-check-adapter',
    title: 'Browser UI check adapter contract',
    version: '1.0.0',
    capabilityId: 'browser-ui-check',
    entryKind: 'manual',
    assetPath: 'claude-code/browser-tools',
    loadMode: 'readonly_asset',
    checksum: null,
    requiredEvidence: ['manual UI observation', 'console/network findings when relevant'],
    forbiddenUses: ['dynamic browser automation plugin execution', 'destructive production actions', 'publish sensitive data to third-party tools']
  },
  {
    id: 'git-local-inspection',
    title: 'Local git inspection contract',
    version: '1.0.0',
    capabilityId: 'git-local',
    entryKind: 'cli',
    assetPath: 'git',
    loadMode: 'readonly_asset',
    checksum: null,
    requiredEvidence: ['git status or diff summary when used for decisions'],
    forbiddenUses: ['force push', 'destructive reset', 'delete branches without explicit approval', 'background write orchestration']
  },
  {
    id: 'hashline-edit-adapter',
    title: 'Hashline edit adapter contract',
    version: '1.0.0',
    capabilityId: 'hashline-edit',
    entryKind: 'adapter',
    assetPath: 'mcp:hashline-edit',
    loadMode: 'readonly_asset',
    checksum: null,
    requiredEvidence: ['read anchors before edit', 'diff or readback after important edits'],
    forbiddenUses: ['dynamic external plugin scan', 'retry stale anchors without rereading', 'overwrite unrelated user changes']
  },
  {
    id: 'native-file-edit-adapter',
    title: 'Native file edit adapter contract',
    version: '1.0.0',
    capabilityId: 'native-file-edit',
    entryKind: 'adapter',
    assetPath: 'claude-code:file-tools',
    loadMode: 'readonly_asset',
    checksum: null,
    requiredEvidence: ['read before write', 'diff or readback after important edits'],
    forbiddenUses: ['permission injection', 'overwrite existing files without reading', 'write secrets']
  },
  {
    id: 'sdd-cli-runtime',
    title: 'SDD CLI/runtime contract',
    version: '1.0.0',
    capabilityId: 'sdd-cli',
    entryKind: 'cli',
    assetPath: 'dist/packages/cli/src/main.js',
    loadMode: 'static_manifest',
    checksum: null,
    requiredEvidence: ['command output', 'state/event/artifact path when runtime changes'],
    forbiddenUses: ['dynamic plugin execution', 'unapproved complex sync-back apply', 'automatic commit or push', 'background write orchestration']
  },
  {
    id: 'validation-command-runner',
    title: 'Validation command runner contract',
    version: '1.0.0',
    capabilityId: 'validation-command',
    entryKind: 'command',
    assetPath: '.sdd/project.yml#validation.default',
    loadMode: 'static_manifest',
    checksum: null,
    requiredEvidence: ['command name', 'pass/fail status', 'relevant output excerpt'],
    forbiddenUses: ['dynamic plugin execution', 'run destructive commands as validation', 'hide hook failures']
  }
 ];

export async function listToolPluginContracts(projectRoot: string): Promise<ToolPluginContractRegistry> {
  await readProjectConfig(projectRoot);
  return {
    version: TOOL_PLUGIN_CONTRACT_REGISTRY_VERSION,
    contracts: [...BUILT_IN_TOOL_PLUGIN_CONTRACTS].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectToolPluginContract(projectRoot: string, pluginId: string): Promise<ToolPluginContract | null> {
  const registry = await listToolPluginContracts(projectRoot);
  return registry.contracts.find((contract) => contract.id === pluginId) ?? null;
}

const BUILT_IN_WORKER_ADAPTER_CONTRACTS: WorkerAdapterContract[] = [
  {
    id: 'claude-code-subagent-worker',
    title: 'Claude Code subagent worker adapter',
    version: '1.0.0',
    kind: 'claude_code_subagent',
    capabilityId: 'sdd-cli',
    pluginContractId: 'sdd-cli-runtime',
    input: {
      queueItemId: '<run_id>:<delegation_id>',
      runId: '<run_id>',
      taskId: '<task_id>',
      delegationId: '<delegation_id>',
      stateMachineVersion: DELEGATION_STATE_MACHINE_VERSION
    },
    output: {
      artifactReference: 'artifacts/<agent>-<task_id>.md',
      terminalStatus: ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'],
      exitStatuses: ['completed', 'failed', 'timed_out', 'cancelled', 'blocked'],
      requiredEvents: ['delegation_started', 'delegation_completed', 'delegation_failed', 'delegation_timeout', 'delegation_cancelled']
    },
    sideEffect: 'command_execution',
    permissionPrompt: 'Run a Claude Code/subagent task for one queued delegation and persist only declared run events/artifact references.',
    requiredEvidence: ['queue item id', 'delegation state transition event', 'sdd-result artifact reference'],
    forbiddenUses: ['bypass Claude Code permission prompts', 'execute undeclared wave scheduling', 'write outside .sdd/runs or declared artifacts', 'reopen terminal delegation ids']
  },
  {
    id: 'manual-handoff-worker',
    title: 'Manual handoff worker adapter',
    version: '1.0.0',
    kind: 'manual_handoff',
    capabilityId: 'sdd-cli',
    pluginContractId: 'sdd-cli-runtime',
    input: {
      queueItemId: '<run_id>:<delegation_id>',
      runId: '<run_id>',
      taskId: '<task_id>',
      delegationId: '<delegation_id>',
      stateMachineVersion: DELEGATION_STATE_MACHINE_VERSION
    },
    output: {
      artifactReference: 'artifacts/<agent>-<task_id>.md',
      terminalStatus: ['COMPLETED', 'FAILED', 'CANCELLED'],
      exitStatuses: ['completed', 'failed', 'cancelled', 'blocked'],
      requiredEvents: ['delegation_started', 'delegation_completed', 'delegation_failed', 'delegation_cancelled']
    },
    sideEffect: 'read_only',
    permissionPrompt: 'Prepare a manual delegation handoff without starting a background process.',
    requiredEvidence: ['queue item id', 'manual handoff instructions', 'expected artifact reference'],
    forbiddenUses: ['start background worker', 'claim queue item', 'mark delegation completed without artifact evidence']
  },
  {
    id: 'sdd-cli-task-worker',
    title: 'SDD CLI task worker adapter',
    version: '1.0.0',
    kind: 'sdd_cli_task',
    capabilityId: 'artifact-run-hygiene',
    pluginContractId: 'artifact-run-hygiene-tools',
    input: {
      queueItemId: '<run_id>:<delegation_id>',
      runId: '<run_id>',
      taskId: '<task_id>',
      delegationId: '<delegation_id>',
      stateMachineVersion: DELEGATION_STATE_MACHINE_VERSION
    },
    output: {
      artifactReference: 'artifacts/<agent>-<task_id>.md',
      terminalStatus: ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'],
      exitStatuses: ['completed', 'failed', 'timed_out', 'cancelled', 'blocked'],
      requiredEvents: ['delegation_started', 'delegation_completed', 'delegation_failed', 'delegation_timeout', 'delegation_cancelled']
    },
    sideEffect: 'local_write',
    permissionPrompt: 'Run a bounded SDD CLI task adapter and write only declared artifact/run evidence.',
    requiredEvidence: ['queue item id', 'command output', 'sdd-result artifact reference'],
    forbiddenUses: ['unapproved complex sync-back apply', 'dynamic plugin execution', 'background wave execution', 'write undeclared artifacts']
  }
];

export async function listWorkerAdapterContracts(projectRoot: string): Promise<WorkerAdapterContractRegistry> {
  await readProjectConfig(projectRoot);
  return {
    version: WORKER_ADAPTER_CONTRACT_REGISTRY_VERSION,
    adapters: [...BUILT_IN_WORKER_ADAPTER_CONTRACTS].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectWorkerAdapterContract(projectRoot: string, adapterId: string): Promise<WorkerAdapterContract | null> {
  const registry = await listWorkerAdapterContracts(projectRoot);
  return registry.adapters.find((adapter) => adapter.id === adapterId) ?? null;
}

const BUILT_IN_WORKFLOW_GATES: WorkflowGateContract[] = [
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'spec',
    command: 'sdd instructions spec --json',
    requiredInputs: ['user intent or revision request', 'existing specs/<branch>/spec.md when present'],
    allowedAgents: ['scout', 'spec-reviewer'],
    requiredArtifacts: ['specs/<branch>/spec.md', 'spec checkpoint notes'],
    gateConditions: ['explicit scope', 'verifiable acceptance', 'open questions listed'],
    gapClosureBehavior: 'Stop at spec gaps; do not advance to plan until scope and acceptance are explicit.',
    nextAction: 'Run lifecycle gate when risk is unclear, then refine specs/<branch>/spec.md.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'plan',
    command: 'sdd instructions plan --json',
    requiredInputs: ['approved spec', 'impact/risk context', 'architecture context', 'validation constraints'],
    allowedAgents: ['scout', 'planner', 'spec-reviewer'],
    requiredArtifacts: ['specs/<branch>/plan.md'],
    gateConditions: ['technical solution selected', 'current and target state described', 'risk-driven design sections completed', 'validation matrix defined', 'task breakdown rationale stated'],
    gapClosureBehavior: 'Return to spec or research when plan inputs, architecture context, risk controls, or validation evidence are ambiguous.',
    nextAction: 'Refine specs/<branch>/plan.md as the technical solution document and stop before task writing if plan gaps remain.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'tasks',
    command: 'sdd instructions tasks --json',
    requiredInputs: ['approved spec', 'approved plan', 'task boundary candidates'],
    allowedAgents: ['planner', 'reviewer'],
    requiredArtifacts: ['specs/<branch>/tasks.md'],
    gateConditions: ['each task has boundary', 'affected files declared when knowable', 'validation declared'],
    gapClosureBehavior: 'Run sdd tasks gaps and fix blocking task metadata before implementation.',
    nextAction: 'Create executable sdd-task blocks, then run sdd tasks gaps --branch <branch>.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'do',
    command: 'sdd do task <task_id>',
    requiredInputs: ['selected task', 'boundary', 'acceptance', 'declared validation'],
    allowedAgents: ['scout', 'implementer', 'reviewer', 'debugger', 'validator'],
    requiredArtifacts: ['artifacts/implement-<task>.md', 'artifacts/review-<task>.md', 'artifacts/validation-<task>.md'],
    gateConditions: ['single selected task', 'no blocking task gaps', 'artifact template available'],
    gapClosureBehavior: 'Block on missing boundary, missing validation, invalid artifact, or expanded scope.',
    nextAction: 'Run inside the selected task boundary and record sdd-result artifacts before verify.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'verify',
    command: 'sdd verify task <task_id> [--run <run_id>]',
    requiredInputs: ['task id', 'review evidence', 'validation evidence'],
    allowedAgents: ['validator', 'reviewer'],
    requiredArtifacts: ['artifacts/validation-<task>.md', 'sync-back proposal when PASS'],
    gateConditions: ['acceptance mapped to evidence', 'validation gaps explicit', 'sync-back policy known'],
    gapClosureBehavior: 'Return PASS_WITH_GAPS, FAIL, or BLOCKED when acceptance evidence is incomplete.',
    nextAction: 'Inspect sync-back proposal after PASS and follow apply_policy.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'doctor',
    command: 'sdd doctor',
    requiredInputs: ['project config', 'managed AI entries', 'run evidence'],
    allowedAgents: ['scout'],
    requiredArtifacts: ['doctor report'],
    gateConditions: ['config readable', 'managed entries current', 'run evidence consistent'],
    gapClosureBehavior: 'Report maintenance action instead of mutating source files automatically.',
    nextAction: 'Run the recommended maintenance command or return to status when healthy.'
  }
 ];

const BUILT_IN_AGENT_REGISTRY: AgentRegistryEntry[] = [
  {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    id: 'scout',
    role: 'Collect bounded local context and uncertainty without editing files.',
    allowedStages: ['spec', 'plan', 'do', 'doctor'],
    capabilities: ['read files', 'search symbols', 'summarize evidence', 'identify gaps'],
    readBoundary: ['project files', 'spec/plan/task snippets', 'existing artifacts'],
    writeBoundary: ['artifacts/scout-<task>.md only when explicitly requested'],
    toolAllowlist: ['read', 'grep', 'glob', 'semantic search'],
    requiredArtifact: 'artifacts/scout-<task>.md',
    verificationExpectation: 'Findings are evidence-backed and scoped to the exploration question.',
    autonomyCeiling: 'read_only',
    stopCondition: 'Stop when evidence paths and remaining uncertainty are clear.'
  },
  {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    id: 'spec-reviewer',
    role: 'Review requirements, scope, non-goals, and acceptance clarity.',
    allowedStages: ['spec', 'plan'],
    capabilities: ['requirements review', 'gap detection', 'acceptance clarity check'],
    readBoundary: ['spec document', 'user request', 'related plan snippets'],
    writeBoundary: ['review artifact or proposed spec edits after approval'],
    toolAllowlist: ['read', 'grep'],
    requiredArtifact: 'artifacts/spec-review-<task>.md',
    verificationExpectation: 'Spec gaps are explicit and do not silently advance to plan.',
    autonomyCeiling: 'review_only',
    stopCondition: 'Stop when spec is ready for plan or blocking gaps are listed.'
  },
  {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    id: 'planner',
    role: 'Design the task-ready technical solution, including architecture impact, risk controls, validation strategy, and implementation slices.',
    allowedStages: ['plan', 'tasks'],
    capabilities: ['impact analysis', 'technical solution design', 'PlantUML diagramming', 'slice planning', 'validation planning'],
    readBoundary: ['approved spec', 'existing architecture docs', 'relevant files'],
    writeBoundary: ['specs/<branch>/plan.md or planning artifact'],
    toolAllowlist: ['read', 'grep', 'glob'],
    requiredArtifact: 'specs/<branch>/plan.md',
    verificationExpectation: 'Plan includes current state, target design, risk-driven technical sections, validation matrix, task breakdown rationale, and unresolved gaps.',
    autonomyCeiling: 'review_only',
    stopCondition: 'Stop before implementation or when task readiness gaps remain.'
  },
  {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    id: 'implementer',
    role: 'Apply minimal foreground changes for one selected task boundary.',
    allowedStages: ['do'],
    capabilities: ['edit files', 'run bounded validation', 'produce implementation evidence'],
    readBoundary: ['selected task', 'approved spec/plan', 'affected files'],
    writeBoundary: ['declared affected files', 'artifacts/implement-<task>.md'],
    toolAllowlist: ['read', 'edit', 'write scoped artifacts', 'validation command'],
    requiredArtifact: 'artifacts/implement-<task>.md',
    verificationExpectation: 'Changes stay inside boundary and are ready for independent review.',
    autonomyCeiling: 'foreground_write',
    stopCondition: 'Stop on boundary expansion, missing validation, or required human checkpoint.'
  },
  {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    id: 'reviewer',
    role: 'Review diff and task evidence against boundary and acceptance.',
    allowedStages: ['do', 'verify'],
    capabilities: ['diff review', 'risk check', 'gap report'],
    readBoundary: ['diff', 'task metadata', 'implementation artifact'],
    writeBoundary: ['artifacts/review-<task>.md'],
    toolAllowlist: ['read', 'grep', 'git diff'],
    requiredArtifact: 'artifacts/review-<task>.md',
    verificationExpectation: 'Review decision is traceable to task boundary and acceptance.',
    autonomyCeiling: 'review_only',
    stopCondition: 'Stop when approval, requested changes, or blocking gaps are explicit.'
  },
  {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    id: 'debugger',
    role: 'Investigate one validation failure without broad retry loops.',
    allowedStages: ['do'],
    capabilities: ['failure triage', 'minimal fix proposal', 'gap isolation'],
    readBoundary: ['validation output', 'changed files', 'task boundary'],
    writeBoundary: ['artifacts/debug-<task>.md', 'minimal fix only after checkpoint'],
    toolAllowlist: ['read', 'grep', 'validation command'],
    requiredArtifact: 'artifacts/debug-<task>.md',
    verificationExpectation: 'Failure cause and fix boundary are explicit.',
    autonomyCeiling: 'foreground_write',
    stopCondition: 'Stop after one bounded attempt or when cause is unclear.'
  },
  {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    id: 'validator',
    role: 'Map acceptance criteria to review, diff, and command evidence.',
    allowedStages: ['verify'],
    capabilities: ['run declared validation', 'acceptance mapping', 'PASS/PASS_WITH_GAPS/FAIL/BLOCKED decision'],
    readBoundary: ['task acceptance', 'review artifact', 'validation outputs'],
    writeBoundary: ['artifacts/validation-<task>.md'],
    toolAllowlist: ['read', 'validation command'],
    requiredArtifact: 'artifacts/validation-<task>.md',
    verificationExpectation: 'PASS requires acceptance evidence, not just command success.',
    autonomyCeiling: 'validation_only',
    stopCondition: 'Stop when acceptance mapping and sync-back recommendation are clear.'
  }
];

const BUILT_IN_AGENT_PROFILES: AgentProfileContract[] = [
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'planner', stageScope: ['spec', 'plan', 'tasks'], riskCeiling: 'research_before_implementation', defaultAutonomy: 'compact_boundary_only', requiredArtifacts: ['plan artifact'], toolScope: ['read', 'search'], modelPolicyId: 'reasoning', hostCapabilityRequirements: ['claude.subagent.researcher'], boundaries: ['does not edit implementation files', 'stops on unresolved scope or risk gaps'] },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'architect', stageScope: ['plan', 'review'], riskCeiling: 'full_sdd_with_checkpoint', defaultAutonomy: 'compact_boundary_only', requiredArtifacts: ['architecture or plan-risk artifact'], toolScope: ['read', 'search', 'diagram'], modelPolicyId: 'reasoning', hostCapabilityRequirements: ['host.search.grep_glob'], boundaries: ['does not own completion state', 'cannot downgrade lifecycle gates'] },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'implementer', stageScope: ['do'], riskCeiling: 'compact_boundary_only', defaultAutonomy: 'direct_execution_allowed', requiredArtifacts: ['implementation artifact', 'command evidence when runnable'], toolScope: ['read', 'edit', 'test'], modelPolicyId: 'balanced', hostCapabilityRequirements: ['claude.subagent.implementer', 'host.edit.hashline'], boundaries: ['edits only declared task scope', 'stops on required artifact or checkpoint gaps'] },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'reviewer', stageScope: ['review', 'verify'], riskCeiling: 'full_sdd_with_checkpoint', defaultAutonomy: 'compact_boundary_only', requiredArtifacts: ['review artifact'], toolScope: ['read', 'diff', 'search'], modelPolicyId: 'reasoning', hostCapabilityRequirements: ['host.search.grep_glob'], boundaries: ['does not replace validation evidence', 'reports gaps instead of marking completion'] },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'validator', stageScope: ['verify'], riskCeiling: 'full_sdd_with_checkpoint', defaultAutonomy: 'compact_boundary_only', requiredArtifacts: ['validation artifact'], toolScope: ['read', 'test', 'browser'], modelPolicyId: 'balanced', hostCapabilityRequirements: ['host.cli.shell'], boundaries: ['maps acceptance to evidence', 'does not treat command success as canonical completion'] },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'researcher', stageScope: ['spec', 'plan', 'tasks', 'review'], riskCeiling: 'research_before_implementation', defaultAutonomy: 'research_before_implementation', requiredArtifacts: ['research summary or source attribution'], toolScope: ['read', 'search', 'docs'], modelPolicyId: 'reasoning', hostCapabilityRequirements: ['claude.subagent.researcher', 'context7.docs'], boundaries: ['read-only by default', 'external sources require attribution'] },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'orchestrator', stageScope: ['spec', 'plan', 'tasks', 'do', 'review', 'verify'], riskCeiling: 'full_sdd_with_checkpoint', defaultAutonomy: 'compact_boundary_only', requiredArtifacts: ['router decision', 'execution record'], toolScope: ['route', 'delegate', 'record'], modelPolicyId: 'reasoning', hostCapabilityRequirements: ['claude_code.host_adapter'], boundaries: ['coordinates but does not bypass risk gates', 'host sessions are provenance not truth'] },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'security', stageScope: ['plan', 'review', 'verify'], riskCeiling: 'research_before_implementation', defaultAutonomy: 'research_before_implementation', requiredArtifacts: ['security findings artifact'], toolScope: ['read', 'search', 'non_destructive_poc'], modelPolicyId: 'security_review', hostCapabilityRequirements: ['pattern.ohmy.security_research'], boundaries: ['authorized defensive scope only', 'no destructive exploitation or evasion'] },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'domain_expert', stageScope: ['spec', 'plan', 'review'], riskCeiling: 'research_before_implementation', defaultAutonomy: 'research_before_implementation', requiredArtifacts: ['domain evidence or mapping artifact'], toolScope: ['read', 'docs', 'source_material'], modelPolicyId: 'reasoning', hostCapabilityRequirements: ['external.agency_agents.material'], boundaries: ['external prompt packs stay quarantined until scanned', 'uses metadata extraction not bulk prompt import'] }
 ];

const BUILT_IN_SKILL_CAPABILITIES: SkillCapabilityContract[] = [
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'claude.subagent.researcher', name: 'Claude Code researcher subagent', kind: 'host_tool', source: 'claude_code', sourceRef: 'Claude Code Agent tool', capabilityDomain: ['research', 'search'], allowedStages: ['spec', 'plan', 'tasks', 'review'], requiredRiskCeiling: 'research_before_implementation', evidenceType: 'execution_record', reuseDecision: 'reuse_direct', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'claude.subagent.implementer', name: 'Claude Code implementer subagent', kind: 'host_tool', source: 'claude_code', sourceRef: 'Claude Code Agent tool', capabilityDomain: ['edit', 'test'], allowedStages: ['do'], requiredRiskCeiling: 'compact_boundary_only', evidenceType: 'execution_record', reuseDecision: 'reuse_direct', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'claude.skill.sdd', name: 'SDD workflow skill', kind: 'skill', source: 'project', sourceRef: '.claude/skills/sdd/SKILL.md', capabilityDomain: ['planning', 'validation'], allowedStages: ['spec', 'plan', 'tasks', 'do', 'verify'], requiredRiskCeiling: 'full_sdd_with_checkpoint', evidenceType: 'artifact', reuseDecision: 'reuse_direct', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'context7.docs', name: 'Context7 documentation lookup', kind: 'mcp', source: 'mcp', sourceRef: 'Context7 MCP', capabilityDomain: ['docs', 'api'], allowedStages: ['spec', 'plan', 'review'], requiredRiskCeiling: 'research_before_implementation', evidenceType: 'external_source', reuseDecision: 'reuse_direct', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'playwright.browser_validation', name: 'Playwright browser validation', kind: 'mcp', source: 'mcp', sourceRef: 'Playwright MCP/CLI', capabilityDomain: ['browser', 'validation'], allowedStages: ['verify'], requiredRiskCeiling: 'compact_boundary_only', evidenceType: 'browser_snapshot', reuseDecision: 'reuse_direct', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'host.search.grep_glob', name: 'Host file and content search', kind: 'host_tool', source: 'host', sourceRef: 'Grep/Glob/Read tools', capabilityDomain: ['search'], allowedStages: ['spec', 'plan', 'tasks', 'do', 'review'], requiredRiskCeiling: 'direct_execution_allowed', evidenceType: 'command_output', reuseDecision: 'reuse_direct', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'host.edit.hashline', name: 'Hashline UTF-8 edit capability', kind: 'host_tool', source: 'host', sourceRef: 'hashline-edit MCP', capabilityDomain: ['edit'], allowedStages: ['do'], requiredRiskCeiling: 'compact_boundary_only', evidenceType: 'artifact', reuseDecision: 'reuse_direct', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'host.cli.shell', name: 'Host shell command execution', kind: 'cli_tool', source: 'host', sourceRef: 'PowerShell/Bash', capabilityDomain: ['test', 'build', 'git'], allowedStages: ['do', 'verify'], requiredRiskCeiling: 'compact_boundary_only', evidenceType: 'command_output', reuseDecision: 'adapt_via_host_adapter', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'pattern.opencode.plugin_registry', name: 'OpenCode plugin registry mechanism', kind: 'external_pattern', source: 'open_source', sourceRef: 'OpenCode plugin/agent mechanism', capabilityDomain: ['host_adapter'], allowedStages: ['plan'], requiredRiskCeiling: 'research_before_implementation', evidenceType: 'none', reuseDecision: 'borrow_mechanism', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'pattern.ohmy.agent_routing', name: 'Oh My OpenAgent routing pattern', kind: 'external_pattern', source: 'open_source', sourceRef: 'Oh My OpenAgent/OpenCode', capabilityDomain: ['routing', 'model_policy'], allowedStages: ['plan', 'tasks'], requiredRiskCeiling: 'research_before_implementation', evidenceType: 'none', reuseDecision: 'borrow_mechanism', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'pattern.ohmy.security_research', name: 'Oh My security-research team pattern', kind: 'external_pattern', source: 'open_source', sourceRef: 'Oh My OpenCode team-mode/security-research', capabilityDomain: ['security', 'review'], allowedStages: ['plan', 'review', 'verify'], requiredRiskCeiling: 'research_before_implementation', evidenceType: 'artifact', reuseDecision: 'borrow_mechanism', buildExceptionReason: null },
  { version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, id: 'external.agency_agents.material', name: 'Agency agents domain material', kind: 'external_pattern', source: 'open_source', sourceRef: 'msitarzewski/agency-agents', capabilityDomain: ['domain_expert', 'source_material'], allowedStages: ['spec', 'plan', 'review'], requiredRiskCeiling: 'research_before_implementation', evidenceType: 'external_source', reuseDecision: 'adapt_via_host_adapter', buildExceptionReason: null }
 ];

const BUILT_IN_CAPABILITY_SOURCES: CapabilitySourceCatalogEntry[] = [
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'claude_code_native', name: 'Claude Code native capabilities', kind: 'native_host', sourceRef: 'Claude Code subagents/skills/MCP/hooks/settings/background tasks', reuseDecision: 'reuse_direct', quarantineRequired: false, allowedUse: 'host-native execution and provenance capture', attribution: 'Claude Code host runtime', rationale: 'Reuse execution mechanics instead of rebuilding agent/skill/MCP runtime.' },
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'context7_mcp', name: 'Context7 MCP', kind: 'mcp_tool', sourceRef: 'Context7 documentation MCP', reuseDecision: 'reuse_direct', quarantineRequired: false, allowedUse: 'current library/API documentation lookup with source evidence', attribution: 'Context7 MCP', rationale: 'Mature docs lookup should be declared as capability, not rebuilt.' },
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'playwright_mcp', name: 'Playwright browser capability', kind: 'mcp_tool', sourceRef: 'Playwright MCP/CLI', reuseDecision: 'reuse_direct', quarantineRequired: false, allowedUse: 'browser/UI validation evidence', attribution: 'Playwright', rationale: 'Browser verification should be ingested as evidence rather than replaced by prompts.' },
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'opencode_patterns', name: 'OpenCode mechanism patterns', kind: 'mechanism_reference', sourceRef: 'OpenCode / Oh My OpenCode', reuseDecision: 'borrow_mechanism', quarantineRequired: false, allowedUse: 'adapter, model policy, permission and session discipline references', attribution: 'OpenCode ecosystem', rationale: 'Borrow host-neutral mechanisms without coupling SDD core to OpenCode APIs.' },
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'ohmy_team_mode', name: 'Oh My team-mode pattern', kind: 'mechanism_reference', sourceRef: 'Oh My OpenCode team-mode', reuseDecision: 'borrow_mechanism', quarantineRequired: false, allowedUse: 'adaptive chief/member/team-message/delegation-wave contract shape', attribution: 'Oh My OpenCode', rationale: 'Team runtime remains host capability; SDD records policy and evidence.' },
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'roo_cline_permissions', name: 'Roo/Cline tool permission envelope', kind: 'mechanism_reference', sourceRef: 'Roo Code / Cline modes and approvals', reuseDecision: 'borrow_mechanism', quarantineRequired: false, allowedUse: 'tool group, approval and runtime validation policy reference', attribution: 'Roo Code / Cline', rationale: 'Permission semantics should be structured, not natural-language prompt rules.' },
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'cc_sdd_completion_gate', name: 'cc-sdd dispatch and completion gates', kind: 'mechanism_reference', sourceRef: 'cc-sdd', reuseDecision: 'borrow_mechanism', quarantineRequired: false, allowedUse: 'bounded delegation and completion gate reference', attribution: 'cc-sdd', rationale: 'Useful dispatch pattern, but SDD task graph and evidence remain authoritative.' },
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'agency_agents_material', name: 'Agency agents material library', kind: 'open_source_material', sourceRef: 'msitarzewski/agency-agents', reuseDecision: 'adapt_via_host_adapter', quarantineRequired: true, allowedUse: 'domain taxonomy, guardrail and deliverable metadata after quarantine', attribution: 'agency-agents', rationale: 'Large prompt packs are material sources only and must be mapped before routing use.' },
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'wshobson_manifest', name: 'wshobson/BuildWithClaude manifest patterns', kind: 'mechanism_reference', sourceRef: 'wshobson agents / BuildWithClaude', reuseDecision: 'borrow_mechanism', quarantineRequired: true, allowedUse: 'marketplace manifest and file ownership reference after inspection', attribution: 'wshobson / BuildWithClaude', rationale: 'Borrow manifest/file ownership mechanics without copying agents.' },
  { version: CAPABILITY_SOURCE_CATALOG_VERSION, id: 'crewai_autogen_langgraph', name: 'CrewAI/AutoGen/LangGraph workflow frameworks', kind: 'future_adapter', sourceRef: 'CrewAI / AutoGen / LangGraph', reuseDecision: 'avoid', quarantineRequired: false, allowedUse: 'future optional adapter only after Phase 6 contracts stabilize', attribution: 'CrewAI / AutoGen / LangGraph', rationale: 'Avoid adding a workflow OS or scheduler to Phase 6 core.' }
 ];

interface AgentSkillRuntimeRegistry {
  profiles: AgentProfileContract[];
  skillCapabilities: SkillCapabilityContract[];
  capabilitySources: CapabilitySourceCatalogEntry[];
  registrySources: RuntimeRegistryEntrySource[];
  aliases: Record<string, string>;
  routingRules: AgentRuntimeRoutingRule[];
  adapterMappings: AgentRuntimeAdapterMapping[];
  issues: ContractValidationIssue[];
}

function emptyAgentRuntimeConfig(): ProjectAgentRuntimeConfig {
  return {
    profiles: [],
    skillCapabilities: [],
    capabilitySources: [],
    aliases: {},
    routingRules: [],
    adapterMappings: []
  };
}

async function buildAgentSkillRuntimeRegistry(projectRoot: string): Promise<AgentSkillRuntimeRegistry> {
  const config = await readProjectConfig(projectRoot);
  return mergeAgentSkillRuntimeRegistry(config.agentRuntime ?? emptyAgentRuntimeConfig());
}

function mergeAgentSkillRuntimeRegistry(projectRuntime: ProjectAgentRuntimeConfig): AgentSkillRuntimeRegistry {
  const issues: ContractValidationIssue[] = [];
  const profiles = new Map<string, AgentProfileContract>();
  const skillCapabilities = new Map<string, SkillCapabilityContract>();
  const capabilitySources = new Map<string, CapabilitySourceCatalogEntry>();
  const registrySources: RuntimeRegistryEntrySource[] = [];

  for (const profile of BUILT_IN_AGENT_PROFILES) {
    profiles.set(profile.id, profile);
    registrySources.push({ id: profile.id, kind: 'profile', origin: 'built_in', sourceId: null, quarantineRequired: false });
  }
  for (const capability of BUILT_IN_SKILL_CAPABILITIES) {
    skillCapabilities.set(capability.id, capability);
    registrySources.push({ id: capability.id, kind: 'skill_capability', origin: 'built_in', sourceId: null, quarantineRequired: false });
  }
  for (const source of BUILT_IN_CAPABILITY_SOURCES) {
    capabilitySources.set(source.id, source);
    registrySources.push({ id: source.id, kind: 'capability_source', origin: 'built_in', sourceId: source.id, quarantineRequired: source.quarantineRequired });
  }

  for (const source of projectRuntime.capabilitySources) {
    if (capabilitySources.has(source.id)) {
      issues.push(contractIssue(`agent_runtime.capability_sources.${source.id}`, 'Capability source id duplicates an existing source.', 'Use a project-specific id; Phase 6.3 does not allow overriding built-ins.'));
      continue;
    }
    capabilitySources.set(source.id, source);
    registrySources.push({ id: source.id, kind: 'capability_source', origin: 'project_config', sourceId: source.id, quarantineRequired: source.quarantineRequired });
  }

  for (const capability of projectRuntime.skillCapabilities) {
    if (skillCapabilities.has(capability.id)) {
      issues.push(contractIssue(`agent_runtime.skill_capabilities.${capability.id}`, 'Skill capability id duplicates an existing capability.', 'Use a project-specific id; Phase 6.3 does not allow overriding built-ins.'));
      continue;
    }
    skillCapabilities.set(capability.id, capability);
    const source = capabilitySources.get(capability.sourceRef);
    if (!source) {
      issues.push(contractIssue(`agent_runtime.skill_capabilities.${capability.id}.source_ref`, `Skill capability references unknown source ${capability.sourceRef || '<empty>'}.`, 'Declare capability_sources entry first, or point source_ref at an existing capability source id.'));
    }
    registrySources.push({ id: capability.id, kind: 'skill_capability', origin: 'project_config', sourceId: source?.id ?? (capability.sourceRef || null), quarantineRequired: source?.quarantineRequired ?? false });
  }

  for (const profile of projectRuntime.profiles) {
    if (profiles.has(profile.id)) {
      issues.push(contractIssue(`agent_runtime.profiles.${profile.id}`, 'Agent profile id duplicates an existing profile.', 'Use a project-specific id; Phase 6.3 does not allow overriding built-ins.'));
      continue;
    }
    profiles.set(profile.id, profile);
    registrySources.push({ id: profile.id, kind: 'profile', origin: 'project_config', sourceId: null, quarantineRequired: false });
  }

  return {
    profiles: [...profiles.values()].sort((left, right) => left.id.localeCompare(right.id)),
    skillCapabilities: [...skillCapabilities.values()].sort((left, right) => left.id.localeCompare(right.id)),
    capabilitySources: [...capabilitySources.values()].sort((left, right) => left.id.localeCompare(right.id)),
    registrySources: [...registrySources].sort((left, right) => `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`)),
    aliases: { ...projectRuntime.aliases },
    routingRules: [...projectRuntime.routingRules],
    adapterMappings: [...projectRuntime.adapterMappings],
    issues
  };
}

function registrySourceFor(registry: AgentSkillRuntimeRegistry, kind: RuntimeRegistryEntrySource['kind'], id: string): RuntimeRegistryEntrySource | null {
  return registry.registrySources.find((source) => source.kind === kind && source.id === id) ?? null;
}

const BUILT_IN_MODEL_POLICIES: ModelPolicyContract[] = [
  { id: 'balanced', category: 'default', fallbackPolicy: 'use host default fallback', hostProjection: 'Project the SDD profile and risk ceiling; host selects configured model.' },
  { id: 'reasoning', category: 'planning_review', fallbackPolicy: 'prefer stronger reasoning model, fall back to host default', hostProjection: 'Use for planning, architecture, review, routing and synthesis tasks.' },
  { id: 'security_review', category: 'security', fallbackPolicy: 'prefer security-capable review model, block if host policy forbids security research', hostProjection: 'Authorized defensive security review only; non-destructive evidence required.' }
 ];

const BUILT_IN_HOST_ADAPTER_CONTRACT: HostAdapterContract = {
  version: HOST_ADAPTER_CONTRACT_VERSION,
  id: 'claude-code-host-adapter',
  host: 'Claude Code / future host adapter',
  responsibilities: ['project SDD router decisions to host subagents, skills, MCPs and shell tools', 'return host session/task id, status, output, artifacts and tool summary', 'record host output as provenance'],
  forbiddenAuthority: ['task lifecycle truth', 'completion state', 'risk gate authority', 'sync-back authority', 'required artifact policy'],
  projections: ['short profile prompt projection', 'tool permission summary', 'model policy category', 'required evidence targets']
};

const BUILT_IN_EVIDENCE_INGESTION_CONTRACT: EvidenceIngestionContract = {
  version: EVIDENCE_INGESTION_CONTRACT_VERSION,
  sourceOutputs: ['subagent summary', 'command output', 'browser snapshot', 'MCP result', 'team message', 'blocked host execution'],
  evidenceTargets: ['sdd-result-v1', 'AgentExecutionRecord', 'TeamSessionRecord', 'TeamMessageRecord', 'implementation artifact', 'review artifact', 'validation artifact', 'security findings artifact'],
  canonicalTruth: 'SDD artifacts, run state/events, verify and doctor decide completion state.',
  forbiddenTruthSources: ['host session status alone', 'tmux pane state', 'external prompt summary alone', 'MCP output without SDD evidence mapping']
};

const BUILT_IN_DELEGATION_WAVES: DelegationWavePolicy[] = [
  { id: 'hyperplan', waveKind: 'hyperplan', memberProfiles: ['architect', 'reviewer', 'security', 'validator', 'researcher'], requiredArtifacts: ['plan-risk artifact'], fileOwnershipRequired: false, mergeGate: 'implementation blocks while hard plan gaps remain' },
  { id: 'security_research', waveKind: 'security_research', memberProfiles: ['security', 'security', 'researcher', 'reviewer', 'validator'], requiredArtifacts: ['security findings artifact', 'remediation recommendation'], fileOwnershipRequired: false, mergeGate: 'authorized non-destructive findings are severity-calibrated before implementation' },
  { id: 'implementation_review', waveKind: 'implementation_review', memberProfiles: ['reviewer', 'architect', 'security'], requiredArtifacts: ['review artifact'], fileOwnershipRequired: true, mergeGate: 'file ownership conflicts and review gaps block merge' },
  { id: 'validation', waveKind: 'validation', memberProfiles: ['validator', 'reviewer'], requiredArtifacts: ['validation artifact'], fileOwnershipRequired: false, mergeGate: 'acceptance evidence is required before verify PASS' }
 ];

const QUERY_STATUS_SURFACES: QueryStatusSurface[] = [
  {
    id: 'status',
    command: 'sdd status --branch <branch>',
    responsibility: 'Show current SDD route position and one recommended next action.',
    includes: ['branch/source context', 'document/task counts', 'blocking gaps', 'latest run summary', 'recommended next command'],
    excludes: ['full doctor audit', 'full event log', 'artifact body drill-down'],
    nextActionRule: 'Always end with the next command or maintenance action.'
  },
  {
    id: 'doctor',
    command: 'sdd doctor [--latest-only|--all-runs]',
    responsibility: 'Audit project health, generated entry drift, and run evidence consistency.',
    includes: ['config health', 'managed asset drift categories', 'run evidence health', 'contract visibility'],
    excludes: ['workflow next action selection', 'full artifact body dump'],
    nextActionRule: 'Return maintenance action only when a health check fails or warns.'
  },
  {
    id: 'run_inspect',
    command: 'sdd run inspect <run_id>',
    responsibility: 'Inspect one run as execution evidence.',
    includes: ['run state', 'recent events', 'artifacts', 'artifact ingestions', 'validation', 'sync-back proposal', 'task-run evidence'],
    excludes: ['project-wide health audit', 'branch route recommendation'],
    nextActionRule: 'Point to evidence inspection, verify, or sync-back based on run state.'
  },
  {
    id: 'debug',
    command: 'sdd run index inspect|query and focused inspect commands',
    responsibility: 'Provide drill-down views for maintainers without becoming the default user path.',
    includes: ['derived indexes', 'contract internals', 'focused diagnostics'],
    excludes: ['main route summary', 'automatic repair'],
    nextActionRule: 'Use only after status, doctor, or run inspect identifies a specific drill-down target.'
  }
];

const SKILL_AGENT_EVAL_CORPUS = [
  'docs/research/real-project-trial-evaluation-20260507.md'
];

const SKILL_AGENT_EVAL_DIMENSIONS: SkillAgentEvalDimension[] = [
  { id: 'novel_judgment', expectation: 'Evaluator identifies what SDD added beyond restating the source requirement.', baselineFinding: 'ERP trial mostly normalized source text and missed independent state-machine judgment.', passThreshold: 7 },
  { id: 'risk_identification', expectation: 'State-machine, concurrency, database, SQL, API/schema, CI/build, and external unknown risks are extracted without relying on manual flags.', baselineFinding: 'ERP state-flow and concurrency hard gates were downgraded to compact before Phase 5.1 risk extraction.', passThreshold: 8 },
  { id: 'task_slicing', expectation: 'Large state-flow fixes split into reviewable slices while preserving file-overlap and serial execution constraints.', baselineFinding: 'ERP trial compressed four risk boundaries into one task, limiting review and validation visibility.', passThreshold: 7 },
  { id: 'agent_evidence', expectation: 'Scout, planner, reviewer, debugger, or validator participation is visible through bounded artifacts or explicit non-use rationale.', baselineFinding: 'ERP trial did not show visible agent artifacts or role-specific evidence.', passThreshold: 7 },
  { id: 'output_concision', expectation: 'User-visible output is delta-first, evidence-backed, and avoids repeated status boilerplate.', baselineFinding: 'ERP trial repeated branch/status/next-step boilerplate and obscured useful deltas.', passThreshold: 7 },
  { id: 'verification_executability', expectation: 'Validation commands and acceptance checks are executable or state why they cannot run.', baselineFinding: 'ERP trial listed Maven compile but did not map each state-flow acceptance item to executable evidence.', passThreshold: 8 },
  { id: 'autonomy_correctness', expectation: 'Autonomy ceiling matches hard gates, shared-state risk, and confirmation requirements.', baselineFinding: 'ERP trial treated high-risk state/concurrency work as compact instead of full.', passThreshold: 8 },
  { id: 'agent_fit', expectation: 'Task metadata names which agent roles fit each slice and when they must stop.', baselineFinding: 'ERP trial task metadata had no agent-fit evidence despite role registry availability.', passThreshold: 7 },
  { id: 'verification_availability', expectation: 'Task metadata records unit, build, CLI, manual, or unavailable verification sources.', baselineFinding: 'ERP trial had one compile command but no per-slice verification availability.', passThreshold: 7 },
  { id: 'gap_closure', expectation: 'Blocking gaps route to checklist, eval assertion, doctor check, or generated-entry guidance instead of silent completion.', baselineFinding: 'ERP trial surfaced few actionable gap-closure paths beyond generic next commands.', passThreshold: 7 }
];

const HARNESS_LEARNING_SINKS: HarnessLearningSink[] = [
  { id: 'project_context_pack', output: 'Durable project collaboration and positioning context.', boundary: 'May summarize stable strategy, but must not duplicate live specs, runs, task status, or generated command content.' },
  { id: 'risk_vocabulary', output: 'Keywords and mappings for lifecycle risk extraction.', boundary: 'May add deterministic vocabulary; must not bypass lifecycle hard gates or user confirmation.' },
  { id: 'checklist', output: 'Human-reviewable checklist for recurring failure classes.', boundary: 'May guide future runs; must not claim validation without runtime evidence.' },
  { id: 'doctor_check', output: 'A new explicit health/audit check.', boundary: 'May inspect facts; must not auto-repair or mutate project state.' },
  { id: 'eval_assertion', output: 'Regression assertion against a known trial failure.', boundary: 'May fail tests or eval; must not silently rewrite runtime behavior.' },
  { id: 'generated_entry_guidance', output: 'Managed command or skill wording update.', boundary: 'Must remain sdd-managed and refresh through update rather than user-file overwrite.' }
];

const HARNESS_LEARNING_FORBIDDEN_OUTPUTS = ['self-modifying runtime', 'hidden background automation', 'unapproved sync-back apply', 'replacement of .sdd/project.yml/specs/runs/artifacts as source of truth'];

const PROJECT_CONTEXT_PACK: ProjectContextPackContract = {
  version: PROJECT_CONTEXT_PACK_CONTRACT_VERSION,
  entryPoint: 'context/memory/MEMORY.md',
  durableContext: [
    'stable product positioning and phase direction',
    'collaboration preferences that affect future SDD work',
    'external reference pointers that remain useful across sessions'
  ],
  runtimeSourcesOfTruth: [
    '.sdd/project.yml for project configuration',
    'specs/<branch>/spec.md, plan.md, and tasks.md for semantic state',
    '.sdd/runs/<run_id>/state.json and events.jsonl for runtime execution facts',
    '.sdd/runs/<run_id>/artifacts/*.md for agent and validation evidence'
  ],
  boundaries: [
    'Context pack may prime future sessions but cannot mark tasks complete.',
    'Context pack may describe repeated failures but cannot replace eval assertions or doctor checks.',
    'Context pack must be verified against current files before acting on file, function, or flag claims.'
  ]
};

export async function listWorkflowGates(projectRoot: string): Promise<WorkflowGateRegistry> {
  await readProjectConfig(projectRoot);
  return {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    workflows: [...BUILT_IN_WORKFLOW_GATES].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectWorkflowGate(projectRoot: string, workflowId: string): Promise<WorkflowGateContract | null> {
  const registry = await listWorkflowGates(projectRoot);
  return registry.workflows.find((workflow) => workflow.id === workflowId) ?? null;
}

export async function validateWorkflowGates(projectRoot: string): Promise<WorkflowGateValidation> {
  const registry = await listWorkflowGates(projectRoot);
  const agentRegistry = await listAgentRegistry(projectRoot);
  const agentIds = new Set(agentRegistry.agents.map((agent) => agent.id));
  const issues = registry.workflows.flatMap((workflow) => validateWorkflowGate(workflow, agentIds));
  return {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    valid: issues.length === 0,
    workflows: registry.workflows,
    issues
  };
}

export async function listAgentRegistry(projectRoot: string): Promise<AgentRegistry> {
  await readProjectConfig(projectRoot);
  return {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    agents: [...BUILT_IN_AGENT_REGISTRY].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectAgentRegistryEntry(projectRoot: string, agentId: string): Promise<AgentRegistryEntry | null> {
  const registry = await listAgentRegistry(projectRoot);
  return registry.agents.find((agent) => agent.id === agentId) ?? null;
}

export async function validateAgentRegistry(projectRoot: string): Promise<AgentRegistryValidation> {
  const registry = await listAgentRegistry(projectRoot);
  const issues = registry.agents.flatMap(validateAgentRegistryEntry);
  return {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    valid: issues.length === 0,
    agents: registry.agents,
    issues
  };
}

export async function inspectAgentSkillTeamRuntime(projectRoot: string): Promise<AgentSkillTeamRuntimeInspection> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  return {
    version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
    profiles: registry.profiles,
    skillCapabilities: registry.skillCapabilities,
    capabilitySources: registry.capabilitySources,
    hostAdapter: BUILT_IN_HOST_ADAPTER_CONTRACT,
    evidenceIngestion: BUILT_IN_EVIDENCE_INGESTION_CONTRACT,
    teamMode: buildTeamModePolicy({ activation: 'off' }),
    reusePolicy: 'reuse_direct native host/MCP capabilities first; external prompt packs are quarantined material sources and projected only as structured metadata.',
    registrySources: registry.registrySources,
    aliases: registry.aliases,
    routingRules: registry.routingRules,
    adapterMappings: registry.adapterMappings
  };
}

export async function validateAgentSkillTeamRuntime(projectRoot: string): Promise<AgentSkillTeamRuntimeValidation> {
  const inspection = await inspectAgentSkillTeamRuntime(projectRoot);
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  const issues = [...registry.issues, ...validateAgentSkillTeamRuntimeInspection(inspection)];
  return {
    version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
    valid: issues.length === 0,
    inspection,
    issues
  };
}

export async function listSkillCapabilities(projectRoot: string): Promise<SkillCapabilityRegistry> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  return {
    version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
    capabilities: registry.skillCapabilities,
    registrySources: registry.registrySources.filter((source) => source.kind === 'skill_capability')
  };
}

export async function inspectSkillCapability(projectRoot: string, capabilityId: string): Promise<SkillCapabilityContract | null> {
  const registry = await listSkillCapabilities(projectRoot);
  return registry.capabilities.find((capability) => capability.id === capabilityId) ?? null;
}

export async function listCapabilitySources(projectRoot: string): Promise<CapabilitySourceCatalog> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  return {
    version: CAPABILITY_SOURCE_CATALOG_VERSION,
    sources: registry.capabilitySources,
    registrySources: registry.registrySources.filter((source) => source.kind === 'capability_source')
  };
}

export async function inspectCapabilitySource(projectRoot: string, sourceId: string): Promise<CapabilitySourceCatalogEntry | null> {
  const catalog = await listCapabilitySources(projectRoot);
  return catalog.sources.find((source) => source.id === sourceId) ?? null;
}

export async function inspectExternalAgentPackImport(projectRoot: string, sourceId: string): Promise<ExternalAgentPackImportInspection> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  const source = registry.capabilitySources.find((entry) => entry.id === sourceId);
  if (!source) {
    return {
      version: EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION,
      sourceId,
      status: 'denied',
      checks: [{ check: 'source_catalog', status: 'fail', evidence: 'Source id is not present in CapabilitySourceCatalog.' }],
      mappingResult: 'no SDD mapping available',
      allowedProfiles: [],
      riskCeiling: 'research_before_implementation',
      reason: 'Unknown external source cannot be routed.'
    };
  }
  if (source.reuseDecision === 'avoid') {
    return {
      version: EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION,
      sourceId,
      status: 'denied',
      checks: [{ check: 'reuse_decision', status: 'fail', evidence: `${source.id} is marked avoid for Phase 6 core runtime.` }],
      mappingResult: 'future adapter only',
      allowedProfiles: [],
      riskCeiling: 'research_before_implementation',
      reason: source.rationale
    };
  }
  const checks: ExternalAgentPackImportCheck[] = source.quarantineRequired
    ? [
      { check: 'license_source_attribution', status: 'not_run', evidence: 'Quarantine inspection must verify source and license before import.' },
      { check: 'hidden_unicode_scan', status: 'not_run', evidence: 'External material has not been scanned for hidden Unicode.' },
      { check: 'secret_scan', status: 'not_run', evidence: 'External material has not been scanned for secrets.' },
      { check: 'dangerous_command_scan', status: 'not_run', evidence: 'External material has not been scanned for dangerous commands.' },
      { check: 'sdd_frontmatter_mapping', status: 'not_run', evidence: 'External material has not been mapped to SDD capability/profile fields.' }
    ]
    : [
      { check: 'source_catalog', status: 'pass', evidence: `${source.id} is cataloged as ${source.reuseDecision}.` },
      { check: 'quarantine_required', status: 'pass', evidence: 'This source is a native capability or mechanism reference, not an imported prompt pack.' }
    ];
  return {
    version: EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION,
    sourceId,
    status: source.quarantineRequired ? 'quarantined' : 'approved',
    checks,
    mappingResult: source.quarantineRequired ? 'pending structured metadata mapping' : 'available through host adapter or mechanism reference',
    allowedProfiles: source.quarantineRequired ? ['domain_expert', 'researcher'] : ['researcher', 'architect', 'orchestrator'],
    riskCeiling: source.quarantineRequired ? 'research_before_implementation' : 'compact_boundary_only',
    reason: source.quarantineRequired ? 'External material is not routable until quarantine checks pass.' : source.rationale
  };
}

export async function inspectTeamModePolicy(projectRoot: string, options: { taskId?: string; branch?: string; enabled?: boolean; teamModeActivation?: TeamModeActivation } = {}): Promise<TeamModePolicy> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  const activation = resolveTeamModeActivation({ teamModeEnabled: options.enabled, teamModeActivation: options.teamModeActivation }, options.taskId ? 'auto' : 'off');
  if (!options.taskId) {
    return buildTeamModePolicy({ activation });
  }
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  const task = inspected.task;
  const blockingGap = inspected.gaps.find((gap) => gap.severity === 'blocking');
  const matchedRules = task && !blockingGap ? matchRoutingRules(task, registry) : [];
  const allowedProfiles = task && !blockingGap ? deriveAllowedProfiles(task, registry, matchedRules).profiles : [];
  const category = task ? routeCategory(task, blockingGap, allowedProfiles, matchedRules) : 'blocked';
  const autonomyCeiling = task ? taskAutonomyCeiling(task) : 'research_before_implementation';
  return buildTeamModePolicy({ activation, task, category, risk: task?.risk ?? [], autonomyCeiling, blockedReason: blockingGap?.message ?? null });
}

export async function routeSddTask(projectRoot: string, options: { taskId: string; branch?: string; teamModeEnabled?: boolean; teamModeActivation?: TeamModeActivation }): Promise<AgentRouterDecision> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  const task = inspected.task;
  const blockingGap = inspected.gaps.find((gap) => gap.severity === 'blocking');
  const matchedRules = task && !blockingGap ? matchRoutingRules(task, registry) : [];
  const profileSelection = task && !blockingGap ? deriveAllowedProfiles(task, registry, matchedRules) : { profiles: [], resolvedAliases: [] };
  const allowedProfiles = profileSelection.profiles;
  const recommendedProfile = task && !blockingGap ? chooseRecommendedProfile(task, allowedProfiles, registry, matchedRules) : null;
  const category = task ? routeCategory(task, blockingGap, allowedProfiles, matchedRules) : 'blocked';
  const autonomyCeiling = task ? taskAutonomyCeiling(task) : 'research_before_implementation';
  const requiredCapabilities = task && recommendedProfile ? selectRequiredSkillCapabilities(task, recommendedProfile, registry, matchedRules) : [];
  const sourceCapability = requiredCapabilities[0] ?? null;
  const sourceCapabilityContract = sourceCapability ? registry.skillCapabilities.find((capability) => capability.id === sourceCapability) ?? null : null;
  const blockedReason = !task ? `Task ${options.taskId} was not found.` : blockingGap?.message ?? null;
  const routedCategory = blockedReason ? 'blocked' : category;
  const registrySources = routeRegistrySources(registry, recommendedProfile, requiredCapabilities);
  const adapterMapping = recommendedProfile ? adapterMappingForProfile(registry, recommendedProfile) : null;
  return {
    version: AGENT_ROUTER_CONTRACT_VERSION,
    taskId: options.taskId,
    branch,
    category: routedCategory,
    recommendedProfile,
    allowedProfiles,
    rejectedProfiles: buildRejectedProfiles(allowedProfiles, blockedReason, registry),
    requiredCapabilities,
    sourceCapability,
    reuseDecision: sourceCapabilityContract?.reuseDecision ?? null,
    toolPermission: task && recommendedProfile ? buildToolPermissionSpec(task, recommendedProfile, autonomyCeiling, registry) : null,
    modelPolicy: modelPolicyForProfile(recommendedProfile, registry),
    teamMode: buildTeamModePolicy({
      activation: resolveTeamModeActivation(options, 'auto'),
      task: task ?? null,
      category: routedCategory,
      risk: task?.risk ?? [],
      autonomyCeiling,
      blockedReason
    }),
    autonomyCeiling,
    requiredArtifacts: task?.requiredArtifacts ?? [],
    blockedReason,
    nextAction: blockedReason ? `Fix task gaps before routing ${options.taskId}.` : recommendedProfile ? `Use ${recommendedProfile} with ${requiredCapabilities.join(',') || 'no extra capability'} and preserve required artifacts before verify.` : `Declare a routable profile before routing ${options.taskId}.`,
    registrySources,
    resolvedAliases: profileSelection.resolvedAliases,
    routingRuleHits: matchedRules.map((rule) => rule.id),
    quarantineWarnings: quarantineWarningsForSources(registrySources),
    adapterMapping
  };
}

export async function inspectQueryStatusContract(projectRoot: string): Promise<QueryStatusContract> {
  await readProjectConfig(projectRoot);
  return {
    version: QUERY_STATUS_CONTRACT_VERSION,
    sourceDocument: 'docs/architecture/command-information-architecture.md',
    surfaces: [...QUERY_STATUS_SURFACES]
  };
}

export async function inspectSkillAgentEvalContract(projectRoot: string): Promise<SkillAgentEvalContract> {
  await readProjectConfig(projectRoot);
  return {
    version: SKILL_AGENT_EVAL_CONTRACT_VERSION,
    corpus: [...SKILL_AGENT_EVAL_CORPUS],
    sourceReport: 'docs/research/real-project-trial-evaluation-20260507.md',
    dimensions: [...SKILL_AGENT_EVAL_DIMENSIONS],
    regressionAssertions: [
      'ERP state-flow/concurrency work must not route to compact when risk evidence is present.',
      'Generated tasks must expose agent_fit and verification_availability when agent registry and task graph metadata exist.',
      'Output should state evidence deltas before repeating route/status boilerplate.'
    ]
  };
}

export async function validateSkillAgentEvalContract(projectRoot: string): Promise<SkillAgentEvalValidation> {
  const contract = await inspectSkillAgentEvalContract(projectRoot);
  const issues: ContractValidationIssue[] = [];
  if (await shouldValidatePlatformTrialCorpus(projectRoot)) {
    for (const corpusPath of [...contract.corpus, contract.sourceReport]) {
      if (!await exists(path.join(projectRoot, corpusPath))) {
        issues.push(contractIssue('skillAgentEval.corpus', `Eval source is missing: ${corpusPath}.`, 'Restore the ERP trial corpus before treating Phase 5.5 eval as repeatable.'));
      }
    }
  }
  const requiredDimensions: SkillAgentEvalDimensionId[] = ['novel_judgment', 'risk_identification', 'task_slicing', 'agent_evidence', 'output_concision', 'verification_executability', 'autonomy_correctness', 'agent_fit', 'verification_availability', 'gap_closure'];
  for (const dimension of requiredDimensions) {
    if (!contract.dimensions.some((candidate) => candidate.id === dimension)) {
      issues.push(contractIssue('skillAgentEval.dimensions', `Missing eval dimension: ${dimension}.`, 'Add the missing Phase 5.5 eval dimension.'));
    }
  }
  for (const dimension of contract.dimensions) {
    if (dimension.passThreshold < 1 || dimension.passThreshold > 10) {
      issues.push(contractIssue(`${dimension.id}.passThreshold`, 'Eval pass threshold must be a 1-10 score.', 'Use a bounded 1-10 threshold.'));
    }
  }
  if (contract.regressionAssertions.length === 0) {
    issues.push(contractIssue('skillAgentEval.regressionAssertions', 'Eval contract has no regression assertions.', 'Add assertions for known ERP trial failures.'));
  }
  return { version: SKILL_AGENT_EVAL_CONTRACT_VERSION, valid: issues.length === 0, contract, issues };
}

export async function inspectHarnessLearningContract(projectRoot: string): Promise<HarnessLearningContract> {
  await readProjectConfig(projectRoot);
  return {
    version: HARNESS_LEARNING_CONTRACT_VERSION,
    sourceTrial: 'docs/research/real-project-trial-evaluation-20260507.md',
    allowedSinks: [...HARNESS_LEARNING_SINKS],
    forbiddenOutputs: [...HARNESS_LEARNING_FORBIDDEN_OUTPUTS],
    promotionRule: 'Repeated failures may become durable guidance only through reviewed context-pack, vocabulary, checklist, doctor, eval, or managed-entry changes.'
  };
}

export async function validateHarnessLearningContract(projectRoot: string): Promise<HarnessLearningValidation> {
  const contract = await inspectHarnessLearningContract(projectRoot);
  const issues: ContractValidationIssue[] = [];
  const requiredSinks: HarnessLearningSinkId[] = ['project_context_pack', 'risk_vocabulary', 'checklist', 'doctor_check', 'eval_assertion', 'generated_entry_guidance'];
  if (await shouldValidatePlatformTrialCorpus(projectRoot) && !await exists(path.join(projectRoot, contract.sourceTrial))) {
    issues.push(contractIssue('harnessLearning.sourceTrial', `Learning source is missing: ${contract.sourceTrial}.`, 'Restore the trial evaluation report before promoting learning outputs.'));
  }
  for (const sink of requiredSinks) {
    if (!contract.allowedSinks.some((candidate) => candidate.id === sink)) {
      issues.push(contractIssue('harnessLearning.allowedSinks', `Missing learning sink: ${sink}.`, 'Add the missing allowed learning sink.'));
    }
  }
  if (!contract.forbiddenOutputs.includes('self-modifying runtime')) {
    issues.push(contractIssue('harnessLearning.forbiddenOutputs', 'Learning contract does not forbid self-modifying runtime.', 'Declare self-modifying runtime out of scope.'));
  }
  return { version: HARNESS_LEARNING_CONTRACT_VERSION, valid: issues.length === 0, contract, issues };
}

async function shouldValidatePlatformTrialCorpus(projectRoot: string): Promise<boolean> {
  return shouldValidatePlatformProjectAssets(projectRoot);
}

async function shouldValidatePlatformProjectAssets(projectRoot: string): Promise<boolean> {
  try {
    const config = await readProjectConfig(projectRoot);
    return config.project.name === 'sdd-agent-platform';
  } catch {
    return false;
  }
}

export async function inspectProjectContextPackContract(projectRoot: string): Promise<ProjectContextPackContract> {
  await readProjectConfig(projectRoot);
  return {
    ...PROJECT_CONTEXT_PACK,
    durableContext: [...PROJECT_CONTEXT_PACK.durableContext],
    runtimeSourcesOfTruth: [...PROJECT_CONTEXT_PACK.runtimeSourcesOfTruth],
    boundaries: [...PROJECT_CONTEXT_PACK.boundaries]
  };
}

export async function validateProjectContextPackContract(projectRoot: string): Promise<ProjectContextPackValidation> {
  const contract = await inspectProjectContextPackContract(projectRoot);
  const issues: ContractValidationIssue[] = [];
  if (await shouldValidatePlatformProjectAssets(projectRoot) && !await exists(path.join(projectRoot, contract.entryPoint))) {
    issues.push(contractIssue('projectContextPack.entryPoint', `Context pack entry point is missing: ${contract.entryPoint}.`, 'Restore context/memory/MEMORY.md or update the context pack entry point.'));
  }
  if (!contract.runtimeSourcesOfTruth.some((source) => source.includes('.sdd/project.yml')) || !contract.runtimeSourcesOfTruth.some((source) => source.includes('specs/<branch>')) || !contract.runtimeSourcesOfTruth.some((source) => source.includes('.sdd/runs'))) {
    issues.push(contractIssue('projectContextPack.runtimeSourcesOfTruth', 'Context pack does not name the structured runtime sources of truth.', 'Declare .sdd/project.yml, specs/<branch>, and .sdd/runs as runtime sources of truth.'));
  }
  if (!contract.boundaries.some((boundary) => boundary.includes('cannot mark tasks complete'))) {
    issues.push(contractIssue('projectContextPack.boundaries', 'Context pack boundary does not prevent runtime state mutation.', 'Declare that context memory cannot mark tasks complete or replace runtime evidence.'));
  }
  return { version: PROJECT_CONTEXT_PACK_CONTRACT_VERSION, valid: issues.length === 0, contract, issues };
}

export async function validateQueryStatusContract(projectRoot: string): Promise<QueryStatusValidation> {
  const contract = await inspectQueryStatusContract(projectRoot);
  const issues = contract.surfaces.flatMap(validateQueryStatusSurface);
  return {
    version: QUERY_STATUS_CONTRACT_VERSION,
    valid: issues.length === 0,
    surfaces: contract.surfaces,
    issues
  };
}
function validateQueryStatusSurface(surface: QueryStatusSurface): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (surface.command.trim().length === 0) {
    issues.push(contractIssue(`${surface.id}.command`, 'Query surface has no command.', 'Declare the CLI command that owns this query responsibility.'));
  }
  if (surface.responsibility.trim().length === 0) {
    issues.push(contractIssue(`${surface.id}.responsibility`, 'Query surface has no responsibility boundary.', 'Declare what this query surface is responsible for.'));
  }
  if (surface.includes.length === 0) {
    issues.push(contractIssue(`${surface.id}.includes`, 'Query surface has no included evidence.', 'Declare what evidence this surface must include.'));
  }
  if (surface.excludes.length === 0) {
    issues.push(contractIssue(`${surface.id}.excludes`, 'Query surface has no exclusion boundary.', 'Declare what belongs to a different query surface.'));
  }
  if (surface.nextActionRule.trim().length === 0) {
    issues.push(contractIssue(`${surface.id}.nextActionRule`, 'Query surface has no next-action rule.', 'Declare how this surface should route the user after inspection.'));
  }
  return issues;
}

function validateWorkflowGate(workflow: WorkflowGateContract, agentIds: Set<string>): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (workflow.requiredInputs.length === 0) {
    issues.push(contractIssue(`${workflow.id}.requiredInputs`, 'Workflow gate has no required inputs.', 'Declare required inputs before this workflow can run.'));
  }
  if (workflow.requiredArtifacts.length === 0) {
    issues.push(contractIssue(`${workflow.id}.requiredArtifacts`, 'Workflow gate has no required artifacts.', 'Declare required artifacts for workflow evidence.'));
  }
  for (const agentId of workflow.allowedAgents) {
    if (!agentIds.has(agentId)) {
      issues.push(contractIssue(`${workflow.id}.allowedAgents`, `Workflow references unknown agent ${agentId}.`, 'Add the agent to AgentRegistryContract or remove it from the workflow.'));
    }
  }
  return issues;
}

function validateAgentRegistryEntry(agent: AgentRegistryEntry): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (agent.allowedStages.length === 0) {
    issues.push(contractIssue(`${agent.id}.allowedStages`, 'Agent has no allowed stages.', 'Declare where the agent may participate.'));
  }
  if (agent.readBoundary.length === 0 || agent.writeBoundary.length === 0) {
    issues.push(contractIssue(`${agent.id}.boundary`, 'Agent read/write boundary is incomplete.', 'Declare read and write boundaries.'));
  }
  if (agent.toolAllowlist.length === 0) {
    issues.push(contractIssue(`${agent.id}.toolAllowlist`, 'Agent has no tool allowlist.', 'Declare permitted tool categories.'));
  }
  return issues;
}

function validateAgentSkillTeamRuntimeInspection(inspection: AgentSkillTeamRuntimeInspection): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  const profileIds = new Set(inspection.profiles.map((profile) => profile.id));
  const capabilityIds = new Set(inspection.skillCapabilities.map((capability) => capability.id));
  const sourceIds = new Set(inspection.capabilitySources.map((source) => source.id));
  const modelPolicyIds = new Set(BUILT_IN_MODEL_POLICIES.map((policy) => policy.id));
  for (const requiredProfile of ['planner', 'architect', 'implementer', 'reviewer', 'validator', 'researcher', 'orchestrator', 'security', 'domain_expert'] as AgentProfileId[]) {
    if (!profileIds.has(requiredProfile)) {
      issues.push(contractIssue(`profiles.${requiredProfile}`, 'Required Phase 6 profile is missing.', 'Add the profile to AgentProfileContract.'));
    }
  }
  for (const source of inspection.capabilitySources) {
    if (!source.id.trim()) {
      issues.push(contractIssue('capabilitySources.id', 'Capability source has no id.', 'Declare a stable capability source id.'));
    }
    if (!source.sourceRef.trim()) {
      issues.push(contractIssue(`${source.id}.sourceRef`, 'Capability source has no source reference.', 'Declare the source_ref before runtime inspection can cite it.'));
    }
    if (!source.attribution.trim()) {
      issues.push(contractIssue(`${source.id}.attribution`, 'Capability source has no attribution.', 'Declare attribution before external material can enter the runtime registry.'));
    }
    if (source.quarantineRequired && source.reuseDecision === 'reuse_direct') {
      issues.push(contractIssue(`${source.id}.reuseDecision`, 'Quarantined source cannot be reused directly.', 'Use adapt_via_host_adapter or borrow_mechanism until quarantine evidence promotes the source.'));
    }
    if (source.quarantineRequired && sourceDeclaresUnsafeAuthority(source)) {
      issues.push(contractIssue(`${source.id}.allowedUse`, 'Quarantined source requests prompt import, direct execution, or lifecycle authority.', 'Keep external material declarative and route only through validated profiles, capabilities, and adapter mappings.'));
    }
  }
  for (const capability of inspection.skillCapabilities) {
    const registrySource = inspectionRegistrySource(inspection, 'skill_capability', capability.id);
    if (!capability.id.trim()) {
      issues.push(contractIssue('skillCapabilities.id', 'Capability has no id.', 'Declare a stable capability id.'));
    }
    if (capability.allowedStages.length === 0) {
      issues.push(contractIssue(`${capability.id}.allowedStages`, 'Capability has no allowed stages.', 'Declare the SDD stages where this capability may be used.'));
    }
    if (!capability.sourceRef.trim()) {
      issues.push(contractIssue(`${capability.id}.sourceRef`, 'Capability has no source attribution.', 'Add source_ref before routing can cite this capability.'));
    }
    if (registrySource?.origin === 'project_config' && capability.evidenceType === 'none') {
      issues.push(contractIssue(`${capability.id}.evidenceType`, 'Project-declared capability has no evidence type.', 'Declare evidence_type so runtime results can be verified.'));
    }
    if (registrySource?.sourceId && !sourceIds.has(registrySource.sourceId)) {
      issues.push(contractIssue(`${capability.id}.sourceRef`, `Capability references missing source ${registrySource.sourceId}.`, 'Add the capability source or update the capability source_ref.'));
    }
  }
  for (const profile of inspection.profiles) {
    if (!profile.id.trim()) {
      issues.push(contractIssue('profiles.id', 'Profile has no id.', 'Declare a stable profile id.'));
    }
    if (profile.stageScope.length === 0 || profile.boundaries.length === 0) {
      issues.push(contractIssue(`${profile.id}.boundary`, 'Profile stage scope or boundary is incomplete.', 'Declare stage scope and execution boundaries.'));
    }
    if (profile.toolScope.length === 0) {
      issues.push(contractIssue(`${profile.id}.toolScope`, 'Profile has no tool scope.', 'Declare allowed tool groups before routing can project permissions.'));
    }
    if (profile.requiredArtifacts.length === 0) {
      issues.push(contractIssue(`${profile.id}.requiredArtifacts`, 'Profile has no required artifacts.', 'Declare the evidence artifacts expected from this profile.'));
    }
    if (!modelPolicyIds.has(profile.modelPolicyId)) {
      issues.push(contractIssue(`${profile.id}.modelPolicyId`, `Profile references unknown model policy ${profile.modelPolicyId}.`, 'Use a registered model policy id.'));
    }
    for (const capabilityId of profile.hostCapabilityRequirements) {
      if (!capabilityIds.has(capabilityId) && capabilityId !== 'claude_code.host_adapter') {
        issues.push(contractIssue(`${profile.id}.hostCapabilityRequirements`, `Profile references unknown capability ${capabilityId}.`, 'Add the capability or remove the requirement.'));
      }
    }
  }
  for (const [alias, target] of Object.entries(inspection.aliases ?? {})) {
    if (!alias.trim() || !target.trim()) {
      issues.push(contractIssue('agent_runtime.aliases', 'Alias declaration is incomplete.', 'Declare alias and target profile id.'));
      continue;
    }
    if (!inspectionProfileTokenResolves(target, profileIds)) {
      issues.push(contractIssue(`agent_runtime.aliases.${alias}`, `Alias points to unknown profile ${target}.`, 'Point aliases at a registered built-in or project-config profile.'));
    }
  }
  for (const rule of inspection.routingRules ?? []) {
    if (!rule.id.trim()) {
      issues.push(contractIssue('agent_runtime.routing_rules.id', 'Routing rule has no id.', 'Declare a stable routing rule id.'));
    }
    if (rule.when.keywords.length === 0 && rule.when.affectedFileGlobs.length === 0) {
      issues.push(contractIssue(`${rule.id}.when`, 'Routing rule has no match condition.', 'Declare keywords or affected_file_globs before the rule can influence routing.'));
    }
    if (!inspectionProfileTokenResolves(rule.preferProfile, profileIds)) {
      issues.push(contractIssue(`${rule.id}.preferProfile`, `Routing rule prefers unknown profile ${rule.preferProfile}.`, 'Add the profile or update prefer_profile.'));
    }
    for (const capabilityId of rule.requireCapabilities) {
      if (!capabilityIds.has(capabilityId)) {
        issues.push(contractIssue(`${rule.id}.requireCapabilities`, `Routing rule requires unknown capability ${capabilityId}.`, 'Add the capability or remove it from require_capabilities.'));
      }
    }
  }
  for (const mapping of inspection.adapterMappings ?? []) {
    if (!inspectionProfileTokenResolves(mapping.profile, profileIds)) {
      issues.push(contractIssue(`agent_runtime.adapter_mappings.${mapping.profile}`, `Adapter mapping references unknown profile ${mapping.profile}.`, 'Map adapters only to registered profiles.'));
    }
    if (!mapping.hostAdapter.trim() || !mapping.projection.trim() || !mapping.permissionPolicy.trim()) {
      issues.push(contractIssue(`agent_runtime.adapter_mappings.${mapping.profile}`, 'Adapter mapping is incomplete.', 'Declare host_adapter, projection, and permission_policy.'));
    }
  }
  if (inspection.teamMode.enabled) {
    issues.push(contractIssue('teamMode.enabled', 'Runtime inspection without task context must keep team-mode disabled.', 'Use task routing to select adaptive team-mode for a concrete task.'));
  }
  return issues;
}

function inspectionRegistrySource(inspection: AgentSkillTeamRuntimeInspection, kind: RuntimeRegistryEntrySource['kind'], id: string): RuntimeRegistryEntrySource | null {
  return inspection.registrySources?.find((source) => source.kind === kind && source.id === id) ?? null;
}

function inspectionProfileTokenResolves(value: string, profileIds: Set<AgentProfileId>): boolean {
  const normalized = normalizeAgentToken(value);
  if ([...profileIds].some((profileId) => normalizeAgentToken(profileId) === normalized)) {
    return true;
  }
  const aliasTarget = builtInProfileAliasTarget(value);
  return aliasTarget ? profileIds.has(aliasTarget) : false;
}

function sourceDeclaresUnsafeAuthority(source: CapabilitySourceCatalogEntry): boolean {
  return /prompt\s*(body|import)|direct\s+execution|execute\s+(third[- ]party|external)|run\s+(agent\s+)?pack|lifecycle\s+authority|completion\s+authority|unscoped\s+write|permission\s+escalation/i.test([source.allowedUse, source.rationale].join('\n'));
}

interface AgentRouteProfileSelection {
  profiles: AgentProfileId[];
  resolvedAliases: AgentRuntimeAliasResolution[];
}

interface AgentProfileTokenResolution {
  profile: AgentProfileId | null;
  alias: AgentRuntimeAliasResolution | null;
}

function deriveAllowedProfiles(task: SddTask, registry: AgentSkillRuntimeRegistry, matchedRules: AgentRuntimeRoutingRule[]): AgentRouteProfileSelection {
  const profiles = new Set<AgentProfileId>();
  const resolvedAliases: AgentRuntimeAliasResolution[] = [];
  for (const value of [...task.allowedAgents, ...task.agentFit]) {
    for (const token of value.split(/[\s,\/]+/).filter(Boolean)) {
      const resolution = resolveAgentProfileToken(token, registry);
      if (resolution.profile) {
        profiles.add(resolution.profile);
      }
      appendAliasResolution(resolvedAliases, resolution.alias);
    }
  }
  for (const rule of matchedRules) {
    const resolution = resolveAgentProfileToken(rule.preferProfile, registry);
    if (resolution.profile) {
      profiles.add(resolution.profile);
    }
    appendAliasResolution(resolvedAliases, resolution.alias);
  }
  if (profiles.size === 0) {
    for (const profile of fallbackProfilesForTask(task)) {
      addRegisteredProfile(profiles, profile, registry);
    }
  }
  return { profiles: [...profiles], resolvedAliases };
}

function toAgentProfileId(value: string, registry?: AgentSkillRuntimeRegistry): AgentProfileId | null {
  return resolveAgentProfileToken(value, registry).profile;
}

function resolveAgentProfileToken(value: string, registry?: AgentSkillRuntimeRegistry): AgentProfileTokenResolution {
  const directProfile = registry ? findRegisteredProfile(value, registry) : findBuiltInProfile(value);
  if (directProfile) {
    return { profile: directProfile.id, alias: null };
  }
  const builtInAlias = builtInProfileAliasTarget(value);
  const builtInProfile = builtInAlias ? registry ? findRegisteredProfile(builtInAlias, registry) : findBuiltInProfile(builtInAlias) : null;
  if (builtInProfile) {
    return { profile: builtInProfile.id, alias: { input: value, resolved: builtInProfile.id, source: 'built_in' } };
  }
  if (registry) {
    for (const [alias, target] of Object.entries(registry.aliases)) {
      if (normalizeAgentToken(alias) !== normalizeAgentToken(value)) {
        continue;
      }
      const aliasTarget = findRegisteredProfile(target, registry) ?? (builtInProfileAliasTarget(target) ? findRegisteredProfile(builtInProfileAliasTarget(target)!, registry) : null);
      if (aliasTarget) {
        return { profile: aliasTarget.id, alias: { input: value, resolved: aliasTarget.id, source: 'project_config' } };
      }
    }
  }
  return { profile: null, alias: null };
}

function appendAliasResolution(resolvedAliases: AgentRuntimeAliasResolution[], alias: AgentRuntimeAliasResolution | null): void {
  if (!alias) {
    return;
  }
  if (!resolvedAliases.some((candidate) => candidate.input === alias.input && candidate.resolved === alias.resolved && candidate.source === alias.source)) {
    resolvedAliases.push(alias);
  }
}

function findRegisteredProfile(value: string, registry: AgentSkillRuntimeRegistry): AgentProfileContract | null {
  const normalized = normalizeAgentToken(value);
  return registry.profiles.find((profile) => normalizeAgentToken(profile.id) === normalized) ?? null;
}

function findBuiltInProfile(value: string): AgentProfileContract | null {
  const normalized = normalizeAgentToken(value);
  return BUILT_IN_AGENT_PROFILES.find((profile) => normalizeAgentToken(profile.id) === normalized) ?? null;
}

function builtInProfileAliasTarget(value: string): AgentProfileId | null {
  const normalized = normalizeAgentToken(value);
  if (normalized === 'scout') {
    return 'researcher';
  }
  if (normalized === 'debugger') {
    return 'implementer';
  }
  if (normalized === 'spec_reviewer') {
    return 'reviewer';
  }
  if (normalized === 'domain') {
    return 'domain_expert';
  }
  return null;
}

function addRegisteredProfile(profiles: Set<AgentProfileId>, profileId: AgentProfileId, registry: AgentSkillRuntimeRegistry): void {
  const profile = findRegisteredProfile(profileId, registry);
  if (profile) {
    profiles.add(profile.id);
  }
}

function fallbackProfilesForTask(task: SddTask): AgentProfileId[] {
  if (hasSecurityRisk(task.risk)) {
    return ['security', 'reviewer'];
  }
  if (hasExternalUnknownRisk(task.risk)) {
    return ['researcher', 'architect'];
  }
  if (task.status === 'completed') {
    return ['validator', 'reviewer'];
  }
  return ['implementer', 'reviewer', 'validator'];
}

function chooseRecommendedProfile(task: SddTask, allowedProfiles: AgentProfileId[], registry: AgentSkillRuntimeRegistry, matchedRules: AgentRuntimeRoutingRule[]): AgentProfileId {
  if (hasSecurityRisk(task.risk)) {
    return allowedProfiles.includes('security') ? 'security' : allowedProfiles[0] ?? 'security';
  }
  if (hasExternalUnknownRisk(task.risk)) {
    return allowedProfiles.includes('researcher') ? 'researcher' : allowedProfiles[0] ?? 'researcher';
  }
  if (task.status === 'completed') {
    return allowedProfiles.includes('validator') ? 'validator' : allowedProfiles[0] ?? 'validator';
  }
  const preferredByRule = matchedRules.map((rule) => resolveAgentProfileToken(rule.preferProfile, registry).profile).find((profile): profile is AgentProfileId => Boolean(profile));
  if (preferredByRule && allowedProfiles.includes(preferredByRule)) {
    return preferredByRule;
  }
  if (allowedProfiles.includes('implementer')) {
    return 'implementer';
  }
  return allowedProfiles[0] ?? 'implementer';
}

function routeCategory(task: SddTask, blockingGap: SddTaskGap | undefined, allowedProfiles: AgentProfileId[] = [], matchedRules: AgentRuntimeRoutingRule[] = []): AgentRouterCategory {
  if (blockingGap) {
    return 'blocked';
  }
  if (hasSecurityRisk(task.risk)) {
    return 'security_research';
  }
  if (hasExternalUnknownRisk(task.risk)) {
    return 'external_research';
  }
  if (task.status === 'completed') {
    return 'validation';
  }
  const ruleCategory = matchedRules.find((rule) => rule.category)?.category;
  if (ruleCategory) {
    return ruleCategory;
  }
  if (allowedProfiles.every((profile) => profile === 'planner' || profile === 'architect' || profile === 'researcher')) {
    return 'planning';
  }
  if (allowedProfiles.includes('reviewer') && !allowedProfiles.includes('implementer')) {
    return 'implementation_review';
  }
  return 'implementation';
}

function selectRequiredSkillCapabilities(task: SddTask, profile: AgentProfileId, registry: AgentSkillRuntimeRegistry, matchedRules: AgentRuntimeRoutingRule[]): string[] {
  const capabilities = new Set<string>(['host.search.grep_glob']);
  const profileContract = findRegisteredProfile(profile, registry);
  for (const capabilityId of profileContract?.hostCapabilityRequirements ?? []) {
    capabilities.add(capabilityId);
  }
  for (const rule of matchedRules) {
    for (const capabilityId of rule.requireCapabilities) {
      capabilities.add(capabilityId);
    }
  }
  if (profile === 'researcher' || profile === 'planner' || profile === 'architect' || hasExternalUnknownRisk(task.risk)) {
    capabilities.add('claude.subagent.researcher');
    capabilities.add('context7.docs');
  }
  if (profile === 'implementer') {
    capabilities.add('claude.subagent.implementer');
    capabilities.add('host.edit.hashline');
    capabilities.add('host.cli.shell');
  }
  if (profile === 'reviewer') {
    capabilities.add('host.cli.shell');
  }
  if (profile === 'validator') {
    capabilities.add('host.cli.shell');
    if (task.validation.some((item) => /browser|ui|frontend|playwright|页面|前端/i.test(item))) {
      capabilities.add('playwright.browser_validation');
    }
  }
  if (profile === 'security' || hasSecurityRisk(task.risk)) {
    capabilities.add('pattern.ohmy.security_research');
  }
  if (profile === 'domain_expert') {
    capabilities.add('external.agency_agents.material');
  }
  return [...capabilities];
}

function matchRoutingRules(task: SddTask, registry: AgentSkillRuntimeRegistry): AgentRuntimeRoutingRule[] {
  return registry.routingRules.filter((rule) => taskMatchesRoutingRule(task, rule));
}

function taskMatchesRoutingRule(task: SddTask, rule: AgentRuntimeRoutingRule): boolean {
  const text = taskSearchText(task);
  const keywordMatched = rule.when.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  const fileMatched = rule.when.affectedFileGlobs.some((glob) => task.affectedFiles.some((filePath) => globMatchesPath(glob, filePath)));
  return keywordMatched || fileMatched;
}

function taskSearchText(task: SddTask): string {
  const metadataValues: string[] = [];
  for (const value of Object.values(task.rawMetadata)) {
    if (Array.isArray(value)) {
      metadataValues.push(...value);
    } else {
      metadataValues.push(value);
    }
  }
  return [
    task.id,
    task.title ?? '',
    task.boundary ?? '',
    task.implementationNotes ?? '',
    ...task.risk,
    ...task.validation,
    ...task.acceptance,
    ...task.acceptanceRefs,
    ...task.planRefs,
    ...task.fileOwnership,
    ...task.agentFit,
    ...task.allowedAgents,
    ...task.requiredArtifacts,
    ...metadataValues
  ].join('\n').toLowerCase();
}

function globMatchesPath(glob: string, filePath: string): boolean {
  return new RegExp(globToRegExpPattern(glob.replace(/\\/g, '/'))).test(filePath.replace(/\\/g, '/'));
}

function globToRegExpPattern(glob: string): string {
  let pattern = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];
    if (char === '*' && next === '*') {
      if (glob[index + 2] === '/') {
        pattern += '(?:.*/)?';
        index += 2;
      } else {
        pattern += '.*';
        index += 1;
      }
      continue;
    }
    if (char === '*') {
      pattern += '[^/]*';
      continue;
    }
    if (char === '?') {
      pattern += '[^/]';
      continue;
    }
    pattern += /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
  }
  return `${pattern}$`;
}

function routeRegistrySources(registry: AgentSkillRuntimeRegistry, profile: AgentProfileId | null, capabilityIds: string[]): RuntimeRegistryEntrySource[] {
  const selected: RuntimeRegistryEntrySource[] = [];
  const seen = new Set<string>();
  const pushSource = (source: RuntimeRegistryEntrySource | null): void => {
    if (!source) {
      return;
    }
    const key = `${source.kind}:${source.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      selected.push(source);
    }
  };
  if (profile) {
    pushSource(registrySourceFor(registry, 'profile', profile));
  }
  for (const capabilityId of capabilityIds) {
    const capabilitySource = registrySourceFor(registry, 'skill_capability', capabilityId);
    pushSource(capabilitySource);
    if (capabilitySource?.sourceId) {
      pushSource(registrySourceFor(registry, 'capability_source', capabilitySource.sourceId));
    }
  }
  return selected;
}

function quarantineWarningsForSources(sources: RuntimeRegistryEntrySource[]): string[] {
  return sources.filter((source) => source.quarantineRequired).map((source) => `${source.kind}:${source.id} originates from quarantined material and remains declarative metadata only.`);
}

function adapterMappingForProfile(registry: AgentSkillRuntimeRegistry, profile: AgentProfileId): AgentRuntimeAdapterMapping | null {
  return registry.adapterMappings.find((mapping) => resolveAgentProfileToken(mapping.profile, registry).profile === profile) ?? null;
}

function taskAutonomyCeiling(task: SddTask): LifecycleAutonomyCeiling {
  const declared = task.autonomy?.trim();
  if (declared === 'direct_execution_allowed' || declared === 'compact_boundary_only' || declared === 'full_sdd_with_checkpoint' || declared === 'research_before_implementation') {
    return declared;
  }
  if (hasExternalUnknownRisk(task.risk)) {
    return 'research_before_implementation';
  }
  if (isHighRiskValues(task.risk)) {
    return 'full_sdd_with_checkpoint';
  }
  if (task.risk.length > 0) {
    return 'compact_boundary_only';
  }
  return 'direct_execution_allowed';
}

function buildToolPermissionSpec(task: SddTask, profile: AgentProfileId, autonomyCeiling: LifecycleAutonomyCeiling, registry?: AgentSkillRuntimeRegistry): ToolPermissionSpec {
  const highRisk = isHighRiskValues(task.risk);
  const readonlyProfiles: AgentProfileId[] = ['planner', 'architect', 'researcher', 'reviewer', 'security', 'domain_expert'];
  const profileContract = registry ? findRegisteredProfile(profile, registry) : null;
  const toolGroups = profileContract && !findBuiltInProfile(profile) ? [...profileContract.toolScope] : readonlyProfiles.includes(profile) ? ['read', 'search', 'docs'] : profile === 'validator' ? ['read', 'test', 'browser'] : ['read', 'edit', 'test'];
  return {
    version: TOOL_PERMISSION_SPEC_VERSION,
    profile,
    risk: [...task.risk],
    toolGroups,
    fileScope: task.affectedFiles.length > 0 ? [...task.affectedFiles] : ['declared task boundary', 'artifacts/<task>.md'],
    policy: highRisk || autonomyCeiling === 'full_sdd_with_checkpoint' || autonomyCeiling === 'research_before_implementation' ? 'ask' : 'allow',
    approvalPolicy: highRisk ? 'human checkpoint required before write or external side effect' : 'host approval policy applies',
    runtimeValidationRequired: highRisk || profile === 'implementer' || profile === 'validator',
    deniedTools: profile === 'security' ? ['destructive_exploit', 'dos', 'credential_exfiltration', 'detection_evasion'] : ['destructive_git', 'unscoped_external_write'],
    hostPermissionProjection: `profile=${profile}; autonomy=${autonomyCeiling}; policy=${highRisk ? 'ask' : 'host-default'}`
  };
}

function resolveTeamModeActivation(options: { teamModeEnabled?: boolean; teamModeActivation?: TeamModeActivation }, defaultActivation: TeamModeActivation): TeamModeActivation {
  if (options.teamModeActivation) {
    return options.teamModeActivation;
  }
  if (options.teamModeEnabled === true) {
    return 'force';
  }
  if (options.teamModeEnabled === false) {
    return 'off';
  }
  return defaultActivation;
}

function baseTeamModePolicy(input: {
  activation: TeamModeActivation;
  mode: TeamModeSelection;
  enabled: boolean;
  decision: TeamModeDecisionStatus;
  costClass: TeamModeCostClass;
  reason: string;
  allowedWaves?: DelegationWavePolicy[];
  memberProfiles?: AgentProfileId[];
  maxMembers?: number;
  blockedReason?: string | null;
}): TeamModePolicy {
  const allowedWaves = input.allowedWaves ?? [];
  const memberProfiles = (input.memberProfiles ?? [...new Set(allowedWaves.flatMap((wave) => wave.memberProfiles))]).slice(0, input.maxMembers ?? 0);
  return {
    version: TEAM_MODE_POLICY_VERSION,
    enabled: input.enabled,
    decision: input.decision,
    mode: input.mode,
    activation: input.activation,
    costClass: input.costClass,
    reason: input.reason,
    chiefProfile: 'orchestrator',
    memberProfiles,
    allowedWaves,
    maxMembers: input.maxMembers ?? memberProfiles.length,
    requireArtifacts: true,
    blockedReason: input.blockedReason ?? null,
    waveRecommendation: allowedWaves.map((wave) => wave.id)
  };
}

function selectTeamWaves(ids: Array<DelegationWavePolicy['id']>): DelegationWavePolicy[] {
  return ids.map((id) => BUILT_IN_DELEGATION_WAVES.find((wave) => wave.id === id)).filter((wave): wave is DelegationWavePolicy => Boolean(wave));
}

function hasReviewArtifactRequirement(task: SddTask | null | undefined): boolean {
  return Boolean(task?.requiredArtifacts.some((artifact) => /review|validation|security|验证|评审|安全/i.test(artifact)));
}

function buildTeamModePolicy(options: { activation: TeamModeActivation; task?: SddTask | null; category?: AgentRouterCategory; risk?: string[]; autonomyCeiling?: LifecycleAutonomyCeiling; blockedReason?: string | null }): TeamModePolicy {
  const activation = options.activation;
  if (options.blockedReason) {
    return baseTeamModePolicy({
      activation,
      mode: 'off',
      enabled: false,
      decision: 'blocked',
      costClass: 'none',
      reason: options.blockedReason,
      blockedReason: options.blockedReason
    });
  }
  if (activation === 'off') {
    return baseTeamModePolicy({
      activation,
      mode: 'off',
      enabled: false,
      decision: 'disabled',
      costClass: 'none',
      reason: 'Team-mode automation disabled for this route.'
    });
  }

  const task = options.task ?? null;
  const risk = options.risk ?? task?.risk ?? [];
  const category = options.category ?? 'planning';
  const autonomyCeiling = options.autonomyCeiling ?? (task ? taskAutonomyCeiling(task) : 'direct_execution_allowed');
  const highRisk = isHighRiskValues(risk) || autonomyCeiling === 'full_sdd_with_checkpoint' || autonomyCeiling === 'research_before_implementation';
  const reviewNeeded = category === 'implementation_review' || category === 'validation' || hasReviewArtifactRequirement(task);

  if (hasSecurityRisk(risk) || category === 'security_research') {
    return baseTeamModePolicy({
      activation,
      mode: 'security-research',
      enabled: true,
      decision: 'enabled',
      costClass: 'high',
      reason: 'Security-sensitive task automatically requires bounded security-research team evidence.',
      allowedWaves: selectTeamWaves(['security_research', 'validation']),
      memberProfiles: ['security', 'reviewer', 'validator'],
      maxMembers: 3
    });
  }

  if (highRisk || category === 'external_research') {
    return baseTeamModePolicy({
      activation,
      mode: 'hyperplan',
      enabled: true,
      decision: 'enabled',
      costClass: highRisk ? 'high' : 'medium',
      reason: 'High-risk or research-before-implementation task automatically requires adversarial planning/review evidence.',
      allowedWaves: selectTeamWaves(['hyperplan', 'implementation_review', 'validation']),
      memberProfiles: ['architect', 'reviewer', 'security', 'validator'],
      maxMembers: 4
    });
  }

  if (reviewNeeded || activation === 'force') {
    return baseTeamModePolicy({
      activation,
      mode: 'review-lite',
      enabled: true,
      decision: 'enabled',
      costClass: 'low',
      reason: activation === 'force' ? 'Team-mode was forced, so router selects the lowest-cost review-lite team.' : 'Task metadata indicates review or validation evidence is useful, so router selects review-lite.',
      allowedWaves: selectTeamWaves(['implementation_review', 'validation']),
      memberProfiles: ['reviewer', 'validator'],
      maxMembers: 2
    });
  }

  return baseTeamModePolicy({
    activation,
    mode: 'off',
    enabled: false,
    decision: 'disabled',
    costClass: 'none',
    reason: 'Low-risk task does not need an agent team.'
  });
}

function modelPolicyForProfile(profile: AgentProfileId | null, registry?: AgentSkillRuntimeRegistry): ModelPolicyContract {
  const profileContract = profile && registry ? findRegisteredProfile(profile, registry) : null;
  const policyId = profileContract?.modelPolicyId ?? (profile === 'security' ? 'security_review' : profile === 'planner' || profile === 'architect' || profile === 'reviewer' || profile === 'researcher' || profile === 'orchestrator' ? 'reasoning' : 'balanced');
  return BUILT_IN_MODEL_POLICIES.find((policy) => policy.id === policyId) ?? BUILT_IN_MODEL_POLICIES[0];
}

function buildRejectedProfiles(allowedProfiles: AgentProfileId[], blockedReason: string | null, registry: AgentSkillRuntimeRegistry): AgentRouterRejectedProfile[] {
  const allowed = new Set(allowedProfiles);
  return registry.profiles
    .filter((profile) => !allowed.has(profile.id))
    .map((profile) => ({ profile: profile.id, reason: blockedReason ?? 'Profile is outside task metadata allowed_agents/agent_fit, routing rules, or router risk category.' }));
}

function hasSecurityRisk(risk: string[]): boolean {
  return risk.some((item) => /security|auth|token|secret|permission|sql_injection|注入|安全/i.test(item));
}

function hasExternalUnknownRisk(risk: string[]): boolean {
  return risk.some((item) => /external_unknown|external|third.?party|unknown|外部|未知/i.test(item));
}

function isHighRiskValues(risk: string[]): boolean {
  return risk.some((item) => /state[-_]?machine|concurrency|database|data[-_]?loss|sql|security|api[-_]?schema|ci[-_]?build|external[-_]?unknown|迁移|并发|数据库|安全/i.test(item));
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
  await readProjectConfig(projectRoot);
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
  const issues: ContractValidationIssue[] = [];
  const reasons: string[] = [];
  const queue = await listDelegationQueueItems(projectRoot);
  const runningDelegations = queue.items.filter((item) => item.status === 'RUNNING' && item.id !== input.excludeQueueItemId).length;
  const runningWaveExecutors = (await readAllRunStates(projectRoot)).filter((state) => state.status === 'running' && state.phase === 'wave').length;

  if ((input.operation === 'background_executor' || input.operation === 'wave_executor') && runningDelegations >= policy.concurrency.maxBackgroundDelegations) {
    const reason = `Running delegation count ${runningDelegations} reached governance limit ${policy.concurrency.maxBackgroundDelegations}.`;
    reasons.push(reason);
    issues.push(contractIssue('governance.concurrency', reason, 'Wait for existing delegations to finish, archive stale exploratory runs, or inspect governance policy before starting more background work.'));
  }
  if (input.operation === 'wave_executor' && runningWaveExecutors >= policy.concurrency.maxWaveExecutors) {
    const reason = `Running wave executor count ${runningWaveExecutors} reached governance limit ${policy.concurrency.maxWaveExecutors}.`;
    reasons.push(reason);
    issues.push(contractIssue('governance.wave_concurrency', reason, 'Wait for the running wave executor to finish or archive the stale run before starting another wave.'));
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
      issues.push(contractIssue('governance.confirmation', reason, 'Get explicit user confirmation before continuing this governed operation.'));
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

export async function listDelegationQueueItems(projectRoot: string, options: { runId?: string } = {}): Promise<DelegationQueueSnapshot> {
  await readProjectConfig(projectRoot);
  const states = options.runId
    ? [await readRunState(projectRoot, options.runId)]
    : await readAllRunStates(projectRoot);
  const items = states
    .filter((state) => state.status !== 'archived')
    .flatMap((state) => Object.values(state.delegations).map((delegation) => delegationQueueItemFromRunState(state, delegation)))
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    version: DELEGATION_QUEUE_CONTRACT_VERSION,
    items
  };
}

export async function inspectDelegationQueueItem(projectRoot: string, queueItemId: string): Promise<DelegationQueueItem | null> {
  const snapshot = await listDelegationQueueItems(projectRoot);
  return snapshot.items.find((item) => item.id === queueItemId) ?? null;
}

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

export function emptyLifecycleDecisionRecord(): LifecycleDecisionRecord {
  return {
    contract: LIFECYCLE_DECISION_CONTRACT,
    version: LIFECYCLE_DECISION_VERSION,
    model_version: 'phase1.0-final',
    input_summary: {},
    decision: {
      profile: null,
      confidence: null,
      hard_gate_hits: [],
      required_stages: [],
      skipped_stages: [],
      human_checkpoint_required: false
    },
    reasons: ['Phase 1.2 records the lifecycle decision contract; Phase 1.7 command gate will populate decision values.'],
    escalation_triggers: [],
    downgrade_reason: null,
    audit: {
      decided_at: null,
      decided_by: null,
      policy_version: 'phase1.0-final',
      source_artifacts: ['docs/architecture/lifecycle-decision-model.md']
    }
  };
}

function renderProjectConfig(config: ProjectConfig): string {
  const detection = config.detection ? `detection:\n  confidence: ${config.detection.confidence}\n  mixed_stack: ${config.detection.mixed_stack}\n  primary: ${config.detection.primary}\n  candidates:\n${config.detection.candidates.map((candidate) => `    - id: ${candidate.id}\n      confidence: ${candidate.confidence}\n      score: ${candidate.score}`).join('\n')}\n` : '';
  const defaultBranch = config.sdd.default_branch ? `  default_branch: ${config.sdd.default_branch}\n` : '';
  return `contract: ${config.contract}\nproject:\n  name: ${config.project.name}\n  language: ${config.project.language}\n  framework: ${config.project.framework}\n${detection}sdd:\n  spec_dir: ${config.sdd.spec_dir}\n${defaultBranch}  # Project-level SDD document prose language; runtime CLI/JSON output remains English.\n  docs_language: ${config.sdd.docs_language}\n  compatible_with: ${config.sdd.compatible_with}\nvalidation:\n  default:\n${config.validation.default.map((command) => `    - ${command}`).join('\n')}\nediting:\n  prefer_hashline: ${config.editing.prefer_hashline}\n  native_edit_fallback: ${config.editing.native_edit_fallback}\nruntime:\n  background_write: ${config.runtime.background_write}\n  worktree_isolation: ${config.runtime.worktree_isolation}\n  sync_back_mode: ${config.runtime.sync_back_mode}\nlifecycle:\n  decision_required: ${config.lifecycle.decision_required}\n  profiles:\n${config.lifecycle.profiles.map((profile) => `    - ${profile}`).join('\n')}\n`;
}

function parseProjectConfig(raw: string, configPath: string): ProjectConfig {
  const requiredSnippets = [
    'contract: phase-1.2-project-contract',
    'project:',
    'sdd:',
    'validation:',
    'runtime:',
    'lifecycle:'
  ];
  for (const snippet of requiredSnippets) {
    if (!raw.includes(snippet)) {
      throw new Error(`${configPath} missing required snippet: ${snippet}`);
    }
  }

  const projectName = readScalar(raw, 'name') ?? path.basename(path.dirname(path.dirname(configPath)));
  const language = readScalar(raw, 'language') ?? 'unknown';
  const framework = readScalar(raw, 'framework') ?? 'unknown';
  const specDir = readScalar(raw, 'spec_dir') ?? 'specs/<branch>';
  const defaultBranch = safeBranchOrNull(readScalar(raw, 'default_branch') ?? '') ?? undefined;
  const docsLanguage = readScalar(raw, 'docs_language') ?? 'zh-CN';
  const compatibleWith = readScalar(raw, 'compatible_with') ?? 'spec-kit';
  const defaultCommands = readListInSection(raw, 'validation', 'default');
  const profiles = readListInSection(raw, 'lifecycle', 'profiles') as LifecycleProfile[];

  return {
    contract: PROJECT_CONFIG_CONTRACT,
    project: {
      name: projectName,
      language,
      framework
    },
    detection: parseDetection(raw),
    sdd: {
      spec_dir: specDir,
      default_branch: defaultBranch,
      docs_language: docsLanguage,
      compatible_with: compatibleWith
    },
    validation: {
      default: defaultCommands
    },
    editing: {
      prefer_hashline: readBoolean(raw, 'prefer_hashline', true),
      native_edit_fallback: readBoolean(raw, 'native_edit_fallback', true)
    },
    runtime: {
      background_write: readBoolean(raw, 'background_write', false),
      worktree_isolation: readBoolean(raw, 'worktree_isolation', false),
      sync_back_mode: 'proposal'
    },
    lifecycle: {
      decision_required: readBoolean(raw, 'decision_required', true),
      profiles: profiles.length > 0 ? profiles : ['direct', 'compact', 'full', 'research']
    },
    agentRuntime: parseAgentRuntimeConfig(raw)
  };
}

function parseDetection(raw: string): ProjectConfig['detection'] {
  const primary = readScalar(raw, 'primary');
  const confidence = readDetectionConfidence(readScalar(raw, 'confidence'));
  if (!primary || !confidence) {
    return undefined;
  }
  const candidateIds = readListFieldObjects(raw, 'candidates', 'id');
  return {
    confidence,
    mixed_stack: readBoolean(raw, 'mixed_stack', false),
    primary,
    candidates: candidateIds.map((id) => ({
      id,
      confidence,
      score: 0
    }))
  };
}

interface ParsedYamlObject {
  scalars: Record<string, string>;
  lists: Record<string, string[]>;
  nested: Record<string, ParsedYamlObject>;
}

function parseAgentRuntimeConfig(raw: string): ProjectAgentRuntimeConfig | undefined {
  const lines = readTopLevelSectionLines(raw, 'agent_runtime');
  if (lines.length === 0) {
    return undefined;
  }
  return {
    profiles: parseAgentRuntimeProfiles(readChildSectionLines(lines, 2, 'profiles')),
    skillCapabilities: parseAgentRuntimeSkillCapabilities(readChildSectionLines(lines, 2, 'skill_capabilities')),
    capabilitySources: parseAgentRuntimeCapabilitySources(readChildSectionLines(lines, 2, 'capability_sources')),
    aliases: parseAgentRuntimeAliases(readChildSectionLines(lines, 2, 'aliases')),
    routingRules: parseAgentRuntimeRoutingRules(readChildSectionLines(lines, 2, 'routing_rules')),
    adapterMappings: parseAgentRuntimeAdapterMappings(readChildSectionLines(lines, 2, 'adapter_mappings'))
  };
}

function parseAgentRuntimeProfiles(lines: string[]): AgentProfileContract[] {
  return parseYamlObjectList(lines).map((object) => {
    const id = object.scalars.id ?? '';
    const base = BUILT_IN_AGENT_PROFILES.find((profile) => profile.id === object.scalars.extends);
    return {
      version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
      id,
      stageScope: listField(object, 'stage_scope', base?.stageScope ?? []),
      riskCeiling: lifecycleCeilingField(object, 'risk_ceiling', base?.riskCeiling ?? 'research_before_implementation'),
      defaultAutonomy: lifecycleCeilingField(object, 'default_autonomy', base?.defaultAutonomy ?? 'research_before_implementation'),
      requiredArtifacts: listField(object, 'required_artifacts', base?.requiredArtifacts ?? []),
      toolScope: listField(object, 'tool_scope', base?.toolScope ?? []),
      modelPolicyId: object.scalars.model_policy_id ?? base?.modelPolicyId ?? 'balanced',
      hostCapabilityRequirements: listField(object, 'host_capability_requirements', base?.hostCapabilityRequirements ?? []),
      boundaries: listField(object, 'boundaries', base?.boundaries ?? [])
    };
  });
}

function parseAgentRuntimeSkillCapabilities(lines: string[]): SkillCapabilityContract[] {
  return parseYamlObjectList(lines).map((object) => ({
    version: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
    id: object.scalars.id ?? '',
    name: object.scalars.name ?? object.scalars.id ?? '',
    kind: skillCapabilityKindField(object.scalars.kind),
    source: skillCapabilitySourceField(object.scalars.source),
    sourceRef: object.scalars.source_ref ?? '',
    capabilityDomain: listField(object, 'capability_domain', []),
    allowedStages: listField(object, 'allowed_stages', []),
    requiredRiskCeiling: lifecycleCeilingField(object, 'required_risk_ceiling', 'research_before_implementation'),
    evidenceType: skillCapabilityEvidenceTypeField(object.scalars.evidence_type),
    reuseDecision: reuseDecisionField(object.scalars.reuse_decision),
    buildExceptionReason: nullableString(object.scalars.build_exception_reason)
  }));
}

function parseAgentRuntimeCapabilitySources(lines: string[]): CapabilitySourceCatalogEntry[] {
  return parseYamlObjectList(lines).map((object) => ({
    version: CAPABILITY_SOURCE_CATALOG_VERSION,
    id: object.scalars.id ?? '',
    name: object.scalars.name ?? object.scalars.id ?? '',
    kind: capabilitySourceKindField(object.scalars.kind),
    sourceRef: object.scalars.source_ref ?? '',
    reuseDecision: reuseDecisionField(object.scalars.reuse_decision),
    quarantineRequired: booleanValue(object.scalars.quarantine_required, true),
    allowedUse: object.scalars.allowed_use ?? '',
    attribution: object.scalars.attribution ?? '',
    rationale: object.scalars.rationale ?? ''
  }));
}

function parseAgentRuntimeAliases(lines: string[]): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const line of lines) {
    const match = line.trim().match(/^([^:]+):\s*(.+?)\s*$/);
    if (match) {
      aliases[normalizeAgentToken(match[1])] = normalizeAgentToken(cleanYamlValue(match[2]));
    }
  }
  return aliases;
}

function parseAgentRuntimeRoutingRules(lines: string[]): AgentRuntimeRoutingRule[] {
  return parseYamlObjectList(lines).map((object) => ({
    id: object.scalars.id ?? '',
    when: {
      keywords: listField(object.nested.when, 'keywords', []),
      affectedFileGlobs: listField(object.nested.when, 'affected_file_globs', [])
    },
    preferProfile: normalizeAgentToken(object.scalars.prefer_profile ?? ''),
    requireCapabilities: listField(object, 'require_capabilities', []),
    category: agentRouterCategoryField(object.scalars.category)
  }));
}

function parseAgentRuntimeAdapterMappings(lines: string[]): AgentRuntimeAdapterMapping[] {
  return parseYamlObjectList(lines).map((object) => ({
    profile: normalizeAgentToken(object.scalars.profile ?? ''),
    hostAdapter: object.scalars.host_adapter ?? '',
    projection: object.scalars.projection ?? '',
    permissionPolicy: object.scalars.permission_policy ?? ''
  }));
}

function readTopLevelSectionLines(raw: string, section: string): string[] {
  const lines = raw.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => line.trim() === `${section}:` && countIndent(line) === 0);
  if (sectionIndex < 0) {
    return [];
  }
  const sectionLines: string[] = [];
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && countIndent(line) === 0) {
      break;
    }
    sectionLines.push(line);
  }
  return sectionLines;
}

function readChildSectionLines(lines: string[], indent: number, section: string): string[] {
  const sectionIndex = lines.findIndex((line) => countIndent(line) === indent && line.trim() === `${section}:`);
  if (sectionIndex < 0) {
    return [];
  }
  const sectionLines: string[] = [];
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && countIndent(line) <= indent) {
      break;
    }
    sectionLines.push(line);
  }
  return sectionLines;
}

function parseYamlObjectList(lines: string[]): ParsedYamlObject[] {
  const objects: ParsedYamlObject[] = [];
  let current: ParsedYamlObject | null = null;
  let currentListKey: string | null = null;
  let currentNestedKey: string | null = null;
  let currentNestedListKey: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const indent = countIndent(line);
    if (indent === 4 && trimmed.startsWith('- ')) {
      current = { scalars: {}, lists: {}, nested: {} };
      objects.push(current);
      currentListKey = null;
      currentNestedKey = null;
      currentNestedListKey = null;
      applyYamlKeyValue(current, trimmed.slice(2));
      continue;
    }
    if (!current) {
      continue;
    }
    if (indent === 6) {
      currentNestedListKey = null;
      if (trimmed.endsWith(':')) {
        const key = normalizeYamlKey(trimmed.slice(0, -1));
        currentListKey = key;
        currentNestedKey = key;
        current.nested[key] ??= { scalars: {}, lists: {}, nested: {} };
      } else {
        currentListKey = null;
        currentNestedKey = null;
        applyYamlKeyValue(current, trimmed);
      }
      continue;
    }
    if (indent === 8 && trimmed.startsWith('- ') && currentListKey) {
      current.lists[currentListKey] ??= [];
      current.lists[currentListKey].push(cleanYamlValue(trimmed.slice(2)));
      continue;
    }
    if (indent === 8 && currentNestedKey) {
      const nested = current.nested[currentNestedKey] ??= { scalars: {}, lists: {}, nested: {} };
      if (trimmed.endsWith(':')) {
        currentNestedListKey = normalizeYamlKey(trimmed.slice(0, -1));
        nested.lists[currentNestedListKey] ??= [];
      } else {
        applyYamlKeyValue(nested, trimmed);
      }
      continue;
    }
    if (indent === 10 && currentNestedKey && currentNestedListKey && trimmed.startsWith('- ')) {
      current.nested[currentNestedKey] ??= { scalars: {}, lists: {}, nested: {} };
      current.nested[currentNestedKey].lists[currentNestedListKey] ??= [];
      current.nested[currentNestedKey].lists[currentNestedListKey].push(cleanYamlValue(trimmed.slice(2)));
    }
  }
  return objects;
}

function applyYamlKeyValue(target: ParsedYamlObject, text: string): void {
  const match = text.match(/^([^:]+):\s*(.*?)\s*$/);
  if (!match) {
    return;
  }
  const key = normalizeYamlKey(match[1]);
  const value = cleanYamlValue(match[2]);
  if (value.startsWith('[') && value.endsWith(']')) {
    target.lists[key] = parseInlineList(value);
  } else {
    target.scalars[key] = value;
  }
}

function listField(object: ParsedYamlObject | undefined, key: string, fallback: string[]): string[] {
  if (!object) {
    return [...fallback];
  }
  return object.lists[key] && object.lists[key].length > 0 ? [...object.lists[key]] : [...fallback];
}

function lifecycleCeilingField(object: ParsedYamlObject, key: string, fallback: LifecycleAutonomyCeiling): LifecycleAutonomyCeiling {
  const value = object.scalars[key];
  return value === 'direct_execution_allowed' || value === 'compact_boundary_only' || value === 'full_sdd_with_checkpoint' || value === 'research_before_implementation' ? value : fallback;
}

function reuseDecisionField(value: string | undefined): CapabilityReuseDecision {
  return value === 'reuse_direct' || value === 'adapt_via_host_adapter' || value === 'borrow_mechanism' || value === 'avoid' ? value : 'adapt_via_host_adapter';
}

function skillCapabilityKindField(value: string | undefined): SkillCapabilityKind {
  return value === 'skill' || value === 'mcp' || value === 'cli_tool' || value === 'host_tool' || value === 'project_agent' || value === 'external_pattern' ? value : 'skill';
}

function skillCapabilitySourceField(value: string | undefined): SkillCapabilitySource {
  return value === 'project' || value === 'user_global' || value === 'claude_code' || value === 'mcp' || value === 'open_source' || value === 'host' ? value : 'project';
}

function skillCapabilityEvidenceTypeField(value: string | undefined): SkillCapabilityEvidenceType {
  return value === 'none' || value === 'command_output' || value === 'test_result' || value === 'browser_snapshot' || value === 'artifact' || value === 'external_source' || value === 'execution_record' ? value : 'none';
}

function capabilitySourceKindField(value: string | undefined): CapabilitySourceKind {
  return value === 'native_host' || value === 'mcp_tool' || value === 'open_source_material' || value === 'mechanism_reference' || value === 'future_adapter' || value === 'project_material' ? value : 'project_material';
}

function agentRouterCategoryField(value: string | undefined): AgentRouterCategory | null {
  return value === 'planning' || value === 'implementation' || value === 'implementation_review' || value === 'validation' || value === 'security_research' || value === 'external_research' || value === 'blocked' ? value : null;
}

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return fallback;
}

function nullableString(value: string | undefined): string | null {
  return !value || value === 'null' ? null : value;
}

function parseInlineList(value: string): string[] {
  return value.slice(1, -1).split(',').map((item) => cleanYamlValue(item)).filter(Boolean);
}

function cleanYamlValue(value: string): string {
  const trimmed = value.trim();
  return trimmed.replace(/^['\"]|['\"]$/g, '');
}

function normalizeYamlKey(value: string): string {
  return value.trim().replace(/-/g, '_');
}

function normalizeAgentToken(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, '_');
}

function countIndent(value: string): number {
  return value.length - value.trimStart().length;
}

function readDetectionConfidence(value: string | null): DetectionConfidence | null {
  return value === 'high' || value === 'medium' || value === 'low' ? value : null;
}

function readListFieldObjects(raw: string, section: string, field: string): string[] {
  const lines = raw.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => line.trim() === `${section}:`);
  if (sectionIndex < 0) {
    return [];
  }
  const values: string[] = [];
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) {
      continue;
    }
    if (!line.startsWith('    ') && !line.startsWith('  - ')) {
      break;
    }
    const match = line.match(new RegExp(`^-?\\s*${field}:\\s*(.+?)\\s*$`));
    const indentedMatch = line.trim().match(new RegExp(`^-?\\s*${field}:\\s*(.+?)\\s*$`));
    const value = match?.[1] ?? indentedMatch?.[1];
    if (value) {
      values.push(value.trim());
    }
  }
  return values;
}

function readScalar(raw: string, key: string): string | null {
  const match = raw.match(new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`, 'm'));
  return match?.[1]?.trim() ?? null;
}

function readBoolean(raw: string, key: string, defaultValue: boolean): boolean {
  const value = readScalar(raw, key);
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return defaultValue;
}

function readListInSection(raw: string, section: string, key: string): string[] {
  const lines = raw.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => line.trim() === `${section}:`);
  if (sectionIndex < 0) {
    return [];
  }
  const keyIndex = lines.findIndex((line, index) => index > sectionIndex && line.trim() === `${key}:`);
  if (keyIndex < 0) {
    return [];
  }
  const items: string[] = [];
  for (let index = keyIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith('    - ')) {
      break;
    }
    items.push(line.slice('    - '.length).trim());
  }
  return items;
}

async function parseRetainedPhaseTasks(specBranchDir: string): Promise<Pick<SddTaskModel, 'tasks' | 'gaps'>> {
  const entries = await readdir(specBranchDir, { withFileTypes: true });
  const taskFiles = entries
    .filter((entry) => entry.isFile() && /^phase\d+\.\d+-tasks\.md$/.test(entry.name))
    .map((entry) => path.join(specBranchDir, entry.name))
    .sort();
  const tasks: SddTask[] = [];
  const gaps: SddTaskGap[] = [];
  for (const taskFile of taskFiles) {
    const raw = await readFile(taskFile, 'utf8');
    const parsed = parseSddTasksMarkdown(raw, { tasksPath: taskFile, validateDependencies: false });
    tasks.push(...parsed.tasks);
    gaps.push(...parsed.gaps);
  }
  gaps.push(...validateAggregateTaskSet(tasks));
  return { tasks, gaps };
}

function documentGap(field: string, message: string, recommendation: string): SddTaskGap {
  return {
    type: 'Document Gap',
    severity: 'blocking',
    taskId: null,
    field,
    message,
    recommendation
  };
}

function parseTaskStatus(value: string | null): SddTaskStatus {
  if (value === 'pending' || value === 'in_progress' || value === 'completed' || value === 'blocked' || value === 'deferred') {
    return value;
  }
  return 'unknown';
}

function parseWave(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseSimpleYamlBlock(raw: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const lines = raw.split(/\r?\n/);
  let currentListKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    if (currentListKey && /^-\s+/.test(trimmed)) {
      const current = result[currentListKey];
      const items = Array.isArray(current) ? current : [];
      items.push(unquoteSimpleYamlValue(trimmed.slice(2).trim()));
      result[currentListKey] = items;
      continue;
    }

    const scalarMatch = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!scalarMatch) {
      currentListKey = null;
      continue;
    }
    const key = scalarMatch[1];
    const value = scalarMatch[2].trim();
    if (value === '') {
      result[key] = [];
      currentListKey = key;
    } else if (value === '[]') {
      result[key] = [];
      currentListKey = null;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      result[key] = value.slice(1, -1).split(',').map((item) => unquoteSimpleYamlValue(item.trim())).filter(Boolean);
      currentListKey = null;
    } else {
      result[key] = unquoteSimpleYamlValue(value);
      currentListKey = null;
    }
  }

  return result;
}

function unquoteSimpleYamlValue(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function scalarValue(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function listValue(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (!value || value === '[]') {
    return [];
  }
  return [value];
}

function lineNumberAt(raw: string, offset: number): number {
  return raw.slice(0, offset).split(/\r?\n/).length;
}

function nearestTaskHeading(prefix: string): { raw: string; id: string | null; title: string | null } | null {
  const matches = Array.from(prefix.matchAll(/^\s*###\s+(.+)$/gm));
  const last = matches.at(-1);
  if (!last) {
    return null;
  }
  const raw = last[1].trim();
  const parsed = raw.match(/^([^:：\s]+)\s*[:：]\s*(.+)$/);
  return {
    raw,
    id: parsed?.[1]?.trim() ?? null,
    title: parsed?.[2]?.trim() ?? raw
  };
}

function nextTaskStart(raw: string, offset: number, limit = raw.length): number {
  const next = raw.slice(offset, limit).search(/^\s*###\s+/m);
  return next < 0 ? limit : offset + next;
}

function parseTaskCompanionSections(raw: string): { boundary: string | null; acceptance: string[]; implementationNotes: string | null } {
  return {
    boundary: sectionText(raw, 'Boundary'),
    acceptance: sectionBullets(raw, 'Acceptance'),
    implementationNotes: sectionText(raw, 'Implementation Notes')
  };
}

function sectionText(raw: string, title: string): string | null {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionPattern = `^\\s*####\\s+${escaped}\\s*$([\\s\\S]*?)(?=^\\s*####\\s+|^\\s*###\\s+|$(?![\\s\\S]))`;
  const match = raw.match(new RegExp(sectionPattern, 'im'));
  const text = match?.[1]?.trim() ?? '';
  return text.length > 0 ? text : null;
}

function sectionBullets(raw: string, title: string): string[] {
  const text = sectionText(raw, title);
  if (!text) {
    return [];
  }
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2).trim()).filter(Boolean);
}

function validateTask(task: SddTask): SddTaskGap[] {
  const gaps: SddTaskGap[] = [];
  const requiredLists: Array<[keyof SddTask, string]> = [
    ['affectedFiles', 'affected_files'],
    ['validation', 'validation']
  ];

  if (task.status === 'unknown') {
    gaps.push(taskGap(task.id, 'status', 'Task status is missing or unsupported.', 'Use one of pending, in_progress, completed, blocked, deferred.'));
  }
  if (task.wave === null) {
    gaps.push(taskGap(task.id, 'wave', 'Task wave is missing or invalid.', 'Add a positive integer wave value.'));
  }
  for (const [property, field] of requiredLists) {
    if ((task[property] as unknown[]).length === 0) {
      gaps.push(taskGap(task.id, field, `Task ${task.id} has no ${field}.`, `Declare ${field} in the sdd-task block before implementation.`));
    }
  }
  if (!task.boundary) {
    gaps.push(taskGap(task.id, 'Boundary', `Task ${task.id} has no Boundary section.`, 'Add a #### Boundary section describing allowed and forbidden scope.'));
  }
  if (task.acceptance.length === 0) {
    gaps.push(taskGap(task.id, 'Acceptance', `Task ${task.id} has no acceptance items.`, 'Add verifiable bullets under #### Acceptance.'));
  }
  return gaps;
}

function taskGap(taskId: string, field: string, message: string, recommendation: string): SddTaskGap {
  return {
    type: 'Task Gap',
    severity: 'blocking',
    taskId,
    field,
    message,
    recommendation
  };
}

function validateAggregateTaskSet(tasks: SddTask[]): SddTaskGap[] {
  const gaps: SddTaskGap[] = [];
  const tasksById = new Map<string, SddTask[]>();
  for (const task of tasks) {
    const matchingTasks = tasksById.get(task.id) ?? [];
    matchingTasks.push(task);
    tasksById.set(task.id, matchingTasks);
  }

  for (const [taskId, matchingTasks] of tasksById) {
    if (matchingTasks.length > 1) {
      gaps.push(taskGap(
        taskId,
        'id',
        `Duplicate task id ${taskId} across parsed task files: ${matchingTasks.map(taskSourceEvidence).join('; ')}.`,
        'Rename duplicate task ids or add deterministic source disambiguation before implementation.'
      ));
    }
  }

  for (const task of tasks) {
    for (const dependency of task.dependsOn) {
      const matchingDependencies = tasksById.get(dependency) ?? [];
      if (matchingDependencies.length === 0) {
        gaps.push({
          type: 'Dependency Gap',
          severity: 'blocking',
          taskId: task.id,
          field: 'depends_on',
          message: `Task ${task.id} depends on unknown task ${dependency}.`,
          recommendation: 'Fix depends_on to reference an existing task id, or add the missing task.'
        });
      } else if (matchingDependencies.length > 1) {
        gaps.push({
          type: 'Dependency Gap',
          severity: 'blocking',
          taskId: task.id,
          field: 'depends_on',
          message: `Task ${task.id} depends on ambiguous duplicate task id ${dependency}: ${matchingDependencies.map(taskSourceEvidence).join('; ')}.`,
          recommendation: 'Rename duplicate task ids so dependencies resolve to one task.'
        });
      }
    }
  }

  return gaps;
}

function detectTaskGraphCycles(tasks: SddTask[]): TaskGraphDiagnostic[] {
  const uniqueTaskIds = new Set<string>();
  const duplicateTaskIds = new Set<string>();
  for (const task of tasks) {
    if (uniqueTaskIds.has(task.id)) {
      duplicateTaskIds.add(task.id);
    }
    uniqueTaskIds.add(task.id);
  }
  const graph = new Map<string, string[]>();
  for (const task of tasks.filter((candidate) => !duplicateTaskIds.has(candidate.id))) {
    graph.set(task.id, task.dependsOn.filter((dependency) => uniqueTaskIds.has(dependency) && !duplicateTaskIds.has(dependency)));
  }
  const diagnostics: TaskGraphDiagnostic[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];
  const reportedCycles = new Set<string>();

  const visit = (taskId: string): void => {
    if (visiting.has(taskId)) {
      const cycleStart = stack.indexOf(taskId);
      const cycle = [...stack.slice(cycleStart), taskId];
      const key = cycle.join('->');
      if (!reportedCycles.has(key)) {
        reportedCycles.add(key);
        diagnostics.push({
          severity: 'blocking',
          taskId,
          field: 'depends_on',
          message: `Task dependency cycle detected: ${cycle.join(' -> ')}.`,
          recommendation: 'Break the cycle before graph planning or wave planning.'
        });
      }
      return;
    }
    if (visited.has(taskId)) {
      return;
    }
    visiting.add(taskId);
    stack.push(taskId);
    for (const dependency of graph.get(taskId) ?? []) {
      visit(dependency);
    }
    stack.pop();
    visiting.delete(taskId);
    visited.add(taskId);
  };

  for (const taskId of graph.keys()) {
    visit(taskId);
  }
  return diagnostics;
}

function taskSourceEvidence(task: Pick<SddTask, 'id' | 'source'>): string {
  return `${task.id} at ${sourceLocationEvidence(task.source)}`;
}

function sourceLocationEvidence(source: SddTaskSourceLocation): string {
  return `${source.filePath}:${source.lineStart}-${source.lineEnd}`;
}

function buildSddResult(metadata: Record<string, string | string[]>): SddResult | null {
  const contract = scalarValue(metadata.contract);
  const version = scalarValue(metadata.version);
  const agent = scalarValue(metadata.agent);
  const task = scalarValue(metadata.task);
  const status = scalarValue(metadata.status);
  const artifacts = listValue(metadata.artifacts);
  if (contract !== SDD_RESULT_CONTRACT || version !== SDD_RESULT_VERSION || !agent || !task || !isSddResultStatus(status) || artifacts.length === 0) {
    return null;
  }
  return {
    contract: SDD_RESULT_CONTRACT,
    version: SDD_RESULT_VERSION,
    agent,
    task,
    status,
    artifacts,
    rawMetadata: metadata
  };
}

function validateSddResultMetadata(metadata: Record<string, string | string[]>): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  const contract = scalarValue(metadata.contract);
  const version = scalarValue(metadata.version);
  const agent = scalarValue(metadata.agent);
  const task = scalarValue(metadata.task);
  const status = scalarValue(metadata.status);
  const artifacts = listValue(metadata.artifacts);

  if (contract !== SDD_RESULT_CONTRACT) {
    issues.push(contractIssue('contract', `Expected ${SDD_RESULT_CONTRACT}, got ${contract ?? 'missing'}.`, 'Use contract: sdd-result-v1.'));
  }
  if (version !== SDD_RESULT_VERSION) {
    issues.push(contractIssue('version', `Expected ${SDD_RESULT_VERSION}, got ${version ?? 'missing'}.`, 'Use version: 1.3.0 until a new contract version is introduced.'));
  }
  if (!agent) {
    issues.push(contractIssue('agent', 'sdd-result agent is required.', 'Set agent to the producing agent name.'));
  }
  if (!task) {
    issues.push(contractIssue('task', 'sdd-result task is required.', 'Set task to the delegated task id.'));
  }
  if (!isSddResultStatus(status)) {
    issues.push(contractIssue('status', `Unsupported sdd-result status ${status ?? 'missing'}.`, 'Use PASS, PASS_WITH_GAPS, FAIL, BLOCKED, TIMED_OUT, or CANCELLED.'));
  }
  if (artifacts.length === 0) {
    issues.push(contractIssue('artifacts', 'sdd-result artifacts must contain at least one path.', 'Add the current run-relative artifact path, for example artifacts/<file>. Source/test files belong in ## Evidence.'));
  }
  for (const artifactPath of artifacts) {
    validateRunRelativeArtifactReference(artifactPath, issues);
    if (!artifactPath.replace(/\\/g, '/').startsWith('artifacts/')) {
      issues.push(contractIssue('artifacts', `Source/test path ${artifactPath} is not a run artifact reference.`, 'Move source/test file citations to ## Evidence; keep only run-relative artifacts/<file> paths in sdd-result.artifacts.'));
    }
  }
  return issues;
}

async function readAllRunStates(projectRoot: string): Promise<RunState[]> {
  const runsDir = getRunsDir(projectRoot);
  if (!await exists(runsDir)) {
    return [];
  }
  const entries = await readdir(runsDir, { withFileTypes: true });
  const states: RunState[] = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    try {
      states.push(await readRunState(projectRoot, entry.name));
    } catch {
      continue;
    }
  }
  return states;
}

function delegationQueueItemFromRunState(state: RunState, delegation: DelegationRecord): DelegationQueueItem {
  return {
    id: `${state.runId}:${delegation.delegationId}`,
    runId: state.runId,
    delegationId: delegation.delegationId,
    taskId: delegation.task,
    agent: delegation.agent,
    requestedCapabilityId: 'sdd-cli',
    dedupeKey: `${state.runId}:${delegation.task}:${delegation.agent}`,
    status: delegation.status,
    statusSource: 'run_state_delegation',
    runMode: delegation.runMode,
    expectedArtifact: delegation.expectedArtifact,
    requiredEvidence: [delegation.expectedArtifact, state.eventLogPath],
    createdAt: delegation.startedAt,
    updatedAt: delegation.terminalEventAt ?? delegation.lastHeartbeatAt ?? state.updatedAt
  };
}

function summarizeRunState(state: RunState): RunSummary {
  return {
    runId: state.runId,
    status: state.status,
    phase: state.phase,
    currentTask: state.currentTask,
    partition: state.partition,
    gitBranch: state.gitBranch,
    taskId: state.taskId,
    affectedFiles: state.affectedFiles,
    documentSnapshot: state.documentSnapshot,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    validationStatus: state.validation.status,
    syncBackStatus: state.syncBack.status,
    taskIds: Object.keys(state.tasks).sort(),
    artifactCount: state.artifacts.length
  };
}

function runtimeTaskStatus(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const status = value.status;
  const verifyStatus = value.verifyStatus;
  if (typeof verifyStatus === 'string') {
    return verifyStatus;
  }
  return typeof status === 'string' ? status : null;
}

function runtimeTaskGaps(value: unknown): SddTaskGap[] {
  if (!isRecord(value) || !Array.isArray(value.gaps)) {
    return [];
  }
  return value.gaps.filter(isTaskGap);
}

function applySyncBackToTasksMarkdown(raw: string, task: SddTask, note: string): string {
  const range = locateTaskBlockRange(raw, task);
  const block = raw.slice(range.start, range.end);
  const nextBlock = setTaskBlockStatus(block, 'completed');
  const sectionEnd = nextTaskStart(raw, range.end);
  const section = raw.slice(range.end, sectionEnd);
  const nextSection = appendSyncBackImplementationNote(section, note);
  return `${raw.slice(0, range.start)}${nextBlock}${nextSection}${raw.slice(sectionEnd)}`;
}

function locateTaskBlockRange(raw: string, task: SddTask): { start: number; end: number } {
  const matches = Array.from(raw.matchAll(/^\s*```sdd-task\s*\r?\n([\s\S]*?)\r?^\s*```\s*$/gm));
  const matching = matches.filter((match) => {
    const metadata = parseSimpleYamlBlock(match[1] ?? '');
    const id = scalarValue(metadata.id);
    const start = match.index ?? 0;
    return id === task.id && lineNumberAt(raw, start) === task.source.lineStart;
  });
  const fallback = matches.filter((match) => scalarValue(parseSimpleYamlBlock(match[1] ?? '').id) === task.id);
  const selected = matching.length === 1 ? matching[0] : fallback.length === 1 ? fallback[0] : null;
  if (!selected || selected.index === undefined) {
    throw new Error(`Cannot locate a unique sdd-task block for ${task.id}.`);
  }
  return {
    start: selected.index,
    end: selected.index + selected[0].length
  };
}

function setTaskBlockStatus(block: string, status: SddTaskStatus): string {
  if (/^\s*status:\s*[^\r\n]*$/m.test(block)) {
    return block.replace(/^(\s*status:\s*)[^\r\n]*$/m, `$1${status}`);
  }
  const eol = block.includes('\r\n') ? '\r\n' : '\n';
  if (/^\s*id:\s*[^\r\n]*$/m.test(block)) {
    return block.replace(/^(\s*id:\s*[^\r\n]*)$/m, `$1${eol}status: ${status}`);
  }
  throw new Error('Cannot update task status because the sdd-task block has no id line.');
}

function appendSyncBackImplementationNote(section: string, note: string): string {
  const runMatch = note.match(/run `([^`]+)`/);
  if (runMatch && section.includes(`run \`${runMatch[1]}\``)) {
    return section;
  }
  const heading = section.match(/^####\s+Implementation Notes\s*$/im);
  if (!heading || heading.index === undefined) {
    const separator = section.length === 0 || section.endsWith('\n') ? '' : '\n';
    return `${section}${separator}\n#### Implementation Notes\n\n${note}\n`;
  }
  const contentStart = heading.index + heading[0].length;
  const remainder = section.slice(contentStart);
  const nextHeadingOffset = remainder.search(/\n####\s+|\n###\s+/);
  const insertAt = nextHeadingOffset < 0 ? section.length : contentStart + nextHeadingOffset;
  const before = section.slice(0, insertAt).trimEnd();
  const after = section.slice(insertAt);
  return `${before}\n${note}${after}`;
}

function syncBackImplementationNote(state: RunState, inspection: SyncBackInspection): string {
  const artifacts = inspection.artifacts.length > 0
    ? inspection.artifacts.map((artifact) => `\`${artifact}\``).join(', ')
    : 'none';
  return `- Sync-back applied from run \`${state.runId}\` (${state.updatedAt}); proposal: \`${inspection.proposalPath ?? 'none'}\`; artifacts: ${artifacts}.`;
}

function isTaskGap(value: unknown): value is SddTaskGap {
  if (!isRecord(value)) {
    return false;
  }
  return (value.type === 'Task Gap' || value.type === 'Document Gap' || value.type === 'Dependency Gap')
    && (value.severity === 'blocking' || value.severity === 'warning')
    && (typeof value.taskId === 'string' || value.taskId === null)
    && typeof value.field === 'string'
    && typeof value.message === 'string'
    && typeof value.recommendation === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function inspectDocumentChainEvidence(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const context = await resolveSddContext(projectRoot);
    const model = await parseSddBranch(projectRoot, context.branch);
    if (!model.documents.specExists || !model.documents.tasksExists) {
      return [{
        level: 'WARN',
        check: 'document_chain',
        message: `Document chain skipped for ${context.branch}; spec.md or tasks.md is missing.`,
        action: 'Create specs/<branch>/spec.md and tasks.md before document-chain verification.'
      }];
    }

    const checks: DoctorCheck[] = [];
    const specRaw = await readFile(model.specPath, 'utf8');
    const specAcceptanceIds = extractSpecAcceptanceIds(specRaw);
    if (specAcceptanceIds.size === 0) {
      checks.push({
        level: 'WARN',
        check: 'document_chain_spec_acceptance',
        message: `No AC-* acceptance IDs found in ${sourceLocationEvidence({ filePath: model.specPath, heading: null, lineStart: 1, lineEnd: 1 })}.`,
        action: 'Add stable acceptance IDs such as AC-1 in spec.md.'
      });
    }

    for (const task of model.tasks) {
      for (const ref of task.acceptanceRefs) {
        if (!specAcceptanceIds.has(ref)) {
          checks.push({
            level: 'FAIL',
            check: 'document_chain_acceptance_ref',
            message: `Task ${task.id} references missing spec acceptance ${ref}.`,
            action: 'Fix acceptance_refs or add the referenced AC ID to spec.md.'
          });
        }
      }

      if (isHighRiskTask(task)) {
        if (task.requiredArtifacts.length === 0) {
          checks.push({
            level: 'FAIL',
            check: 'document_chain_high_risk_evidence',
            message: `High-risk task ${task.id} has no required_artifacts.`,
            action: 'Declare reviewer and validator artifacts before high-risk execution.'
          });
        }
        if (!task.requiredArtifacts.some((artifact) => /review/i.test(artifact)) || !task.requiredArtifacts.some((artifact) => /validation|validator/i.test(artifact))) {
          checks.push({
            level: 'WARN',
            check: 'document_chain_high_risk_evidence',
            message: `High-risk task ${task.id} should require explicit reviewer and validator evidence artifacts.`,
            action: 'Add artifacts/review-<task>.md and artifacts/validation-<task>.md or equivalent evidence paths.'
          });
        }
        if (task.verificationAvailability.length === 0) {
          checks.push({
            level: 'WARN',
            check: 'document_chain_high_risk_verification',
            message: `High-risk task ${task.id} has no verification_availability.`,
            action: 'Declare available unit/build/inspect/manual verification before high-risk execution.'
          });
        }
      }
    }

    if (checks.length === 0) {
      checks.push({
        level: 'PASS',
        check: 'document_chain',
        message: `Spec acceptance IDs and task evidence links are consistent for ${context.branch}.`
      });
    }
    return checks;
  } catch (error) {
    return [{
      level: 'WARN',
      check: 'document_chain',
      message: `Document chain could not be inspected: ${messageFromError(error)}`,
      action: 'Run sdd tasks gaps and inspect specs/<branch>/spec.md/tasks.md manually.'
    }];
  }
}

function extractSpecAcceptanceIds(raw: string): Set<string> {
  return new Set(Array.from(raw.matchAll(/\bAC-[A-Za-z0-9._-]+\b/g)).map((match) => match[0]));
}

function isHighRiskTask(task: SddTask): boolean {
  const highRiskTags = new Set(['state-machine', 'concurrency', 'database', 'sql', 'security', 'api_schema', 'ci_build', 'external_unknown', 'database_data_loss']);
  return task.risk.some((risk) => highRiskTags.has(risk));
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

function validateAgentExecutionRecordShape(runId: string, record: AgentExecutionRecord): ContractValidationIssue[] {
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

function validateTeamSessionRecordShape(runId: string, record: TeamSessionRecord): ContractValidationIssue[] {
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

function routePreflightNeedsTeamSession(event: RuntimeEvent): boolean {
  const decision = event.data?.decision;
  if (!isRecord(decision)) {
    return false;
  }
  const teamMode = decision.teamMode;
  return isRecord(teamMode) && (teamMode.decision === 'enabled' || teamMode.decision === 'blocked');
}

async function inspectRunEvidence(projectRoot: string, options: { allRuns?: boolean; latestOnly?: boolean } = {}): Promise<DoctorCheck[]> {
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

  const nonArchived = states.filter((entry) => entry.state.status !== 'archived');
  let inspected = options.allRuns ? states : nonArchived;
  if (!options.allRuns && options.latestOnly && inspected.length > 0) {
    inspected = [inspected.slice().sort((left, right) => Date.parse(right.state.updatedAt) - Date.parse(left.state.updatedAt))[0]];
  }
  const inspectedRunIds = new Set(inspected.map((entry) => entry.runId));
  const skippedArchived = states.length - nonArchived.length;
  const skippedByScope = states.filter((entry) => !inspectedRunIds.has(entry.runId) && entry.state.status !== 'archived').length;

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
      for (const record of agentExecutionRecords) {
        for (const issue of validateAgentExecutionRecordShape(runId, record)) {
          issueCount += 1;
          checks.push({ level: 'FAIL', check: 'agent_execution_record', message: `${runId}/${record.executionId ?? 'unknown'}: ${issue.message}`, action: issue.recommendation });
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
    checks.push({ level: 'WARN', check: 'run_evidence', message: 'No non-archived runs were inspected.', action: 'Use sdd doctor --all-runs to audit archived history or create a new run.' });
  } else if (issueCount === 0) {
    checks.push({ level: 'PASS', check: 'run_evidence', message: `Inspected ${inspected.length} run(s); no stale delegation, invalid artifact, terminal event gap, or resident worker runtime issue found.` });
  }
  return checks;
}

async function inspectLocalRunIndexEvidence(projectRoot: string): Promise<DoctorCheck[]> {
  const inspection = await inspectLocalRunIndex(projectRoot);
  if (!inspection.exists) {
    return [{
      level: 'WARN',
      check: 'local_run_index',
      message: 'Local run index is missing; .sdd/runs remains the source of truth.',
      action: 'Run sdd run index rebuild to create the derived index.'
    }];
  }
  if (!inspection.valid) {
    return inspection.issues.map((issue) => ({
      level: 'WARN' as const,
      check: 'local_run_index',
      message: issue.message,
      action: issue.recommendation
    }));
  }
  return [{
    level: 'PASS',
    check: 'local_run_index',
    message: `Local run index is current with ${inspection.index?.runs.length ?? 0} run(s), ${inspection.index?.delegations.length ?? 0} delegation(s), and ${inspection.index?.artifacts.length ?? 0} artifact(s).`
  }];
}

async function inspectAiToolEntryEvidence(projectRoot: string): Promise<DoctorCheck[]> {
  const results = await checkAiToolEntryDrift(projectRoot);
  const checks = results.flatMap((result) => result.entries.map((entry): DoctorCheck => {
    const check = `ai_entry_${entry.id}`;
    const message = `${entry.relativePath}: ${entry.message}`;
    if (entry.status === 'unchanged') {
      return { level: 'PASS', check, message };
    }
    if (entry.status === 'missing' || entry.status === 'drifted') {
      return { level: 'FAIL', check, message, action: entry.action ?? 'Run sdd update.' };
    }
    if (entry.status === 'user-modified') {
      return { level: 'FAIL', check, message, action: entry.action ?? 'Review manually; sdd update will not overwrite user-modified entries by default.' };
    }
    if (entry.status === 'foreign' || entry.status === 'conflict') {
      return { level: 'FAIL', check, message, action: entry.action ?? 'Review the target file before running sdd update.' };
    }
    return { level: 'WARN', check, message, action: entry.action };
  }));

  if (checks.length === 0) {
    checks.push({ level: 'WARN', check: 'ai_entries', message: 'No AI tool adapters selected for drift inspection.', action: 'Run sdd init --ai claude-code if Claude Code entries are required.' });
  }
  return checks;
}

async function inspectCapabilityRegistry(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const registry = await listToolCapabilities(projectRoot);
    const present = new Set(registry.capabilities.map((capability) => capability.id));
    const missing = BASELINE_TOOL_CAPABILITY_IDS.filter((capabilityId) => !present.has(capabilityId));
    if (missing.length > 0) {
      return [{
        level: 'FAIL',
        check: 'capability_registry',
        message: `Capability registry ${registry.version} is missing baseline capability id(s): ${missing.join(', ')}.`,
        action: 'Restore the built-in Phase 3.1 capability registry.'
      }];
    }
    return [{
      level: 'PASS',
      check: 'capability_registry',
      message: `Capability registry ${registry.version} exposes ${registry.capabilities.length} baseline capability declaration(s).`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'capability_registry',
      message: `Cannot inspect capability registry: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting capabilities.'
    }];
  }
}

async function inspectToolPluginContracts(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const [capabilityRegistry, pluginRegistry] = await Promise.all([
      listToolCapabilities(projectRoot),
      listToolPluginContracts(projectRoot)
    ]);
    const capabilityIds = new Set(capabilityRegistry.capabilities.map((capability) => capability.id));
    const pluginIds = new Set(pluginRegistry.contracts.map((contract) => contract.id));
    const missingPlugins = BASELINE_TOOL_PLUGIN_CONTRACT_IDS.filter((pluginId) => !pluginIds.has(pluginId));
    const missingCapabilities = pluginRegistry.contracts
      .filter((contract) => !capabilityIds.has(contract.capabilityId))
      .map((contract) => `${contract.id}->${contract.capabilityId}`);

    if (missingPlugins.length > 0 || missingCapabilities.length > 0) {
      const problems = [
        missingPlugins.length > 0 ? `missing baseline plugin id(s): ${missingPlugins.join(', ')}` : null,
        missingCapabilities.length > 0 ? `unknown capability reference(s): ${missingCapabilities.join(', ')}` : null
      ].filter((problem): problem is string => problem !== null);
      return [{
        level: 'FAIL',
        check: 'plugin_loading_contract',
        message: `Plugin loading contract ${pluginRegistry.version} has compatibility issue(s): ${problems.join('; ')}.`,
        action: 'Restore the built-in Phase 3.2 plugin loading contract registry.'
      }];
    }

    return [{
      level: 'PASS',
      check: 'plugin_loading_contract',
      message: `Plugin loading contract ${pluginRegistry.version} exposes ${pluginRegistry.contracts.length} baseline plugin contract declaration(s) compatible with capability registry ${capabilityRegistry.version}.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'plugin_loading_contract',
      message: `Cannot inspect plugin loading contracts: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting plugin contracts.'
    }];
  }
}

async function inspectDelegationQueueContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const [capabilityRegistry, snapshot] = await Promise.all([
      listToolCapabilities(projectRoot),
      listDelegationQueueItems(projectRoot)
    ]);
    const capabilityIds = new Set(capabilityRegistry.capabilities.map((capability) => capability.id));
    const invalidItems = snapshot.items
      .filter((item) => !item.id || !item.runId || !item.delegationId || !item.taskId || !item.agent || !item.dedupeKey || !capabilityIds.has(item.requestedCapabilityId))
      .map((item) => item.id || '<missing-id>');

    if (invalidItems.length > 0) {
      return [{
        level: 'FAIL',
        check: 'delegation_queue_contract',
        message: `Delegation queue contract ${snapshot.version} has invalid queue item(s): ${invalidItems.join(', ')}.`,
        action: 'Restore delegation run-state records and ensure requested capabilities reference the Phase 3.1 registry.'
      }];
    }

    return [{
      level: 'PASS',
      check: 'delegation_queue_contract',
      message: `Delegation queue contract ${snapshot.version} derived ${snapshot.items.length} queue item(s) from run-state delegations.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'delegation_queue_contract',
      message: `Cannot inspect delegation queue contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting delegation queue items.'
    }];
  }
}

async function inspectDelegationStateMachineContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const machine = getDelegationStateMachine();
    const statuses = new Set(machine.statuses);
    const terminalStatuses = new Set(machine.terminalStatuses);
    const missingStatuses = DELEGATION_STATUSES.filter((status) => !statuses.has(status));
    const invalidTerminalStatuses = machine.terminalStatuses.filter((status) => !TERMINAL_DELEGATION_STATUSES.includes(status));
    const invalidTransitions = machine.transitions.filter((transition) =>
      !statuses.has(transition.from) ||
      !statuses.has(transition.to) ||
      terminalStatuses.has(transition.from) ||
      transition.terminal !== terminalStatuses.has(transition.to)
    );

    if (missingStatuses.length > 0 || invalidTerminalStatuses.length > 0 || invalidTransitions.length > 0) {
      const problems = [
        missingStatuses.length > 0 ? `missing status(es): ${missingStatuses.join(', ')}` : null,
        invalidTerminalStatuses.length > 0 ? `invalid terminal status(es): ${invalidTerminalStatuses.join(', ')}` : null,
        invalidTransitions.length > 0 ? `invalid transition(s): ${invalidTransitions.map((transition) => `${transition.from}->${transition.to}`).join(', ')}` : null
      ].filter((problem): problem is string => problem !== null);
      return [{
        level: 'FAIL',
        check: 'delegation_state_machine',
        message: `Delegation state machine ${machine.version} has compatibility issue(s): ${problems.join('; ')}.`,
        action: 'Restore the built-in Phase 3.4 delegation state machine contract.'
      }];
    }

    return [{
      level: 'PASS',
      check: 'delegation_state_machine',
      message: `Delegation state machine ${machine.version} declares ${machine.statuses.length} status(es), ${machine.terminalStatuses.length} terminal status(es), and ${machine.transitions.length} transition(s).`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'delegation_state_machine',
      message: `Cannot inspect delegation state machine: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting the delegation state machine.'
    }];
  }
}

async function inspectWorkerAdapterContracts(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const [capabilityRegistry, pluginRegistry, adapterRegistry] = await Promise.all([
      listToolCapabilities(projectRoot),
      listToolPluginContracts(projectRoot),
      listWorkerAdapterContracts(projectRoot)
    ]);
    const capabilityIds = new Set(capabilityRegistry.capabilities.map((capability) => capability.id));
    const pluginIds = new Set(pluginRegistry.contracts.map((contract) => contract.id));
    const adapterIds = new Set(adapterRegistry.adapters.map((adapter) => adapter.id));
    const missingAdapters = BASELINE_WORKER_ADAPTER_IDS.filter((adapterId) => !adapterIds.has(adapterId));
    const missingCapabilities = adapterRegistry.adapters
      .filter((adapter) => !capabilityIds.has(adapter.capabilityId))
      .map((adapter) => `${adapter.id}->${adapter.capabilityId}`);
    const missingPlugins = adapterRegistry.adapters
      .filter((adapter) => !pluginIds.has(adapter.pluginContractId))
      .map((adapter) => `${adapter.id}->${adapter.pluginContractId}`);
    const invalidStateMachineRefs = adapterRegistry.adapters
      .filter((adapter) => adapter.input.stateMachineVersion !== DELEGATION_STATE_MACHINE_VERSION)
      .map((adapter) => adapter.id);
    const invalidTerminalStatuses = adapterRegistry.adapters
      .filter((adapter) => adapter.output.terminalStatus.some((status) => !TERMINAL_DELEGATION_STATUSES.includes(status)))
      .map((adapter) => adapter.id);

    if (missingAdapters.length > 0 || missingCapabilities.length > 0 || missingPlugins.length > 0 || invalidStateMachineRefs.length > 0 || invalidTerminalStatuses.length > 0) {
      const problems = [
        missingAdapters.length > 0 ? `missing baseline adapter id(s): ${missingAdapters.join(', ')}` : null,
        missingCapabilities.length > 0 ? `unknown capability reference(s): ${missingCapabilities.join(', ')}` : null,
        missingPlugins.length > 0 ? `unknown plugin contract reference(s): ${missingPlugins.join(', ')}` : null,
        invalidStateMachineRefs.length > 0 ? `invalid state machine reference(s): ${invalidStateMachineRefs.join(', ')}` : null,
        invalidTerminalStatuses.length > 0 ? `invalid terminal status output(s): ${invalidTerminalStatuses.join(', ')}` : null
      ].filter((problem): problem is string => problem !== null);
      return [{
        level: 'FAIL',
        check: 'worker_adapter_contract',
        message: `Worker adapter contract ${adapterRegistry.version} has compatibility issue(s): ${problems.join('; ')}.`,
        action: 'Restore the built-in Phase 3.5 worker adapter contract registry.'
      }];
    }

    return [{
      level: 'PASS',
      check: 'worker_adapter_contract',
      message: `Worker adapter contract ${adapterRegistry.version} exposes ${adapterRegistry.adapters.length} adapter manifest(s) compatible with capability, plugin, and state machine contracts.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'worker_adapter_contract',
      message: `Cannot inspect worker adapter contracts: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting worker adapter contracts.'
    }];
  }
}

async function inspectWorktreeIsolationContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const modes: WorktreeIsolationMode[] = ['none', 'required', 'blocked', 'manual'];
    const requiredGates = ['task_found', 'capability_declared', 'files_overlap', 'unsafe_concurrency', 'read_only'];
    return [{
      level: 'PASS',
      check: 'worktree_isolation_contract',
      message: `Worktree isolation contract ${WORKTREE_ISOLATION_CONTRACT_VERSION} declares ${modes.length} mode(s) and ${requiredGates.length} dry-run gate(s).`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'worktree_isolation_contract',
      message: `Cannot inspect worktree isolation contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting worktree isolation contract.'
    }];
  }
}

async function inspectWorktreeLifecycleContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const statuses: WorktreeLifecycleStatus[] = ['created', 'kept', 'removed'];
    return [{
      level: 'PASS',
      check: 'worktree_lifecycle_contract',
      message: `Worktree lifecycle contract ${WORKTREE_LIFECYCLE_CONTRACT_VERSION} declares ${statuses.length} status(es) and safe create/keep/remove operations.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'worktree_lifecycle_contract',
      message: `Cannot inspect worktree lifecycle contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting worktree lifecycle contract.'
    }];
  }
}

async function inspectTaskGraphPlannerContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const edgeTypes: TaskGraphEdgeType[] = ['depends_on', 'file_overlap'];
    return [{
      level: 'PASS',
      check: 'task_graph_planner_contract',
      message: `Task graph planner contract ${TASK_GRAPH_PLANNER_CONTRACT_VERSION} declares ${edgeTypes.length} edge type(s), graph diagnostics, and read-only inspect output.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'task_graph_planner_contract',
      message: `Cannot inspect task graph planner contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting task graph planner contract.'
    }];
  }
}

async function inspectWavePlannerContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const gates: Array<WavePlanGate['gate']> = ['manual', 'blocked'];
    return [{
      level: 'PASS',
      check: 'wave_planner_contract',
      message: `Wave planner contract ${WAVE_PLANNER_CONTRACT_VERSION} declares dependency waves and ${gates.length} gate type(s) without execution side effects.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'wave_planner_contract',
      message: `Cannot inspect wave planner contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting wave planner contract.'
    }];
  }
}

async function inspectBackgroundExecutorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const statuses: BackgroundExecutorStatus[] = ['claimed', 'completed', 'failed', 'blocked'];
    return [{
      level: 'PASS',
      check: 'background_executor_contract',
      message: `Background executor contract ${BACKGROUND_EXECUTOR_CONTRACT_VERSION} declares ${statuses.length} result status(es), single-delegation claim/run/ingest, and no wave execution side effects.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'background_executor_contract',
      message: `Cannot inspect background executor contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting background executor contract.'
    }];
  }
}

async function inspectWaveExecutorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    const strategies: WaveExecutorStrategy[] = ['fast-stop', 'safe-continue'];
    return [{
      level: 'PASS',
      check: 'wave_executor_contract',
      message: `Wave executor contract ${WAVE_EXECUTOR_CONTRACT_VERSION} declares ${strategies.length} strategy option(s), planner-driven execution, and no sync-back apply side effects.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'wave_executor_contract',
      message: `Cannot inspect wave executor contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting wave executor contract.'
    }];
  }
}

async function inspectLocalRunIndexContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    await readProjectConfig(projectRoot);
    return [{
      level: 'PASS',
      check: 'local_run_index_contract',
      message: `Local run index contract ${LOCAL_RUN_INDEX_CONTRACT_VERSION} declares rebuildable derived run, task, delegation, artifact, and wave summary indexes.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'local_run_index_contract',
      message: `Cannot inspect local run index contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting local run index contract.'
    }];
  }
}

async function inspectGovernancePolicyContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const policy = await inspectGovernancePolicy(projectRoot);
    const missingOperations = BASELINE_GOVERNANCE_POLICY_OPERATIONS.filter((operation) => !policy.manualConfirmation.operations.includes(operation) && operation !== 'background_executor' && operation !== 'wave_executor');
    if (missingOperations.length > 0 || policy.cleanup.deleteRunHistory || !policy.cleanup.archiveOnly || policy.retry.reopenTerminalDelegation) {
      return [{
        level: 'FAIL',
        check: 'governance_policy_contract',
        message: `Governance policy ${policy.version} has unsafe compatibility issue(s).`,
        action: 'Restore the built-in Phase 3.14 governance policy contract.'
      }];
    }
    return [{
      level: 'PASS',
      check: 'governance_policy_contract',
      message: `Governance policy ${policy.version} gates ${BASELINE_GOVERNANCE_POLICY_OPERATIONS.length} operation type(s), max ${policy.concurrency.maxBackgroundDelegations} background delegation(s), and explicit confirmation for risky shared-state actions.`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'governance_policy_contract',
      message: `Cannot inspect governance policy contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting governance policy contract.'
    }];
  }
}

async function inspectQueryStatusBoundaryContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const validation = await validateQueryStatusContract(projectRoot);
    if (!validation.valid) {
      return validation.issues.map((issue) => ({
        level: 'FAIL' as const,
        check: 'query_status_contract',
        message: issue.message,
        action: issue.recommendation
      }));
    }
    return [{
      level: 'PASS',
      check: 'query_status_contract',
      message: `Query status contract ${validation.version} separates status, doctor, run inspect, and debug responsibilities using ${validation.surfaces.length} query surface(s).`
    }];
  } catch (error) {
    return [{
      level: 'FAIL',
      check: 'query_status_contract',
      message: `Cannot inspect query status contract: ${messageFromError(error)}`,
      action: 'Run sdd init or fix .sdd/project.yml before inspecting query status contract.'
    }];
  }
}

async function inspectAgentSkillTeamRuntimeDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const validation = await validateAgentSkillTeamRuntime(projectRoot);
    if (!validation.valid) {
      return validation.issues.map((issue) => ({
        level: 'FAIL' as const,
        check: 'agent_skill_team_runtime_contract',
        message: issue.message,
        action: issue.recommendation
      }));
    }
    return [{
      level: 'PASS',
      check: 'agent_skill_team_runtime_contract',
      message: `Agent/skill/team runtime contract ${validation.version} exposes ${validation.inspection.profiles.length} profile(s), ${validation.inspection.skillCapabilities.length} capability mapping(s), ${validation.inspection.capabilitySources.length} source catalog entrie(s), and keeps team-mode ${validation.inspection.teamMode.decision} by default.`
    }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'agent_skill_team_runtime_contract', message: `Cannot inspect agent/skill/team runtime contract: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting Phase 6 runtime contract.' }];
  }
}

async function inspectSkillAgentEvalDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const contract = await inspectSkillAgentEvalContract(projectRoot);
    return [{ level: 'PASS', check: 'skill_agent_eval_contract', message: `Skill/agent eval contract ${contract.version} anchors ${contract.corpus.length} ERP trial corpus file(s) and ${contract.dimensions.length} scoring dimension(s).` }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'skill_agent_eval_contract', message: `Cannot inspect skill/agent eval contract: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting eval contract.' }];
  }
}

async function inspectHarnessLearningDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const contract = await inspectHarnessLearningContract(projectRoot);
    return [{ level: 'PASS', check: 'harness_learning_contract', message: `Harness learning contract ${contract.version} limits repeated-failure output to ${contract.allowedSinks.length} reviewed sink(s).` }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'harness_learning_contract', message: `Cannot inspect harness learning contract: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting learning contract.' }];
  }
}

async function inspectProjectContextPackDoctorContract(projectRoot: string): Promise<DoctorCheck[]> {
  try {
    const contract = await inspectProjectContextPackContract(projectRoot);
    return [{ level: 'PASS', check: 'project_context_pack_contract', message: `Project Context Pack contract ${contract.version} uses ${contract.entryPoint} as durable context while preserving structured runtime sources of truth.` }];
  } catch (error) {
    return [{ level: 'FAIL', check: 'project_context_pack_contract', message: `Cannot inspect Project Context Pack contract: ${messageFromError(error)}`, action: 'Run sdd init or fix .sdd/project.yml before inspecting context pack contract.' }];
  }
}

export async function readRunEvents(projectRoot: string, runId: string): Promise<RuntimeEvent[]> {
  const eventPath = path.join(getRunDir(projectRoot, runId), 'events.jsonl');
  if (!await exists(eventPath)) {
    return [];
  }
  const raw = await readFile(eventPath, 'utf8');
  return raw.split(/\r?\n/).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line) as RuntimeEvent);
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

function isSddResultStatus(value: string | null): value is SddResultStatus {
  return value === 'PASS' || value === 'PASS_WITH_GAPS' || value === 'FAIL' || value === 'BLOCKED' || value === 'TIMED_OUT' || value === 'CANCELLED';
}

function isDelegationStatus(value: string): value is DelegationStatus {
  return value === 'PENDING' || value === 'RUNNING' || value === 'COMPLETED' || value === 'FAILED' || value === 'TIMED_OUT' || value === 'CANCELLED' || value === 'RECOVERABLE' || value === 'STALE';
}

function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
}

function normalizeArtifactRootRelativePath(value: string): string {
  const normalized = normalizePortablePath(value);
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized === '..' || path.isAbsolute(value)) {
    throw new Error(`Artifact path must be relative and stay under artifacts/: ${value}`);
  }
  if (normalized.startsWith('artifacts/')) {
    throw new Error(`Artifact helper paths must be artifact-root-relative, not run-relative: ${value}`);
  }
  return normalized;
}


export function extractLifecycleRiskSignalsFromText(text: string, source: LifecycleRiskExtractionSource = 'from_text'): LifecycleRiskGateExtraction {
  const evidence: LifecycleRiskExtractionEvidence[] = [];
  const riskTags: string[] = [];
  const affectedContracts: string[] = [];
  let externalUnknown = false;
  let architectureDecisionRequired = false;
  let reversibility: Reversibility | undefined;
  let validationClarity: ValidationClarity | undefined;
  let impactConfidence: ImpactConfidence | undefined;

  function addEvidence(category: LifecycleRiskCategory, matched: string, riskTag: string): void {
    evidence.push({ category, matched, riskTag });
    riskTags.push(riskTag);
  }

  function collect(category: LifecycleRiskCategory, terms: string[], riskTag: string): void {
    for (const term of terms) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        addEvidence(category, term, riskTag);
      }
    }
  }

  collect('state_machine', ['state machine', 'state-machine', 'state_machine', '状态机', '状态流转', '状态转换', 'liveness', 'recovery'], 'state-machine');
  collect('concurrency', ['concurrency', 'parallel', 'race', 'thread', 'multi-thread', '并发', '线程', '竞态', '锁'], 'concurrency');
  collect('database_data_loss', ['database', 'migration', 'consistency', '数据一致性', '数据库', '迁移'], 'database');
  collect('database_data_loss', ['data loss', 'data-loss', '数据丢失', '不可逆', 'irreversible'], 'data_loss');
  collect('sql', ['sql', 'SQL', 'SQL 拼接', '拼接 SQL'], 'database');
  collect('security', ['security', 'auth', 'permission', 'credential', 'token', 'secret', 'privacy', '安全', '认证', '授权', '凭证', '隐私'], 'security');
  collect('security', ['SQL injection', 'sql injection', '注入'], 'security');
  collect('api_schema', ['api', 'schema', 'contract', 'openapi', '接口', '契约', '协议', '字段', '兼容'], 'api');
  collect('ci_build', ['ci', 'cd', 'build', 'release', 'publish', 'dependency', 'pipeline', '构建', '发布', '依赖', '流水线'], 'build');
  collect('external_unknown', ['external', 'third-party', 'unknown', 'unscoutable', '外部', '第三方', '未知', '不确定'], 'external_unknown');

  if (evidence.some((item) => item.category === 'api_schema')) {
    affectedContracts.push('api_schema');
  }
  if (evidence.some((item) => item.category === 'external_unknown')) {
    externalUnknown = true;
    impactConfidence = 'low';
  }
  if (evidence.some((item) => item.category === 'database_data_loss' && (item.riskTag === 'data_loss' || item.matched.toLowerCase().includes('irreversible') || item.matched.includes('不可逆')))) {
    reversibility = 'irreversible';
  }
  if (evidence.some((item) => item.category === 'ci_build')) {
    validationClarity = 'partial';
  }
  if (text.includes('架构') || text.toLowerCase().includes('architecture decision')) {
    architectureDecisionRequired = true;
  }

  const signals: Partial<LifecycleDecisionSignals> = {
    risk_tags: uniqueStrings(riskTags),
    affected_contracts: uniqueStrings(affectedContracts),
    external_unknown: externalUnknown,
    architecture_decision_required: architectureDecisionRequired
  };
  if (reversibility) {
    signals.reversibility = reversibility;
  }
  if (validationClarity) {
    signals.validation_clarity = validationClarity;
  }
  if (impactConfidence) {
    signals.impact_confidence = impactConfidence;
  }

  return {
    contract: LIFECYCLE_RISK_GATE_CONTRACT_VERSION,
    source,
    riskTags: uniqueStrings(riskTags),
    affectedContracts: uniqueStrings(affectedContracts),
    externalUnknown,
    architectureDecisionRequired,
    reversibility,
    validationClarity,
    impactConfidence,
    evidence,
    signals
  };
}

export function lifecycleAutonomyCeiling(record: LifecycleDecisionRecord): LifecycleAutonomyCeiling {
  const decision = record.decision;
  if (decision.profile === 'research') {
    return 'research_before_implementation';
  }
  if (decision.profile === 'full' || decision.human_checkpoint_required || decision.hard_gate_hits.some((gate) => FULL_PROFILE_HARD_GATES.includes(gate))) {
    return 'full_sdd_with_checkpoint';
  }
  if (decision.profile === 'compact') {
    return 'compact_boundary_only';
  }
  return 'direct_execution_allowed';
}

const FULL_PROFILE_HARD_GATES = [
  'security_auth',
  'database_or_data_loss',
  'api_schema_contract',
  'state_machine_concurrency_liveness',
  'ci_dependency_build_release'
];

function normalizeLifecycleSignals(input: Partial<LifecycleDecisionSignals>): LifecycleDecisionSignals {
  return {
    intent_clarity: input.intent_clarity ?? 'medium',
    acceptance_clarity: input.acceptance_clarity ?? 'medium',
    estimated_change_size: input.estimated_change_size ?? 'small',
    task_count_estimate: input.task_count_estimate ?? 1,
    file_count_estimate: input.file_count_estimate ?? 1,
    affected_layers: input.affected_layers ?? [],
    affected_contracts: input.affected_contracts ?? [],
    dependency_fanout: input.dependency_fanout ?? 'local',
    impact_confidence: input.impact_confidence ?? 'medium',
    risk_tags: uniqueStrings(input.risk_tags ?? []),
    reversibility: input.reversibility ?? 'unknown',
    validation_clarity: input.validation_clarity ?? 'partial',
    validation_available: input.validation_available ?? false,
    validation_cost: input.validation_cost ?? 'unknown',
    policy_hits: uniqueStrings(input.policy_hits ?? []),
    permission_required: uniqueStrings(input.permission_required ?? []),
    requires_agents: input.requires_agents ?? false,
    handoff_count: input.handoff_count ?? 0,
    artifact_dependency: input.artifact_dependency ?? false,
    runtime_recovery_need: input.runtime_recovery_need ?? false,
    orchestration_uncertainty: input.orchestration_uncertainty ?? 'medium',
    human_checkpoint_required: input.human_checkpoint_required ?? false,
    approval_reason: input.approval_reason ?? [],
    source_artifacts: input.source_artifacts ?? [],
    can_scout_impact: input.can_scout_impact ?? true,
    architecture_decision_required: input.architecture_decision_required ?? false,
    external_unknown: input.external_unknown ?? false
  };
}

function evaluateLifecycleHardGates(signals: LifecycleDecisionSignals): string[] {
  const hits: string[] = [];
  const riskText = signals.risk_tags.map((tag) => tag.toLowerCase());
  if (signals.external_unknown) {
    hits.push('external_unknown');
  }
  if (signals.architecture_decision_required) {
    hits.push('architecture_decision_required');
  }
  if (containsAny(riskText, ['security', 'auth', 'permission', 'credential', 'data_leak', 'privacy'])) {
    hits.push('security_auth');
  }
  if (containsAny(riskText, ['database', 'migration', 'data_loss', 'irreversible', 'schema-data']) || signals.reversibility === 'irreversible') {
    hits.push('database_or_data_loss');
  }
  if (signals.affected_contracts.length > 0 || containsAny(riskText, ['api', 'schema', 'contract'])) {
    hits.push('api_schema_contract');
  }
  if (containsAny(riskText, ['state_machine', 'state-machine', 'concurrency', 'liveness', 'recovery'])) {
    hits.push('state_machine_concurrency_liveness');
  }
  if (containsAny(riskText, ['ci', 'cd', 'dependency', 'build', 'release', 'publish'])) {
    hits.push('ci_dependency_build_release');
  }
  if (signals.impact_confidence === 'low') {
    hits.push(signals.can_scout_impact ? 'low_impact_confidence_scoutable' : 'low_impact_confidence_unscoutable');
  }
  if (signals.acceptance_clarity === 'low' || signals.validation_clarity === 'unclear') {
    hits.push('unclear_acceptance_or_validation');
  }
  if (signals.policy_hits.length > 0 || signals.permission_required.length > 0) {
    hits.push('policy_or_permission_checkpoint');
  }
  return uniqueStrings(hits);
}

function matchesDirectWhitelist(signals: LifecycleDecisionSignals, hardGateHits: string[]): boolean {
  return signals.intent_clarity === 'high'
    && signals.acceptance_clarity === 'high'
    && signals.validation_clarity === 'clear'
    && signals.validation_available
    && signals.validation_cost === 'cheap'
    && signals.impact_confidence === 'high'
    && signals.risk_tags.length === 0
    && hardGateHits.length === 0
    && signals.reversibility === 'reversible'
    && !signals.requires_agents
    && signals.handoff_count === 0
    && !signals.artifact_dependency
    && !signals.runtime_recovery_need
    && signals.orchestration_uncertainty === 'low'
    && signals.file_count_estimate <= 2
    && signals.task_count_estimate <= 1;
}

function isBoundedCompactChange(signals: LifecycleDecisionSignals): boolean {
  return signals.estimated_change_size !== 'large'
    && signals.task_count_estimate <= 2
    && signals.file_count_estimate <= 5
    && signals.dependency_fanout !== 'multi_component'
    && signals.dependency_fanout !== 'unknown'
    && signals.impact_confidence !== 'low'
    && signals.validation_clarity !== 'unclear'
    && signals.orchestration_uncertainty !== 'high';
}

function estimateLifecycleConfidence(signals: LifecycleDecisionSignals, hardGateHits: string[]): LifecycleConfidence {
  if (signals.intent_clarity === 'low' || signals.impact_confidence === 'low' || signals.orchestration_uncertainty === 'high' || signals.external_unknown || signals.architecture_decision_required) {
    return 'low';
  }
  if (signals.intent_clarity === 'high' && signals.acceptance_clarity === 'high' && signals.impact_confidence === 'high' && signals.validation_clarity === 'clear' && hardGateHits.length === 0) {
    return 'high';
  }
  return 'medium';
}

function requiredStagesForProfile(profile: LifecycleProfile): string[] {
  if (profile === 'direct') {
    return ['intent', 'implement', 'minimal-validation'];
  }
  if (profile === 'compact') {
    return ['intent-or-mini-spec', 'task-boundary', 'implement', 'validation'];
  }
  if (profile === 'full') {
    return ['spec', 'plan', 'tasks', 'do', 'verify', 'sync-back-proposal'];
  }
  return ['research', 'options', 'decision', 'architecture-artifact', 'implementation-spec'];
}

function skippedStagesForProfile(profile: LifecycleProfile): string[] {
  if (profile === 'direct') {
    return ['full-spec', 'full-plan', 'full-tasks', 'agent-workflow'];
  }
  if (profile === 'compact') {
    return ['full-spec', 'full-plan'];
  }
  if (profile === 'full') {
    return ['research'];
  }
  return ['direct-implementation'];
}

function defaultEscalationTriggers(): string[] {
  return [
    'actual impact exceeds initial estimate',
    'API/database/security/state-machine/concurrency/build risk appears',
    'acceptance or validation becomes unclear',
    'validation fails for non-obvious reasons',
    'Spec/Plan/Task/Scope/Validation/Environment gap is detected',
    'required artifact, delegation terminal event, or liveness evidence is missing'
  ];
}

function commandIntegrationBoundaries(profile: LifecycleProfile): string[] {
  const boundaries = [
    'Command gate may decide and record lifecycle profile only.',
    'Command gate must not execute Phase 1.8 task implementation loop.',
    'Command gate must not launch agents or workflows in Phase 1.7.',
    'Phase transition still requires checkpoint confirmation.'
  ];
  if (profile === 'direct' || profile === 'compact') {
    boundaries.push('Short path is allowed only within the recorded lifecycle decision; escalation triggers remain active.');
  }
  return boundaries;
}

function containsAny(values: string[], needles: string[]): boolean {
  return values.some((value) => needles.some((needle) => value.includes(needle)));
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

async function createUniqueRunId(projectRoot: string): Promise<string> {
  const base = formatDateForRunId(new Date());
  for (let sequence = 1; sequence <= 999; sequence += 1) {
    const runId = `${base}-${String(sequence).padStart(3, '0')}`;
    if (!await exists(getRunDir(projectRoot, runId))) {
      return runId;
    }
  }
  throw new Error(`Cannot allocate run id for ${base}; sequence exhausted.`);
}

function formatDateForRunId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function defaultWorktreeId(runId: string, taskId: string): string {
  return `wt-${runId}-${taskId}`.replace(/[^A-Za-z0-9._-]/g, '-');
}

async function isGitWorktreeDirty(projectRoot: string, worktreePath: string): Promise<boolean> {
  const absolutePath = path.resolve(projectRoot, worktreePath);
  if (!await exists(absolutePath)) {
    return false;
  }
  try {
    const result = await execFileAsync('git', ['-C', absolutePath, 'status', '--porcelain']);
    return result.stdout.trim().length > 0;
  } catch {
    return true;
  }
}

async function listGitWorktreePaths(projectRoot: string): Promise<Set<string>> {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, 'worktree', 'list', '--porcelain']);
    return new Set(result.stdout.split(/\r?\n/).filter((line) => line.startsWith('worktree ')).map((line) => normalizeComparablePath(path.resolve(line.slice('worktree '.length)))));
  } catch {
    return new Set();
  }
}

async function listOrphanWorktreeDirs(projectRoot: string, activePaths: Set<string>): Promise<string[]> {
  const worktreesDir = getWorktreesDir(projectRoot);
  if (!await exists(worktreesDir)) {
    return [];
  }
  const entries = await readdir(worktreesDir, { withFileTypes: true });
  const orphans: string[] = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const relativePath = path.relative(projectRoot, path.join(worktreesDir, entry.name));
    if (!activePaths.has(normalizeComparablePath(relativePath))) {
      orphans.push(relativePath);
    }
  }
  return orphans;
}

async function getGitRoot(projectRoot: string): Promise<string | null> {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel']);
    return result.stdout.trim();
  } catch {
    return null;
  }
}

async function getCurrentGitBranch(projectRoot: string): Promise<string | null> {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, 'branch', '--show-current']);
    const branch = result.stdout.trim();
    return branch || null;
  } catch {
    return null;
  }
}


async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function summarizeDoctorStatus(checks: DoctorCheck[]): DoctorLevel {
  if (checks.some((check) => check.level === 'FAIL')) {
    return 'FAIL';
  }
  if (checks.some((check) => check.level === 'WARN')) {
    return 'WARN';
  }
  return 'PASS';
}


function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
