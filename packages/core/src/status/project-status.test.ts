import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { validTaskMarkdown, writeBranchDocs } from '../test-support/fixtures.js';
import { getProjectStatus } from './project-status.js';
import { initProject } from '../config/init-project.js';
import { readAgentRuntimeProjectConfig as readProjectConfig } from '../router/agent-runtime-config.js';

const execFileAsync = promisify(execFile);


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
    await rm(root, { recursive: true, force: true });
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
    await rm(root, { recursive: true, force: true });
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
    await rm(root, { recursive: true, force: true });
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
    await rm(root, { recursive: true, force: true });
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
    await rm(root, { recursive: true, force: true });
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
    await rm(root, { recursive: true, force: true });
  }
});
