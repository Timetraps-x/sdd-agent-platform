import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { doctor } from './doctor/doctor.js';
import { initProject } from './config/init-project.js';
import { withManagedHash } from './test-support/fixtures.js';
import { applyAiToolEntries, checkAiToolEntryDrift } from './ai-tools.js';

test('AI entry drift check distinguishes managed drift from user modifications', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-drift-'));
  try {
    await initProject(root);
    const skillPath = path.join(root, '.claude', 'skills', 'sdd', 'SKILL.md');
    const original = await readFile(skillPath, 'utf8');
    const oldManagedTemplate = withManagedHash(original.replace('This skill is the manual `/sdd` root intent router; do not treat this generated file as the workflow brain.', 'Run the SDD workflow entrypoint for this repository.'));
    await writeFile(skillPath, oldManagedTemplate, 'utf8');

    const drift = await checkAiToolEntryDrift(root);
    const driftedEntry = drift[0].entries.find((entry) => entry.id === 'sdd');
    assert.equal(driftedEntry?.status, 'drifted');
    assert.equal(driftedEntry?.driftStatus, 'drifted');
    assert.equal(driftedEntry?.manifest.path, '.claude/skills/sdd/SKILL.md');
    assert.equal(driftedEntry?.manifest.artifactId, 'sdd');
    assert.equal(driftedEntry?.manifest.ownership, 'sdd-managed');
    assert.equal(driftedEntry?.manifest.sourceContract, 'sdd-ai-entry-v1');

    const update = await applyAiToolEntries(root);
    assert.equal(update[0].entries.some((entry) => entry.id === 'sdd' && entry.status === 'updated'), true);
    const clean = await checkAiToolEntryDrift(root);
    assert.equal(clean[0].entries.every((entry) => entry.status === 'unchanged'), true);

    await writeFile(skillPath, `${await readFile(skillPath, 'utf8')}\nmanual drift\n`, 'utf8');
    const userModified = await checkAiToolEntryDrift(root);
    assert.equal(userModified[0].entries.some((entry) => entry.id === 'sdd' && entry.status === 'user-modified'), true);
    const skippedUpdate = await applyAiToolEntries(root);
    assert.equal(skippedUpdate[0].entries.some((entry) => entry.id === 'sdd' && entry.status === 'user-modified'), true);
    assert.match(await readFile(skillPath, 'utf8'), /manual drift/);
    const doctorReport = await doctor(root, { latestOnly: true });
    assert.equal(doctorReport.checks.some((check) => check.check === 'ai_entry_sdd' && check.level === 'FAIL' && /will not overwrite user-modified/.test(check.action ?? '')), true);

    const forcedUpdate = await applyAiToolEntries(root, { force: true });
    assert.equal(forcedUpdate[0].entries.some((entry) => entry.id === 'sdd' && entry.status === 'updated'), true);
    assert.doesNotMatch(await readFile(skillPath, 'utf8'), /manual drift/);
    const forcedClean = await checkAiToolEntryDrift(root);
    assert.equal(forcedClean[0].entries.every((entry) => entry.status === 'unchanged'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AI entry drift check includes managed entry version', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-version-drift-'));
  try {
    await initProject(root);
    const skillPath = path.join(root, '.claude', 'skills', 'sdd', 'SKILL.md');
    const original = await readFile(skillPath, 'utf8');
    await writeFile(skillPath, original.replace('sdd_version: "0.3.0"', 'sdd_version: "0.2.0"'), 'utf8');

    const drift = await checkAiToolEntryDrift(root);
    assert.equal(drift[0].entries.some((entry) => entry.id === 'sdd' && entry.status === 'drifted'), true);

    const update = await applyAiToolEntries(root);
    assert.equal(update[0].entries.some((entry) => entry.id === 'sdd' && entry.status === 'updated'), true);
    assert.match(await readFile(skillPath, 'utf8'), /sdd_version: "0\.3\.0"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AI entry projection refuses foreign files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-foreign-'));
  try {
    await mkdir(path.join(root, '.claude', 'skills', 'sdd'), { recursive: true });
    await writeFile(path.join(root, '.claude', 'skills', 'sdd', 'SKILL.md'), 'user-owned skill', 'utf8');
    const init = await initProject(root);
    const foreign = init.aiTools[0].entries.find((entry) => entry.id === 'sdd');

    assert.equal(foreign?.status, 'foreign');
    assert.equal(await readFile(path.join(root, '.claude', 'skills', 'sdd', 'SKILL.md'), 'utf8'), 'user-owned skill');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AI entry update removes obsolete managed entries', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-obsolete-'));
  try {
    await initProject(root);
    const obsoleteVerifyPath = path.join(root, '.claude', 'commands', 'sdd', 'verify.md');
    const obsoleteVerifyContent = withManagedHash(`---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-verify
sdd_source: sdd-agent-platform
sdd_hash: sha256:0000000000000000000000000000000000000000000000000000000000000000
---

Legacy verify command.
`);
    await writeFile(obsoleteVerifyPath, obsoleteVerifyContent, 'utf8');
    const obsoleteRootPath = path.join(root, '.claude', 'commands', 'sdd.md');
    const obsoleteRootContent = withManagedHash(`---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-root
sdd_source: sdd-agent-platform
sdd_hash: sha256:0000000000000000000000000000000000000000000000000000000000000000
---

Legacy root command.
`);
    await writeFile(obsoleteRootPath, obsoleteRootContent, 'utf8');

    const drift = await checkAiToolEntryDrift(root);
    assert.equal(drift[0].entries.some((entry) => entry.id === 'sdd-verify' && entry.status === 'obsolete'), true);
    assert.equal(drift[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'obsolete'), true);

    const update = await applyAiToolEntries(root);
    assert.equal(update[0].entries.some((entry) => entry.id === 'sdd-verify' && entry.status === 'removed'), true);
    assert.equal(update[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'removed'), true);
    await assert.rejects(readFile(obsoleteVerifyPath, 'utf8'), /ENOENT/);
    await assert.rejects(readFile(obsoleteRootPath, 'utf8'), /ENOENT/);

    const clean = await checkAiToolEntryDrift(root);
    assert.equal(clean[0].entries.every((entry) => entry.status === 'unchanged'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});