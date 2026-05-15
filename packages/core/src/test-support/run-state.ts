import { writeArtifact } from '../run-state/artifacts.js';
import { readRunState, writeRunState } from '../run-state/run-state.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import { hashTestDocument } from './fixtures.js';

export async function bindTestRunState(root: string, runId: string, branch: string, taskId: string): Promise<void> {
  const state = await readRunState(root, runId);
  const model = await parseSddBranch(root, branch);
  const task = inspectSddTask(model, taskId).task;
  await writeRunState(root, {
    ...state,
    currentTask: taskId,
    partition: branch,
    gitBranch: branch,
    taskId,
    affectedFiles: task?.affectedFiles ?? [],
    documentSnapshot: {
      specHash: model.documents.specHash ?? null,
      planHash: model.documents.planHash ?? null,
      tasksHash: model.documents.tasksHash ?? null,
      planBasedOnSpecHash: model.documents.planBasedOnSpecHash ?? null,
      tasksBasedOnPlanHash: model.documents.tasksBasedOnPlanHash ?? null
    }
  });
}

export async function markTestRunReadyForSyncBack(root: string, runId: string, taskId: string): Promise<void> {
  const state = await readRunState(root, runId);
  const proposal = 'status: verified\n';
  await writeArtifact(root, runId, 'sync-back-proposal.md', proposal);
  await writeRunState(root, {
    ...state,
    status: 'completed',
    tasks: {
      ...state.tasks,
      [taskId]: { status: 'verified', gaps: [], artifacts: ['artifacts/sync-back-proposal.md'] }
    },
    validation: {
      status: 'pass',
      commands: ['npm test'],
      evidence: ['artifacts/sync-back-proposal.md']
    },
    syncBack: {
      mode: 'proposal',
      proposalPath: 'artifacts/sync-back-proposal.md',
      proposalDigest: hashTestDocument(proposal),
      sourceVerifyStatus: 'PASS',
      status: 'proposed'
    },
    artifacts: [
      ...state.artifacts,
      { path: 'artifacts/sync-back-proposal.md', kind: 'sync_back_proposal', task: taskId, agent: null, createdAt: new Date().toISOString() }
    ]
  });
}
