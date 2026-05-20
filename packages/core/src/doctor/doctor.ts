import { inspectAiToolEntryEvidence } from './checks/ai-entries.js';
import { inspectDocumentChainEvidence } from './checks/document-chain.js';
import { inspectLocalRunIndexEvidence } from './checks/local-run-index.js';
import { inspectGitRepository, inspectProjectConfig, inspectRunsDirectoryAccess, inspectSpecsDirectory } from './checks/project.js';
import { inspectRunEvidence } from './checks/run-evidence.js';
import { inspectAgentCapabilityCatalogDoctorContract, inspectAgentSkillTeamRuntimeDoctorContract, inspectCapabilityRegistry, inspectCommandTeamRuntimeDoctorContract, inspectGovernancePolicyContract, inspectHarnessLearningDoctorContract, inspectProjectContextPackDoctorContract, inspectQueryStatusBoundaryContract, inspectSkillAgentEvalDoctorContract, inspectToolPluginContracts } from './checks/registries.js';
import { inspectBackgroundExecutorContract, inspectDelegationQueueContract, inspectDelegationStateMachineContract, inspectLocalRunIndexContract, inspectTaskGraphPlannerContract, inspectWaveExecutorContract, inspectWavePlannerContract, inspectWorkerAdapterContracts, inspectWorktreeIsolationContract, inspectWorktreeLifecycleContract } from './checks/runtime-contracts.js';
import { inspectRuntimeStoreEvidence } from '../storage/runtime-store.js';
import { getProjectStatus, statuslineProjectionFromStatus, type ProjectStatus } from '../status/project-status.js';
import type { DoctorCheck, DoctorReport } from './model.js';
import { summarizeDoctorStatus } from './summary.js';


export async function doctor(projectRoot: string, options: { allRuns?: boolean; latestOnly?: boolean; branch?: string | null } = {}): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  checks.push(...await inspectGitRepository(projectRoot));

  const projectConfigInspection = await inspectProjectConfig(projectRoot);
  checks.push(...projectConfigInspection.checks);

  checks.push(...await inspectRuntimeStoreEvidence(projectRoot));
  const runsDirectoryInspection = await inspectRunsDirectoryAccess(projectRoot);
  checks.push(...runsDirectoryInspection.checks);
  if (runsDirectoryInspection.available) {
    checks.push(...await inspectRunEvidence(projectRoot, options));
    checks.push(...await inspectLocalRunIndexEvidence(projectRoot));
  }

  checks.push(...await inspectSpecsDirectory(projectRoot));

  checks.push(...await inspectDocumentChainEvidence(projectRoot, options.branch ?? undefined));
  if (projectConfigInspection.exists) {
    checks.push(...await inspectAiToolEntryEvidence(projectRoot));
  }
  checks.push(...await inspectCapabilityRegistry(projectRoot));
  checks.push(...await inspectToolPluginContracts(projectRoot));
  checks.push(...await inspectDelegationQueueContract(projectRoot));
  checks.push(...await inspectDelegationStateMachineContract(projectRoot));
  checks.push(...await inspectWorkerAdapterContracts(projectRoot));
  checks.push(...await inspectWorktreeIsolationContract(projectRoot));
  checks.push(...await inspectWorktreeLifecycleContract(projectRoot));
  checks.push(...await inspectTaskGraphPlannerContract(projectRoot));
  checks.push(...await inspectWavePlannerContract(projectRoot));
  checks.push(...await inspectBackgroundExecutorContract(projectRoot));
  checks.push(...await inspectWaveExecutorContract(projectRoot));
  checks.push(...await inspectLocalRunIndexContract(projectRoot));
  checks.push(...await inspectGovernancePolicyContract(projectRoot));
  checks.push(...await inspectQueryStatusBoundaryContract(projectRoot));
  checks.push(...await inspectAgentSkillTeamRuntimeDoctorContract(projectRoot));
  checks.push(...await inspectAgentCapabilityCatalogDoctorContract(projectRoot));
  checks.push(...await inspectCommandTeamRuntimeDoctorContract(projectRoot));
  checks.push(...await inspectSkillAgentEvalDoctorContract(projectRoot));
  checks.push(...await inspectHarnessLearningDoctorContract(projectRoot));
  checks.push(...await inspectProjectContextPackDoctorContract(projectRoot));
  const statusSnapshot = await readDoctorProjectStatus(projectRoot, options.branch ?? undefined);
  checks.push(...inspectContextTokenRuntime(statusSnapshot));
  checks.push(...inspectLifecycleRiskRuntime(statusSnapshot));
  checks.push(...inspectWorkflowHandoffRuntime(statusSnapshot));
  checks.push(...inspectContextOffloadRuntime(statusSnapshot));
  checks.push(...inspectSubagentDispatchRuntime(statusSnapshot));

  return {
    status: summarizeDoctorStatus(checks),
    checks
  };
}

interface DoctorProjectStatusSnapshot {
  status: ProjectStatus | null;
  error: unknown | null;
}

async function readDoctorProjectStatus(projectRoot: string, branch?: string | null): Promise<DoctorProjectStatusSnapshot> {
  try {
    return {
      status: await getProjectStatus(projectRoot, { branch, branchSource: branch ? 'cli_option' : undefined }),
      error: null
    };
  } catch (error) {
    return { status: null, error };
  }
}

function unavailableRuntimeCheck(check: string, label: string, error: unknown): DoctorCheck[] {
  return [{
    level: 'WARN',
    check,
    message: `${label} unavailable: ${error instanceof Error ? error.message : String(error)}`,
    action: 'Resolve SDD branch context, then rerun sdd doctor.'
  }];
}

function inspectContextTokenRuntime(snapshot: DoctorProjectStatusSnapshot): DoctorCheck[] {
  if (!snapshot.status) {
    return unavailableRuntimeCheck('context_token_runtime', 'token runtime projection', snapshot.error);
  }
  const statusline = statuslineProjectionFromStatus(snapshot.status);
  return [{
    level: statusline.tokenHealth === 'pressure' ? 'WARN' : 'PASS',
    check: 'context_token_runtime',
    message: `token_health=${statusline.tokenHealth} context_risk_tasks=${statusline.taskRisk.contextRiskTasks.length} token_risk_tasks=${statusline.taskRisk.tokenRiskTasks.length}`,
    action: statusline.tokenHealth === 'pressure' ? `Run sdd context build --task <task_id> --branch ${statusline.branch} --mode doctor --profile brief and defer optional material.` : undefined
  }];
}

function inspectLifecycleRiskRuntime(snapshot: DoctorProjectStatusSnapshot): DoctorCheck[] {
  if (!snapshot.status) {
    return unavailableRuntimeCheck('lifecycle_risk_decision', 'lifecycle risk decision', snapshot.error);
  }
  const risk = snapshot.status.lifecycleRisk;
  return [{
    level: risk.status === 'blocked' || risk.status === 'incompatible' || risk.approvalPolicy === 'blocked' ? 'FAIL' : risk.status === 'missing' || risk.status === 'stale' || risk.approvalPolicy === 'human-required' ? 'WARN' : 'PASS',
    check: 'lifecycle_risk_decision',
    message: `status=${risk.status} profile=${risk.profile ?? 'none'} approval=${risk.approvalPolicy ?? 'none'} input=${risk.inputHash ?? 'none'} expected=${risk.expectedInputHash}`,
    action: risk.status === 'fresh' ? undefined : `Run lifecycle risk projection for ${risk.scopeKey}; workflow gates now consume this decision directly.`
  }];
}

function inspectWorkflowHandoffRuntime(snapshot: DoctorProjectStatusSnapshot): DoctorCheck[] {
  if (!snapshot.status) {
    return unavailableRuntimeCheck('workflow_handoff_state', 'workflow handoff state', snapshot.error);
  }
  const handoff = snapshot.status.workflowHandoff;
  return [{
    level: handoff.status === 'blocked' || handoff.status === 'rejected' || handoff.status === 'incompatible' ? 'FAIL' : handoff.status === 'stale' ? 'WARN' : 'PASS',
    check: 'workflow_handoff_state',
    message: `status=${handoff.status} active_stage=${handoff.activeStage?.stage ?? 'none'} latest_stage=${handoff.latestStageRun?.stage ?? 'none'} latest_handoff=${handoff.latestHandoff ? `${handoff.latestHandoff.fromStage}->${handoff.latestHandoff.toStage}:${handoff.latestHandoff.status}` : 'none'} stage_projections=${handoff.projectionCounts.stageRuns} handoff_projections=${handoff.projectionCounts.handoffs}`,
    action: handoff.status === 'fresh' || handoff.status === 'missing' ? undefined : `Resolve workflow handoff projection for ${snapshot.status.branch}; workflow gates now consume this state directly.`
  }];
}

function inspectContextOffloadRuntime(snapshot: DoctorProjectStatusSnapshot): DoctorCheck[] {
  if (!snapshot.status) {
    return unavailableRuntimeCheck('context_offload_state', 'context offload state', snapshot.error);
  }
  const context = snapshot.status.contextRuntime;
  return [{
    level: context.action === 'block-for-curation' ? 'FAIL' : 'PASS',
    check: 'context_offload_state',
    message: `level=${context.level} action=${context.action} load_signals=${context.loadSignals} offload_decisions=${context.offloadDecisions} dispatch_refs=${context.dispatchRefs}`,
    action: context.action === 'block-for-curation' ? `Curate scoped context before stage output for ${snapshot.status.branch}.` : undefined
  }];
}

function inspectSubagentDispatchRuntime(snapshot: DoctorProjectStatusSnapshot): DoctorCheck[] {
  if (!snapshot.status) {
    return unavailableRuntimeCheck('subagent_dispatch_state', 'subagent dispatch state', snapshot.error);
  }
  const dispatches = snapshot.status.subagentDispatches;
  return [{
    level: dispatches.status === 'blocked' || dispatches.status === 'failed' || dispatches.status === 'stale' || dispatches.status === 'incompatible' ? 'FAIL' : 'PASS',
    check: 'subagent_dispatch_state',
    message: `status=${dispatches.status} dispatches=${dispatches.dispatches} blocking_open=${dispatches.blockingOpen} failed=${dispatches.failed} stale=${dispatches.stale} completed=${dispatches.completed} archived=${dispatches.archived} superseded=${dispatches.superseded}`,
    action: dispatches.status === 'fresh' || dispatches.status === 'missing' ? undefined : dispatches.reasons.join(' ')
  }];
}