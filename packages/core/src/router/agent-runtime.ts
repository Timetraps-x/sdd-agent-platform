import {
  AGENT_EXECUTION_RECORD_CONTRACT_VERSION,
  AGENT_ROUTER_CONTRACT_VERSION,
  AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
  CAPABILITY_SOURCE_CATALOG_VERSION,
  EVIDENCE_INGESTION_CONTRACT_VERSION,
  EXTERNAL_AGENT_PACK_IMPORT_POLICY_VERSION,
  HOST_ADAPTER_CONTRACT_VERSION,
  TEAM_MODE_POLICY_VERSION,
  TEAM_SESSION_RECORD_CONTRACT_VERSION,
  TOOL_PERMISSION_SPEC_VERSION
} from '../contracts.js';
import type { LifecycleAutonomyCeiling } from '../lifecycle/decision-gate.js';
import type { ArtifactResultIngestionStatus } from '../artifacts/ingestion.js';
import type { SddResultStatus } from '../artifacts/sdd-result.js';
import type { RouteCacheMetadata, RuntimeProfileSpan, TeamModeActivation } from './route-cache.js';

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
export type TeamModeSelection = 'off' | 'inspect' | 'review-lite' | 'hyperplan' | 'security-research';
export type TeamModeCostClass = 'none' | 'low' | 'medium' | 'high';
export type TeamModeCostRoute = 'not_applicable' | 'downgraded' | 'no_downgrade' | 'blocked';
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
  costRoute: TeamModeCostRoute;
  downgradeReason: string | null;
  trustPolicyEnforced: boolean;
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
  routeId: string;
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
  cache?: RouteCacheMetadata;
  profile?: RuntimeProfileSpan[];
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
