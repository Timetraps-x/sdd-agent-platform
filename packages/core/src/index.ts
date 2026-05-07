import { appendFile, access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { applyAiToolEntries, checkAiToolEntryDrift, type AiProjectionResult, type AiToolSelection } from './ai-tools.js';

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
export type DoctorLevel = 'PASS' | 'WARN' | 'FAIL';
export type RunStatus = 'created' | 'running' | 'completed' | 'blocked' | 'failed' | 'archived';
export type LifecycleProfile = 'direct' | 'compact' | 'full' | 'research';
export type LifecycleConfidence = 'high' | 'medium' | 'low';
export type SddResultStatus = 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED' | 'TIMED_OUT' | 'CANCELLED';
export type DelegationRunMode = 'foreground' | 'background';
export type DelegationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED' | 'RECOVERABLE' | 'STALE';
export type GoalVerifyStatus = 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED';
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
}

export interface ArtifactIndexEntry {
  path: string;
  kind: string;
  task: string | null;
  agent: string | null;
  createdAt: string;
}

export interface RunState {
  contract: typeof RUN_STATE_CONTRACT;
  runtimeVersion: typeof RUNTIME_VERSION;
  runId: string;
  status: RunStatus;
  phase: string | null;
  currentTask: string | null;
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
  message: string;
}

export interface GoalVerifyOptions {
  branch?: string;
  taskId: string;
  runId: string;
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
  message: string;
}

export interface RunSummary {
  runId: string;
  status: RunStatus;
  phase: string | null;
  currentTask: string | null;
  createdAt: string;
  updatedAt: string;
  validationStatus: RunState['validation']['status'];
  syncBackStatus: RunState['syncBack']['status'];
  taskIds: string[];
  artifactCount: number;
}

export interface LocalRunIndexTaskEntry {
  taskId: string;
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

export interface LocalRunIndexQuery {
  runId?: string;
  taskId?: string;
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
}

export interface LocalRunIndexInspection {
  valid: boolean;
  exists: boolean;
  indexPath: string;
  index: LocalRunIndex | null;
  issues: ContractValidationIssue[];
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
}

export interface ProjectStatus {
  branch: string;
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
  const branch = options.branch ?? 'master';
  await mkdir(runsDir, { recursive: true });

  let created = false;
  if (options.force || !await exists(configPath)) {
    const projectName = path.basename(path.resolve(projectRoot));
    const config = await detectProjectConfig(projectRoot, projectName);
    await writeFile(configPath, renderProjectConfig(config), 'utf8');
    created = true;
  }

  const documents = await applyInitDocuments(projectRoot, {
    branch,
    force: options.force,
    scaffoldDocuments: options.scaffoldDocuments ?? true
  });

  await mkdir(sddDir, { recursive: true });
  const aiTools = await applyAiToolEntries(projectRoot, { tool: options.aiTool ?? 'auto' });
  return { configPath, created, documents, aiTools };
}

async function applyInitDocuments(projectRoot: string, options: { branch: string; force?: boolean; scaffoldDocuments: boolean }): Promise<InitDocumentsResult> {
  assertSafePathSegment(options.branch, 'branch');
  const docsRoot = path.join(projectRoot, 'specs', options.branch);
  const now = new Date().toISOString();
  const documents = [
    { name: 'spec.md', content: renderInitSpecDocument(options.branch, now) },
    { name: 'plan.md', content: renderInitPlanDocument(options.branch, now) },
    { name: 'tasks.md', content: renderInitTasksDocument(options.branch, now) }
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

function renderInitSpecDocument(branch: string, timestamp: string): string {
  return `---
template: sdd-init-onboarding-spec-v1
version: 1.3.0
contract: sdd-spec-doc-v1
sdd_managed_starter: true
---

# Spec: Project Onboarding

## Metadata

- spec_id: \`onboarding\`
- branch: \`${branch}\`
- lifecycle_profile: \`direct\`
- source_request: \`Created by sdd init\`
- created_at: \`${timestamp}\`
- updated_at: \`${timestamp}\`

## Problem / Intent

This project has been initialized for SDD. Replace this onboarding spec with the first real feature or change request before implementation.

## Scope

### In Scope

- Confirm the project is initialized.
- Replace onboarding placeholders with a real spec, plan, and tasks when ready.

### Out of Scope

- Running background agents.
- Creating worktrees.
- Applying sync-back without explicit user approval.

## Requirements

### Functional Requirements

- FR-1: \`sdd init\` creates the SDD runtime config and starter semantic documents.
- FR-2: \`sdd status --branch ${branch}\` can inspect the initialized branch without missing document gaps.

### Non-functional Requirements

- NFR-1: Initialization must not overwrite user-authored SDD documents unless force is explicitly requested.

## Acceptance Criteria

- AC-1: \`sdd status --branch ${branch}\` reports all three semantic documents as present.
- AC-2: Existing user-authored semantic documents are preserved by default.

## Risks / Hard Gates

- Do not treat this onboarding scaffold as an approved implementation plan.

## Open Questions

- Replace this section with project-specific questions before implementation.

## Lifecycle Decision Reference

- decision_artifact: \`pending\`
- canonical_model: \`docs/architecture/lifecycle-decision-model.md\`
`;
}

function renderInitPlanDocument(branch: string, timestamp: string): string {
  return `---
template: sdd-init-onboarding-plan-v1
version: 1.3.0
contract: sdd-plan-doc-v1
sdd_managed_starter: true
---

# Plan: Project Onboarding

## Metadata

- spec_id: \`onboarding\`
- plan_id: \`onboarding\`
- branch: \`${branch}\`
- created_at: \`${timestamp}\`
- updated_at: \`${timestamp}\`

## Recommended Approach

Replace this starter plan with the technical approach for the first real feature or change request before implementation begins.

## Implementation Outline

1. Refine \`specs/${branch}/spec.md\` with a real request.
2. Refine this plan with concrete files, validation, and rollout notes.
3. Replace \`specs/${branch}/tasks.md\` with executable task blocks for the real work.
4. Run \`sdd status --branch ${branch}\` and inspect the selected task before implementation.

## Validation Strategy

- Run \`sdd status --branch ${branch}\` after replacing the starter docs.
- Add project-specific validation commands to each real task block.

## Safety Notes

- Do not run background agents from this starter plan.
- Do not create worktrees from this starter plan.
- Do not apply sync-back unless the user explicitly approves writing \`tasks.md\`.
`;
}

function renderInitTasksDocument(branch: string, timestamp: string): string {
  return `---
template: sdd-init-onboarding-tasks-v1
version: 1.3.0
contract: sdd-tasks-doc-v1
sdd_managed_starter: true
---

# Tasks: Project Onboarding

## Metadata

- spec_id: \`onboarding\`
- plan_id: \`onboarding\`
- branch: \`${branch}\`
- created_at: \`${timestamp}\`
- updated_at: \`${timestamp}\`

## Task List

### ONBOARDING-1: Replace starter SDD documents with the first real task

\`\`\`sdd-task
id: ONBOARDING-1
status: pending
wave: 1
depends_on: []
affected_files:
  - specs/${branch}/spec.md
  - specs/${branch}/plan.md
  - specs/${branch}/tasks.md
validation:
  - sdd status --branch ${branch}
risk: []
\`\`\`

#### Boundary

Allowed scope is limited to replacing this starter onboarding scaffold with project-specific SDD requirements, plan, and tasks. Do not create worktrees, start background agents, commit changes, or apply sync-back automatically.

#### Acceptance

- \`specs/${branch}/spec.md\` describes a real user request.
- \`specs/${branch}/plan.md\` describes a concrete technical approach and validation strategy.
- \`specs/${branch}/tasks.md\` contains executable task blocks for the real work.
- \`sdd status --branch ${branch}\` reports no blocking document or task parser gaps.

#### Implementation Notes

Created by \`sdd init\` as a safe onboarding placeholder. Replace before real implementation.

## Dependency Notes

- Single starter task only.
- The \`wave: 1\` field is present only because the current parser requires a positive wave value; it must not be interpreted as permission to run background agents or multi-wave orchestration.

## Phase Gate Checkpoint

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
  await mkdir(artifactsDir, { recursive: true });

  const now = new Date().toISOString();
  const state: RunState = {
    contract: RUN_STATE_CONTRACT,
    runtimeVersion: RUNTIME_VERSION,
    runId,
    status: 'created',
    phase: null,
    currentTask: null,
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
  return JSON.parse(raw) as RunState;
}

export async function writeRunState(projectRoot: string, state: RunState): Promise<void> {
  const nextState = {
    ...state,
    updatedAt: new Date().toISOString()
  };
  const statePath = path.join(getRunDir(projectRoot, state.runId), 'state.json');
  await writeFile(statePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
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
  return JSON.parse(raw) as LocalRunIndex;
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
    tasks: index.tasks.filter((task) => runIds.has(task.runId) && (!query.taskId || task.taskId === query.taskId)),
    delegations: index.delegations.filter((delegation) => runIds.has(delegation.runId) && (!query.taskId || delegation.taskId === query.taskId)),
    artifacts: index.artifacts.filter((artifact) => runIds.has(artifact.runId) && (!query.taskId || artifact.task === query.taskId) && (!query.artifact || artifact.path === query.artifact)),
    waves: index.waves.filter((wave) => runIds.has(wave.runId))
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

  for (const state of states) {
    for (const [taskId, taskState] of Object.entries(state.tasks)) {
      tasks.push({
        taskId,
        status: runtimeTaskStatus(taskState),
        runId: state.runId,
        runStatus: state.status,
        updatedAt: state.updatedAt
      });
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
    tasks: tasks.sort((left, right) => left.taskId.localeCompare(right.taskId) || left.runId.localeCompare(right.runId)),
    delegations: delegations.sort((left, right) => left.id.localeCompare(right.id)),
    artifacts: artifacts.sort((left, right) => left.path.localeCompare(right.path) || left.runId.localeCompare(right.runId)),
    waves: waves.sort((left, right) => left.runId.localeCompare(right.runId))
  };
}

export async function inspectRun(projectRoot: string, runId: string): Promise<RunInspection> {
  const state = await readRunState(projectRoot, runId);
  const events = await readRunEvents(projectRoot, runId);
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
    tasks: state.tasks
  };
}

export async function getProjectStatus(projectRoot: string, options: { branch?: string } = {}): Promise<ProjectStatus> {
  const branch = options.branch ?? 'master';
  const [model, runs] = await Promise.all([parseSddBranch(projectRoot, branch), listRuns(projectRoot)]);
  const pendingTask = model.tasks.find((task) => task.status === 'pending');
  const blockingGaps = model.gaps.filter((gap) => gap.severity === 'blocking');
  return {
    branch,
    documents: model.documents,
    tasks: {
      total: model.tasks.length,
      pending: model.tasks.filter((task) => task.status === 'pending').length,
      inProgress: model.tasks.filter((task) => task.status === 'in_progress').length,
      completed: model.tasks.filter((task) => task.status === 'completed').length,
      blocked: model.tasks.filter((task) => task.status === 'blocked').length,
      deferred: model.tasks.filter((task) => task.status === 'deferred').length,
      unknown: model.tasks.filter((task) => task.status === 'unknown').length,
      gaps: model.gaps.length
    },
    latestRun: runs[0] ?? null,
    recommendedNextCommand: blockingGaps.length > 0
      ? `sdd tasks gaps --branch ${branch}`
      : runs[0]?.syncBackStatus === 'proposed' && runs[0].currentTask
        ? `sdd sync-back inspect ${runs[0].runId} --branch ${branch} --task ${runs[0].currentTask}`
        : pendingTask
          ? `sdd tasks inspect ${pendingTask.id} --branch ${branch}`
          : `sdd tasks list --branch ${branch}`,
    gaps: model.gaps
  };
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

export async function inspectSyncBack(projectRoot: string, options: { runId: string; branch?: string; taskId?: string }): Promise<SyncBackInspection> {
  const branch = options.branch ?? 'master';
  const state = await readRunState(projectRoot, options.runId);
  const taskId = options.taskId ?? state.currentTask;
  const model = await parseSddBranch(projectRoot, branch);
  const reasons: string[] = [];
  let markdownTask: SddTask | null = null;
  let taskGaps: SddTaskGap[] = [];
  if (!taskId) {
    reasons.push('Run has no current task; pass --task <task_id>.');
  } else {
    const inspected = inspectSddTask(model, taskId);
    markdownTask = inspected.task;
    taskGaps = inspected.gaps;
    if (!inspected.task) {
      reasons.push(`Task ${taskId} is missing or ambiguous in specs/${branch}/tasks.md.`);
    }
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

  const runtimeGaps = taskId ? runtimeTaskGaps(state.tasks[taskId]) : [];
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

  const applyPolicy = deriveSyncBackApplyPolicy(state, markdownTask);

  return {
    runId: state.runId,
    branch,
    taskId,
    status: state.syncBack.status === 'applied' ? 'applied' : reasons.length === 0 ? 'ready' : 'blocked',
    reasons,
    proposalPath,
    proposal,
    runTaskStatus: taskId ? runtimeTaskStatus(state.tasks[taskId]) : null,
    markdownTask,
    markdownStatus: markdownTask?.status ?? null,
    targetTasksPath: model.tasksPath,
    artifacts: state.validation.evidence.length > 0 ? state.validation.evidence : state.artifacts.map((artifact) => artifact.path),
    gaps: [...taskGaps, ...runtimeGaps],
    applyPolicy
  };
}

export async function applySyncBack(projectRoot: string, options: { runId: string; branch?: string; taskId?: string; approved?: boolean }): Promise<SyncBackApplyResult> {
  const inspection = await inspectSyncBack(projectRoot, options);
  if (!inspection.taskId) {
    throw new Error('Cannot apply sync-back without a task id.');
  }
  if (inspection.status === 'blocked') {
    throw new Error(`Cannot apply sync-back for ${options.runId}: ${inspection.reasons.join(' ')}`);
  }
  if (!inspection.markdownTask) {
    throw new Error(`Cannot apply sync-back for ${options.runId}: target task is missing.`);
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
    throw new Error(`Cannot apply sync-back for ${options.runId}: ${inspection.applyPolicy.reasons.join(' ')} Re-run with --approved after human confirmation.`);
  }

  const state = await readRunState(projectRoot, options.runId);
  const tasksPath = inspection.markdownTask.source.filePath;
  const rawTasks = await readFile(tasksPath, 'utf8');
  const note = syncBackImplementationNote(state, inspection);
  const nextTasks = applySyncBackToTasksMarkdown(rawTasks, inspection.markdownTask, note);
  await writeFile(tasksPath, nextTasks, 'utf8');
  await writeRunState(projectRoot, {
    ...state,
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

  const appliedInspection = await inspectSyncBack(projectRoot, options);
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
    : { level: 'FAIL', check: 'git_repo', message: 'Current directory is not inside a Git repository.', action: 'Run sdd commands from a project Git repository.' });

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
  const gaps: SddTaskGap[] = [];

  if (!specExists) {
    gaps.push(documentGap('spec.md', 'Spec document is missing.', 'Create or restore specs/<branch>/spec.md before full SDD execution.'));
  }
  if (!planExists) {
    gaps.push(documentGap('plan.md', 'Plan document is missing.', 'Create or restore specs/<branch>/plan.md before task execution.'));
  }
  if (!tasksExists) {
    gaps.push(documentGap('tasks.md', 'Tasks document is missing.', 'Create specs/<branch>/tasks.md with sdd-task fenced blocks.'));
    return {
      branch,
      specPath,
      planPath,
      tasksPath,
      documents: { specExists, planExists, tasksExists },
      tasks: [],
      gaps
    };
  }

  const rawTasks = await readFile(tasksPath, 'utf8');
  const taskModel = parseSddTasksMarkdown(rawTasks, { tasksPath });
  if (taskModel.tasks.length === 0 && !path.basename(tasksPath).startsWith('phase')) {
    const retainedModel = await parseRetainedPhaseTasks(path.dirname(tasksPath));
    if (retainedModel.tasks.length > 0) {
      return {
        branch,
        specPath,
        planPath,
        tasksPath,
        documents: { specExists, planExists, tasksExists },
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
    documents: { specExists, planExists, tasksExists },
    tasks: taskModel.tasks,
    gaps: [...gaps, ...taskModel.gaps]
  };
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
  for (const blockMatch of fencedBlocks) {
    const block = blockMatch[1] ?? '';
    const blockStart = blockMatch.index ?? 0;
    const blockEnd = blockStart + blockMatch[0].length;
    const lineStart = lineNumberAt(raw, blockStart);
    const lineEnd = lineNumberAt(raw, blockEnd);
    const heading = nearestTaskHeading(raw.slice(0, blockStart));
    const metadata = parseSimpleYamlBlock(block);
    const id = scalarValue(metadata.id);
    const taskId = id || heading?.id || null;
    const section = raw.slice(blockEnd, nextTaskStart(raw, blockEnd));
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
  const branch = options.branch ?? 'master';
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
    lines.push(...(task.acceptance.length > 0
      ? task.acceptance.map((acceptance) => `- Acceptance ${acceptance}: TODO. Add validation evidence.`)
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
    return { valid: false, result: null, issues: [contractIssue('artifacts', messageFromError(error), 'Use a run-relative artifacts/<file> path. Source/test files belong in ## Evidence, not in sdd-result.artifacts.')] };
  }

  let raw: string;
  try {
    raw = await readArtifact(projectRoot, runId, artifactRootRelativePath);
  } catch (error) {
    return { valid: false, result: null, issues: [contractIssue('artifacts', `Cannot read artifact ${runRelativeArtifactPath}: ${messageFromError(error)}`, 'Create the expected artifact before marking the delegation complete.')] };
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
    boundaries: commandIntegrationBoundaries(profile)
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

export async function runSingleTaskLoop(projectRoot: string, options: SingleTaskLoopOptions): Promise<SingleTaskLoopResult> {
  const branch = options.branch ?? 'master';
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  const runState = options.runId ? await readRunState(projectRoot, options.runId) : await createRun(projectRoot);
  const runId = runState.runId;

  await appendEvent(projectRoot, runId, {
    event: 'phase_started',
    runId,
    summary: `Phase 3.15 ingestion-aware task loop started for ${options.taskId}`,
    data: { phase: 'do', branch, task: options.taskId }
  });

  if (!inspected.task || inspected.gaps.some((gap) => gap.severity === 'blocking')) {
    const gapArtifact = await writeArtifact(projectRoot, runId, `gap-report-${options.taskId}.md`, renderLoopGapReport(options.taskId, inspected.gaps));
    const proposal = await writeSyncBackProposal(projectRoot, runId, options.taskId, 'blocked', [gapArtifact.runRelativePath], inspected.gaps, 'Task selection is blocked by parser/task gaps.');
    await persistLoopState(projectRoot, runId, {
      status: 'blocked',
      phase: 'do',
      taskId: options.taskId,
      taskState: { status: 'blocked', gaps: inspected.gaps, artifacts: [gapArtifact.runRelativePath] },
      validationStatus: 'blocked',
      syncBackProposalPath: proposal.runRelativePath,
      artifacts: [{ path: gapArtifact.runRelativePath, kind: 'gap-report', task: options.taskId, agent: 'runtime' }]
    });
    await appendEvent(projectRoot, runId, {
      event: 'gap_detected',
      runId,
      summary: `Task ${options.taskId} is blocked before implementation.`,
      data: { gaps: inspected.gaps, artifact: gapArtifact.runRelativePath }
    });
    return {
      runId,
      taskId: options.taskId,
      status: 'blocked',
      task: inspected.task,
      gaps: inspected.gaps,
      requiredArtifacts: [],
      acceptedArtifacts: [gapArtifact.runRelativePath],
      syncBackProposalPath: proposal.runRelativePath,
      message: 'Task loop blocked before implementation by task gaps.'
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
        continue;
      }
      const gap = taskGap(options.taskId, step.agent, `${step.agent} artifact was not supplied; the task loop facade does not invoke external agents directly.`, `Run the ${step.agent} step in Claude Code and pass ${artifactOptionName(step.agent)} artifacts/<file>.`);
      gaps.push(gap);
      await appendEvent(projectRoot, runId, {
        event: 'delegation_failed',
        runId,
        summary: `${step.agent} artifact missing for ${options.taskId}`,
        data: { agent: step.agent, expectedArtifact: step.expectedArtifact }
      });
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
      gaps.push(taskGap(options.taskId, step.agent, `${step.agent} artifact ${step.suppliedArtifact} could not be ingested: ${issueText}`, `Fix ${step.suppliedArtifact} so the Phase 3 executor can ingest one valid sdd-result block for ${step.agent}/${options.taskId}.`));
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

  return {
    runId,
    taskId: options.taskId,
    status: terminalStatus,
    task: inspected.task,
    gaps,
    requiredArtifacts: steps.map((step) => step.expectedArtifact),
    acceptedArtifacts,
    syncBackProposalPath: proposal.runRelativePath,
    message: terminalStatus === 'completed' ? 'Task loop completed through Phase 3 executor artifact ingestion.' : validationStatus === 'pass_with_gaps' ? 'Task loop blocked because validator returned PASS_WITH_GAPS; inspect gap report and sync-back proposal.' : 'Task loop stopped; inspect gap report and sync-back proposal.'
  };
}

export async function runGoalVerify(projectRoot: string, options: GoalVerifyOptions): Promise<GoalVerifyResult> {
  const branch = options.branch ?? 'master';
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  const runId = options.runId;
  const state = await readRunState(projectRoot, runId);
  const reviewArtifact = options.reviewArtifact ?? artifactPathForAgent(state, options.taskId, 'reviewer');
  const validationArtifact = options.validationArtifact ?? artifactPathForAgent(state, options.taskId, 'validator');
  const gaps: SddTaskGap[] = [...inspected.gaps];
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
    for (const acceptance of inspected.task.acceptance) {
      const covered = validationRaw.toLowerCase().includes(acceptance.toLowerCase());
      acceptanceCoverage.push({
        acceptance,
        status: covered ? statusFromValidation(validationStatus) : 'GAP',
        evidence: covered ? `Mentioned in ${validationArtifact}.` : 'No matching acceptance evidence found in validator artifact.'
      });
      if (!covered) {
        gaps.push(taskGap(options.taskId, 'acceptance_coverage', `Acceptance item is not covered by validator evidence: ${acceptance}`, 'Update the validator artifact so it includes the exact Acceptance text, preferably under ## Acceptance Mapping; use sdd artifact template to generate the mapping skeleton.'));
      }
    }
  }

  const status = deriveGoalVerifyStatus(reviewStatus, validationStatus, gaps);
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
    message: status === 'PASS' ? 'Goal-level verify passed with explicit acceptance coverage.' : 'Goal-level verify found gaps; inspect coverage artifact and sync-back proposal.'
  };
}

export function renderGoalVerifyResult(result: GoalVerifyResult): string {
  return JSON.stringify({
    runId: result.runId,
    taskId: result.taskId,
    status: result.status,
    message: result.message,
    reviewArtifact: result.reviewArtifact,
    validationArtifact: result.validationArtifact,
    coverageArtifactPath: result.coverageArtifactPath,
    syncBackProposalPath: result.syncBackProposalPath,
    commands: result.commands,
    acceptanceCoverage: result.acceptanceCoverage,
    gaps: result.gaps
  }, null, 2);
}

export function renderSingleTaskLoopResult(result: SingleTaskLoopResult): string {
  return JSON.stringify({
    runId: result.runId,
    taskId: result.taskId,
    status: result.status,
    message: result.message,
    acceptedArtifacts: result.acceptedArtifacts,
    requiredArtifacts: result.requiredArtifacts,
    syncBackProposalPath: result.syncBackProposalPath,
    gaps: result.gaps
  }, null, 2);
}

export function renderLifecycleDecisionGate(result: LifecycleDecisionGateResult): string {
  const decision = result.record.decision;
  const lines = [
    'Lifecycle Decision Gate',
    `profile=${decision.profile ?? 'unknown'}`,
    `confidence=${decision.confidence ?? 'unknown'}`,
    `checkpoint_required=${decision.human_checkpoint_required}`,
    `hard_gates=${decision.hard_gate_hits.join(',') || 'none'}`,
    `required_stages=${decision.required_stages.join(' -> ') || 'none'}`,
    `skipped_stages=${decision.skipped_stages.join(',') || 'none'}`,
    'Reasons:'
  ];
  for (const reason of result.record.reasons) {
    lines.push(`- ${reason}`);
  }
  lines.push('Escalation triggers:');
  for (const trigger of result.record.escalation_triggers) {
    lines.push(`- ${trigger}`);
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
  return JSON.stringify({ task, gaps }, null, 2);
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
  const branch = options.branch ?? 'master';
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
  const branch = options.branch ?? 'master';
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
  const branch = options.branch ?? 'master';
  const agent = options.agent ?? 'implementer';
  const workerAdapterId = options.workerAdapterId ?? 'sdd-cli-task-worker';
  const runState = options.runId ? await readRunState(projectRoot, options.runId) : await createRun(projectRoot);
  const runId = runState.runId;
  const worker = await inspectWorkerAdapterContract(projectRoot, workerAdapterId);
  const issues: ContractValidationIssue[] = [];

  if (!worker) {
    issues.push(contractIssue('workerAdapterId', `Worker adapter ${workerAdapterId} is not declared.`, 'Use a worker adapter declared by the Phase 3.5 worker adapter contract.'));
  }
  if (worker?.kind === 'manual_handoff') {
    issues.push(contractIssue('workerAdapterId', `Worker adapter ${workerAdapterId} is manual handoff only.`, 'Use a runnable worker adapter for background executor claim/run/ingest.'));
  }

  const inspected = inspectSddTask(await parseSddBranch(projectRoot, branch), options.taskId);
  if (!inspected.task || inspected.gaps.some((gap) => gap.severity === 'blocking')) {
    issues.push(...inspected.gaps.map((gap) => contractIssue(gap.field, gap.message, gap.recommendation)));
  }

  const decision = await inspectWorktreeIsolation(projectRoot, { branch, taskId: options.taskId, capabilityId: worker?.capabilityId ?? 'sdd-cli' });
  if (decision.mode === 'blocked' || decision.mode === 'manual') {
    for (const reason of decision.reasons) {
      issues.push(contractIssue('isolation', reason, 'Resolve isolation gates or use explicit worktree/manual routing before running the background executor.'));
    }
  }

  const delegationId = options.delegationId ?? `B-${options.taskId}-${agent}-001`;
  const expectedArtifact = options.artifactPath ? getRunRelativeArtifactPath(toArtifactRootRelativePath(options.artifactPath)) : `artifacts/${agent}-${options.taskId}.md`;
  const existingDelegation = runState.delegations[delegationId];
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

export async function runWaveExecutor(projectRoot: string, options: WaveExecutorRunOptions = {}): Promise<WaveExecutorResult> {
  const branch = options.branch ?? 'master';
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
  const lines = [`${report.status}`];
  for (const check of report.checks) {
    const action = check.action ? ` Action: ${check.action}` : '';
    lines.push(`[${check.level}] ${check.check}: ${check.message}${action}`);
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

function renderLoopGapReport(taskId: string, gaps: SddTaskGap[]): string {
  return `# Gap Report ${taskId}\n\n\`\`\`sdd-result\ncontract: ${SDD_RESULT_CONTRACT}\nversion: ${SDD_RESULT_VERSION}\nagent: runtime\ntask: ${taskId}\nstatus: BLOCKED\nartifacts:\n  - artifacts/gap-report-${taskId}.md\n\`\`\`\n\n## Gaps\n\n${gaps.length > 0 ? gaps.map((gap) => `- [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message} Recommendation: ${gap.recommendation}`).join('\n') : '- No structured gaps were provided; inspect task selection and supplied artifacts.'}\n`;
}

function renderAcceptanceCoverageArtifact(taskId: string, status: GoalVerifyStatus, task: SddTask | null, reviewArtifact: string | null, validationArtifact: string | null, coverage: AcceptanceCoverageItem[], gaps: SddTaskGap[]): string {
  return `# Acceptance Coverage ${taskId}\n\n\`\`\`sdd-result\ncontract: ${SDD_RESULT_CONTRACT}\nversion: ${SDD_RESULT_VERSION}\nagent: validator\ntask: ${taskId}\nstatus: ${status}\nartifacts:\n  - artifacts/acceptance-coverage-${taskId}.md\n\`\`\`\n\n## Source Evidence\n\n- review_artifact: ${reviewArtifact ?? 'missing'}\n- validation_artifact: ${validationArtifact ?? 'missing'}\n- task_source: ${task ? sourceLocationEvidence(task.source) : 'missing'}\n\n## Commands Declared\n\n${task && task.validation.length > 0 ? task.validation.map((command) => `- ${command}`).join('\n') : '- none'}\n\n## Acceptance Mapping\n\n${coverage.length > 0 ? coverage.map((item) => `- [${item.status}] ${item.acceptance} Evidence: ${item.evidence}`).join('\n') : '- No acceptance items available.'}\n\n## Gaps\n\n${gaps.length > 0 ? gaps.map((gap) => `- [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message} Recommendation: ${gap.recommendation}`).join('\n') : '- none'}\n`;
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
  const branch = options.branch ?? 'master';
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
  return `contract: ${config.contract}\nproject:\n  name: ${config.project.name}\n  language: ${config.project.language}\n  framework: ${config.project.framework}\n${detection}sdd:\n  spec_dir: ${config.sdd.spec_dir}\n  docs_language: ${config.sdd.docs_language}\n  compatible_with: ${config.sdd.compatible_with}\nvalidation:\n  default:\n${config.validation.default.map((command) => `    - ${command}`).join('\n')}\nediting:\n  prefer_hashline: ${config.editing.prefer_hashline}\n  native_edit_fallback: ${config.editing.native_edit_fallback}\nruntime:\n  background_write: ${config.runtime.background_write}\n  worktree_isolation: ${config.runtime.worktree_isolation}\n  sync_back_mode: ${config.runtime.sync_back_mode}\nlifecycle:\n  decision_required: ${config.lifecycle.decision_required}\n  profiles:\n${config.lifecycle.profiles.map((profile) => `    - ${profile}`).join('\n')}\n`;
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
    }
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
      items.push(trimmed.slice(2).trim());
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
      result[key] = value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
      currentListKey = null;
    } else {
      result[key] = value;
      currentListKey = null;
    }
  }

  return result;
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
  const matches = Array.from(prefix.matchAll(/^###\s+(.+)$/gm));
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

function nextTaskStart(raw: string, offset: number): number {
  const next = raw.slice(offset).search(/^###\s+/m);
  return next < 0 ? raw.length : offset + next;
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
  const sectionPattern = `^####\\s+${escaped}\\s*$([\\s\\S]*?)(?=^####\\s+|^###\\s+|$(?![\\s\\S]))`;
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
    checks.push({ level: 'PASS', check: 'run_evidence', message: `Inspected ${inspected.length} run(s); no stale delegation, invalid artifact, or terminal event gap found.` });
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

function normalizePortablePath(value: string): string {
  return path.posix.normalize(value.replace(/\\/g, '/'));
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

function assertSafePathSegment(value: string, field: string): void {
  if (value === '.' || value === '..') {
    throw new Error(`${field} cannot be . or ...`);
  }
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(`${field} must contain only letters, digits, dot, underscore, or dash.`);
  }
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
