import { createHash } from 'node:crypto';
import { SDD_RESULT_CONTRACT, SDD_RESULT_VERSION } from '../contracts.js';
import { artifactKind, writeArtifact } from '../run-state/artifacts.js';
import { appendEvent } from '../run-state/events.js';
import type { RunState } from '../run-state/model.js';
import { createRun, readRunState, writeRunState } from '../run-state/run-state.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { bindRunStateToTask } from '../sdd-docs/run-binding.js';
import { inspectSddTask, taskGap } from '../sdd-docs/task-inspection.js';
import { parseSddBranch, type SddTask, type SddTaskGap } from '../sdd-docs/task-parser.js';
import type { AgentRouterDecision } from '../router/agent-runtime.js';
import type { TeamModeActivation } from '../router/route-cache.js';
import { routeSddTask } from '../router/route-sdd-task.js';
import { buildAgentExecutionRecord, buildTeamSessionRecord, writeAgentExecutionRecord, writeTeamSessionRecord } from '../execution/agent-execution-records.js';
import { runBackgroundExecutor } from '../execution/background-executor.js';

export type SingleTaskLoopStatus = 'completed' | 'blocked' | 'failed';

interface LoopAgentStep {
  agent: 'implementer' | 'reviewer' | 'debugger' | 'validator';
  suppliedArtifact?: string;
  expectedArtifact: string;
  required: boolean;
}

export interface SingleTaskLoopOptions {
  branch?: string;
  taskId: string;
  runId?: string;
  implementArtifact?: string;
  reviewArtifact?: string;
  validationArtifact?: string;
  debugArtifact?: string;
  teamModeEnabled?: boolean;
  teamModeActivation?: TeamModeActivation;
  approved?: boolean;
}

export interface SingleTaskLoopResult {
  runId: string;
  taskId: string;
  status: SingleTaskLoopStatus;
  task: SddTask | null;
  gaps: SddTaskGap[];
  requiredArtifacts: string[];
  acceptedArtifacts: string[];
  syncBackProposalPath: string;
  routeDecision: AgentRouterDecision;
  message: string;
}

export async function runSingleTaskLoop(projectRoot: string, options: SingleTaskLoopOptions): Promise<SingleTaskLoopResult> {
  const context = await resolveSddContext(projectRoot, options.branch ? { branch: options.branch, branchSource: 'cli_option' } : {});
  const branch = context.partition;
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  const runState = options.runId ? await readRunState(projectRoot, options.runId) : await createRun(projectRoot);
  const boundRunState = await bindRunStateToTask(projectRoot, runState, context, model, inspected.task ?? null, options.taskId);
  const runId = boundRunState.runId;
  const routeDecision = await routeSddTask(projectRoot, { taskId: options.taskId, branch, teamModeEnabled: options.teamModeEnabled, teamModeActivation: options.teamModeActivation, approved: options.approved });
  await appendEvent(projectRoot, runId, {
    event: 'agent_router_preflight',
    runId,
    summary: `Agent router preflight ${routeDecision.blockedReason ? 'blocked' : 'passed'} for ${options.taskId}`,
    data: { taskId: options.taskId, decision: routeDecision }
  });
  if (routeDecision.teamMode.enabled || routeDecision.teamMode.decision !== 'disabled') {
    await writeTeamSessionRecord(projectRoot, buildTeamSessionRecord({
      runId,
      taskId: options.taskId,
      route: routeDecision,
      status: routeDecision.teamMode.decision === 'enabled' ? 'created' : routeDecision.teamMode.decision === 'blocked' ? 'blocked' : 'disabled',
      artifacts: [],
      evidenceSummary: `Team-mode ${routeDecision.teamMode.decision} during task preflight.`
    }));
  }

  await appendEvent(projectRoot, runId, {
    event: 'phase_started',
    runId,
    summary: `Phase 3.15 ingestion-aware task loop started for ${options.taskId}`,
    data: { phase: 'do', branch, task: options.taskId }
  });

  if (routeDecision.blockedReason || routeDecision.toolPermission?.policy === 'deny' || !inspected.task || inspected.gaps.some((gap) => gap.severity === 'blocking')) {
    const routeGap = routeDecision.blockedReason ? [taskGap(options.taskId, 'agent_router', routeDecision.blockedReason, routeDecision.nextAction)] : [];
    const toolPermissionGap = routeDecision.toolPermission?.policy === 'deny' ? [taskGap(options.taskId, 'tool_permission', 'Agent router denied required tool permission for this task.', 'Change task scope, tool policy, or route through a permitted profile before execution.')] : [];
    const allGaps = [...routeGap, ...toolPermissionGap, ...inspected.gaps];
    const gapArtifact = await writeArtifact(projectRoot, runId, `gap-report-${options.taskId}.md`, renderLoopGapReport(options.taskId, allGaps));
    const proposal = await writeSyncBackProposal(projectRoot, runId, options.taskId, 'blocked', [gapArtifact.runRelativePath], allGaps, 'Task selection is blocked by router preflight or parser/task gaps.');
    await persistLoopState(projectRoot, runId, {
      status: 'blocked',
      phase: 'do',
      taskId: options.taskId,
      taskState: { status: 'blocked', gaps: allGaps, artifacts: [gapArtifact.runRelativePath] },
      validationStatus: 'blocked',
      syncBackProposalPath: proposal.runRelativePath,
      syncBackProposalDigest: proposal.digest,
      artifacts: [{ path: gapArtifact.runRelativePath, kind: 'gap-report', task: options.taskId, agent: 'runtime' }]
    });
    await appendEvent(projectRoot, runId, {
      event: 'gap_detected',
      runId,
      summary: `Task ${options.taskId} is blocked before implementation.`,
      data: { gaps: allGaps, artifact: gapArtifact.runRelativePath, routeDecision }
    });
    await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
      runId,
      taskId: options.taskId,
      agent: 'orchestrator',
      route: routeDecision,
      status: 'blocked',
      delegationId: `P-${options.taskId}-router-001`,
      artifactPath: gapArtifact.runRelativePath,
      evidenceSummary: `Task loop blocked before implementation by router preflight or task gaps with ${allGaps.length} issue(s).`
    }));
    return {
      runId,
      taskId: options.taskId,
      status: 'blocked',
      task: inspected.task,
      gaps: allGaps,
      requiredArtifacts: [],
      acceptedArtifacts: [gapArtifact.runRelativePath],
      syncBackProposalPath: proposal.runRelativePath,
      routeDecision,
      message: 'Task loop blocked before implementation by router preflight or task gaps.'
    };
  }

  await appendEvent(projectRoot, runId, {
    event: 'task_selected',
    runId,
    summary: `Task selected for ingestion-aware task loop: ${options.taskId}`,
    data: { task: options.taskId, title: inspected.task.title, source: inspected.task.source }
  });

  const steps = buildLoopSteps(options.taskId, options);
  const acceptedArtifacts: string[] = [];
  const gaps: SddTaskGap[] = [];
  let terminalStatus: SingleTaskLoopStatus = 'completed';
  let validationStatus: RunState['validation']['status'] = 'pass';

  for (const step of steps) {
    const stepRouteDecision = await routeSddTask(projectRoot, { taskId: options.taskId, branch, agent: step.agent, teamModeEnabled: options.teamModeEnabled, teamModeActivation: options.teamModeActivation, approved: options.approved });
    if (!step.suppliedArtifact) {
      if (!step.required) {
        await appendEvent(projectRoot, runId, {
          event: 'delegation_cancelled',
          runId,
          summary: `${step.agent} artifact not supplied; optional step skipped for ${options.taskId}`,
          data: { agent: step.agent, expectedArtifact: step.expectedArtifact }
        });
        await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
          runId,
          taskId: options.taskId,
          agent: step.agent,
          route: stepRouteDecision,
          status: 'skipped',
          delegationId: `B-${options.taskId}-${step.agent}-001`,
          evidenceSummary: `${step.agent} artifact was not supplied and the step is optional.`
        }));
        continue;
      }
      const gap = taskGap(options.taskId, step.agent, `${step.agent} artifact was not supplied; the task loop facade does not invoke external agents directly.`, `Run the ${step.agent} step in Claude Code and pass ${artifactOptionName(step.agent)} artifacts/<file>; physical evidence is branch-scoped under .sdd/runs/<branchSlug>/evidence/artifacts/<file>.`);
      gaps.push(gap);
      await appendEvent(projectRoot, runId, {
        event: 'delegation_failed',
        runId,
        summary: `${step.agent} artifact missing for ${options.taskId}`,
        data: { agent: step.agent, expectedArtifact: step.expectedArtifact }
      });
      await writeAgentExecutionRecord(projectRoot, buildAgentExecutionRecord({
        runId,
        taskId: options.taskId,
        agent: step.agent,
        route: stepRouteDecision,
        status: 'blocked',
        delegationId: `B-${options.taskId}-${step.agent}-001`,
        evidenceSummary: `${step.agent} artifact was not supplied; execution is blocked before host invocation.`
      }));
      terminalStatus = 'blocked';
      validationStatus = step.agent === 'validator' ? 'blocked' : validationStatus;
      break;
    }

    const result = await runBackgroundExecutor(projectRoot, {
      branch,
      runId,
      taskId: options.taskId,
      agent: step.agent,
      artifactPath: step.suppliedArtifact,
      delegationId: `B-${options.taskId}-${step.agent}-001`,
      approved: options.approved
    });

    if (!result.ingestion || !result.ingestion.resultStatus) {
      const issueText = result.issues.map((issue) => issue.message).join('; ') || result.message;
      const recommendation = issueText.includes('manual isolation gate') || issueText.includes('requires confirmation')
        ? 'Resolve the manual isolation or approval gate for this high-risk task before ingesting execution artifacts.'
        : `Fix ${step.suppliedArtifact} so the Phase 3 executor can ingest one valid sdd-result block for ${step.agent}/${options.taskId}.`;
      gaps.push(taskGap(options.taskId, step.agent, `${step.agent} artifact ${step.suppliedArtifact} could not be ingested: ${issueText}`, recommendation));
      terminalStatus = 'blocked';
      validationStatus = step.agent === 'validator' ? 'blocked' : validationStatus;
      break;
    }

    acceptedArtifacts.push(result.ingestion.artifactPath);

    if (step.agent === 'reviewer') {
      if (result.ingestion.resultStatus === 'PASS') {
        await appendEvent(projectRoot, runId, { event: 'review_passed', runId, summary: `Review passed for ${options.taskId}`, data: { artifact: result.ingestion.artifactPath } });
      } else {
        await appendEvent(projectRoot, runId, { event: 'review_failed', runId, summary: `Review did not pass for ${options.taskId}; debugger may be supplied once.`, data: { artifact: result.ingestion.artifactPath, status: result.ingestion.resultStatus } });
        if (!options.debugArtifact) {
          gaps.push(taskGap(options.taskId, 'debugger', 'Review did not pass and no debugger artifact was supplied.', 'Run one debugger attempt or create a gap report; the task loop allows only one debugger pass.'));
          terminalStatus = result.ingestion.resultStatus === 'BLOCKED' ? 'blocked' : 'failed';
          validationStatus = 'fail';
          break;
        }
      }
    }

    if (step.agent === 'validator') {
      if (result.ingestion.resultStatus === 'PASS') {
        await appendEvent(projectRoot, runId, { event: 'validation_passed', runId, summary: `Validation passed for ${options.taskId}`, data: { artifact: result.ingestion.artifactPath } });
        validationStatus = 'pass';
      } else if (result.ingestion.resultStatus === 'PASS_WITH_GAPS') {
        await appendEvent(projectRoot, runId, { event: 'validation_passed', runId, summary: `Validation passed with gaps for ${options.taskId}; task remains blocked until gaps are resolved.`, data: { artifact: result.ingestion.artifactPath, status: result.ingestion.resultStatus } });
        gaps.push(taskGap(options.taskId, 'validation_gaps', 'Validator returned PASS_WITH_GAPS; the task loop cannot mark the task completed without structured gap evidence and explicit sync-back proposal semantics.', 'Inspect the validator artifact, resolve or defer each validation gap, then rerun with PASS validation evidence.'));
        validationStatus = 'pass_with_gaps';
        terminalStatus = 'blocked';
      } else {
        await appendEvent(projectRoot, runId, { event: 'validation_failed', runId, summary: `Validation failed for ${options.taskId}`, data: { artifact: result.ingestion.artifactPath, status: result.ingestion.resultStatus } });
        gaps.push(taskGap(options.taskId, 'validation', `Validator returned ${result.ingestion.resultStatus}.`, 'Do not mark the task completed; create a gap report or revise the task/plan.'));
        validationStatus = result.ingestion.resultStatus === 'BLOCKED' ? 'blocked' : 'fail';
        terminalStatus = result.ingestion.resultStatus === 'BLOCKED' ? 'blocked' : 'failed';
      }
    }
  }

  if (gaps.length > 0 && terminalStatus !== 'completed') {
    const gapArtifact = await writeArtifact(projectRoot, runId, `gap-report-${options.taskId}.md`, renderLoopGapReport(options.taskId, gaps));
    acceptedArtifacts.push(gapArtifact.runRelativePath);
    await appendEvent(projectRoot, runId, {
      event: 'gap_created',
      runId,
      summary: `Gap report created for ${options.taskId}`,
      data: { artifact: gapArtifact.runRelativePath, gaps }
    });
  }

  const proposal = await writeSyncBackProposal(projectRoot, runId, options.taskId, terminalStatus === 'completed' ? 'completed' : terminalStatus, acceptedArtifacts, gaps, terminalStatus === 'completed' ? 'Ingestion-aware task loop has accepted required artifacts through the Phase 3 executor.' : terminalStatus === 'blocked' && validationStatus === 'pass_with_gaps' ? 'Ingestion-aware task loop stopped because validator returned PASS_WITH_GAPS; sync-back is a blocked gap proposal, not task completion.' : 'Ingestion-aware task loop stopped with blocking/failing evidence.');
  await persistLoopState(projectRoot, runId, {
    status: terminalStatus,
    phase: 'do',
    taskId: options.taskId,
    taskState: { status: terminalStatus, gaps, artifacts: acceptedArtifacts },
    validationStatus,
    syncBackProposalPath: proposal.runRelativePath,
    syncBackProposalDigest: proposal.digest,
    artifacts: acceptedArtifacts.map((artifactPath) => ({ path: artifactPath, kind: artifactKind(artifactPath), task: options.taskId, agent: agentFromArtifactPath(artifactPath) }))
  });
  await appendEvent(projectRoot, runId, {
    event: 'sync_back_proposed',
    runId,
    summary: `Sync-back proposal created for ${options.taskId}`,
    data: { proposal: proposal.runRelativePath, status: terminalStatus }
  });
  await appendEvent(projectRoot, runId, {
    event: terminalStatus === 'completed' ? 'run_completed' : terminalStatus === 'blocked' ? 'gap_escalated' : 'validation_failed',
    runId,
    summary: `Phase 3.15 ingestion-aware task loop ${terminalStatus} for ${options.taskId}`,
    data: { task: options.taskId, artifacts: acceptedArtifacts, gaps }
  });
  if (routeDecision.teamMode.enabled || routeDecision.teamMode.decision !== 'disabled') {
    await writeTeamSessionRecord(projectRoot, buildTeamSessionRecord({
      runId,
      taskId: options.taskId,
      route: routeDecision,
      status: terminalStatus === 'completed' ? 'completed' : 'blocked',
      artifacts: acceptedArtifacts,
      evidenceSummary: `Team-mode ${routeDecision.teamMode.decision}; task loop ${terminalStatus} with ${acceptedArtifacts.length} artifact(s).`
    }));
  }

  return {
    runId,
    taskId: options.taskId,
    status: terminalStatus,
    task: inspected.task,
    gaps,
    requiredArtifacts: steps.map((step) => step.expectedArtifact),
    acceptedArtifacts,
    syncBackProposalPath: proposal.runRelativePath,
    routeDecision,
    message: terminalStatus === 'completed' ? 'Task loop completed through Phase 3 executor artifact ingestion.' : validationStatus === 'pass_with_gaps' ? 'Task loop blocked because validator returned PASS_WITH_GAPS; inspect gap report and sync-back proposal.' : 'Task loop stopped; inspect gap report and sync-back proposal.'
  };
}

function buildLoopSteps(taskId: string, options: SingleTaskLoopOptions): LoopAgentStep[] {
  const steps: LoopAgentStep[] = [
    { agent: 'implementer', suppliedArtifact: options.implementArtifact, expectedArtifact: `artifacts/implement-${taskId}.md`, required: false },
    { agent: 'reviewer', suppliedArtifact: options.reviewArtifact, expectedArtifact: `artifacts/review-${taskId}.md`, required: true }
  ];
  if (options.debugArtifact) {
    steps.push({ agent: 'debugger', suppliedArtifact: options.debugArtifact, expectedArtifact: `artifacts/debug-${taskId}.md`, required: false });
  }
  steps.push({ agent: 'validator', suppliedArtifact: options.validationArtifact, expectedArtifact: `artifacts/validation-${taskId}.md`, required: true });
  return steps;
}

async function persistLoopState(projectRoot: string, runId: string, input: {
  status: SingleTaskLoopStatus;
  phase: string;
  taskId: string;
  taskState: unknown;
  validationStatus: RunState['validation']['status'];
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
    status: input.status,
    phase: input.phase,
    currentTask: input.taskId,
    tasks: {
      ...state.tasks,
      [input.taskId]: input.taskState
    },
    artifacts: [...state.artifacts, ...newArtifacts],
    validation: {
      ...state.validation,
      status: input.validationStatus,
      evidence: input.artifacts.filter((artifact) => artifact.kind === 'validation').map((artifact) => artifact.path)
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

function renderLoopGapReport(taskId: string, gaps: SddTaskGap[]): string {
  return `# Gap Report ${taskId}\n\n\`\`\`sdd-result\ncontract: ${SDD_RESULT_CONTRACT}\nversion: ${SDD_RESULT_VERSION}\nagent: runtime\ntask: ${taskId}\nstatus: BLOCKED\nartifacts:\n  - artifacts/gap-report-${taskId}.md\n\`\`\`\n\n## Gaps\n\n${gaps.length > 0 ? gaps.map((gap) => `- [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message} Recommendation: ${gap.recommendation}`).join('\n') : '- No structured gaps were provided; inspect task selection and supplied artifacts.'}\n`;
}

function artifactOptionName(agent: string): string {
  if (agent === 'implementer') {
    return '--implement-artifact';
  }
  if (agent === 'reviewer') {
    return '--review-artifact';
  }
  if (agent === 'debugger') {
    return '--debug-artifact';
  }
  if (agent === 'validator') {
    return '--validation-artifact';
  }
  return '--artifact';
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

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
