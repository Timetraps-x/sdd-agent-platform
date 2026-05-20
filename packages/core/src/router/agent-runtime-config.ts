import { readProjectConfig } from '../config/project-config.js';
import type { ProjectConfig } from '../config/project-config.js';
import { AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION, CAPABILITY_SOURCE_CATALOG_VERSION } from '../contracts.js';
import { BUILT_IN_AGENT_PROFILES } from '../registries/agent-runtime-static.js';
import type { LifecycleAutonomyCeiling } from '../lifecycle/decision-gate.js';
import type {
  AgentProfileContract,
  AgentRouterCategory,
  AgentRuntimeAdapterMapping,
  AgentRuntimeRoutingRule,
  CapabilityReuseDecision,
  CapabilitySourceCatalogEntry,
  CapabilitySourceKind,
  ProjectAgentRuntimeConfig,
  SkillCapabilityContract,
  SkillCapabilityEvidenceType,
  SkillCapabilityKind,
  SkillCapabilitySource
} from './agent-runtime.js';

interface ParsedYamlObject {
  scalars: Record<string, string>;
  lists: Record<string, string[]>;
  nested: Record<string, ParsedYamlObject>;
}

export function parseAgentRuntimeConfig(raw: string): ProjectAgentRuntimeConfig | undefined {
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

export function readAgentRuntimeProjectConfig(projectRoot: string): Promise<ProjectConfig<ProjectAgentRuntimeConfig>> {
  return readProjectConfig<ProjectAgentRuntimeConfig>(projectRoot, parseAgentRuntimeConfig);
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
  return trimmed.replace(/^[\'"]|[\'"]$/g, '');
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
