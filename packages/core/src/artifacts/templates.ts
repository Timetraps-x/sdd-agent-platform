import { SDD_RESULT_CONTRACT, SDD_RESULT_VERSION } from '../contracts.js';
import { getRunRelativeArtifactPath, toArtifactRootRelativePath } from '../runtime-paths.js';
import { readRunState } from '../run-state/run-state.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import type { SddTask } from '../sdd-docs/task-parser.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import { isSddResultStatus } from './sdd-result.js';
import type { SddResultStatus } from './sdd-result.js';

export interface SddResultArtifactTemplateOptions {
  branch?: string;
  runId?: string;
  taskId: string;
  agent: string;
  artifactPath: string;
  status?: SddResultStatus;
}

interface AcceptanceCoverageTarget {
  label: string;
  description: string | null;
}

export async function renderSddResultArtifactTemplate(projectRoot: string, options: SddResultArtifactTemplateOptions): Promise<string> {
  const runState = options.runId ? await readRunState(projectRoot, options.runId).catch(() => null) : null;
  const branch = options.branch ?? runState?.partition ?? runState?.gitBranch ?? (await resolveSddContext(projectRoot)).branch;
  const status = options.status ?? 'PASS';
  if (!isSddResultStatus(status)) {
    throw new Error(`Unsupported sdd-result status ${status}.`);
  }
  const artifactRootRelativePath = toArtifactRootRelativePath(options.artifactPath);
  const runRelativeArtifactPath = getRunRelativeArtifactPath(artifactRootRelativePath);
  const lines = [
    `# ${options.agent} result`,
    '',
    '```sdd-result',
    `contract: ${SDD_RESULT_CONTRACT}`,
    `version: ${SDD_RESULT_VERSION}`,
    `agent: ${options.agent}`,
    `task: ${options.taskId}`,
    `status: ${status}`,
    'artifacts:',
    `  - ${runRelativeArtifactPath}`,
    '```',
    ''
  ];

  let warning: string | null = null;
  let task: SddTask | null = null;
  try {
    const model = await parseSddBranch(projectRoot, branch);
    const inspected = inspectSddTask(model, options.taskId);
    task = inspected.task;
    if (!task) {
      warning = `Task ${options.taskId} was not found in specs/${branch}/tasks.md.`;
    }
  } catch (error) {
    warning = `Could not inspect task ${options.taskId} on branch ${branch}: ${messageFromError(error)}`;
  }

  if (warning) {
    lines.push('## Warning', '', `- ${warning}`, '');
  }

  if (options.agent === 'validator' && task) {
    lines.push('## Acceptance Mapping', '');
    const targets = taskAcceptanceCoverageTargets(task);
    lines.push(...(targets.length > 0
      ? targets.map((target) => `- Acceptance ${target.label}: TODO. Add validation evidence${target.description ? ` for ${target.description}` : ''}.`)
      : ['- No Acceptance items are declared for this task.']));
    lines.push('', '## Evidence', '');
    lines.push(...(task.validation.length > 0
      ? task.validation.map((command) => `- TODO run validation command: ${command}`)
      : ['- TODO add validation evidence.']));
    lines.push('');
  } else {
    lines.push('## Evidence', '', `- TODO cite files, commands, and task ${options.taskId} evidence here.`, '');
  }

  return lines.join('\n');
}

function taskAcceptanceCoverageTargets(task: SddTask): AcceptanceCoverageTarget[] {
  if (task.acceptanceRefs.length > 0) {
    return task.acceptanceRefs.map((ref, index) => ({
      label: ref,
      description: task.acceptance[index] ?? null
    }));
  }
  return task.acceptance.map((acceptance) => ({
    label: acceptance,
    description: null
  }));
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
