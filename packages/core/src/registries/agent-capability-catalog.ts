import { AGENT_CAPABILITY_CATALOG_CONTRACT_VERSION } from '../contracts.js';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';
import { readFile } from 'node:fs/promises';

export type AgentCapabilityDomain = 'norm_discovery' | 'uncertainty_resolution' | 'performance_planning' | 'verification_design' | 'evidence_collection' | 'sync_back_risk_review' | 'release_summary' | 'context_curation';
export type AgentCapabilityStage = 'spec' | 'plan' | 'tasks' | 'verifies' | 'test' | 'do' | 'verify' | 'sync-back' | 'ship';
export type AgentCapabilityAuthority = 'advisory_only' | 'gate_evidence' | 'validation_runner';
export type MaterialPackLoadPolicy = 'route_when_triggered' | 'summary_only' | 'never_inline';

export interface AgentCapabilityMaterialPack {
  id: string;
  summary: string;
  triggerStages: AgentCapabilityStage[];
  triggerKeywords: string[];
  loadPolicy: MaterialPackLoadPolicy;
  sourceId: string;
  contextBudget: 'tiny' | 'small' | 'medium';
}

export interface AgentCapabilityCatalogEntry {
  version: typeof AGENT_CAPABILITY_CATALOG_CONTRACT_VERSION;
  id: string;
  domain: AgentCapabilityDomain;
  stages: AgentCapabilityStage[];
  inputs: string[];
  outputs: string[];
  authority: AgentCapabilityAuthority;
  routing: {
    riskTags: string[];
    projectStackTags: string[];
    confidenceThreshold: number;
    materialPackIds: string[];
  };
  provenance: {
    sourceId: string;
    sourceVersion: string;
    quarantineRequired: boolean;
  };
}

export interface CapabilityCommandMapping {
  command: AgentCapabilityStage;
  requiredDomains: AgentCapabilityDomain[];
  optionalDomains: AgentCapabilityDomain[];
  forbiddenAuthority: AgentCapabilityAuthority[];
  materialPolicy: MaterialPackLoadPolicy;
}

export interface AgentCapabilityCatalog {
  version: typeof AGENT_CAPABILITY_CATALOG_CONTRACT_VERSION;
  capabilities: AgentCapabilityCatalogEntry[];
  materialPacks: AgentCapabilityMaterialPack[];
  commandMappings: CapabilityCommandMapping[];
}

export interface AgentCapabilityCatalogValidation {
  version: typeof AGENT_CAPABILITY_CATALOG_CONTRACT_VERSION;
  valid: boolean;
  issues: string[];
  catalog: AgentCapabilityCatalog;
}

const MATERIAL_PACKS: AgentCapabilityMaterialPack[] = [
  { id: 'project-norms', summary: 'Project conventions, coding standards, and existing-spec alignment cues.', triggerStages: ['spec', 'plan', 'tasks'], triggerKeywords: ['规范', 'convention', 'standard', 'style', 'compatibility'], loadPolicy: 'route_when_triggered', sourceId: 'project_context_pack', contextBudget: 'small' },
  { id: 'uncertainty-map', summary: 'Decision-boundary prompts for resolving unknowns from repo evidence before asking the user.', triggerStages: ['spec', 'plan'], triggerKeywords: ['uncertain', 'unknown', 'ambiguous', '不确定', '边界'], loadPolicy: 'summary_only', sourceId: 'harness_learning', contextBudget: 'tiny' },
  { id: 'performance-risk', summary: 'Planning checks for token, context, IO, runtime, and validation cost risks.', triggerStages: ['plan', 'tasks'], triggerKeywords: ['performance', 'token', 'context', 'latency', 'cost', '性能'], loadPolicy: 'summary_only', sourceId: 'skill_agent_eval', contextBudget: 'tiny' },
  { id: 'verification-design', summary: 'Acceptance-to-evidence design patterns for verify.md and runtime evidence handoff.', triggerStages: ['verifies', 'test', 'verify'], triggerKeywords: ['verify', 'evidence', 'validation', 'acceptance', '验收'], loadPolicy: 'route_when_triggered', sourceId: 'verify_contract', contextBudget: 'small' },
  { id: 'sync-back-risk', summary: 'Risk checks for applying semantic completion back into tasks and release state.', triggerStages: ['sync-back', 'ship'], triggerKeywords: ['sync-back', 'ship', 'release', 'apply', '发布'], loadPolicy: 'summary_only', sourceId: 'governance_policy', contextBudget: 'tiny' }
];

const CAPABILITIES: AgentCapabilityCatalogEntry[] = [
  capability('cap.norm-discovery', 'norm_discovery', ['spec', 'plan', 'tasks'], ['user request', 'project docs', 'existing specs', 'affected files'], ['norm alignment finding', 'scope constraint'], 'advisory_only', ['compatibility', 'style', 'architecture'], ['project-norms'], 'project_context_pack'),
  capability('cap.uncertainty-resolution', 'uncertainty_resolution', ['spec', 'plan'], ['user request', 'repo evidence', 'open gaps'], ['resolved assumption', 'question checkpoint', 'blocked gap'], 'advisory_only', ['ambiguous', 'high_risk'], ['uncertainty-map'], 'harness_learning'),
  capability('cap.performance-planning', 'performance_planning', ['plan', 'tasks'], ['target design', 'runtime path', 'context usage', 'validation cost'], ['performance impact note', 'token risk note', 'validation cost control'], 'advisory_only', ['performance', 'context_budget', 'token_risk'], ['performance-risk'], 'skill_agent_eval'),
  capability('cap.verification-design', 'verification_design', ['verifies', 'test', 'verify'], ['tasks.md', 'verify.md', 'acceptance refs', 'runtime evidence'], ['verification matrix', 'evidence requirement', 'policy boundary'], 'gate_evidence', ['acceptance', 'evidence', 'policy'], ['verification-design'], 'verify_contract'),
  capability('cap.evidence-collection', 'evidence_collection', ['test', 'do', 'verify'], ['validation command', 'artifact refs', 'run state'], ['command evidence', 'artifact ref', 'provenance ref'], 'validation_runner', ['validation', 'runtime_evidence'], ['verification-design'], 'test_runtime'),
  capability('cap.sync-back-risk-review', 'sync_back_risk_review', ['sync-back'], ['verify decision', 'sync-back proposal', 'tasks.md'], ['apply risk note', 'approval requirement'], 'gate_evidence', ['shared_state', 'semantic_update'], ['sync-back-risk'], 'governance_policy'),
  capability('cap.release-summary', 'release_summary', ['ship'], ['task status', 'doctor report', 'pack output', 'git state'], ['release readiness summary', 'blocked release gap'], 'advisory_only', ['release', 'external_state'], ['sync-back-risk'], 'governance_policy'),
  capability('cap.context-curation', 'context_curation', ['spec', 'plan', 'do', 'verify', 'ship'], ['material packs', 'context budget', 'run summaries'], ['context pack selection', 'excluded material list'], 'advisory_only', ['context_budget', 'prompt_bloat'], ['project-norms', 'uncertainty-map', 'performance-risk'], 'project_context_pack')
];

const COMMAND_MAPPINGS: CapabilityCommandMapping[] = [
  { command: 'spec', requiredDomains: ['norm_discovery', 'uncertainty_resolution'], optionalDomains: ['context_curation'], forbiddenAuthority: ['validation_runner'], materialPolicy: 'summary_only' },
  { command: 'plan', requiredDomains: ['norm_discovery', 'performance_planning'], optionalDomains: ['uncertainty_resolution', 'context_curation'], forbiddenAuthority: ['validation_runner'], materialPolicy: 'summary_only' },
  { command: 'verifies', requiredDomains: ['verification_design'], optionalDomains: ['context_curation'], forbiddenAuthority: ['validation_runner'], materialPolicy: 'route_when_triggered' },
  { command: 'test', requiredDomains: ['evidence_collection'], optionalDomains: ['verification_design'], forbiddenAuthority: [], materialPolicy: 'route_when_triggered' },
  { command: 'verify', requiredDomains: ['verification_design', 'evidence_collection'], optionalDomains: ['context_curation'], forbiddenAuthority: [], materialPolicy: 'route_when_triggered' },
  { command: 'sync-back', requiredDomains: ['sync_back_risk_review'], optionalDomains: ['context_curation'], forbiddenAuthority: ['validation_runner'], materialPolicy: 'summary_only' },
  { command: 'ship', requiredDomains: ['release_summary', 'sync_back_risk_review'], optionalDomains: ['context_curation'], forbiddenAuthority: ['validation_runner'], materialPolicy: 'summary_only' }
];

export async function inspectAgentCapabilityCatalog(projectRoot: string): Promise<AgentCapabilityCatalog> {
  await assertProjectConfigReadable(projectRoot);
  return {
    version: AGENT_CAPABILITY_CATALOG_CONTRACT_VERSION,
    capabilities: [...CAPABILITIES].sort((left, right) => left.id.localeCompare(right.id)),
    materialPacks: [...MATERIAL_PACKS].sort((left, right) => left.id.localeCompare(right.id)),
    commandMappings: [...COMMAND_MAPPINGS].sort((left, right) => left.command.localeCompare(right.command))
  };
}

export async function validateAgentCapabilityCatalog(projectRoot: string): Promise<AgentCapabilityCatalogValidation> {
  const catalog = await inspectAgentCapabilityCatalog(projectRoot);
  const issues = validateCatalog(catalog);
  return {
    version: AGENT_CAPABILITY_CATALOG_CONTRACT_VERSION,
    valid: issues.length === 0,
    issues,
    catalog
  };
}

function capability(id: string, domain: AgentCapabilityDomain, stages: AgentCapabilityStage[], inputs: string[], outputs: string[], authority: AgentCapabilityAuthority, riskTags: string[], materialPackIds: string[], sourceId: string): AgentCapabilityCatalogEntry {
  return {
    version: AGENT_CAPABILITY_CATALOG_CONTRACT_VERSION,
    id,
    domain,
    stages,
    inputs,
    outputs,
    authority,
    routing: {
      riskTags,
      projectStackTags: ['generic'],
      confidenceThreshold: 0.65,
      materialPackIds
    },
    provenance: {
      sourceId,
      sourceVersion: '0.3.0',
      quarantineRequired: false
    }
  };
}

function validateCatalog(catalog: AgentCapabilityCatalog): string[] {
  const issues: string[] = [];
  const packIds = new Set(catalog.materialPacks.map((pack) => pack.id));
  const domains = new Set(catalog.capabilities.map((entry) => entry.domain));
  for (const capability of catalog.capabilities) {
    if (capability.stages.length === 0) {
      issues.push(`${capability.id}: stages are required.`);
    }
    if (capability.inputs.length === 0 || capability.outputs.length === 0) {
      issues.push(`${capability.id}: inputs and outputs are required.`);
    }
    if (capability.routing.confidenceThreshold <= 0 || capability.routing.confidenceThreshold > 1) {
      issues.push(`${capability.id}: confidence threshold must be within (0, 1].`);
    }
    for (const packId of capability.routing.materialPackIds) {
      if (!packIds.has(packId)) {
        issues.push(`${capability.id}: unknown material pack ${packId}.`);
      }
    }
  }
  for (const mapping of catalog.commandMappings) {
    for (const domain of mapping.requiredDomains) {
      if (!domains.has(domain)) {
        issues.push(`${mapping.command}: required domain ${domain} is missing.`);
      }
    }
    if (mapping.materialPolicy === 'never_inline') {
      issues.push(`${mapping.command}: command mappings may not request never_inline as the active loading policy.`);
    }
  }
  return issues;
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
