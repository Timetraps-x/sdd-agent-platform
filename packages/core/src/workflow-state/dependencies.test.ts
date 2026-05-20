import test from 'node:test';
import assert from 'node:assert/strict';

import { parseSddTasksMarkdown } from '../sdd-docs/task-parser.js';
import { resolveTaskDependencyReadiness, workflowDependencyBlockers } from './dependencies.js';

function taskBlock(id: string, status: string, dependsOn: string[]): string {
  const dependsOnBlock = dependsOn.length === 0 ? 'depends_on: []' : `depends_on:\n${dependsOn.map((dependency) => `  - ${dependency}`).join('\n')}`;
  return `### ${id}: Dependency fixture\n\n\`\`\`sdd-task\nid: ${id}\nstatus: ${status}\nwave: 1\n${dependsOnBlock}\nacceptance_refs:\n  - AC-${id}\nplan_refs:\n  - Plan\naffected_files:\n  - docs/${id}.md\nvalidation:\n  - npm test\nrisk: []\n\`\`\`\n`;
}

test('dependency readiness blocks tasks until dependencies are completed', () => {
  const model = parseSddTasksMarkdown(`# Tasks\n\n${taskBlock('DEP1', 'pending', [])}\n${taskBlock('DEP2', 'pending', ['DEP1'])}`, { tasksPath: 'tasks.md' });

  const readiness = resolveTaskDependencyReadiness(model, 'DEP2');

  assert.equal(readiness.ready, false);
  assert.deepEqual(readiness.dependencies.map((dependency) => `${dependency.taskId}:${dependency.status}:${dependency.ready}`), ['DEP1:pending:false']);
  assert.match(readiness.blockingReasons[0], /DEP2 depends on DEP1, but DEP1 status is pending/);
  assert.deepEqual(workflowDependencyBlockers(model).map((blocker) => `${blocker.taskId}->${blocker.dependencyId}:${blocker.dependencyStatus}`), ['DEP2->DEP1:pending']);
});

test('dependency readiness accepts completed dependencies and reports missing dependencies', () => {
  const readyModel = parseSddTasksMarkdown(`# Tasks\n\n${taskBlock('DEP1', 'completed', [])}\n${taskBlock('DEP2', 'pending', ['DEP1'])}`, { tasksPath: 'tasks.md' });
  const missingModel = parseSddTasksMarkdown(`# Tasks\n\n${taskBlock('DEP2', 'pending', ['MISSING'])}`, { tasksPath: 'tasks.md' });

  assert.equal(resolveTaskDependencyReadiness(readyModel, 'DEP2').ready, true);
  const missing = resolveTaskDependencyReadiness(missingModel, 'DEP2');
  assert.equal(missing.ready, false);
  assert.equal(missing.dependencies[0].status, 'missing');
  assert.match(missing.blockingReasons[0], /MISSING was not found/);
});
