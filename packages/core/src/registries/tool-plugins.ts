import { readFile } from 'node:fs/promises';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';

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

export const TOOL_PLUGIN_CONTRACT_REGISTRY_VERSION = 'phase-3.2-tool-plugin-loading-contract-v1';

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
  await assertProjectConfigReadable(projectRoot);
  return {
    version: TOOL_PLUGIN_CONTRACT_REGISTRY_VERSION,
    contracts: [...BUILT_IN_TOOL_PLUGIN_CONTRACTS].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectToolPluginContract(projectRoot: string, pluginId: string): Promise<ToolPluginContract | null> {
  const registry = await listToolPluginContracts(projectRoot);
  return registry.contracts.find((contract) => contract.id === pluginId) ?? null;
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
