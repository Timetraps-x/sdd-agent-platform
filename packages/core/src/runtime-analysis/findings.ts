import { RUNTIME_ANALYSIS_CONTRACT_VERSION } from '../contracts.js';
import type {
  RuntimeAnalysisEvidenceSummaryLike,
  RuntimeAnalysisFinding,
  RuntimeAnalysisReport,
  RuntimeAnalysisReportInput,
  RuntimeAnalysisRunInspectionLike,
  RuntimeAnalysisStatus,
  RuntimeAnalysisSyncBackLike
} from './model.js';

export function createRuntimeAnalysisReport(input: RuntimeAnalysisReportInput): RuntimeAnalysisReport {
  const findings = buildRuntimeAnalysisFindings(input);
  return {
    contract: RUNTIME_ANALYSIS_CONTRACT_VERSION,
    generatedAt: input.generatedAt,
    profile: input.profile,
    authoritative: false,
    usableForPass: false,
    status: summarizeRuntimeAnalysisStatus(findings),
    branch: input.branch,
    selectedRunId: input.selectedRunId,
    selectedTaskId: input.selectedTaskId,
    recommendedNextCommand: input.status.recommendedNextCommand,
    workflow: input.status,
    doctor: input.doctor,
    runIndex: input.runIndex,
    taskGraph: input.taskGraph,
    wavePlan: input.wavePlan,
    runInspection: input.runInspection,
    evidenceSummary: input.evidenceSummary,
    contextPackage: input.contextPackage,
    syncBack: input.syncBack,
    findings
  };
}

export function buildRuntimeAnalysisFindings(input: RuntimeAnalysisReportInput): RuntimeAnalysisFinding[] {
  const findings: RuntimeAnalysisFinding[] = [];
  const add = (finding: RuntimeAnalysisFinding) => findings.push(finding);

  if (input.status.workflowStatus === 'not_started') {
    add({
      severity: 'blocking',
      category: 'workflow',
      source: `specs/${input.branch}`,
      message: `Workflow partition ${input.branch} has not started.`,
      action: input.status.recommendedNextCommand
    });
  }

  for (const gap of input.status.gaps) {
    add({
      severity: gap.severity === 'blocking' ? 'blocking' : 'warning',
      category: 'workflow',
      source: gap.field,
      message: gap.taskId ? `${gap.taskId}: ${gap.message}` : gap.message,
      action: gap.recommendation,
      taskId: gap.taskId ?? undefined
    });
  }

  if (input.status.tasks.pending > 0) {
    add({
      severity: 'info',
      category: 'workflow',
      source: `specs/${input.branch}/tasks.md`,
      message: `${input.status.tasks.pending} pending task(s) remain.`,
      action: input.status.recommendedNextCommand
    });
  }

  for (const reason of input.status.latestRunStaleReasons) {
    add({
      severity: 'warning',
      category: 'run',
      source: input.status.latestRun?.runId ?? 'latest-run',
      message: reason,
      action: input.status.latestRun?.currentTask ? `sdd test task ${input.status.latestRun.currentTask} --branch ${input.branch}` : undefined,
      runId: input.status.latestRun?.runId ?? undefined,
      taskId: input.status.latestRun?.currentTask ?? undefined
    });
  }

  for (const check of input.doctor.checks) {
    if (check.level !== 'PASS') {
      add({
        severity: check.level === 'FAIL' ? 'blocking' : 'warning',
        category: 'doctor',
        source: check.check,
        message: check.message,
        action: check.action
      });
    }
  }

  if (!input.runIndex.exists) {
    add({
      severity: 'warning',
      category: 'run_index',
      source: input.runIndex.indexPath,
      message: 'Local run index is missing.',
      action: 'sdd run index rebuild'
    });
  } else if (!input.runIndex.valid) {
    for (const issue of input.runIndex.issues) {
      add({
        severity: 'warning',
        category: 'run_index',
        source: input.runIndex.indexPath,
        message: issue.message,
        action: issue.recommendation
      });
    }
  }

  if (!input.taskGraph.valid) {
    add({
      severity: 'blocking',
      category: 'task_graph',
      source: `specs/${input.branch}/tasks.md`,
      message: 'Task graph is not valid.',
      action: `sdd tasks gaps --branch ${input.branch}`
    });
  }
  for (const diagnostic of input.taskGraph.diagnostics) {
    add({
      severity: diagnostic.severity === 'blocking' ? 'blocking' : 'warning',
      category: 'task_graph',
      source: diagnostic.field,
      message: diagnostic.taskId ? `${diagnostic.taskId}: ${diagnostic.message}` : diagnostic.message,
      action: diagnostic.recommendation,
      taskId: diagnostic.taskId ?? undefined
    });
  }

  for (const gate of input.wavePlan.blockedTasks) {
    add({
      severity: 'blocking',
      category: 'wave_plan',
      source: `wave:${input.wavePlan.branch}`,
      message: `${gate.taskId} is blocked: ${gate.reasons.join('; ')}`,
      action: `sdd tasks inspect ${gate.taskId} --branch ${input.wavePlan.branch}`,
      taskId: gate.taskId
    });
  }
  for (const gate of input.wavePlan.manualGates) {
    add({
      severity: 'warning',
      category: 'wave_plan',
      source: `wave:${input.wavePlan.branch}`,
      message: `${gate.taskId} requires manual gating: ${gate.reasons.join('; ')}`,
      action: `sdd tasks inspect ${gate.taskId} --branch ${input.wavePlan.branch}`,
      taskId: gate.taskId
    });
  }

  if (input.runInspection) {
    addRunInspectionFindings(input.runInspection, add);
  }
  if (input.evidenceSummary) {
    addEvidenceSummaryFindings(input.evidenceSummary, add);
  }
  if (input.contextPackage) {
    for (const warning of input.contextPackage.warnings) {
      add({
        severity: warning.includes('cannot satisfy PASS evidence') ? 'info' : 'warning',
        category: 'context',
        source: `context:${input.contextPackage.mode}`,
        message: warning,
        action: input.contextPackage.nextCommands[0],
        taskId: input.contextPackage.taskId
      });
    }
  }
  if (input.syncBack) {
    addSyncBackFindings(input.syncBack, add);
  }
  for (const issue of input.inputIssues) {
    add({
      severity: 'warning',
      category: issue.source,
      source: issue.source,
      message: issue.message,
      action: issue.action,
      runId: issue.runId,
      taskId: issue.taskId
    });
  }

  return findings;
}

function addRunInspectionFindings(run: RuntimeAnalysisRunInspectionLike, add: (finding: RuntimeAnalysisFinding) => void): void {
  if (run.state.status === 'failed' || run.state.status === 'blocked') {
    add({
      severity: 'blocking',
      category: 'run',
      source: run.summary.runId,
      message: `Run status is ${run.state.status}.`,
      action: run.summary.currentTask ? `sdd do task ${run.summary.currentTask} --branch ${run.summary.partition ?? run.summary.gitBranch ?? 'master'}` : undefined,
      runId: run.summary.runId,
      taskId: run.summary.currentTask ?? undefined
    });
  }
  if (run.validation.status === 'fail' || run.validation.status === 'blocked') {
    add({
      severity: 'blocking',
      category: 'run',
      source: `${run.summary.runId}:validation`,
      message: `Run validation status is ${run.validation.status}.`,
      action: run.summary.currentTask ? `sdd test task ${run.summary.currentTask} --branch ${run.summary.partition ?? run.summary.gitBranch ?? 'master'}` : undefined,
      runId: run.summary.runId,
      taskId: run.summary.currentTask ?? undefined
    });
  }
  if (run.syncBack.status === 'proposed') {
    add({
      severity: 'warning',
      category: 'sync_back',
      source: `${run.summary.runId}:sync_back`,
      message: 'Run has an unapplied sync-back proposal.',
      action: run.summary.currentTask ? `sdd sync-back inspect --branch ${run.summary.partition ?? run.summary.gitBranch ?? 'master'} --task ${run.summary.currentTask}` : undefined,
      runId: run.summary.runId,
      taskId: run.summary.currentTask ?? undefined
    });
  }
}

function addEvidenceSummaryFindings(summary: RuntimeAnalysisEvidenceSummaryLike, add: (finding: RuntimeAnalysisFinding) => void): void {
  add({
    severity: 'info',
    category: 'evidence',
    source: `evidence:${summary.runId}`,
    message: 'Evidence summary is derived guidance only and cannot satisfy PASS evidence.',
    action: summary.taskId ? `sdd test task ${summary.taskId}` : undefined,
    runId: summary.runId,
    taskId: summary.taskId ?? undefined
  });
  if (summary.failCount > 0 || summary.blockedCount > 0) {
    add({
      severity: summary.failCount > 0 ? 'blocking' : 'warning',
      category: 'evidence',
      source: `evidence:${summary.runId}`,
      message: `Evidence projection has pass=${summary.passCount}, blocked=${summary.blockedCount}, fail=${summary.failCount}.`,
      action: summary.taskId ? `sdd test task ${summary.taskId}` : undefined,
      runId: summary.runId,
      taskId: summary.taskId ?? undefined
    });
  }
  if (summary.issueCodes.length > 0) {
    add({
      severity: 'warning',
      category: 'evidence',
      source: `evidence:${summary.runId}`,
      message: `Evidence quality issues: ${summary.issueCodes.join(', ')}.`,
      action: summary.taskId ? `sdd artifact validate ${summary.runId} <artifact> --task ${summary.taskId} --agent <agent>` : undefined,
      runId: summary.runId,
      taskId: summary.taskId ?? undefined
    });
  }
}

function addSyncBackFindings(syncBack: RuntimeAnalysisSyncBackLike, add: (finding: RuntimeAnalysisFinding) => void): void {
  if (syncBack.status === 'ready') {
    add({
      severity: 'warning',
      category: 'sync_back',
      source: syncBack.targetTasksPath,
      message: `Sync-back is ready for ${syncBack.taskId ?? 'unknown task'} but not applied.`,
      action: `sdd sync-back apply ${syncBack.runId} --branch ${syncBack.branch} --task ${syncBack.taskId ?? '<task_id>'}${syncBack.applyPolicy.requiresApproval ? ' --approved' : ''}`,
      runId: syncBack.runId,
      taskId: syncBack.taskId ?? undefined
    });
  } else if (syncBack.status === 'blocked') {
    add({
      severity: 'blocking',
      category: 'sync_back',
      source: syncBack.targetTasksPath,
      message: `Sync-back is blocked: ${syncBack.reasons.join('; ')}`,
      action: `sdd sync-back inspect ${syncBack.runId} --branch ${syncBack.branch} --task ${syncBack.taskId ?? '<task_id>'}`,
      runId: syncBack.runId,
      taskId: syncBack.taskId ?? undefined
    });
  }
}

export function summarizeRuntimeAnalysisStatus(findings: RuntimeAnalysisFinding[]): RuntimeAnalysisStatus {
  if (findings.some((finding) => finding.severity === 'blocking')) {
    return 'BLOCKED';
  }
  if (findings.some((finding) => finding.severity === 'warning')) {
    return 'WARN';
  }
  return 'PASS';
}
