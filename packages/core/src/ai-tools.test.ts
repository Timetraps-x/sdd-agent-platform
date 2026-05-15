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
    const commandPath = path.join(root, '.claude', 'commands', 'sdd.md');
    const original = await readFile(commandPath, 'utf8');
    const oldManagedTemplate = withManagedHash(original.replace('Use SDD as the natural-language intent router for this repository while keeping CLI/core output as the source of truth.', 'Run the SDD workflow entrypoint for this repository.'));
    await writeFile(commandPath, oldManagedTemplate, 'utf8');

    const drift = await checkAiToolEntryDrift(root);
    const driftedEntry = drift[0].entries.find((entry) => entry.id === 'sdd-root');
    assert.equal(driftedEntry?.status, 'drifted');
    assert.equal(driftedEntry?.driftStatus, 'drifted');
    assert.equal(driftedEntry?.manifest.path, '.claude/commands/sdd.md');
    assert.equal(driftedEntry?.manifest.artifactId, 'sdd-root');
    assert.equal(driftedEntry?.manifest.ownership, 'sdd-managed');
    assert.equal(driftedEntry?.manifest.sourceContract, 'sdd-ai-entry-v1');

    const update = await applyAiToolEntries(root);
    assert.equal(update[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'updated'), true);
    const clean = await checkAiToolEntryDrift(root);
    assert.equal(clean[0].entries.every((entry) => entry.status === 'unchanged'), true);

    await writeFile(commandPath, `${await readFile(commandPath, 'utf8')}\nmanual drift\n`, 'utf8');
    const userModified = await checkAiToolEntryDrift(root);
    assert.equal(userModified[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'user-modified'), true);
    const skippedUpdate = await applyAiToolEntries(root);
    assert.equal(skippedUpdate[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'user-modified'), true);
    assert.match(await readFile(commandPath, 'utf8'), /manual drift/);
    const doctorReport = await doctor(root, { latestOnly: true });
    assert.equal(doctorReport.checks.some((check) => check.check === 'ai_entry_sdd-root' && check.level === 'FAIL' && /will not overwrite user-modified/.test(check.action ?? '')), true);

    const forcedUpdate = await applyAiToolEntries(root, { force: true });
    assert.equal(forcedUpdate[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'updated'), true);
    assert.doesNotMatch(await readFile(commandPath, 'utf8'), /manual drift/);
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
    const commandPath = path.join(root, '.claude', 'commands', 'sdd.md');
    const original = await readFile(commandPath, 'utf8');
    await writeFile(commandPath, original.replace('sdd_version: "0.3.0"', 'sdd_version: "0.2.0"'), 'utf8');

    const drift = await checkAiToolEntryDrift(root);
    assert.equal(drift[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'drifted'), true);

    const update = await applyAiToolEntries(root);
    assert.equal(update[0].entries.some((entry) => entry.id === 'sdd-root' && entry.status === 'updated'), true);
    assert.match(await readFile(commandPath, 'utf8'), /sdd_version: "0\.3\.0"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AI entry projection refuses foreign files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-foreign-'));
  try {
    await mkdir(path.join(root, '.claude', 'commands'), { recursive: true });
    await writeFile(path.join(root, '.claude', 'commands', 'sdd.md'), 'user-owned command', 'utf8');
    const init = await initProject(root);
    const foreign = init.aiTools[0].entries.find((entry) => entry.id === 'sdd-root');

    assert.equal(foreign?.status, 'foreign');
    assert.equal(await readFile(path.join(root, '.claude', 'commands', 'sdd.md'), 'utf8'), 'user-owned command');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
