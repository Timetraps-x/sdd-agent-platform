import type { ModelProducedArtifact, RuntimeRef, RuntimeScope } from '../contracts.js';
import { SUBAGENT_DEFINITION_CONTRACT_VERSION, SUBAGENT_DISPATCH_CONTRACT_VERSION, SUBAGENT_RESULT_CONTRACT_VERSION } from '../contracts.js';

export type SubagentDispatchMode = 'foreground' | 'background';
export type SubagentDispatchStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'stale';
export type SubagentResultAuthority = 'non-authoritative' | 'evidence-candidate' | 'diagnostic-only';

export interface SubagentDefinition {
  contract: typeof SUBAGENT_DEFINITION_CONTRACT_VERSION;
  name: string;
  description: string;
  promptRef: RuntimeRef;
  allowedToolRefs: RuntimeRef[];
  canEditProduction: false;
  canOwnLifecycle: false;
  allowedWritePaths: string[];
  resultAuthority: SubagentResultAuthority;
}

export interface SubagentDispatch {
  contract: typeof SUBAGENT_DISPATCH_CONTRACT_VERSION;
  id: string;
  scope: RuntimeScope;
  workUnitId: string;
  definitionName: string;
  mode: SubagentDispatchMode;
  status: SubagentDispatchStatus;
  blocking: boolean;
  requiredBefore: 'handoff' | 'sync-back' | 'ship' | 'never';
  contextRef: RuntimeRef;
  createdAt: string;
  updatedAt: string;
}

export interface SubagentResult {
  contract: typeof SUBAGENT_RESULT_CONTRACT_VERSION;
  dispatchId: string;
  status: 'completed' | 'failed' | 'cancelled' | 'stale';
  authority: SubagentResultAuthority;
  summary: string;
  artifactRefs: RuntimeRef[];
  evidenceRefs: RuntimeRef[];
  modelArtifacts: ModelProducedArtifact[];
  completedAt: string;
}
