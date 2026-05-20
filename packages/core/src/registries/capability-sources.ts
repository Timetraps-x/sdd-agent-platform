import { CAPABILITY_SOURCE_CATALOG_VERSION } from '../contracts.js';

type CapabilityReuseDecision = 'reuse_direct' | 'adapt_via_host_adapter' | 'borrow_mechanism' | 'avoid';
type CapabilitySourceKind = 'native_host' | 'mcp_tool' | 'open_source_material' | 'mechanism_reference' | 'future_adapter' | 'project_material';

interface BuiltInCapabilitySourceCatalogEntry {
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

export const BUILT_IN_CAPABILITY_SOURCES: BuiltInCapabilitySourceCatalogEntry[] = [
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
