import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { readRunState } from '../run-state/run-state.js';
import { listRuntimeProjections } from '../storage/runtime-store.js';
import { validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { runForegroundSubagents } from './foreground-subagents.js';

const hostCommand = [
  "const prompt = process.argv[1];",
  "const agent = prompt.match(/^Agent: (.+)$/m)?.[1] ?? 'agent';",
  "const task = prompt.match(/^Task id: (.+)$/m)?.[1] ?? 'TASK';",
  "const artifact = prompt.match(/^Expected result artifact: (.+)$/m)?.[1] ?? 'artifacts/result.md';",
  "const result = '# ' + agent + ' result\\n\\n```sdd-result\\ncontract: sdd-result-v1\\nversion: 1.3.0\\nagent: ' + agent + '\\ntask: ' + task + '\\nstatus: PASS\\nartifacts:\\n  - ' + artifact + '\\n```\\n\\n## Summary\\n' + agent + ' observed task ' + task + ' and produced a compact parent-consumable summary.\\n\\n## Key findings\\n- ' + agent + ' confirmed the foreground subagent artifact path.\\n- Full details remain in the deep-read artifact.\\n\\n## Recommendation\\nParent main agent can use this digest first and deep-read only if needed.\\n\\n## Deep-read triggers\\n- Inspect ' + artifact + ' when validating detailed evidence.\\n';",
  "const evidence = agent === 'validator' ? '\\n```sdd-evidence\\ncontract: sdd-evidence-v1\\nversion: 1.0.0\\ntask: ' + task + '\\nacceptance: AC-1\\nstatus: PASS\\nclaim: Validation proves AC-1.\\nsource_artifact: ' + artifact + '\\nevidence_refs:\\n  - command:npm test\\nprovenance_refs:\\n  - artifact:' + artifact + '\\npolicy_refs:\\n  - acceptance-policy-v1:require-source-evidence\\n```\\n' : '';",
  "process.stdout.write(result + evidence);"
].join('\n');

test('runForegroundSubagents collects all foreground subagent artifacts without lifecycle authority', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-foreground-subagents-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []).replace('packages/core/src/index.ts', 'docs/t1.md'));

    const result = await runForegroundSubagents(root, {
      branch: 'feature',
      taskId: 'T1',
      agents: ['reviewer', 'validator'],
      hostInvocation: { command: process.execPath, args: ['-e', hostCommand, '{prompt}'] }
    });

    assert.equal(result.status, 'completed');
    assert.deepEqual(result.agents.map((agent) => `${agent.agent}:${agent.status}`), ['reviewer:completed', 'validator:completed']);
    assert.equal(result.agents.every((agent) => agent.artifactPath?.startsWith('artifacts/')), true);
    assert.equal(result.agents.every((agent) => agent.ingestion?.status === 'accepted'), true);

    const state = await readRunState(root, result.runId);
    assert.equal(state.phase, 'foreground-subagents');
    assert.equal(Object.values(state.delegations).every((delegation) => delegation.runMode === 'foreground' && delegation.blocking === false && delegation.requiredForPhaseExit === false), true);

    assert.equal(result.summaryRefs.length, 2);
    assert.equal(result.doNotReadUnlessNeededRefs.length, 2);
    for (const agent of result.agents) {
      assert.equal(agent.digest?.contract, 'sdd-foreground-subagent-digest-v1');
      assert.equal(agent.digest.authority, 'non-authoritative');
      assert.deepEqual(agent.digest.allowedUse, ['summary', 'diagnostic']);
      assert.deepEqual(agent.digest.forbiddenUse, ['final-risk-decision', 'stage-completion', 'ship-gate-pass']);
      assert.equal(agent.digest.sourceArtifactRef?.kind, 'artifact');
      assert.deepEqual(agent.digest.deepReadRefs, [{ kind: 'artifact', ref: agent.artifactPath }]);
      assert.match(agent.digest.summary, /parent-consumable summary/);
      assert.match(agent.digest.keyFindings.join('\n'), /artifact path/);
      assert.equal(agent.digest.needsMainAgentReview, false);
      assert.equal(agent.digestRef?.kind, 'projection');
    }

    const projections = await listRuntimeProjections(root, ['phase8_subagent_dispatch', 'phase8_subagent_result', 'foreground_subagent_digest']);
    const dispatches = projections.filter((projection) => projection.projectionType === 'phase8_subagent_dispatch').map((projection) => projection.payload as { payload: { mode: string; blocking: boolean; requiredBefore: string } });
    assert.equal(dispatches.length, 2);
    assert.equal(dispatches.every((projection) => projection.payload.mode === 'foreground' && projection.payload.blocking === false && projection.payload.requiredBefore === 'never'), true);
    assert.equal(projections.filter((projection) => projection.projectionType === 'foreground_subagent_digest').length, 2);
    const subagentResults = projections.filter((projection) => projection.projectionType === 'phase8_subagent_result').map((projection) => projection.payload as { payload: { evidenceRefs: Array<{ kind: string; ref: string }> } });
    assert.equal(subagentResults.every((projection) => projection.payload.evidenceRefs.every((ref) => ref.kind === 'artifact')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runForegroundSubagents blocks before host invocation when dependencies are unmet', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-foreground-subagents-blocked-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', `# Tasks\n\n${validTaskMarkdown('DEP1', [])}\n${validTaskMarkdown('DEP2', ['DEP1']).replace('packages/core/src/index.ts', 'docs/dep2.md')}`);

    const result = await runForegroundSubagents(root, {
      branch: 'feature',
      taskId: 'DEP2',
      agents: ['reviewer'],
      approved: true,
      hostInvocation: { command: process.execPath, args: ['-e', 'throw new Error("should not run")', '{prompt}'] }
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.agents[0].status, 'blocked');
    assert.equal(result.agents[0].hostInvocation, null);
    assert.equal(result.agents[0].digest, null);
    assert.equal(result.agents[0].digestRef, null);
    assert.equal(result.summaryRefs.length, 0);
    assert.equal(result.doNotReadUnlessNeededRefs.length, 0);
    assert.match(result.agents[0].issues.map((issue) => issue.message).join('\n'), /DEP2 depends on DEP1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
