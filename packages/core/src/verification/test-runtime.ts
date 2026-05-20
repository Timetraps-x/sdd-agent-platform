import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { appendEvent } from '../run-state/events.js';
import { appendInvocationLedgerEntry } from '../run-state/invocation-ledger.js';
import type { RunState } from '../run-state/model.js';
import { createRun, readRunState, writeRunState } from '../run-state/run-state.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { bindRunStateToTask } from '../sdd-docs/run-binding.js';
import { parseSddBranch, type SddTask } from '../sdd-docs/task-parser.js';
import { recordRuntimeProjection, recordRuntimeTestRun, recordRuntimeTestStep, runtimeScopedId } from '../storage/runtime-store.js';
import { ACCEPTANCE_POLICY_RULESET_VERSION, SDD_EVIDENCE_CONTRACT, SDD_EVIDENCE_VERSION, SDD_RESULT_CONTRACT, SDD_RESULT_VERSION, TEST_EVIDENCE_RUN_CONTRACT_VERSION, WORKFLOW_HANDOFF_CONTRACT_VERSION } from '../contracts.js';
import type { LifecycleRiskDecision } from '../risk/contracts.js';
import { inspectVerifyContract, writeVerifyContract, type VerifyContractInspection } from './verify-contract.js';
import type { AcceptanceEvidenceCoverage, EvidenceCoverageStatus, TestEvidenceStatus, UnifiedTestEvidenceRun } from '../evidence-runtime.js';
import { ensureTaskOrchestration, inspectOrchestrationGate } from '../orchestration/runtime.js';
import { recordStageRunProjection, recordWorkflowHandoffProjection, validateWorkflowHandoff } from '../stage-runtime/runtime.js';
import type { StageRun, WorkflowHandoff } from '../stage-runtime/contracts.js';
import { evaluateTaskWorkflowGate, verifyContractBlockedGate, type ApprovalPolicy, type LifecycleRiskProfile, type LifecycleWorkflowGate } from '../risk.js';
import { validateSddResultArtifact } from '../artifacts/sdd-result.js';
import { dependencyBlockingReasonsForTask } from '../workflow-state/dependencies.js';

const DEFAULT_TEST_TIMEOUT_MS = 120_000;
const MAX_CAPTURE_BYTES = 256 * 1024;

export type SddTestStatus = 'PASS' | 'FAIL' | 'BLOCKED';
export type SddTestStepStatus = 'pass' | 'fail' | 'blocked';

export interface SddTestCommandInput {
  command?: string;
  argv?: string[];
}

export interface SddTestCommandStep {
  stepId: string;
  command: string;
  argv: string[] | null;
  shell: boolean;
  acceptanceRefs: string[];
  status: SddTestStepStatus;
  exitCode: number | null;
  signal: string | null;
  durationMs: number;
  outputArtifact: string;
  stdoutBytes: number;
  stderrBytes: number;
  truncated: boolean;
}

interface NormalizedSddTestCommand {
  command: string;
  argv: string[] | null;
  shell: boolean;
}

interface TestSyncBackProposal {
  path: string;
  digest: string;
}

type VerifyContractAction = 'none' | 'created' | 'refreshed' | 'blocked';

export interface SddTestResult {
  contract: 'sdd-test-runtime-v1';
  runId: string;
  testRunId: string;
  branch: string;
  taskId: string;
  status: SddTestStatus;
  verifyContractStatus: string;
  verifyContractAction: VerifyContractAction;
  lifecycleGate: LifecycleWorkflowGate;
  lifecycleProfile: LifecycleRiskProfile | null;
  approvalPolicy: ApprovalPolicy | null;
  requiredStages: string[];
  primaryReason: string;
  commandStatus: TestEvidenceStatus;
  evidenceCoverage: EvidenceCoverageStatus;
  policyJudgment: TestEvidenceStatus;
  acceptanceCoverage: AcceptanceEvidenceCoverage[];
  syncBackReady: boolean;
  commands: string[];
  steps: SddTestCommandStep[];
  validationArtifact: string | null;
  indexArtifact: string | null;
  gaps: string[];
  next: string;
}

export interface RunSddTestOptions {
  taskId: string;
  branch?: string | null;
  runId?: string | null;
  commands?: string[];
  commandInputs?: SddTestCommandInput[];
  timeoutMs?: number;
  approved?: boolean;
}

export async function runSddTest(projectRoot: string, options: RunSddTestOptions): Promise<SddTestResult> {
  const context = await resolveSddContext(projectRoot, { branch: options.branch ?? undefined, branchSource: options.branch ? 'cli_option' : undefined });
  let model = await parseSddBranch(projectRoot, context.partition);
  let task = model.tasks.find((candidate) => candidate.id === options.taskId) ?? null;
  const verifyContract = await ensureVerifyContractForTest(projectRoot, context.partition);
  const verifyInspection = verifyContract.inspection;
  if (verifyContract.action === 'created' || verifyContract.action === 'refreshed') {
    model = await parseSddBranch(projectRoot, context.partition);
    task = model.tasks.find((candidate) => candidate.id === options.taskId) ?? null;
  }
  const initialState = options.runId ? await readRunState(projectRoot, options.runId) : await createRun(projectRoot);
  const state = await bindRunStateToTask(projectRoot, initialState, context, model, task, options.taskId);
  const testRunId = runtimeScopedId(state.runId, options.taskId, new Date().toISOString(), 'sdd-test');
  const commandInputs = normalizeTestCommandInputs(options.commandInputs, options.commands, task?.validation ?? []);
  const commands = commandInputs.map((input) => input.command);
  const gaps: string[] = [];
  const startedAt = new Date().toISOString();

  await appendEvent(projectRoot, state.runId, {
    event: 'test_runtime_started',
    runId: state.runId,
    summary: `SDD test runtime started for ${options.taskId}`,
    data: { taskId: options.taskId, branch: context.partition, testRunId, commands }
  });

  if (!task) {
    gaps.push(`Task ${options.taskId} was not found in specs/${context.partition}/tasks.md.`);
  }
  if (task) {
    gaps.push(...dependencyBlockingReasonsForTask(model, options.taskId));
  }
  if (verifyContract.action === 'blocked') {
    gaps.push(verifyContractBlocker(verifyInspection));
  }
  if (commands.length === 0) {
    gaps.push(`Task ${options.taskId} has no validation commands.`);
  }
  const orchestration = await ensureTaskOrchestration(projectRoot, model, task, {
    branch: context.partition,
    runId: state.runId,
    taskId: options.taskId,
    agent: 'validator',
    stage: 'test',
    status: 'active'
  });
  const orchestrationGate = await inspectOrchestrationGate(projectRoot, {
    branch: context.partition,
    runId: state.runId,
    taskId: options.taskId,
    target: 'test',
    riskDecision: orchestration.riskDecision,
    stageRun: orchestration.stageRun,
    contextLoadSignal: orchestration.contextLoadSignal,
    contextOffloadDecision: orchestration.contextOffloadDecision
  });
  const reviewerCheckpointSatisfied = await hasReviewerCheckpoint(projectRoot, state, options.taskId);
  const workflowGate = verifyContract.action === 'blocked'
    ? verifyContractBlockedGate(options.taskId)
    : evaluateTaskWorkflowGate({ task, taskId: options.taskId, riskDecision: orchestration.riskDecision, approved: options.approved, reviewerCheckpointSatisfied });
  if (workflowGate.blocksTest) {
    gaps.push(workflowGate.primaryReason);
  }
  gaps.push(...orchestrationGate.blockingReasons);

  await recordRuntimeTestRun(projectRoot, {
    testRunId,
    runId: state.runId,
    partition: context.partition,
    taskId: options.taskId,
    status: 'RUNNING',
    startedAt,
    completedAt: startedAt,
    payload: { verifyContractStatus: verifyInspection.status, verifyContractAction: verifyContract.action, lifecycleGate: workflowGate.lifecycleGate, lifecycleProfile: workflowGate.lifecycleProfile, approvalPolicy: workflowGate.approvalPolicy, requiredStages: workflowGate.requiredStages, primaryReason: workflowGate.primaryReason, commands, commandInputs, evidence: [], gaps }
  });

  const steps: SddTestCommandStep[] = [];
  if (gaps.length === 0) {
    for (const [index, commandInput] of commandInputs.entries()) {
      const step = await runCommandStep(projectRoot, state.runId, context.partition, options.taskId, testRunId, index + 1, commandInput, acceptanceRefsForCommand(task, commandInput.command), options.timeoutMs ?? DEFAULT_TEST_TIMEOUT_MS);
      steps.push(step);
      await appendEvent(projectRoot, state.runId, {
        event: 'test_step_completed',
        runId: state.runId,
        summary: `SDD test step ${step.status}: ${step.command}`,
        data: { taskId: options.taskId, testRunId, step }
      });
    }
  }

  const commandStatus = deriveCommandStatus(gaps, steps);
  const acceptanceCoverage = buildAcceptanceCoverage(task, steps, commandStatus);
  const evidenceCoverage = summarizeEvidenceCoverage(acceptanceCoverage);
  const policyJudgment = derivePolicyJudgment(commandStatus, evidenceCoverage);
  const status = policyJudgment;
  const syncBackReady = status === 'PASS';
  const validationArtifact = task ? await writeValidationArtifact(projectRoot, state.runId, task, status, steps, gaps) : null;
  const unifiedEvidence = buildUnifiedTestEvidenceRun(testRunId, context.partition, state.runId, options.taskId, commandStatus, evidenceCoverage, policyJudgment, steps, acceptanceCoverage, syncBackReady, gaps);
  const indexArtifact = await writeIndexArtifact(projectRoot, state.runId, {
    testRunId,
    branch: context.partition,
    taskId: options.taskId,
    status,
    verifyContractStatus: verifyInspection.status,
    verifyContractAction: verifyContract.action,
    lifecycleGate: workflowGate.lifecycleGate,
    lifecycleProfile: workflowGate.lifecycleProfile,
    approvalPolicy: workflowGate.approvalPolicy,
    requiredStages: workflowGate.requiredStages,
    primaryReason: workflowGate.primaryReason,
    commandStatus,
    evidenceCoverage,
    policyJudgment,
    acceptanceCoverage,
    syncBackReady,
    commands,
    steps,
    validationArtifact: validationArtifact?.runRelativePath ?? null,
    gaps
  });
  const completedAt = new Date().toISOString();
  const evidence = [validationArtifact?.runRelativePath, indexArtifact.runRelativePath, ...steps.map((step) => step.outputArtifact)].filter((item): item is string => Boolean(item));
  const syncBackProposal = syncBackReady
    ? await writeTestSyncBackProposal(projectRoot, state.runId, options.taskId, evidence, acceptanceCoverage)
    : null;

  await recordRuntimeTestRun(projectRoot, {
    testRunId,
    runId: state.runId,
    partition: context.partition,
    taskId: options.taskId,
    status,
    startedAt,
    completedAt,
    payload: { verifyContractStatus: verifyInspection.status, verifyContractAction: verifyContract.action, lifecycleGate: workflowGate.lifecycleGate, lifecycleProfile: workflowGate.lifecycleProfile, approvalPolicy: workflowGate.approvalPolicy, requiredStages: workflowGate.requiredStages, primaryReason: workflowGate.primaryReason, commandStatus, evidenceCoverage, policyJudgment, acceptanceCoverage, syncBackReady, commands, commandInputs, evidence, gaps, syncBackProposal: syncBackProposal?.path ?? null }
  });
  await recordRuntimeProjection(projectRoot, 'test_runtime', `${context.partition}:${options.taskId}:${state.runId}`, {
    contract: 'sdd-test-runtime-v1',
    testRunId,
    runId: state.runId,
    taskId: options.taskId,
    status,
    lifecycleGate: workflowGate.lifecycleGate,
    primaryReason: workflowGate.primaryReason,
    evidence,
    gaps
  });
  await recordRuntimeProjection(projectRoot, 'test_evidence_run', `${context.partition}:${options.taskId}:${state.runId}`, unifiedEvidence);
  await recordTestWorkflowProjection(projectRoot, {
    taskId: options.taskId,
    stageRun: orchestration.stageRun,
    status,
    completedAt,
    evidence,
    gaps,
    riskDecision: orchestration.riskDecision
  });
  await persistTestRunState(projectRoot, state, options.taskId, status, commands, evidence, validationArtifact?.runRelativePath ?? null, syncBackProposal);
  await appendEvent(projectRoot, state.runId, {
    event: status === 'PASS' ? 'test_runtime_passed' : 'test_runtime_failed',
    runId: state.runId,
    summary: `SDD test runtime ${status} for ${options.taskId}`,
    data: { taskId: options.taskId, testRunId, status, evidence, gaps }
  });

  return {
    contract: 'sdd-test-runtime-v1',
    runId: state.runId,
    testRunId,
    branch: context.partition,
    taskId: options.taskId,
    status,
    verifyContractStatus: verifyInspection.status,
    verifyContractAction: verifyContract.action,
    lifecycleGate: workflowGate.lifecycleGate,
    lifecycleProfile: workflowGate.lifecycleProfile,
    approvalPolicy: workflowGate.approvalPolicy,
    requiredStages: workflowGate.requiredStages,
    primaryReason: workflowGate.primaryReason,
    commandStatus,
    evidenceCoverage,
    policyJudgment,
    acceptanceCoverage,
    syncBackReady,
    commands,
    steps,
    validationArtifact: validationArtifact?.runRelativePath ?? null,
    indexArtifact: indexArtifact.runRelativePath,
    gaps,
    next: nextForTestResult(status, context.partition, options.taskId, state.runId, indexArtifact.runRelativePath, workflowGate.nextAction)
  };
}

async function recordTestWorkflowProjection(projectRoot: string, input: { taskId: string; stageRun: StageRun; status: SddTestStatus; completedAt: string; evidence: string[]; gaps: string[]; riskDecision: LifecycleRiskDecision }): Promise<void> {
  const outputRefs = input.evidence.map((ref) => ({ kind: 'artifact' as const, ref }));
  const completedStage: StageRun = {
    ...input.stageRun,
    status: input.status === 'PASS' ? 'completed' : input.status === 'FAIL' ? 'failed' : 'blocked',
    outputRefs,
    blockingReasons: input.status === 'PASS' ? [] : input.gaps.length > 0 ? input.gaps : [`SDD test ${input.status}.`],
    updatedAt: input.completedAt
  };
  await recordStageRunProjection(projectRoot, completedStage);

  const handoff: WorkflowHandoff = {
    contract: WORKFLOW_HANDOFF_CONTRACT_VERSION,
    id: `${completedStage.id}:handoff:goal-verify`,
    scope: completedStage.scope,
    fromStage: 'test',
    toStage: 'goal-verify',
    fromAgent: 'validator',
    toAgent: 'verifier',
    status: input.status === 'PASS' ? 'proposed' : 'blocked',
    outputRefs,
    requiredInputRefs: [{ kind: 'task', ref: input.taskId }],
    riskDecisionRef: input.stageRun.decisionRefs[0] ?? { kind: 'task', ref: input.taskId },
    evidenceRefs: outputRefs,
    openQuestions: [],
    blockingGaps: input.status === 'PASS' ? [] : completedStage.blockingReasons,
    createdAt: input.completedAt,
    decidedAt: input.completedAt
  };
  const validation = validateWorkflowHandoff({ handoff, sourceStageRun: completedStage, lifecycleRiskDecision: input.riskDecision });
  await recordWorkflowHandoffProjection(projectRoot, validation.valid ? handoff : { ...handoff, status: 'blocked', blockingGaps: validation.issues, decidedAt: input.completedAt });
}


async function ensureVerifyContractForTest(projectRoot: string, branch: string): Promise<{ inspection: VerifyContractInspection; action: VerifyContractAction }> {
  let inspection = await inspectVerifyContract(projectRoot, { branch, branchSource: 'cli_option' });
  if (inspection.status === 'BLOCKED') {
    return { inspection, action: 'blocked' };
  }
  if (inspection.status === 'PASS') {
    return { inspection, action: 'none' };
  }

  const written = await writeVerifyContract(projectRoot, { branch, branchSource: 'cli_option', force: inspection.exists });
  inspection = await inspectVerifyContract(projectRoot, { branch, branchSource: 'cli_option' });
  if (inspection.status !== 'PASS') {
    return { inspection, action: 'blocked' };
  }
  return { inspection, action: written.status === 'created' ? 'created' : 'refreshed' };
}

function verifyContractBlocker(inspection: VerifyContractInspection): string {
  const issueSummary = inspection.issues.map((issue) => `${issue.field}: ${issue.message}`).join(' ');
  return `verify.md contract is ${inspection.status}; ${issueSummary || 'inspect verify.md before executing tests.'}`;
}

async function hasReviewerCheckpoint(projectRoot: string, state: RunState, taskId: string): Promise<boolean> {
  const artifactPaths = new Set([
    ...state.artifacts
      .filter((artifact) => artifact.task === taskId && (artifact.agent === 'reviewer' || artifact.kind === 'review'))
      .map((artifact) => artifact.path),
    `artifacts/review-${taskId}.md`
  ]);

  for (const artifactPath of artifactPaths) {
    const report = await validateSddResultArtifact(projectRoot, state.runId, artifactPath, { expectedTask: taskId, expectedAgent: 'reviewer' });
    if (report.valid && report.result?.status === 'PASS') {
      return true;
    }
  }

  return false;
}

export function renderSddTestResult(result: SddTestResult): string {
  return [
    `SDD test ${result.taskId}`,
    '',
    resultSentenceForTest(result),
    '',
    'Why:',
    `- ${result.primaryReason}`,
    '',
    'Next:',
    `- ${result.next}`
  ].join('\n');
}


async function runCommandStep(projectRoot: string, runId: string, branch: string, taskId: string, testRunId: string, sequence: number, commandInput: NormalizedSddTestCommand, acceptanceRefs: string[], timeoutMs: number): Promise<SddTestCommandStep> {
  const started = Date.now();
  const executed = await executeCommand(projectRoot, commandInput, timeoutMs);
  const durationMs = Date.now() - started;
  const status: SddTestStepStatus = executed.timedOut || executed.error ? 'blocked' : executed.exitCode === 0 ? 'pass' : 'fail';
  const stepId = `${testRunId}-${String(sequence).padStart(3, '0')}`;
  const output = renderCommandOutput(commandInput, status, executed, durationMs);
  const outputArtifact = await writeArtifact(projectRoot, runId, `test-${taskId}-${String(sequence).padStart(3, '0')}.log`, output);
  await appendInvocationLedgerEntry(projectRoot, {
    runId,
    taskId,
    branch,
    kind: 'command',
    ref: commandInput.command,
    status,
    artifactPath: outputArtifact.runRelativePath,
    outputHash: hashDocumentContent(output),
    materialRefs: [outputArtifact.runRelativePath],
    metadata: {
      source: 'sdd-test',
      exitCode: executed.exitCode,
      durationMs,
      stdoutBytes: executed.stdoutBytes,
      stderrBytes: executed.stderrBytes,
      truncated: executed.truncated,
      acceptanceRefs: acceptanceRefs.join(','),
      shell: commandInput.shell,
      argv: commandInput.argv ? JSON.stringify(commandInput.argv) : null
    }
  });
  const step: SddTestCommandStep = {
    stepId,
    command: commandInput.command,
    argv: commandInput.argv,
    shell: commandInput.shell,
    acceptanceRefs,
    status,
    exitCode: executed.exitCode,
    signal: executed.signal,
    durationMs,
    outputArtifact: outputArtifact.runRelativePath,
    stdoutBytes: executed.stdoutBytes,
    stderrBytes: executed.stderrBytes,
    truncated: executed.truncated
  };
  await recordRuntimeTestStep(projectRoot, {
    stepId,
    testRunId,
    runId,
    taskId,
    command: commandInput.command,
    status,
    exitCode: executed.exitCode,
    durationMs,
    outputArtifact: outputArtifact.runRelativePath,
    payload: step
  });
  return step;
}

function executeCommand(projectRoot: string, commandInput: NormalizedSddTestCommand, timeoutMs: number): Promise<{ exitCode: number | null; signal: string | null; stdout: string; stderr: string; stdoutBytes: number; stderrBytes: number; truncated: boolean; timedOut: boolean; error: string | null }> {
  return new Promise((resolve) => {
    const child = commandInput.argv
      ? spawn(commandInput.argv[0], commandInput.argv.slice(1), { cwd: projectRoot, shell: false, windowsHide: true, env: process.env })
      : spawn(commandInput.command, { cwd: projectRoot, shell: true, windowsHide: true, env: process.env });
    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let truncated = false;
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    const finish = (result: { exitCode: number | null; signal: string | null; error: string | null }) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, stdout, stderr, stdoutBytes, stderrBytes, truncated, timedOut });
    };
    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      const next = chunk.toString('utf8');
      if (Buffer.byteLength(stdout, 'utf8') < MAX_CAPTURE_BYTES) {
        stdout += next;
      } else {
        truncated = true;
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.length;
      const next = chunk.toString('utf8');
      if (Buffer.byteLength(stderr, 'utf8') < MAX_CAPTURE_BYTES) {
        stderr += next;
      } else {
        truncated = true;
      }
    });
    child.on('error', (error) => finish({ exitCode: null, signal: null, error: error.message }));
    child.on('close', (code, signal) => finish({ exitCode: code, signal, error: null }));
  });
}

async function writeValidationArtifact(projectRoot: string, runId: string, task: SddTask, status: SddTestStatus, steps: SddTestCommandStep[], gaps: string[]): Promise<{ absolutePath: string; runRelativePath: string }> {
  const artifactPath = `validation-${task.id}.md`;
  const runRelativePath = `artifacts/${artifactPath}`;
  const resultStatus = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'BLOCKED';
  const content = `# Validation ${task.id}\n\n\`\`\`sdd-result\ncontract: ${SDD_RESULT_CONTRACT}\nversion: ${SDD_RESULT_VERSION}\nagent: validator\ntask: ${task.id}\nstatus: ${resultStatus}\nartifacts:\n  - ${runRelativePath}\n\`\`\`\n\n## Test Runtime\n\n- status: ${status}\n- commands:\n${steps.length > 0 ? steps.map((step) => `  - [${step.status}] ${step.command}`).join('\n') : '  - none'}\n- gaps:\n${gaps.length > 0 ? gaps.map((gap) => `  - ${gap}`).join('\n') : '  - none'}\n\n## Acceptance Evidence\n\n${renderEvidenceBlocks(task, status, runRelativePath, steps)}\n`;
  return writeArtifact(projectRoot, runId, artifactPath, content);
}

async function writeTestSyncBackProposal(projectRoot: string, runId: string, taskId: string, artifacts: string[], acceptanceCoverage: AcceptanceEvidenceCoverage[]): Promise<TestSyncBackProposal> {
  const content = `# Sync-back Proposal\n\n## ${taskId}\n\n- status: verified\n- summary: /sdd:test passed with complete command and acceptance evidence.\n- artifacts:\n${artifacts.length > 0 ? artifacts.map((artifact) => `  - ${artifact}`).join('\n') : '  - none'}\n- acceptance_coverage:\n${acceptanceCoverage.length > 0 ? acceptanceCoverage.map((coverage) => `  - [${coverage.status}] ${coverage.acceptanceRef}`).join('\n') : '  - none'}\n- gaps:\n  - none\n\n## Boundaries\n\n- Proposal only; tasks.md/spec.md/plan.md were not modified by runtime.\n- /sdd:test executed declared validation commands and mapped evidence to acceptance refs.\n`;
  const written = await writeArtifact(projectRoot, runId, 'sync-back-proposal.md', content);
  return { path: written.runRelativePath, digest: hashDocumentContent(content) };
}

async function writeIndexArtifact(projectRoot: string, runId: string, payload: Omit<SddTestResult, 'contract' | 'runId' | 'indexArtifact' | 'next'>): Promise<{ absolutePath: string; runRelativePath: string }> {
  return writeArtifact(projectRoot, runId, `test-index-${payload.taskId}.json`, `${JSON.stringify({ contract: 'sdd-test-runtime-v1', runId, ...payload }, null, 2)}\n`);
}

async function persistTestRunState(projectRoot: string, state: RunState, taskId: string, status: SddTestStatus, commands: string[], evidence: string[], validationArtifact: string | null, syncBackProposal: TestSyncBackProposal | null): Promise<void> {
  const latest = await readRunState(projectRoot, state.runId);
  const knownArtifacts = new Set(latest.artifacts.map((artifact) => artifact.path));
  const now = new Date().toISOString();
  const nextArtifacts = evidence
    .filter((artifactPath) => !knownArtifacts.has(artifactPath))
    .map((artifactPath) => ({ path: artifactPath, kind: artifactPath.includes('validation-') ? 'validation' : 'test', task: taskId, agent: artifactPath === validationArtifact ? 'validator' : 'test-runtime', createdAt: now }));
  await writeRunState(projectRoot, {
    ...latest,
    status: status === 'PASS' ? 'completed' : status === 'FAIL' ? 'failed' : 'blocked',
    phase: 'test',
    currentTask: taskId,
    tasks: {
      ...latest.tasks,
      [taskId]: {
        status: status === 'PASS' ? 'tested' : 'blocked',
        testStatus: status,
        evidence
      }
    },
    artifacts: [...latest.artifacts, ...nextArtifacts],
    validation: {
      status: status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : 'blocked',
      commands,
      evidence
    },
    syncBack: syncBackProposal
      ? {
        mode: 'proposal',
        proposalPath: syncBackProposal.path,
        proposalDigest: syncBackProposal.digest,
        sourceVerifyStatus: status,
        status: 'proposed'
      }
      : latest.syncBack
  });
}

function deriveCommandStatus(gaps: string[], steps: SddTestCommandStep[]): TestEvidenceStatus {
  if (gaps.length > 0 || steps.some((step) => step.status === 'blocked')) {
    return 'BLOCKED';
  }
  if (steps.some((step) => step.status === 'fail')) {
    return 'FAIL';
  }
  return 'PASS';
}

function buildAcceptanceCoverage(task: SddTask | null, steps: SddTestCommandStep[], commandStatus: TestEvidenceStatus): AcceptanceEvidenceCoverage[] {
  const acceptanceRefs = task ? taskAcceptanceRefs(task) : [];
  return acceptanceRefs.map((acceptanceRef) => {
    const mappedSteps = steps.filter((step) => step.acceptanceRefs.includes(acceptanceRef));
    const hasPassingEvidence = mappedSteps.some((step) => step.status === 'pass');
    const hasFailingEvidence = mappedSteps.some((step) => step.status === 'fail' || step.status === 'blocked');
    const status: EvidenceCoverageStatus = hasPassingEvidence && !hasFailingEvidence && commandStatus === 'PASS'
      ? 'complete'
      : mappedSteps.length > 0
        ? 'partial'
        : 'missing';
    return {
      acceptanceRef,
      status,
      evidenceRefs: mappedSteps.map((step) => ({ kind: 'artifact', ref: step.outputArtifact })),
      gaps: status === 'complete' ? [] : [`Acceptance ${acceptanceRef} has no complete non-stale evidence from /sdd:test.`]
    };
  });
}

function summarizeEvidenceCoverage(acceptanceCoverage: AcceptanceEvidenceCoverage[]): EvidenceCoverageStatus {
  if (acceptanceCoverage.length === 0) {
    return 'missing';
  }
  if (acceptanceCoverage.every((coverage) => coverage.status === 'complete')) {
    return 'complete';
  }
  if (acceptanceCoverage.some((coverage) => coverage.status === 'complete' || coverage.status === 'partial')) {
    return 'partial';
  }
  return 'missing';
}

function derivePolicyJudgment(commandStatus: TestEvidenceStatus, evidenceCoverage: EvidenceCoverageStatus): SddTestStatus {
  if (commandStatus === 'FAIL') {
    return 'FAIL';
  }
  if (commandStatus === 'BLOCKED' || evidenceCoverage !== 'complete') {
    return 'BLOCKED';
  }
  return 'PASS';
}

function buildUnifiedTestEvidenceRun(id: string, branch: string, runId: string, taskId: string, commandStatus: TestEvidenceStatus, evidenceCoverage: EvidenceCoverageStatus, policyJudgment: TestEvidenceStatus, steps: SddTestCommandStep[], acceptanceCoverage: AcceptanceEvidenceCoverage[], syncBackReady: boolean, gaps: string[]): UnifiedTestEvidenceRun {
  return {
    contract: TEST_EVIDENCE_RUN_CONTRACT_VERSION,
    id,
    scope: { branch, taskId, runId },
    commandStatus,
    evidenceCoverage,
    policyJudgment,
    commands: steps.map((step) => ({
      command: step.command,
      status: step.status === 'pass' ? 'PASS' : step.status === 'fail' ? 'FAIL' : 'BLOCKED',
      outputRef: { kind: 'artifact', ref: step.outputArtifact },
      evidenceRefs: [{ kind: 'artifact', ref: step.outputArtifact }],
      acceptanceRefs: step.acceptanceRefs,
      startedAt: new Date(Date.now() - step.durationMs).toISOString(),
      completedAt: new Date().toISOString()
    })),
    acceptanceCoverage,
    syncBackReady,
    gaps: [...gaps, ...acceptanceCoverage.flatMap((coverage) => coverage.gaps)],
    next: nextForTestResult(policyJudgment, branch, taskId, runId, `artifacts/test-index-${taskId}.json`, null),
    generatedAt: new Date().toISOString()
  };
}

function nextForTestResult(status: SddTestStatus, branch: string, taskId: string, runId: string, indexArtifact: string, gateNextAction: string | null): string {
  if (status === 'PASS') {
    return `sdd sync-back inspect ${runId} --branch ${branch} --task ${taskId}`;
  }
  return gateNextAction ?? `Inspect ${indexArtifact}, fix command/evidence gaps, then rerun sdd test task ${taskId} --branch ${branch}.`;
}

function resultSentenceForTest(result: SddTestResult): string {
  if (result.status === 'PASS' && result.lifecycleGate === 'direct') {
    return 'Validation passed and sync-back is ready.';
  }
  if (result.status === 'PASS') {
    return 'Validation passed; sync-back needs review.';
  }
  if (result.commandStatus === 'BLOCKED') {
    return 'Blocked before validation commands ran.';
  }
  return result.status === 'FAIL' ? 'Validation failed.' : 'Validation did not produce complete evidence.';
}

function renderEvidenceBlocks(task: SddTask, status: SddTestStatus, sourceArtifact: string, steps: SddTestCommandStep[]): string {
  const acceptances = task.acceptanceRefs.length > 0 ? task.acceptanceRefs : task.acceptance;
  if (acceptances.length === 0) {
    return 'No acceptance targets declared.';
  }
  const mappedEvidence = acceptances
    .map((acceptance) => ({ acceptance, steps: steps.filter((step) => step.acceptanceRefs.includes(acceptance)) }))
    .filter((item) => item.steps.length > 0);
  if (mappedEvidence.length === 0) {
    return 'No acceptance evidence emitted; validation commands are not explicitly mapped to acceptance refs.';
  }
  return mappedEvidence.map(({ acceptance, steps: mappedSteps }) => {
    const evidenceStatus = evidenceStatusForMappedSteps(status, mappedSteps);
    return `\`\`\`sdd-evidence\ncontract: ${SDD_EVIDENCE_CONTRACT}\nversion: ${SDD_EVIDENCE_VERSION}\ntask: ${task.id}\nacceptance: ${acceptance}\nstatus: ${evidenceStatus}\nclaim: Explicit validation mapping ${mappedSteps.map((step) => step.command).join(' && ')} produced ${evidenceStatus} for ${acceptance}.\nsource_artifact: ${sourceArtifact}\nevidence_refs:\n${mappedSteps.map((step) => `  - command:${step.command}\n  - artifact:${step.outputArtifact}`).join('\n')}\nprovenance_refs:\n  - artifact:${sourceArtifact}\n${mappedSteps.map((step) => `  - command:${step.command}`).join('\n')}\npolicy_refs:\n  - ${ACCEPTANCE_POLICY_RULESET_VERSION}:require-source-evidence\n  - ${ACCEPTANCE_POLICY_RULESET_VERSION}:require-provenance\n  - ${ACCEPTANCE_POLICY_RULESET_VERSION}:require-policy-rule\n\`\`\``;
  }).join('\n\n');
}

function normalizeTestCommandInputs(commandInputs: SddTestCommandInput[] | undefined, commands: string[] | undefined, taskValidation: string[]): NormalizedSddTestCommand[] {
  if (commandInputs && commandInputs.length > 0) {
    return commandInputs.map(normalizeTestCommandInput);
  }
  return (commands && commands.length > 0 ? commands : taskValidation).map((command) => ({ command, argv: null, shell: true }));
}

function normalizeTestCommandInput(input: SddTestCommandInput): NormalizedSddTestCommand {
  if (input.argv) {
    const argv = input.argv.filter((item) => item.length > 0);
    if (argv.length === 0) {
      throw new Error('Command argv input must include an executable.');
    }
    return { command: argv.join(' '), argv, shell: false };
  }
  if (input.command) {
    return { command: input.command, argv: null, shell: true };
  }
  throw new Error('Command input must include command or argv.');
}

function acceptanceRefsForCommand(task: SddTask | null, command: string): string[] {
  return [...new Set((task?.validationCommands ?? [])
    .filter((entry) => entry.command === command)
    .flatMap((entry) => entry.acceptanceRefs))];
}

function taskAcceptanceRefs(task: SddTask): string[] {
  const refs = task.acceptanceRefs.length > 0 ? task.acceptanceRefs : task.acceptance;
  return [...new Set(refs)];
}

function evidenceStatusForMappedSteps(status: SddTestStatus, steps: SddTestCommandStep[]): SddTestStatus {
  if (steps.some((step) => step.status === 'fail')) {
    return 'FAIL';
  }
  if (status === 'BLOCKED' || steps.some((step) => step.status === 'blocked')) {
    return 'BLOCKED';
  }
  return 'PASS';
}

function renderCommandOutput(commandInput: NormalizedSddTestCommand, status: SddTestStepStatus, executed: { exitCode: number | null; signal: string | null; stdout: string; stderr: string; truncated: boolean; timedOut: boolean; error: string | null }, durationMs: number): string {
  return `# Test Command Output\n\n- command: ${commandInput.command}\n- shell: ${commandInput.shell}\n- argv: ${commandInput.argv ? JSON.stringify(commandInput.argv) : 'none'}\n- status: ${status}\n- exit_code: ${executed.exitCode ?? 'none'}\n- signal: ${executed.signal ?? 'none'}\n- duration_ms: ${durationMs}\n- timed_out: ${executed.timedOut}\n- truncated: ${executed.truncated}\n- error: ${executed.error ?? 'none'}\n\n## stdout\n\n\`\`\`text\n${executed.stdout}\n\`\`\`\n\n## stderr\n\n\`\`\`text\n${executed.stderr}\n\`\`\`\n`;
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}
