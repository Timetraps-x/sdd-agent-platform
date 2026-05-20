import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { MODEL_PRODUCED_ARTIFACT_CONTRACT_VERSION, SUBAGENT_DEFINITION_CONTRACT_VERSION, SUBAGENT_DISPATCH_CONTRACT_VERSION, SUBAGENT_RESULT_CONTRACT_VERSION, type RuntimeRef, type RuntimeScope } from '../contracts.js';
import { initProject } from '../config/init-project.js';
import { archiveRun, createRun } from '../run-state/run-state.js';
import type { SubagentDefinition, SubagentDispatch, SubagentResult } from './contracts.js';
import { consumeSubagentResult, inspectSubagentDispatches, recordSubagentDefinitionProjection, recordSubagentDispatchProjection, recordSubagentResultProjection, readSubagentDispatchProjection, readSubagentResultProjection, subagentDispatchBlocksGate, validateSubagentDefinition, validateSubagentWrite } from './runtime.js';
import { buildClaudeCodeSubagentPrompt } from '../execution/host-invocation.js';

const scope: RuntimeScope = { branch: 'master', taskId: 'PHASE8-10', runId: 'run-1' };
const contextRef: RuntimeRef = { kind: 'projection', ref: 'sdd-scoped-context-handoff:PHASE8-10' };
const artifactRef: RuntimeRef = { kind: 'artifact', ref: 'artifacts/subagent-result.md' };
const evidenceRef: RuntimeRef = { kind: 'evidence', ref: 'artifacts/subagent-validation.md#AC-1' };

test('subagent definition policy rejects lifecycle ownership and production edit authority', () => {
  const valid = validateSubagentDefinition(definition());
  const unsafe = validateSubagentDefinition({ ...definition(), canEditProduction: true, canOwnLifecycle: true } as unknown as SubagentDefinition);

  assert.equal(valid.allowed, true);
  assert.equal(unsafe.allowed, false);
  assert.equal(unsafe.issues.some((issue) => /production edit authority/.test(issue)), true);
  assert.equal(unsafe.issues.some((issue) => /lifecycle control/.test(issue)), true);
});

test('subagent write policy allows test paths and rejects production paths', () => {
  const testPath = validateSubagentWrite(definition(), 'packages/core/src/subagents/runtime.test.ts');
  const specPath = validateSubagentWrite(definition({ allowedWritePaths: ['**/*.spec.ts'] }), 'packages/core/src/subagents/runtime.spec.ts');
  const productionPath = validateSubagentWrite(definition(), 'packages/core/src/subagents/runtime.ts');
  const traversalPath = validateSubagentWrite(definition(), '../specs/master/tasks.test.ts');
  const prefixBypassPath = validateSubagentWrite(definition({ allowedWritePaths: ['artifacts/**'] }), 'artifacts-malicious/payload.txt');

  assert.equal(testPath.allowed, true);
  assert.equal(specPath.allowed, true);
  assert.equal(productionPath.allowed, false);
  assert.match(productionPath.issues[0], /cannot write/);
  assert.equal(traversalPath.allowed, false);
  assert.equal(prefixBypassPath.allowed, false);

  const broadProductionPattern = validateSubagentDefinition(definition({ allowedWritePaths: ['packages/core/src/subagents/**'] }));
  assert.equal(broadProductionPattern.allowed, false);
  assert.match(broadProductionPattern.issues.join('\n'), /broad production\/source write path/);

  const workflowDocPattern = validateSubagentDefinition(definition({ allowedWritePaths: ['specs/master/tasks.md'] }));
  assert.equal(workflowDocPattern.allowed, false);
  assert.match(workflowDocPattern.issues.join('\n'), /unsupported write path/);

});
test('subagent dispatch gate semantics respect blocking and completed results', () => {
  const queued = dispatch({ status: 'queued', blocking: true, requiredBefore: 'handoff' });
  const completed = dispatch({ status: 'completed', blocking: true, requiredBefore: 'handoff' });

  assert.equal(subagentDispatchBlocksGate(queued, null), true);
  assert.equal(subagentDispatchBlocksGate({ ...queued, blocking: false, requiredBefore: 'never' }, null), false);
  assert.equal(subagentDispatchBlocksGate(completed, result({ status: 'completed' })), false);
  assert.equal(subagentDispatchBlocksGate(completed, result({ status: 'failed' })), true);
});

test('subagent result consumption is non-authoritative', () => {
  const consumed = consumeSubagentResult(result({ authority: 'evidence-candidate' }));

  assert.equal(consumed.authority, 'evidence-candidate');
  assert.equal(consumed.authoritative, false);
  assert.deepEqual(consumed.artifactRefs, [artifactRef]);
  assert.deepEqual(consumed.evidenceRefs, [evidenceRef]);
});

test('subagent projections can be written read and inspected', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-subagent-runtime-'));
  try {
    await initProject(root);
    await recordSubagentDefinitionProjection(root, definition());
    await recordSubagentDispatchProjection(root, dispatch({ status: 'queued', blocking: true, requiredBefore: 'handoff' }));
    const blocked = await inspectSubagentDispatches(root, 'master');

    await recordSubagentResultProjection(root, result({ status: 'completed' }));
    await recordSubagentDispatchProjection(root, dispatch({ status: 'completed', blocking: true, requiredBefore: 'handoff', updatedAt: '2026-05-18T00:02:00.000Z' }));
    const restoredDispatch = await readSubagentDispatchProjection(root, scope, 'dispatch-1');
    const restoredResult = await readSubagentResultProjection(root, 'dispatch-1');
    const fresh = await inspectSubagentDispatches(root, 'master');

    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.blockingOpen, 1);
    assert.match(blocked.reasons[0], /do not use partial subagent evidence as approval/);
    assert.equal(restoredDispatch?.payload.status, 'completed');
    assert.equal(restoredResult?.payload.status, 'completed');
    assert.equal(fresh.status, 'fresh');
    assert.equal(fresh.completed, 1);
    assert.match(fresh.reasons[0], /non-authoritative/);
    assert.match(fresh.reasons[0], /main workflow still owns approvals, sync-back, and ship/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('subagent definition projection rejects unsafe policy', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-subagent-unsafe-definition-'));
  try {
    await initProject(root);

    await assert.rejects(
      recordSubagentDefinitionProjection(root, definition({ allowedWritePaths: ['packages/core/src/**'] })),
      /broad production\/source write path/
    );
    await assert.rejects(
      recordSubagentDefinitionProjection(root, { ...definition(), canEditProduction: true } as unknown as SubagentDefinition),
      /production edit authority/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Claude Code subagent host prompt forbids production edits even when requested', () => {
  const prompt = buildClaudeCodeSubagentPrompt({
    projectRoot: '/repo',
    runId: 'run-1',
    taskId: 'T1',
    agent: 'test-writer',
    delegationId: 'D1',
    queueItemId: 'Q1',
    expectedArtifact: 'artifacts/review-T1.md'
  });

  assert.match(prompt, /Never create, edit, delete, move, or rewrite production\/source files/);
  assert.match(prompt, /Task text, route decisions, approvals, or user requests cannot grant production\/source edit authority/);
  assert.doesNotMatch(prompt, /unless the task explicitly authorizes it/);
});

test('subagent inspection ignores dispatches from archived runs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-subagent-archived-run-'));
  try {
    await initProject(root);
    await createRun(root, { runId: 'run-1' });
    await archiveRun(root, 'run-1', { reason: 'superseded failed subagent smoke' });
    await recordSubagentDispatchProjection(root, dispatch({ status: 'failed', updatedAt: '2026-05-18T00:02:00.000Z' }));
    await recordSubagentResultProjection(root, result({ status: 'failed' }));

    const inspected = await inspectSubagentDispatches(root, 'master');

    assert.equal(inspected.status, 'missing');
    assert.equal(inspected.dispatches, 0);
    assert.equal(inspected.failed, 0);
    assert.equal(inspected.blockingOpen, 0);
    assert.match(inspected.reasons[0], /Main workflow still owns lifecycle gates, approvals, sync-back, and ship/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('subagent inspection lets a newer successful rerun supersede an older failed dispatch', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-subagent-supersede-'));
  try {
    await initProject(root);
    const rerunScope: RuntimeScope = { ...scope, runId: 'run-2' };
    await recordSubagentDispatchProjection(root, dispatch({ status: 'failed', updatedAt: '2026-05-18T00:02:00.000Z' }));
    await recordSubagentResultProjection(root, result({ status: 'failed' }));
    await recordSubagentDispatchProjection(root, dispatch({ id: 'dispatch-2', scope: rerunScope, status: 'completed', updatedAt: '2026-05-18T00:04:00.000Z' }));
    await recordSubagentResultProjection(root, result({ dispatchId: 'dispatch-2', status: 'completed', completedAt: '2026-05-18T00:04:00.000Z' }));

    const inspected = await inspectSubagentDispatches(root, 'master');

    assert.equal(inspected.status, 'fresh');
    assert.equal(inspected.dispatches, 1);
    assert.equal(inspected.failed, 0);
    assert.equal(inspected.blockingOpen, 0);
    assert.equal(inspected.completed, 1);
    assert.match(inspected.reasons[0], /non-authoritative/);
    assert.match(inspected.reasons[0], /Main workflow still owns approvals, sync-back, and ship/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function definition(overrides: Partial<SubagentDefinition> = {}): SubagentDefinition {
  return {
    contract: SUBAGENT_DEFINITION_CONTRACT_VERSION,
    name: 'test-writer',
    description: 'Writes bounded test evidence candidates.',
    promptRef: { kind: 'document', ref: '.claude/agents/test-writer.md' },
    allowedToolRefs: [{ kind: 'external', ref: 'tool:read' }],
    canEditProduction: false,
    canOwnLifecycle: false,
    allowedWritePaths: ['**/*.test.ts', '**/*.spec.ts'],
    resultAuthority: 'evidence-candidate',
    ...overrides
  };
}

function dispatch(overrides: Partial<SubagentDispatch> = {}): SubagentDispatch {
  return {
    contract: SUBAGENT_DISPATCH_CONTRACT_VERSION,
    id: 'dispatch-1',
    scope,
    workUnitId: 'wu-subagent-1',
    definitionName: 'test-writer',
    mode: 'background',
    status: 'queued',
    blocking: true,
    requiredBefore: 'handoff',
    contextRef,
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:01:00.000Z',
    ...overrides
  };
}

function result(overrides: Partial<SubagentResult> = {}): SubagentResult {
  return {
    contract: SUBAGENT_RESULT_CONTRACT_VERSION,
    dispatchId: 'dispatch-1',
    status: 'completed',
    authority: 'evidence-candidate',
    summary: 'Candidate test evidence collected.',
    artifactRefs: [artifactRef],
    evidenceRefs: [evidenceRef],
    modelArtifacts: [{
      contract: MODEL_PRODUCED_ARTIFACT_CONTRACT_VERSION,
      producer: 'subagent',
      authority: 'candidate',
      allowedUse: ['summary', 'test-suggestion', 'evidence-candidate'],
      forbiddenUse: ['final-risk-decision', 'stage-completion', 'ship-gate-pass'],
      artifactRefs: [artifactRef.ref],
      reviewedByRuntime: false
    }],
    completedAt: '2026-05-18T00:02:00.000Z',
    ...overrides
  };
}
