import { createHash } from 'node:crypto';

import type { RuntimeProjectionEnvelope, RuntimeScope } from '../contracts.js';
import { readRuntimeProjectionEnvelope, recordRuntimeProjectionEnvelope, type RuntimeProjectionEnvelopeWriteResult } from '../storage/runtime-store.js';
import type { WorkUnit, WorkUnitStatus } from './contracts.js';

export const WORK_UNIT_RUNTIME_PRODUCER_VERSION = 'phase8-work-unit-runtime-v1';
export const WORK_UNIT_PROJECTION_TYPE = 'phase8_work_unit';

const WORK_UNIT_TRANSITIONS: Record<WorkUnitStatus, readonly WorkUnitStatus[]> = {
  pending: ['running', 'blocked', 'cancelled'],
  running: ['completed', 'blocked', 'failed', 'cancelled'],
  blocked: ['running', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: []
};

export interface WorkUnitValidationResult {
  valid: boolean;
  issues: string[];
}

export interface WorkUnitTransitionResult extends WorkUnitValidationResult {
  workUnit: WorkUnit;
}

export function canTransitionWorkUnit(from: WorkUnitStatus, to: WorkUnitStatus): boolean {
  return WORK_UNIT_TRANSITIONS[from].includes(to);
}

export function transitionWorkUnit(workUnit: WorkUnit, status: WorkUnitStatus, options: { completedAt?: string } = {}): WorkUnitTransitionResult {
  if (!canTransitionWorkUnit(workUnit.status, status)) {
    return {
      valid: false,
      issues: [`Illegal work unit transition ${workUnit.status} -> ${status} for ${workUnit.id}.`],
      workUnit
    };
  }
  const next: WorkUnit = {
    ...workUnit,
    status,
    completedAt: status === 'completed' || status === 'failed' || status === 'cancelled' ? options.completedAt ?? new Date().toISOString() : workUnit.completedAt
  };
  return { valid: validateWorkUnit(next).valid, issues: validateWorkUnit(next).issues, workUnit: next };
}

export function validateWorkUnit(workUnit: WorkUnit): WorkUnitValidationResult {
  const issues: string[] = [];
  if (workUnit.type === 'subagent' && workUnit.authority !== 'non-authoritative') {
    issues.push('Subagent work units must be non-authoritative.');
  }
  if (workUnit.authority === 'stage-owner' && workUnit.type !== 'main-agent') {
    issues.push('Only main-agent work units can own a lifecycle stage.');
  }
  if (!workUnit.blocking && workUnit.requiredBefore !== 'never') {
    issues.push('Non-blocking work units cannot declare a required-before gate.');
  }
  if (workUnit.blocking && workUnit.requiredBefore === 'never') {
    issues.push('Blocking work units must declare the gate they block.');
  }
  return { valid: issues.length === 0, issues };
}

export function workUnitBlocksGate(workUnit: WorkUnit, gate: WorkUnit['requiredBefore']): boolean {
  return workUnit.blocking && workUnit.requiredBefore === gate && workUnit.status !== 'completed';
}

export function workUnitScopeKey(scope: RuntimeScope, workUnitId: string): string {
  return [scope.branch, scope.taskId ?? 'all', scope.runId ?? 'none', scope.changeRef ?? 'none', workUnitId].join(':');
}

export async function recordWorkUnitProjection(projectRoot: string, workUnit: WorkUnit): Promise<RuntimeProjectionEnvelopeWriteResult<WorkUnit>> {
  return recordRuntimeProjectionEnvelope(projectRoot, {
    projectionType: WORK_UNIT_PROJECTION_TYPE,
    scopeKey: workUnitScopeKey(workUnit.scope, workUnit.id),
    inputHash: workUnitInputHash(workUnit),
    producer: 'phase8-work-unit-runtime',
    producerVersion: WORK_UNIT_RUNTIME_PRODUCER_VERSION,
    generatedAt: workUnit.completedAt ?? workUnit.createdAt,
    payload: workUnit
  });
}

export async function readWorkUnitProjection(projectRoot: string, scope: RuntimeScope, workUnitId: string): Promise<RuntimeProjectionEnvelope<WorkUnit> | null> {
  return readRuntimeProjectionEnvelope(projectRoot, WORK_UNIT_PROJECTION_TYPE, workUnitScopeKey(scope, workUnitId));
}

function workUnitInputHash(workUnit: WorkUnit): string {
  return stableHash(JSON.stringify({
    contract: workUnit.contract,
    id: workUnit.id,
    scope: workUnit.scope,
    stageRunId: workUnit.stageRunId,
    type: workUnit.type,
    name: workUnit.name,
    purpose: workUnit.purpose,
    status: workUnit.status,
    blocking: workUnit.blocking,
    authority: workUnit.authority,
    requiredBefore: workUnit.requiredBefore,
    contextRef: workUnit.contextRef,
    outputRefs: workUnit.outputRefs,
    evidenceRefs: workUnit.evidenceRefs,
    createdAt: workUnit.createdAt,
    completedAt: workUnit.completedAt ?? null
  }));
}

function stableHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
