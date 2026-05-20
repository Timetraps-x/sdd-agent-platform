import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { inspectVerifyContract, writeVerifyContract } from './verify-contract.js';


test('inspectVerifyContract warns when verify document is missing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verify-contract-missing-'));
  try {
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));

    const inspection = await inspectVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    assert.equal(inspection.status, 'WARN');
    assert.equal(inspection.exists, false);
    assert.equal(inspection.taskCount, 1);
    assert.equal(inspection.issues.some((issue) => issue.field === 'verify.md' && issue.level === 'WARN'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('writeVerifyContract creates task-derived verify contract', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verify-contract-write-'));
  try {
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));

    const written = await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    const inspection = await inspectVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    assert.equal(written.status, 'created');
    assert.match(written.content, /contract: sdd-verify-doc-v1/);
    assert.match(written.content, /\| T1 \|/);
    assert.match(written.content, /author_role: verification-designer/);
    assert.match(written.content, /independent_from_roles:\n  - task-planner\n  - implementer/);
    assert.equal(inspection.status, 'PASS');
    assert.equal(inspection.exists, true);
    assert.equal(inspection.issues.length, 0);
    assert.equal(inspection.authorRole, 'verification-designer');
    assert.deepEqual(inspection.independentFromRoles, ['task-planner', 'implementer']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('inspectVerifyContract warns when verify document is stale', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-verify-contract-stale-'));
  try {
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    await writeVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });
    await writeFile(path.join(root, 'specs', 'feature', 'tasks.md'), validTaskMarkdown('T2', []), 'utf8');

    const inspection = await inspectVerifyContract(root, { branch: 'feature', branchSource: 'cli_option' });

    assert.equal(inspection.status, 'WARN');
    assert.equal(inspection.issues.some((issue) => issue.field === 'based_on_tasks_hash'), true);
    assert.equal(inspection.issues.some((issue) => issue.field === 'tasks' && /T2/.test(issue.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
