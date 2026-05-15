import { inspectAiToolEntryEvidence } from './checks/ai-entries.js';
import { inspectDocumentChainEvidence } from './checks/document-chain.js';
import { inspectLocalRunIndexEvidence } from './checks/local-run-index.js';
import { inspectGitRepository, inspectProjectConfig, inspectRunsDirectoryAccess, inspectSpecsDirectory } from './checks/project.js';
import { inspectRunEvidence } from './checks/run-evidence.js';
import { inspectAgentSkillTeamRuntimeDoctorContract, inspectCapabilityRegistry, inspectGovernancePolicyContract, inspectHarnessLearningDoctorContract, inspectProjectContextPackDoctorContract, inspectQueryStatusBoundaryContract, inspectSkillAgentEvalDoctorContract, inspectToolPluginContracts } from './checks/registries.js';
import { inspectBackgroundExecutorContract, inspectDelegationQueueContract, inspectDelegationStateMachineContract, inspectLocalRunIndexContract, inspectTaskGraphPlannerContract, inspectWaveExecutorContract, inspectWavePlannerContract, inspectWorkerAdapterContracts, inspectWorktreeIsolationContract, inspectWorktreeLifecycleContract } from './checks/runtime-contracts.js';
import { inspectRuntimeStoreEvidence } from '../storage/runtime-store.js';
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
  checks.push(...await inspectSkillAgentEvalDoctorContract(projectRoot));
  checks.push(...await inspectHarnessLearningDoctorContract(projectRoot));
  checks.push(...await inspectProjectContextPackDoctorContract(projectRoot));

  return {
    status: summarizeDoctorStatus(checks),
    checks
  };
}
