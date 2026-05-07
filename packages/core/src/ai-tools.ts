import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const SDD_VERSION = '0.1.0';
export const AI_ENTRY_CONTRACT = 'sdd-ai-entry-v1';
export const CLAUDE_CODE_TOOL_ID = 'claude-code';

export type AiToolId = typeof CLAUDE_CODE_TOOL_ID;
export type AiToolSelection = 'auto' | AiToolId | 'none';
export type AiEntryKind = 'skill' | 'command';
export type AiEntryStatus = 'created' | 'unchanged' | 'updated' | 'missing' | 'drifted' | 'foreign' | 'conflict' | 'skipped';

export interface AiToolEntryTemplate {
  id: string;
  kind: AiEntryKind;
  relativePath: string;
  title: string;
  body: string;
}

export interface ProjectedAiEntry {
  tool: AiToolId;
  id: string;
  kind: AiEntryKind;
  relativePath: string;
  content: string;
  hash: string;
}

export interface AiEntryStatusReport {
  tool: AiToolId;
  id: string;
  kind: AiEntryKind;
  relativePath: string;
  status: AiEntryStatus;
  message: string;
  action?: string;
}

export interface AiProjectionResult {
  tool: AiToolId;
  entries: AiEntryStatusReport[];
}

export interface AiToolAdapter {
  id: AiToolId;
  displayName: string;
  entries(): AiToolEntryTemplate[];
}

export interface AiProjectionOptions {
  tool?: AiToolSelection;
  check?: boolean;
}

export const claudeCodeAdapter: AiToolAdapter = {
  id: CLAUDE_CODE_TOOL_ID,
  displayName: 'Claude Code',
  entries() {
    return [
      {
        id: 'sdd',
        kind: 'skill',
        relativePath: '.claude/skills/sdd/SKILL.md',
        title: 'SDD Platform',
        body: `# SDD Platform\n\nUse the local or globally installed \`sdd\` CLI as the source of truth for this repository's SDD workflow.\n\nStart by running:\n\n\`\`\`bash\nsdd status\nsdd instructions overview --json\n\`\`\`\n\nRespect the returned boundaries. Do not treat this generated file as the workflow brain; refresh it with \`sdd update\` when drift is reported.\n`
      },
      {
        id: 'sdd-root',
        kind: 'command',
        relativePath: '.claude/commands/sdd.md',
        title: 'SDD',
        body: `Run the SDD platform workflow entrypoint for this repository.\n\n1. Run \`sdd status\` and report documents, task counts, latest run, gaps, and the recommended next command.\n2. Follow the recommended next command from CLI/core output; do not infer dynamic state from this generated markdown.\n3. If status points to the starter \`ONBOARDING-1\` task, refine or replace the existing starter docs under \`specs/<branch>/\`; do not create parallel documents.\n4. If status points to gaps, drift, or doctor/update work, handle that maintenance action before do/verify.\n5. If status recommends a task, run \`sdd tasks inspect <task_id>\` and use the task Boundary and Acceptance before offering \`/sdd:do\`.\n6. If status recommends sync-back, run \`sdd sync-back inspect <run_id> --task <task_id>\` and follow apply_policy: direct-safe tasks may apply directly, confirm-required tasks need human confirmation and \`--approved\`.\n`
      },
      {
        id: 'sdd-init',
        kind: 'command',
        relativePath: '.claude/commands/sdd/init.md',
        title: 'SDD init',
        body: `Initialize or refresh the SDD project configuration, starter semantic documents, and generated AI entries.\n\nRun:\n\n\`\`\`bash\nsdd init --ai claude-code\nsdd status\n\`\`\`\n\nDefault init creates \`.sdd/project.yml\`, \`.sdd/runs/\`, starter \`specs/<branch>/spec.md\`, \`plan.md\`, \`tasks.md\`, and managed Claude Code entries. Existing semantic documents are preserved unless \`--force\` is explicit.\n\nThen follow the returned CLI/core instruction payload and refine the starter docs before implementation.\n`
      },
      commandEntry('sdd-doctor', '.claude/commands/sdd/doctor.md', 'doctor', 'Check project config, scoped run evidence, generated AI entry drift, and use sdd run archive <run_id> for failed exploratory runs.'),
      commandEntry('sdd-update', '.claude/commands/sdd/update.md', 'update', 'Refresh managed generated AI entries when drift is reported.'),
      commandEntry('sdd-spec', '.claude/commands/sdd/spec.md', 'spec', 'Create if missing during init, otherwise refine the existing SDD spec document for requirements, scope, non-goals, and acceptance.'),
      commandEntry('sdd-plan', '.claude/commands/sdd/plan.md', 'plan', 'Create if missing during init, otherwise refine the existing SDD plan document for approach, impact, risks, and validation strategy.'),
      workflowCommandEntry('sdd-tasks', '.claude/commands/sdd/tasks.md', 'tasks', 'Create if missing during init, otherwise refine existing graph-ready SDD task blocks from an approved spec and plan.', 'sdd tasks format'),
      {
        id: 'sdd-do',
        kind: 'command',
        relativePath: '.claude/commands/sdd/do.md',
        title: 'SDD do',
        body: `Execute one approved SDD task boundary through the ingestion-aware task workflow.

Run:

\`\`\`bash
sdd status
sdd instructions do --json
sdd tasks inspect <task_id>
\`\`\`

Workflow:

1. Resolve exactly one task id from the user request or from the \`sdd status\` recommended next command. Stop and ask if it is ambiguous.
2. Read \`sdd tasks inspect <task_id>\` and restate the task Boundary, Acceptance, gaps, and validation commands.
3. Work only inside the selected task boundary; do not expand scope without a checkpoint.
4. Before creating explicit result artifacts, use \`sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent>\` and keep source/test files in \`## Evidence\`, not in \`sdd-result.artifacts\`.
5. Run \`sdd artifact validate <run_id> <artifact> --task <task_id> --agent <agent>\` before passing artifacts into \`sdd do task <task_id>\`.
6. Run \`sdd do task <task_id>\` with explicit artifact paths when evidence is available; this path records Phase 3 artifact ingestion evidence for doctor.
7. Report run id, status, artifacts, and gaps. If completed, recommend \`sdd verify task <task_id> --run <run_id>\`.

Do not create worktrees, auto commit, or mark missing evidence as PASS.
`
      },
      {
        id: 'sdd-verify',
        kind: 'command',
        relativePath: '.claude/commands/sdd/verify.md',
        title: 'SDD verify',
        body: `Verify task acceptance coverage from review and validation evidence.\n\nRun:\n\n\`\`\`bash\nsdd status\nsdd run inspect <run_id>\nsdd instructions verify --json\n\`\`\`\n\nWorkflow:\n\n1. Resolve exactly one run id and task id from \`sdd status\`, the latest run, or the user request. Stop and ask if either is ambiguous.\n2. Inspect \`sdd run inspect <run_id>\` before verifying so state, events, artifacts, validation, and sync-back are visible.\n3. Ensure the validator artifact includes exact task Acceptance text, preferably generated with \`sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator\`.\n4. Run \`sdd artifact validate <run_id> <artifact> --task <task_id> --agent validator\` before goal-level verify.\n5. Run \`sdd verify task <task_id> --run <run_id>\` for goal-level acceptance coverage.\n6. If verify PASS, run \`sdd sync-back inspect <run_id> --task <task_id>\` and follow apply_policy.\n7. Direct-safe tasks may run \`sdd sync-back apply\` directly; confirm-required tasks require human confirmation and \`--approved\` before writing \`tasks.md\`.\n\nDo not auto-fix failures, force push, or mark completed when blocking gaps remain.\n`
      },
      {
        id: 'sdd-instructions',
        kind: 'command',
        relativePath: '.claude/commands/sdd/instructions.md',
        title: 'SDD instructions',
        body: `Fetch dynamic SDD instructions and follow the status-first decision tree to the next actionable step.\n\nRun:\n\n\`\`\`bash\nsdd status\nsdd instructions overview --json\n\`\`\`\n\nThen apply this decision tree:\n\n- **If status reports gaps or drift**: run the recommended command. For generated entry drift, run \`sdd update\`, then \`sdd doctor\` again.\n- **If status recommends a task**: run \`sdd tasks inspect <task_id>\`, then offer \`/sdd:do\` inside the approved task boundary.\n- **If status recommends run inspection**: run \`sdd run inspect <run_id>\` and report state, events, artifacts, validation, and sync-back.\n- **After a task completes**: run \`sdd verify task <task_id> --run <run_id>\` for acceptance coverage.\n- **After verify PASS**: run \`sdd sync-back inspect <run_id> --task <task_id>\` and follow apply_policy: direct-safe tasks may apply directly, confirm-required tasks need human confirmation and \`--approved\`.\n\nAlways report the result to the user. Do not loop in maintenance checks when status already gives a next workflow action.\n`
      }
    ];
  }
};

export function getAiToolAdapters(selection: AiToolSelection = 'auto'): AiToolAdapter[] {
  if (selection === 'none') {
    return [];
  }
  if (selection === 'auto' || selection === CLAUDE_CODE_TOOL_ID) {
    return [claudeCodeAdapter];
  }
  return [];
}

export function projectAiToolEntries(options: AiProjectionOptions = {}): ProjectedAiEntry[] {
  return getAiToolAdapters(options.tool).flatMap((adapter) =>
    adapter.entries().map((entry) => renderProjectedEntry(adapter, entry))
  );
}

export async function applyAiToolEntries(projectRoot: string, options: AiProjectionOptions = {}): Promise<AiProjectionResult[]> {
  const results: AiProjectionResult[] = [];
  for (const adapter of getAiToolAdapters(options.tool)) {
    const entries: AiEntryStatusReport[] = [];
    for (const template of adapter.entries()) {
      const projected = renderProjectedEntry(adapter, template);
      entries.push(await applyEntry(projectRoot, projected, options.check === true));
    }
    results.push({ tool: adapter.id, entries });
  }
  return results;
}

export async function checkAiToolEntryDrift(projectRoot: string, options: AiProjectionOptions = {}): Promise<AiProjectionResult[]> {
  return applyAiToolEntries(projectRoot, { ...options, check: true });
}

export function summarizeAiProjectionStatus(results: AiProjectionResult[]): 'PASS' | 'WARN' | 'FAIL' {
  const statuses = results.flatMap((result) => result.entries.map((entry) => entry.status));
  if (statuses.some((status) => status === 'foreign' || status === 'conflict' || status === 'drifted' || status === 'missing')) {
    return 'FAIL';
  }
  if (statuses.some((status) => status === 'skipped')) {
    return 'WARN';
  }
  return 'PASS';
}

function commandEntry(id: string, relativePath: string, action: string, summary: string): AiToolEntryTemplate {
  return {
    id,
    kind: 'command',
    relativePath,
    title: `SDD ${action}`,
    body: `${summary}\n\nRun:\n\n\`\`\`bash\nsdd instructions ${action} --json\n\`\`\`\n\nThen follow the returned CLI/core instruction payload.\n`
  };
}

function workflowCommandEntry(id: string, relativePath: string, action: string, summary: string, helperCommand: string): AiToolEntryTemplate {
  return {
    id,
    kind: 'command',
    relativePath,
    title: `SDD ${action}`,
    body: `${summary}\n\nRun:\n\n\`\`\`bash\nsdd instructions ${action} --json\n${helperCommand}\n\`\`\`\n\nUse the helper command output as the canonical format reference, keep companion sections such as #### Boundary and #### Acceptance outside the fenced metadata block, then follow the returned CLI/core instruction payload.\n`
  };
}

function renderProjectedEntry(adapter: AiToolAdapter, entry: AiToolEntryTemplate): ProjectedAiEntry {
  const hash = hashManagedBody(entry.body);
  const frontmatter = [
    '---',
    'sdd_managed: true',
    `sdd_contract: ${AI_ENTRY_CONTRACT}`,
    `sdd_version: "${SDD_VERSION}"`,
    `sdd_tool: ${adapter.id}`,
    `sdd_artifact_kind: ${entry.kind}`,
    `sdd_artifact_id: ${entry.id}`,
    'sdd_source: sdd-agent-platform',
    `sdd_hash: sha256:${hash}`,
    '---'
  ].join('\n');

  return {
    tool: adapter.id,
    id: entry.id,
    kind: entry.kind,
    relativePath: entry.relativePath,
    content: `${frontmatter}\n\n${entry.body}`,
    hash
  };
}

async function applyEntry(projectRoot: string, projected: ProjectedAiEntry, checkOnly: boolean): Promise<AiEntryStatusReport> {
  const absolutePath = path.join(projectRoot, projected.relativePath);
  const existing = await readFile(absolutePath, 'utf8').catch((error: unknown) => {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  });

  if (existing === null) {
    if (!checkOnly) {
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, projected.content, 'utf8');
      return statusReport(projected, 'created', 'Managed AI entry created.');
    }
    return statusReport(projected, 'missing', 'Managed AI entry is missing.', 'Run sdd update.');
  }

  const current = inspectManagedEntry(existing);
  if (!current.managed) {
    return statusReport(projected, 'foreign', 'Target path exists but is not managed by sdd.', 'Move the file or choose another entry path before running sdd update.');
  }

  if (current.contract !== AI_ENTRY_CONTRACT) {
    return statusReport(projected, 'conflict', `Managed AI entry contract mismatch: ${current.contract ?? 'missing'}.`, 'Review the file before running sdd update.');
  }

  if (current.hash === projected.hash && current.bodyHash === projected.hash) {
    return statusReport(projected, 'unchanged', 'Managed AI entry is current.');
  }

  if (!checkOnly) {
    await writeFile(absolutePath, projected.content, 'utf8');
    return statusReport(projected, 'updated', 'Managed AI entry refreshed.');
  }

  return statusReport(projected, 'drifted', 'Managed AI entry content drifted.', 'Run sdd update.');
}

function inspectManagedEntry(content: string): { managed: boolean; contract: string | null; hash: string | null; bodyHash: string } {
  const body = content.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
  return {
    managed: /^sdd_managed:\s*true\s*$/m.test(content),
    contract: readFrontmatterScalar(content, 'sdd_contract'),
    hash: readFrontmatterScalar(content, 'sdd_hash')?.replace(/^sha256:/, '') ?? null,
    bodyHash: hashManagedBody(body)
  };
}

function readFrontmatterScalar(content: string, key: string): string | null {
  const match = content.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'));
  return match?.[1]?.trim() ?? null;
}

function hashManagedBody(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

function statusReport(projected: ProjectedAiEntry, status: AiEntryStatus, message: string, action?: string): AiEntryStatusReport {
  return {
    tool: projected.tool,
    id: projected.id,
    kind: projected.kind,
    relativePath: projected.relativePath,
    status,
    message,
    action
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
