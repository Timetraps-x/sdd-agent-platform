import type { InitProjectResult } from '@sdd-agent-platform/core/status';
import type { ProjectStatus } from '@sdd-agent-platform/core/status';
import type { StatuslineProjection } from '@sdd-agent-platform/core/status';
import type { RunSummary } from '@sdd-agent-platform/core/run-state';
import type { RunInspection } from '@sdd-agent-platform/core/run-state';
import type { LocalRunIndex, LocalRunIndexInspection } from '@sdd-agent-platform/core/run-state';
import type { SyncBackApplyResult } from '@sdd-agent-platform/core/sync-back';
import type { SyncBackInspection } from '@sdd-agent-platform/core/sync-back';
import type { ShipResult } from '@sdd-agent-platform/core/lifecycle';
import { renderIssuesOrNone, renderWorkflowDocumentGaps } from './issues.js';

export function renderInitResult(result: InitProjectResult): string {
  const aiEntries = result.aiTools.flatMap((tool) => tool.entries);
  const aiCounts = new Map<string, number>();
  for (const entry of aiEntries) {
    aiCounts.set(entry.status, (aiCounts.get(entry.status) ?? 0) + 1);
  }
  const aiSummary = Array.from(aiCounts.entries()).map(([status, count]) => `${status}=${count}`).join(' ') || 'none';
  const scaffoldedDocuments = result.documents.documents.filter((document) => document.status !== 'skipped');
  const lines = ['SDD init', 'changed'];
  lines.push(`- config ${result.created ? 'created/updated' : 'unchanged'} at ${result.configPath}`);
  lines.push(`- semantic docs ${scaffoldedDocuments.map((document) => `${document.status}:${document.relativePath}`).join(', ') || 'none'}`);
  lines.push(`- ai entries ${aiSummary}`);
  lines.push('decision');
  if (scaffoldedDocuments.length > 0) {
    lines.push(`- legacy_scaffold_branch=${result.documents.branch}`);
    lines.push(`- legacy_spec_dir=${result.documents.root}`);
  }
  lines.push('- sdd init is project-level setup; /sdd:spec is the workflow partition/spec entry');
  lines.push('evidence');
  for (const document of scaffoldedDocuments) {
    lines.push(`- [${document.status}] ${document.relativePath}: ${document.message}`);
  }
  if (aiEntries.length === 0) {
    lines.push('- ai entries skipped');
  } else {
    lines.push(`- ${aiEntries.length} managed AI entry projection(s) checked/applied`);
  }
  lines.push('- doctor checks git repository health; run git init first in fresh temporary projects before relying on doctor/run-index checks');
  lines.push('gaps');
  const driftEntries = aiEntries.filter((entry) => entry.status === 'drifted' || entry.status === 'user-modified' || entry.status === 'foreign' || entry.status === 'conflict');
  if (driftEntries.length === 0) {
    lines.push('- none');
  } else {
    for (const entry of driftEntries) {
      lines.push(`- [${entry.status}] ${entry.relativePath}: ${entry.action ?? entry.message}`);
    }
  }
  lines.push('next');
  lines.push('- /sdd:spec');
  return lines.join('\n');
}

export function renderProjectStatus(status: ProjectStatus): string {
  const lines = [`SDD status for ${status.branch}`];
  const staleDocuments = [
    status.documents.planStale ? 'plan' : null,
    status.documents.tasksStale ? 'tasks' : null,
    status.documents.verifyStale ? 'verify' : null
  ].filter((item): item is string => item !== null);
  const hasDocumentHashes = Boolean(
    status.documents.specHash
    || status.documents.planHash
    || status.documents.tasksHash
    || status.documents.planBasedOnSpecHash
    || status.documents.tasksBasedOnPlanHash
    || status.documents.verifyHash
    || status.documents.verifyBasedOnTasksHash
  );
  lines.push('decision');
  lines.push(`- workflow_status=${status.workflowStatus}`);
  lines.push(`- context raw_branch=${status.context.rawBranch} partition=${status.context.partition} source=${status.context.branchSource} spec_dir=${status.context.specDir}`);
  lines.push(`- git current_branch=${status.context.currentGitBranch ?? 'none'} working_tree_matched=${status.context.workingTreeMatched ?? 'unknown'}`);
  lines.push(`- documents spec=${status.documents.specExists} plan=${status.documents.planExists} tasks=${status.documents.tasksExists} verify=${status.documents.verifyExists} stale=${staleDocuments.join(',') || 'none'}`);
  if (hasDocumentHashes) {
    lines.push(`- document_hashes spec=${status.documents.specHash ?? 'none'} plan=${status.documents.planHash ?? 'none'} tasks=${status.documents.tasksHash ?? 'none'} verify=${status.documents.verifyHash ?? 'none'} plan_based_on_spec=${status.documents.planBasedOnSpecHash ?? 'none'} tasks_based_on_plan=${status.documents.tasksBasedOnPlanHash ?? 'none'} verify_based_on_tasks=${status.documents.verifyBasedOnTasksHash ?? 'none'}`);
  }
  lines.push(`- tasks total=${status.tasks.total} pending=${status.tasks.pending} in_progress=${status.tasks.inProgress} completed=${status.tasks.completed} blocked=${status.tasks.blocked} deferred=${status.tasks.deferred} unknown=${status.tasks.unknown} gaps=${status.tasks.gaps}`);
  lines.push(`- task_risk high=${status.taskRisk.highRiskTasks.join(',') || 'none'} medium=${status.taskRisk.mediumRiskTasks.join(',') || 'none'} source_boundary=${status.taskRisk.sourceBoundaryTasks.join(',') || 'none'} context=${status.taskRisk.contextRiskTasks.join(',') || 'none'} token=${status.taskRisk.tokenRiskTasks.join(',') || 'none'} performance=${status.taskRisk.performanceRiskTasks.join(',') || 'none'}`);
  lines.push(`- lifecycle_risk status=${status.lifecycleRisk.status} profile=${status.lifecycleRisk.profile ?? 'none'} approval=${status.lifecycleRisk.approvalPolicy ?? 'none'} input=${status.lifecycleRisk.inputHash ?? 'none'} expected=${status.lifecycleRisk.expectedInputHash}`);
  lines.push(`- workflow_handoff status=${status.workflowHandoff.status} active_stage=${status.workflowHandoff.activeStage?.stage ?? 'none'} latest_stage=${status.workflowHandoff.latestStageRun?.stage ?? 'none'} latest_handoff=${status.workflowHandoff.latestHandoff ? `${status.workflowHandoff.latestHandoff.fromStage}->${status.workflowHandoff.latestHandoff.toStage}:${status.workflowHandoff.latestHandoff.status}` : 'none'} stage_projections=${status.workflowHandoff.projectionCounts.stageRuns} handoff_projections=${status.workflowHandoff.projectionCounts.handoffs}`);
  lines.push(`- context_offload level=${status.contextRuntime.level} action=${status.contextRuntime.action} load_signals=${status.contextRuntime.loadSignals} offload_decisions=${status.contextRuntime.offloadDecisions} dispatch_refs=${status.contextRuntime.dispatchRefs}`);
  lines.push(`- subagent_dispatch status=${status.subagentDispatches.status} dispatches=${status.subagentDispatches.dispatches} blocking_open=${status.subagentDispatches.blockingOpen} failed=${status.subagentDispatches.failed} stale=${status.subagentDispatches.stale} completed=${status.subagentDispatches.completed} archived=${status.subagentDispatches.archived} superseded=${status.subagentDispatches.superseded}`);
  if (status.latestRun) {
    lines.push(`- latest_run ${status.latestRun.runId} status=${status.latestRun.status} phase=${status.latestRun.phase ?? 'n/a'} task=${status.latestRun.currentTask ?? 'n/a'} validation=${status.latestRun.validationStatus} sync_back=${status.latestRun.syncBackStatus}`);
    if (status.latestRunEvidence) {
      lines.push(`- latest_run_evidence route_preflight=${status.latestRunEvidence.routePreflight} agent_executions=${status.latestRunEvidence.agentExecutions} team_sessions=${status.latestRunEvidence.teamSessions} worker_runtimes=${status.latestRunEvidence.workerRuntimes} stale_worker_runtimes=${status.latestRunEvidence.staleWorkerRuntimes} artifact_ingestions=${status.latestRunEvidence.artifactIngestions}`);
      if (status.latestRunEvidence.tasksChangedAfterRun && status.latestRun.syncBackStatus !== 'applied') {
        lines.push('- latest_run_evidence may be stale: tasks.md changed after the latest run; inspect the task or rerun before relying on this run.');
      } else if (status.latestRunEvidence.tasksChangedAfterRun) {
        lines.push('- latest_run_evidence tasks.md changed after sync-back apply; task completion state is already recorded.');
      }
    }
  } else {
    lines.push('- latest_run none');
  }
  lines.push('evidence');
  lines.push(`- branch documents loaded from ${status.context.specDir}`);
  lines.push(status.gitRoot
    ? `- git repository detected at ${status.gitRoot}; doctor and run-index checks can use Git repository context`
    : '- doctor and run-index checks expect Git repository context; run git init first in fresh temporary projects');
  renderWorkflowDocumentGaps(lines, status.gaps);
  lines.push(`next ${status.recommendedNextCommand}`);
  return lines.join('\n');
}

export function renderStatuslineProjection(statusline: StatuslineProjection): string {
  return [
    `sdd ${statusline.branch}`,
    `wf=${statusline.workflow}`,
    `tasks=${statusline.taskHealth}:${statusline.counts.tasks.completed}/${statusline.counts.tasks.total}`,
    `runtime=${statusline.runtimeHealth}`,
    `test=${statusline.testHealth}`,
    `team=${statusline.teamHealth}:${statusline.counts.teamSessions}`,
    `tokens=${statusline.tokenHealth}`,
    `context=${statusline.contextLoad}:${statusline.contextAction}`,
    `subagents=${statusline.subagentHealth}:${statusline.counts.subagentDispatches}`,
    `risk=high:${statusline.taskRisk.highRiskTasks.length},source:${statusline.taskRisk.sourceBoundaryTasks.length},ctx:${statusline.taskRisk.contextRiskTasks.length},tok:${statusline.taskRisk.tokenRiskTasks.length},perf:${statusline.taskRisk.performanceRiskTasks.length}`,
    `evidence=${statusline.evidenceHealth}:${statusline.counts.artifactIngestions}`,
    `run=${statusline.latestRunId ?? 'none'}`,
    `next=${statusline.next}`
  ].join(' | ');
}

export function renderRunList(runs: RunSummary[]): string {
  if (runs.length === 0) {
    return 'No SDD runs found.';
  }
  const lines = ['SDD runs'];
  for (const run of runs) {
    lines.push(`${run.runId}\t${run.status}\tphase=${run.phase ?? 'n/a'}\ttask=${run.currentTask ?? 'n/a'}\tvalidation=${run.validationStatus}\tsync_back=${run.syncBackStatus}\tupdated=${run.updatedAt}`);
  }
  return lines.join('\n');
}

export function renderLocalRunIndex(index: LocalRunIndex): string {
  const lines = [`Local run index ${index.contract}`];
  lines.push(`generated=${index.generatedAt} runs=${index.runs.length} tasks=${index.tasks.length} delegations=${index.delegations.length} artifacts=${index.artifacts.length} waves=${index.waves.length}`);
  for (const run of index.runs) {
    lines.push(`- ${run.runId}: ${run.status} phase=${run.phase ?? 'n/a'} task=${run.currentTask ?? 'n/a'} artifacts=${run.artifactCount} updated=${run.updatedAt}`);
  }
  return lines.join('\n');
}

export function renderLocalRunIndexInspection(inspection: LocalRunIndexInspection): string {
  const lines = [`Local run index ${inspection.valid ? 'valid' : 'invalid'}`];
  lines.push(`path=${inspection.indexPath} exists=${inspection.exists}`);
  if (inspection.index) {
    lines.push(`contract=${inspection.index.contract} runs=${inspection.index.runs.length} tasks=${inspection.index.tasks.length} delegations=${inspection.index.delegations.length} artifacts=${inspection.index.artifacts.length} waves=${inspection.index.waves.length}`);
  }
  renderIssuesOrNone(lines, inspection.issues);
  return lines.join('\n');
}

export function renderRunInspection(inspection: RunInspection): string {
  const lines = [`SDD run ${inspection.summary.runId}`];
  lines.push(`status=${inspection.summary.status} phase=${inspection.summary.phase ?? 'n/a'} task=${inspection.summary.currentTask ?? 'n/a'} updated=${inspection.summary.updatedAt}`);
  lines.push(`validation=${inspection.validation.status} evidence=${inspection.validation.evidence.join(',') || 'none'}`);
  lines.push(`sync_back=${inspection.syncBack.status} proposal=${inspection.syncBack.proposalPath ?? 'none'}`);
  lines.push(`task_run_evidence=${inspection.taskRunEvidence.version} gaps=${inspection.taskRunEvidence.gaps.length} sync_back=${inspection.taskRunEvidence.syncBackProposal ?? 'none'}`);
  lines.push(`artifacts=${inspection.artifacts.length}`);
  for (const artifact of inspection.artifacts) {
    lines.push(`- ${artifact.path} kind=${artifact.kind} task=${artifact.task ?? 'n/a'} agent=${artifact.agent ?? 'n/a'}`);
  }
  lines.push(`artifact_ingestions=${inspection.artifactIngestions.length}`);
  for (const ingestion of inspection.artifactIngestions) {
    lines.push(`- ${ingestion.delegationId} ${ingestion.status} artifact=${ingestion.artifactPath} result=${ingestion.resultStatus ?? 'n/a'} delegation=${ingestion.delegationStatus ?? 'n/a'}`);
  }
  lines.push(`agent_executions=${inspection.agentExecutions.length}`);
  for (const execution of inspection.agentExecutions) {
    lines.push(`- ${execution.executionId} profile=${execution.profile} status=${execution.status} task=${execution.taskId} artifacts=${execution.artifacts.join(',') || 'none'}`);
  }
  lines.push(`team_sessions=${inspection.teamSessions.length}`);
  for (const session of inspection.teamSessions) {
    lines.push(`- ${session.teamId} status=${session.status} mode=${session.teamMode.mode} activation=${session.teamMode.activation} cost=${session.teamMode.costClass} chief=${session.chiefProfile} members=${session.memberProfiles.join(',') || 'none'} artifacts=${session.artifacts.join(',') || 'none'}`);
  }
  lines.push(`worker_runtimes=${inspection.workerRuntimes.length}`);
  for (const runtime of inspection.workerRuntimes) {
    lines.push(`- ${runtime.runtimeId} status=${runtime.status} task=${runtime.taskId} agent=${runtime.agent} delegation=${runtime.delegationId} lease_expires=${runtime.leaseExpiresAt}`);
  }
  lines.push(`events=${inspection.eventCount}`);
  for (const event of inspection.recentEvents) {
    lines.push(`- ${event.time} ${event.event}${event.summary ? `: ${event.summary}` : ''}`);
  }
  return lines.join('\n');
}

export function renderSyncBackInspection(inspection: SyncBackInspection): string {
  const taskId = inspection.taskId ?? 'n/a';
  const lines = [`SDD sync-back ${taskId}`];
  lines.push('');
  lines.push(syncBackResultSentence(inspection));
  lines.push('');
  lines.push('Why:');
  lines.push(`- ${primarySyncBackReason(inspection)}`);
  lines.push('');
  lines.push('Next:');
  lines.push(`- ${nextSyncBackAction(inspection)}`);
  return lines.join('\n');
}

export function renderSyncBackApplyResult(result: SyncBackApplyResult): string {
  const inspection = result.inspection;
  const taskId = inspection.taskId ?? result.taskId;
  const lines = [`SDD sync-back apply ${taskId}`];
  lines.push('');
  lines.push(result.applied ? 'Sync-back applied.' : 'Sync-back was not applied.');
  lines.push('');
  lines.push('Why:');
  lines.push(`- ${result.applied ? `Task status and sync-back note were written to ${result.tasksPath}.` : result.message}`);
  lines.push('');
  lines.push('Next:');
  lines.push(`- ${result.applied ? `Run sdd ship --dry-run --branch ${inspection.branch} when branch readiness should be checked.` : nextSyncBackAction(inspection)}`);
  return lines.join('\n');
}

function syncBackResultSentence(inspection: SyncBackInspection): string {
  if (inspection.status === 'blocked') {
    return 'Blocked before applying sync-back.';
  }
  if (inspection.applyPolicy.requiresApproval) {
    return 'Sync-back is ready and needs review before apply.';
  }
  return 'Sync-back is ready to apply.';
}

function primarySyncBackReason(inspection: SyncBackInspection): string {
  if (inspection.reasons.length > 0) {
    return inspection.reasons[0];
  }
  if (inspection.staleVerifyRecoveryCommand) {
    return `verify.md is stale for ${inspection.taskId ?? inspection.runId}.`;
  }
  if (inspection.gaps.length > 0) {
    return inspection.gaps[0].message;
  }
  if (inspection.applyPolicy.reasons.length > 0) {
    return inspection.applyPolicy.reasons[0];
  }
  if (inspection.applyPolicy.requiresApproval) {
    return 'The task can be synced back, but the apply policy requires review first.';
  }
  return 'Validation evidence and sync-back proposal are ready for this task.';
}

function nextSyncBackAction(inspection: SyncBackInspection): string {
  if (inspection.staleVerifyRecoveryCommand) {
    return inspection.staleVerifyRecoveryCommand;
  }
  if (inspection.status === 'ready') {
    const approvedFlag = inspection.applyPolicy.requiresApproval ? ' --approved' : '';
    const command = `sdd sync-back apply ${inspection.runId} --branch ${inspection.branch} --task ${inspection.taskId ?? 'TASK'}${approvedFlag}`;
    return inspection.applyPolicy.requiresApproval
      ? `Review ${inspection.proposalPath ?? 'the sync-back proposal'} and apply policy, then run ${command}.`
      : `Run ${command}.`;
  }
  return inspection.approvalCard.nextAction;
}

export function renderShipResult(result: ShipResult): string {
  const blockedCheck = result.checks.find((check) => check.status === 'BLOCKED');
  const lines = [`SDD ship ${result.branch}`];
  lines.push('');
  lines.push(result.status === 'PASS' ? (result.dryRun ? 'Ship dry-run passed.' : 'Ship completed.') : 'Blocked before ship.');
  lines.push('');
  lines.push('Why:');
  lines.push(`- ${blockedCheck?.message ?? 'All ship readiness checks passed.'}`);
  lines.push('');
  lines.push('Next:');
  lines.push(`- ${blockedCheck?.nextAction ?? result.nextActions[0] ?? 'No ship action is required.'}`);
  return lines.join('\n');
}

