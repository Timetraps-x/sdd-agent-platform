import type { RUNTIME_ANALYSIS_CONTRACT_VERSION } from '../contracts.js';

export type RuntimeAnalysisProfile = 'brief' | 'normal' | 'forensic';

export interface RuntimeAnalysisGapLike {
  severity: 'blocking' | 'warning';
  taskId: string | null;
  field: string;
  message: string;
  recommendation: string;
}

export interface RuntimeAnalysisWorkflowLike {
  workflowStatus: 'active' | 'not_started';
  recommendedNextCommand: string;
  gaps: RuntimeAnalysisGapLike[];
  tasks: { pending: number };
  latestRun: { runId: string; currentTask: string | null } | null;
  latestRunStaleReasons: string[];
  latestRunsByTask: Array<{ taskId: string; runId: string }>;
}

export interface RuntimeAnalysisDoctorLike {
  checks: Array<{ level: 'PASS' | 'WARN' | 'FAIL'; check: string; message: string; action?: string }>;
}

export interface RuntimeAnalysisRunIndexLike {
  valid: boolean;
  exists: boolean;
  indexPath: string;
  issues: Array<{ message: string; recommendation: string }>;
}

export interface RuntimeAnalysisTaskGraphLike {
  valid: boolean;
  nodes: Array<{ taskId: string; status: string }>;
  diagnostics: RuntimeAnalysisGapLike[];
}

export interface RuntimeAnalysisWavePlanLike {
  branch: string;
  blockedTasks: Array<{ taskId: string; reasons: string[] }>;
  manualGates: Array<{ taskId: string; reasons: string[] }>;
  summary: { tasks: number };
}

export interface RuntimeAnalysisRunInspectionLike {
  summary: { runId: string; currentTask: string | null; partition: string | null; gitBranch: string | null };
  state: { status: string };
  validation: { status: string };
  syncBack: { status: string };
}

export interface RuntimeAnalysisEvidenceSummaryLike {
  authoritative: false;
  usableForPass: false;
  runId: string;
  taskId: string | null;
  passCount: number;
  blockedCount: number;
  failCount: number;
  issueCodes: string[];
}

export interface RuntimeAnalysisContextPackageLike {
  authoritative: false;
  usableForPass: false;
  mode: string;
  taskId: string;
  warnings: string[];
  nextCommands: string[];
}

export interface RuntimeAnalysisSyncBackLike {
  runId: string;
  branch: string;
  taskId: string | null;
  status: 'ready' | 'blocked' | 'applied';
  reasons: string[];
  targetTasksPath: string;
  applyPolicy: { requiresApproval: boolean };
}

export type RuntimeAnalysisStatus = 'PASS' | 'WARN' | 'BLOCKED';
export type RuntimeAnalysisFindingSeverity = 'info' | 'warning' | 'blocking';
export type RuntimeAnalysisFindingCategory = 'workflow' | 'doctor' | 'run_index' | 'run' | 'evidence' | 'sync_back' | 'task_graph' | 'wave_plan' | 'context';

export interface RuntimeAnalysisOptions {
  branch?: string | null;
  runId?: string;
  taskId?: string;
  profile?: RuntimeAnalysisProfile;
}

export interface RuntimeAnalysisFinding {
  severity: RuntimeAnalysisFindingSeverity;
  category: RuntimeAnalysisFindingCategory;
  source: string;
  message: string;
  action?: string;
  runId?: string;
  taskId?: string;
}

export interface RuntimeAnalysisInputIssue {
  source: RuntimeAnalysisFindingCategory;
  message: string;
  action?: string;
  runId?: string;
  taskId?: string;
}

export interface RuntimeAnalysisReportInput {
  generatedAt: string;
  profile: RuntimeAnalysisProfile;
  branch: string;
  selectedRunId: string | null;
  selectedTaskId: string | null;
  status: RuntimeAnalysisWorkflowLike;
  doctor: RuntimeAnalysisDoctorLike;
  runIndex: RuntimeAnalysisRunIndexLike;
  taskGraph: RuntimeAnalysisTaskGraphLike;
  wavePlan: RuntimeAnalysisWavePlanLike;
  runInspection: RuntimeAnalysisRunInspectionLike | null;
  evidenceSummary: RuntimeAnalysisEvidenceSummaryLike | null;
  contextPackage: RuntimeAnalysisContextPackageLike | null;
  syncBack: RuntimeAnalysisSyncBackLike | null;
  inputIssues: RuntimeAnalysisInputIssue[];
}

export interface RuntimeAnalysisReport {
  contract: typeof RUNTIME_ANALYSIS_CONTRACT_VERSION;
  generatedAt: string;
  profile: RuntimeAnalysisProfile;
  authoritative: false;
  usableForPass: false;
  status: RuntimeAnalysisStatus;
  branch: string;
  selectedRunId: string | null;
  selectedTaskId: string | null;
  recommendedNextCommand: string;
  workflow: RuntimeAnalysisWorkflowLike;
  doctor: RuntimeAnalysisDoctorLike;
  runIndex: RuntimeAnalysisRunIndexLike;
  taskGraph: RuntimeAnalysisTaskGraphLike;
  wavePlan: RuntimeAnalysisWavePlanLike;
  runInspection: RuntimeAnalysisRunInspectionLike | null;
  evidenceSummary: RuntimeAnalysisEvidenceSummaryLike | null;
  contextPackage: RuntimeAnalysisContextPackageLike | null;
  syncBack: RuntimeAnalysisSyncBackLike | null;
  findings: RuntimeAnalysisFinding[];
}
