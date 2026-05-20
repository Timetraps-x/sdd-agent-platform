import {
  AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
  EVIDENCE_INGESTION_CONTRACT_VERSION,
  HOST_ADAPTER_CONTRACT_VERSION
} from '../contracts.js';

type LifecycleAutonomyCeiling =
  | 'direct_execution_allowed'
  | 'compact_boundary_only'
  | 'full_sdd_with_checkpoint'
  | 'research_before_implementation';

type BuiltInAgentProfileId = 'planner' | 'architect' | 'implementer' | 'reviewer' | 'validator' | 'researcher' | 'orchestrator' | 'security' | 'domain_expert';
type AgentProfileId = BuiltInAgentProfileId | string;

interface BuiltInAgentProfileContract {
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

interface BuiltInModelPolicyContract {
  id: string;
  category: string;
  fallbackPolicy: string;
  hostProjection: string;
}

interface BuiltInHostAdapterContract {
  version: typeof HOST_ADAPTER_CONTRACT_VERSION;
  id: string;
  host: string;
  responsibilities: string[];
  forbiddenAuthority: string[];
  projections: string[];
}

interface BuiltInEvidenceIngestionContract {
  version: typeof EVIDENCE_INGESTION_CONTRACT_VERSION;
  sourceOutputs: string[];
  evidenceTargets: string[];
  canonicalTruth: string;
  forbiddenTruthSources: string[];
}

interface BuiltInDelegationWavePolicy {
  id: string;
  waveKind: 'hyperplan' | 'security_research' | 'implementation_review' | 'validation';
  memberProfiles: AgentProfileId[];
  requiredArtifacts: string[];
  fileOwnershipRequired: boolean;
  mergeGate: string;
}

export const BUILT_IN_AGENT_PROFILES: BuiltInAgentProfileContract[] = [
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

export const BUILT_IN_MODEL_POLICIES: BuiltInModelPolicyContract[] = [
  { id: 'balanced', category: 'default', fallbackPolicy: 'use host default fallback', hostProjection: 'Project the SDD profile and risk ceiling; host selects configured model.' },
  { id: 'reasoning', category: 'planning_review', fallbackPolicy: 'prefer stronger reasoning model, fall back to host default', hostProjection: 'Use for planning, architecture, review, routing and synthesis tasks.' },
  { id: 'security_review', category: 'security', fallbackPolicy: 'prefer security-capable review model, block if host policy forbids security research', hostProjection: 'Authorized defensive security review only; non-destructive evidence required.' }
];

export const BUILT_IN_HOST_ADAPTER_CONTRACT: BuiltInHostAdapterContract = {
  version: HOST_ADAPTER_CONTRACT_VERSION,
  id: 'claude-code-host-adapter',
  host: 'Claude Code / future host adapter',
  responsibilities: ['project SDD router decisions to host subagents, skills, MCPs and shell tools', 'return host session/task id, status, output, artifacts and tool summary', 'record host output as provenance'],
  forbiddenAuthority: ['task lifecycle truth', 'completion state', 'risk gate authority', 'sync-back authority', 'required artifact policy'],
  projections: ['short profile prompt projection', 'tool permission summary', 'model policy category', 'required evidence targets']
};

export const BUILT_IN_EVIDENCE_INGESTION_CONTRACT: BuiltInEvidenceIngestionContract = {
  version: EVIDENCE_INGESTION_CONTRACT_VERSION,
  sourceOutputs: ['subagent summary', 'command output', 'browser snapshot', 'MCP result', 'team message', 'blocked host execution'],
  evidenceTargets: ['sdd-result-v1', 'AgentExecutionRecord', 'TeamSessionRecord', 'TeamMessageRecord', 'implementation artifact', 'review artifact', 'validation artifact', 'security findings artifact'],
  canonicalTruth: 'SDD artifacts, run state/events, verify and doctor decide completion state.',
  forbiddenTruthSources: ['host session status alone', 'tmux pane state', 'external prompt summary alone', 'MCP output without SDD evidence mapping']
};

export const BUILT_IN_DELEGATION_WAVES: BuiltInDelegationWavePolicy[] = [
  { id: 'hyperplan', waveKind: 'hyperplan', memberProfiles: ['architect', 'reviewer', 'security', 'validator', 'researcher'], requiredArtifacts: ['plan-risk artifact'], fileOwnershipRequired: false, mergeGate: 'implementation blocks while hard plan gaps remain' },
  { id: 'security_research', waveKind: 'security_research', memberProfiles: ['security', 'security', 'researcher', 'reviewer', 'validator'], requiredArtifacts: ['security findings artifact', 'remediation recommendation'], fileOwnershipRequired: false, mergeGate: 'authorized non-destructive findings are severity-calibrated before implementation' },
  { id: 'implementation_review', waveKind: 'implementation_review', memberProfiles: ['reviewer', 'architect', 'security'], requiredArtifacts: ['review artifact'], fileOwnershipRequired: true, mergeGate: 'file ownership conflicts and review gaps block merge' },
  { id: 'validation', waveKind: 'validation', memberProfiles: ['validator', 'reviewer'], requiredArtifacts: ['validation artifact'], fileOwnershipRequired: false, mergeGate: 'acceptance evidence is required before verify PASS' }
];
