import type { RuntimeRef, RuntimeScope, SddStage } from '../contracts.js';
import { STAGE_RUN_CONTRACT_VERSION, WORKFLOW_HANDOFF_CONTRACT_VERSION } from '../contracts.js';

export type StageRunStatus = 'pending' | 'active' | 'completed' | 'blocked' | 'skipped' | 'failed';
export type WorkflowHandoffStatus = 'proposed' | 'accepted' | 'rejected' | 'blocked';

export interface StageRun {
  contract: typeof STAGE_RUN_CONTRACT_VERSION;
  id: string;
  scope: RuntimeScope;
  stage: SddStage;
  ownerAgent: string;
  coMainAgents: string[];
  status: StageRunStatus;
  inputRefs: RuntimeRef[];
  outputRefs: RuntimeRef[];
  decisionRefs: RuntimeRef[];
  blockingReasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowHandoff {
  contract: typeof WORKFLOW_HANDOFF_CONTRACT_VERSION;
  id: string;
  scope: RuntimeScope;
  fromStage: SddStage;
  toStage: SddStage;
  fromAgent: string;
  toAgent: string;
  status: WorkflowHandoffStatus;
  outputRefs: RuntimeRef[];
  requiredInputRefs: RuntimeRef[];
  riskDecisionRef: RuntimeRef;
  evidenceRefs: RuntimeRef[];
  openQuestions: string[];
  blockingGaps: string[];
  createdAt: string;
  decidedAt?: string;
}
