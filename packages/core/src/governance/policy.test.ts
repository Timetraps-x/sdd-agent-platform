import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import { doctor } from '../doctor/doctor.js';
import { runBackgroundExecutor } from '../execution/background-executor.js';
import { readRunEvents } from '../run-state/events.js';
import { validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { evaluateGovernancePolicy, inspectGovernancePolicy } from './policy.js';

test('governance policy explains confirmation and concurrency gates', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-governance-policy-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${validTaskMarkdown('G1', [])}\n${validTaskMarkdown('G2', [])}\n${validTaskMarkdown('G3', [])}\n${validTaskMarkdown('G4', [])}\n${validTaskMarkdown('G5', [])}`);
    const policy = await inspectGovernancePolicy(root);
    const risky = await evaluateGovernancePolicy(root, { operation: 'destructive_git' });

    assert.equal(policy.version, 'phase-3.14-governance-policy-v1');
    assert.equal(risky.status, 'confirm');
    assert.equal(risky.allowed, false);
    assert.equal(risky.issues.some((issue) => issue.field === 'governance.confirmation'), true);

    await runBackgroundExecutor(root, { taskId: 'G1' });
    await runBackgroundExecutor(root, { taskId: 'G2' });
    await runBackgroundExecutor(root, { taskId: 'G3' });
    await runBackgroundExecutor(root, { taskId: 'G4' });
    const blocked = await runBackgroundExecutor(root, { taskId: 'G5' });
    const events = await readRunEvents(root, blocked.runId);

    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.issues.some((issue) => issue.field === 'governance.concurrency'), true);
    assert.equal(events.some((event) => event.event === 'governance_policy_blocked'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports governance policy contract visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-governance-doctor-'));
  try {
    await initProject(root);

    const report = await doctor(root, { latestOnly: true });
    const check = report.checks.find((item) => item.check === 'governance_policy_contract');

    assert.equal(check?.level, 'PASS');
    assert.match(check?.message ?? '', /phase-3\.14-governance-policy-v1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
