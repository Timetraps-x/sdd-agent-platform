import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { doctor } from '../doctor/doctor.js';
import type { DoctorLevel, DoctorReport } from '../doctor/model.js';
import { getProjectStatus, type ProjectStatus } from '../status/project-status.js';

export interface ShipReadinessCheck {
  name: string;
  status: 'PASS' | 'BLOCKED';
  message: string;
  nextAction?: string;
}

export interface ShipResult {
  contract: 'sdd-ship-readiness-v1';
  branch: string;
  status: 'PASS' | 'BLOCKED';
  dryRun: boolean;
  releasePath: string;
  wroteRelease: boolean;
  checkedAt: string;
  checks: ShipReadinessCheck[];
  nextActions: string[];
  projectStatus: {
    workflowStatus: ProjectStatus['workflowStatus'];
    tasks: ProjectStatus['tasks'];
    taskRisk: ProjectStatus['taskRisk'];
    latestRun: ProjectStatus['latestRun'];
    latestRunEvidence: ProjectStatus['latestRunEvidence'];
    staleReasons: string[];
    affectedFileConflicts: number;
    dependencyBlockers: number;
    tokenProjection: ProjectStatus['tokenProjection'];
    lifecycleRisk: ProjectStatus['lifecycleRisk'];
  };
  doctor: {
    status: DoctorLevel;
    pass: number;
    warn: number;
    fail: number;
  };
  releaseDocument: string;
}

export async function runShip(projectRoot: string, options: { branch?: string | null; dryRun?: boolean } = {}): Promise<ShipResult> {
  const checkedAt = new Date().toISOString();
  const projectStatus = await getProjectStatus(projectRoot, { branch: options.branch ?? undefined, branchSource: options.branch ? 'cli_option' : undefined });
  const doctorReport = await doctor(projectRoot, { latestOnly: true, branch: projectStatus.branch });
  const checks = buildShipChecks(projectStatus, doctorReport);
  const blocked = checks.some((check) => check.status === 'BLOCKED');
  const status = blocked ? 'BLOCKED' : 'PASS';
  const releasePath = path.join(projectStatus.context.specDir, 'release.md');
  const nextActions = shipNextActions(projectStatus.branch, checks);
  const releaseDocument = renderReleaseDocument({ checkedAt, projectStatus, doctorReport, checks, nextActions, status });
  const dryRun = options.dryRun === true;
  if (!dryRun) {
    const absoluteReleasePath = path.join(projectRoot, releasePath);
    await mkdir(path.dirname(absoluteReleasePath), { recursive: true });
    await writeFile(absoluteReleasePath, releaseDocument, 'utf8');
  }
  return {
    contract: 'sdd-ship-readiness-v1',
    branch: projectStatus.branch,
    status,
    dryRun,
    releasePath,
    wroteRelease: !dryRun,
    checkedAt,
    checks,
    nextActions,
    projectStatus: {
      workflowStatus: projectStatus.workflowStatus,
      tasks: projectStatus.tasks,
      taskRisk: projectStatus.taskRisk,
      latestRun: projectStatus.latestRun,
      latestRunEvidence: projectStatus.latestRunEvidence,
      staleReasons: projectStatus.latestRunStaleReasons,
      affectedFileConflicts: projectStatus.affectedFileConflicts.length,
      dependencyBlockers: projectStatus.dependencyBlockers.length,
      tokenProjection: projectStatus.tokenProjection,
      lifecycleRisk: projectStatus.lifecycleRisk,
    },
    doctor: summarizeDoctor(doctorReport),
    releaseDocument
  };
}

function buildShipChecks(projectStatus: ProjectStatus, doctorReport: DoctorReport): ShipReadinessCheck[] {
  const checks: ShipReadinessCheck[] = [];
  checks.push({
    name: 'documents',
    status: projectStatus.documents.specExists && projectStatus.documents.planExists && projectStatus.documents.tasksExists && projectStatus.documents.verifyExists ? 'PASS' : 'BLOCKED',
    message: `spec=${projectStatus.documents.specExists} plan=${projectStatus.documents.planExists} tasks=${projectStatus.documents.tasksExists} verify=${projectStatus.documents.verifyExists}`,
    nextAction: 'sdd init --branch <branch> --scaffold-docs'
  });
  checks.push({
    name: 'workflow_gaps',
    status: projectStatus.gaps.some((gap) => gap.severity === 'blocking') ? 'BLOCKED' : 'PASS',
    message: `blocking_gaps=${projectStatus.gaps.filter((gap) => gap.severity === 'blocking').length} total_gaps=${projectStatus.gaps.length}`,
    nextAction: `sdd tasks list --branch ${projectStatus.branch}`
  });
  checks.push({
    name: 'dependency_blockers',
    status: projectStatus.dependencyBlockers.length === 0 ? 'PASS' : 'BLOCKED',
    message: `dependency_blockers=${projectStatus.dependencyBlockers.length}`,
    nextAction: projectStatus.dependencyBlockers[0] ? `sdd tasks inspect ${projectStatus.dependencyBlockers[0].dependencyId} --branch ${projectStatus.branch}` : undefined
  });
  checks.push({
    name: 'doctor_fast',
    status: doctorReport.status === 'PASS' ? 'PASS' : 'BLOCKED',
    message: `doctor_status=${doctorReport.status}`,
    nextAction: `sdd doctor fast --branch ${projectStatus.branch}`
  });
  checks.push({
    name: 'latest_run',
    status: latestRunReady(projectStatus) ? 'PASS' : 'BLOCKED',
    message: projectStatus.latestRun
      ? `run=${projectStatus.latestRun.runId} status=${projectStatus.latestRun.status} validation=${projectStatus.latestRun.validationStatus} sync_back=${projectStatus.latestRun.syncBackStatus}`
      : 'run=none',
    nextAction: projectStatus.latestRun ? `sdd run inspect ${projectStatus.latestRun.runId}` : `sdd do task <task_id> --branch ${projectStatus.branch}`
  });
  checks.push({
    name: 'evidence_health',
    status: projectStatus.latestRunStaleReasons.length === 0 && projectStatus.affectedFileConflicts.length === 0 ? 'PASS' : 'BLOCKED',
    message: `stale_reasons=${projectStatus.latestRunStaleReasons.length} affected_file_conflicts=${projectStatus.affectedFileConflicts.length}`,
    nextAction: `sdd status --branch ${projectStatus.branch}`
  });
  checks.push({
    name: 'token_health',
    status: 'PASS',
    message: `token_health=${projectStatus.tokenProjection.health} estimated_tokens=${projectStatus.tokenProjection.estimatedTokens ?? 'unknown'} context_packages=${projectStatus.tokenProjection.contextPackages} team_runtime_decisions=${projectStatus.tokenProjection.teamRuntimeDecisions}`,
    nextAction: `sdd statusline --branch ${projectStatus.branch} --json`
  });
  checks.push({
    name: 'lifecycle_risk_decision',
    status: lifecycleRiskReady(projectStatus) ? 'PASS' : 'BLOCKED',
    message: `enforced status=${projectStatus.lifecycleRisk.status} profile=${projectStatus.lifecycleRisk.profile ?? 'none'} approval=${projectStatus.lifecycleRisk.approvalPolicy ?? 'none'}`,
    nextAction: lifecycleRiskReady(projectStatus) ? undefined : `Resolve lifecycle risk gate for ${projectStatus.lifecycleRisk.scopeKey} before ship.`
  });
  checks.push({
    name: 'workflow_handoff',
    status: workflowHandoffReady(projectStatus) ? 'PASS' : 'BLOCKED',
    message: `status=${projectStatus.workflowHandoff.status} latest=${projectStatus.workflowHandoff.latestHandoff ? `${projectStatus.workflowHandoff.latestHandoff.fromStage}->${projectStatus.workflowHandoff.latestHandoff.toStage}:${projectStatus.workflowHandoff.latestHandoff.status}` : 'none'}`,
    nextAction: workflowHandoffReady(projectStatus) ? undefined : `Resolve workflow handoff state before ship for ${projectStatus.branch}.`
  });
  checks.push({
    name: 'context_offload',
    status: projectStatus.contextRuntime.action === 'block-for-curation' ? 'BLOCKED' : 'PASS',
    message: `level=${projectStatus.contextRuntime.level} action=${projectStatus.contextRuntime.action}`,
    nextAction: projectStatus.contextRuntime.action === 'block-for-curation' ? `Curate context before ship for ${projectStatus.branch}.` : undefined
  });
  checks.push({
    name: 'subagent_dispatches',
    status: subagentDispatchesReady(projectStatus) ? 'PASS' : 'BLOCKED',
    message: `status=${projectStatus.subagentDispatches.status} blocking_open=${projectStatus.subagentDispatches.blockingOpen} failed=${projectStatus.subagentDispatches.failed} archived=${projectStatus.subagentDispatches.archived} superseded=${projectStatus.subagentDispatches.superseded}`,
    nextAction: subagentDispatchesReady(projectStatus) ? undefined : projectStatus.subagentDispatches.reasons.join(' ')
  });
  return checks;
}

function latestRunReady(projectStatus: ProjectStatus): boolean {
  if (!projectStatus.latestRun) {
    return false;
  }
  return projectStatus.latestRun.status === 'completed'
    && projectStatus.latestRun.validationStatus === 'pass'
    && projectStatus.latestRun.syncBackStatus === 'applied';
}

function lifecycleRiskReady(projectStatus: ProjectStatus): boolean {
  return projectStatus.lifecycleRisk.status === 'fresh'
    && projectStatus.lifecycleRisk.approvalPolicy !== 'blocked'
    && projectStatus.lifecycleRisk.approvalPolicy !== 'human-required';
}

function workflowHandoffReady(projectStatus: ProjectStatus): boolean {
  return projectStatus.workflowHandoff.status === 'fresh' || projectStatus.workflowHandoff.status === 'missing';
}

function subagentDispatchesReady(projectStatus: ProjectStatus): boolean {
  return projectStatus.subagentDispatches.status === 'fresh' || projectStatus.subagentDispatches.status === 'missing';
}

function summarizeDoctor(report: DoctorReport): ShipResult['doctor'] {
  return {
    status: report.status,
    pass: report.checks.filter((check) => check.level === 'PASS').length,
    warn: report.checks.filter((check) => check.level === 'WARN').length,
    fail: report.checks.filter((check) => check.level === 'FAIL').length
  };
}

function shipNextActions(branch: string, checks: ShipReadinessCheck[]): string[] {
  const blocked = checks.filter((check) => check.status === 'BLOCKED');
  if (blocked.length === 0) {
    return [`Review specs/${branch}/release.md`, 'Do not publish, push, tag, or deploy without explicit separate approval.'];
  }
  return blocked.map((check) => check.nextAction ?? `Resolve ${check.name}`).filter((item, index, items) => items.indexOf(item) === index);
}

function renderReleaseDocument(input: {
  checkedAt: string;
  projectStatus: ProjectStatus;
  doctorReport: DoctorReport;
  checks: ShipReadinessCheck[];
  nextActions: string[];
  status: ShipResult['status'];
}): string {
  const latestRun = input.projectStatus.latestRun;
  const evidence = input.projectStatus.latestRunEvidence;
  return [
    `# Release — ${input.projectStatus.branch}`,
    '',
    '## Readiness',
    '',
    `- status: ${input.status}`,
    `- checked_at: ${input.checkedAt}`,
    '- boundary: local readiness and release summary only; no publish, push, tag, deploy, or external release state is performed.',
    '',
    '## Checks',
    '',
    ...input.checks.map((check) => `- ${check.status} ${check.name}: ${check.message}`),
    '',
    '## Workflow summary',
    '',
    `- workflow_status: ${input.projectStatus.workflowStatus}`,
    `- tasks: total=${input.projectStatus.tasks.total} pending=${input.projectStatus.tasks.pending} in_progress=${input.projectStatus.tasks.inProgress} completed=${input.projectStatus.tasks.completed} blocked=${input.projectStatus.tasks.blocked} gaps=${input.projectStatus.tasks.gaps}`,
    `- dependency_blockers: ${input.projectStatus.dependencyBlockers.map((blocker) => `${blocker.taskId}->${blocker.dependencyId}`).join(',') || 'none'}`,
    `- task_risk: high=${input.projectStatus.taskRisk.highRiskTasks.join(',') || 'none'} medium=${input.projectStatus.taskRisk.mediumRiskTasks.join(',') || 'none'} source_boundary=${input.projectStatus.taskRisk.sourceBoundaryTasks.join(',') || 'none'} context=${input.projectStatus.taskRisk.contextRiskTasks.join(',') || 'none'} token=${input.projectStatus.taskRisk.tokenRiskTasks.join(',') || 'none'} performance=${input.projectStatus.taskRisk.performanceRiskTasks.join(',') || 'none'}`,
    latestRun ? `- latest_run: ${latestRun.runId} status=${latestRun.status} validation=${latestRun.validationStatus} sync_back=${latestRun.syncBackStatus}` : '- latest_run: none',
    evidence ? `- latest_run_evidence: route_preflight=${evidence.routePreflight} agent_executions=${evidence.agentExecutions} team_sessions=${evidence.teamSessions} worker_runtimes=${evidence.workerRuntimes} stale_worker_runtimes=${evidence.staleWorkerRuntimes} artifact_ingestions=${evidence.artifactIngestions}` : '- latest_run_evidence: none',
    `- token_health: ${input.projectStatus.tokenProjection.health} estimated_tokens=${input.projectStatus.tokenProjection.estimatedTokens ?? 'unknown'} context_packages=${input.projectStatus.tokenProjection.contextPackages} team_runtime_decisions=${input.projectStatus.tokenProjection.teamRuntimeDecisions}`,
    `- lifecycle_risk: status=${input.projectStatus.lifecycleRisk.status} profile=${input.projectStatus.lifecycleRisk.profile ?? 'none'} approval=${input.projectStatus.lifecycleRisk.approvalPolicy ?? 'none'} input=${input.projectStatus.lifecycleRisk.inputHash ?? 'none'} expected=${input.projectStatus.lifecycleRisk.expectedInputHash}`,
    `- doctor_fast: status=${input.doctorReport.status} checks=${input.doctorReport.checks.length}`,
    '',
    '## Next actions',
    '',
    ...input.nextActions.map((action) => `- ${action}`),
    ''
  ].join('\n');
}
