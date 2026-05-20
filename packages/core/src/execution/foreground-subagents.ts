import { readArtifact } from '../run-state/artifacts.js';
import { SUBAGENT_DISPATCH_CONTRACT_VERSION, SUBAGENT_RESULT_CONTRACT_VERSION, WORK_UNIT_CONTRACT_VERSION, type RuntimeRef, type RuntimeScope } from '../contracts.js';
import { contractIssue, type ContractValidationIssue } from '../contracts/issues.js';
import { ingestArtifactResult, type ArtifactResultIngestionResult } from '../artifacts/ingestion.js';
import { createDelegationRecord } from '../delegation/validation.js';
import { persistDelegation } from '../delegation/run-state.js';
import { appendEvent } from '../run-state/events.js';
import { createRun, readRunState, writeRunState } from '../run-state/run-state.js';
import { bindRunStateToTaskContext } from '../sdd-docs/run-binding.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import { routeSddTask } from '../router/route-sdd-task.js';
import { buildAgentExecutionRecord, writeAgentExecutionRecord } from './agent-execution-records.js';
import { invokeClaudeCodeSubagentHost, type HostInvocationCommandOptions, type HostInvocationResult } from './host-invocation.js';
import { getRunRelativeArtifactPath, toArtifactRootRelativePath } from '../runtime-paths.js';
import { recordRuntimeProjection } from '../storage/runtime-store.js';
import { recordSubagentDispatchProjection, recordSubagentResultProjection } from '../subagents/runtime.js';
import type { SubagentDispatch, SubagentResult } from '../subagents/contracts.js';
import { recordWorkUnitProjection } from '../work-units/runtime.js';
import type { WorkUnit } from '../work-units/contracts.js';

export type ForegroundSubagentStatus = 'completed' | 'failed' | 'blocked';

const FOREGROUND_SUBAGENT_DIGEST_CONTRACT = 'sdd-foreground-subagent-digest-v1';
const FOREGROUND_SUBAGENT_DIGEST_PROJECTION_TYPE = 'foreground_subagent_digest';
const MAX_DIGEST_SUMMARY_CHARS = 1_000;
const MAX_KEY_FINDINGS = 5;

export interface ForegroundSubagentRunOptions {
  branch?: string;
  runId?: string;
  taskId: string;
  agents: string[];
  timeoutSeconds?: number;
  approved?: boolean;
  hostInvocation?: HostInvocationCommandOptions;
}

export interface ForegroundSubagentDigest {
  contract: 'sdd-foreground-subagent-digest-v1';
  agent: string;
  delegationId: string;
  taskId: string;
  status: ForegroundSubagentStatus;
  authority: 'non-authoritative';
  summary: string;
  keyFindings: string[];
  recommendation: string | null;
  confidence: 'high' | 'medium' | 'low';
  needsMainAgentReview: boolean;
  sourceArtifactRef: RuntimeRef | null;
  deepReadRefs: RuntimeRef[];
  allowedUse: Array<'summary' | 'diagnostic'>;
  forbiddenUse: Array<'final-risk-decision' | 'stage-completion' | 'ship-gate-pass'>;
  generatedAt: string;
}

export interface ForegroundSubagentSlotResult {
  agent: string;
  delegationId: string;
  artifactPath: string | null;
  status: ForegroundSubagentStatus;
  hostInvocation: HostInvocationResult | null;
  ingestion: ArtifactResultIngestionResult['record'] | null;
  issues: ContractValidationIssue[];
  digest: ForegroundSubagentDigest | null;
  digestRef: RuntimeRef | null;
}

export interface ForegroundSubagentRunResult {
  contract: 'sdd-foreground-subagents-v1';
  runId: string;
  branch: string;
  taskId: string;
  status: ForegroundSubagentStatus;
  agents: ForegroundSubagentSlotResult[];
  message: string;
  summaryRefs: RuntimeRef[];
  doNotReadUnlessNeededRefs: RuntimeRef[];
}

export async function runForegroundSubagents(projectRoot: string, options: ForegroundSubagentRunOptions): Promise<ForegroundSubagentRunResult> {
  const context = await resolveSddContext(projectRoot, options.branch ? { branch: options.branch, branchSource: 'cli_option' } : {});
  const branch = context.partition;
  const agents = normalizeAgents(options.agents);
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  const runState = options.runId ? await readRunState(projectRoot, options.runId) : await createRun(projectRoot);
  const boundRunState = await bindRunStateToTaskContext(projectRoot, runState, context, model, inspected.task ?? null, options.taskId);
  const runId = boundRunState.runId;
  const route = await routeSddTask(projectRoot, { taskId: options.taskId, branch, approved: options.approved });
  const preflightIssues: ContractValidationIssue[] = [];

  if (agents.length === 0) {
    preflightIssues.push(contractIssue('agents', 'At least one foreground subagent is required.', 'Pass one or more --agent values.'));
  }
  if (!inspected.task || inspected.gaps.some((gap) => gap.severity === 'blocking')) {
    preflightIssues.push(...inspected.gaps.map((gap) => contractIssue(gap.field, gap.message, gap.recommendation)));
  }
  if (route.blockedReason) {
    preflightIssues.push(contractIssue('agent_router', route.blockedReason, route.nextAction));
  }

  if (preflightIssues.length > 0) {
    await appendEvent(projectRoot, runId, { event: 'foreground_subagents_blocked', runId, summary: `Foreground subagents blocked for ${options.taskId}`, data: { taskId: options.taskId, branch, issues: preflightIssues } });
    return {
      contract: 'sdd-foreground-subagents-v1',
      runId,
      branch,
      taskId: options.taskId,
      status: 'blocked',
      agents: agents.map((agent, index) => blockedSlot(agent, options.taskId, index + 1, preflightIssues)),
      message: 'Foreground subagents blocked before host invocation.',
      summaryRefs: [],
      doNotReadUnlessNeededRefs: []
    };
  }

  await writeRunState(projectRoot, { ...boundRunState, status: 'running', phase: 'foreground-subagents', currentTask: options.taskId });
  await appendEvent(projectRoot, runId, { event: 'foreground_subagents_started', runId, summary: `Foreground subagents started for ${options.taskId}`, data: { taskId: options.taskId, branch, agents } });

  const slots = agents.map((agent, index) => {
    const delegationId = `F-${options.taskId}-${safeToken(agent)}-${String(index + 1).padStart(3, '0')}`;
    const expectedArtifact = getRunRelativeArtifactPath(toArtifactRootRelativePath(`artifacts/${safeToken(agent)}-${options.taskId}-${String(index + 1).padStart(3, '0')}.md`));
    return { agent, delegationId, expectedArtifact };
  });

  for (const slot of slots) {
    await persistDelegation(projectRoot, runId, createDelegationRecord({
      delegationId: slot.delegationId,
      task: options.taskId,
      agent: slot.agent,
      runMode: 'foreground',
      blocking: false,
      requiredForPhaseExit: false,
      expectedArtifact: slot.expectedArtifact,
      timeoutSeconds: options.timeoutSeconds
    }));
    await recordForegroundSubagentDispatch(projectRoot, { branch, runId, taskId: options.taskId, agent: slot.agent, delegationId: slot.delegationId, artifactPath: slot.expectedArtifact, status: 'running', resultStatus: null });
  }

  const hostResults = await Promise.allSettled(slots.map((slot) => invokeClaudeCodeSubagentHost({
    projectRoot,
    runId,
    taskId: options.taskId,
    agent: slot.agent,
    delegationId: slot.delegationId,
    queueItemId: `${runId}:${slot.delegationId}`,
    expectedArtifact: slot.expectedArtifact,
    timeoutSeconds: options.timeoutSeconds,
    commandOptions: options.hostInvocation
  })));

  const results: ForegroundSubagentSlotResult[] = [];
  for (const [index, slot] of slots.entries()) {
    const hostResult = hostResults[index];
    const slotResult = await finishForegroundSlot(projectRoot, { branch, runId, taskId: options.taskId, route, slot, hostResult });
    results.push(slotResult);
  }

  const status = results.some((result) => result.status === 'blocked') ? 'blocked' : results.some((result) => result.status === 'failed') ? 'failed' : 'completed';
  const latestState = await readRunState(projectRoot, runId);
  await writeRunState(projectRoot, { ...latestState, status: status === 'completed' ? 'completed' : status, phase: 'foreground-subagents', currentTask: options.taskId });
  const aggregate: ForegroundSubagentRunResult = {
    contract: 'sdd-foreground-subagents-v1',
    runId,
    branch,
    taskId: options.taskId,
    status,
    agents: results,
    message: foregroundMessage(status, results),
    summaryRefs: results.flatMap((result) => result.digestRef ? [result.digestRef] : []),
    doNotReadUnlessNeededRefs: results.flatMap((result) => result.artifactPath ? [{ kind: 'artifact' as const, ref: result.artifactPath }] : [])
  };
  await recordRuntimeProjection(projectRoot, 'foreground_subagents', `${branch}:${options.taskId}:${runId}`, aggregate);
  await appendEvent(projectRoot, runId, { event: 'foreground_subagents_completed', runId, summary: aggregate.message, data: { taskId: options.taskId, branch, status, agents: results.map((result) => ({ agent: result.agent, delegationId: result.delegationId, status: result.status, artifactPath: result.artifactPath })) } });
  return aggregate;
}

async function finishForegroundSlot(projectRoot: string, input: { branch: string; runId: string; taskId: string; route: Awaited<ReturnType<typeof routeSddTask>>; slot: { agent: string; delegationId: string; expectedArtifact: string }; hostResult: PromiseSettledResult<HostInvocationResult> }): Promise<ForegroundSubagentSlotResult> {
  if (input.hostResult.status === 'rejected') {
    const issue = contractIssue('hostInvocation', input.hostResult.reason instanceof Error ? input.hostResult.reason.message : String(input.hostResult.reason), 'Inspect the foreground subagent host command and retry this slot with a new delegation id.');
    const digest = buildHostFailureDigest(input.taskId, input.slot.agent, input.slot.delegationId, issue);
    const digestRef = await recordForegroundSubagentDigest(projectRoot, input, digest);
    await recordForegroundSubagentDispatch(projectRoot, { branch: input.branch, runId: input.runId, taskId: input.taskId, agent: input.slot.agent, delegationId: input.slot.delegationId, artifactPath: input.slot.expectedArtifact, status: 'failed', resultStatus: null, summary: digest.summary });
    await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({ runId: input.runId, taskId: input.taskId, agent: input.slot.agent, route: input.route, status: 'failed', delegationId: input.slot.delegationId, queueItemId: `${input.runId}:${input.slot.delegationId}`, artifactPath: input.slot.expectedArtifact, evidenceSummary: `Foreground subagent host invocation failed for ${input.slot.delegationId}.` }));
    return { agent: input.slot.agent, delegationId: input.slot.delegationId, artifactPath: input.slot.expectedArtifact, status: 'failed', hostInvocation: null, ingestion: null, issues: [issue], digest, digestRef };
  }

  const hostInvocation = input.hostResult.value;
  const ingestion = await ingestArtifactResult(projectRoot, input.runId, { delegationId: input.slot.delegationId, artifactPath: hostInvocation.artifactPath });
  const status: ForegroundSubagentStatus = ingestion.valid && ingestion.record.delegationStatus === 'COMPLETED' ? 'completed' : ingestion.valid ? 'failed' : 'blocked';
  const digest = await buildForegroundSubagentDigest(projectRoot, input.runId, input.taskId, input.slot.agent, input.slot.delegationId, status, ingestion.record);
  const digestRef = await recordForegroundSubagentDigest(projectRoot, input, digest);
  await recordForegroundSubagentDispatch(projectRoot, { branch: input.branch, runId: input.runId, taskId: input.taskId, agent: input.slot.agent, delegationId: input.slot.delegationId, artifactPath: ingestion.record.artifactPath, status: status === 'completed' ? 'completed' : 'failed', resultStatus: ingestion.record.resultStatus, summary: digest.summary });
  await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
    runId: input.runId,
    taskId: input.taskId,
    agent: input.slot.agent,
    route: input.route,
    status,
    delegationId: input.slot.delegationId,
    queueItemId: `${input.runId}:${input.slot.delegationId}`,
    ingestion: ingestion.record,
    evidenceSummary: ingestion.valid ? `Foreground subagent ingested terminal artifact for ${input.slot.delegationId}.` : `Foreground subagent artifact ingestion blocked for ${input.slot.delegationId}.`
  }));
  await appendEvent(projectRoot, input.runId, { event: 'foreground_subagent_slot_completed', runId: input.runId, summary: `Foreground subagent ${input.slot.delegationId} ${status}`, data: { taskId: input.taskId, agent: input.slot.agent, delegationId: input.slot.delegationId, status, artifactPath: ingestion.record.artifactPath, digestRef, issues: ingestion.record.issues } });
  return { agent: input.slot.agent, delegationId: input.slot.delegationId, artifactPath: ingestion.record.artifactPath, status, hostInvocation, ingestion: ingestion.record, issues: ingestion.record.issues, digest, digestRef };
}

async function recordForegroundSubagentDispatch(projectRoot: string, input: { branch: string; runId: string; taskId: string; agent: string; delegationId: string; artifactPath: string | null; status: 'running' | 'completed' | 'failed'; resultStatus: string | null; summary?: string }): Promise<void> {
  const now = new Date().toISOString();
  const scope: RuntimeScope = { branch: input.branch, taskId: input.taskId, runId: input.runId };
  const outputRefs = input.artifactPath ? [{ kind: 'artifact' as const, ref: input.artifactPath }] : [];
  const workUnit: WorkUnit = {
    contract: WORK_UNIT_CONTRACT_VERSION,
    id: foregroundWorkUnitId(scope, input.agent),
    scope,
    stageRunId: `stage:${input.branch}:${input.taskId}:${input.runId}:do`,
    type: 'subagent',
    name: input.agent,
    purpose: 'Non-authoritative foreground evidence collection.',
    status: input.status === 'running' ? 'running' : input.status === 'completed' ? 'completed' : 'failed',
    blocking: false,
    authority: 'non-authoritative',
    requiredBefore: 'never',
    contextRef: { kind: 'task', ref: input.taskId },
    outputRefs,
    evidenceRefs: outputRefs,
    createdAt: now,
    completedAt: input.status === 'running' ? undefined : now
  };
  const dispatch: SubagentDispatch = {
    contract: SUBAGENT_DISPATCH_CONTRACT_VERSION,
    id: foregroundDispatchId(scope, input.delegationId),
    scope,
    workUnitId: workUnit.id,
    definitionName: input.agent,
    mode: 'foreground',
    status: input.status,
    blocking: false,
    requiredBefore: 'never',
    contextRef: { kind: 'task', ref: input.taskId },
    createdAt: now,
    updatedAt: now
  };
  await recordWorkUnitProjection(projectRoot, workUnit);
  await recordSubagentDispatchProjection(projectRoot, dispatch);
  if (input.status !== 'running') {
    const result: SubagentResult = {
      contract: SUBAGENT_RESULT_CONTRACT_VERSION,
      dispatchId: dispatch.id,
      status: input.status === 'completed' ? 'completed' : 'failed',
      authority: 'evidence-candidate',
      summary: input.summary ?? `Foreground subagent dispatch ${dispatch.id} finished with result ${input.resultStatus ?? 'unknown'}.`,
      artifactRefs: outputRefs,
      evidenceRefs: outputRefs,
      modelArtifacts: outputRefs.length > 0 ? [{
        contract: 'sdd-model-produced-artifact-v1',
        producer: 'subagent',
        authority: 'candidate',
        allowedUse: ['summary', 'diagnostic', 'evidence-candidate'],
        forbiddenUse: ['final-risk-decision', 'stage-completion', 'ship-gate-pass'],
        artifactRefs: outputRefs.map((ref) => ref.ref),
        reviewedByRuntime: true
      }] : [],
      completedAt: now
    };
    await recordSubagentResultProjection(projectRoot, result);
  }
}

function blockedSlot(agent: string, taskId: string, index: number, issues: ContractValidationIssue[]): ForegroundSubagentSlotResult {
  return {
    agent,
    delegationId: `F-${taskId}-${safeToken(agent)}-${String(index).padStart(3, '0')}`,
    artifactPath: null,
    status: 'blocked',
    hostInvocation: null,
    ingestion: null,
    issues,
    digest: null,
    digestRef: null
  };
}

async function recordForegroundSubagentDigest(projectRoot: string, input: { branch: string; runId: string; taskId: string; slot: { delegationId: string } }, digest: ForegroundSubagentDigest): Promise<RuntimeRef> {
  const scopeKey = foregroundDigestScopeKey(input.branch, input.taskId, input.runId, input.slot.delegationId);
  await recordRuntimeProjection(projectRoot, FOREGROUND_SUBAGENT_DIGEST_PROJECTION_TYPE, scopeKey, digest);
  return { kind: 'projection', ref: `${FOREGROUND_SUBAGENT_DIGEST_PROJECTION_TYPE}:${scopeKey}` };
}

async function buildForegroundSubagentDigest(projectRoot: string, runId: string, taskId: string, agent: string, delegationId: string, status: ForegroundSubagentStatus, ingestion: ArtifactResultIngestionResult['record']): Promise<ForegroundSubagentDigest> {
  const artifactText = await readArtifactText(projectRoot, runId, ingestion.artifactPath);
  const prose = stripContractFences(artifactText);
  const extractedSummary = extractSection(prose, 'Summary');
  const keyFindings = extractKeyFindings(prose, ingestion);
  const recommendation = extractRecommendation(prose, ingestion);
  const summary = summarizeForegroundArtifactText(extractedSummary || prose, ingestion, status);
  const confidence = digestConfidence(status, ingestion, Boolean(extractedSummary || keyFindings.length > 0));
  return {
    contract: FOREGROUND_SUBAGENT_DIGEST_CONTRACT,
    agent,
    delegationId,
    taskId,
    status,
    authority: 'non-authoritative',
    summary,
    keyFindings,
    recommendation,
    confidence,
    needsMainAgentReview: needsMainAgentReview(status, ingestion, recommendation),
    sourceArtifactRef: { kind: 'artifact', ref: ingestion.artifactPath },
    deepReadRefs: [{ kind: 'artifact', ref: ingestion.artifactPath }],
    allowedUse: ['summary', 'diagnostic'],
    forbiddenUse: ['final-risk-decision', 'stage-completion', 'ship-gate-pass'],
    generatedAt: new Date().toISOString()
  };
}

function buildHostFailureDigest(taskId: string, agent: string, delegationId: string, issue: ContractValidationIssue): ForegroundSubagentDigest {
  return {
    contract: FOREGROUND_SUBAGENT_DIGEST_CONTRACT,
    agent,
    delegationId,
    taskId,
    status: 'failed',
    authority: 'non-authoritative',
    summary: truncateDigestText(`Host invocation failed before a validated subagent artifact was available: ${issue.message}`),
    keyFindings: [issue.message],
    recommendation: issue.recommendation,
    confidence: 'low',
    needsMainAgentReview: true,
    sourceArtifactRef: null,
    deepReadRefs: [],
    allowedUse: ['summary', 'diagnostic'],
    forbiddenUse: ['final-risk-decision', 'stage-completion', 'ship-gate-pass'],
    generatedAt: new Date().toISOString()
  };
}

async function readArtifactText(projectRoot: string, runId: string, artifactPath: string): Promise<string> {
  try {
    return await readArtifact(projectRoot, runId, toArtifactRootRelativePath(artifactPath));
  } catch {
    return '';
  }
}

function stripContractFences(markdown: string): string {
  return markdown.replace(/^\s*```sdd-(?:result|evidence)\s*\r?\n[\s\S]*?\r?^\s*```\s*$/gm, '').trim();
}

function summarizeForegroundArtifactText(text: string, ingestion: ArtifactResultIngestionResult['record'], status: ForegroundSubagentStatus): string {
  const cleaned = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter(Boolean)
    .filter((line) => !/^[-*]\s*$/.test(line))
    .join(' ');
  if (cleaned) {
    return truncateDigestText(cleaned);
  }
  const issueSummary = ingestion.issues.map((issue) => issue.message).join(' ');
  return truncateDigestText(issueSummary || `Foreground subagent ${ingestion.agent} finished with ${status} / ${ingestion.resultStatus ?? 'unknown'}.`);
}

function extractKeyFindings(markdown: string, ingestion: ArtifactResultIngestionResult['record']): string[] {
  const section = extractSection(markdown, 'Key findings') || extractSection(markdown, 'Findings') || extractSection(markdown, 'Gaps') || extractSection(markdown, 'Evidence');
  const bullets = section
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''))
    .filter(Boolean)
    .filter((line) => !/^#+\s/.test(line));
  const issueFindings = ingestion.issues.map((issue) => issue.message);
  return uniqueStrings([...bullets, ...issueFindings]).slice(0, MAX_KEY_FINDINGS).map(truncateFinding);
}

function extractRecommendation(markdown: string, ingestion: ArtifactResultIngestionResult['record']): string | null {
  const section = extractSection(markdown, 'Recommendation') || extractSection(markdown, 'Next steps') || extractSection(markdown, 'Deep-read triggers');
  const firstLine = section.split(/\r?\n/).map((line) => line.trim().replace(/^[-*]\s+/, '')).find(Boolean);
  if (firstLine) {
    return truncateDigestText(firstLine, 300);
  }
  return ingestion.issues.map((issue) => issue.recommendation).find((value): value is string => Boolean(value)) ?? null;
}

function extractSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^##\\s+${escaped}\\s*\\r?\\n([\\s\\S]*?)(?=^##\\s+|$)`, 'im'));
  return match?.[1]?.trim() ?? '';
}

function digestConfidence(status: ForegroundSubagentStatus, ingestion: ArtifactResultIngestionResult['record'], hasProse: boolean): ForegroundSubagentDigest['confidence'] {
  if (status === 'completed' && ingestion.status === 'accepted' && hasProse) {
    return 'high';
  }
  if (ingestion.status === 'accepted') {
    return 'medium';
  }
  return 'low';
}

function needsMainAgentReview(status: ForegroundSubagentStatus, ingestion: ArtifactResultIngestionResult['record'], recommendation: string | null): boolean {
  return status !== 'completed' || ingestion.issues.length > 0 || ingestion.gaps.length > 0 || /\b(block|blocked|fail|failed|gap|review)\b/i.test(recommendation ?? '');
}

function truncateDigestText(value: string, maxChars = MAX_DIGEST_SUMMARY_CHARS): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > maxChars ? `${compact.slice(0, maxChars - 1)}…` : compact;
}

function truncateFinding(value: string): string {
  return truncateDigestText(value, 240);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function foregroundDigestScopeKey(branch: string, taskId: string, runId: string, delegationId: string): string {
  return `${branch}:${taskId}:${runId}:${delegationId}`;
}


function normalizeAgents(agents: string[]): string[] {
  return [...new Set(agents.map((agent) => agent.trim()).filter(Boolean))];
}

function safeToken(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
}

function foregroundWorkUnitId(scope: RuntimeScope, agent: string): string {
  return `work-unit:${scope.branch}:${scope.taskId ?? 'all'}:${scope.runId ?? 'none'}:foreground-subagent:${safeToken(agent)}`;
}

function foregroundDispatchId(scope: RuntimeScope, delegationId: string): string {
  return `dispatch:${scope.branch}:${scope.taskId ?? 'all'}:${scope.runId ?? 'none'}:${delegationId}`;
}

function foregroundMessage(status: ForegroundSubagentStatus, results: ForegroundSubagentSlotResult[]): string {
  return `Foreground subagents ${status}: completed=${results.filter((result) => result.status === 'completed').length} failed=${results.filter((result) => result.status === 'failed').length} blocked=${results.filter((result) => result.status === 'blocked').length}.`;
}
