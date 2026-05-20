import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { writeArtifact } from '../run-state/artifacts.js';
import { appendEvent, readRunEvents } from '../run-state/events.js';
import { listInvocationLedgerEntries } from '../run-state/invocation-ledger.js';
import { createRun, readRunState } from '../run-state/run-state.js';
import { initProject } from '../config/init-project.js';
import { doctor } from '../doctor/doctor.js';
import { getInvocationLedgerPath, getRuntimeStorePath } from '../runtime-paths.js';

test('runtime store mirrors run state events artifacts and doctor visibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-store-'));
  try {
    await initProject(root);
    const run = await createRun(root, { runId: 'store-run-001' });
    await appendEvent(root, run.runId, { event: 'runtime_store_test_event', runId: run.runId, summary: 'store mirror test' });
    await writeArtifact(root, run.runId, 'validation-T1.md', 'runtime store artifact');

    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const storedRun = db.prepare('SELECT run_id, status FROM runs WHERE run_id = ?').get(run.runId) as { run_id?: string; status?: string } | undefined;
      const storedEvent = db.prepare('SELECT event_name FROM events WHERE run_id = ? AND event_name = ?').get(run.runId, 'runtime_store_test_event') as { event_name?: string } | undefined;
      const storedArtifact = db.prepare('SELECT path FROM artifacts WHERE run_id = ? AND path = ?').get(run.runId, 'artifacts/validation-T1.md') as { path?: string } | undefined;
      const storedEvidence = db.prepare('SELECT relative_path FROM evidence_attachments WHERE run_id = ? AND relative_path = ?').get(run.runId, 'artifacts/validation-T1.md') as { relative_path?: string } | undefined;
      assert.equal(storedRun?.run_id, run.runId);
      assert.equal(storedRun?.status, 'created');
      assert.equal(storedEvent?.event_name, 'runtime_store_test_event');
      assert.equal(storedArtifact?.path, 'artifacts/validation-T1.md');
      assert.equal(storedEvidence?.relative_path, 'artifacts/validation-T1.md');
    } finally {
      db.close();
    }

    const report = await doctor(root, { latestOnly: true });
    const runtimeStoreCheck = report.checks.find((check) => check.check === 'runtime_store');
    assert.equal(runtimeStoreCheck?.level, 'PASS');
    assert.match(runtimeStoreCheck?.message ?? '', /phase-7\.2-runtime-store-v2/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime store imports changed legacy run state and events', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-legacy-import-'));
  try {
    await initProject(root);
    const run = await createRun(root, { runId: 'legacy-run-001' });
    const state = await readRunState(root, run.runId);
    const statePath = path.join(root, '.sdd', 'runs', run.runId, 'state.json');
    const legacyIngestion = {
      contract: 'sdd-artifact-result-ingestion-v1' as const,
      runId: run.runId,
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      artifactPath: 'artifacts/validation-T1.md',
      status: 'accepted' as const,
      resultStatus: 'PASS' as const,
      delegationStatus: 'COMPLETED' as const,
      ingestedAt: '2026-01-01T00:00:00.000Z',
      issues: [],
      gaps: []
    };
    await writeFile(statePath, `${JSON.stringify({
      ...state,
      status: 'completed',
      updatedAt: '2026-01-01T00:00:00.000Z',
      artifacts: [{ path: 'artifacts/validation-T1.md', kind: 'validation', task: 'T1', agent: 'validator', createdAt: '2026-01-01T00:00:00.000Z' }],
      artifactIngestions: { 'D-T1-validator-001:artifacts/validation-T1.md': legacyIngestion }
    }, null, 2)}\n`, 'utf8');
    await writeFile(path.join(root, '.sdd', 'runs', run.runId, 'events.jsonl'), `${JSON.stringify({
      contract: 'sdd-event-log-v1',
      time: '2026-01-01T00:00:00.000Z',
      event: 'legacy_event_after_store',
      runId: run.runId,
      summary: 'legacy event'
    })}\n`, 'utf8');
    await writeFile(getInvocationLedgerPath(root, run.runId), `${JSON.stringify({
      contract: 'sdd-invocation-ledger-v1',
      version: '1.0.0',
      entryId: 'legacy-ledger-entry-001',
      runId: run.runId,
      taskId: 'T1',
      branch: 'master',
      kind: 'command',
      ref: 'npm test',
      status: 'declared',
      timestamp: '2026-01-01T00:00:00.000Z',
      materialRefs: [],
      metadata: { source: 'legacy-test' }
    })}\n`, 'utf8');
    const dbBeforeImport = new DatabaseSync(getRuntimeStorePath(root));
    try {
      dbBeforeImport.prepare('DELETE FROM runs WHERE run_id = ?').run(run.runId);
    } finally {
      dbBeforeImport.close();
    }

    const importedState = await readRunState(root, run.runId);
    const importedEvents = await readRunEvents(root, run.runId);
    const importedLedger = await listInvocationLedgerEntries(root, run.runId);
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const artifact = db.prepare('SELECT path, status FROM artifacts WHERE run_id = ? AND path = ?').get(run.runId, 'artifacts/validation-T1.md') as { path?: string; status?: string } | undefined;
      const ingestion = db.prepare('SELECT status, result_status FROM artifact_ingestions WHERE run_id = ? AND artifact_path = ?').get(run.runId, 'artifacts/validation-T1.md') as { status?: string; result_status?: string } | undefined;
      const activity = db.prepare('SELECT ref, status FROM activities WHERE run_id = ? AND activity_id = ?').get(run.runId, 'legacy-ledger-entry-001') as { ref?: string; status?: string } | undefined;
      assert.equal(importedState.status, 'completed');
      assert.equal(importedEvents.some((event) => event.event === 'legacy_event_after_store'), true);
      assert.equal(importedLedger.some((entry) => entry.entryId === 'legacy-ledger-entry-001'), true);
      assert.equal(artifact?.status, 'legacy_imported');
      assert.equal(ingestion?.status, 'accepted');
      assert.equal(ingestion?.result_status, 'PASS');
      assert.equal(activity?.ref, 'npm test');
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
