import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { validTaskMarkdown } from '../test-support/fixtures.js';
import { inspectSddTask } from './task-inspection.js';
import { parseSddBranch, parseSddTasksMarkdown } from './task-parser.js';
import { renderTaskGapReport } from './task-rendering.js';

test('parseSddTasksMarkdown extracts task metadata and companion sections', () => {
  const markdown = `# Tasks

### T1: Parser foundation

\`\`\`sdd-task
id: T1
status: pending
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test => AC-1, AC-2
risk:
  - parser boundary
\`\`\`

#### Boundary

Only parse Markdown metadata; do not execute tasks.

#### Acceptance

- Task metadata is structured.
- Boundary is retained.

#### Implementation Notes

None yet.
`;
  const model = parseSddTasksMarkdown(markdown, { tasksPath: 'specs/master/tasks.md' });

  assert.equal(model.gaps.length, 0);
  assert.equal(model.tasks.length, 1);
  assert.equal(model.tasks[0].id, 'T1');
  assert.equal(model.tasks[0].status, 'pending');
  assert.equal(model.tasks[0].wave, 1);
  assert.deepEqual(model.tasks[0].dependsOn, []);
  assert.deepEqual(model.tasks[0].affectedFiles, ['packages/core/src/index.ts']);
  assert.deepEqual(model.tasks[0].validation, ['npm test']);
  assert.deepEqual(model.tasks[0].validationCommands, [{ command: 'npm test', acceptanceRefs: ['AC-1', 'AC-2'], raw: 'npm test => AC-1, AC-2' }]);
  assert.deepEqual(model.tasks[0].risk, ['parser boundary']);
  assert.match(model.tasks[0].boundary ?? '', /Only parse Markdown metadata/);
  assert.deepEqual(model.tasks[0].acceptance, ['Task metadata is structured.', 'Boundary is retained.']);
});

test('parseSddTasksMarkdown does not leak companion sections across indented task headings', () => {
  const markdown = `# Tasks

  ### ERP-SCRK-1: 固化入库同步状态机边界

\`\`\`sdd-task
id: ERP-SCRK-1
status: pending
wave: 1
depends_on: []
affected_files:
  - src/main/java/com/acme/erp/InboundSyncService.java
validation:
  - mvn test -Dtest=InboundSyncServiceTest
risk:
  - state-machine
\`\`\`

#### Boundary

Only state-machine logic.

#### Acceptance

- Terminal states never roll back.

  ### ERP-SCRK-2: 移除 Mapper SQL 拼接

\`\`\`sdd-task
id: ERP-SCRK-2
status: pending
wave: 2
depends_on:
  - ERP-SCRK-1
affected_files:
  - src/main/java/com/acme/erp/InboundSyncMapper.java
validation:
  - mvn test
risk:
  - sql
\`\`\`

#### Boundary

Only mapper SQL parameterization.

#### Acceptance

- Mapper has no SQL string concatenation.
`;
  const model = parseSddTasksMarkdown(markdown, { tasksPath: 'specs/master/tasks.md' });

  assert.equal(model.gaps.length, 0);
  assert.equal(model.tasks.length, 2);
  assert.deepEqual(model.tasks[0].acceptance, ['Terminal states never roll back.']);
  assert.deepEqual(model.tasks[1].acceptance, ['Mapper has no SQL string concatenation.']);
  assert.doesNotMatch(model.tasks[0].boundary ?? '', /Mapper SQL/);
});

test('parseSddTasksMarkdown reports task metadata and dependency gaps', () => {
  const markdown = `# Tasks

### T2: Gap case

\`\`\`sdd-task
id: T2
status: surprise
depends_on:
  - T404
affected_files: []
validation: []
risk: []
\`\`\`
`;
  const model = parseSddTasksMarkdown(markdown);
  const fields = model.gaps.map((gap) => gap.field);

  assert.equal(model.tasks.length, 1);
  assert.equal(model.gaps.every((gap) => gap.severity === 'blocking'), true);
  assert.equal(fields.includes('status'), true);
  assert.equal(fields.includes('wave'), true);
  assert.equal(fields.includes('affected_files'), true);
  assert.equal(fields.includes('validation'), true);
  assert.equal(fields.includes('Boundary'), true);
  assert.equal(fields.includes('Acceptance'), true);
  assert.equal(fields.includes('depends_on'), true);
  assert.match(renderTaskGapReport({
    branch: 'master',
    specPath: 'spec.md',
    planPath: 'plan.md',
    tasksPath: 'tasks.md',
    verifyPath: 'verify.md',
    documents: { specExists: true, planExists: true, tasksExists: true, verifyExists: true },
    tasks: model.tasks,
    gaps: model.gaps
  }), /BLOCKED/);
});

test('parseSddBranch reads branch docs and inspectSddTask filters gaps', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-parser-'));
  try {
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), `# Tasks

### T1: Valid task

\`\`\`sdd-task
id: T1
status: pending
wave: 1
depends_on: []
affected_files:
  - a.ts
validation:
  - npm test
risk: []
\`\`\`

#### Boundary

Stay in a.ts.

#### Acceptance

- a.ts behavior is covered.
`, 'utf8');

    const model = await parseSddBranch(root, 'feature');
    const inspected = inspectSddTask(model, 'T1');

    assert.equal(model.documents.specExists, true);
    assert.equal(model.documents.planExists, true);
    assert.equal(model.documents.tasksExists, true);
    assert.equal(model.gaps.length, 0);
    assert.equal(inspected.task?.id, 'T1');
    assert.equal(inspected.gaps.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('retained phase fallback detects aggregate duplicate task ids and inspect ambiguity', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-duplicate-'));
  try {
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), '# Tasks\nLegacy index only.\n', 'utf8');
    await writeFile(path.join(branchDir, 'phase1.0-tasks.md'), validTaskMarkdown('T1', []), 'utf8');
    await writeFile(path.join(branchDir, 'phase1.1-tasks.md'), validTaskMarkdown('T1', []), 'utf8');

    const model = await parseSddBranch(root, 'feature');
    const inspected = inspectSddTask(model, 'T1');

    assert.equal(model.tasks.length, 2);
    assert.equal(model.gaps.some((gap) => gap.field === 'id' && gap.taskId === 'T1' && /Duplicate task id T1 across parsed task files/.test(gap.message)), true);
    assert.equal(inspected.task, null);
    assert.equal(inspected.gaps.some((gap) => /ambiguous/.test(gap.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('retained phase fallback validates cross-file dependencies over aggregate tasks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-cross-deps-'));
  try {
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), '# Tasks\nLegacy index only.\n', 'utf8');
    await writeFile(path.join(branchDir, 'phase1.0-tasks.md'), validTaskMarkdown('P1.0-T1', []), 'utf8');
    await writeFile(path.join(branchDir, 'phase1.1-tasks.md'), validTaskMarkdown('P1.1-T1', ['P1.0-T1']), 'utf8');

    const model = await parseSddBranch(root, 'feature');

    assert.equal(model.tasks.length, 2);
    assert.equal(model.gaps.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('retained phase fallback still reports unknown dependencies', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-unknown-deps-'));
  try {
    const branchDir = path.join(root, 'specs', 'feature');
    await mkdir(branchDir, { recursive: true });
    await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
    await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(path.join(branchDir, 'tasks.md'), '# Tasks\nLegacy index only.\n', 'utf8');
    await writeFile(path.join(branchDir, 'phase1.0-tasks.md'), validTaskMarkdown('P1.0-T1', ['P9.9-T404']), 'utf8');

    const model = await parseSddBranch(root, 'feature');

    assert.equal(model.gaps.some((gap) => gap.type === 'Dependency Gap' && gap.taskId === 'P1.0-T1' && /unknown task P9.9-T404/.test(gap.message)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
