import { AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION } from '../contracts.js';

type LifecycleAutonomyCeiling = 'direct_execution_allowed' | 'compact_boundary_only' | 'full_sdd_with_checkpoint' | 'research_before_implementation';
type CapabilityReuseDecision = 'reuse_direct' | 'adapt_via_host_adapter' | 'borrow_mechanism' | 'avoid';
type SkillCapabilityKind = 'skill' | 'mcp' | 'cli_tool' | 'host_tool' | 'project_agent' | 'external_pattern';
type SkillCapabilitySource = 'project' | 'user_global' | 'claude_code' | 'mcp' | 'open_source' | 'host';
type SkillCapabilityEvidenceType = 'none' | 'command_output' | 'test_result' | 'browser_snapshot' | 'artifact' | 'external_source' | 'execution_record';

interface BuiltInSkillCapabilityContract {
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

export const BUILT_IN_SKILL_CAPABILITIES: BuiltInSkillCapabilityContract[] = [
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
