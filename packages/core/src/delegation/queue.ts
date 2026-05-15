import { readFile } from 'node:fs/promises';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';
import { readAllRunStates, readRunState } from '../run-state/run-state.js';
import type { DelegationQueueItem } from '../run-state/run-index.js';
import type { RunState, RunStateDelegationRecord } from '../run-state/model.js';

export const DELEGATION_QUEUE_CONTRACT_VERSION = 'phase-3.3-delegation-queue-contract-v1';

export interface DelegationQueueSnapshot {
  version: string;
  items: DelegationQueueItem[];
}

export async function listDelegationQueueItems(projectRoot: string, options: { runId?: string } = {}): Promise<DelegationQueueSnapshot> {
  await assertProjectConfigReadable(projectRoot);
  const states = options.runId
    ? [await readRunState(projectRoot, options.runId)]
    : await readAllRunStates(projectRoot);
  const items = states
    .filter((state) => state.status !== 'archived')
    .flatMap((state) => Object.values(state.delegations).map((delegation) => delegationQueueItemFromRunState(state, delegation)))
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    version: DELEGATION_QUEUE_CONTRACT_VERSION,
    items
  };
}

export async function inspectDelegationQueueItem(projectRoot: string, queueItemId: string): Promise<DelegationQueueItem | null> {
  const snapshot = await listDelegationQueueItems(projectRoot);
  return snapshot.items.find((item) => item.id === queueItemId) ?? null;
}

function delegationQueueItemFromRunState(state: RunState, delegation: RunStateDelegationRecord): DelegationQueueItem {
  return {
    id: `${state.runId}:${delegation.delegationId}`,
    runId: state.runId,
    delegationId: delegation.delegationId,
    taskId: delegation.task,
    agent: delegation.agent,
    requestedCapabilityId: 'sdd-cli',
    dedupeKey: `${state.runId}:${delegation.task}:${delegation.agent}`,
    status: delegation.status,
    statusSource: 'run_state_delegation',
    runMode: delegation.runMode,
    expectedArtifact: delegation.expectedArtifact,
    requiredEvidence: [delegation.expectedArtifact, state.eventLogPath],
    createdAt: delegation.startedAt,
    updatedAt: delegation.terminalEventAt ?? delegation.lastHeartbeatAt ?? state.updatedAt
  };
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
