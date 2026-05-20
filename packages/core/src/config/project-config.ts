import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_CONFIG_CONTRACT } from '../contracts.js';
import { safeBranchOrNull } from '../path-safety.js';
import { detectProject } from './project-detection.js';
import type { DetectionConfidence } from './project-detection.js';
import { getProjectConfigPath } from '../runtime-paths.js';

export type ProjectLifecycleProfile = 'direct' | 'compact' | 'full' | 'research';

export interface ProjectConfig<TAgentRuntimeConfig = unknown> {
  contract: typeof PROJECT_CONFIG_CONTRACT;
  project: {
    name: string;
    language: string;
    framework: string;
  };
  detection?: {
    confidence: DetectionConfidence;
    mixed_stack: boolean;
    primary: string;
    candidates: Array<{
      id: string;
      confidence: DetectionConfidence;
      score: number;
    }>;
  };
  sdd: {
    spec_dir: string;
    default_branch?: string;
    docs_language: string;
    compatible_with: string;
  };
  validation: {
    default: string[];
  };
  editing: {
    prefer_hashline: boolean;
    native_edit_fallback: boolean;
  };
  runtime: {
    background_write: boolean;
    worktree_isolation: boolean;
    sync_back_mode: 'proposal';
  };
  lifecycle: {
    decision_required: boolean;
    profiles: ProjectLifecycleProfile[];
  };
  agentRuntime?: TAgentRuntimeConfig;
}

export async function detectProjectConfig<TAgentRuntimeConfig = unknown>(projectRoot: string, projectName: string): Promise<ProjectConfig<TAgentRuntimeConfig>> {
  const config = defaultProjectConfig<TAgentRuntimeConfig>(projectName);
  const detection = await detectProject(projectRoot);
  config.project.language = detection.primary.language;
  config.project.framework = detection.primary.framework;
  config.validation.default = detection.primary.validationDefault;
  config.detection = {
    confidence: detection.primary.confidence,
    mixed_stack: detection.mixed_stack,
    primary: detection.primary.id,
    candidates: detection.candidates.map((candidate) => ({
      id: candidate.id,
      confidence: candidate.confidence,
      score: candidate.score
    }))
  };
  return config;
}

export function defaultProjectConfig<TAgentRuntimeConfig = unknown>(projectName: string): ProjectConfig<TAgentRuntimeConfig> {
  return {
    contract: PROJECT_CONFIG_CONTRACT,
    project: {
      name: projectName,
      language: 'typescript',
      framework: 'node'
    },
    sdd: {
      spec_dir: 'specs/<branch>',
      default_branch: 'master',
      docs_language: 'zh-CN',
      compatible_with: 'spec-kit'
    },
    validation: {
      default: ['npm run typecheck']
    },
    editing: {
      prefer_hashline: true,
      native_edit_fallback: true
    },
    runtime: {
      background_write: false,
      worktree_isolation: false,
      sync_back_mode: 'proposal'
    },
    lifecycle: {
      decision_required: true,
      profiles: ['direct', 'compact', 'full', 'research']
    }
  };
}

export function renderProjectConfig(config: ProjectConfig<unknown>): string {
  const detection = config.detection ? `detection:\n  confidence: ${config.detection.confidence}\n  mixed_stack: ${config.detection.mixed_stack}\n  primary: ${config.detection.primary}\n  candidates:\n${config.detection.candidates.map((candidate) => `    - id: ${candidate.id}\n      confidence: ${candidate.confidence}\n      score: ${candidate.score}`).join('\n')}\n` : '';
  const defaultBranch = config.sdd.default_branch ? `  default_branch: ${config.sdd.default_branch}\n` : '';
  return `contract: ${config.contract}\nproject:\n  name: ${config.project.name}\n  language: ${config.project.language}\n  framework: ${config.project.framework}\n${detection}sdd:\n  spec_dir: ${config.sdd.spec_dir}\n${defaultBranch}  # Project-level SDD document prose language; runtime CLI/JSON output remains English.\n  docs_language: ${config.sdd.docs_language}\n  compatible_with: ${config.sdd.compatible_with}\nvalidation:\n  default:\n${config.validation.default.map((command) => `    - ${command}`).join('\n')}\nediting:\n  prefer_hashline: ${config.editing.prefer_hashline}\n  native_edit_fallback: ${config.editing.native_edit_fallback}\nruntime:\n  background_write: ${config.runtime.background_write}\n  worktree_isolation: ${config.runtime.worktree_isolation}\n  sync_back_mode: ${config.runtime.sync_back_mode}\nlifecycle:\n  decision_required: ${config.lifecycle.decision_required}\n  profiles:\n${config.lifecycle.profiles.map((profile) => `    - ${profile}`).join('\n')}\n`;
}

export async function readProjectConfig<TAgentRuntimeConfig = unknown>(projectRoot: string, parseAgentRuntime?: (raw: string) => TAgentRuntimeConfig | undefined): Promise<ProjectConfig<TAgentRuntimeConfig>> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  return parseProjectConfig<TAgentRuntimeConfig>(raw, configPath, parseAgentRuntime);
}

export function parseProjectConfig<TAgentRuntimeConfig = unknown>(raw: string, configPath: string, parseAgentRuntime?: (raw: string) => TAgentRuntimeConfig | undefined): ProjectConfig<TAgentRuntimeConfig> {
  const requiredSnippets = [
    'contract: phase-1.2-project-contract',
    'project:',
    'sdd:',
    'validation:',
    'runtime:',
    'lifecycle:'
  ];
  for (const snippet of requiredSnippets) {
    if (!raw.includes(snippet)) {
      throw new Error(`${configPath} missing required snippet: ${snippet}`);
    }
  }

  const projectName = readScalar(raw, 'name') ?? path.basename(path.dirname(path.dirname(configPath)));
  const language = readScalar(raw, 'language') ?? 'unknown';
  const framework = readScalar(raw, 'framework') ?? 'unknown';
  const specDir = readScalar(raw, 'spec_dir') ?? 'specs/<branch>';
  const defaultBranch = safeBranchOrNull(readScalar(raw, 'default_branch') ?? '') ?? undefined;
  const docsLanguage = readScalar(raw, 'docs_language') ?? 'zh-CN';
  const compatibleWith = readScalar(raw, 'compatible_with') ?? 'spec-kit';
  const defaultCommands = readListInSection(raw, 'validation', 'default');
  const profiles = readListInSection(raw, 'lifecycle', 'profiles') as ProjectLifecycleProfile[];

  return {
    contract: PROJECT_CONFIG_CONTRACT,
    project: {
      name: projectName,
      language,
      framework
    },
    detection: parseDetection(raw),
    sdd: {
      spec_dir: specDir,
      default_branch: defaultBranch,
      docs_language: docsLanguage,
      compatible_with: compatibleWith
    },
    validation: {
      default: defaultCommands
    },
    editing: {
      prefer_hashline: readBoolean(raw, 'prefer_hashline', true),
      native_edit_fallback: readBoolean(raw, 'native_edit_fallback', true)
    },
    runtime: {
      background_write: readBoolean(raw, 'background_write', false),
      worktree_isolation: readBoolean(raw, 'worktree_isolation', false),
      sync_back_mode: 'proposal'
    },
    lifecycle: {
      decision_required: readBoolean(raw, 'decision_required', true),
      profiles: profiles.length > 0 ? profiles : ['direct', 'compact', 'full', 'research']
    },
    agentRuntime: parseAgentRuntime?.(raw)
  };
}

function parseDetection(raw: string): ProjectConfig['detection'] {
  const primary = readScalar(raw, 'primary');
  const confidence = readDetectionConfidence(readScalar(raw, 'confidence'));
  if (!primary || !confidence) {
    return undefined;
  }
  const candidateIds = readListFieldObjects(raw, 'candidates', 'id');
  return {
    confidence,
    mixed_stack: readBoolean(raw, 'mixed_stack', false),
    primary,
    candidates: candidateIds.map((id) => ({
      id,
      confidence,
      score: 0
    }))
  };
}

function readDetectionConfidence(value: string | null): DetectionConfidence | null {
  return value === 'high' || value === 'medium' || value === 'low' ? value : null;
}

function readListFieldObjects(raw: string, section: string, field: string): string[] {
  const lines = raw.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => line.trim() === `${section}:`);
  if (sectionIndex < 0) {
    return [];
  }
  const values: string[] = [];
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) {
      continue;
    }
    if (!line.startsWith('    ') && !line.startsWith('  - ')) {
      break;
    }
    const match = line.match(new RegExp(`^-?\\s*${field}:\\s*(.+?)\\s*$`));
    const indentedMatch = line.trim().match(new RegExp(`^-?\\s*${field}:\\s*(.+?)\\s*$`));
    const value = match?.[1] ?? indentedMatch?.[1];
    if (value) {
      values.push(value.trim());
    }
  }
  return values;
}

function readScalar(raw: string, key: string): string | null {
  const match = raw.match(new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`, 'm'));
  return match?.[1]?.trim() ?? null;
}

function readBoolean(raw: string, key: string, defaultValue: boolean): boolean {
  const value = readScalar(raw, key);
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return defaultValue;
}

function readListInSection(raw: string, section: string, key: string): string[] {
  const lines = raw.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => line.trim() === `${section}:`);
  if (sectionIndex < 0) {
    return [];
  }
  const keyIndex = lines.findIndex((line, index) => index > sectionIndex && line.trim() === `${key}:`);
  if (keyIndex < 0) {
    return [];
  }
  const items: string[] = [];
  for (let index = keyIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith('    - ')) {
      break;
    }
    items.push(line.slice('    - '.length).trim());
  }
  return items;
}
