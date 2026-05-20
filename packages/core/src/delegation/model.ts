import { DELEGATION_LIVENESS_CONTRACT, DELEGATION_LIVENESS_VERSION } from '../contracts.js';
import type { DelegationStatus } from './state-machine.js';

export type { DelegationStatus } from './state-machine.js';
export type DelegationRunMode = 'foreground' | 'background';

export interface DelegationRecord {
  contract: typeof DELEGATION_LIVENESS_CONTRACT;
  version: typeof DELEGATION_LIVENESS_VERSION;
  delegationId: string;
  task: string;
  agent: string;
  runMode: DelegationRunMode;
  blocking: boolean;
  requiredForPhaseExit: boolean;
  status: DelegationStatus;
  startedAt: string;
  lastHeartbeatAt: string | null;
  timeoutSeconds: number;
  expectedArtifact: string;
  terminalEventRequired: boolean;
  terminalEventAt?: string | null;
}
