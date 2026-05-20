import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const SDD_VERSION = '0.3.0';
export const AI_ENTRY_CONTRACT = 'sdd-ai-entry-v1';
export const CLAUDE_CODE_TOOL_ID = 'claude-code';

export type AiToolId = typeof CLAUDE_CODE_TOOL_ID;
export type AiToolSelection = 'auto' | AiToolId | 'none';
export type AiEntryKind = 'skill' | 'command';
export type AiEntryStatus = 'created' | 'unchanged' | 'updated' | 'missing' | 'drifted' | 'user-modified' | 'foreign' | 'conflict' | 'skipped' | 'obsolete' | 'removed';

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
  version: typeof SDD_VERSION;
  ownership: 'sdd-managed';
  sourceContract: typeof AI_ENTRY_CONTRACT;
}
export type ManagedAssetDriftStatus = 'current' | 'drifted' | 'user-modified' | 'foreign' | 'missing' | 'conflict' | 'skipped' | 'obsolete';

export interface ManagedAssetManifestEntry {
  path: string;
  artifactId: string;
  tool: AiToolId;
  version: typeof SDD_VERSION;
  hash: string;
  ownership: 'sdd-managed';
  driftStatus: ManagedAssetDriftStatus;
  sourceContract: typeof AI_ENTRY_CONTRACT;
  lastProjectedAt: string;
}
export interface AiEntryStatusReport {
  tool: AiToolId;
  id: string;
  kind: AiEntryKind;
  relativePath: string;
  status: AiEntryStatus;
  message: string;
  action?: string;
  manifest: ManagedAssetManifestEntry;
  driftStatus: ManagedAssetDriftStatus;
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
  force?: boolean;
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
        body: `# SDD Platform

Use the local or globally installed \`sdd\` CLI as the source of truth for this repository's SDD workflow. This skill is the manual \`/sdd\` root intent router; do not treat this generated file as the workflow brain.

1. Accept the user's natural-language intent, then run \`sdd status\` first and report only workflow state, blocker/current task, and the recommended next command; do not paste or restate full status unless asked.
2. Run \`sdd instructions overview --json\` only when the next action is unclear or you need the full dynamic command contract.
3. Dynamic routing comes from CLI/core output, not this skill text; follow the recommended next command before choosing a dedicated \`/sdd:*\` entry.
4. If the intent is still ambiguous after status, ask one clarifying question before spec/plan/do/test/sync-back/ship work.
5. For risky requests that mention state-machine, concurrency, database, SQL, security, API/schema, CI/build, or external unknowns, run \`sdd lifecycle decide --from-text <text>\` before spec/plan work.
6. If status reports workflow_status=not_started, use \`/sdd:spec\` to create the current Git branch partition; do not use \`sdd init\` as the workflow branch entry.
7. If status points to gaps, drift, or doctor/update work, handle that maintenance action before do/test/ship.
8. If status recommends a task, run \`sdd tasks inspect <task_id>\` and use the task Boundary and Acceptance before offering \`/sdd:do\`.
9. If status recommends do, test, or sync-back, follow the dedicated \`/sdd:do\`, \`/sdd:test\`, or \`/sdd:sync-back\` entry instead of inferring completion from chat.
10. If status recommends sync-back, use \`/sdd:sync-back\` to run \`sdd sync-back inspect --branch <branch> --task <task_id>\` first and follow apply_policy; pass an explicit run id only for replay/CI/old-run inspection. Direct-safe tasks may apply directly, confirm-required tasks need human confirmation and \`--approved\`.
11. If the user asks to release or go online, use \`/sdd:ship\` / \`sdd ship --branch <branch> --dry-run\` for local readiness first; do not publish, push, tag, or create external release state without explicit confirmation.

Refresh this managed skill with \`sdd update\` when drift is reported.
`
      },

      commandEntry('sdd-doctor', '.claude/commands/sdd/doctor.md', 'doctor', 'Check project config, scoped run evidence, generated AI entry drift, and use sdd doctor fast|deep|recover for explicit diagnostic scope.'),
      {
        id: 'sdd-spec',
        kind: 'command',
        relativePath: '.claude/commands/sdd/spec.md',
        title: 'SDD spec',
        body: `Create or refine the SDD spec document as the workflow partition entry, not a technical design. Omit --branch to use the current Git branch partition; pass --branch <name> only when intentionally writing another partition. Agent visibility: scout may gather bounded context; spec-reviewer may review objective, scope, acceptance, and risk gates; evidence lands in spec review artifacts.

Run:

\`\`\`bash
sdd status
sdd instructions spec --json
\`\`\`

Then create or refine \`specs/<partition>/spec.md\` with objective/customer value, problem/intent, users/actors, user stories or scenarios, in-scope/out-of-scope boundaries, functional and non-functional requirements, acceptance criteria with stable IDs such as AC-1, assumptions/dependencies, risks/hard gates, open questions, and lifecycle decision reference.

Repeated /sdd:spec calls represent requirement revisions. If plan/tasks/run evidence already exists, status must expose stale downstream hash state before plan/tasks/do continues.

Do not design implementation in \`spec.md\`; stop before plan work when requirements, acceptance IDs, or risk gates are unclear.
`
      },
      {
        id: 'sdd-plan',
        kind: 'command',
        relativePath: '.claude/commands/sdd/plan.md',
        title: 'SDD plan',
        body: `Refine the existing SDD plan document as a deliverable technical solution, not a lightweight approach summary. Include based_on_spec_hash from status so later /sdd:spec revisions can mark this plan stale. Agent visibility: scout/planner/spec-reviewer may participate; evidence lands in plan or review artifacts.

Run:

\`\`\`bash
sdd instructions plan --json
\`\`\`

Then write or refine \`specs/<branch>/plan.md\` as the technical bridge from approved spec to task-ready execution. Include background, goals/non-goals, current state, target design, architecture/component impact, interaction/sequence design, state/data design, API/schema design, concurrency/transaction/consistency design, key decisions, alternatives, risk control, rollout/rollback, validation matrix, and task breakdown rationale.

Use PlantUML fences for diagrams when useful: component diagrams for impact surface, sequence/activity diagrams for workflows and concurrency, state diagrams for state-machine risk, and deployment/data diagrams when release or data topology matters. Apply risk-driven requirements before task writing: state-machine risk needs a state diagram; concurrency risk needs sequence/activity plus consistency design; database risk needs data/transaction/rollback design; api_schema risk needs interface/schema compatibility; security/sql risk needs explicit risk controls.

Stop before creating tasks when the technical solution is incomplete or has unresolved design gaps.
`
      },
      {
        id: 'sdd-tasks',
        kind: 'command',
        relativePath: '.claude/commands/sdd/tasks.md',
        title: 'SDD tasks',
        body: `Refine the existing SDD tasks document as an executable evidence contract, not a plain TODO list or project-management backlog. Include based_on_plan_hash from status so later plan/spec revisions can mark these tasks stale. Agent visibility: planner/reviewer may participate; execution evidence later lands in implement/review/validation artifacts.

Run:

\`\`\`bash
sdd instructions tasks --json
sdd tasks format
\`\`\`

Then write or refine \`specs/<branch>/tasks.md\` from the approved spec and plan. Include Delivery Map, Wave Plan, task blocks with acceptance_refs and plan_refs, affected_files, validation, risk, agent_fit, allowed_agents, required_artifacts, verification_availability, autonomy, plus companion sections for Boundary, Acceptance, Definition of Done, Evidence Expectations, and Implementation Notes.

Keep metadata inside the \`\`\`sdd-task fenced block and companion sections outside it. Stop before \`sdd do task\` when task boundary, acceptance refs, plan refs, or evidence requirements are unclear.
`
      },
      {
        id: 'sdd-test',
        kind: 'command',
        relativePath: '.claude/commands/sdd/test.md',
        title: 'SDD test',
        body: `Execute task validation commands, capture command output, evaluate acceptance evidence coverage, and return one unified test judgment for the task.

Run:

\`\`\`bash
sdd status
sdd instructions test --json
sdd verifies inspect --branch <branch>
sdd test task <task_id> --branch <branch>
\`\`\`

Workflow:

1. Confirm \`verify.md\` exists and is current for the selected branch.
2. Run \`sdd test task <task_id> --branch <branch>\` to execute task validation commands and evaluate mapped acceptance coverage; use \`--command\` only for a deliberate narrowed override.
3. Treat generated command logs, test index, validator artifact, and unified evidence projection as runtime evidence references, not as workflow documents.
4. If \`/sdd:test\` returns PASS, proceed to \`/sdd:sync-back\` / \`sdd sync-back inspect\`; if it returns FAIL or BLOCKED, fix the reported command or evidence gaps and rerun \`/sdd:test\`.

Do not auto-fix failures, create sync-back proposals, commit, publish, or treat command success alone as semantic PASS.
`
      },
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

Agent evidence flow: scout gathers bounded context only; implementer edits only inside the selected task boundary; reviewer records review evidence; debugger is optional after review failure; validator records validation and acceptance mapping. Artifact flags use run-relative paths such as \`artifacts/implement-<task_id>.md\`, \`artifacts/review-<task_id>.md\`, and \`artifacts/validation-<task_id>.md\`; physical files live under branch evidence \`.sdd/runs/<branchSlug>/evidence/artifacts/\`. This command entry does not authorize autonomous background execution.


1. Resolve exactly one task id from the user request or from the \`sdd status\` recommended next command. Stop and ask if it is ambiguous.
2. Read \`sdd tasks inspect <task_id>\` and restate the task Boundary, Acceptance, gaps, and validation commands.
3. Work only inside the selected task boundary; do not expand scope without a checkpoint.
4. Before creating explicit result artifacts, use templates such as \`sdd artifact template artifacts/implement-<task_id>.md --task <task_id> --agent implementer\`, \`sdd artifact template artifacts/review-<task_id>.md --task <task_id> --agent reviewer\`, and \`sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator\`; save the physical file under branch evidence \`.sdd/runs/<branchSlug>/evidence/artifacts/\`, pass the run-relative \`artifacts/<file>\` path to CLI flags, and keep source/test files in \`## Evidence\`, not in \`sdd-result.artifacts\`.
5. Run \`sdd artifact validate <run_id> <artifact> --task <task_id> --agent <agent>\` before passing artifacts into \`sdd do task <task_id>\`.
6. Run \`sdd do task <task_id>\` with explicit artifact paths when evidence is available; this path records Phase 3 artifact ingestion evidence for doctor.
7. Report the run id, status, agent evidence artifacts, gaps, and next gate. If completed, recommend \`/sdd:test\` / \`sdd test task <task_id> --branch <branch>\` so command execution and acceptance coverage are judged together.

Do not create worktrees, auto commit, or mark missing evidence as PASS.
`
      },
      {
        id: 'sdd-sync-back',
        kind: 'command',
        relativePath: '.claude/commands/sdd/sync-back.md',
        title: 'SDD sync-back',
        body: `Inspect and optionally apply the verified task completion proposal back into tasks.md. Sync-back is a document write-back gate, not another implementation step.

Run:

\`\`\`bash
sdd status
sdd instructions sync-back --json
sdd sync-back inspect --branch <branch> --task <task_id>
\`\`\`

Workflow:

1. Resolve exactly one task id and workflow partition from \`sdd status\`, the recommended command, or the user request. Stop and ask if either is ambiguous.
2. Run \`sdd sync-back inspect --branch <branch> --task <task_id>\` before any apply; pass \`<run_id>\` only for replay, CI, or old-run inspection.
3. Report what apply would write: target tasks file, task id, markdown status transition, proposal path, evidence artifacts, apply_policy, and policy reasons.
4. If inspect reports \`status=ready\` and \`apply_policy=direct\`, run \`sdd sync-back apply --branch <branch> --task <task_id>\`.
5. If inspect reports approval_required=true, ask for explicit human confirmation and only then run \`sdd sync-back apply --branch <branch> --task <task_id> --approved\`.
6. Explain that apply writes only tasks.md for the target task, appends the sync-back implementation note, marks run sync_back applied, and rebuilds the local run index.

Do not apply without inspect, do not use \`--approved\` without human confirmation, and do not change source files during sync-back.
`
      },
      {
        id: 'sdd-ship',
        kind: 'command',
        relativePath: '.claude/commands/sdd/ship.md',
        title: 'SDD ship',
        body: `Run local release-readiness checks and optionally write \`specs/<branch>/release.md\`. This command is a preflight/release-summary gate; it does not authorize npm publish, git push, git tag, deploy, or external release creation.

Run:

\`\`\`bash
sdd ship --branch <branch> --dry-run
sdd instructions ship --json
\`\`\`

Workflow:

1. Resolve the target branch/partition from \`sdd status\` or the user's explicit branch.
2. Run \`sdd ship --branch <branch> --dry-run\` first; inspect PASS/BLOCKED readiness and next actions without writing \`release.md\`.
3. If the readiness output is acceptable, run \`sdd ship --branch <branch>\` to write \`specs/<branch>/release.md\`.
4. Use \`sdd statusline --branch <branch>\` for compact runtime/test/team/token/evidence health when reporting progress.
5. Run generated-entry drift, current-run health, typecheck, test, build, and package dry-run gates when preparing a real package release.
6. Stop before publish, push, tag, deploy, or external release creation unless the user explicitly approves that separate action.

Do not skip failed gates, do not treat historical doctor debt as a release blocker unless it affects current evidence, and do not mutate external release state from this preflight command.
`
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
    const templates = adapter.entries();
    const projectedEntries = templates.map((template) => renderProjectedEntry(adapter, template));
    const expectedPaths = new Set(projectedEntries.map((projected) => normalizeRelativePath(projected.relativePath)));
    for (const projected of projectedEntries) {
      entries.push(await applyEntry(projectRoot, projected, options.check === true, options.force === true));
    }
    entries.push(...await inspectObsoleteManagedEntries(projectRoot, adapter, templates, expectedPaths, options.check === true, options.force === true));
    results.push({ tool: adapter.id, entries });
  }
  return results;
}

export async function checkAiToolEntryDrift(projectRoot: string, options: AiProjectionOptions = {}): Promise<AiProjectionResult[]> {
  return applyAiToolEntries(projectRoot, { ...options, check: true });
}

export function summarizeAiProjectionStatus(results: AiProjectionResult[]): 'PASS' | 'WARN' | 'FAIL' {
  const statuses = results.flatMap((result) => result.entries.map((entry) => entry.status));
  if (statuses.some((status) => status === 'foreign' || status === 'conflict' || status === 'drifted' || status === 'user-modified' || status === 'missing' || status === 'obsolete')) {
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
    body: `${summary}\n\nRun:\n\n\`\`\`bash\nsdd instructions ${action} --json\n${helperCommand}\n\`\`\`\n\nUse the helper command output as the canonical format reference. Keep harness metadata such as agent_fit, verification_availability, autonomy, allowed_agents, and required_artifacts inside the fenced sdd-task block; keep companion sections such as #### Boundary and #### Acceptance outside the fence. Then follow the returned CLI/core instruction payload.\n`
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
    hash,
    version: SDD_VERSION,
    ownership: 'sdd-managed',
    sourceContract: AI_ENTRY_CONTRACT
  };
}

async function applyEntry(projectRoot: string, projected: ProjectedAiEntry, checkOnly: boolean, force: boolean): Promise<AiEntryStatusReport> {
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

  if (current.version === SDD_VERSION && current.hash === projected.hash && current.bodyHash === projected.hash) {
    return statusReport(projected, 'unchanged', 'Managed AI entry is current.');
  }

  if (current.bodyHash !== current.hash && (checkOnly || !force)) {
    return statusReport(projected, 'user-modified', 'Managed AI entry has user modifications outside the recorded hash.', 'Review manually; sdd update will not overwrite user-modified entries by default.');
  }

  if (!checkOnly) {
    await writeFile(absolutePath, projected.content, 'utf8');
    return statusReport(projected, 'updated', 'Managed AI entry refreshed.');
  }

  return statusReport(projected, 'drifted', 'Managed AI entry template drifted from the platform projection.', 'Run sdd update.');
}

async function inspectObsoleteManagedEntries(
  projectRoot: string,
  adapter: AiToolAdapter,
  templates: AiToolEntryTemplate[],
  expectedPaths: Set<string>,
  checkOnly: boolean,
  force: boolean
): Promise<AiEntryStatusReport[]> {
  const reports: AiEntryStatusReport[] = [];
  for (const absolutePath of await listManagedEntryCandidatePaths(projectRoot, templates)) {
    const relativePath = normalizeRelativePath(path.relative(projectRoot, absolutePath));
    if (expectedPaths.has(relativePath)) {
      continue;
    }

    const existing = await readFile(absolutePath, 'utf8');
    const current = inspectManagedEntry(existing);
    if (!current.managed || current.contract !== AI_ENTRY_CONTRACT || current.tool !== adapter.id) {
      continue;
    }

    const obsolete = obsoleteProjectedEntry(adapter, relativePath, current);
    if (current.bodyHash !== current.hash && !force) {
      reports.push(statusReport(obsolete, 'user-modified', 'Obsolete managed AI entry has user modifications.', 'Review manually; sdd update will not remove user-modified obsolete entries by default.'));
      continue;
    }

    if (checkOnly) {
      reports.push(statusReport(obsolete, 'obsolete', 'Managed AI entry is no longer projected.', 'Run sdd update to remove the obsolete entry.'));
      continue;
    }

    await unlink(absolutePath);
    reports.push(statusReport(obsolete, 'removed', 'Obsolete managed AI entry removed.'));
  }
  return reports;
}

async function listManagedEntryCandidatePaths(projectRoot: string, templates: AiToolEntryTemplate[]): Promise<string[]> {
  const directories = new Set<string>();
  for (const template of templates) {
    const directory = normalizeRelativePath(path.dirname(template.relativePath));
    directories.add(directory);
    if (directory.startsWith('.claude/commands/')) {
      directories.add('.claude/commands');
    }
    if (directory.startsWith('.claude/skills/')) {
      directories.add('.claude/skills');
    }
  }
  const files = new Set<string>();
  for (const directory of directories) {
    await collectFiles(path.join(projectRoot, directory), files);
  }
  return [...files];
}

async function collectFiles(directory: string, files: Set<string>): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error: unknown) => {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(absolutePath, files);
    } else if (entry.isFile()) {
      files.add(absolutePath);
    }
  }
}

function obsoleteProjectedEntry(
  adapter: AiToolAdapter,
  relativePath: string,
  current: { hash: string | null; bodyHash: string; kind: string | null; artifactId: string | null }
): ProjectedAiEntry {
  return {
    tool: adapter.id,
    id: current.artifactId ?? path.basename(relativePath, path.extname(relativePath)),
    kind: current.kind === 'skill' ? 'skill' : 'command',
    relativePath,
    content: '',
    hash: current.hash ?? current.bodyHash,
    version: SDD_VERSION,
    ownership: 'sdd-managed',
    sourceContract: AI_ENTRY_CONTRACT
  };
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}

function inspectManagedEntry(content: string): { managed: boolean; contract: string | null; version: string | null; hash: string | null; bodyHash: string; tool: string | null; kind: string | null; artifactId: string | null } {
  const body = content.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
  return {
    managed: /^sdd_managed:\s*true\s*$/m.test(content),
    contract: readFrontmatterScalar(content, 'sdd_contract'),
    version: readFrontmatterScalar(content, 'sdd_version')?.replace(/^"|"$/g, '') ?? null,
    hash: readFrontmatterScalar(content, 'sdd_hash')?.replace(/^sha256:/, '') ?? null,
    bodyHash: hashManagedBody(body),
    tool: readFrontmatterScalar(content, 'sdd_tool'),
    kind: readFrontmatterScalar(content, 'sdd_artifact_kind'),
    artifactId: readFrontmatterScalar(content, 'sdd_artifact_id')
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
    action,
    manifest: manifestEntry(projected, status),
    driftStatus: driftStatusFor(status)
  };
}

function manifestEntry(projected: ProjectedAiEntry, status: AiEntryStatus): ManagedAssetManifestEntry {
  return {
    path: projected.relativePath,
    artifactId: projected.id,
    tool: projected.tool,
    version: projected.version,
    hash: `sha256:${projected.hash}`,
    ownership: projected.ownership,
    driftStatus: driftStatusFor(status),
    sourceContract: projected.sourceContract,
    lastProjectedAt: new Date().toISOString()
  };
}

function driftStatusFor(status: AiEntryStatus): ManagedAssetDriftStatus {
  if (status === 'unchanged' || status === 'created' || status === 'updated' || status === 'removed') {
    return 'current';
  }
  return status;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
