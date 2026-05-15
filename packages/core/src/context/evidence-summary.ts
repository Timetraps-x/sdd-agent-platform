import {
  ACCEPTANCE_POLICY_RULESET_VERSION,
  EVIDENCE_SUMMARY_CONTRACT_VERSION,
  SDD_EVIDENCE_CONTRACT,
  SDD_EVIDENCE_VERSION
} from '../contracts.js';
import { listInvocationLedgerEntries } from '../run-state/invocation-ledger.js';
import { readRunEvents } from '../run-state/events.js';
import { readRunState } from '../run-state/run-state.js';
import { recordRuntimeProjection, withRuntimeStore } from '../storage/runtime-store.js';
import { contextSourceRefForProjectPath, uniqueContextSourceRefs } from './source-refs.js';
import type { ContextSourceRef } from './source-refs.js';

type EvidenceCoverageStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'REFERENCED_ONLY' | 'MISSING';
export type EvidenceQualityIssue = 'EMPTY_EVIDENCE' | 'TODO_PLACEHOLDER' | 'TEMPLATE_TEXT' | 'MENTION_ONLY' | 'UNSOURCED_PASS' | 'MISSING_COMMAND_OUTPUT' | 'MISSING_ARTIFACT_REFERENCE' | 'MISSING_MATERIAL_REFERENCE' | 'PROVENANCE_GAP' | 'POLICY_RULE_FAILED' | 'DERIVED_SOURCE_EVIDENCE' | 'PARTITION_SCOPE_VIOLATION';

interface ContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

interface EvidenceItem {
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

export interface EvidenceSummaryProjection {
  contract: typeof EVIDENCE_SUMMARY_CONTRACT_VERSION;
  authoritative: false;
  usableForPass: false;
  runId: string;
  taskId: string | null;
  sources: ContextSourceRef[];
  passCount: number;
  blockedCount: number;
  failCount: number;
  issueCodes: EvidenceQualityIssue[];
  policyRefs: string[];
  highlights: string[];
}

export interface EvidenceSummaryOptions {
  runId: string;
  taskId?: string;
}

export async function buildEvidenceSummaryProjection(projectRoot: string, options: EvidenceSummaryOptions): Promise<EvidenceSummaryProjection> {
  const state = await readRunState(projectRoot, options.runId);
  const [events, invocationLedger] = await Promise.all([
    readRunEvents(projectRoot, options.runId),
    listInvocationLedgerEntries(projectRoot, options.runId)
  ]);
  const taskId = options.taskId ?? state.currentTask ?? state.taskId;
  const admittedClaims = await readRuntimeEvidenceClaims(projectRoot, state.runId, taskId ?? null);
  const artifactIngestions = Object.values(state.artifactIngestions ?? {}).filter((record) => !taskId || record.task === taskId);
  const artifacts = state.artifacts.filter((artifact) => !taskId || artifact.task === taskId);
  const ledgerArtifactRefs = invocationLedger
    .filter((entry) => entry.kind === 'artifact_hash' && entry.artifactPath)
    .map((entry) => ({ path: entry.artifactPath as string, kind: 'artifact' as const }));
  const artifactSourceRefs = [
    ...artifacts.map((artifact) => ({ path: `.sdd/runs/${state.runId}/${artifact.path}`, kind: 'artifact' as const })),
    ...ledgerArtifactRefs.map((artifact) => ({ path: `.sdd/runs/${state.runId}/${artifact.path}`, kind: artifact.kind }))
  ];
  const sources = await uniqueContextSourceRefs([
    await contextSourceRefForProjectPath(projectRoot, `.sdd/runs/${state.runId}/state.json`, 'run_state'),
    await contextSourceRefForProjectPath(projectRoot, `.sdd/runs/${state.runId}/events.jsonl`, 'command_output'),
    await contextSourceRefForProjectPath(projectRoot, `.sdd/runs/${state.runId}/invocations.jsonl`, 'ledger'),
    ...(await Promise.all(artifactSourceRefs.map((artifact) => contextSourceRefForProjectPath(projectRoot, artifact.path, artifact.kind))))
  ]);
  const issueCodes = uniqueEvidenceIssueCodes(artifactIngestions.flatMap((record) => record.issues));
  const passCount = Math.max(admittedClaims.filter((claim) => claim.status === 'PASS').length, artifactIngestions.filter((record) => record.status === 'accepted' && (record.resultStatus === 'PASS' || record.resultStatus === 'PASS_WITH_GAPS')).length);
  const failCount = Math.max(admittedClaims.filter((claim) => claim.status === 'FAIL').length, artifactIngestions.filter((record) => record.status === 'rejected' || record.resultStatus === 'FAIL').length);
  const blockedCount = Math.max(admittedClaims.filter((claim) => claim.status === 'BLOCKED').length, artifactIngestions.filter((record) => record.resultStatus === 'BLOCKED' || record.resultStatus === 'TIMED_OUT' || record.resultStatus === 'CANCELLED' || record.gaps.length > 0).length);
  const highlights = [
    `run=${state.runId} status=${state.status} phase=${state.phase ?? 'none'}`,
    `task=${taskId ?? 'none'} validation=${state.validation.status} sync_back=${state.syncBack.status}`,
    `artifacts=${artifacts.length} ingestions=${artifactIngestions.length} admitted_claims=${admittedClaims.length} events=${events.length} ledger=${invocationLedger.length}`,
    `pass=${passCount} blocked=${blockedCount} fail=${failCount}`
  ];
  if (issueCodes.length > 0) {
    highlights.push(`issues=${issueCodes.join(',')}`);
  }
  const projection: EvidenceSummaryProjection = {
    contract: EVIDENCE_SUMMARY_CONTRACT_VERSION,
    authoritative: false,
    usableForPass: false,
    runId: state.runId,
    taskId: taskId ?? null,
    sources,
    passCount,
    blockedCount,
    failCount,
    issueCodes,
    policyRefs: [
      `${ACCEPTANCE_POLICY_RULESET_VERSION}:require-source-evidence`,
      `${ACCEPTANCE_POLICY_RULESET_VERSION}:require-provenance`,
      `${ACCEPTANCE_POLICY_RULESET_VERSION}:reject-derived-source-evidence`
    ],
    highlights
  };
  await recordRuntimeProjection(projectRoot, 'evidence_summary', `${state.runId}:${taskId ?? 'all'}`, projection);
  return projection;
}

export async function readRuntimeEvidenceClaims(projectRoot: string, runId: string, taskId: string | null): Promise<EvidenceClaim[]> {
  return withRuntimeStore(projectRoot, ({ db }) => {
    const rows = taskId
      ? db.prepare('SELECT c.payload_json FROM evidence_claims c JOIN runs r ON r.run_id = c.run_id WHERE c.run_id = ? AND c.task_id = ? AND (c.partition IS NULL OR r.partition IS NULL OR c.partition = r.partition) ORDER BY c.created_at ASC, c.claim_id ASC').all(runId, taskId)
      : db.prepare('SELECT c.payload_json FROM evidence_claims c JOIN runs r ON r.run_id = c.run_id WHERE c.run_id = ? AND (c.partition IS NULL OR r.partition IS NULL OR c.partition = r.partition) ORDER BY c.created_at ASC, c.claim_id ASC').all(runId);
    return (rows as Array<{ payload_json: string }>).map((row) => JSON.parse(row.payload_json) as EvidenceClaim);
  });
}

export async function hasRuntimeEvidenceScopeViolation(projectRoot: string, runId: string, taskId: string | null): Promise<boolean> {
  return withRuntimeStore(projectRoot, ({ db }) => {
    const row = taskId
      ? db.prepare('SELECT COUNT(*) AS count FROM evidence_claims c JOIN runs r ON r.run_id = c.run_id WHERE c.run_id = ? AND c.task_id = ? AND c.partition IS NOT NULL AND r.partition IS NOT NULL AND c.partition <> r.partition').get(runId, taskId)
      : db.prepare('SELECT COUNT(*) AS count FROM evidence_claims c JOIN runs r ON r.run_id = c.run_id WHERE c.run_id = ? AND c.partition IS NOT NULL AND r.partition IS NOT NULL AND c.partition <> r.partition').get(runId);
    return ((row as { count?: number } | undefined)?.count ?? 0) > 0;
  });
}

export function uniqueEvidenceIssueCodes(issues: ContractValidationIssue[]): EvidenceQualityIssue[] {
  const known: EvidenceQualityIssue[] = ['EMPTY_EVIDENCE', 'TODO_PLACEHOLDER', 'TEMPLATE_TEXT', 'MENTION_ONLY', 'UNSOURCED_PASS', 'MISSING_COMMAND_OUTPUT', 'MISSING_ARTIFACT_REFERENCE', 'MISSING_MATERIAL_REFERENCE', 'PROVENANCE_GAP', 'POLICY_RULE_FAILED', 'DERIVED_SOURCE_EVIDENCE', 'PARTITION_SCOPE_VIOLATION'];
  return known.filter((code) => issues.some((issue) => issue.message.includes(code)));
}
