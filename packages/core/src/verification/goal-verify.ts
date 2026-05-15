import { createHash } from 'node:crypto';
import {
  ACCEPTANCE_POLICY_RULESET_VERSION,
  SDD_EVIDENCE_CONTRACT,
  SDD_EVIDENCE_VERSION,
  SDD_RESULT_CONTRACT,
  SDD_RESULT_VERSION
} from '../contracts.js';
import { artifactKind, readArtifact, writeArtifact } from '../run-state/artifacts.js';
import { appendEvent } from '../run-state/events.js';
import { appendArtifactHashLedgerEntry, appendDeclaredCommandLedgerEntries, appendInvocationLedgerEntry, listInvocationLedgerEntries } from '../run-state/invocation-ledger.js';
import type { InvocationLedgerEntry, InvocationLedgerKind, RunState } from '../run-state/model.js';
import { readRunState, writeRunState } from '../run-state/run-state.js';
import { toArtifactRootRelativePath } from '../runtime-paths.js';
import { hasRuntimeEvidenceScopeViolation, readRuntimeEvidenceClaims } from '../context/evidence-summary.js';
import type { ArtifactTrustValidationReport, EvidenceClaim, EvidenceCoverageStatus, EvidenceQualityIssue } from '../artifacts/sdd-evidence.js';
import { validateSddResultArtifact } from '../artifacts/sdd-result.js';
import type { SddResultStatus } from '../artifacts/sdd-result.js';
import { taskGap } from '../sdd-docs/task-inspection.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import type { SddTask, SddTaskGap } from '../sdd-docs/task-parser.js';
import { resolveTaskRun } from '../sync-back/inspect.js';

export type GoalVerifyStatus = 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED';
export type HarnessVerifyStatus = 'PASS' | 'GAPS' | 'BLOCKED' | 'HUMAN_NEEDED';

export interface GoalVerifyOptions {
  branch?: string;
  taskId: string;
  runId?: string;
  reviewArtifact?: string;
  validationArtifact?: string;
}

interface PolicyRuleSet {
  id: typeof ACCEPTANCE_POLICY_RULESET_VERSION;
  version: string;
  ruleIds: string[];
}

interface PolicyDecision {
  status: EvidenceCoverageStatus;
  ruleSet: PolicyRuleSet;
  passedRules: string[];
  failedRules: string[];
  issueCodes: EvidenceQualityIssue[];
}

export interface AcceptanceCoverageItem {
  acceptance: string;
  status: EvidenceCoverageStatus;
  evidence: string;
  policyDecision?: PolicyDecision;
  issueCodes?: EvidenceQualityIssue[];
}

export interface GoalVerifyResult {
  runId: string;
  taskId: string;
  status: GoalVerifyStatus;
  task: SddTask | null;
  reviewArtifact: string | null;
  validationArtifact: string | null;
  coverageArtifactPath: string;
  syncBackProposalPath: string;
  acceptanceCoverage: AcceptanceCoverageItem[];
  gaps: SddTaskGap[];
  commands: string[];
  standardStatus: HarnessVerifyStatus;
  message: string;
}

interface AcceptanceCoverageTarget {
  label: string;
  description: string | null;
  matchTexts: string[];
}

export async function runGoalVerify(projectRoot: string, options: GoalVerifyOptions): Promise<GoalVerifyResult> {
  const resolved = await resolveTaskRun(projectRoot, { runId: options.runId, branch: options.branch, taskId: options.taskId });
  const branch = resolved.context.partition;
  const model = resolved.model;
  const inspected = { task: resolved.task, gaps: inspectSddTask(model, options.taskId).gaps };
  const runId = resolved.runId;
  const state = resolved.state;
  const reviewArtifact = options.reviewArtifact ?? artifactPathForAgent(state, options.taskId, 'reviewer');
  const validationArtifact = options.validationArtifact ?? artifactPathForAgent(state, options.taskId, 'validator');
  const gaps: SddTaskGap[] = [...inspected.gaps];
  for (const reason of resolved.staleReasons) {
    gaps.push(taskGap(options.taskId, 'run_snapshot', reason, 'Rerun sdd do task for the current partition before verify.'));
  }
  for (const conflict of resolved.affectedFileConflicts) {
    gaps.push(taskGap(options.taskId, 'affected_files', `Affected file ${conflict.file} is active in run ${conflict.runId} for ${conflict.partition}/${conflict.taskId}.`, 'Resolve or archive the conflicting active run before verify.'));
  }
  const acceptanceCoverage: AcceptanceCoverageItem[] = [];
  const acceptedArtifacts: string[] = [];
  let reviewStatus: SddResultStatus | null = null;
  let validationStatus: SddResultStatus | null = null;
  let validationTrust: ArtifactTrustValidationReport | null = null;

  await appendEvent(projectRoot, runId, {
    event: 'phase_started',
    runId,
    summary: `Phase 1.9 goal-level verify started for ${options.taskId}`,
    data: { phase: 'verify', branch, task: options.taskId }
  });

  if (!inspected.task) {
    gaps.push(taskGap(options.taskId, 'task', `Task ${options.taskId} was not found for goal-level verification.`, 'Create the task or choose an existing task id before verify.'));
  }

  if (!reviewArtifact) {
    gaps.push(taskGap(options.taskId, 'review_artifact', 'No reviewer artifact was supplied or found in run state.', 'Run review first or pass --review-artifact artifacts/<file>.'));
  } else {
    const reviewReport = await validateSddResultArtifact(projectRoot, runId, reviewArtifact, { expectedTask: options.taskId, expectedAgent: 'reviewer' });
    if (!reviewReport.valid || !reviewReport.result) {
      gaps.push(taskGap(options.taskId, 'review_artifact', `Reviewer artifact ${reviewArtifact} is invalid: ${reviewReport.issues.map((issue) => issue.message).join('; ')}`, 'Fix reviewer artifact contract before goal-level verify.'));
    } else {
      reviewStatus = reviewReport.result.status;
      acceptedArtifacts.push(reviewArtifact);
      if (reviewReport.result.status !== 'PASS') {
        gaps.push(taskGap(options.taskId, 'review_status', `Reviewer status is ${reviewReport.result.status}, not PASS.`, 'Resolve review findings before marking verification PASS.'));
      }
    }
  }

  if (!validationArtifact) {
    gaps.push(taskGap(options.taskId, 'validation_artifact', 'No validator artifact was supplied or found in run state.', 'Run validation first or pass --validation-artifact artifacts/<file>.'));
  } else {
    const validationReport = await validateSddResultArtifact(projectRoot, runId, validationArtifact, { expectedTask: options.taskId, expectedAgent: 'validator' });
    validationTrust = validationReport.trust ?? null;
    if (!validationReport.valid || !validationReport.result) {
      gaps.push(taskGap(options.taskId, 'validation_artifact', `Validator artifact ${validationArtifact} is invalid: ${validationReport.issues.map((issue) => issue.message).join('; ')}`, 'Fix validator artifact contract before goal-level verify.'));
    } else {
      validationStatus = validationReport.result.status;
      acceptedArtifacts.push(validationArtifact);
      if (validationReport.result.status === 'FAIL' || validationReport.result.status === 'BLOCKED') {
        gaps.push(taskGap(options.taskId, 'validation_status', `Validator status is ${validationReport.result.status}.`, 'Do not mark task completed; inspect validation gaps and recovery proposal.'));
      }
    }
  }

  if (inspected.task) {
    const validationRaw = validationArtifact ? await readArtifactIfExists(projectRoot, runId, validationArtifact) : '';
    const reviewRaw = reviewArtifact ? await readArtifactIfExists(projectRoot, runId, reviewArtifact) : '';
    if (reviewArtifact && reviewRaw.length > 0) {
      await appendArtifactHashLedgerEntry(projectRoot, { runId, taskId: options.taskId, branch, artifactPath: reviewArtifact, content: reviewRaw });
    }
    if (validationArtifact && validationRaw.length > 0) {
      await appendArtifactHashLedgerEntry(projectRoot, { runId, taskId: options.taskId, branch, artifactPath: validationArtifact, content: validationRaw });
    }
    await appendDeclaredCommandLedgerEntries(projectRoot, { runId, taskId: options.taskId, branch, commands: inspected.task.validation });
    const invocationLedger = await listInvocationLedgerEntries(projectRoot, runId);
    const admittedClaims = await readRuntimeEvidenceClaims(projectRoot, runId, options.taskId);
    const scopeViolation = await hasRuntimeEvidenceScopeViolation(projectRoot, runId, options.taskId);
    if (scopeViolation) {
      gaps.push(taskGap(options.taskId, 'runtime_scope', 'PARTITION_SCOPE_VIOLATION: Runtime evidence claims do not match the run partition.', 'Reingest validator evidence in the correct branch/partition before verify.'));
    }
    for (const target of taskAcceptanceCoverageTargets(inspected.task)) {
      const coverage = scopeViolation
        ? acceptanceCoverageDecision(target.label, 'BLOCKED', 'Runtime evidence scope violation blocks acceptance coverage.', ['PARTITION_SCOPE_VIOLATION'], [], ['require-partition-scope'])
        : evaluateAcceptanceCoverageTarget(target, {
          taskId: options.taskId,
          validationArtifact,
          validationRaw,
          claims: admittedClaims.length > 0 ? admittedClaims : validationTrust?.claims ?? [],
          validationStatus,
          invocationLedger
        });
      await appendInvocationLedgerEntry(projectRoot, {
        runId,
        taskId: options.taskId,
        branch,
        kind: 'policy_evaluation',
        ref: `${ACCEPTANCE_POLICY_RULESET_VERSION}:${target.label}`,
        status: coverage.status,
        artifactPath: validationArtifact,
        inputHash: validationRaw.length > 0 ? hashDocumentContent(validationRaw) : null,
        materialRefs: [],
        metadata: {
          passedRules: coverage.policyDecision?.passedRules.join(',') ?? '',
          failedRules: coverage.policyDecision?.failedRules.join(',') ?? '',
          issueCodes: coverage.issueCodes?.join(',') ?? ''
        }
      });
      acceptanceCoverage.push(coverage);
      if (coverage.status !== 'PASS') {
        gaps.push(taskGap(options.taskId, 'acceptance_coverage', `Acceptance target ${target.label} is ${coverage.status}: ${coverage.evidence}`, `Add ${SDD_EVIDENCE_CONTRACT} claim/evidence/provenance/policy records for ${target.label}; mention-only acceptance refs cannot pass.`));
      }
    }
  }

  const status = deriveGoalVerifyStatus(reviewStatus, validationStatus, gaps);
  const standardStatus = toHarnessVerifyStatus(status, reviewStatus, validationStatus, gaps);
  const coverageArtifact = await writeArtifact(projectRoot, runId, `acceptance-coverage-${options.taskId}.md`, renderAcceptanceCoverageArtifact(options.taskId, status, inspected.task, reviewArtifact, validationArtifact, acceptanceCoverage, gaps));
  const allArtifacts = [...acceptedArtifacts, coverageArtifact.runRelativePath];
  const proposal = await writeSyncBackProposal(projectRoot, runId, options.taskId, status === 'PASS' ? 'verified' : 'blocked', allArtifacts, gaps, status === 'PASS' ? 'Goal-level verify mapped validator evidence to all acceptance items.' : 'Goal-level verify found gaps; sync-back is a verification gap proposal, not task completion.');

  await persistVerifyState(projectRoot, runId, {
    status,
    taskId: options.taskId,
    taskState: { status: status === 'PASS' ? 'verified' : 'blocked', verifyStatus: status, gaps, artifacts: allArtifacts, acceptanceCoverage },
    commands: inspected.task?.validation ?? [],
    evidence: allArtifacts,
    syncBackProposalPath: proposal.runRelativePath,
    syncBackProposalDigest: proposal.digest,
    artifacts: allArtifacts.map((artifactPath) => ({ path: artifactPath, kind: artifactKind(artifactPath), task: options.taskId, agent: agentFromArtifactPath(artifactPath) }))
  });
  await appendEvent(projectRoot, runId, {
    event: status === 'PASS' ? 'validation_passed' : 'validation_failed',
    runId,
    summary: `Phase 1.9 goal-level verify ${status} for ${options.taskId}`,
    data: { task: options.taskId, status, coverageArtifact: coverageArtifact.runRelativePath, gaps }
  });
  await appendEvent(projectRoot, runId, {
    event: 'sync_back_proposed',
    runId,
    summary: `Verify sync-back proposal created for ${options.taskId}`,
    data: { proposal: proposal.runRelativePath, status }
  });

  return {
    runId,
    taskId: options.taskId,
    status,
    task: inspected.task,
    reviewArtifact,
    validationArtifact,
    coverageArtifactPath: coverageArtifact.runRelativePath,
    syncBackProposalPath: proposal.runRelativePath,
    acceptanceCoverage,
    gaps,
    commands: inspected.task?.validation ?? [],
    standardStatus,
    message: status === 'PASS' ? 'Goal-level verify passed with explicit acceptance coverage.' : 'Goal-level verify found gaps; inspect coverage artifact and sync-back proposal.'
  };
}

async function persistVerifyState(projectRoot: string, runId: string, input: {
  status: GoalVerifyStatus;
  taskId: string;
  taskState: unknown;
  commands: string[];
  evidence: string[];
  syncBackProposalPath: string;
  syncBackProposalDigest: string;
  artifacts: Array<{ path: string; kind: string; task: string; agent: string }>;
}): Promise<void> {
  const state = await readRunState(projectRoot, runId);
  const now = new Date().toISOString();
  const knownArtifactPaths = new Set(state.artifacts.map((artifact) => artifact.path));
  const newArtifacts = input.artifacts
    .filter((artifact) => !knownArtifactPaths.has(artifact.path))
    .map((artifact) => ({ ...artifact, createdAt: now }));
  await writeRunState(projectRoot, {
    ...state,
    status: input.status === 'PASS' ? 'completed' : 'blocked',
    phase: 'verify',
    currentTask: input.taskId,
    tasks: {
      ...state.tasks,
      [input.taskId]: input.taskState
    },
    artifacts: [...state.artifacts, ...newArtifacts],
    validation: {
      status: input.status === 'PASS' ? 'pass' : input.status === 'PASS_WITH_GAPS' ? 'pass_with_gaps' : input.status === 'BLOCKED' ? 'blocked' : 'fail',
      commands: input.commands,
      evidence: input.evidence
    },
    syncBack: {
      mode: 'proposal',
      proposalPath: input.syncBackProposalPath,
      proposalDigest: input.syncBackProposalDigest,
      sourceVerifyStatus: input.status,
      status: state.syncBack.status === 'applied' ? 'applied' : 'proposed'
    }
  });
}

async function writeSyncBackProposal(projectRoot: string, runId: string, taskId: string, status: string, artifacts: string[], gaps: SddTaskGap[], summary: string): Promise<{ absolutePath: string; runRelativePath: string; digest: string }> {
  const content = `# Sync-back Proposal\n\n## ${taskId}\n\n- status: ${status}\n- summary: ${summary}\n- artifacts:\n${artifacts.length > 0 ? artifacts.map((artifact) => `  - ${artifact}`).join('\n') : '  - none'}\n- gaps:\n${gaps.length > 0 ? gaps.map((gap) => `  - [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message}`).join('\n') : '  - none'}\n\n## Boundaries\n\n- Proposal only; tasks.md/spec.md/plan.md were not modified by runtime.\n- Runtime modeled agent/verify steps through supplied artifacts and contract validation; no external agent API was invoked.\n`;
  const written = await writeArtifact(projectRoot, runId, 'sync-back-proposal.md', content);
  return { ...written, digest: hashDocumentContent(content) };
}

function renderAcceptanceCoverageArtifact(taskId: string, status: GoalVerifyStatus, task: SddTask | null, reviewArtifact: string | null, validationArtifact: string | null, coverage: AcceptanceCoverageItem[], gaps: SddTaskGap[]): string {
  return `# Acceptance Coverage ${taskId}\n\n\`\`\`sdd-result\ncontract: ${SDD_RESULT_CONTRACT}\nversion: ${SDD_RESULT_VERSION}\nagent: validator\ntask: ${taskId}\nstatus: ${status}\nartifacts:\n  - artifacts/acceptance-coverage-${taskId}.md\n\`\`\`\n\n## Source Evidence\n\n- review_artifact: ${reviewArtifact ?? 'missing'}\n- validation_artifact: ${validationArtifact ?? 'missing'}\n- task_source: ${task ? sourceLocationEvidence(task.source) : 'missing'}\n\n## Commands Declared\n\n${task && task.validation.length > 0 ? task.validation.map((command) => `- ${command}`).join('\n') : '- none'}\n\n## Acceptance Mapping\n\n${coverage.length > 0 ? coverage.map((item) => `- [${item.status}] ${item.acceptance} Evidence: ${item.evidence}`).join('\n') : '- No acceptance items available.'}\n\n## Policy Decisions\n\n${coverage.length > 0 ? coverage.map((item) => `- ${item.acceptance}: status=${item.policyDecision?.status ?? item.status}; ruleset=${item.policyDecision?.ruleSet.id ?? ACCEPTANCE_POLICY_RULESET_VERSION}; passed=${item.policyDecision?.passedRules.join(',') || 'none'}; failed=${item.policyDecision?.failedRules.join(',') || 'none'}; issues=${item.issueCodes?.join(',') || 'none'}`).join('\n') : '- none'}\n\n## Gaps\n\n${gaps.length > 0 ? gaps.map((gap) => `- [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message} Recommendation: ${gap.recommendation}`).join('\n') : '- none'}\n`;
}

function evaluateAcceptanceCoverageTarget(target: AcceptanceCoverageTarget, input: { taskId: string; validationArtifact: string | null; validationRaw: string; claims: EvidenceClaim[]; validationStatus: SddResultStatus | null; invocationLedger: InvocationLedgerEntry[] }): AcceptanceCoverageItem {
  const matchingClaims = input.claims.filter((claim) => claim.task === input.taskId && acceptanceMatchesTarget(target, claim.acceptance));
  const issueCodes: EvidenceQualityIssue[] = [];
  const failedRules: string[] = [];
  if (matchingClaims.length === 0) {
    if (target.matchTexts.some((text) => text.length > 0 && input.validationRaw.toLowerCase().includes(text.toLowerCase()))) {
      issueCodes.push('MENTION_ONLY');
      failedRules.push('require-structured-evidence');
      return acceptanceCoverageDecision(target.label, 'REFERENCED_ONLY', `Referenced ${target.label} in ${input.validationArtifact ?? 'validator artifact'} without policy-backed evidence.`, issueCodes, [], failedRules);
    }
    issueCodes.push('MISSING_ARTIFACT_REFERENCE');
    failedRules.push('require-acceptance-claim');
    return acceptanceCoverageDecision(target.label, 'MISSING', 'No policy-backed acceptance evidence found in validator artifact.', issueCodes, [], failedRules);
  }

  let best = matchingClaims[0];
  for (const claim of matchingClaims.slice(1)) {
    if (coverageRank(claim.status) > coverageRank(best.status)) {
      best = claim;
    }
  }

  if (best.status === 'PASS') {
    if (best.evidence.length === 0) {
      issueCodes.push('UNSOURCED_PASS');
      failedRules.push('require-source-evidence');
    }
    if (best.provenance.length === 0) {
      issueCodes.push('PROVENANCE_GAP');
      failedRules.push('require-provenance');
    }
    if (best.policy.length === 0) {
      issueCodes.push('POLICY_RULE_FAILED');
      failedRules.push('require-policy-rule');
    }
    if (input.validationStatus !== 'PASS') {
      issueCodes.push('POLICY_RULE_FAILED');
      failedRules.push('require-validator-pass');
    }
    const ledgerDecision = evaluateClaimLedgerCorroboration(best, input.invocationLedger);
    issueCodes.push(...ledgerDecision.issueCodes);
    failedRules.push(...ledgerDecision.failedRules);
    if (issueCodes.length === 0) {
      return acceptanceCoverageDecision(target.label, 'PASS', `Policy-proven by ${SDD_EVIDENCE_CONTRACT} claim for ${best.acceptance} in ${best.sourceArtifact}; evidence=${best.evidence.map((item) => `${item.kind}:${item.ref}`).join(', ')}; provenance=${best.provenance.join(', ')}; policy=${best.policy.join(', ')}.`, [], ['require-source-evidence', 'require-provenance', 'require-policy-rule', 'require-validator-pass', 'require-ledger-corroboration'], []);
    }
    return acceptanceCoverageDecision(target.label, 'BLOCKED', `PASS claim for ${best.acceptance} is missing required policy/provenance corroboration.`, issueCodes, [], failedRules);
  }

  if (best.status === 'FAIL') {
    return acceptanceCoverageDecision(target.label, 'FAIL', `Explicit FAIL claim for ${best.acceptance}: ${best.claim}`, [], ['explicit-fail-overrides-pass'], []);
  }
  if (best.status === 'BLOCKED') {
    return acceptanceCoverageDecision(target.label, 'BLOCKED', `Explicit BLOCKED claim for ${best.acceptance}: ${best.claim}`, [], ['explicit-blocked-overrides-pass'], []);
  }
  if (best.status === 'REFERENCED_ONLY') {
    return acceptanceCoverageDecision(target.label, 'REFERENCED_ONLY', `Structured evidence references ${best.acceptance} but does not prove PASS.`, ['MENTION_ONLY'], [], ['require-pass-claim']);
  }
  return acceptanceCoverageDecision(target.label, 'MISSING', `Structured evidence marks ${best.acceptance} missing.`, ['MISSING_ARTIFACT_REFERENCE'], [], ['require-pass-claim']);
}

function evaluateClaimLedgerCorroboration(claim: EvidenceClaim, entries: InvocationLedgerEntry[]): { issueCodes: EvidenceQualityIssue[]; failedRules: string[] } {
  const issueCodes: EvidenceQualityIssue[] = [];
  const failedRules: string[] = [];
  const commandRefs = invocationLedgerRefs(entries, 'command');
  const artifactRefs = invocationLedgerRefs(entries, 'artifact_hash');
  const materialRefs = ledgerMaterialRefs(entries);
  const addIssue = (code: EvidenceQualityIssue, rule: string): void => {
    if (!issueCodes.includes(code)) {
      issueCodes.push(code);
    }
    if (!failedRules.includes(rule)) {
      failedRules.push(rule);
    }
  };

  if (!artifactRefs.has(claim.sourceArtifact)) {
    addIssue('MISSING_ARTIFACT_REFERENCE', 'require-source-artifact-hash');
  }
  for (const item of claim.evidence) {
    if (item.kind === 'command' && !commandRefs.has(item.ref)) {
      addIssue('MISSING_COMMAND_OUTPUT', 'require-command-ledger');
    }
    if (item.kind === 'artifact' && !artifactRefs.has(item.ref)) {
      addIssue('MISSING_ARTIFACT_REFERENCE', 'require-artifact-hash');
    }
    if (item.kind === 'material' && !materialRefs.has(item.ref)) {
      addIssue('MISSING_MATERIAL_REFERENCE', 'require-material-ledger');
    }
  }
  for (const ref of claim.provenance) {
    const typed = parseTypedLedgerRef(ref);
    if (!typed) {
      continue;
    }
    if (typed.kind === 'command' && !commandRefs.has(typed.ref)) {
      addIssue('PROVENANCE_GAP', 'require-command-provenance-ledger');
    }
    if (typed.kind === 'artifact' && !artifactRefs.has(typed.ref)) {
      addIssue('PROVENANCE_GAP', 'require-artifact-provenance-ledger');
    }
    if (typed.kind === 'material' && !materialRefs.has(typed.ref)) {
      addIssue('PROVENANCE_GAP', 'require-material-provenance-ledger');
    }
  }
  return { issueCodes, failedRules };
}

function invocationLedgerRefs(entries: InvocationLedgerEntry[], kind: InvocationLedgerKind): Set<string> {
  const refs = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === kind) {
      refs.add(entry.ref);
      if (entry.artifactPath) {
        refs.add(entry.artifactPath);
      }
    }
  }
  return refs;
}

function parseTypedLedgerRef(value: string): { kind: string; ref: string } | null {
  const separator = value.indexOf(':');
  if (separator <= 0) {
    return null;
  }
  const kind = value.slice(0, separator).trim();
  const ref = value.slice(separator + 1).trim();
  if (!/^[A-Za-z0-9_-]+$/.test(kind) || !ref) {
    return null;
  }
  return { kind, ref };
}

function acceptanceMatchesTarget(target: AcceptanceCoverageTarget, acceptance: string): boolean {
  const normalizedAcceptance = acceptance.toLowerCase();
  return target.matchTexts.some((text) => text.toLowerCase() === normalizedAcceptance) || target.label.toLowerCase() === normalizedAcceptance;
}

function coverageRank(status: EvidenceCoverageStatus): number {
  if (status === 'FAIL') {
    return 5;
  }
  if (status === 'BLOCKED') {
    return 4;
  }
  if (status === 'PASS') {
    return 3;
  }
  if (status === 'REFERENCED_ONLY') {
    return 2;
  }
  return 1;
}

function acceptanceCoverageDecision(acceptance: string, status: EvidenceCoverageStatus, evidence: string, issueCodes: EvidenceQualityIssue[], passedRules: string[], failedRules: string[]): AcceptanceCoverageItem {
  return {
    acceptance,
    status,
    evidence,
    issueCodes,
    policyDecision: {
      status,
      ruleSet: {
        id: ACCEPTANCE_POLICY_RULESET_VERSION,
        version: SDD_EVIDENCE_VERSION,
        ruleIds: ['require-structured-evidence', 'require-source-evidence', 'require-provenance', 'require-policy-rule']
      },
      passedRules,
      failedRules,
      issueCodes
    }
  };
}

function taskAcceptanceCoverageTargets(task: SddTask): AcceptanceCoverageTarget[] {
  if (task.acceptanceRefs.length > 0) {
    return task.acceptanceRefs.map((ref, index) => {
      const description = task.acceptance[index] ?? null;
      return {
        label: ref,
        description,
        matchTexts: description ? [ref, description] : [ref]
      };
    });
  }
  return task.acceptance.map((acceptance) => ({
    label: acceptance,
    description: null,
    matchTexts: [acceptance]
  }));
}

function deriveGoalVerifyStatus(reviewStatus: SddResultStatus | null, validationStatus: SddResultStatus | null, gaps: SddTaskGap[]): GoalVerifyStatus {
  if (gaps.length > 0) {
    return validationStatus === 'PASS_WITH_GAPS' ? 'PASS_WITH_GAPS' : 'BLOCKED';
  }
  if (reviewStatus !== 'PASS' || !validationStatus) {
    return 'BLOCKED';
  }
  if (validationStatus === 'PASS') {
    return 'PASS';
  }
  if (validationStatus === 'PASS_WITH_GAPS') {
    return 'PASS_WITH_GAPS';
  }
  return validationStatus === 'FAIL' ? 'FAIL' : 'BLOCKED';
}

function toHarnessVerifyStatus(status: GoalVerifyStatus, reviewStatus: SddResultStatus | null, validationStatus: SddResultStatus | null, gaps: SddTaskGap[]): HarnessVerifyStatus {
  if (status === 'PASS') {
    return 'PASS';
  }
  if (status === 'PASS_WITH_GAPS') {
    return 'GAPS';
  }
  if (!reviewStatus || !validationStatus || gaps.some((gap) => gap.field === 'review_artifact' || gap.field === 'validation_artifact')) {
    return 'HUMAN_NEEDED';
  }
  return 'BLOCKED';
}

async function readArtifactIfExists(projectRoot: string, runId: string, runRelativeArtifactPath: string): Promise<string> {
  try {
    return await readArtifact(projectRoot, runId, toArtifactRootRelativePath(runRelativeArtifactPath));
  } catch {
    return '';
  }
}

function artifactPathForAgent(state: RunState, taskId: string, agent: string): string | null {
  const delegation = Object.values(state.delegations).find((candidate) => candidate.task === taskId && candidate.agent === agent && candidate.status === 'COMPLETED');
  if (delegation) {
    return delegation.expectedArtifact;
  }
  const artifact = state.artifacts.find((candidate) => candidate.task === taskId && candidate.agent === agent);
  return artifact?.path ?? null;
}

function agentFromArtifactPath(artifactPath: string): string {
  const kind = artifactKind(artifactPath);
  if (kind === 'implement') {
    return 'implementer';
  }
  if (kind === 'review' || kind === 'validation' || kind === 'debug') {
    return kind === 'debug' ? 'debugger' : kind === 'review' ? 'reviewer' : 'validator';
  }
  if (kind === 'gap-report' || kind === 'sync-back-proposal') {
    return 'runtime';
  }
  return 'unknown';
}

function sourceLocationEvidence(source: SddTask['source']): string {
  return `${source.filePath}:${source.lineStart}-${source.lineEnd}`;
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

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}
