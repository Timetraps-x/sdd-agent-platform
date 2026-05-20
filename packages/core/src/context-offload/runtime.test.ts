import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { initProject } from '../config/init-project.js';
import type { RuntimeRef, RuntimeScope } from '../contracts.js';
import { decideContextOffload, evaluateContextLoadSignal, inspectContextOffloadRuntime, recordContextLoadSignalProjection, recordContextOffloadDecisionProjection, readContextLoadSignalProjection } from './runtime.js';

const scope: RuntimeScope = { branch: 'master', taskId: 'PHASE8-9', runId: 'run-1' };
const sourceRef: RuntimeRef = { kind: 'document', ref: 'specs/master/tasks.md' };
const summaryRef: RuntimeRef = { kind: 'artifact', ref: 'artifacts/context-summary.md' };
const dispatchRef: RuntimeRef = { kind: 'projection', ref: 'phase8_subagent_dispatch:master:PHASE8-9:run-1:none:dispatch-1' };

test('context load signal scoring maps load dimensions to levels', () => {
  const normal = evaluateContextLoadSignal({ scope });
  const elevated = evaluateContextLoadSignal({ scope, fileCount: 8, dependencyFanout: 5, staleEvidenceRefs: 1 });
  const high = evaluateContextLoadSignal({ scope, fileCount: 20, artifactBytes: 200_000, dependencyFanout: 12, unknownImpact: true });
  const overloaded = evaluateContextLoadSignal({ scope, fileCount: 40, artifactBytes: 500_000, dependencyFanout: 25, staleEvidenceRefs: 6 });

  assert.equal(normal.level, 'normal');
  assert.equal(normal.confidence, 'high');
  assert.equal(elevated.level, 'elevated');
  assert.equal(elevated.score, 3);
  assert.equal(high.level, 'high');
  assert.equal(high.confidence, 'medium');
  assert.equal(overloaded.level, 'overloaded');
  assert.equal(overloaded.score, 12);
});

test('context offload decision maps load levels to inline summarize dispatch and curation actions', () => {
  const inline = decideContextOffload(evaluateContextLoadSignal({ scope, refs: [sourceRef] }));
  const summarize = decideContextOffload(evaluateContextLoadSignal({ scope, refs: [sourceRef], fileCount: 8, dependencyFanout: 5, staleEvidenceRefs: 1 }), { summarizeRefs: [summaryRef] });
  const dispatch = decideContextOffload(evaluateContextLoadSignal({ scope, refs: [sourceRef], fileCount: 20, artifactBytes: 200_000, dependencyFanout: 12, unknownImpact: true }), { dispatchRefs: [dispatchRef] });
  const curation = decideContextOffload(evaluateContextLoadSignal({ scope, refs: [sourceRef], fileCount: 40, artifactBytes: 500_000, dependencyFanout: 25, staleEvidenceRefs: 6 }));

  assert.equal(inline.action, 'inline');
  assert.deepEqual(inline.inlineRefs, [sourceRef]);
  assert.equal(summarize.action, 'summarize');
  assert.deepEqual(summarize.summarizeRefs, [summaryRef]);
  assert.equal(dispatch.action, 'dispatch-subagent');
  assert.equal(dispatch.requiredBefore, 'handoff');
  assert.deepEqual(dispatch.dispatchRefs, [dispatchRef]);
  assert.equal(curation.action, 'block-for-curation');
  assert.equal(curation.requiredBefore, 'stage-output');
  assert.equal(curation.blockingReasons.length > 0, true);
});

test('context load and offload projections can be written read and inspected', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-offload-runtime-'));
  try {
    await initProject(root);
    const signal = evaluateContextLoadSignal({ scope, refs: [sourceRef], fileCount: 20, artifactBytes: 200_000, dependencyFanout: 12, unknownImpact: true, generatedAt: '2026-05-18T00:00:00.000Z' });
    const decision = decideContextOffload(signal, { dispatchRefs: [dispatchRef] });

    const signalWrite = await recordContextLoadSignalProjection(root, signal);
    const decisionWrite = await recordContextOffloadDecisionProjection(root, decision);
    const restoredSignal = await readContextLoadSignalProjection(root, scope);
    const diagnostic = await inspectContextOffloadRuntime(root, 'master');

    assert.equal(signalWrite.status, 'created');
    assert.equal(decisionWrite.status, 'created');
    assert.equal(restoredSignal?.payload.level, 'high');
    assert.equal(diagnostic.level, 'high');
    assert.equal(diagnostic.action, 'dispatch-subagent');
    assert.equal(diagnostic.dispatchRefs, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
