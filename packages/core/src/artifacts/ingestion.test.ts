import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildEvidenceSummaryProjection } from '../context/evidence-summary.js';
import { initProject } from '../config/init-project.js';
import { createDelegationRecord } from '../delegation/validation.js';
import { appendEvent, readRunEvents } from '../run-state/events.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { createRun, readRunState, writeRunState } from '../run-state/run-state.js';
import { validResultArtifact, validTaskMarkdown, validTrustEvidence, writeBranchDocs } from '../test-support/fixtures.js';
import { bindTestRunState } from '../test-support/run-state.js';
import { getRuntimeStorePath } from '../runtime-paths.js';
import { ingestArtifactResult, inspectArtifactResultIngestions } from './ingestion.js';

test('ingestArtifactResult accepts valid artifact and is idempotent', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-ingest-valid-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md'
    });
    await writeRunState(root, { ...state, delegations: { [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'review-T1.md', `# Review

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

    const first = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/review-T1.md' });
    const second = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/review-T1.md' });
    const nextState = await readRunState(root, state.runId);
    const inspection = await inspectArtifactResultIngestions(root, state.runId);
    const events = await readRunEvents(root, state.runId);

    assert.equal(first.valid, true);
    assert.equal(first.duplicate, false);
    assert.equal(first.record.status, 'accepted');
    assert.equal(first.record.delegationStatus, 'COMPLETED');
    assert.equal(second.valid, true);
    assert.equal(second.duplicate, true);
    assert.equal(nextState.delegations[delegation.delegationId].status, 'COMPLETED');
    assert.equal(nextState.artifacts.filter((artifact) => artifact.path === 'artifacts/review-T1.md').length, 1);
    assert.equal(inspection.valid, true);
    assert.equal(inspection.records.length, 1);
    assert.equal(events.some((event) => event.event === 'artifact_ingested'), true);
    assert.equal(events.some((event) => event.event === 'delegation_completed'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ingestArtifactResult rejects invalid artifact without accepted evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-ingest-invalid-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      expectedArtifact: 'artifacts/validation-T1.md'
    });
    await writeRunState(root, { ...state, delegations: { [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'validation-T2.md', `# Validation

\`\`\`sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: validator
task: T2
status: PASS
artifacts:
  - artifacts/validation-T2.md
\`\`\`
`);

    const result = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/validation-T2.md' });
    const nextState = await readRunState(root, state.runId);
    const inspection = await inspectArtifactResultIngestions(root, state.runId);
    const events = await readRunEvents(root, state.runId);

    assert.equal(result.valid, false);
    assert.equal(result.record.status, 'rejected');
    assert.equal(result.record.issues.some((issue) => issue.field === 'task'), true);
    assert.equal(nextState.delegations[delegation.delegationId].status, 'RECOVERABLE');
    assert.equal(nextState.artifacts.length, 0);
    assert.equal(inspection.valid, true);
    assert.equal(events.some((event) => event.event === 'artifact_invalid'), true);
    assert.equal(events.some((event) => event.event === 'artifact_ingestion_rejected'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ingestArtifactResult admits validator evidence claims into runtime store', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-evidence-admission-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    const boundState = await readRunState(root, state.runId);
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      expectedArtifact: 'artifacts/validation-T1.md'
    });
    await writeRunState(root, { ...boundState, delegations: { ...boundState.delegations, [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);

    const result = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/validation-T1.md' });
    const summary = await buildEvidenceSummaryProjection(root, { runId: state.runId, taskId: 'T1' });
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const claim = db.prepare('SELECT partition, task_id, acceptance_id, coverage_status, source_artifact FROM evidence_claims WHERE run_id = ?').get(state.runId) as { partition?: string; task_id?: string; acceptance_id?: string; coverage_status?: string; source_artifact?: string } | undefined;
      const policyDecision = db.prepare('SELECT decision_id FROM policy_decisions WHERE run_id = ?').get(state.runId) as { decision_id?: string } | undefined;
      assert.equal(result.valid, true);
      assert.equal(claim?.partition, 'master');
      assert.equal(claim?.task_id, 'T1');
      assert.equal(claim?.acceptance_id, 'AC-1');
      assert.equal(claim?.coverage_status, 'PASS');
      assert.equal(claim?.source_artifact, 'artifacts/validation-T1.md');
      assert.equal(policyDecision, undefined);
      assert.equal(summary.passCount, 1);
      assert.equal(summary.highlights.some((highlight) => highlight.includes('admitted_claims=1')), true);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ingestArtifactResult records policy decisions for rejected derived evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-policy-decision-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    const boundState = await readRunState(root, state.runId);
    const delegation = createDelegationRecord({
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      expectedArtifact: 'artifacts/validation-T1.md'
    });
    const derivedEvidence = `\n\`\`\`sdd-evidence\ncontract: sdd-evidence-v1\nversion: 1.0.0\ntask: T1\nacceptance: AC-1\nstatus: PASS\nclaim: Derived summary tries to prove AC-1.\nsource_artifact: artifacts/evidence-summary-T1.json\nevidence_refs:\n  - artifact:artifacts/context-package-T1.json\nprovenance_refs:\n  - artifact:artifacts/validation-T1.md\npolicy_refs:\n  - acceptance-policy-v1:require-source-evidence\n\`\`\`\n`;
    await writeRunState(root, { ...boundState, delegations: { ...boundState.delegations, [delegation.delegationId]: delegation } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: delegation.delegationId } });
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${derivedEvidence}`);

    const result = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/validation-T1.md' });
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const claim = db.prepare('SELECT is_derived, source_artifact FROM evidence_claims WHERE run_id = ?').get(state.runId) as { is_derived?: number; source_artifact?: string } | undefined;
      const decision = db.prepare('SELECT status, issue_codes FROM policy_decisions WHERE run_id = ?').get(state.runId) as { status?: string; issue_codes?: string } | undefined;
      assert.equal(result.valid, false);
      assert.equal(result.record.status, 'rejected');
      assert.equal(claim?.is_derived, 1);
      assert.equal(claim?.source_artifact, 'artifacts/evidence-summary-T1.json');
      assert.equal(decision?.status, 'rejected');
      assert.match(decision?.issue_codes ?? '', /DERIVED_SOURCE_EVIDENCE/);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
