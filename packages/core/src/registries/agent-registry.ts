import { readFile } from 'node:fs/promises';
import { AGENT_REGISTRY_CONTRACT_VERSION } from '../contracts.js';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';

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

export async function listAgentRegistry(projectRoot: string): Promise<AgentRegistry> {
  await assertProjectConfigReadable(projectRoot);
  return {
    version: AGENT_REGISTRY_CONTRACT_VERSION,
    agents: [...BUILT_IN_AGENT_REGISTRY].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectAgentRegistryEntry(projectRoot: string, agentId: string): Promise<AgentRegistryEntry | null> {
  const registry = await listAgentRegistry(projectRoot);
  return registry.agents.find((agent) => agent.id === agentId) ?? null;
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
