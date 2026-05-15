import { readRunState, writeRunState } from '../run-state/run-state.js';
import type { DelegationRecord } from './model.js';

export async function persistDelegation(projectRoot: string, runId: string, delegation: DelegationRecord): Promise<void> {
  const state = await readRunState(projectRoot, runId);
  await writeRunState(projectRoot, {
    ...state,
    status: delegation.status === 'RUNNING' ? 'running' : state.status,
    delegations: {
      ...state.delegations,
      [delegation.delegationId]: delegation
    }
  });
}
