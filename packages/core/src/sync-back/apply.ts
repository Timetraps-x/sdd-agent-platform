import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { appendEvent } from '../run-state/events.js';
import type { RunDocumentSnapshot, RunState } from '../run-state/model.js';
import { readRunState, writeRunState } from '../run-state/run-state.js';
import { rebuildLocalRunIndex } from '../run-state/run-index.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import type { SddTask, SddTaskModel, SddTaskStatus } from '../sdd-docs/task-parser.js';
import { inspectSyncBack } from './inspect.js';
import type { SyncBackInspection } from './inspect.js';

export interface SyncBackApplyResult {
  runId: string;
  taskId: string;
  applied: boolean;
  tasksPath: string;
  inspection: SyncBackInspection;
  message: string;
}

export async function applySyncBack(projectRoot: string, options: { runId?: string; branch?: string; taskId?: string; approved?: boolean }): Promise<SyncBackApplyResult> {
  const inspection = await inspectSyncBack(projectRoot, options);
  if (!inspection.taskId) {
    throw new Error('Cannot apply sync-back without a task id.');
  }
  if (inspection.status === 'blocked') {
    throw new Error(`Cannot apply sync-back for ${inspection.runId}: ${inspection.reasons.join(' ')}`);
  }
  if (!inspection.markdownTask) {
    throw new Error(`Cannot apply sync-back for ${inspection.runId}: target task is missing.`);
  }
  if (inspection.status === 'applied') {
    return {
      runId: inspection.runId,
      taskId: inspection.taskId,
      applied: false,
      tasksPath: inspection.markdownTask.source.filePath,
      inspection,
      message: `Sync-back for ${inspection.runId}/${inspection.taskId} was already applied.`
    };
  }
  if (inspection.applyPolicy.requiresApproval && options.approved !== true) {
    throw new Error(`Cannot apply sync-back for ${inspection.runId}: ${inspection.applyPolicy.reasons.join(' ')} Re-run with --approved after human confirmation.`);
  }

  const state = await readRunState(projectRoot, inspection.runId);
  const tasksPath = inspection.markdownTask.source.filePath;
  const rawTasks = await readFile(tasksPath, 'utf8');
  const note = syncBackImplementationNote(state, inspection);
  const nextTasks = applySyncBackToTasksMarkdown(rawTasks, inspection.markdownTask, note);
  await writeFile(tasksPath, nextTasks, 'utf8');
  const appliedModel = await parseSddBranch(projectRoot, inspection.branch);
  await writeRunState(projectRoot, {
    ...state,
    documentSnapshot: documentSnapshotFromModel(appliedModel),
    syncBack: {
      ...state.syncBack,
      status: 'applied'
    }
  });
  await appendEvent(projectRoot, state.runId, {
    event: 'sync_back_applied',
    runId: state.runId,
    summary: `Sync-back applied for ${inspection.taskId}`,
    data: {
      task: inspection.taskId,
      branch: inspection.branch,
      tasksPath: path.relative(projectRoot, tasksPath),
      proposal: inspection.proposalPath
    }
  });

  await rebuildLocalRunIndex(projectRoot);

  const appliedInspection = await inspectSyncBack(projectRoot, { ...options, runId: inspection.runId, taskId: inspection.taskId });
  return {
    runId: state.runId,
    taskId: inspection.taskId,
    applied: true,
    tasksPath,
    inspection: appliedInspection,
    message: `Sync-back applied for ${state.runId}/${inspection.taskId}.`
  };
}

function documentSnapshotFromModel(model: SddTaskModel): RunDocumentSnapshot {
  return {
    specHash: model.documents.specHash ?? null,
    planHash: model.documents.planHash ?? null,
    tasksHash: model.documents.tasksHash ?? null,
    planBasedOnSpecHash: model.documents.planBasedOnSpecHash ?? null,
    tasksBasedOnPlanHash: model.documents.tasksBasedOnPlanHash ?? null
  };
}

function applySyncBackToTasksMarkdown(raw: string, task: SddTask, note: string): string {
  const range = locateTaskBlockRange(raw, task);
  const block = raw.slice(range.start, range.end);
  const nextBlock = setTaskBlockStatus(block, 'completed');
  const sectionEnd = nextTaskStart(raw, range.end);
  const section = raw.slice(range.end, sectionEnd);
  const nextSection = appendSyncBackImplementationNote(section, note);
  return `${raw.slice(0, range.start)}${nextBlock}${nextSection}${raw.slice(sectionEnd)}`;
}

function locateTaskBlockRange(raw: string, task: SddTask): { start: number; end: number } {
  const matches = Array.from(raw.matchAll(/^\s*```sdd-task\s*\r?\n([\s\S]*?)\r?^\s*```\s*$/gm));
  const matching = matches.filter((match) => {
    const metadata = parseSimpleYamlBlock(match[1] ?? '');
    const id = scalarValue(metadata.id);
    const start = match.index ?? 0;
    return id === task.id && lineNumberAt(raw, start) === task.source.lineStart;
  });
  const fallback = matches.filter((match) => scalarValue(parseSimpleYamlBlock(match[1] ?? '').id) === task.id);
  const selected = matching.length === 1 ? matching[0] : fallback.length === 1 ? fallback[0] : null;
  if (!selected || selected.index === undefined) {
    throw new Error(`Cannot locate a unique sdd-task block for ${task.id}.`);
  }
  return {
    start: selected.index,
    end: selected.index + selected[0].length
  };
}

function setTaskBlockStatus(block: string, status: SddTaskStatus): string {
  if (/^\s*status:\s*[^\r\n]*$/m.test(block)) {
    return block.replace(/^(\s*status:\s*)[^\r\n]*$/m, `$1${status}`);
  }
  const eol = block.includes('\r\n') ? '\r\n' : '\n';
  if (/^\s*id:\s*[^\r\n]*$/m.test(block)) {
    return block.replace(/^(\s*id:\s*[^\r\n]*)$/m, `$1${eol}status: ${status}`);
  }
  throw new Error('Cannot update task status because the sdd-task block has no id line.');
}

function appendSyncBackImplementationNote(section: string, note: string): string {
  const runMatch = note.match(/run `([^`]+)`/);
  if (runMatch && section.includes(`run \`${runMatch[1]}\``)) {
    return section;
  }
  const heading = section.match(/^####\s+Implementation Notes\s*$/im);
  if (!heading || heading.index === undefined) {
    const separator = section.length === 0 || section.endsWith('\n') ? '' : '\n';
    return `${section}${separator}\n#### Implementation Notes\n\n${note}\n`;
  }
  const contentStart = heading.index + heading[0].length;
  const remainder = section.slice(contentStart);
  const nextHeadingOffset = remainder.search(/\n####\s+|\n###\s+/);
  const insertAt = nextHeadingOffset < 0 ? section.length : contentStart + nextHeadingOffset;
  const before = section.slice(0, insertAt).trimEnd();
  const after = section.slice(insertAt);
  return `${before}\n${note}${after}`;
}

function syncBackImplementationNote(state: RunState, inspection: SyncBackInspection): string {
  const artifacts = inspection.artifacts.length > 0
    ? inspection.artifacts.map((artifact) => `\`${artifact}\``).join(', ')
    : 'none';
  return `- Sync-back applied from run \`${state.runId}\` (${state.updatedAt}); proposal: \`${inspection.proposalPath ?? 'none'}\`; artifacts: ${artifacts}.`;
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

function lineNumberAt(raw: string, offset: number): number {
  return raw.slice(0, offset).split(/\r?\n/).length;
}

function nextTaskStart(raw: string, offset: number, limit = raw.length): number {
  const next = raw.slice(offset, limit).search(/^\s*###\s+/m);
  return next < 0 ? limit : offset + next;
}
