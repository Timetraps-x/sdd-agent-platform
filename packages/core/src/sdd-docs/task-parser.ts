import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertSafePathSegment } from '../path-safety.js';
import { exists } from '../storage/json-io.js';

export type SddTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'deferred' | 'unknown';
export type SddGapSeverity = 'blocking' | 'warning';
export type SddGapType = 'Document Gap' | 'Task Gap' | 'Dependency Gap';

export interface SddTaskSourceLocation {
  filePath: string;
  heading: string | null;
  lineStart: number;
  lineEnd: number;
}

export interface SddTask {
  id: string;
  title: string | null;
  status: SddTaskStatus;
  wave: number | null;
  dependsOn: string[];
  affectedFiles: string[];
  validation: string[];
  risk: string[];
  acceptanceRefs: string[];
  planRefs: string[];
  fileOwnership: string[];
  agentFit: string[];
  verificationAvailability: string[];
  autonomy: string | null;
  allowedAgents: string[];
  requiredArtifacts: string[];
  gapState: string | null;
  boundary: string | null;
  acceptance: string[];
  implementationNotes: string | null;
  rawMetadata: Record<string, string | string[]>;
  source: SddTaskSourceLocation;
}

export interface SddTaskGap {
  type: SddGapType;
  severity: SddGapSeverity;
  taskId: string | null;
  field: string;
  message: string;
  recommendation: string;
}

export interface SddTaskModel {
  branch: string;
  specPath: string;
  planPath: string;
  tasksPath: string;
  documents: {
    specExists: boolean;
    planExists: boolean;
    tasksExists: boolean;
    specHash?: string | null;
    planHash?: string | null;
    tasksHash?: string | null;
    planBasedOnSpecHash?: string | null;
    tasksBasedOnPlanHash?: string | null;
    planStale?: boolean;
    tasksStale?: boolean;
  };
  tasks: SddTask[];
  gaps: SddTaskGap[];
}

export async function parseSddBranch(projectRoot: string, branch = 'master'): Promise<SddTaskModel> {
  assertSafePathSegment(branch, 'branch');
  const specPath = path.join(projectRoot, 'specs', branch, 'spec.md');
  const planPath = path.join(projectRoot, 'specs', branch, 'plan.md');
  const tasksPath = path.join(projectRoot, 'specs', branch, 'tasks.md');
  const [specExists, planExists, tasksExists] = await Promise.all([exists(specPath), exists(planPath), exists(tasksPath)]);
  const [rawSpec, rawPlan, rawTasks] = await Promise.all([
    specExists ? readFile(specPath, 'utf8') : Promise.resolve(null),
    planExists ? readFile(planPath, 'utf8') : Promise.resolve(null),
    tasksExists ? readFile(tasksPath, 'utf8') : Promise.resolve(null)
  ]);
  const documents = buildDocumentChainState({ specExists, planExists, tasksExists, rawSpec, rawPlan, rawTasks });
  const gaps: SddTaskGap[] = [];

  if (documents.planStale) {
    gaps.push(documentGap('plan.md', `Plan document is stale because based_on_spec_hash ${documents.planBasedOnSpecHash} no longer matches current spec hash ${documents.specHash}.`, 'Re-run /sdd:plan for this partition before updating tasks or executing implementation.'));
  }
  if (documents.tasksStale) {
    gaps.push(documentGap('tasks.md', `Tasks document is stale because based_on_plan_hash ${documents.tasksBasedOnPlanHash} no longer matches current plan hash ${documents.planHash}.`, 'Re-run /sdd:tasks for this partition before executing implementation.'));
  }
  if (!specExists) {
    gaps.push(documentGap('spec.md', 'Spec document is missing.', 'Create or restore specs/<branch>/spec.md before full SDD execution.'));
  }
  if (!planExists) {
    gaps.push(documentGap('plan.md', 'Plan document is missing.', 'Create or restore specs/<branch>/plan.md before task execution.'));
  }
  if (!tasksExists || rawTasks === null) {
    gaps.push(documentGap('tasks.md', 'Tasks document is missing.', 'Create specs/<branch>/tasks.md with sdd-task fenced blocks.'));
    return {
      branch,
      specPath,
      planPath,
      tasksPath,
      documents,
      tasks: [],
      gaps
    };
  }

  const taskModel = parseSddTasksMarkdown(rawTasks, { tasksPath });
  if (taskModel.tasks.length === 0 && !path.basename(tasksPath).startsWith('phase')) {
    const retainedModel = await parseRetainedPhaseTasks(path.dirname(tasksPath));
    if (retainedModel.tasks.length > 0) {
      return {
        branch,
        specPath,
        planPath,
        tasksPath,
        documents,
        tasks: retainedModel.tasks,
        gaps: [...gaps, ...retainedModel.gaps]
      };
    }
  }
  return {
    branch,
    specPath,
    planPath,
    tasksPath,
    documents,
    tasks: taskModel.tasks,
    gaps: [...gaps, ...taskModel.gaps]
  };
}

export function parseSddTasksMarkdown(raw: string, options: { branch?: string; tasksPath?: string; validateDependencies?: boolean } = {}): Pick<SddTaskModel, 'tasks' | 'gaps'> {
  const tasksPath = options.tasksPath ?? 'tasks.md';
  const fencedBlocks = Array.from(raw.matchAll(/^\s*```sdd-task\s*\r?\n([\s\S]*?)\r?^\s*```\s*$/gm));
  const tasks: SddTask[] = [];
  const gaps: SddTaskGap[] = [];

  if (fencedBlocks.length === 0) {
    gaps.push({
      type: 'Task Gap',
      severity: 'blocking',
      taskId: null,
      field: 'sdd-task',
      message: 'No sdd-task fenced blocks found in tasks.md.',
      recommendation: 'Add one sdd-task fenced block per executable task.'
    });
    return { tasks, gaps };
  }

  const seenIds = new Map<string, SddTaskSourceLocation>();
  for (let blockIndex = 0; blockIndex < fencedBlocks.length; blockIndex += 1) {
    const blockMatch = fencedBlocks[blockIndex];
    const block = blockMatch[1] ?? '';
    const blockStart = blockMatch.index ?? 0;
    const blockEnd = blockStart + blockMatch[0].length;
    const nextBlockStart = fencedBlocks[blockIndex + 1]?.index ?? raw.length;
    const lineStart = lineNumberAt(raw, blockStart);
    const lineEnd = lineNumberAt(raw, blockEnd);
    const heading = nearestTaskHeading(raw.slice(0, blockStart));
    const metadata = parseSimpleYamlBlock(block);
    const id = scalarValue(metadata.id);
    const taskId = id || heading?.id || null;
    const section = raw.slice(blockEnd, nextTaskStart(raw, blockEnd, nextBlockStart));
    const parsedSections = parseTaskCompanionSections(section);
    if (!taskId) {
      gaps.push({
        type: 'Task Gap',
        severity: 'blocking',
        taskId: null,
        field: 'id',
        message: `sdd-task block starting at line ${lineStart} is missing id.`,
        recommendation: 'Add a stable id field such as id: T1.'
      });
      continue;
    }

    const source: SddTaskSourceLocation = {
      filePath: tasksPath,
      heading: heading?.raw ?? null,
      lineStart,
      lineEnd
    };
    const priorSource = seenIds.get(taskId);
    if (priorSource) {
      gaps.push({
        type: 'Task Gap',
        severity: 'blocking',
        taskId,
        field: 'id',
        message: `Duplicate task id ${taskId} in ${taskSourceEvidence({ id: taskId, source })} and ${sourceLocationEvidence(priorSource)}.`,
        recommendation: 'Keep task ids unique within a spec branch.'
      });
    }
    seenIds.set(taskId, source);

    const task: SddTask = {
      id: taskId,
      title: heading?.title ?? null,
      status: parseTaskStatus(scalarValue(metadata.status)),
      wave: parseWave(scalarValue(metadata.wave)),
      dependsOn: listValue(metadata.depends_on),
      affectedFiles: listValue(metadata.affected_files),
      validation: listValue(metadata.validation),
      risk: listValue(metadata.risk),
      acceptanceRefs: listValue(metadata.acceptance_refs),
      planRefs: listValue(metadata.plan_refs),
      fileOwnership: listValue(metadata.file_ownership),
      agentFit: listValue(metadata.agent_fit),
      verificationAvailability: listValue(metadata.verification_availability),
      autonomy: scalarValue(metadata.autonomy),
      allowedAgents: listValue(metadata.allowed_agents),
      requiredArtifacts: listValue(metadata.required_artifacts),
      gapState: scalarValue(metadata.gap_state),
      boundary: parsedSections.boundary,
      acceptance: parsedSections.acceptance,
      implementationNotes: parsedSections.implementationNotes,
      rawMetadata: metadata,
      source
    };
    tasks.push(task);
    gaps.push(...validateTask(task));
  }

  if (options.validateDependencies !== false) {
    gaps.push(...validateAggregateTaskSet(tasks));
  }

  return { tasks, gaps };
}

function buildDocumentChainState(input: { specExists: boolean; planExists: boolean; tasksExists: boolean; rawSpec: string | null; rawPlan: string | null; rawTasks: string | null }): SddTaskModel['documents'] {
  const specHash = input.rawSpec === null ? null : hashDocumentContent(input.rawSpec);
  const planHash = input.rawPlan === null ? null : hashDocumentContent(input.rawPlan);
  const tasksHash = input.rawTasks === null ? null : hashDocumentContent(input.rawTasks);
  const planBasedOnSpecHash = input.rawPlan === null ? null : readDocumentScalar(input.rawPlan, 'based_on_spec_hash');
  const tasksBasedOnPlanHash = input.rawTasks === null ? null : readDocumentScalar(input.rawTasks, 'based_on_plan_hash');

  const planStale = Boolean(planBasedOnSpecHash && specHash && !documentHashMatches(planBasedOnSpecHash, specHash));
  const tasksHashMismatch = Boolean(tasksBasedOnPlanHash && planHash && !documentHashMatches(tasksBasedOnPlanHash, planHash));

  return {
    specExists: input.specExists,
    planExists: input.planExists,
    tasksExists: input.tasksExists,
    specHash,
    planHash,
    tasksHash,
    planBasedOnSpecHash,
    tasksBasedOnPlanHash,
    planStale,
    tasksStale: planStale || tasksHashMismatch
  };
}

function hashDocumentContent(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

function readDocumentScalar(raw: string, key: string): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = raw.match(new RegExp(`^\\s*(?:-\\s*)?${escapedKey}:\\s*(.+?)\\s*$`, 'm'));
  return match?.[1]?.trim().replace(/^["'`]|["'`]$/g, '') ?? null;
}

function documentHashMatches(expected: string, actual: string): boolean {
  return expected.replace(/^sha256:/, '') === actual;
}

async function parseRetainedPhaseTasks(specBranchDir: string): Promise<Pick<SddTaskModel, 'tasks' | 'gaps'>> {
  const entries = await readdir(specBranchDir, { withFileTypes: true });
  const taskFiles = entries
    .filter((entry) => entry.isFile() && /^phase\d+\.\d+-tasks\.md$/.test(entry.name))
    .map((entry) => path.join(specBranchDir, entry.name))
    .sort();
  const tasks: SddTask[] = [];
  const gaps: SddTaskGap[] = [];
  for (const taskFile of taskFiles) {
    const raw = await readFile(taskFile, 'utf8');
    const parsed = parseSddTasksMarkdown(raw, { tasksPath: taskFile, validateDependencies: false });
    tasks.push(...parsed.tasks);
    gaps.push(...parsed.gaps);
  }
  gaps.push(...validateAggregateTaskSet(tasks));
  return { tasks, gaps };
}

function documentGap(field: string, message: string, recommendation: string): SddTaskGap {
  return {
    type: 'Document Gap',
    severity: 'blocking',
    taskId: null,
    field,
    message,
    recommendation
  };
}

function parseTaskStatus(value: string | null): SddTaskStatus {
  if (value === 'pending' || value === 'in_progress' || value === 'completed' || value === 'blocked' || value === 'deferred') {
    return value;
  }
  return 'unknown';
}

function parseWave(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseSimpleYamlBlock(raw: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const lines = raw.split(/\r?\n/);
  let currentListKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    if (currentListKey && /^-\s+/.test(trimmed)) {
      const current = result[currentListKey];
      const items = Array.isArray(current) ? current : [];
      items.push(unquoteSimpleYamlValue(trimmed.slice(2).trim()));
      result[currentListKey] = items;
      continue;
    }

    const scalarMatch = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!scalarMatch) {
      currentListKey = null;
      continue;
    }
    const key = scalarMatch[1];
    const value = scalarMatch[2].trim();
    if (value === '') {
      result[key] = [];
      currentListKey = key;
    } else if (value === '[]') {
      result[key] = [];
      currentListKey = null;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      result[key] = value.slice(1, -1).split(',').map((item) => unquoteSimpleYamlValue(item.trim())).filter(Boolean);
      currentListKey = null;
    } else {
      result[key] = unquoteSimpleYamlValue(value);
      currentListKey = null;
    }
  }

  return result;
}

function unquoteSimpleYamlValue(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function scalarValue(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function listValue(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (!value || value === '[]') {
    return [];
  }
  return [value];
}

function lineNumberAt(raw: string, offset: number): number {
  return raw.slice(0, offset).split(/\r?\n/).length;
}

function nearestTaskHeading(prefix: string): { raw: string; id: string | null; title: string | null } | null {
  const matches = Array.from(prefix.matchAll(/^\s*###\s+(.+)$/gm));
  const last = matches.at(-1);
  if (!last) {
    return null;
  }
  const raw = last[1].trim();
  const parsed = raw.match(/^([^:：\s]+)\s*[:：]\s*(.+)$/);
  return {
    raw,
    id: parsed?.[1]?.trim() ?? null,
    title: parsed?.[2]?.trim() ?? raw
  };
}

function nextTaskStart(raw: string, offset: number, limit = raw.length): number {
  const next = raw.slice(offset, limit).search(/^\s*###\s+/m);
  return next < 0 ? limit : offset + next;
}

function parseTaskCompanionSections(raw: string): { boundary: string | null; acceptance: string[]; implementationNotes: string | null } {
  return {
    boundary: sectionText(raw, 'Boundary'),
    acceptance: sectionBullets(raw, 'Acceptance'),
    implementationNotes: sectionText(raw, 'Implementation Notes')
  };
}

function sectionText(raw: string, title: string): string | null {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionPattern = `^\\s*####\\s+${escaped}\\s*$([\\s\\S]*?)(?=^\\s*####\\s+|^\\s*###\\s+|$(?![\\s\\S]))`;
  const match = raw.match(new RegExp(sectionPattern, 'im'));
  const text = match?.[1]?.trim() ?? '';
  return text.length > 0 ? text : null;
}

function sectionBullets(raw: string, title: string): string[] {
  const text = sectionText(raw, title);
  if (!text) {
    return [];
  }
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2).trim()).filter(Boolean);
}

function validateTask(task: SddTask): SddTaskGap[] {
  const gaps: SddTaskGap[] = [];
  const requiredLists: Array<[keyof SddTask, string]> = [
    ['affectedFiles', 'affected_files'],
    ['validation', 'validation']
  ];

  if (task.status === 'unknown') {
    gaps.push(taskGap(task.id, 'status', 'Task status is missing or unsupported.', 'Use one of pending, in_progress, completed, blocked, deferred.'));
  }
  if (task.wave === null) {
    gaps.push(taskGap(task.id, 'wave', 'Task wave is missing or invalid.', 'Add a positive integer wave value.'));
  }
  for (const [property, field] of requiredLists) {
    if ((task[property] as unknown[]).length === 0) {
      gaps.push(taskGap(task.id, field, `Task ${task.id} has no ${field}.`, `Declare ${field} in the sdd-task block before implementation.`));
    }
  }
  if (!task.boundary) {
    gaps.push(taskGap(task.id, 'Boundary', `Task ${task.id} has no Boundary section.`, 'Add a #### Boundary section describing allowed and forbidden scope.'));
  }
  if (task.acceptance.length === 0) {
    gaps.push(taskGap(task.id, 'Acceptance', `Task ${task.id} has no acceptance items.`, 'Add verifiable bullets under #### Acceptance.'));
  }
  return gaps;
}

function taskGap(taskId: string, field: string, message: string, recommendation: string): SddTaskGap {
  return {
    type: 'Task Gap',
    severity: 'blocking',
    taskId,
    field,
    message,
    recommendation
  };
}

function validateAggregateTaskSet(tasks: SddTask[]): SddTaskGap[] {
  const gaps: SddTaskGap[] = [];
  const tasksById = new Map<string, SddTask[]>();
  for (const task of tasks) {
    const matchingTasks = tasksById.get(task.id) ?? [];
    matchingTasks.push(task);
    tasksById.set(task.id, matchingTasks);
  }

  for (const [taskId, matchingTasks] of tasksById) {
    if (matchingTasks.length > 1) {
      gaps.push(taskGap(
        taskId,
        'id',
        `Duplicate task id ${taskId} across parsed task files: ${matchingTasks.map(taskSourceEvidence).join('; ')}.`,
        'Rename duplicate task ids or add deterministic source disambiguation before implementation.'
      ));
    }
  }

  for (const task of tasks) {
    for (const dependency of task.dependsOn) {
      const matchingDependencies = tasksById.get(dependency) ?? [];
      if (matchingDependencies.length === 0) {
        gaps.push({
          type: 'Dependency Gap',
          severity: 'blocking',
          taskId: task.id,
          field: 'depends_on',
          message: `Task ${task.id} depends on unknown task ${dependency}.`,
          recommendation: 'Fix depends_on to reference an existing task id, or add the missing task.'
        });
      } else if (matchingDependencies.length > 1) {
        gaps.push({
          type: 'Dependency Gap',
          severity: 'blocking',
          taskId: task.id,
          field: 'depends_on',
          message: `Task ${task.id} depends on ambiguous duplicate task id ${dependency}: ${matchingDependencies.map(taskSourceEvidence).join('; ')}.`,
          recommendation: 'Rename duplicate task ids so dependencies resolve to one task.'
        });
      }
    }
  }

  return gaps;
}

function taskSourceEvidence(task: Pick<SddTask, 'id' | 'source'>): string {
  return `${task.id} at ${sourceLocationEvidence(task.source)}`;
}

function sourceLocationEvidence(source: SddTaskSourceLocation): string {
  return `${source.filePath}:${source.lineStart}-${source.lineEnd}`;
}
