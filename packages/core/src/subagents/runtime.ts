import { createHash } from 'node:crypto';
import path from 'node:path';

import type { RuntimeProjectionEnvelope, RuntimeRef, RuntimeScope } from '../contracts.js';
import { listRuntimeProjections, readRuntimeProjectionEnvelope, recordRuntimeProjectionEnvelope, runtimeProjectionStaleness, type RuntimeProjectionEnvelopeWriteResult } from '../storage/runtime-store.js';
import { readAllRunStates } from '../run-state/run-state.js';
import type { SubagentDefinition, SubagentDispatch, SubagentResult } from './contracts.js';

export const SUBAGENT_RUNTIME_PRODUCER_VERSION = 'phase8-subagent-runtime-v1';
export const SUBAGENT_DEFINITION_PROJECTION_TYPE = 'phase8_subagent_definition';
export const SUBAGENT_DISPATCH_PROJECTION_TYPE = 'phase8_subagent_dispatch';
export const SUBAGENT_RESULT_PROJECTION_TYPE = 'phase8_subagent_result';

export type SubagentDispatchDiagnosticStatus = 'missing' | 'fresh' | 'blocked' | 'failed' | 'stale' | 'incompatible';

export interface SubagentPolicyResult {
  allowed: boolean;
  issues: string[];
}

export interface SubagentDispatchDiagnostic {
  status: SubagentDispatchDiagnosticStatus;
  branch: string;
  dispatches: number;
  blockingOpen: number;
  failed: number;
  stale: number;
  completed: number;
  archived: number;
  superseded: number;
  reasons: string[];
}

export function validateSubagentDefinition(definition: SubagentDefinition): SubagentPolicyResult {
  const unsafe = definition as SubagentDefinition & { canEditProduction?: boolean; canOwnLifecycle?: boolean };
  const issues: string[] = [];
  if (unsafe.canEditProduction !== false) {
    issues.push(`Subagent ${definition.name} cannot receive production edit authority.`);
  }
  if (unsafe.canOwnLifecycle !== false) {
    issues.push(`Subagent ${definition.name} cannot own lifecycle control.`);
  }
  if (definition.resultAuthority !== 'non-authoritative' && definition.resultAuthority !== 'diagnostic-only' && definition.resultAuthority !== 'evidence-candidate') {
    issues.push(`Subagent ${definition.name} has unknown result authority ${definition.resultAuthority}.`);
  }
  for (const pattern of definition.allowedWritePaths) {
    const normalizedPattern = normalizeSubagentRelativePath(pattern);
    if (!normalizedPattern) {
      issues.push(`Subagent ${definition.name} has invalid allowed write path ${pattern}.`);
    } else if (unsafeAllowedWritePattern(normalizedPattern)) {
      issues.push(`Subagent ${definition.name} cannot receive broad production/source write path ${pattern}.`);
    } else if (!safeAllowedWritePattern(normalizedPattern)) {
      issues.push(`Subagent ${definition.name} cannot receive unsupported write path ${pattern}.`);
    }
  }
  return { allowed: issues.length === 0, issues };
}

export function validateSubagentWrite(definition: SubagentDefinition, relativePath: string): SubagentPolicyResult {
  const base = validateSubagentDefinition(definition);
  const normalized = normalizeSubagentRelativePath(relativePath);
  const allowedByPath = normalized !== null && definition.allowedWritePaths.some((pattern) => matchesWritePattern(normalized, pattern));
  const issues = [...base.issues];
  if (!allowedByPath) {
    issues.push(`Subagent ${definition.name} cannot write ${relativePath}; allowed paths: ${definition.allowedWritePaths.join(', ') || 'none'}.`);
  }
  return { allowed: issues.length === 0, issues };
}

export function consumeSubagentResult(result: SubagentResult): { authority: SubagentResult['authority']; summary: string; artifactRefs: RuntimeRef[]; evidenceRefs: RuntimeRef[]; authoritative: false } {
  return {
    authority: result.authority,
    summary: result.summary,
    artifactRefs: result.artifactRefs,
    evidenceRefs: result.evidenceRefs,
    authoritative: false
  };
}

export function subagentDispatchBlocksGate(dispatch: SubagentDispatch, result: SubagentResult | null): boolean {
  if (!dispatch.blocking || dispatch.requiredBefore === 'never') {
    return false;
  }
  if (!result) {
    return dispatch.status !== 'completed';
  }
  return result.status !== 'completed';
}

export function subagentDefinitionScopeKey(name: string): string {
  return name;
}

export function subagentDispatchScopeKey(scope: RuntimeScope, dispatchId: string): string {
  return [scope.branch, scope.taskId ?? 'all', scope.runId ?? 'none', scope.changeRef ?? 'none', dispatchId].join(':');
}

export function subagentResultScopeKey(dispatchId: string): string {
  return dispatchId;
}

export async function recordSubagentDefinitionProjection(projectRoot: string, definition: SubagentDefinition): Promise<RuntimeProjectionEnvelopeWriteResult<SubagentDefinition>> {
  const policy = validateSubagentDefinition(definition);
  if (!policy.allowed) {
    throw new Error(`Unsafe subagent definition ${definition.name}: ${policy.issues.join(' ')}`);
  }
  return recordRuntimeProjectionEnvelope(projectRoot, {
    projectionType: SUBAGENT_DEFINITION_PROJECTION_TYPE,
    scopeKey: subagentDefinitionScopeKey(definition.name),
    inputHash: stableHash(JSON.stringify(definition)),
    producer: 'phase8-subagent-runtime',
    producerVersion: SUBAGENT_RUNTIME_PRODUCER_VERSION,
    payload: definition
  });
}

export async function recordSubagentDispatchProjection(projectRoot: string, dispatch: SubagentDispatch): Promise<RuntimeProjectionEnvelopeWriteResult<SubagentDispatch>> {
  return recordRuntimeProjectionEnvelope(projectRoot, {
    projectionType: SUBAGENT_DISPATCH_PROJECTION_TYPE,
    scopeKey: subagentDispatchScopeKey(dispatch.scope, dispatch.id),
    inputHash: stableHash(JSON.stringify(dispatch)),
    producer: 'phase8-subagent-runtime',
    producerVersion: SUBAGENT_RUNTIME_PRODUCER_VERSION,
    generatedAt: dispatch.updatedAt,
    payload: dispatch
  });
}

export async function readSubagentDispatchProjection(projectRoot: string, scope: RuntimeScope, dispatchId: string): Promise<RuntimeProjectionEnvelope<SubagentDispatch> | null> {
  return readRuntimeProjectionEnvelope(projectRoot, SUBAGENT_DISPATCH_PROJECTION_TYPE, subagentDispatchScopeKey(scope, dispatchId));
}

export async function recordSubagentResultProjection(projectRoot: string, result: SubagentResult): Promise<RuntimeProjectionEnvelopeWriteResult<SubagentResult>> {
  return recordRuntimeProjectionEnvelope(projectRoot, {
    projectionType: SUBAGENT_RESULT_PROJECTION_TYPE,
    scopeKey: subagentResultScopeKey(result.dispatchId),
    inputHash: stableHash(JSON.stringify(result)),
    producer: 'phase8-subagent-runtime',
    producerVersion: SUBAGENT_RUNTIME_PRODUCER_VERSION,
    generatedAt: result.completedAt,
    payload: result
  });
}

export async function readSubagentResultProjection(projectRoot: string, dispatchId: string): Promise<RuntimeProjectionEnvelope<SubagentResult> | null> {
  return readRuntimeProjectionEnvelope(projectRoot, SUBAGENT_RESULT_PROJECTION_TYPE, subagentResultScopeKey(dispatchId));
}

export async function inspectSubagentDispatches(projectRoot: string, branch: string): Promise<SubagentDispatchDiagnostic> {
  const projections = await listRuntimeProjections(projectRoot, [SUBAGENT_DISPATCH_PROJECTION_TYPE, SUBAGENT_RESULT_PROJECTION_TYPE]);
  const resultEnvelopes = projections
    .filter((projection) => projection.projectionType === SUBAGENT_RESULT_PROJECTION_TYPE)
    .map((projection) => projection.payload as RuntimeProjectionEnvelope<SubagentResult>);
  const resultByDispatch = new Map(resultEnvelopes.map((envelope) => [envelope.payload.dispatchId, envelope.payload]));
  const archivedRunIds = new Set((await readAllRunStates(projectRoot))
    .filter((state) => state.status === 'archived')
    .map((state) => state.runId));
  const branchDispatchEnvelopes = projections
    .filter((projection) => projection.projectionType === SUBAGENT_DISPATCH_PROJECTION_TYPE)
    .map((projection) => projection.payload as RuntimeProjectionEnvelope<SubagentDispatch>)
    .filter((envelope) => envelope?.payload?.scope?.branch === branch);
  const archived = branchDispatchEnvelopes.filter((envelope) => dispatchBelongsToArchivedRun(envelope.payload, archivedRunIds)).length;
  const activeDispatches = suppressSupersededDispatches(branchDispatchEnvelopes
    .filter((envelope) => !dispatchBelongsToArchivedRun(envelope.payload, archivedRunIds)), resultByDispatch);
  const dispatchEnvelopes = activeDispatches.envelopes;
  const incompatible = dispatchEnvelopes.some((envelope) => runtimeProjectionStaleness(envelope, { inputHash: stableHash(JSON.stringify(envelope.payload)), producerVersion: SUBAGENT_RUNTIME_PRODUCER_VERSION }) === 'incompatible');
  const stale = dispatchEnvelopes.filter((envelope) => envelope.payload.status === 'stale').length;
  const failed = dispatchEnvelopes.filter((envelope) => envelope.payload.status === 'failed' || resultByDispatch.get(envelope.payload.id)?.status === 'failed').length;
  const blockingOpen = dispatchEnvelopes.filter((envelope) => subagentDispatchBlocksGate(envelope.payload, resultByDispatch.get(envelope.payload.id) ?? null)).length;
  const completed = dispatchEnvelopes.filter((envelope) => envelope.payload.status === 'completed' && resultByDispatch.get(envelope.payload.id)?.status === 'completed').length;
  const status: SubagentDispatchDiagnosticStatus = dispatchEnvelopes.length === 0
    ? 'missing'
    : incompatible
      ? 'incompatible'
      : stale > 0
        ? 'stale'
        : failed > 0
          ? 'failed'
          : blockingOpen > 0
            ? 'blocked'
            : 'fresh';
  return {
    status,
    branch,
    dispatches: dispatchEnvelopes.length,
    blockingOpen,
    failed,
    stale,
    completed,
    archived,
    superseded: activeDispatches.superseded,
    reasons: subagentDispatchReasons(status, blockingOpen, failed, stale, archived, activeDispatches.superseded)
  };
}

function dispatchBelongsToArchivedRun(dispatch: SubagentDispatch, archivedRunIds: Set<string>): boolean {
  return typeof dispatch.scope.runId === 'string' && archivedRunIds.has(dispatch.scope.runId);
}

function suppressSupersededDispatches(dispatchEnvelopes: RuntimeProjectionEnvelope<SubagentDispatch>[], resultByDispatch: Map<string, SubagentResult>): { envelopes: RuntimeProjectionEnvelope<SubagentDispatch>[]; superseded: number } {
  const successfulByKey = new Map<string, SubagentDispatch>();
  const active: RuntimeProjectionEnvelope<SubagentDispatch>[] = [];
  let superseded = 0;
  for (const envelope of [...dispatchEnvelopes].sort((left, right) => timestamp(right.payload.updatedAt) - timestamp(left.payload.updatedAt))) {
    const key = dispatchSupersedeKey(envelope.payload);
    const successful = successfulByKey.get(key);
    if (successful && timestamp(successful.updatedAt) >= timestamp(envelope.payload.updatedAt)) {
      superseded += 1;
      continue;
    }
    active.push(envelope);
    if (dispatchCompleted(envelope.payload, resultByDispatch.get(envelope.payload.id) ?? null)) {
      successfulByKey.set(key, envelope.payload);
    }
  }
  return { envelopes: active, superseded };
}

function dispatchCompleted(dispatch: SubagentDispatch, result: SubagentResult | null): boolean {
  return dispatch.status === 'completed' && (!result || result.status === 'completed');
}

function dispatchSupersedeKey(dispatch: SubagentDispatch): string {
  return [dispatch.scope.branch, dispatch.scope.taskId ?? 'all', dispatch.definitionName, dispatch.requiredBefore, dispatch.contextRef.ref].join(':');
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function subagentDispatchReasons(status: SubagentDispatchDiagnosticStatus, blockingOpen: number, failed: number, stale: number, archived: number, superseded: number): string[] {
  const recoveryHint = 'Archive failed exploratory runs with sdd run archive <run_id> --reason <text>, or rerun the subagent worker to supersede the failed dispatch; subagent evidence still cannot approve high-risk execution, sync-back, or ship.';
  if (status === 'missing') {
    return archived > 0 || superseded > 0
      ? [`No active subagent dispatch projections block the main workflow; ignored archived=${archived} superseded=${superseded}. Main workflow still owns lifecycle gates, approvals, sync-back, and ship.`]
      : ['No subagent dispatch projections recorded; main workflow remains unblocked and still owns lifecycle gates, approvals, sync-back, and ship.'];
  }
  if (status === 'blocked') {
    return [`${blockingOpen} blocking subagent dispatch(es) are incomplete. Complete, rerun, or archive stale exploratory runs before doctor/ship; do not use partial subagent evidence as approval.`];
  }
  if (status === 'failed') {
    return [`${failed} active subagent dispatch(es) failed. ${recoveryHint}`];
  }
  if (status === 'stale') {
    return [`${stale} subagent dispatch(es) are stale. ${recoveryHint}`];
  }
  if (status === 'incompatible') {
    return [`Subagent dispatch projection producer is incompatible with ${SUBAGENT_RUNTIME_PRODUCER_VERSION}; refresh the subagent projection before relying on its diagnostic evidence.`];
  }
  return archived > 0 || superseded > 0
    ? [`Subagent dispatch projections are fresh and non-authoritative; ignored archived=${archived} superseded=${superseded}. Main workflow still owns approvals, sync-back, and ship.`]
    : ['Subagent dispatch projections are fresh and non-authoritative; main workflow still owns approvals, sync-back, and ship.'];
}

function normalizeSubagentRelativePath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.length === 0 || /^[A-Za-z]:/.test(normalized)) {
    return null;
  }
  const resolved = path.posix.normalize(normalized).replace(/^\.\//, '');
  if (resolved === '' || resolved === '.' || resolved === '..' || resolved.startsWith('../') || path.posix.isAbsolute(resolved)) {
    return null;
  }
  return resolved;
}

function unsafeAllowedWritePattern(pattern: string): boolean {
  if (safeAllowedWritePattern(pattern)) {
    return false;
  }
  return pattern === 'packages/*/src/**'
    || pattern === 'packages/**/src/**'
    || /^packages\/[^/]+\/src\/\*\*$/.test(pattern)
    || /^packages\/[^/]+\/src\//.test(pattern) && pattern.includes('*');
}

function safeAllowedWritePattern(pattern: string): boolean {
  return pattern === '**/*.test.ts'
    || pattern === '**/*.spec.ts'
    || /(^|\/)\*\*\/\*\.(test|spec)\.ts$/.test(pattern)
    || /(^|\*)\.(test|spec)\.ts$/.test(pattern)
    || pattern.startsWith('artifacts/')
    || pattern.startsWith('.sdd/runs/');
}

function matchesWritePattern(relativePath: string, pattern: string): boolean {
  const normalizedPattern = pattern.replace(/\\/g, '/');
  if (normalizedPattern === relativePath) {
    return true;
  }
  if (normalizedPattern === '**/*.test.ts') {
    return relativePath.endsWith('.test.ts');
  }
  if (normalizedPattern === '**/*.spec.ts') {
    return relativePath.endsWith('.spec.ts');
  }
  if (normalizedPattern.endsWith('/**')) {
    const prefix = normalizedPattern.slice(0, -3);
    return relativePath.startsWith(`${prefix}/`);
  }
  return false;
}

function stableHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
