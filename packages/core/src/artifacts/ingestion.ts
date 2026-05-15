import { ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION } from '../contracts.js';
import { getRunRelativeArtifactPath, toArtifactRootRelativePath } from '../runtime-paths.js';
import { artifactKind } from '../run-state/artifacts.js';
import { appendEvent } from '../run-state/events.js';
import type { RunState, RunStateArtifactIngestionRecord, RunStateContractValidationIssue, RunStateDelegationRecord, RunStateTaskGap } from '../run-state/model.js';
import { readRunState, writeRunState } from '../run-state/run-state.js';
import { runtimeScopedId, withRuntimeStore } from '../storage/runtime-store.js';
import { taskGap } from '../sdd-docs/task-inspection.js';
import { uniqueEvidenceIssueCodes } from '../context/evidence-summary.js';
import { isDerivedEvidenceRef } from './sdd-evidence.js';
import type { ArtifactTrustValidationReport } from './sdd-evidence.js';
import { validateSddResultArtifact } from './sdd-result.js';
import type { SddResultStatus } from './sdd-result.js';

export type ArtifactResultIngestionStatus = 'accepted' | 'rejected';

export interface ArtifactResultIngestionRecord extends RunStateArtifactIngestionRecord {
  status: ArtifactResultIngestionStatus;
}

export interface ArtifactResultIngestionResult {
  valid: boolean;
  duplicate: boolean;
  record: ArtifactResultIngestionRecord;
  delegation: RunStateDelegationRecord | null;
}

export interface ArtifactResultIngestionInspection {
  runId: string;
  contract: typeof ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION;
  records: ArtifactResultIngestionRecord[];
  valid: boolean;
  issues: RunStateContractValidationIssue[];
}

export async function ingestArtifactResult(projectRoot: string, runId: string, input: { delegationId: string; artifactPath: string }): Promise<ArtifactResultIngestionResult> {
  const state = await readRunState(projectRoot, runId);
  const delegation = state.delegations[input.delegationId];
  if (!delegation) {
    throw new Error(`Unknown delegation ${input.delegationId} in run ${runId}.`);
  }

  const artifactPath = getRunRelativeArtifactPath(toArtifactRootRelativePath(input.artifactPath));
  const key = artifactIngestionKey(input.delegationId, artifactPath);
  const existing = (state.artifactIngestions ?? {})[key] as ArtifactResultIngestionRecord | undefined;
  if (existing) {
    return { valid: existing.status === 'accepted', duplicate: true, record: existing, delegation };
  }

  const report = await validateSddResultArtifact(projectRoot, runId, artifactPath, { expectedTask: delegation.task, expectedAgent: delegation.agent });
  const issues = [...report.issues];
  if (isDelegationTerminal(delegation.status)) {
    issues.push(contractIssue('delegation', `Delegation ${delegation.delegationId} is already terminal with status ${delegation.status}.`, 'Do not ingest a new artifact into a terminal delegation; create a new delegation id for retry.'));
  }
  if (report.valid && delegation.status !== 'RUNNING') {
    issues.push(contractIssue('delegation', `Delegation ${delegation.delegationId} must be RUNNING before accepting artifact ingestion.`, 'Start or retry the delegation before ingesting terminal result evidence.'));
  }

  const now = new Date().toISOString();
  const targetStatus = report.valid && report.result ? delegationStatusFromResultStatus(report.result.status) : null;
  const accepted = issues.length === 0 && report.valid && report.result !== null && targetStatus !== null;
  const gaps = report.result ? artifactIngestionGaps(delegation, report.result.status) : [];
  const record: ArtifactResultIngestionRecord = {
    contract: ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION,
    runId,
    delegationId: delegation.delegationId,
    task: delegation.task,
    agent: delegation.agent,
    artifactPath,
    status: accepted ? 'accepted' : 'rejected',
    resultStatus: report.result?.status ?? null,
    delegationStatus: accepted ? targetStatus : (report.valid ? null : 'RECOVERABLE'),
    ingestedAt: now,
    issues,
    gaps: accepted ? gaps : []
  };

  const nextDelegation = accepted
    ? { ...delegation, status: targetStatus, expectedArtifact: artifactPath, terminalEventAt: now }
    : report.valid || delegation.status !== 'RUNNING'
      ? delegation
      : { ...delegation, status: 'RECOVERABLE' as const, expectedArtifact: artifactPath };
  const knownArtifacts = new Set(state.artifacts.map((artifact) => artifact.path));
  const nextArtifacts = accepted && !knownArtifacts.has(artifactPath)
    ? [...state.artifacts, { path: artifactPath, kind: artifactKind(artifactPath), task: delegation.task, agent: delegation.agent, createdAt: now }]
    : state.artifacts;

  await writeRunState(projectRoot, {
    ...state,
    status: accepted && targetStatus === 'COMPLETED' ? state.status : accepted && targetStatus !== 'COMPLETED' ? 'blocked' : state.status,
    delegations: {
      ...state.delegations,
      [delegation.delegationId]: nextDelegation
    },
    artifacts: nextArtifacts,
    artifactIngestions: {
      ...(state.artifactIngestions ?? {}),
      [key]: record
    }
  });
  await recordRuntimeArtifactIngestion(projectRoot, record);
  await recordRuntimeEvidenceAdmission(projectRoot, state, record, report.trust);

  if (!accepted && delegation.status === 'RUNNING' && !report.valid) {
    await appendEvent(projectRoot, runId, { event: 'artifact_invalid', runId, summary: `Artifact ingestion rejected for ${delegation.delegationId}`, data: { delegationId: delegation.delegationId, artifact: artifactPath, issues } });
  }
  await appendEvent(projectRoot, runId, { event: accepted ? 'artifact_ingested' : 'artifact_ingestion_rejected', runId, summary: `Artifact ingestion ${record.status} for ${delegation.delegationId}`, data: { delegationId: delegation.delegationId, artifact: artifactPath, status: record.resultStatus, issues } });
  if (accepted) {
    await appendEvent(projectRoot, runId, { event: terminalEventForDelegationStatus(targetStatus), runId, summary: `Delegation ${delegation.delegationId} finished through artifact ingestion`, data: { delegationId: delegation.delegationId, artifact: artifactPath, status: record.resultStatus } });
  }
  return { valid: accepted, duplicate: false, record, delegation: nextDelegation };
}

export async function inspectArtifactResultIngestions(projectRoot: string, runId: string): Promise<ArtifactResultIngestionInspection> {
  const state = await readRunState(projectRoot, runId);
  const records = Object.values(state.artifactIngestions ?? {}).sort((left, right) => left.ingestedAt.localeCompare(right.ingestedAt)) as ArtifactResultIngestionRecord[];
  const issues: RunStateContractValidationIssue[] = [];
  const hasLedger = Object.prototype.hasOwnProperty.call(state, 'artifactIngestions');
  const artifactPaths = new Set(state.artifacts.map((artifact) => artifact.path));

  for (const record of records) {
    const delegation = state.delegations[record.delegationId];
    if (!delegation) {
      issues.push(contractIssue('delegation', `Ingestion record references missing delegation ${record.delegationId}.`, 'Restore the delegation state or remove the invalid ingestion record from the run evidence.'));
      continue;
    }
    const report = await validateSddResultArtifact(projectRoot, runId, record.artifactPath, { expectedTask: record.task, expectedAgent: record.agent });
    if (record.status === 'accepted') {
      if (!report.valid) {
        issues.push(contractIssue('artifact', `Accepted ingestion artifact ${record.artifactPath} is no longer valid.`, 'Restore the accepted sdd-result artifact or mark the delegation with a new retry id.'));
      }
      if (delegation.expectedArtifact !== record.artifactPath || delegation.status !== record.delegationStatus) {
        issues.push(contractIssue('delegation', `Accepted ingestion ${record.delegationId}/${record.artifactPath} does not match delegation state.`, 'Keep delegation expectedArtifact/status aligned with accepted artifact ingestion evidence.'));
      }
      if (!artifactPaths.has(record.artifactPath)) {
        issues.push(contractIssue('artifacts', `Accepted ingestion artifact ${record.artifactPath} is missing from run artifact index.`, 'Add accepted artifact evidence to state.artifacts through artifact ingestion.'));
      }
    } else if (artifactPaths.has(record.artifactPath)) {
      issues.push(contractIssue('artifacts', `Rejected ingestion artifact ${record.artifactPath} is present in run artifact index.`, 'Rejected artifacts must not be indexed as accepted run evidence.'));
    }
  }

  if (hasLedger) {
    for (const delegation of Object.values(state.delegations)) {
      if (isDelegationTerminal(delegation.status) && delegation.expectedArtifact) {
        const key = artifactIngestionKey(delegation.delegationId, delegation.expectedArtifact);
        if (!(state.artifactIngestions ?? {})[key]) {
          issues.push(contractIssue('artifactIngestions', `Terminal delegation ${delegation.delegationId} has no artifact ingestion record for ${delegation.expectedArtifact}.`, 'Ingest terminal artifact evidence through the Phase 3.6 artifact ingestion API.'));
        }
      }
    }
  }

  return { runId, contract: ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION, records, valid: issues.length === 0, issues };
}

async function recordRuntimeArtifactIngestion(projectRoot: string, record: ArtifactResultIngestionRecord): Promise<void> {
  await withRuntimeStore(projectRoot, ({ db }) => {
    db.prepare('INSERT OR REPLACE INTO artifact_ingestions (ingestion_id, run_id, delegation_id, task_id, agent, artifact_path, status, result_status, ingested_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(runtimeScopedId(record.runId, record.delegationId, record.artifactPath), record.runId, record.delegationId, record.task, record.agent, record.artifactPath, record.status, record.resultStatus, record.ingestedAt, JSON.stringify(record));
  });
}

async function recordRuntimeEvidenceAdmission(projectRoot: string, state: RunState, ingestion: ArtifactResultIngestionRecord, trust: ArtifactTrustValidationReport | undefined): Promise<void> {
  const now = new Date().toISOString();
  await withRuntimeStore(projectRoot, ({ db }) => {
    for (const claim of trust?.claims ?? []) {
      db.prepare('INSERT OR REPLACE INTO evidence_claims (claim_id, run_id, partition, task_id, acceptance_id, coverage_status, source_artifact, is_derived, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(runtimeScopedId(ingestion.runId, claim.task, claim.acceptance, claim.sourceArtifact), ingestion.runId, state.partition, claim.task, claim.acceptance, claim.status, claim.sourceArtifact, isDerivedEvidenceRef(claim.sourceArtifact) ? 1 : 0, now, JSON.stringify(claim));
    }
    const issueCodes = uniqueEvidenceIssueCodes(trust?.issues ?? ingestion.issues);
    if ((trust?.issues.length ?? ingestion.issues.length) > 0 || ingestion.status === 'rejected') {
      db.prepare('INSERT OR REPLACE INTO policy_decisions (decision_id, run_id, task_id, acceptance_id, status, issue_codes, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(runtimeScopedId(ingestion.runId, ingestion.delegationId, ingestion.artifactPath, 'admission'), ingestion.runId, ingestion.task, null, ingestion.status, issueCodes.join(','), now, JSON.stringify({ ingestion, trust: trust ?? null }));
    }
  });
}

function artifactIngestionKey(delegationId: string, artifactPath: string): string {
  return `${delegationId}:${artifactPath}`;
}

function isDelegationTerminal(status: RunStateDelegationRecord['status']): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'TIMED_OUT' || status === 'CANCELLED';
}

function delegationStatusFromResultStatus(status: SddResultStatus): RunStateDelegationRecord['status'] {
  if (status === 'PASS' || status === 'PASS_WITH_GAPS') {
    return 'COMPLETED';
  }
  if (status === 'TIMED_OUT') {
    return 'TIMED_OUT';
  }
  if (status === 'CANCELLED') {
    return 'CANCELLED';
  }
  return 'FAILED';
}

function terminalEventForDelegationStatus(status: RunStateDelegationRecord['status']): string {
  if (status === 'COMPLETED') {
    return 'delegation_completed';
  }
  if (status === 'TIMED_OUT') {
    return 'delegation_timeout';
  }
  if (status === 'CANCELLED') {
    return 'delegation_cancelled';
  }
  return 'delegation_failed';
}

function artifactIngestionGaps(delegation: RunStateDelegationRecord, status: SddResultStatus): RunStateTaskGap[] {
  if (status === 'PASS') {
    return [];
  }
  return [taskGap(delegation.task, delegation.agent, `Artifact ingestion returned ${status} for ${delegation.delegationId}.`, 'Inspect the ingested artifact evidence before verify or sync-back apply.')];
}

function contractIssue(field: string, message: string, recommendation: string): RunStateContractValidationIssue {
  return { field, message, recommendation };
}
