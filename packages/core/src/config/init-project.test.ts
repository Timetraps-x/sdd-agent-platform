import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { getProjectStatus } from './project-status.js';
import { initProject } from './init-project.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import { readAgentRuntimeProjectConfig as readProjectConfig } from '../router/agent-runtime-config.js';


test('initProject creates readable project config', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-'));
  try {
    const init = await initProject(root);
    assert.equal(init.created, true);
    const config = await readProjectConfig(root);
    assert.equal(config.contract, 'phase-1.2-project-contract');
    assert.equal(config.sdd.docs_language, 'zh-CN');
    assert.equal(config.lifecycle.decision_required, true);
    assert.match(await readFile(init.configPath, 'utf8'), /Project-level SDD document prose language/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject creates starter semantic documents by default', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-docs-'));
  try {
    const init = await initProject(root);
    const spec = await readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8');
    const plan = await readFile(path.join(root, 'specs', 'master', 'plan.md'), 'utf8');
    const tasks = await readFile(path.join(root, 'specs', 'master', 'tasks.md'), 'utf8');
    const verify = await readFile(path.join(root, 'specs', 'master', 'verify.md'), 'utf8');
    const branch = await parseSddBranch(root, 'master');
    const status = await getProjectStatus(root, { branch: 'master' });

    assert.equal(init.documents.branch, 'master');
    assert.equal(init.documents.documents.every((document) => document.status === 'created'), true);
    assert.match(spec, /sdd-init-onboarding-spec-v1/);
    assert.match(spec, /## 1\. Objective \/ Customer Value/);
    assert.match(spec, /## 4\. User Stories \/ Scenarios/);
    assert.match(spec, /\| AC-1 \|/);
    assert.match(spec, /Assumptions \/ Dependencies/);
    assert.match(spec, /Risks \/ Hard Gates/);
    assert.match(spec, /项目入门/);
    assert.match(spec, /仓库在第一个真实变更前/);
    assert.match(plan, /sdd-init-onboarding-plan-v1/);
    assert.match(plan, /## 3\. Current State Analysis/);
    assert.match(plan, /## 5\. Architecture \/ Component Design/);
    assert.match(plan, /```plantuml/);
    assert.match(plan, /Risk-driven Plan Requirements/);
    assert.match(plan, /业务背景与技术背景/);
    assert.match(tasks, /sdd-init-onboarding-tasks-v1/);
    assert.match(tasks, /## 1\. Delivery Map/);
    assert.match(tasks, /acceptance_refs:/);
    assert.match(tasks, /plan_refs:/);
    assert.match(tasks, /allowed_agents:/);
    assert.match(tasks, /required_artifacts:/);
    assert.match(tasks, /verification_availability:/);
    assert.match(tasks, /#### Definition of Done/);
    assert.match(tasks, /#### Evidence Expectations/);
    assert.match(tasks, /Allowed scope 仅限/);
    assert.match(verify, /sdd-init-onboarding-verify-v1/);
    assert.match(verify, /contract: sdd-verify-doc-v1/);
    assert.match(verify, /ONBOARDING-1/);
    assert.match(verify, /不是 runtime evidence/);
    assert.equal(branch.tasks.some((task) => task.id === 'ONBOARDING-1'), true);
    assert.equal(status.documents.specExists, true);
    assert.equal(status.documents.planExists, true);
    assert.equal(status.documents.tasksExists, true);
    assert.equal(status.documents.verifyExists, true);
    assert.equal(status.gaps.some((gap) => gap.type === 'Document Gap'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject falls back to English starter document prose for non-Chinese docs_language', async () => {
  for (const docsLanguage of ['en-US', 'fr-FR']) {
    const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-language-fallback-'));
    try {
      await initProject(root, { scaffoldDocuments: false });
      const configPath = path.join(root, '.sdd', 'project.yml');
      const config = await readFile(configPath, 'utf8');
      await writeFile(configPath, config.replace('docs_language: zh-CN', `docs_language: ${docsLanguage}`), 'utf8');

      await initProject(root);
      const spec = await readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8');
      const plan = await readFile(path.join(root, 'specs', 'master', 'plan.md'), 'utf8');
      const tasks = await readFile(path.join(root, 'specs', 'master', 'tasks.md'), 'utf8');
      const verify = await readFile(path.join(root, 'specs', 'master', 'verify.md'), 'utf8');

      assert.match(spec, /# Spec: Project Onboarding/);
      assert.match(spec, /the repository has a visible SDD entrypoint/);
      assert.match(plan, /business and technical context/);
      assert.match(tasks, /Allowed scope is limited/);
      assert.match(verify, /task-derived verification guidance/);
      assert.doesNotMatch(`${spec}\n${plan}\n${tasks}\n${verify}`, /项目入门|仓库在第一个真实变更前|业务背景与技术背景|Allowed scope 仅限|不是 runtime evidence/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('initProject preserves existing semantic documents by default', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-preserve-'));
  try {
    await mkdir(path.join(root, 'specs', 'master'), { recursive: true });
    await writeFile(path.join(root, 'specs', 'master', 'spec.md'), 'user spec', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'plan.md'), 'user plan', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'tasks.md'), 'user tasks', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'verify.md'), 'user verify', 'utf8');
    const init = await initProject(root);

    assert.equal(await readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8'), 'user spec');
    assert.equal(await readFile(path.join(root, 'specs', 'master', 'plan.md'), 'utf8'), 'user plan');
    assert.equal(await readFile(path.join(root, 'specs', 'master', 'tasks.md'), 'utf8'), 'user tasks');
    assert.equal(await readFile(path.join(root, 'specs', 'master', 'verify.md'), 'utf8'), 'user verify');
    assert.equal(init.documents.documents.every((document) => document.status === 'unchanged'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject force overwrites semantic documents', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-force-'));
  try {
    await mkdir(path.join(root, 'specs', 'master'), { recursive: true });
    await writeFile(path.join(root, 'specs', 'master', 'spec.md'), 'user spec', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'plan.md'), 'user plan', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'tasks.md'), 'user tasks', 'utf8');
    await writeFile(path.join(root, 'specs', 'master', 'verify.md'), 'user verify', 'utf8');
    const init = await initProject(root, { force: true });
    const spec = await readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8');
    const plan = await readFile(path.join(root, 'specs', 'master', 'plan.md'), 'utf8');
    const tasks = await readFile(path.join(root, 'specs', 'master', 'tasks.md'), 'utf8');
    const verify = await readFile(path.join(root, 'specs', 'master', 'verify.md'), 'utf8');

    assert.match(spec, /sdd-init-onboarding-spec-v1/);
    assert.match(plan, /sdd-init-onboarding-plan-v1/);
    assert.match(tasks, /sdd-init-onboarding-tasks-v1/);
    assert.match(verify, /sdd-init-onboarding-verify-v1/);
    assert.equal(init.documents.documents.every((document) => document.status === 'overwritten'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject scaffolds custom branch documents', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-branch-'));
  try {
    const init = await initProject(root, { branch: 'feature-x' });
    const status = await getProjectStatus(root, { branch: 'feature-x' });

    assert.equal(init.documents.branch, 'feature-x');
    assert.match(await readFile(path.join(root, 'specs', 'feature-x', 'tasks.md'), 'utf8'), /id: ONBOARDING-1/);
    assert.match(await readFile(path.join(root, 'specs', 'feature-x', 'verify.md'), 'utf8'), /sdd-init-onboarding-verify-v1/);
    assert.equal(status.documents.specExists, true);
    assert.equal(status.documents.planExists, true);
    assert.equal(status.documents.tasksExists, true);
    assert.equal(status.documents.verifyExists, true);
    assert.equal(status.gaps.some((gap) => gap.type === 'Document Gap'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject can skip semantic document scaffold', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-init-skip-docs-'));
  try {
    const init = await initProject(root, { scaffoldDocuments: false });

    await assert.rejects(readFile(path.join(root, 'specs', 'master', 'spec.md'), 'utf8'), /ENOENT/);
    await assert.rejects(readFile(path.join(root, 'specs', 'master', 'verify.md'), 'utf8'), /ENOENT/);
    assert.equal(init.documents.documents.every((document) => document.status === 'skipped'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject projects managed Claude Code entries by default', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-ai-init-'));
  try {
    const init = await initProject(root);
    const skill = await readFile(path.join(root, '.claude', 'skills', 'sdd', 'SKILL.md'), 'utf8');
    const doctorCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'doctor.md'), 'utf8');

    const specCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'spec.md'), 'utf8');
    const planCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'plan.md'), 'utf8');
    const tasksCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'tasks.md'), 'utf8');
    const doCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'do.md'), 'utf8');
    const testCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'test.md'), 'utf8');
    const syncBackCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'sync-back.md'), 'utf8');
    const shipCommand = await readFile(path.join(root, '.claude', 'commands', 'sdd', 'ship.md'), 'utf8');

    assert.equal(init.aiTools.length, 1);
    assert.equal(init.aiTools[0].entries.some((entry) => entry.status === 'created'), true);
    assert.match(skill, /sdd_contract: sdd-ai-entry-v1/);
    assert.match(skill, /sdd_hash: sha256:/);
    assert.match(skill, /manual `\/sdd` root intent router/);
    assert.match(skill, /do not paste or restate full status/);
    assert.match(skill, /natural-language intent/);
    assert.match(skill, /CLI\/core output/);
    assert.match(skill, /\/sdd:\*/);
    assert.match(skill, /ambiguous after status/);
    assert.match(skill, /sdd tasks inspect <task_id>/);
    assert.match(skill, /sdd sync-back inspect --branch <branch> --task <task_id>/);
    assert.match(skill, /\/sdd:ship/);
    assert.match(skill, /\/sdd:test/);
    assert.match(skill, /follow apply_policy/);
    assert.match(skill, /workflow_status=not_started/);
    assert.match(skill, /workflow branch entry/);
    assert.match(doctorCommand, /sdd instructions doctor --json/);
    assert.match(doctorCommand, /explicit diagnostic scope/);
    await assert.rejects(access(path.join(root, '.claude', 'commands', 'sdd.md')), /ENOENT/);
    await assert.rejects(access(path.join(root, '.claude', 'commands', 'sdd', 'init.md')), /ENOENT/);
    await assert.rejects(access(path.join(root, '.claude', 'commands', 'sdd', 'verify.md')), /ENOENT/);
    await assert.rejects(access(path.join(root, '.claude', 'commands', 'sdd', 'verifies.md')), /ENOENT/);
    await assert.rejects(access(path.join(root, '.claude', 'commands', 'sdd', 'update.md')), /ENOENT/);
    await assert.rejects(access(path.join(root, '.claude', 'commands', 'sdd', 'instructions.md')), /ENOENT/);
    assert.equal(init.aiTools[0].entries.some((entry) => entry.id === 'sdd-root'), false);
    assert.equal(init.aiTools[0].entries.some((entry) => entry.id === 'sdd-init'), false);
    assert.equal(init.aiTools[0].entries.some((entry) => entry.id === 'sdd-verify'), false);
    assert.equal(init.aiTools[0].entries.some((entry) => entry.id === 'sdd-verifies'), false);
    assert.equal(init.aiTools[0].entries.some((entry) => entry.id === 'sdd-update'), false);
    assert.equal(init.aiTools[0].entries.some((entry) => entry.id === 'sdd-instructions'), false);
    assert.match(specCommand, /sdd instructions spec --json/);
    assert.match(planCommand, /sdd instructions plan --json/);
    assert.match(tasksCommand, /sdd instructions tasks --json/);
    assert.match(tasksCommand, /sdd tasks format/);
    assert.match(tasksCommand, /acceptance_refs and plan_refs/);
    assert.match(tasksCommand, /required_artifacts, verification_availability, autonomy/);
    assert.match(tasksCommand, /metadata inside the ```sdd-task fenced block/);
    assert.match(specCommand, /workflow partition entry/);
    assert.match(specCommand, /not a technical design/);
    assert.match(planCommand, /Refine the existing SDD plan document/);
    assert.match(planCommand, /deliverable technical solution/);
    assert.match(planCommand, /based_on_spec_hash/);
    assert.match(planCommand, /PlantUML/);
    assert.match(planCommand, /state-machine risk needs a state diagram/);
    assert.match(tasksCommand, /executable evidence contract/);
    assert.match(tasksCommand, /based_on_plan_hash/);
    assert.match(doCommand, /sdd status/);
    assert.match(doCommand, /sdd instructions do --json/);
    assert.match(doCommand, /sdd tasks inspect <task_id>/);
    assert.match(doCommand, /artifacts\/implement-<task_id>\.md/);
    assert.match(doCommand, /--agent implementer/);
    assert.match(doCommand, /sdd do task <task_id>/);
    assert.match(doCommand, /sdd test task <task_id> --branch <branch>/);
    assert.match(testCommand, /sdd instructions test --json/);
    assert.match(testCommand, /sdd verifies inspect --branch <branch>/);
    assert.match(testCommand, /Execute task validation commands/);
    assert.match(syncBackCommand, /sdd instructions sync-back --json/);
    assert.match(syncBackCommand, /sdd sync-back inspect --branch <branch> --task <task_id>/);
    assert.match(syncBackCommand, /approval_required=true/);
    assert.match(syncBackCommand, /Do not apply without inspect/);
    assert.match(shipCommand, /sdd instructions ship --json/);
    assert.match(shipCommand, /sdd ship --branch <branch> --dry-run/);
    assert.match(shipCommand, /does not authorize npm publish/);
    assert.match(shipCommand, /statusline --branch <branch>/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject detects Maven multi-module Java projects', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-maven-'));
  try {
    await writeFile(path.join(root, 'pom.xml'), '<project><packaging>pom</packaging><modules><module>emp-api</module></modules></project>');
    await initProject(root);
    const config = await readProjectConfig(root);
    assert.equal(config.project.language, 'java');
    assert.equal(config.project.framework, 'ssm-maven-multimodule');
    assert.deepEqual(config.validation.default, ['mvn compile']);
    assert.equal(config.detection?.primary, 'java-ssm-maven-multimodule');
    assert.equal(config.detection?.confidence, 'medium');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initProject classifies mixed Java and Node repos by source evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-runtime-mixed-'));
  try {
    await writeFile(path.join(root, 'pom.xml'), '<project><packaging>pom</packaging><modules><module>emp-api</module></modules><dependencies><dependency><groupId>org.springframework</groupId></dependency><dependency><groupId>org.mybatis</groupId></dependency></dependencies></project>');
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'tooling-only', devDependencies: { typescript: '^5.0.0' } }));
    await mkdir(path.join(root, 'emp-api', 'src', 'main', 'java', 'com', 'emp'), { recursive: true });
    await mkdir(path.join(root, 'emp-api', 'src', 'main', 'resources'), { recursive: true });
    await writeFile(path.join(root, 'emp-api', 'src', 'main', 'java', 'com', 'emp', 'ApiController.java'), 'class ApiController {}');
    await writeFile(path.join(root, 'emp-api', 'src', 'main', 'resources', 'applicationContext.xml'), '<beans></beans>');
    await initProject(root);
    const config = await readProjectConfig(root);
    assert.equal(config.project.language, 'java');
    assert.equal(config.project.framework, 'ssm-maven-multimodule');
    assert.deepEqual(config.validation.default, ['mvn compile']);
    assert.equal(config.detection?.mixed_stack, true);
    assert.equal(config.detection?.candidates.some((candidate) => candidate.id === 'typescript-node'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
