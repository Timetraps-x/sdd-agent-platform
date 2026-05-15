import type { InitProjectResult } from '@sdd-agent-platform/core/status';
import type { ProjectStatus } from '@sdd-agent-platform/core/status';
import type { RunSummary } from '@sdd-agent-platform/core/run-state';
import type { RunInspection } from '@sdd-agent-platform/core/run-state';
import type { LocalRunIndex, LocalRunIndexInspection } from '@sdd-agent-platform/core/run-state';
import type { SyncBackApplyResult } from '@sdd-agent-platform/core/sync-back';
import type { SyncBackInspection } from '@sdd-agent-platform/core/sync-back';
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
    status.documents.tasksStale ? 'tasks' : null
  ].filter((item): item is string => item !== null);
  const hasDocumentHashes = Boolean(
    status.documents.specHash
    || status.documents.planHash
    || status.documents.tasksHash
    || status.documents.planBasedOnSpecHash
    || status.documents.tasksBasedOnPlanHash
  );
  lines.push('decision');
  lines.push(`- workflow_status=${status.workflowStatus}`);
  lines.push(`- context raw_branch=${status.context.rawBranch} partition=${status.context.partition} source=${status.context.branchSource} spec_dir=${status.context.specDir}`);
  lines.push(`- git current_branch=${status.context.currentGitBranch ?? 'none'} working_tree_matched=${status.context.workingTreeMatched ?? 'unknown'}`);
  lines.push(`- documents spec=${status.documents.specExists} plan=${status.documents.planExists} tasks=${status.documents.tasksExists} stale=${staleDocuments.join(',') || 'none'}`);
  if (hasDocumentHashes) {
    lines.push(`- document_hashes spec=${status.documents.specHash ?? 'none'} plan=${status.documents.planHash ?? 'none'} tasks=${status.documents.tasksHash ?? 'none'} plan_based_on_spec=${status.documents.planBasedOnSpecHash ?? 'none'} tasks_based_on_plan=${status.documents.tasksBasedOnPlanHash ?? 'none'}`);
  }
  lines.push(`- tasks total=${status.tasks.total} pending=${status.tasks.pending} in_progress=${status.tasks.inProgress} completed=${status.tasks.completed} blocked=${status.tasks.blocked} deferred=${status.tasks.deferred} unknown=${status.tasks.unknown} gaps=${status.tasks.gaps}`);
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
  const currentStatus = inspection.markdownStatus ?? 'n/a';
  const lines = [`Sync-back ${inspection.status} for ${inspection.runId}/${taskId}`];
  lines.push(`branch=${inspection.branch}`);
  lines.push(`target_tasks_path=${inspection.targetTasksPath}`);
  lines.push(`target_update=task ${taskId} status ${currentStatus} -> completed`);
  lines.push(`proposal=${inspection.proposalPath ?? 'none'}`);
  lines.push(`proposal_digest_valid=${inspection.proposalDigestValid === null ? 'n/a' : inspection.proposalDigestValid}`);
  lines.push(`run_task_status=${inspection.runTaskStatus ?? 'n/a'} markdown_status=${currentStatus}`);
  lines.push(`artifacts=${inspection.artifacts.join(',') || 'none'}`);
  if (inspection.reasons.length > 0) {
    lines.push('reasons');
    for (const reason of inspection.reasons) {
      lines.push(`- ${reason}`);
    }
  }
  renderWorkflowDocumentGaps(lines, inspection.gaps);
  lines.push(`apply_policy=${inspection.applyPolicy.mode} approval_required=${inspection.applyPolicy.requiresApproval}`);
  for (const reason of inspection.applyPolicy.reasons) {
    lines.push(`- policy: ${reason}`);
  }
  lines.push('apply_effects');
  lines.push('- write target task block in tasks.md to completed');
  lines.push('- append sync-back implementation note from proposal/evidence');
  lines.push('- mark run sync_back state applied');
  lines.push('- rebuild local run index');
  if (inspection.status === 'ready') {
    const approvedFlag = inspection.applyPolicy.requiresApproval ? ' --approved' : '';
    lines.push(`next sdd sync-back apply ${inspection.runId} --branch ${inspection.branch} --task ${taskId}${approvedFlag}`);
  }
  return lines.join('\n');
}

export function renderSyncBackApplyResult(result: SyncBackApplyResult): string {
  const inspection = result.inspection;
  const taskId = inspection.taskId ?? result.taskId;
  const lines = [result.message];
  lines.push(`run_id=${result.runId}`);
  lines.push(`branch=${inspection.branch}`);
  lines.push(`task_id=${taskId}`);
  lines.push(`target_tasks_path=${result.tasksPath}`);
  lines.push(`target_update=task ${taskId} status ${inspection.markdownStatus ?? 'n/a'}`);
  lines.push(`proposal=${inspection.proposalPath ?? 'none'}`);
  lines.push(`artifacts=${inspection.artifacts.join(',') || 'none'}`);
  lines.push(`applied=${result.applied}`);
  lines.push(`sync_back=${inspection.status}`);
  lines.push('applied_effects');
  lines.push('- target tasks.md task block is completed');
  lines.push('- sync-back implementation note is present in tasks.md');
  lines.push('- run sync_back state is applied');
  lines.push('- local run index was rebuilt');
  return lines.join('\n');
}

