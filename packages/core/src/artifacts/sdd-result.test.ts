import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { createRun } from '../run-state/run-state.js';
import { validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { getArtifactPath, getRunRelativeArtifactPath, toArtifactRootRelativePath } from '../runtime-paths.js';
import { parseSddResultMarkdown, validateSddResultArtifact } from './sdd-result.js';
import { renderSddResultArtifactTemplate } from './templates.js';

test('artifact path cannot escape artifacts directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    assert.throws(() => getArtifactPath(root, 'run-1', '../outside.md'), /escapes artifacts directory/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parseSddResultMarkdown validates a legal sdd-result block', () => {
  const report = parseSddResultMarkdown(`# Review

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: reviewer
task: T1
status: PASS
artifacts:
  - artifacts/review-T1.md
\`\`\`
`);

  assert.equal(report.valid, true);
  assert.equal(report.result?.agent, 'reviewer');
  assert.equal(report.result?.task, 'T1');
  assert.deepEqual(report.result?.artifacts, ['artifacts/review-T1.md']);
});

test('validateSddResultArtifact catches missing, empty, and task mismatch artifacts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-result-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const missing = await validateSddResultArtifact(root, state.runId, 'artifacts/missing.md', { expectedTask: 'T1', expectedAgent: 'reviewer' });
    assert.equal(missing.valid, false);
    assert.equal(missing.issues.some((issue) => issue.field === 'artifacts' && /Cannot read artifact/.test(issue.message)), true);
    assert.equal(missing.issues.some((issue) => /\.sdd\/runs\/run-1\/artifacts\/missing\.md/.test(issue.recommendation)), true);

    await writeArtifact(root, state.runId, 'empty.md', '');
    const empty = await validateSddResultArtifact(root, state.runId, 'artifacts/empty.md');
    assert.equal(empty.valid, false);
    assert.equal(empty.issues.some((issue) => /empty/.test(issue.message)), true);

    await writeArtifact(root, state.runId, 'review-T2.md', `# Review

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: reviewer
task: T2
status: PASS
artifacts:
  - artifacts/review-T2.md
\`\`\`
`);
    const mismatch = await validateSddResultArtifact(root, state.runId, 'artifacts/review-T2.md', { expectedTask: 'T1', expectedAgent: 'reviewer' });
    assert.equal(mismatch.valid, false);
    assert.equal(mismatch.issues.some((issue) => issue.field === 'task' && /does not match expected task/.test(issue.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('renderSddResultArtifactTemplate renders self-referencing reviewer artifact', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-template-review-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const template = await renderSddResultArtifactTemplate(root, {
      taskId: 'T1',
      agent: 'reviewer',
      artifactPath: 'artifacts/review-T1.md'
    });

    assert.match(template, /contract: sdd-result-v1/);
    assert.match(template, /agent: reviewer/);
    assert.match(template, /task: T1/);
    assert.match(template, /status: PASS/);
    assert.match(template, /artifacts:\n  - artifacts\/review-T1\.md/);

    await writeArtifact(root, state.runId, 'review-T1.md', template);
    const report = await validateSddResultArtifact(root, state.runId, 'artifacts/review-T1.md', { expectedTask: 'T1', expectedAgent: 'reviewer' });
    assert.equal(report.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('renderSddResultArtifactTemplate scaffolds validator acceptance mapping without trusted PASS evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-template-validator-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    const template = await renderSddResultArtifactTemplate(root, {
      branch: 'feature',
      taskId: 'T1',
      agent: 'validator',
      artifactPath: 'artifacts/validation-T1.md'
    });

    assert.match(template, /## Acceptance Mapping/);
    assert.match(template, /Acceptance AC-1: TODO\. Add validation evidence for Parser behavior is covered\./);
    await writeArtifact(root, state.runId, 'validation-T1.md', template);
    const report = await validateSddResultArtifact(root, state.runId, 'artifacts/validation-T1.md', { expectedTask: 'T1', expectedAgent: 'validator' });
    assert.equal(report.valid, false);
    assert.equal(report.trust?.valid, false);
    assert.equal(report.issues.some((issue) => issue.message.includes('TODO_PLACEHOLDER')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('artifact path helpers canonicalize root-relative and run-relative forms', () => {
  assert.equal(getRunRelativeArtifactPath('nested/result.md'), 'artifacts/nested/result.md');
  assert.equal(toArtifactRootRelativePath('artifacts/nested/result.md'), 'nested/result.md');
  assert.throws(() => getRunRelativeArtifactPath('artifacts/result.md'), /artifact-root-relative/);
  assert.throws(() => toArtifactRootRelativePath('result.md'), /must start with artifacts\//);
  assert.throws(() => toArtifactRootRelativePath('artifacts/../outside.md'), /relative and stay under artifacts/);
});
