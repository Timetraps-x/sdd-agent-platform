import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const SDD_VERSION = '0.3.0';
export const AI_ENTRY_CONTRACT = 'sdd-ai-entry-v1';
export const CLAUDE_CODE_TOOL_ID = 'claude-code';

export type AiToolId = typeof CLAUDE_CODE_TOOL_ID;
export type AiToolSelection = 'auto' | AiToolId | 'none';
export type AiEntryKind = 'skill' | 'command';
export type AiEntryStatus = 'created' | 'unchanged' | 'updated' | 'missing' | 'drifted' | 'user-modified' | 'foreign' | 'conflict' | 'skipped';

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
export type ManagedAssetDriftStatus = 'current' | 'drifted' | 'user-modified' | 'foreign' | 'missing' | 'conflict' | 'skipped';

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
        body: `# SDD Platform\n\nUse the local or globally installed \`sdd\` CLI as the source of truth for this repository's SDD workflow.\n\nStart by running \`sdd status\`. Run \`sdd instructions overview --json\` only when the next action is unclear or you need the full dynamic command contract.\n\nUse \`sdd status\` for branch/source context and the recommended next command, but summarize only blockers, current task, and next action instead of replaying the full status output. For risky changes, run \`sdd lifecycle decide --from-text <text>\` before spec/plan work. Respect the returned boundaries. Do not treat this generated file as the workflow brain; refresh it with \`sdd update\` when drift is reported.\n`
      },
      {
        id: 'sdd-root',
        kind: 'command',
        relativePath: '.claude/commands/sdd.md',
        title: 'SDD',
        body: `Use SDD as the natural-language intent router for this repository while keeping CLI/core output as the source of truth.

1. Accept the user's natural-language intent, then run \`sdd status\` first and report only workflow state, blocker/current task, and the recommended next command; do not paste or restate full status unless asked.
2. Dynamic routing comes from CLI/core output, not this generated markdown; follow the recommended next command before choosing a dedicated \`/sdd:*\` entry.
3. If the intent is still ambiguous after status, ask one clarifying question before spec/plan/do/verify/sync-back/ship work.
4. For risky requests that mention state-machine, concurrency, database, SQL, security, API/schema, CI/build, or external unknowns, run \`sdd lifecycle decide --from-text <text>\` before spec/plan work.
5. If status reports workflow_status=not_started, use \`/sdd:spec\` to create the current Git branch partition; do not use \`sdd init\` as the workflow branch entry.
6. If status points to gaps, drift, or doctor/update work, handle that maintenance action before do/verify/ship.
7. If status recommends a task, run \`sdd tasks inspect <task_id>\` and use the task Boundary and Acceptance before offering \`/sdd:do\`.
8. If status recommends do, verify, or sync-back, follow the dedicated \`/sdd:do\`, \`/sdd:verify\`, or \`/sdd:sync-back\` entry instead of inferring completion from chat.
9. If status recommends sync-back, use \`/sdd:sync-back\` to run \`sdd sync-back inspect --branch <branch> --task <task_id>\` first and follow apply_policy; pass an explicit run id only for replay/CI/old-run inspection. Direct-safe tasks may apply directly, confirm-required tasks need human confirmation and \`--approved\`.
10. If the user asks to release or go online, use \`/sdd:ship\` and \`checklist.md\`; do not publish, push, tag, or create external release state without explicit confirmation.
`
      },

      commandEntry('sdd-doctor', '.claude/commands/sdd/doctor.md', 'doctor', 'Check project config, scoped run evidence, generated AI entry drift, and use sdd run archive <run_id> for failed exploratory runs.'),
      commandEntry('sdd-update', '.claude/commands/sdd/update.md', 'update', 'Refresh managed generated AI entries when drift is reported.'),
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

Agent evidence flow: scout gathers bounded context only; implementer edits only inside the selected task boundary; reviewer records review evidence; debugger is optional after review failure; validator records validation and acceptance mapping. Artifact flags use run-relative paths such as \`artifacts/implement-<task_id>.md\`, \`artifacts/review-<task_id>.md\`, and \`artifacts/validation-<task_id>.md\`; physical files live under \`.sdd/runs/<run_id>/artifacts/\`. This command entry does not authorize autonomous background execution.


1. Resolve exactly one task id from the user request or from the \`sdd status\` recommended next command. Stop and ask if it is ambiguous.
2. Read \`sdd tasks inspect <task_id>\` and restate the task Boundary, Acceptance, gaps, and validation commands.
3. Work only inside the selected task boundary; do not expand scope without a checkpoint.
4. Before creating explicit result artifacts, use templates such as \`sdd artifact template artifacts/implement-<task_id>.md --task <task_id> --agent implementer\`, \`sdd artifact template artifacts/review-<task_id>.md --task <task_id> --agent reviewer\`, and \`sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator\`; save the physical file under \`.sdd/runs/<run_id>/artifacts/\`, pass the run-relative \`artifacts/<file>\` path to CLI flags, and keep source/test files in \`## Evidence\`, not in \`sdd-result.artifacts\`.
5. Run \`sdd artifact validate <run_id> <artifact> --task <task_id> --agent <agent>\` before passing artifacts into \`sdd do task <task_id>\`.
6. Run \`sdd do task <task_id>\` with explicit artifact paths when evidence is available; this path records Phase 3 artifact ingestion evidence for doctor.
7. Report the run id, status, agent evidence artifacts, gaps, and next gate. If completed, recommend \`sdd verify task <task_id> --branch <branch>\`; pass \`--run <run_id>\` only for explicit replay/CI/old-run inspection.

Do not create worktrees, auto commit, or mark missing evidence as PASS.
`
      },
      {
        id: 'sdd-verify',
        kind: 'command',
        relativePath: '.claude/commands/sdd/verify.md',
        title: 'SDD verify',
        body: `Verify task acceptance coverage from review and validation evidence. By default, verify resolves the latest eligible run from the current/requested partition plus task id; pass \`--run <run_id>\` only for replay, CI, or old-run inspection.

Run:

\`\`\`bash
sdd status
sdd instructions verify --json
\`\`\`

Workflow:

1. Resolve exactly one task id and workflow partition from \`sdd status\`, the recommended command, or the user request. Stop and ask if either is ambiguous.
2. Omit \`--run\` by default so CLI/core resolves the latest eligible partition/task run; inspect an explicit run only when the user or CI names one.
3. Ensure the validator artifact includes exact task Acceptance text, preferably generated with \`sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator\`; pass the run-relative artifact path while storing the physical file under \`.sdd/runs/<run_id>/artifacts/\`.
4. Run \`sdd artifact validate <run_id> <artifact> --task <task_id> --agent validator\` before goal-level verify.
5. Run \`sdd verify task <task_id> --branch <branch>\` for goal-level acceptance coverage, adding \`--run <run_id>\` only for explicit old-run replay.
6. If verify PASS, use \`/sdd:sync-back\` to inspect the target tasks.md update before applying it.

Do not auto-fix failures, force push, or mark completed when blocking gaps remain.
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
        body: `Run release-readiness checks against checklist.md. This command is a preflight gate; it does not authorize npm publish, git push, git tag, or external release creation.

Run:

\`\`\`bash
sdd status --branch <branch>
sdd instructions ship --json
\`\`\`

Workflow:

1. Read \`checklist.md\` and use it as the release checklist.
2. Resolve the target branch/partition from \`sdd status\` or the user's explicit branch.
3. Confirm workflow tasks are complete or intentionally deferred, and that verified work has no unapplied sync-back proposal.
4. Run generated-entry drift, current-run health, typecheck, test, build, and package dry-run gates from the checklist.
5. Report PASS/BLOCKED by checklist section with failed commands and remaining manual confirmations.
6. Stop before publish, push, tag, or external release creation unless the user explicitly approves that separate action.

Do not skip failed gates, do not treat historical doctor debt as a release blocker unless it affects current evidence, and do not mutate release state from this preflight command.
`
      },
      {
        id: 'sdd-instructions',
        kind: 'command',
        relativePath: '.claude/commands/sdd/instructions.md',
        title: 'SDD instructions',
        body: `Fetch dynamic SDD instructions and follow the status-first decision tree to the next actionable step.\n\nRun:\n\n\`\`\`bash\nsdd status\nsdd instructions overview --json\n\`\`\`\n\nThen apply this decision tree:\n\n- **If status reports gaps or drift**: run the recommended command. For generated entry drift, run \`sdd update\`, then \`sdd doctor\` again.\n- **If status recommends a task**: run \`sdd tasks inspect <task_id>\`, then offer \`/sdd:do\` inside the approved task boundary.\n- **If status recommends verify or sync-back**: use the task id and partition from status/recommended command; omit \`--run\` unless an explicit run is named for replay, CI, or old-run inspection.\n- **If the next change has state-machine, concurrency, database, SQL, security, API/schema, CI/build, or external unknown risk**: run \`sdd lifecycle decide --from-text <text>\` and respect hard gates before spec/plan work.\n- **After a task completes**: run \`sdd verify task <task_id> --branch <branch>\` for acceptance coverage; CLI/core resolves the latest eligible run.\n- **After verify PASS**: use \`/sdd:sync-back\` to run \`sdd sync-back inspect --branch <branch> --task <task_id>\` and follow apply_policy: direct-safe tasks may apply directly, confirm-required tasks need human confirmation and \`--approved\`.\n\nReport only the selected next action, blockers, and commands you will run; do not paste full JSON/status output unless the user asks. Do not loop in maintenance checks when status already gives a next workflow action.\n`
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
      entries.push(await applyEntry(projectRoot, projected, options.check === true, options.force === true));
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
  if (statuses.some((status) => status === 'foreign' || status === 'conflict' || status === 'drifted' || status === 'user-modified' || status === 'missing')) {
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

function inspectManagedEntry(content: string): { managed: boolean; contract: string | null; version: string | null; hash: string | null; bodyHash: string } {
  const body = content.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
  return {
    managed: /^sdd_managed:\s*true\s*$/m.test(content),
    contract: readFrontmatterScalar(content, 'sdd_contract'),
    version: readFrontmatterScalar(content, 'sdd_version')?.replace(/^"|"$/g, '') ?? null,
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
  if (status === 'unchanged' || status === 'created' || status === 'updated') {
    return 'current';
  }
  return status;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
