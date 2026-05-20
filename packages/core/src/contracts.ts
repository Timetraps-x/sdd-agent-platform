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
export const SDD_EVIDENCE_CONTRACT = 'sdd-evidence-v1';
export const SDD_EVIDENCE_VERSION = '1.0.0';
export const ACCEPTANCE_POLICY_RULESET_VERSION = 'acceptance-policy-v1';
export const INVOCATION_LEDGER_CONTRACT_VERSION = 'phase-6.9-invocation-ledger-v1';
export const ROUTE_CACHE_CONTRACT_VERSION = 'phase-6.9-route-cache-v1';
export const RUNTIME_PROFILE_CONTRACT_VERSION = 'phase-6.9-runtime-profile-v1';
export const CONTEXT_BUDGET_CONTRACT_VERSION = 'phase-6.10-context-budget-v1';
export const COMMAND_OUTPUT_SUMMARY_CONTRACT_VERSION = 'sdd-command-output-summary-v1';
export const EVIDENCE_SUMMARY_CONTRACT_VERSION = 'sdd-evidence-summary-v1';
export const CONTEXT_PACKAGE_CONTRACT_VERSION = 'sdd-context-package-v1';
export const LOG_WORKER_SUMMARY_CONTRACT_VERSION = 'sdd-log-worker-summary-v1';
export const RUNTIME_ANALYSIS_CONTRACT_VERSION = 'phase-7-runtime-analysis-v1';
export const WORKFLOW_STATE_RESOLVER_CONTRACT_VERSION = 'phase-7.3-workflow-state-resolver-v1';
export const VERIFY_DOCUMENT_CONTRACT_VERSION = 'sdd-verify-doc-v1';
export const AGENT_CAPABILITY_CATALOG_CONTRACT_VERSION = 'phase-7.6-agent-capability-catalog-v1';
export const COMMAND_TEAM_RUNTIME_CONTRACT_VERSION = 'phase-7.7-command-team-runtime-v1';
export const RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION = 'sdd-runtime-projection-envelope-v1';
export const CODING_FACT_SET_CONTRACT_VERSION = 'sdd-coding-fact-set-v1';
export const CODING_RISK_PROFILE_CONTRACT_VERSION = 'sdd-coding-risk-profile-v1';
export const LIFECYCLE_RISK_DECISION_CONTRACT_VERSION = 'sdd-lifecycle-risk-decision-v1';
export const STAGE_RUN_CONTRACT_VERSION = 'sdd-stage-run-v1';
export const WORKFLOW_HANDOFF_CONTRACT_VERSION = 'sdd-workflow-handoff-v1';
export const WORK_UNIT_CONTRACT_VERSION = 'sdd-work-unit-v1';
export const SUBAGENT_DEFINITION_CONTRACT_VERSION = 'sdd-subagent-definition-v1';
export const SUBAGENT_DISPATCH_CONTRACT_VERSION = 'sdd-subagent-dispatch-v1';
export const SUBAGENT_RESULT_CONTRACT_VERSION = 'sdd-subagent-result-v1';
export const CONTEXT_LOAD_SIGNAL_CONTRACT_VERSION = 'sdd-context-load-signal-v1';
export const CONTEXT_OFFLOAD_DECISION_CONTRACT_VERSION = 'sdd-context-offload-decision-v1';
export const SCOPED_CONTEXT_HANDOFF_CONTRACT_VERSION = 'sdd-scoped-context-handoff-v1';
export const TEST_EVIDENCE_RUN_CONTRACT_VERSION = 'sdd-test-evidence-run-v1';
export const MODEL_PRODUCED_ARTIFACT_CONTRACT_VERSION = 'sdd-model-produced-artifact-v1';

export type RuntimeConfidence = 'high' | 'medium' | 'low';
export type RuntimeProjectionStaleness = 'fresh' | 'stale' | 'incompatible' | 'unknown';
export type SddStage = 'spec' | 'plan' | 'tasks' | 'verifies' | 'do' | 'test' | 'goal-verify' | 'sync-back' | 'ship';
export type RuntimeRefKind = 'document' | 'task' | 'run' | 'artifact' | 'projection' | 'evidence' | 'command' | 'external';

export interface RuntimeScope {
  branch: string;
  taskId?: string;
  runId?: string;
  changeRef?: string;
}

export interface RuntimeRef {
  kind: RuntimeRefKind;
  ref: string;
  hash?: string;
}

export interface RuntimeProjectionEnvelope<TPayload> {
  contract: typeof RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION;
  projectionType: string;
  scopeKey: string;
  id: string;
  inputHash: string;
  producer: string;
  producerVersion: string;
  generatedAt: string;
  staleReason?: string;
  payload: TPayload;
}

export interface ModelProducedArtifact {
  contract: typeof MODEL_PRODUCED_ARTIFACT_CONTRACT_VERSION;
  producer: 'main-agent' | 'co-main-agent' | 'subagent';
  authority: 'stage-owned' | 'candidate' | 'non-authoritative';
  allowedUse: Array<'summary' | 'diagnostic' | 'test-suggestion' | 'evidence-candidate'>;
  forbiddenUse: Array<'final-risk-decision' | 'stage-completion' | 'ship-gate-pass'>;
  artifactRefs: string[];
  reviewedByRuntime: boolean;
}