import { createHash } from 'node:crypto';
import { SDD_EVIDENCE_CONTRACT } from '../../contracts.js';
import { messageFromError } from '../../contracts/issues.js';
import { containsTemplatePlaceholder, validateArtifactTrust, type EvidenceClaim } from '../../artifacts/sdd-evidence.js';
import { parseSddResultMarkdown } from '../../artifacts/sdd-result.js';
import { readArtifact } from '../../run-state/artifacts.js';
import type { InvocationLedgerEntry, RunState } from '../../run-state/model.js';
import { toArtifactRootRelativePath } from '../../runtime-paths.js';
import type { DoctorCheck } from '../model.js';

export async function inspectRunTrustEvidence(projectRoot: string, state: RunState, invocationLedger: InvocationLedgerEntry[]): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const runId = state.runId;
  const materials = ledgerMaterialRefs(invocationLedger);
  let inspectedTrustArtifacts = 0;

  if (state.syncBack.status !== 'not_created') {
    if (!state.syncBack.proposalPath) {
      checks.push({ level: 'FAIL', check: 'sync_back_monotonicity', message: `${runId}: sync-back status is ${state.syncBack.status} but proposalPath is missing.`, action: 'Keep sync-back transitions monotonic and preserve the proposal path from verify/apply.' });
    } else if (!state.syncBack.proposalDigest) {
      checks.push({ level: 'WARN', check: 'sync_back_proposal_digest', message: `${runId}: sync-back proposal ${state.syncBack.proposalPath} has no recorded digest.`, action: 'Re-run verify with the Phase 6.9 runtime so inspect/apply can detect proposal drift.' });
    } else {
      try {
        const proposal = await readArtifact(projectRoot, runId, toArtifactRootRelativePath(state.syncBack.proposalPath));
        const digest = hashDocumentContent(proposal);
        if (digest !== state.syncBack.proposalDigest) {
          checks.push({ level: 'FAIL', check: 'sync_back_proposal_digest', message: `${runId}: sync-back proposal ${state.syncBack.proposalPath} digest changed from ${state.syncBack.proposalDigest} to ${digest}.`, action: 'Restore the verified proposal or re-run verify before sync-back apply.' });
        }
      } catch (error) {
        checks.push({ level: 'FAIL', check: 'sync_back_proposal_digest', message: `${runId}: cannot read sync-back proposal ${state.syncBack.proposalPath}: ${messageFromError(error)}`, action: 'Restore the proposal artifact before sync-back inspect/apply.' });
      }
    }
  }

  for (const [taskId, taskState] of Object.entries(state.tasks)) {
    for (const coverage of acceptanceCoverageEntries(taskState)) {
      if (coverage.status === 'PASS') {
        const evidence = typeof coverage.evidence === 'string' ? coverage.evidence : '';
        const issueCodes = Array.isArray(coverage.issueCodes) ? coverage.issueCodes.join(',') : '';
        if (/Mentioned in artifacts\//i.test(evidence) || !isRecord(coverage.policyDecision) || issueCodes.includes('MENTION_ONLY')) {
          checks.push({ level: 'FAIL', check: 'acceptance_trust', message: `${runId}/${taskId}: acceptance ${String(coverage.acceptance ?? 'unknown')} is PASS without policy-backed source evidence.`, action: `Use ${SDD_EVIDENCE_CONTRACT} claims; mention-only acceptance coverage cannot satisfy PASS.` });
        }
        if (containsTemplatePlaceholder(evidence)) {
          checks.push({ level: 'FAIL', check: 'acceptance_trust', message: `${runId}/${taskId}: acceptance ${String(coverage.acceptance ?? 'unknown')} PASS evidence contains template placeholder text.`, action: 'Replace generated TODO/template acceptance text with real source evidence.' });
        }
      }
    }
  }

  for (const artifact of state.artifacts) {
    const looksLikeValidatorArtifact = artifact.agent === 'validator' || /(?:^|\/)validation-[^/]+\.md$/i.test(artifact.path);
    if (!looksLikeValidatorArtifact) {
      continue;
    }
    try {
      const artifactRootRelativePath = toArtifactRootRelativePath(artifact.path);
      const raw = await readArtifact(projectRoot, runId, artifactRootRelativePath);
      const parsed = parseSddResultMarkdown(raw);
      if (!parsed.result || parsed.result.agent !== 'validator' || (parsed.result.status !== 'PASS' && parsed.result.status !== 'PASS_WITH_GAPS')) {
        continue;
      }
      inspectedTrustArtifacts += 1;
      const trust = validateArtifactTrust(raw, parsed.result, artifact.path, { expectedTask: artifact.task ?? parsed.result.task, expectedAgent: 'validator' });
      if (!trust.valid) {
        for (const issue of trust.issues) {
          checks.push({ level: 'FAIL', check: 'artifact_trust', message: `${runId}/${artifact.path}: ${issue.message}`, action: issue.recommendation });
        }
      }
      for (const claim of trust.claims) {
        for (const ref of claimMaterialRefs(claim)) {
          if (!materials.has(ref)) {
            checks.push({ level: 'FAIL', check: 'material_provenance', message: `${runId}/${artifact.path}: material evidence ${ref} has no matching runtime activity entry.`, action: 'Record material/tool/command provenance in runtime.sqlite activities before using the material as source evidence.' });
          }
        }
      }
    } catch (error) {
      checks.push({ level: 'FAIL', check: 'artifact_trust', message: `${runId}/${artifact.path}: cannot inspect validator artifact: ${messageFromError(error)}`, action: 'Restore the validator artifact or remove it from accepted run evidence.' });
    }
  }

  if (inspectedTrustArtifacts > 0 && !checks.some((check) => check.check === 'artifact_trust' || check.check === 'material_provenance')) {
    checks.push({ level: 'PASS', check: 'artifact_trust', message: `${runId}: inspected ${inspectedTrustArtifacts} validator trust artifact(s).` });
  }
  return checks;
}

function acceptanceCoverageEntries(taskState: unknown): Array<Record<string, unknown>> {
  if (!isRecord(taskState) || !Array.isArray(taskState.acceptanceCoverage)) {
    return [];
  }
  return taskState.acceptanceCoverage.filter(isRecord);
}

function ledgerMaterialRefs(entries: InvocationLedgerEntry[]): Set<string> {
  const refs = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === 'material') {
      refs.add(entry.ref);
    }
    for (const ref of entry.materialRefs) {
      refs.add(ref);
    }
  }
  return refs;
}

function claimMaterialRefs(claim: EvidenceClaim): string[] {
  const refs: string[] = [];
  for (const item of claim.evidence) {
    if (item.kind === 'material') {
      refs.push(item.ref);
    }
  }
  for (const ref of claim.provenance) {
    if (ref.startsWith('material:')) {
      refs.push(ref.slice('material:'.length));
    }
  }
  return refs;
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
