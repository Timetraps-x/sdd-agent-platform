import {
  ACCEPTANCE_POLICY_RULESET_VERSION,
  SDD_EVIDENCE_CONTRACT,
  SDD_EVIDENCE_VERSION
} from '../contracts.js';
import { normalizePortablePath } from '../path-safety.js';

export type EvidenceCoverageStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'REFERENCED_ONLY' | 'MISSING';
export type EvidenceQualityIssue = 'EMPTY_EVIDENCE' | 'TODO_PLACEHOLDER' | 'TEMPLATE_TEXT' | 'MENTION_ONLY' | 'UNSOURCED_PASS' | 'MISSING_COMMAND_OUTPUT' | 'MISSING_ARTIFACT_REFERENCE' | 'MISSING_MATERIAL_REFERENCE' | 'PROVENANCE_GAP' | 'POLICY_RULE_FAILED' | 'DERIVED_SOURCE_EVIDENCE' | 'PARTITION_SCOPE_VIOLATION';

export interface ContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

export interface EvidenceItem {
  kind: string;
  ref: string;
  summary: string | null;
}

export interface EvidenceClaim {
  contract: typeof SDD_EVIDENCE_CONTRACT;
  version: typeof SDD_EVIDENCE_VERSION;
  task: string;
  acceptance: string;
  status: EvidenceCoverageStatus;
  claim: string;
  sourceArtifact: string;
  evidence: EvidenceItem[];
  provenance: string[];
  policy: string[];
  rawMetadata: Record<string, string | string[]>;
}

interface SddResult {
  task: string;
  agent: string;
  status: 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED' | 'TIMED_OUT' | 'CANCELLED';
}

export interface ArtifactTrustValidationReport {
  valid: boolean;
  claims: EvidenceClaim[];
  issues: ContractValidationIssue[];
}

export function parseSddEvidenceMarkdown(raw: string, options: { expectedTask?: string; sourceArtifact?: string } = {}): ArtifactTrustValidationReport {
  const matches = Array.from(raw.matchAll(/^\s*```sdd-evidence\s*\r?\n([\s\S]*?)\r?^\s*```\s*$/gm));
  const claims: EvidenceClaim[] = [];
  const issues: ContractValidationIssue[] = [];
  for (const match of matches) {
    const metadata = parseSimpleYamlBlock(match[1] ?? '');
    const built = buildEvidenceClaim(metadata, options.sourceArtifact);
    issues.push(...built.issues);
    if (built.claim) {
      claims.push(built.claim);
      issues.push(...validateEvidenceClaim(built.claim, options));
    }
  }
  return { valid: claims.length > 0 && issues.length === 0, claims, issues };
}

export function validateArtifactTrust(raw: string, result: SddResult, runRelativeArtifactPath: string, options: { expectedTask?: string; expectedAgent?: string } = {}): ArtifactTrustValidationReport {
  const expectedAgent = options.expectedAgent ?? result.agent;
  const expectedTask = options.expectedTask ?? result.task;
  const requiresTrust = expectedAgent === 'validator' && (result.status === 'PASS' || result.status === 'PASS_WITH_GAPS');
  const parsed = parseSddEvidenceMarkdown(raw, { expectedTask, sourceArtifact: runRelativeArtifactPath });
  const issues = requiresTrust || parsed.claims.length > 0 ? [...parsed.issues] : [];

  if (requiresTrust) {
    issues.push(...validateArtifactBodyTrust(raw));
    if (parsed.claims.length === 0) {
      issues.push(evidenceIssue('UNSOURCED_PASS', 'sdd-evidence', `Validator ${result.status} artifact ${runRelativeArtifactPath} has no structured ${SDD_EVIDENCE_CONTRACT} evidence block.`, 'Add policy-backed sdd-evidence with acceptance, claim, source artifact, evidence refs, provenance refs, and policy refs.'));
    }
  }

  return { valid: issues.length === 0 && (!requiresTrust || parsed.claims.length > 0), claims: parsed.claims, issues };
}

function buildEvidenceClaim(metadata: Record<string, string | string[]>, sourceArtifact: string | undefined): { claim: EvidenceClaim | null; issues: ContractValidationIssue[] } {
  const issues: ContractValidationIssue[] = [];
  const contract = scalarValue(metadata.contract);
  const version = scalarValue(metadata.version);
  const task = scalarValue(metadata.task);
  const acceptance = scalarValue(metadata.acceptance);
  const status = scalarValue(metadata.status);
  const claimText = scalarValue(metadata.claim);
  const claimSourceArtifact = scalarValue(metadata.source_artifact) ?? scalarValue(metadata.sourceArtifact) ?? sourceArtifact ?? null;
  if (!contract) {
    issues.push(evidenceIssue('POLICY_RULE_FAILED', 'sdd-evidence.contract', 'sdd-evidence contract is missing.', `Set contract: ${SDD_EVIDENCE_CONTRACT}.`));
  }
  if (!version) {
    issues.push(evidenceIssue('POLICY_RULE_FAILED', 'sdd-evidence.version', 'sdd-evidence version is missing.', `Set version: ${SDD_EVIDENCE_VERSION}.`));
  }
  if (!task) {
    issues.push(evidenceIssue('POLICY_RULE_FAILED', 'sdd-evidence.task', 'sdd-evidence task is missing.', 'Set task to the delegated task id.'));
  }
  if (!acceptance) {
    issues.push(evidenceIssue('POLICY_RULE_FAILED', 'sdd-evidence.acceptance', 'sdd-evidence acceptance is missing.', 'Set acceptance to the AC id or acceptance text being proven.'));
  }
  if (!status || !isEvidenceCoverageStatus(status)) {
    issues.push(evidenceIssue('POLICY_RULE_FAILED', 'sdd-evidence.status', `sdd-evidence status ${status ?? 'missing'} is not supported.`, 'Use PASS, FAIL, BLOCKED, REFERENCED_ONLY, or MISSING.'));
  }
  if (!claimText) {
    issues.push(evidenceIssue('UNSOURCED_PASS', 'sdd-evidence.claim', 'sdd-evidence claim is missing.', 'Add a concise claim that states what acceptance is proven.'));
  }
  if (!claimSourceArtifact) {
    issues.push(evidenceIssue('MISSING_ARTIFACT_REFERENCE', 'sdd-evidence.source_artifact', 'sdd-evidence source artifact is missing.', 'Set source_artifact to the run-relative artifact path.'));
  }
  if (!task || !acceptance || !status || !isEvidenceCoverageStatus(status) || !claimText || !claimSourceArtifact || contract !== SDD_EVIDENCE_CONTRACT || version !== SDD_EVIDENCE_VERSION) {
    return { claim: null, issues };
  }
  const evidence = listValue(metadata.evidence_refs ?? metadata.evidence_ref ?? metadata.evidence).map(parseEvidenceItem);
  const provenance = listValue(metadata.provenance_refs ?? metadata.provenance_ref ?? metadata.provenance);
  const policy = listValue(metadata.policy_refs ?? metadata.policy_ref ?? metadata.policy);
  return {
    claim: {
      contract: SDD_EVIDENCE_CONTRACT,
      version: SDD_EVIDENCE_VERSION,
      task,
      acceptance,
      status,
      claim: claimText,
      sourceArtifact: claimSourceArtifact,
      evidence,
      provenance,
      policy,
      rawMetadata: metadata
    },
    issues
  };
}

function validateEvidenceClaim(claim: EvidenceClaim, options: { expectedTask?: string }): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (options.expectedTask && claim.task !== options.expectedTask) {
    issues.push(evidenceIssue('POLICY_RULE_FAILED', 'sdd-evidence.task', `sdd-evidence task ${claim.task} does not match expected task ${options.expectedTask}.`, 'Use the same task id as the delegated artifact.'));
  }
  if (containsTemplatePlaceholder(claim.claim)) {
    issues.push(evidenceIssue('TODO_PLACEHOLDER', 'sdd-evidence.claim', 'sdd-evidence claim contains placeholder text.', 'Replace TODO/template text with actual validation evidence.'));
  }
  if (isDerivedEvidenceRef(claim.sourceArtifact)) {
    issues.push(evidenceIssue('DERIVED_SOURCE_EVIDENCE', 'sdd-evidence.source_artifact', `sdd-evidence source artifact ${claim.sourceArtifact} is derived output, not source evidence.`, 'Reference the validator/reviewer/source artifact that contains the evidence, not coverage, cache, proposal, or summary output.'));
  }
  if (claim.status === 'PASS') {
    if (claim.evidence.length === 0) {
      issues.push(evidenceIssue('UNSOURCED_PASS', 'sdd-evidence.evidence', `PASS claim ${claim.acceptance} has no evidence refs.`, 'Add at least one command, artifact, file, test, or review evidence ref.'));
    }
    if (claim.provenance.length === 0) {
      issues.push(evidenceIssue('PROVENANCE_GAP', 'sdd-evidence.provenance', `PASS claim ${claim.acceptance} has no provenance refs.`, 'Add provenance refs for the artifact, command, run state, or material used by this claim.'));
    }
    if (claim.policy.length === 0) {
      issues.push(evidenceIssue('POLICY_RULE_FAILED', 'sdd-evidence.policy', `PASS claim ${claim.acceptance} has no policy refs.`, `Add ${ACCEPTANCE_POLICY_RULESET_VERSION}:<rule-id> policy refs.`));
    }
  }
  for (const item of claim.evidence) {
    if (!item.ref) {
      issues.push(evidenceIssue('MISSING_ARTIFACT_REFERENCE', 'sdd-evidence.evidence', `Evidence item for ${claim.acceptance} has an empty ref.`, `Provide a non-empty evidence ref.`));
    }
    if (containsTemplatePlaceholder(item.ref) || containsTemplatePlaceholder(item.summary ?? '')) {
      issues.push(evidenceIssue('TODO_PLACEHOLDER', 'sdd-evidence.evidence', `Evidence item for ${claim.acceptance} contains placeholder text.`, `Replace TODO/template text with real evidence.`));
    }
    if (isDerivedEvidenceRef(item.ref)) {
      issues.push(evidenceIssue('DERIVED_SOURCE_EVIDENCE', 'sdd-evidence.evidence', `Evidence ref ${item.ref} is derived output, not source evidence.`, `Use source artifacts, commands, files, tests, or material refs.`));
    }
  }
  for (const ref of claim.provenance) {
    if (isDerivedEvidenceRef(ref)) {
      issues.push(evidenceIssue('DERIVED_SOURCE_EVIDENCE', 'sdd-evidence.provenance', `Provenance ref ${ref} is derived output, not source evidence.`, `Use source artifact, command, run-state, or material provenance refs.`));
    }
  }
  return issues;
}

function validateArtifactBodyTrust(raw: string): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (raw.trim().length === 0) {
    issues.push(evidenceIssue('EMPTY_EVIDENCE', 'evidence', 'Artifact body is empty.', 'Write non-empty evidence and an sdd-result block.'));
  }
  if (containsTemplatePlaceholder(raw)) {
    issues.push(evidenceIssue('TODO_PLACEHOLDER', 'evidence', 'Artifact still contains TODO/template placeholder text.', 'Replace scaffold text with real evidence before claiming PASS.'));
  }
  if (/^\s*-\s*\[PASS\]\s*(?:Acceptance\s+)?(?:AC[-\w.]+|[^\r\n]+)\s*$/im.test(raw) && !/^\s*```sdd-evidence\s*$/im.test(raw)) {
    issues.push(evidenceIssue('MENTION_ONLY', 'acceptance_coverage', 'Validator PASS artifact only mentions an acceptance target without structured source evidence.', `Add ${SDD_EVIDENCE_CONTRACT} claim/evidence/provenance/policy records.`));
  }
  if (/Mentioned in artifacts\//i.test(raw)) {
    issues.push(evidenceIssue('MENTION_ONLY', 'acceptance_coverage', 'Artifact cites generated mention-only coverage text.', 'Use source evidence, not generated coverage summaries.'));
  }
  return issues;
}

function parseEvidenceItem(value: string): EvidenceItem {
  const separator = value.indexOf(':');
  if (separator > 0) {
    const kind = value.slice(0, separator).trim();
    const ref = value.slice(separator + 1).trim();
    if (/^[A-Za-z0-9_-]+$/.test(kind)) {
      return { kind, ref, summary: null };
    }
  }
  return { kind: value.startsWith('artifacts/') ? 'artifact' : 'text', ref: value, summary: null };
}

function isEvidenceCoverageStatus(value: string): value is EvidenceCoverageStatus {
  return value === 'PASS' || value === 'FAIL' || value === 'BLOCKED' || value === 'REFERENCED_ONLY' || value === 'MISSING';
}

export function containsTemplatePlaceholder(value: string): boolean {
  return /\bTODO\b|template placeholder|TODO\.|Add validation evidence|TODO run validation command|TODO cite files/i.test(value);
}

export function isDerivedEvidenceRef(value: string): boolean {
  const normalized = normalizePortablePath(value).toLowerCase();
  return normalized.includes('acceptance-coverage-')
    || normalized.endsWith('sync-back-proposal.md')
    || normalized.includes('/cache/')
    || normalized.includes('/profile')
    || normalized.endsWith('run-index.json')
    || normalized.includes('command-output-summary')
    || normalized.includes('evidence-summary')
    || normalized.includes('context-package')
    || normalized.includes('context-build')
    || normalized.includes('log-worker-summary');
}

function evidenceIssue(code: EvidenceQualityIssue, field: string, message: string, recommendation: string): ContractValidationIssue {
  return contractIssue(field, `${code}: ${message}`, recommendation);
}

function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
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
