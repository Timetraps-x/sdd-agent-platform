import type { RuntimeRef, RuntimeScope } from '../contracts.js';
import { WORK_UNIT_CONTRACT_VERSION } from '../contracts.js';

export type WorkUnitType = 'main-agent' | 'co-main-agent' | 'subagent';
export type WorkUnitStatus = 'pending' | 'running' | 'completed' | 'blocked' | 'failed' | 'cancelled';
export type WorkUnitAuthority = 'stage-owner' | 'stage-contributor' | 'non-authoritative';
export type WorkUnitRequiredBefore = 'stage-output' | 'handoff' | 'sync-back' | 'ship' | 'never';

export interface WorkUnit {
  contract: typeof WORK_UNIT_CONTRACT_VERSION;
  id: string;
  scope: RuntimeScope;
  stageRunId: string;
  type: WorkUnitType;
  name: string;
  purpose: string;
  status: WorkUnitStatus;
  blocking: boolean;
  authority: WorkUnitAuthority;
  requiredBefore: WorkUnitRequiredBefore;
  contextRef: RuntimeRef;
  outputRefs: RuntimeRef[];
  evidenceRefs: RuntimeRef[];
  createdAt: string;
  completedAt?: string;
}
