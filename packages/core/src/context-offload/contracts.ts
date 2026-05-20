import type { RuntimeConfidence, RuntimeRef, RuntimeScope } from '../contracts.js';
import { CONTEXT_LOAD_SIGNAL_CONTRACT_VERSION, CONTEXT_OFFLOAD_DECISION_CONTRACT_VERSION, SCOPED_CONTEXT_HANDOFF_CONTRACT_VERSION } from '../contracts.js';

export type ContextLoadLevel = 'normal' | 'elevated' | 'high' | 'overloaded';
export type ContextOffloadAction = 'inline' | 'summarize' | 'dispatch-subagent' | 'block-for-curation';

export interface ContextLoadSignal {
  contract: typeof CONTEXT_LOAD_SIGNAL_CONTRACT_VERSION;
  scope: RuntimeScope;
  level: ContextLoadLevel;
  score: number;
  fileCountScore: number;
  artifactSizeScore: number;
  dependencyFanoutScore: number;
  unknownImpactScore: number;
  staleEvidenceScore: number;
  logVolumeScore: number;
  confidence: RuntimeConfidence;
  inputRefs: RuntimeRef[];
  reasons: string[];
  generatedAt: string;
}

export interface ContextOffloadDecision {
  contract: typeof CONTEXT_OFFLOAD_DECISION_CONTRACT_VERSION;
  scope: RuntimeScope;
  action: ContextOffloadAction;
  loadSignalRef: RuntimeRef;
  requiredBefore: 'stage-output' | 'handoff' | 'sync-back' | 'ship' | 'never';
  inlineRefs: RuntimeRef[];
  summarizeRefs: RuntimeRef[];
  dispatchRefs: RuntimeRef[];
  blockingReasons: string[];
  generatedAt: string;
}

export interface ScopedContextHandoff {
  contract: typeof SCOPED_CONTEXT_HANDOFF_CONTRACT_VERSION;
  id: string;
  scope: RuntimeScope;
  purpose: string;
  mustReadRefs: RuntimeRef[];
  summaryRefs: RuntimeRef[];
  doNotReadUnlessNeededRefs: RuntimeRef[];
  producedFor: 'main-agent' | 'co-main-agent' | 'subagent';
  generatedAt: string;
}
