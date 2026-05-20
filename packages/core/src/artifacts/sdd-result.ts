import { SDD_RESULT_CONTRACT, SDD_RESULT_VERSION } from '../contracts.js';
import { readArtifact } from '../run-state/artifacts.js';
import { toArtifactRootRelativePath } from '../runtime-paths.js';
import { validateArtifactTrust } from './sdd-evidence.js';
import type { ArtifactTrustValidationReport, ContractValidationIssue } from './sdd-evidence.js';

export type SddResultStatus = 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED' | 'TIMED_OUT' | 'CANCELLED';

export interface SddResult {
  contract: typeof SDD_RESULT_CONTRACT;
  version: typeof SDD_RESULT_VERSION;
  agent: string;
  task: string;
  status: SddResultStatus;
  artifacts: string[];
  rawMetadata: Record<string, string | string[]>;
}

export interface SddResultValidationReport {
  valid: boolean;
  result: SddResult | null;
  issues: ContractValidationIssue[];
  trust?: ArtifactTrustValidationReport;
}

export async function validateSddResultArtifact(projectRoot: string, runId: string, runRelativeArtifactPath: string, options: { expectedTask?: string; expectedAgent?: string } = {}): Promise<SddResultValidationReport> {
  const issues: ContractValidationIssue[] = [];
  let artifactRootRelativePath: string;
  try {
    artifactRootRelativePath = toArtifactRootRelativePath(runRelativeArtifactPath);
  } catch (error) {
    return { valid: false, result: null, issues: [contractIssue('artifacts', messageFromError(error), 'Use a run-relative artifacts/<file> path; the physical file lives under branch evidence .sdd/runs/<branchSlug>/evidence/artifacts/<file>. Source/test files belong in ## Evidence, not in sdd-result.artifacts.')] };
  }

  let raw: string;
  try {
    raw = await readArtifact(projectRoot, runId, artifactRootRelativePath);
  } catch (error) {
    return { valid: false, result: null, issues: [contractIssue('artifacts', `Cannot read artifact ${runRelativeArtifactPath}: ${messageFromError(error)}`, `Create the expected artifact in branch evidence and pass the run-relative path ${runRelativeArtifactPath}.`)] };
  }

  if (raw.trim().length === 0) {
    issues.push(contractIssue('artifacts', `Artifact ${runRelativeArtifactPath} is empty.`, 'Write non-empty evidence and an sdd-result block.'));
  }
  const parsed = parseSddResultMarkdown(raw);
  issues.push(...parsed.issues);
  let trust: ArtifactTrustValidationReport | undefined;
  if (parsed.result) {
    issues.push(...validateSddResult(parsed.result, { ...options, runRelativeArtifactPath }));
    trust = validateArtifactTrust(raw, parsed.result, runRelativeArtifactPath, options);
    if (!trust.valid) {
      issues.push(...trust.issues);
    }
  }

  return { valid: issues.length === 0 && parsed.result !== null, result: parsed.result, issues, trust };
}

export function parseSddResultMarkdown(raw: string): SddResultValidationReport {
  const matches = Array.from(raw.matchAll(/^\s*```sdd-result\s*\r?\n([\s\S]*?)\r?^\s*```\s*$/gm));
  if (matches.length !== 1) {
    return {
      valid: false,
      result: null,
      issues: [contractIssue('sdd-result', matches.length === 0 ? 'No sdd-result fenced block found.' : `Expected exactly one sdd-result fenced block, found ${matches.length}.`, 'Embed one machine-readable sdd-result block in the artifact.')]
    };
  }
  const metadata = parseSimpleYamlBlock(matches[0][1] ?? '');
  const result = buildSddResult(metadata);
  const issues = result ? validateSddResult(result) : validateSddResultMetadata(metadata);
  return { valid: issues.length === 0 && result !== null, result, issues };
}

export function validateSddResult(result: SddResult, options: { expectedTask?: string; expectedAgent?: string; runRelativeArtifactPath?: string } = {}): ContractValidationIssue[] {
  const issues = validateSddResultMetadata(result.rawMetadata);
  if (options.expectedTask && result.task !== options.expectedTask) {
    issues.push(contractIssue('task', `sdd-result task ${result.task} does not match expected task ${options.expectedTask}.`, 'Write the delegated task id into the sdd-result task field.'));
  }
  if (options.expectedAgent && result.agent !== options.expectedAgent) {
    issues.push(contractIssue('agent', `sdd-result agent ${result.agent} does not match expected agent ${options.expectedAgent}.`, 'Write the delegated agent name into the sdd-result agent field.'));
  }
  if (options.runRelativeArtifactPath && !result.artifacts.includes(options.runRelativeArtifactPath)) {
    issues.push(contractIssue('artifacts', `sdd-result artifacts does not include its own path ${options.runRelativeArtifactPath}.`, `Add the current artifact path exactly: ${options.runRelativeArtifactPath}.`));
  }
  return issues;
}

export function isSddResultStatus(value: string | null): value is SddResultStatus {
  return value === 'PASS' || value === 'PASS_WITH_GAPS' || value === 'FAIL' || value === 'BLOCKED' || value === 'TIMED_OUT' || value === 'CANCELLED';
}

function buildSddResult(metadata: Record<string, string | string[]>): SddResult | null {
  const contract = scalarValue(metadata.contract);
  const version = scalarValue(metadata.version);
  const agent = scalarValue(metadata.agent);
  const task = scalarValue(metadata.task);
  const status = scalarValue(metadata.status);
  const artifacts = listValue(metadata.artifacts);
  if (contract !== SDD_RESULT_CONTRACT || version !== SDD_RESULT_VERSION || !agent || !task || !isSddResultStatus(status) || artifacts.length === 0) {
    return null;
  }
  return {
    contract: SDD_RESULT_CONTRACT,
    version: SDD_RESULT_VERSION,
    agent,
    task,
    status,
    artifacts,
    rawMetadata: metadata
  };
}

function validateSddResultMetadata(metadata: Record<string, string | string[]>): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  const contract = scalarValue(metadata.contract);
  const version = scalarValue(metadata.version);
  const agent = scalarValue(metadata.agent);
  const task = scalarValue(metadata.task);
  const status = scalarValue(metadata.status);
  const artifacts = listValue(metadata.artifacts);

  if (contract !== SDD_RESULT_CONTRACT) {
    issues.push(contractIssue('contract', `Expected ${SDD_RESULT_CONTRACT}, got ${contract ?? 'missing'}.`, 'Use contract: sdd-result-v1.'));
  }
  if (version !== SDD_RESULT_VERSION) {
    issues.push(contractIssue('version', `Expected ${SDD_RESULT_VERSION}, got ${version ?? 'missing'}.`, 'Use version: 1.3.0 until a new contract version is introduced.'));
  }
  if (!agent) {
    issues.push(contractIssue('agent', 'sdd-result agent is required.', 'Set agent to the producing agent name.'));
  }
  if (!task) {
    issues.push(contractIssue('task', 'sdd-result task is required.', 'Set task to the delegated task id.'));
  }
  if (!isSddResultStatus(status)) {
    issues.push(contractIssue('status', `Unsupported sdd-result status ${status ?? 'missing'}.`, 'Use PASS, PASS_WITH_GAPS, FAIL, BLOCKED, TIMED_OUT, or CANCELLED.'));
  }
  if (artifacts.length === 0) {
    issues.push(contractIssue('artifacts', 'sdd-result artifacts must contain at least one path.', 'Add the current run-relative artifact path, for example artifacts/<file>. Source/test files belong in ## Evidence.'));
  }
  for (const artifactPath of artifacts) {
    validateRunRelativeArtifactReference(artifactPath, issues);
    if (!artifactPath.replace(/\\/g, '/').startsWith('artifacts/')) {
      issues.push(contractIssue('artifacts', `Source/test path ${artifactPath} is not a run artifact reference.`, 'Move source/test file citations to ## Evidence; keep only run-relative artifacts/<file> paths in sdd-result.artifacts.'));
    }
  }
  return issues;
}

function validateRunRelativeArtifactReference(value: string, issues: ContractValidationIssue[], field = 'artifacts'): void {
  try {
    toArtifactRootRelativePath(value);
  } catch (error) {
    issues.push(contractIssue(field, messageFromError(error), 'Use a run-relative artifacts/<file> path inside the active run.'));
  }
}

function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseSimpleYamlBlock(raw: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const lines = raw.split(/\r?\n/);
  let currentListKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    if (currentListKey && /^-\s+/.test(trimmed)) {
      const current = result[currentListKey];
      const items = Array.isArray(current) ? current : [];
      items.push(unquoteSimpleYamlValue(trimmed.slice(2).trim()));
      result[currentListKey] = items;
      continue;
    }

    const scalarMatch = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!scalarMatch) {
      currentListKey = null;
      continue;
    }
    const key = scalarMatch[1];
    const value = scalarMatch[2].trim();
    if (value === '') {
      result[key] = [];
      currentListKey = key;
    } else if (value === '[]') {
      result[key] = [];
      currentListKey = null;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      result[key] = value.slice(1, -1).split(',').map((item) => unquoteSimpleYamlValue(item.trim())).filter(Boolean);
      currentListKey = null;
    } else {
      result[key] = unquoteSimpleYamlValue(value);
      currentListKey = null;
    }
  }

  return result;
}

function unquoteSimpleYamlValue(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function scalarValue(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function listValue(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (!value || value === '[]') {
    return [];
  }
  return [value];
}
