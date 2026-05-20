import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { setTimeout } from 'node:timers/promises';

import { contextBuildTaskMarkdown, validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { getProjectStatus, getStatuslineProjection } from './project-status.js';
import { initProject } from '../config/init-project.js';
import { readAgentRuntimeProjectConfig as readProjectConfig } from '../router/agent-runtime-config.js';
import { buildContextBuildPackage } from '../context/build-package.js';
import { decideCommandTeamRuntime } from '../registries/command-team-runtime.js';
import { STAGE_RUN_CONTRACT_VERSION, SUBAGENT_DISPATCH_CONTRACT_VERSION, WORKFLOW_HANDOFF_CONTRACT_VERSION } from '../contracts.js';
import { recordStageRunProjection, recordWorkflowHandoffProjection, type StageRun, type WorkflowHandoff } from '../stage-runtime.js';
import { decideContextOffload, evaluateContextLoadSignal, recordContextLoadSignalProjection, recordContextOffloadDecisionProjection } from '../context-offload.js';
import { recordSubagentDispatchProjection, type SubagentDispatch } from '../subagents.js';

const execFileAsync = promisify(execFile);

async function removeTempRoot(root: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(root, { recursive: true, force: true });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EBUSY' || attempt === 4) {
        throw error;
      }
      await setTimeout(100);
    }
  }
}


test('getProjectStatus resolves configured default SDD branch without silent master fallback', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-resolver-'));
  try {
    await initProject(root, { branch: 'feature-x' });
    const config = await readProjectConfig(root);
    const defaultStatus = await getProjectStatus(root);
    const explicitStatus = await getProjectStatus(root, { branch: 'feature-x' });

    assert.equal(config.sdd.default_branch, 'feature-x');
    assert.equal(defaultStatus.context.branch, 'feature-x');
    assert.equal(defaultStatus.context.branchSource, 'project_config');
    assert.equal(defaultStatus.context.specDir, 'specs/feature-x');
    assert.equal(explicitStatus.context.branch, 'feature-x');
    assert.equal(explicitStatus.context.branchSource, 'explicit_option');
    assert.equal(explicitStatus.context.specDir, 'specs/feature-x');
  } finally {
    await removeTempRoot(root);
  }
});

test('getProjectStatus resolves concrete project config branch when no default branch is set', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-config-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'config-branch', '# Tasks\n');
    const configPath = path.join(root, '.sdd', 'project.yml');
    const config = await readFile(configPath, 'utf8');
    await writeFile(configPath, config.replace(/  default_branch: master\n/, '').replace('spec_dir: specs/<branch>', 'spec_dir: specs/config-branch'), 'utf8');

    const status = await getProjectStatus(root);

    assert.equal(status.context.branch, 'config-branch');
    assert.equal(status.context.branchSource, 'project_config');
    assert.equal(status.context.specDir, 'specs/config-branch');
  } finally {
    await removeTempRoot(root);
  }
});

test('Phase 6.4 getProjectStatus resolves current Git branch before project config default', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-git-'));
  try {
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', 'git-branch'], { cwd: root });
    await initProject(root);
    await writeBranchDocs(root, 'git-branch', '# Tasks\n');

    const status = await getProjectStatus(root);

    assert.equal(status.context.rawBranch, 'git-branch');
    assert.equal(status.context.branch, 'git-branch');
    assert.equal(status.context.partition, 'git-branch');
    assert.equal(status.context.branchSource, 'git_branch');
    assert.equal(status.context.specDir, 'specs/git-branch');
    assert.equal(status.workflowStatus, 'active');
  } finally {
    await removeTempRoot(root);
  }
});

test('Phase 6.4 maps slash Git branch names to stable safe partitions', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-git-slash-'));
  const rawBranch = 'feature/login';
  const partition = `feature-login-${createHash('sha256').update(rawBranch).digest('hex').slice(0, 8)}`;
  try {
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['checkout', '-b', rawBranch], { cwd: root });
    await initProject(root);
    await writeBranchDocs(root, partition, '# Tasks\n');

    const status = await getProjectStatus(root);

    assert.equal(status.context.rawBranch, rawBranch);
    assert.equal(status.context.branch, partition);
    assert.equal(status.context.partition, partition);
    assert.equal(status.context.branchSource, 'git_branch');
    assert.equal(status.context.specDir, `specs/${partition}`);
    assert.equal(status.documents.tasksExists, true);
  } finally {
    await removeTempRoot(root);
  }
});

test('Phase 6.4 marks plan and tasks stale after spec revision hash changes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-spec-revision-stale-'));
  try {
    await initProject(root);
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    const spec = '# Spec\n\nInitial requirement.\n';
    const planTemplate = '# Plan\n\nbased_on_spec_hash: pending\n\nInitial plan.\n';
    const specHash = createHash('sha256').update(spec.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
    const plan = planTemplate.replace('pending', specHash);
    const planHash = createHash('sha256').update(plan.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
    await writeFile(path.join(branchDir, 'spec.md'), spec, 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), plan, 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), `${validTaskMarkdown('T1', [])}\nbased_on_plan_hash: ${planHash}\n`, 'utf8');

    const fresh = await getProjectStatus(root, { branch: 'feature' });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n\nChanged requirement.\n', 'utf8');
    const stale = await getProjectStatus(root, { branch: 'feature' });

    assert.equal(fresh.documents.planStale, false);
    assert.equal(fresh.documents.tasksStale, false);
    assert.equal(stale.documents.planStale, true);
    assert.equal(stale.documents.tasksStale, true);
    assert.equal(stale.gaps.some((gap) => gap.field === 'plan.md' && /stale/.test(gap.message)), true);
    assert.equal(stale.gaps.some((gap) => gap.field === 'tasks.md' && /stale/.test(gap.message)), true);
  } finally {
    await removeTempRoot(root);
  }
});

test('getProjectStatus rejects unresolved branch instead of silently using specs master', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-context-no-fallback-'));
  try {
    await initProject(root);
    const configPath = path.join(root, '.sdd', 'project.yml');
    const config = await readFile(configPath, 'utf8');
    await writeFile(configPath, config.replace(/  default_branch: master\n/, ''), 'utf8');

    await assert.rejects(() => getProjectStatus(root), /Cannot resolve SDD branch/);
  } finally {
    await removeTempRoot(root);
  }
});

test('statusline token health uses context and team runtime projections', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-status-token-health-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', contextBuildTaskMarkdown('T1'));
    const unknown = await getStatuslineProjection(root, { branch: 'master' });
    await buildContextBuildPackage(root, { taskId: 'T1', branch: 'master', mode: 'do', agent: 'implementer' });
    const nominal = await getProjectStatus(root, { branch: 'master' });
    await decideCommandTeamRuntime(root, { command: 'recover', activation: 'force', riskTags: ['blocked'] });
    const pressure = await getStatuslineProjection(root, { branch: 'master' });

    assert.equal(unknown.tokenHealth, 'unknown');
    assert.notEqual(nominal.tokenProjection.health, 'unknown');
    assert.equal(nominal.tokenProjection.contextPackages, 1);
    assert.equal(pressure.tokenHealth, 'pressure');
  } finally {
    await removeTempRoot(root);
  }
});

test('getProjectStatus exposes observable workflow handoff projections', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-status-handoff-'));
  try {
    await initProject(root);
    await recordStageRunProjection(root, statusStageRun());
    await recordWorkflowHandoffProjection(root, statusHandoff());

    const status = await getProjectStatus(root, { branch: 'master' });

    assert.equal(status.workflowHandoff.status, 'fresh');
    assert.equal(status.workflowHandoff.latestStageRun?.stage, 'do');
    assert.equal(status.workflowHandoff.latestHandoff?.status, 'accepted');
    assert.equal(status.workflowHandoff.projectionCounts.stageRuns, 1);
    assert.equal(status.workflowHandoff.projectionCounts.handoffs, 1);
  } finally {
    await removeTempRoot(root);
  }
});

test('statusline exposes context offload and subagent dispatch projections', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-status-context-subagent-'));
  try {
    await initProject(root);
    const signal = evaluateContextLoadSignal({
      scope: { branch: 'master', taskId: 'T1', runId: 'run-1' },
      refs: [{ kind: 'document', ref: 'specs/master/tasks.md' }],
      fileCount: 20,
      artifactBytes: 200_000,
      dependencyFanout: 12,
      unknownImpact: true,
      generatedAt: '2026-05-18T00:00:00.000Z'
    });
    await recordContextLoadSignalProjection(root, signal);
    await recordContextOffloadDecisionProjection(root, decideContextOffload(signal, { dispatchRefs: [{ kind: 'projection', ref: 'phase8_subagent_dispatch:master:T1:run-1:none:dispatch-1' }] }));
    await recordSubagentDispatchProjection(root, statusSubagentDispatch());

    const statusline = await getStatuslineProjection(root, { branch: 'master' });

    assert.equal(statusline.contextLoad, 'high');
    assert.equal(statusline.contextAction, 'dispatch-subagent');
    assert.equal(statusline.subagentHealth, 'blocked');
    assert.equal(statusline.counts.subagentDispatches, 1);
    assert.equal(statusline.counts.blockingSubagents, 1);
  } finally {
    await removeTempRoot(root);
  }
});

function statusStageRun(): StageRun {
  return {
    contract: STAGE_RUN_CONTRACT_VERSION,
    id: 'stage-status-do',
    scope: { branch: 'master', taskId: 'T1', runId: 'run-1' },
    stage: 'do',
    ownerAgent: 'implementer',
    coMainAgents: ['reviewer'],
    status: 'completed',
    inputRefs: [{ kind: 'projection', ref: 'phase8_lifecycle_risk_decision:master:T1:run-1:none' }],
    outputRefs: [{ kind: 'artifact', ref: 'artifacts/status-handoff.md' }],
    decisionRefs: [{ kind: 'projection', ref: 'phase8_lifecycle_risk_decision:master:T1:run-1:none' }],
    blockingReasons: [],
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:01:00.000Z'
  };
}

function statusHandoff(): WorkflowHandoff {
  return {
    contract: WORKFLOW_HANDOFF_CONTRACT_VERSION,
    id: 'handoff-status-do-test',
    scope: { branch: 'master', taskId: 'T1', runId: 'run-1' },
    fromStage: 'do',
    toStage: 'test',
    fromAgent: 'implementer',
    toAgent: 'validator',
    status: 'accepted',
    outputRefs: [{ kind: 'artifact', ref: 'artifacts/status-handoff.md' }],
    requiredInputRefs: [{ kind: 'projection', ref: 'phase8_lifecycle_risk_decision:master:T1:run-1:none' }],
    riskDecisionRef: { kind: 'projection', ref: 'phase8_lifecycle_risk_decision:master:T1:run-1:none' },
    evidenceRefs: [{ kind: 'evidence', ref: 'artifacts/status-handoff-validation.md#AC-1' }],
    openQuestions: [],
    blockingGaps: [],
    createdAt: '2026-05-18T00:02:00.000Z',
    decidedAt: '2026-05-18T00:03:00.000Z'
  };
}

function statusSubagentDispatch(): SubagentDispatch {
  return {
    contract: SUBAGENT_DISPATCH_CONTRACT_VERSION,
    id: 'dispatch-1',
    scope: { branch: 'master', taskId: 'T1', runId: 'run-1' },
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
