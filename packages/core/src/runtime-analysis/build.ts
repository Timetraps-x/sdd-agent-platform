import { buildContextBuildPackage } from '../context/build-package.js';
import { buildEvidenceSummaryProjection } from '../context/evidence-summary.js';
import { messageFromError } from '../contracts/issues.js';
import { doctor } from '../doctor/doctor.js';
import { inspectTaskGraph } from '../planning/task-graph.js';
import { inspectWavePlan } from '../planning/wave-plan.js';
import { inspectRun } from '../run-state/inspect-run.js';
import { inspectLocalRunIndex } from '../run-state/run-index.js';
import { getProjectStatus } from '../status/project-status.js';
import { inspectSyncBack } from '../sync-back/inspect.js';
import { createRuntimeAnalysisReport } from './findings.js';
import type { RuntimeAnalysisInputIssue, RuntimeAnalysisOptions, RuntimeAnalysisReport } from './model.js';

export async function buildRuntimeAnalysisReport(projectRoot: string, options: RuntimeAnalysisOptions = {}): Promise<RuntimeAnalysisReport> {
  const profile = options.profile ?? 'normal';
  const status = await getProjectStatus(projectRoot, { branch: options.branch ?? undefined });
  const branch = status.branch;
  const [doctorReport, runIndex, taskGraph, wavePlan] = await Promise.all([
    doctor(projectRoot, { latestOnly: true, branch }),
    inspectLocalRunIndex(projectRoot),
    inspectTaskGraph(projectRoot, { branch }),
    inspectWavePlan(projectRoot, { branch })
  ]);
  const selectedRunId = options.runId ?? status.latestRun?.runId ?? null;
  const selectedTaskId = options.taskId ?? status.latestRun?.currentTask ?? taskGraph.nodes.find((node) => node.status === 'pending')?.taskId ?? status.latestRunsByTask[0]?.taskId ?? null;
  const inputIssues: RuntimeAnalysisInputIssue[] = [];
  const runInspection = selectedRunId ? await runtimeAnalysisStep(inputIssues, 'run', () => inspectRun(projectRoot, selectedRunId), { runId: selectedRunId }) : null;
  const evidenceSummary = selectedRunId ? await runtimeAnalysisStep(inputIssues, 'evidence', () => buildEvidenceSummaryProjection(projectRoot, { runId: selectedRunId, taskId: selectedTaskId ?? undefined }), { runId: selectedRunId, taskId: selectedTaskId ?? undefined }) : null;
  const contextPackage = selectedTaskId ? await runtimeAnalysisStep(inputIssues, 'context', () => buildContextBuildPackage(projectRoot, { taskId: selectedTaskId, branch, mode: 'do', profile }), { taskId: selectedTaskId }) : null;
  const syncBack = selectedTaskId ? await runtimeAnalysisStep(inputIssues, 'sync_back', () => inspectSyncBack(projectRoot, { runId: selectedRunId ?? undefined, branch, taskId: selectedTaskId }), { runId: selectedRunId ?? undefined, taskId: selectedTaskId }) : null;

  return createRuntimeAnalysisReport({
    generatedAt: new Date().toISOString(),
    profile,
    branch,
    selectedRunId,
    selectedTaskId,
    status,
    doctor: doctorReport,
    runIndex,
    taskGraph,
    wavePlan,
    runInspection,
    evidenceSummary,
    contextPackage,
    syncBack,
    inputIssues
  });
}

async function runtimeAnalysisStep<T>(inputIssues: RuntimeAnalysisInputIssue[], source: RuntimeAnalysisInputIssue['source'], step: () => Promise<T>, context: { runId?: string; taskId?: string } = {}): Promise<T | null> {
  try {
    return await step();
  } catch (error) {
    inputIssues.push({
      source,
      message: messageFromError(error),
      runId: context.runId,
      taskId: context.taskId
    });
    return null;
  }
}
