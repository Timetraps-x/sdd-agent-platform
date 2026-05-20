import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { validateSddResultArtifact } from '../artifacts/sdd-result.js';
import { initProject } from '../config/init-project.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { createRun } from '../run-state/run-state.js';
import { contextBuildTaskMarkdown, validResultArtifact, validTaskMarkdown, validTrustEvidence, writeBranchDocs } from '../test-support/fixtures.js';
import { bindTestRunState } from '../test-support/run-state.js';
import { getRuntimeStorePath } from '../runtime-paths.js';
import { buildContextBuildPackage } from './build-package.js';
import { contextBudgetForProfile, parseContextProfile } from './budget.js';
import { summarizeCommandOutput } from './command-summary.js';
import { buildEvidenceSummaryProjection } from './evidence-summary.js';
import { validateLogWorkerSummary } from './log-worker.js';

test('context budget contracts are JSON-renderable and non-authoritative', () => {
  const budget = contextBudgetForProfile(parseContextProfile('brief'));
  assert.equal(budget.contract, 'phase-6.10-context-budget-v1');
  assert.equal(budget.profile, 'brief');
  assert.ok(JSON.stringify(budget).includes('current_task'));

  const summary = summarizeCommandOutput('line one\nERROR blocked by missing artifact\nPASS later line', {
    path: '.sdd/runs/run-1/log.txt',
    hash: 'abc123',
    kind: 'command_output'
  });
  assert.equal(summary.contract, 'sdd-command-output-summary-v1');
  assert.equal(summary.authoritative, false);
  assert.equal(summary.usableForPass, false);
  assert.equal(summary.status, 'BLOCKED');
  assert.ok(summary.omittedLines >= 0);
});

test('evidence summary projection is hash-backed and not usable for PASS', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-evidence-summary-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'summary-run' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    await writeArtifact(root, state.runId, 'validation-T1.md', `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}${validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md')}`);

    const summary = await buildEvidenceSummaryProjection(root, { runId: state.runId, taskId: 'T1' });
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const projection = db.prepare('SELECT projection_type, scope_key, payload_json FROM projections WHERE projection_type = ?').get('evidence_summary') as { projection_type?: string; scope_key?: string; payload_json?: string } | undefined;
      const payload = JSON.parse(projection?.payload_json ?? '{}') as { contract?: string; authoritative?: boolean; usableForPass?: boolean; taskId?: string };
      assert.equal(summary.contract, 'sdd-evidence-summary-v1');
      assert.equal(summary.authoritative, false);
      assert.equal(summary.usableForPass, false);
      assert.equal(summary.taskId, 'T1');
      assert.ok(summary.sources.some((source) => source.path.endsWith('runtime.sqlite') && source.kind === 'run_state' && source.hash.length === 64));
      assert.ok(summary.sources.some((source) => source.path.endsWith('.sdd/runs/master/evidence/artifacts/validation-T1.md') && source.kind === 'artifact'));
      assert.ok(summary.policyRefs.some((ref) => ref.includes('reject-derived-source-evidence')));
      assert.equal(projection?.scope_key, 'summary-run:T1');
      assert.equal(payload.contract, 'sdd-evidence-summary-v1');
      assert.equal(payload.authoritative, false);
      assert.equal(payload.usableForPass, false);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('context build packages differ by mode and agent while remaining derived guidance', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-build-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', contextBuildTaskMarkdown('T1'));
    const implementerPackage = await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'do', agent: 'implementer' });
    const validatorPackage = await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'verify', agent: 'validator' });
    const db = new DatabaseSync(getRuntimeStorePath(root), { readOnly: true });
    try {
      const projections = db.prepare('SELECT projection_type, scope_key, payload_json FROM projections WHERE projection_type = ? ORDER BY scope_key').all('context_build') as Array<{ projection_type?: string; scope_key?: string; payload_json?: string }>;
      const payloads = projections.map((projection) => JSON.parse(projection.payload_json ?? '{}') as { contract?: string; authoritative?: boolean; usableForPass?: boolean; budget?: { estimatedBytes?: number; maxBytes?: number; includedRefs?: unknown[]; deferredRefs?: unknown[]; excludedRefs?: unknown[] } });
      assert.equal(implementerPackage.contract, 'sdd-context-package-v1');
      assert.equal(implementerPackage.authoritative, false);
      assert.equal(implementerPackage.usableForPass, false);
      assert.ok(implementerPackage.mustRead.some((ref) => ref.path.endsWith('tasks.md')));
      assert.ok(implementerPackage.mustRead.some((ref) => ref.path === 'packages/core/src/index.ts'));
      assert.ok(validatorPackage.mustRead.some((ref) => ref.path === 'artifacts/validation-T1.md'));
      assert.notDeepEqual(implementerPackage.mustRead.map((ref) => ref.path), validatorPackage.mustRead.map((ref) => ref.path));
      assert.ok(validatorPackage.warnings.some((warning) => warning.includes('cannot satisfy PASS evidence')));
      assert.ok(validatorPackage.nextCommands.includes('sdd test task T1 --branch master'));
      assert.equal(validatorPackage.nextCommands.some((command) => command.startsWith('sdd verify task')), false);
      assert.ok(implementerPackage.budget.estimatedBytes <= implementerPackage.budget.maxBytes);
      assert.ok(implementerPackage.budget.estimatedTokens > 0);
      assert.ok(implementerPackage.budget.includedRefs.some((ref) => ref.path.endsWith('tasks.md')));
      assert.ok(implementerPackage.budget.deferredRefs.length > 0);
      assert.ok(implementerPackage.budget.excludedRefs.length > 0);
      assert.equal(projections.length, 2);
      assert.ok(projections.some((projection) => projection.scope_key === 'master:T1:do:implementer:brief'));
      assert.ok(projections.some((projection) => projection.scope_key === 'master:T1:verify:validator:brief'));
      assert.equal(payloads.every((payload) => payload.contract === 'sdd-context-package-v1' && payload.authoritative === false && payload.usableForPass === false), true);
      assert.equal(payloads.every((payload) => typeof payload.budget?.estimatedBytes === 'number' && Array.isArray(payload.budget.includedRefs) && Array.isArray(payload.budget.deferredRefs)), true);
    } finally {
      db.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('context build packages scope materials by runtime role without PASS authority', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-build-roles-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', contextBuildTaskMarkdown('T1'));
    const implementerPackage = await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'do', agent: 'implementer' });
    const reviewerPackage = await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'do', agent: 'reviewer' });
    const validatorPackage = await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'do', agent: 'validator' });
    const curatorPackage = await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'do', agent: 'context-curator' });

    assert.equal(implementerPackage.role, 'implementer');
    assert.equal(reviewerPackage.role, 'reviewer');
    assert.equal(validatorPackage.role, 'validator');
    assert.equal(curatorPackage.role, 'context-curator');
    assert.equal([implementerPackage, reviewerPackage, validatorPackage, curatorPackage].every((contextPackage) => contextPackage.authoritative === false && contextPackage.usableForPass === false), true);
    assert.ok(implementerPackage.mustRead.some((ref) => ref.path === 'packages/core/src/index.ts'));
    assert.ok(reviewerPackage.mustRead.some((ref) => ref.path === '.sdd/run-index.json'));
    assert.ok(validatorPackage.mustRead.some((ref) => ref.path === 'artifacts/validation-T1.md'));
    assert.ok(curatorPackage.mustRead.some((ref) => ref.path.endsWith('spec.md')));
    assert.ok(curatorPackage.mustRead.some((ref) => ref.path === '.sdd/cache/routes'));
    assert.notDeepEqual(implementerPackage.mustRead.map((ref) => ref.path), reviewerPackage.mustRead.map((ref) => ref.path));
    assert.notDeepEqual(validatorPackage.mustRead.map((ref) => ref.path), curatorPackage.mustRead.map((ref) => ref.path));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('derived context projections and log workers cannot claim authority', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-derived-context-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'derived-run' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    const derivedArtifact = `${validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md')}




\`\`\`sdd-evidence
contract: sdd-evidence-v1
version: 1.0.0
task: T1
acceptance: AC-1
status: PASS
claim: derived summary tries to pass
source_artifact: artifacts/evidence-summary-T1.json
evidence_refs:
  - artifact:artifacts/context-package-T1.json
provenance_refs:
  - artifact:artifacts/log-worker-summary-T1.json
policy_refs:
  - acceptance-policy-v1:require-source-evidence
\`\`\`
`;
    await writeArtifact(root, state.runId, 'validation-T1.md', derivedArtifact);
    const validation = await validateSddResultArtifact(root, state.runId, 'artifacts/validation-T1.md', { expectedTask: 'T1', expectedAgent: 'validator' });

    assert.equal(validation.valid, false);
    assert.ok(validation.issues.some((issue) => issue.message.includes('DERIVED_SOURCE_EVIDENCE')));

    const workerValidation = validateLogWorkerSummary({
      contract: 'sdd-log-worker-summary-v1',
      authoritative: false,
      usableForPass: false,
      runId: state.runId,
      taskId: 'T1',
      workerId: 'log-worker-1',
      sources: [],
      highlights: ['captured log'],
      forbiddenAuthority: ['doctor verdict']
    });
    assert.equal(workerValidation.valid, false);
    assert.ok(workerValidation.issues.some((issue) => issue.field === 'forbiddenAuthority'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
