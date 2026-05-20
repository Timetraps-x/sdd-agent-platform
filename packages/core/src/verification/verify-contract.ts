import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { VERIFY_DOCUMENT_CONTRACT_VERSION } from '../contracts.js';
import { resolveSddContext, type ContextBranchSource } from '../sdd-docs/context.js';
import { parseSddBranch, type SddTask, type SddTaskModel } from '../sdd-docs/task-parser.js';
import { exists } from '../storage/json-io.js';

export type VerifyContractStatus = 'PASS' | 'WARN' | 'BLOCKED';
export type VerifyContractIssueLevel = 'WARN' | 'FAIL';
export type VerifyContractAuthorRole = 'verification-designer';

const VERIFY_CONTRACT_AUTHOR_ROLE: VerifyContractAuthorRole = 'verification-designer';
const REQUIRED_INDEPENDENT_FROM_ROLES = ['task-planner', 'implementer'] as const;

export interface VerifyContractIssue {
  level: VerifyContractIssueLevel;
  field: string;
  message: string;
  action: string;
}

export interface VerifyContractInspection {
  contract: typeof VERIFY_DOCUMENT_CONTRACT_VERSION;
  branch: string;
  verifyPath: string;
  exists: boolean;
  status: VerifyContractStatus;
  basedOnTasksHash: string | null;
  currentTasksHash: string | null;
  issues: VerifyContractIssue[];
  taskCount: number;
  authorRole: VerifyContractAuthorRole | null;
  independentFromRoles: string[];
}

export interface WriteVerifyContractResult {
  branch: string;
  verifyPath: string;
  relativePath: string;
  status: 'created' | 'updated' | 'unchanged';
  content: string;
}

export async function inspectVerifyContract(projectRoot: string, options: { branch?: string | null; branchSource?: ContextBranchSource } = {}): Promise<VerifyContractInspection> {
  const context = await resolveSddContext(projectRoot, options);
  const model = await parseSddBranch(projectRoot, context.partition);
  const raw = model.documents.verifyExists ? await readFile(model.verifyPath, 'utf8') : null;
  const issues: VerifyContractIssue[] = [];

  if (!model.documents.tasksExists) {
    issues.push({
      level: 'FAIL',
      field: 'tasks.md',
      message: 'Cannot inspect verify.md because tasks.md is missing.',
      action: 'Create specs/<branch>/tasks.md before generating verify.md.'
    });
  }

  if (!model.documents.verifyExists || raw === null) {
    issues.push({
      level: 'WARN',
      field: 'verify.md',
      message: 'Verification contract document is missing.',
      action: `Run sdd verifies write --branch ${context.partition} to create specs/${context.partition}/verify.md.`
    });
  } else {
    if (!raw.includes(`contract: ${VERIFY_DOCUMENT_CONTRACT_VERSION}`)) {
      issues.push({
        level: 'FAIL',
        field: 'contract',
        message: `verify.md does not declare contract ${VERIFY_DOCUMENT_CONTRACT_VERSION}.`,
        action: 'Regenerate verify.md with sdd verifies write or update the frontmatter contract.'
      });
    }
    if (model.documents.verifyStale) {
      issues.push({
        level: 'WARN',
        field: 'based_on_tasks_hash',
        message: `verify.md is stale for current tasks hash ${model.documents.tasksHash}.`,
        action: `Run sdd verifies write --branch ${context.partition} --force after reviewing task contract changes.`
      });
    }
    const authorRole = readDocumentScalar(raw, 'author_role');
    if (authorRole !== VERIFY_CONTRACT_AUTHOR_ROLE) {
      issues.push({
        level: 'WARN',
        field: 'author_role',
        message: `verify.md must be owned by ${VERIFY_CONTRACT_AUTHOR_ROLE}, not ${authorRole ?? 'missing'}.`,
        action: 'Regenerate verify.md with a verification-designer role before running /sdd:test.'
      });
    }
    const independentFromRoles = readDocumentList(raw, 'independent_from_roles');
    for (const role of REQUIRED_INDEPENDENT_FROM_ROLES) {
      if (!independentFromRoles.includes(role)) {
        issues.push({
          level: 'WARN',
          field: 'independent_from_roles',
          message: `verify.md must declare independence from ${role}.`,
          action: 'Regenerate verify.md so task planning, verification design, and implementation are separated.'
        });
      }
    }
    for (const task of model.tasks) {
      if (!new RegExp(`\\b${escapeRegex(task.id)}\\b`).test(raw)) {
        issues.push({
          level: 'WARN',
          field: 'tasks',
          message: `verify.md does not mention task ${task.id}.`,
          action: 'Refresh verify.md so every executable task has verification expectations.'
        });
      }
    }
  }

  return {
    contract: VERIFY_DOCUMENT_CONTRACT_VERSION,
    branch: context.partition,
    verifyPath: model.verifyPath,
    exists: model.documents.verifyExists,
    status: issues.some((issue) => issue.level === 'FAIL') ? 'BLOCKED' : issues.length > 0 ? 'WARN' : 'PASS',
    basedOnTasksHash: model.documents.verifyBasedOnTasksHash ?? null,
    currentTasksHash: model.documents.tasksHash ?? null,
    issues,
    taskCount: model.tasks.length,
    authorRole: raw ? readDocumentScalar(raw, 'author_role') as VerifyContractAuthorRole | null : null,
    independentFromRoles: raw ? readDocumentList(raw, 'independent_from_roles') : []
  };
}

export async function writeVerifyContract(projectRoot: string, options: { branch?: string | null; branchSource?: ContextBranchSource; force?: boolean } = {}): Promise<WriteVerifyContractResult> {
  const context = await resolveSddContext(projectRoot, options);
  const model = await parseSddBranch(projectRoot, context.partition);
  const content = renderVerifyContractDocument(model, new Date().toISOString());
  const existed = await exists(model.verifyPath);
  if (existed && !options.force) {
    const current = await readFile(model.verifyPath, 'utf8');
    return {
      branch: context.partition,
      verifyPath: model.verifyPath,
      relativePath: `specs/${context.partition}/verify.md`,
      status: current === content ? 'unchanged' : 'unchanged',
      content: current
    };
  }
  await mkdir(path.dirname(model.verifyPath), { recursive: true });
  await writeFile(model.verifyPath, content, 'utf8');
  return {
    branch: context.partition,
    verifyPath: model.verifyPath,
    relativePath: `specs/${context.partition}/verify.md`,
    status: existed ? 'updated' : 'created',
    content
  };
}

export function renderVerifyContractDocument(model: SddTaskModel, timestamp: string): string {
  return `---
contract: ${VERIFY_DOCUMENT_CONTRACT_VERSION}
version: 1.0.0
branch: ${model.branch}
based_on_tasks_hash: ${model.documents.tasksHash ?? 'missing'}
author_role: ${VERIFY_CONTRACT_AUTHOR_ROLE}
independent_from_roles:
${REQUIRED_INDEPENDENT_FROM_ROLES.map((role) => `  - ${role}`).join('\n')}
created_at: ${timestamp}
updated_at: ${timestamp}
---

# Verify Contract: ${model.branch}

## 1. Purpose

This document maps executable SDD tasks to verification expectations. It is derived from specs/${model.branch}/tasks.md and is not runtime evidence. It is owned by the verification-designer role and must remain independent from task planning and implementation authority.

## 2. Task Verification Matrix

| Task | Acceptance refs | Validation commands | Required artifacts | Verification availability |
|---|---|---|---|---|
${model.tasks.length > 0 ? model.tasks.map(renderTaskMatrixRow).join('\n') : '| none | none | none | none | none |'}

## 3. Verification Rules

- The agent that creates tasks.md must not be the same authority that owns verify.md.
- The implementer must not own verify.md or perform authoritative goal verification.
- Reviewer and validator evidence must use run-relative artifacts/<file> paths.
- Physical evidence files live under branch evidence .sdd/runs/<branchSlug>/evidence/artifacts/.
- Goal-level verify must resolve the latest eligible run by branch and task unless --run is explicitly supplied for replay.
- PASS requires policy-backed acceptance evidence, not mention-only acceptance text.
- Sync-back must inspect the generated proposal before applying task status changes.

## 4. Out of Scope

- This document does not replace runtime.sqlite, branch evidence artifacts, validator reports, or sync-back proposals.
- This document does not authorize publish, push, tag, release, or source changes outside the selected task boundary.
`;
}

function renderTaskMatrixRow(task: SddTask): string {
  return `| ${task.id} | ${cell(task.acceptanceRefs)} | ${cell(task.validation)} | ${cell(task.requiredArtifacts)} | ${cell(task.verificationAvailability)} |`;
}

function cell(values: string[]): string {
  return values.length > 0 ? values.join('<br>') : 'none';
}

function readDocumentScalar(raw: string, key: string): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = raw.match(new RegExp(`^[^\\S\\r\\n]*(?:-[^\\S\\r\\n]*)?${escapedKey}:[^\\S\\r\\n]*(.+?)[^\\S\\r\\n]*$`, 'm'));
  return match ? cleanDocumentValue(match[1]) : null;
}

function readDocumentList(raw: string, key: string): string[] {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const scalar = readDocumentScalar(raw, key);
  if (scalar && scalar !== '[]') {
    if (scalar.startsWith('[') && scalar.endsWith(']')) {
      return scalar.slice(1, -1).split(',').map(cleanDocumentValue).filter(Boolean);
    }
    return [scalar];
  }

  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^\\s*${escapedKey}:\\s*$`).test(line));
  if (start === -1) {
    return [];
  }

  const values: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line) || /^---\s*$/.test(line)) {
      break;
    }
    const item = line.trim().match(/^-\s+(.+)$/)?.[1];
    if (item) {
      values.push(cleanDocumentValue(item));
    }
  }
  return values;
}

function cleanDocumentValue(value: string): string {
  return value.trim().replace(/^["'`]|["'`]$/g, '');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
