import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { ingestArtifactResult } from '../artifacts/ingestion.js';
import { initProject } from '../config/init-project.js';
import { createDelegationRecord } from '../delegation/validation.js';
import { writeArtifact } from '../run-state/artifacts.js';
import { appendEvent, readRunEvents } from '../run-state/events.js';
import { rebuildLocalRunIndex } from '../run-state/run-index.js';
import { archiveRun, createRun, readRunState, writeRunState } from '../run-state/run-state.js';
import { validResultArtifact, validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { bindTestRunState } from '../test-support/run-state.js';
import { STAGE_RUN_CONTRACT_VERSION, SUBAGENT_DISPATCH_CONTRACT_VERSION, WORKFLOW_HANDOFF_CONTRACT_VERSION, type RuntimeScope } from '../contracts.js';
import { recordStageRunProjection, recordWorkflowHandoffProjection, type StageRun, type WorkflowHandoff } from '../stage-runtime.js';
import { decideContextOffload, evaluateContextLoadSignal, recordContextLoadSignalProjection, recordContextOffloadDecisionProjection } from '../context-offload.js';
import { recordSubagentDispatchProjection, type SubagentDispatch } from '../subagents.js';
import { runShip } from '../lifecycle/ship.js';
import { withRuntimeStore } from '../storage/runtime-store.js';
import { doctor } from './doctor.js';

const execFileAsync = promisify(execFile);


test('doctor reports AI entry drift after init', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-drift-'));
  try {
    await initProject(root);
    const skillPath = path.join(root, '.claude', 'skills', 'sdd', 'SKILL.md');
    await writeFile(skillPath, `${await readFile(skillPath, 'utf8')}\nmanual drift\n`, 'utf8');

    const report = await doctor(root);

    assert.equal(report.status, 'FAIL');
    assert.equal(report.checks.some((check) => check.check === 'ai_entry_sdd' && check.level === 'FAIL' && /will not overwrite user-modified/.test(check.action ?? '')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports missing git repo as fail in temp directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    await initProject(root);
    const report = await doctor(root);
    assert.equal(report.status, 'FAIL');
    assert.equal(report.checks.some((check) => check.check === 'git_repo' && check.level === 'FAIL'), true);
    assert.equal(report.checks.some((check) => check.check === 'git_repo' && /git init/.test(check.action ?? '')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports broken document-chain refs and high-risk evidence gaps', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-document-chain-doctor-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks

### D1: Broken document chain

\`\`\`sdd-task
id: D1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-404
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
risk:
  - database
\`\`\`

#### Boundary

Stay inside document-chain checks.

#### Acceptance

- Broken ref is detected.
`);
    await writeFile(path.join(root, 'specs', 'master', 'spec.md'), '# Spec\n\n| ID | Acceptance |\n|---|---|\n| AC-1 | Existing acceptance. |\n', 'utf8');

    const report = await doctor(root, { latestOnly: true });

    assert.equal(report.checks.some((check) => check.check === 'document_chain_acceptance_ref' && check.level === 'FAIL' && /AC-404/.test(check.message)), true);
    assert.equal(report.checks.some((check) => check.check === 'document_chain_high_risk_evidence' && check.level === 'FAIL' && /D1/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports local run index drift with rebuild action', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-local-index-doctor-'));
  try {
    await initProject(root);
    const run = await createRun(root, { runId: 'run-1' });
    await rebuildLocalRunIndex(root);
    await writeRunState(root, { ...run, status: 'completed', tasks: { T2: { status: 'completed' } } });

    const report = await doctor(root);

    assert.equal(report.checks.some((check) => check.check === 'local_run_index' && check.level === 'WARN' && /rebuild/.test(check.action ?? '')), true);
    assert.equal(report.checks.some((check) => check.check === 'local_run_index_contract' && check.level === 'PASS'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports artifact writes attached to unscoped runs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-artifact-scope-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    await writeArtifact(root, state.runId, 'review-T1.md', validResultArtifact('reviewer', 'T1', 'PASS', 'artifacts/review-T1.md'));

    const report = await doctor(root, { allRuns: true });

    assert.equal(report.checks.some((check) => check.check === 'artifact_scope' && check.level === 'FAIL' && /unscoped run/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports stale delegation and terminal event gaps without auto-fix', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-hardening-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const stale = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md',
      startedAt: '2020-01-01T00:00:00.000Z',
      timeoutSeconds: 1
    });
    const completed = createDelegationRecord({
      delegationId: 'D-T1-validator-001',
      task: 'T1',
      agent: 'validator',
      expectedArtifact: 'artifacts/validation-T1.md',
      status: 'COMPLETED'
    });
    await writeRunState(root, { ...state, delegations: { [stale.delegationId]: stale, [completed.delegationId]: completed } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: stale.delegationId } });

    const report = await doctor(root);

    assert.equal(report.status, 'FAIL');
    assert.equal(report.checks.some((check) => check.check === 'stale_delegation'), true);
    assert.equal(report.checks.some((check) => check.check === 'terminal_event_missing'), true);
    assert.equal(report.checks.some((check) => check.check === 'artifact_invalid'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('archiveRun cancels running delegations and normal doctor skips archived evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-archive-run-'));
  try {
    await initProject(root);
    const state = await createRun(root, { runId: 'run-1' });
    const running = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md',
      startedAt: '2020-01-01T00:00:00.000Z',
      timeoutSeconds: 1
    });
    await writeRunState(root, { ...state, delegations: { [running.delegationId]: running } });
    await appendEvent(root, state.runId, { event: 'delegation_started', runId: state.runId, data: { delegationId: running.delegationId } });

    const archived = await archiveRun(root, state.runId, { reason: 'exploratory failure' });
    const normalDoctor = await doctor(root);
    const allRunsDoctor = await doctor(root, { allRuns: true });
    const events = await readRunEvents(root, state.runId);

    assert.equal(archived.status, 'archived');
    assert.equal(archived.delegations[running.delegationId].status, 'CANCELLED');
    assert.equal(events.some((event) => event.event === 'delegation_cancelled'), true);
    assert.equal(events.some((event) => event.event === 'run_archived'), true);
    assert.equal(normalDoctor.checks.some((check) => check.check === 'stale_delegation'), false);
    assert.equal(normalDoctor.checks.some((check) => check.check === 'run_evidence_scope'), true);
    assert.equal(allRunsDoctor.checks.some((check) => check.check === 'stale_delegation'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor latestOnly ignores older failed run evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-latest-only-'));
  try {
    await initProject(root);
    const older = await createRun(root, { runId: 'run-older' });
    const newer = await createRun(root, { runId: 'run-newer' });
    const stale = createDelegationRecord({
      delegationId: 'D-T1-reviewer-001',
      task: 'T1',
      agent: 'reviewer',
      expectedArtifact: 'artifacts/review-T1.md',
      startedAt: '2020-01-01T00:00:00.000Z',
      timeoutSeconds: 1
    });
    await writeRunState(root, { ...older, updatedAt: '2026-05-01T00:00:00.000Z', delegations: { [stale.delegationId]: stale } });
    await writeRunState(root, { ...newer, updatedAt: '2026-05-02T00:00:00.000Z' });
    await appendEvent(root, older.runId, { event: 'delegation_started', runId: older.runId, data: { delegationId: stale.delegationId } });

    const latestOnly = await doctor(root, { latestOnly: true });
    const allRuns = await doctor(root, { allRuns: true });

    assert.equal(latestOnly.checks.some((check) => check.check === 'stale_delegation'), false);
    assert.equal(latestOnly.checks.some((check) => check.check === 'run_evidence_fast_path'), true);
    assert.equal(allRuns.checks.some((check) => check.check === 'stale_delegation'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor trust suite flags mention-only acceptance and weak validator PASS artifacts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-trust-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'feature', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'feature', 'T1');
    await writeArtifact(root, state.runId, 'validation-T1.md', validResultArtifact('validator', 'T1', 'PASS', 'artifacts/validation-T1.md'));
    const restored = await readRunState(root, state.runId);
    await writeRunState(root, {
      ...restored,
      status: 'completed',
      validation: {
        status: 'pass',
        commands: ['npm test'],
        evidence: ['artifacts/validation-T1.md']
      },
      tasks: {
        T1: {
          status: 'verified',
          verifyStatus: 'PASS',
          gaps: [],
          artifacts: ['artifacts/validation-T1.md'],
          acceptanceCoverage: [{ acceptance: 'AC-1', status: 'PASS', evidence: 'Mentioned in artifacts/validation-T1.md.' }]
        }
      },
      artifacts: [{ path: 'artifacts/validation-T1.md', kind: 'validation', task: 'T1', agent: 'validator', createdAt: new Date().toISOString() }]
    });

    const report = await doctor(root, { allRuns: true, branch: 'feature' });

    assert.equal(report.checks.some((check) => check.check === 'acceptance_trust' && check.level === 'FAIL'), true);
    assert.equal(report.checks.some((check) => check.check === 'artifact_trust' && check.level === 'FAIL' && /UNSOURCED_PASS/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports artifact ingestion state mismatch', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-artifact-ingest-doctor-'));
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
    const ingested = await ingestArtifactResult(root, state.runId, { delegationId: delegation.delegationId, artifactPath: 'artifacts/review-T1.md' });
    const acceptedState = await readRunState(root, state.runId);
    await writeRunState(root, {
      ...acceptedState,
      artifacts: [],
      artifactIngestions: {
        [`${delegation.delegationId}:artifacts/review-T1.md`]: ingested.record
      }
    });

    const report = await doctor(root);

    assert.equal(report.status, 'FAIL');
    assert.equal(report.checks.some((check) => check.check === 'artifact_result_ingestion' && /missing from run artifact index/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor honors explicit branch for document-chain scope', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-branch-'));
  try {
    await initProject(root);
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', 'other'], { cwd: root });

    const report = await doctor(root, { latestOnly: true, branch: 'master' });

    assert.equal(report.checks.some((check) => /Document chain skipped for other/.test(check.message)), false);
    assert.equal(report.checks.some((check) => check.check.startsWith('document_chain')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports workflow handoff state diagnostics', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-handoff-'));
  try {
    await initProject(root);
    await recordStageRunProjection(root, doctorStageRun());
    await recordWorkflowHandoffProjection(root, doctorHandoff());

    const report = await doctor(root, { latestOnly: true, branch: 'master' });

    assert.equal(report.checks.some((check) => check.check === 'workflow_handoff_state' && check.level === 'PASS' && /status=fresh/.test(check.message)), true);
    assert.equal(report.checks.some((check) => check.check === 'workflow_handoff_state' && /do->test:accepted/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports context offload and subagent dispatch state diagnostics', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-context-subagent-'));
  try {
    await initProject(root);
    const signal = evaluateContextLoadSignal({
      scope: doctorScope,
      refs: [{ kind: 'document', ref: 'specs/master/tasks.md' }],
      fileCount: 20,
      artifactBytes: 200_000,
      dependencyFanout: 12,
      unknownImpact: true,
      generatedAt: '2026-05-18T00:00:00.000Z'
    });
    await recordContextLoadSignalProjection(root, signal);
    await recordContextOffloadDecisionProjection(root, decideContextOffload(signal, { dispatchRefs: [{ kind: 'projection', ref: 'phase8_subagent_dispatch:master:T1:run-1:none:dispatch-1' }] }));
    await recordSubagentDispatchProjection(root, doctorSubagentDispatch());

    const report = await doctor(root, { latestOnly: true, branch: 'master' });

    assert.equal(report.checks.some((check) => check.check === 'context_offload_state' && check.level === 'PASS' && /level=high action=dispatch-subagent/.test(check.message)), true);
    assert.equal(report.checks.some((check) => check.check === 'subagent_dispatch_state' && check.level === 'FAIL' && /status=blocked/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('archived failed subagent dispatch no longer blocks doctor or ship subagent gates', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-archived-subagent-'));
  try {
    await initProject(root);
    await createRun(root, { runId: 'run-1' });
    await recordSubagentDispatchProjection(root, {
      ...doctorSubagentDispatch(),
      status: 'failed',
      updatedAt: '2026-05-18T00:02:00.000Z'
    });
    const failed = await doctor(root, { latestOnly: true, branch: 'master' });
    assert.equal(failed.checks.some((check) => check.check === 'subagent_dispatch_state' && check.level === 'FAIL' && /status=failed/.test(check.message)), true);

    await archiveRun(root, 'run-1', { reason: 'failed subagent superseded by rerun' });
    const recovered = await doctor(root, { latestOnly: true, branch: 'master' });
    const ship = await runShip(root, { branch: 'master', dryRun: true });

    assert.equal(recovered.checks.some((check) => check.check === 'subagent_dispatch_state' && check.level === 'PASS' && /status=missing/.test(check.message)), true);
    assert.equal(ship.checks.some((check) => check.name === 'subagent_dispatches' && check.status === 'PASS' && /status=missing/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports unavailable Phase 8 runtime checks as warnings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-doctor-runtime-unavailable-'));
  try {
    await initProject(root);
    await withRuntimeStore(root, ({ db }) => {
      db.prepare('INSERT INTO projections (projection_id, projection_type, scope_key, generated_at, payload_json) VALUES (?, ?, ?, ?, ?)')
        .run('bad-context-build', 'context_build', 'master:T1:run-1:none', new Date().toISOString(), '{');
    });

    const report = await doctor(root, { latestOnly: true, branch: 'master' });

    assert.equal(report.checks.some((check) => check.check === 'lifecycle_risk_decision' && check.level === 'WARN' && /unavailable/.test(check.message)), true);
    assert.equal(report.checks.some((check) => check.check === 'workflow_handoff_state' && check.level === 'WARN' && /unavailable/.test(check.message)), true);
    assert.equal(report.checks.some((check) => check.check === 'context_offload_state' && check.level === 'WARN' && /unavailable/.test(check.message)), true);
    assert.equal(report.checks.some((check) => check.check === 'subagent_dispatch_state' && check.level === 'WARN' && /unavailable/.test(check.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ship reports token pressure as diagnostic pass', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ship-token-diagnostic-'));
  try {
    await initProject(root);
    await withRuntimeStore(root, ({ db }) => {
      db.prepare('INSERT INTO projections (projection_id, projection_type, scope_key, generated_at, payload_json) VALUES (?, ?, ?, ?, ?)')
        .run('context-build-pressure', 'context_build', 'master:T1:run-1:none', '2026-05-18T00:00:00.000Z', JSON.stringify({
          taskId: 'T1',
          profile: 'normal',
          budget: { estimatedBytes: 900, maxBytes: 1000, estimatedTokens: 225 }
        }));
    });

    const ship = await runShip(root, { branch: 'master', dryRun: true });
    const tokenCheck = ship.checks.find((check) => check.name === 'token_health');

    assert.equal(tokenCheck?.status, 'PASS');
    assert.match(tokenCheck?.message ?? '', /token_health=pressure/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ship blocks validated runs until sync-back is applied', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ship-syncback-required-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', validTaskMarkdown('T1', []));
    const state = await createRun(root, { runId: 'run-1' });
    await bindTestRunState(root, state.runId, 'master', 'T1');
    const bound = await readRunState(root, state.runId);
    await writeRunState(root, {
      ...bound,
      status: 'completed',
      validation: {
        status: 'pass',
        commands: ['npm test'],
        evidence: []
      }
    });

    const ship = await runShip(root, { branch: 'master', dryRun: true });
    const latestRunCheck = ship.checks.find((check) => check.name === 'latest_run');

    assert.equal(latestRunCheck?.status, 'BLOCKED');
    assert.match(latestRunCheck?.message ?? '', /sync_back=not_created/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ship still blocks context offload curation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ship-context-curation-'));
  try {
    await initProject(root);
    const signal = evaluateContextLoadSignal({
      scope: doctorScope,
      fileCount: 50,
      artifactBytes: 600_000,
      dependencyFanout: 30,
      unknownImpact: true,
      generatedAt: '2026-05-18T00:00:00.000Z'
    });
    await recordContextLoadSignalProjection(root, signal);
    await recordContextOffloadDecisionProjection(root, decideContextOffload(signal));

    const ship = await runShip(root, { branch: 'master', dryRun: true });
    const contextCheck = ship.checks.find((check) => check.name === 'context_offload');

    assert.equal(contextCheck?.status, 'BLOCKED');
    assert.match(contextCheck?.message ?? '', /action=block-for-curation/);
    assert.equal(ship.nextActions.some((action) => /Curate context before ship/.test(action)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const doctorScope: RuntimeScope = { branch: 'master', taskId: 'T1', runId: 'run-1' };

function doctorStageRun(): StageRun {
  return {
    contract: STAGE_RUN_CONTRACT_VERSION,
    id: 'doctor-stage-do',
    scope: doctorScope,
    stage: 'do',
    ownerAgent: 'implementer',
    coMainAgents: ['reviewer'],
    status: 'completed',
    inputRefs: [{ kind: 'projection', ref: 'phase8_lifecycle_risk_decision:master:T1:run-1:none' }],
    outputRefs: [{ kind: 'artifact', ref: 'artifacts/doctor-handoff.md' }],
    decisionRefs: [{ kind: 'projection', ref: 'phase8_lifecycle_risk_decision:master:T1:run-1:none' }],
    blockingReasons: [],
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:01:00.000Z'
  };
}

function doctorHandoff(): WorkflowHandoff {
  return {
    contract: WORKFLOW_HANDOFF_CONTRACT_VERSION,
    id: 'doctor-handoff-do-test',
    scope: doctorScope,
    fromStage: 'do',
    toStage: 'test',
    fromAgent: 'implementer',
    toAgent: 'validator',
    status: 'accepted',
    outputRefs: [{ kind: 'artifact', ref: 'artifacts/doctor-handoff.md' }],
    requiredInputRefs: [{ kind: 'projection', ref: 'phase8_lifecycle_risk_decision:master:T1:run-1:none' }],
    riskDecisionRef: { kind: 'projection', ref: 'phase8_lifecycle_risk_decision:master:T1:run-1:none' },
    evidenceRefs: [{ kind: 'evidence', ref: 'artifacts/doctor-handoff-validation.md#AC-1' }],
    openQuestions: [],
    blockingGaps: [],
    createdAt: '2026-05-18T00:02:00.000Z',
    decidedAt: '2026-05-18T00:03:00.000Z'
  };
}

function doctorSubagentDispatch(): SubagentDispatch {
  return {
    contract: SUBAGENT_DISPATCH_CONTRACT_VERSION,
    id: 'dispatch-1',
    scope: doctorScope,
    workUnitId: 'wu-subagent-1',
    definitionName: 'test-writer',
    mode: 'background',
    status: 'queued',
    blocking: true,
    requiredBefore: 'handoff',
    contextRef: { kind: 'projection', ref: 'sdd-scoped-context-handoff:T1' },
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:01:00.000Z'
  };
}
