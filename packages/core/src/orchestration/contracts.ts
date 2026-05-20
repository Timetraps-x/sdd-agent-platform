import type { RuntimeRef, RuntimeScope, SddStage } from '../contracts.js';
import type { ContextLoadSignal, ContextOffloadDecision } from '../context-offload/contracts.js';
import type { LifecycleRiskDecision } from '../risk/contracts.js';
import type { StageRun, WorkflowHandoff } from '../stage-runtime/contracts.js';
import type { SubagentDispatch, SubagentResult } from '../subagents/contracts.js';
import type { WorkUnit } from '../work-units/contracts.js';

export type OrchestrationGateStatus = 'PASS' | 'WARN' | 'BLOCKED';
export type OrchestrationGateTarget = 'route' | 'execution' | 'handoff' | 'sync-back' | 'ship' | 'test';

export interface OrchestrationGate {
  status: OrchestrationGateStatus;
  target: OrchestrationGateTarget;
  scope: RuntimeScope;
  blockingReasons: string[];
  warnings: string[];
  nextAction: string | null;
  riskDecision: LifecycleRiskDecision | null;
  stageRun: StageRun | null;
  handoff: WorkflowHandoff | null;
  contextLoadSignal: ContextLoadSignal | null;
  contextOffloadDecision: ContextOffloadDecision | null;
  blockingWorkUnits: WorkUnit[];
  blockingSubagentDispatches: SubagentDispatch[];
  subagentResults: SubagentResult[];
}

export interface EnsureTaskOrchestrationInput {
  branch: string;
  taskId: string;
  runId?: string;
  agent?: string;
  stage?: SddStage;
  status?: StageRun['status'];
  outputRefs?: RuntimeRef[];
  evidenceRefs?: RuntimeRef[];
}

export interface EnsureExecutionOrchestrationInput extends EnsureTaskOrchestrationInput {
  workerKind?: string | null;
  delegationId?: string;
  expectedArtifact?: string;
  dispatchBlocking?: boolean;
}

export interface CompleteExecutionOrchestrationInput extends EnsureExecutionOrchestrationInput {
  artifactPath: string | null;
  resultStatus: string | null;
  completed: boolean;
}
