import { readFile } from 'node:fs/promises';
import { getProjectConfigPath } from '../runtime-paths.js';
import { parseProjectConfig } from '../config/project-config.js';

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

export const TOOL_CAPABILITY_REGISTRY_VERSION = 'phase-3.1-tool-capability-registry-v1';

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
  await assertProjectConfigReadable(projectRoot);
  return {
    version: TOOL_CAPABILITY_REGISTRY_VERSION,
    capabilities: [...BUILT_IN_TOOL_CAPABILITIES].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectToolCapability(projectRoot: string, capabilityId: string): Promise<ToolCapability | null> {
  const registry = await listToolCapabilities(projectRoot);
  return registry.capabilities.find((capability) => capability.id === capabilityId) ?? null;
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
