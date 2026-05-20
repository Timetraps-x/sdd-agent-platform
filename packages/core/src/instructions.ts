import { SDD_VERSION } from './ai-tools.js';

export const SDD_INSTRUCTIONS_CONTRACT = 'sdd-instructions-v1';

export type InstructionAction = 'overview' | 'init' | 'doctor' | 'update' | 'spec' | 'plan' | 'tasks' | 'verifies' | 'test' | 'do' | 'verify' | 'sync-back' | 'ship' | 'run-task' | 'verify-task';

export interface SddInstructionPayload {
  contract: typeof SDD_INSTRUCTIONS_CONTRACT;
  version: string;
  action: InstructionAction;
  summary: string;
  requiredCommands: string[];
  allowedSideEffects: string[];
  forbiddenSideEffects: string[];
  nextSteps: string[];
}

const INSTRUCTION_PAYLOADS: Record<InstructionAction, Omit<SddInstructionPayload, 'contract' | 'version' | 'action'>> = {
  overview: {
    summary: 'Route natural-language SDD intent from branch/source status to task execution, agent evidence, partition-aware verification, explicit sync-back, and release readiness while keeping CLI/core output as source of truth.',
    requiredCommands: ['sdd status', 'sdd lifecycle decide --from-text <text>', 'sdd doctor', 'sdd tasks inspect <task_id>', 'sdd do task <task_id>', 'sdd test task <task_id> --branch <branch>', 'sdd sync-back inspect [<run_id>] --branch <branch> --task <task_id>', 'sdd sync-back apply [<run_id>] --branch <branch> --task <task_id> [--approved]', 'sdd instructions ship --json'],
    allowedSideEffects: ['read .sdd state', 'read specs documents', 'read generated AI entries'],
    forbiddenSideEffects: ['background write', 'worktree creation', 'auto commit', 'force push', 'unapproved complex sync-back apply', 'publish or push release artifacts without explicit human confirmation'],
    nextSteps: [
      'Treat /sdd as a natural-language intent router, then run sdd status first to see branch/source context and the recommended next command; report only workflow state, blocker/current task, and next action unless the user asks for full detail.',
      'Dynamic routing comes from CLI/core output; follow the recommended next command and do not infer dynamic state from generated markdown.',
      'If intent remains ambiguous after status, ask one clarifying question before spec/plan/do/test/sync-back/ship work.',
      'If status reports generated entry drift or missing config, run sdd doctor and sdd update before do/test/ship.',
      'If status recommends a pending task, run sdd tasks inspect <task_id> and execute only the approved task boundary; scout/implementer/reviewer/validator participation should be recorded as artifacts rather than hidden in the main chat.',
      'For test and sync-back, omit --run by default so CLI resolves the latest eligible run from partition + task id; pass --run only for replay, CI, or old-run inspection.',
      'After /sdd:test PASS, use /sdd:sync-back or run sdd sync-back inspect --branch <branch> --task <task_id>; inspect must explain the target tasks.md update before direct apply or before asking for human approval.',
      'For release readiness, use /sdd:ship or sdd ship --branch <branch> --dry-run; do not publish, push, tag, or create external release state without explicit human confirmation.'
    ]
  },
  init: {
    summary: 'Initialize .sdd project configuration and managed AI tool entries for the current repository; workflow partition documents are entered through /sdd:spec.',
    requiredCommands: ['sdd init --ai claude-code', 'sdd status', '/sdd:spec', 'sdd doctor'],
    allowedSideEffects: ['write .sdd/project.yml', 'write .sdd/runs', 'write managed generated AI entries'],
    forbiddenSideEffects: ['create workflow partition documents unless explicitly using /sdd:spec or legacy --scaffold-docs', 'overwrite foreign AI entry files', 'background write', 'auto commit'],
    nextSteps: ['Run sdd init --ai claude-code.', 'Run sdd status to inspect current Git branch partition state and the recommended next command.', 'Use /sdd:spec to create or refine specs/<partition>/spec.md; omitted --branch uses the current Git branch, explicit --branch uses the requested partition.', 'Run sdd doctor after initialization.']
  },
  doctor: {
    summary: 'Check project config, scoped runtime evidence, generated AI entry drift, and deterministic recover/reconcile guidance.',
    requiredCommands: ['sdd doctor fast --branch <branch>', 'sdd doctor deep --branch <branch>', 'sdd doctor recover --branch <branch>', 'sdd run archive <run_id> --reason <text>'],
    allowedSideEffects: ['read .sdd state', 'read specs documents', 'read generated AI entries', 'archive failed exploratory run state when explicitly requested'],
    forbiddenSideEffects: ['delete run evidence', 'write project source files', 'background write', 'worktree creation', 'run deep historical scans unless explicitly requested'],
    nextSteps: ['Run sdd doctor fast for normal current-run health checks.', 'Use sdd doctor deep for explicit historical audit.', 'Use sdd doctor recover for deterministic rebuild/reinspect/reconcile guidance without automatic destructive cleanup.', 'Use sdd run archive <run_id> --reason <text> for failed exploratory runs instead of deleting evidence.', 'Run sdd update if generated entry drift is reported.']
  },
  update: {
    summary: 'Refresh missing or drifted managed AI tool entries.',
    requiredCommands: ['sdd update', 'sdd doctor'],
    allowedSideEffects: ['write managed generated AI entries'],
    forbiddenSideEffects: ['overwrite foreign AI entry files', 'modify user source code', 'auto commit'],
    nextSteps: ['Run sdd update.', 'Run sdd doctor to verify drift is resolved.']
  },
  spec: {
    summary: 'Create or refine specs/<partition>/spec.md as the workflow partition entry: omitted --branch uses the current Git branch, explicit --branch uses the requested branch partition.',
    requiredCommands: ['sdd status', 'sdd lifecycle decide --from-text <text>', 'read specs/<partition>/spec.md', 'write specs/<partition>/spec.md'],
    allowedSideEffects: ['read project context', 'create or read the resolved specs/<partition> directory', 'write proposed or approved requirement contract'],
    forbiddenSideEffects: ['implement code', 'design technical solution in spec.md', 'silently advance to plan', 'auto commit'],
    nextSteps: ['Resolve the workflow partition: omit --branch to use the current Git branch, or pass --branch <name> only when intentionally writing another partition.', 'Clarify user intent, objective/customer value, actors, scenarios, scope, and non-goals.', 'Run sdd lifecycle decide --from-text <text> when changes mention state-machine, concurrency, database, SQL, security, API/schema, CI/build, or external unknown risk.', 'Write acceptance criteria with stable IDs such as AC-1 and verification hints.', 'Record assumptions/dependencies, risks/hard gates, open questions, and lifecycle reference.', 'If this is a requirement change after plan/tasks/run work exists, update spec.md and let status expose stale downstream hashes before continuing.', 'Stop before technical design or implementation when requirement gaps remain.']
  },
  plan: {
    summary: 'Refine specs/<partition>/plan.md as a deliverable technical solution document that bridges approved spec requirements into task-ready design and records based_on_spec_hash.',
    requiredCommands: ['sdd status', 'read specs/<partition>/spec.md', 'read specs/<partition>/plan.md', 'write specs/<partition>/plan.md'],
    allowedSideEffects: ['read project context', 'read spec document', 'write proposed or approved technical solution plan document'],
    forbiddenSideEffects: ['implement code', 'silently advance to tasks', 'bypass unresolved spec gaps'],
    nextSteps: ['Read the approved spec and acceptance criteria plus the current spec hash from sdd status.', 'Record based_on_spec_hash in plan.md so later /sdd:spec revisions can mark this plan stale.', 'Write plan.md as a technical solution document: background, goals/non-goals, current state, target design, architecture/component impact, interaction/sequence design, state/data design, API/schema design, concurrency/transaction/consistency design, key decisions, alternatives, risk control, rollout/rollback, validation matrix, and task breakdown rationale.', 'Use PlantUML diagrams when they clarify component impact, sequence/activity flow, state machines, or deployment/data relationships.', 'Apply risk-driven requirements: state-machine needs state design, concurrency needs sequence/activity and consistency design, database needs data/transaction/rollback design, api_schema needs interface/schema compatibility, security/sql needs risk control.', 'Stop with explicit plan gaps and tasks readiness.']
  },
  tasks: {
    summary: 'Refine specs/<partition>/tasks.md as an executable evidence contract that maps spec acceptance and plan sections to task boundaries, agents, artifacts, validation, and Definition of Done.',
    requiredCommands: ['sdd status', 'read specs/<partition>/spec.md', 'read specs/<partition>/plan.md', 'sdd tasks format', 'write specs/<partition>/tasks.md', 'sdd tasks list', 'sdd tasks gaps'],
    allowedSideEffects: ['read spec and plan documents', 'write proposed or approved task execution/evidence contract'],
    forbiddenSideEffects: ['implement code', 'execute dependency waves', 'silently advance to do', 'turn tasks.md into project-management backlog'],
    nextSteps: ['Read approved spec acceptance IDs, approved plan design sections, and the current plan hash from sdd status.', 'Record based_on_plan_hash in tasks.md so later plan/spec revisions can mark these tasks stale.', 'Run sdd tasks format to get the canonical block format.', 'Map every task to acceptance_refs and plan_refs where applicable.', 'Keep #### Boundary, #### Acceptance, #### Definition of Done, #### Evidence Expectations, and #### Implementation Notes as companion sections outside the ```sdd-task fenced block; keep only metadata inside the fence.', 'For risky tasks, include allowed_agents, required_artifacts, verification_availability, and autonomy.', 'Run sdd tasks list and sdd tasks gaps.', 'Stop before do task when task boundary, acceptance refs, plan refs, or evidence requirements are unclear.']
  },
  verifies: {
    summary: 'Create or inspect specs/<partition>/verify.md as the task-derived verification contract before runtime evidence execution.',
    requiredCommands: ['sdd status', 'sdd tasks list --branch <branch>', 'sdd verifies inspect --branch <branch>', 'sdd verifies write --branch <branch>'],
    allowedSideEffects: ['read spec, plan, and tasks documents', 'write specs/<partition>/verify.md when explicitly using write'],
    forbiddenSideEffects: ['run validation commands', 'update runtime.sqlite run state', 'create sync-back proposal', 'modify source files', 'auto commit'],
    nextSteps: ['Run sdd status and confirm tasks.md is current.', 'Run sdd verifies inspect --branch <branch> to check whether verify.md exists and matches the current tasks hash.', 'Run sdd verifies write --branch <branch> to create verify.md, or add --force after reviewing task contract changes.', 'Use verify.md to guide validator evidence expectations; do not treat it as runtime evidence or as a replacement for /sdd:test.']
  },
  test: {
    summary: 'Execute task validation commands from the verification contract boundary, capture command output, evaluate acceptance evidence coverage, and return one unified test judgment for the task.',
    requiredCommands: ['sdd status', 'sdd verifies inspect --branch <branch>', 'sdd test task <task_id> --branch <branch>'],
    allowedSideEffects: ['run declared validation commands', 'write branch-scoped test evidence artifacts', 'update runtime.sqlite test run and step records', 'write validator evidence artifact'],
    forbiddenSideEffects: ['modify source files outside the validation command effects', 'create sync-back proposal', 'auto commit', 'publish or push', 'treat command success alone as semantic PASS'],
    nextSteps: ['Run sdd status and resolve exactly one task id plus branch.', 'Run sdd verifies inspect --branch <branch> and refresh verify.md if stale before executing tests.', 'Run sdd test task <task_id> --branch <branch>; use --command only to override or narrow task validation commands deliberately.', 'Inspect the generated test index, validator artifact paths, and acceptance coverage summary.', 'If /sdd:test returns PASS, proceed to /sdd:sync-back or sdd sync-back inspect; if it returns FAIL or BLOCKED, fix the reported command/evidence gaps and rerun /sdd:test.']
  },
  do: {
    summary: 'Execute one approved task boundary through the ingestion-aware SDD task workflow with explicit scout/implementer/reviewer/validator evidence handoff.',
    requiredCommands: ['sdd status', 'sdd instructions do --json', 'sdd tasks inspect <task_id>', 'sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent>', 'sdd artifact validate <run_id> <artifact> --task <task_id> --agent <agent>', 'sdd do task <task_id>'],
    allowedSideEffects: ['write branch-scoped .sdd/runs evidence artifacts', 'update runtime.sqlite run state', 'modify files within selected task boundary'],
    forbiddenSideEffects: ['background write', 'worktree creation', 'auto commit', 'expand beyond selected task boundary without checkpoint', 'mark missing evidence as PASS'],
    nextSteps: ['Run sdd status and resolve exactly one task id from the user request or recommended next command.', 'Run sdd instructions do --json and sdd tasks inspect <task_id>.', 'Restate only the task Boundary, blocking gaps, and validation commands before implementation.', 'Use scout for bounded context only, implementer for selected-boundary edits, reviewer for review evidence, and validator for validation plus acceptance mapping.', 'Use sdd artifact template examples for artifacts/implement-<task_id>.md, artifacts/review-<task_id>.md, and artifacts/validation-<task_id>.md before creating evidence; save physical files under branch evidence .sdd/runs/<branchSlug>/evidence/artifacts/, pass run-relative artifacts/<file> paths to CLI flags, and keep source/test files in ## Evidence, not in sdd-result.artifacts.', 'Run sdd artifact validate before passing artifacts into sdd do task <task_id>.', 'Run or coordinate implementation only within the selected task boundary.', 'Run sdd do task <task_id> with explicit artifact paths when evidence is available.', 'Report run id, final status, blocking gaps, and next gate; if completed, recommend /sdd:test / sdd test task <task_id> --branch <branch>.']
  },
  verify: {
    summary: 'Run compatibility/diagnostic task acceptance coverage from reviewer/validator artifacts, resolving the latest eligible run from partition + task id unless --run is explicit; /sdd:test is the primary runtime gate.',
    requiredCommands: ['sdd status', 'sdd instructions verify --json', 'sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator', 'sdd artifact validate <run_id> <artifact> --task <task_id> --agent validator', 'sdd verify task <task_id> [--branch <branch>] [--run <run_id>]', 'sdd sync-back inspect [<run_id>] --branch <branch> --task <task_id>'],
    allowedSideEffects: ['write acceptance coverage artifact', 'update runtime.sqlite run state', 'create sync-back proposal'],
    forbiddenSideEffects: ['auto commit', 'force push', 'auto-fix failures', 'unapproved complex sync-back apply', 'mark completed with blocking validation gaps'],
    nextSteps: ['Run sdd status and resolve exactly one task id plus workflow partition from the recommended command or user request.', 'Omit --run by default so CLI resolves the latest eligible run for partition + task id; pass --run only for explicit replay, CI, or old-run inspection.', 'Ensure the validator artifact includes exact Acceptance text, preferably under ## Acceptance Mapping from sdd artifact template.', 'Store artifacts physically under branch evidence .sdd/runs/<branchSlug>/evidence/artifacts/ but pass run-relative artifacts/<file> paths to validate/verify CLI flags.', 'Run sdd artifact validate before compatibility verify.', 'Run sdd instructions verify --json and sdd verify task <task_id> --branch <branch> only for explicit low-level diagnostics.', 'For the primary slash lifecycle, use /sdd:test; after /sdd:test PASS, use /sdd:sync-back or run sdd sync-back inspect --branch <branch> --task <task_id> before apply.', 'Report PASS/BLOCKED status, unresolved blockers, and next sync-back gate only; avoid pasting full acceptance coverage unless requested.']
  },
  'sync-back': {
    summary: 'Inspect and optionally apply the verified task completion proposal back into specs/<partition>/tasks.md with an explicit target change summary.',
    requiredCommands: ['sdd status', 'sdd instructions sync-back --json', 'sdd sync-back inspect [<run_id>] --branch <branch> --task <task_id>', 'sdd sync-back apply [<run_id>] --branch <branch> --task <task_id> [--approved]'],
    allowedSideEffects: ['read runtime.sqlite run state', 'read sync-back proposal artifact', 'read specs/<partition>/tasks.md', 'write specs/<partition>/tasks.md only during apply', 'update run sync_back state only during apply'],
    forbiddenSideEffects: ['auto commit', 'force push', 'apply without inspect', 'apply confirm-required proposals without human approval', 'change source files outside tasks.md'],
    nextSteps: ['Run sdd status and resolve exactly one task id plus workflow partition from the recommended command or user request.', 'Run sdd sync-back inspect --branch <branch> --task <task_id> first; pass an explicit run id only for replay, CI, or old-run inspection.', 'Report the inspect target update before asking for approval: target tasks file, task id, markdown status transition, proposal path, evidence artifacts, apply_policy, and policy reasons.', 'If apply_policy=direct and status=ready, run sdd sync-back apply --branch <branch> --task <task_id>; if approval_required=true, ask for explicit confirmation and then add --approved.', 'Explain that apply writes the task block status to completed, appends the sync-back implementation note from the proposal/evidence, marks the run sync_back state applied, and rebuilds the local run index.', 'After apply, report the updated task id, tasks.md path, applied flag, and sync_back state.']
  },
  ship: {
    summary: 'Run local release readiness and optionally write specs/<branch>/release.md without publishing, pushing, tagging, or changing external release state.',
    requiredCommands: ['sdd ship --branch <branch> --dry-run', 'sdd ship --branch <branch>', 'sdd statusline --branch <branch>', 'sdd doctor fast --branch <branch>', 'sdd update --check', 'npm run typecheck', 'npm test', 'npm run build', 'npm pack --dry-run --json', 'git status'],
    allowedSideEffects: ['read project status', 'read SDD documents and run evidence', 'write specs/<branch>/release.md when not using --dry-run', 'run local validation commands'],
    forbiddenSideEffects: ['npm publish', 'git push', 'git tag', 'create GitHub release', 'force push', 'auto commit', 'skip failed gates', 'treat historical doctor debt as a release blocker unless it affects current run evidence'],
    nextSteps: ['Run sdd ship --branch <branch> --dry-run to inspect PASS/BLOCKED readiness without writing release docs.', 'If readiness output is acceptable, run sdd ship --branch <branch> to write specs/<branch>/release.md.', 'Use sdd statusline --branch <branch> for compact runtime/test/team/token/evidence health.', 'Run current-run health checks with sdd doctor fast --branch <branch>; use sdd doctor deep only for explicit historical audit.', 'Run npm run typecheck, npm test, npm run build, and npm pack --dry-run --json when preparing a real package release.', 'Report PASS/BLOCKED by readiness check, including exact failed commands and unresolved manual confirmations.', 'Stop before npm publish, git push, git tag, or external release creation unless the user explicitly approves that separate action.']
  },
  'run-task': {
    summary: 'Run the ingestion-aware task workflow using CLI/core runtime state and artifacts.',
    requiredCommands: ['sdd tasks inspect <task_id>', 'sdd do task <task_id>'],
    allowedSideEffects: ['write branch-scoped .sdd/runs evidence artifacts', 'update runtime.sqlite run state'],
    forbiddenSideEffects: ['background write', 'worktree creation', 'auto commit'],
    nextSteps: ['Inspect the task.', 'Run the task loop with explicit artifacts and validation evidence.']
  },
  'verify-task': {
    summary: 'Verify task acceptance coverage using CLI/core verifier artifacts and partition-aware run resolution.',
    requiredCommands: ['sdd verify task <task_id> [--branch <branch>] [--run <run_id>]'],
    allowedSideEffects: ['write acceptance coverage artifact', 'update .sdd run state'],
    forbiddenSideEffects: ['auto commit', 'force push', 'unapproved complex sync-back'],
    nextSteps: ['Run goal-level verify without --run for the latest eligible partition/task run, unless inspecting an explicit run.', 'Inspect sync-back proposal and follow apply_policy before applying any semantic document update.']
  }
  };


export function getSddInstructions(action: string): SddInstructionPayload {
  if (!isInstructionAction(action)) {
    throw new Error(`Unknown instruction action: ${action}`);
  }
  return {
    contract: SDD_INSTRUCTIONS_CONTRACT,
    version: SDD_VERSION,
    action,
    ...INSTRUCTION_PAYLOADS[action]
  };
}

export function renderSddInstructions(payload: SddInstructionPayload): string {
  return [
    `${payload.action}: ${payload.summary}`,
    '',
    'Required commands:',
    ...payload.requiredCommands.map((command) => `- ${command}`),
    '',
    'Forbidden side effects:',
    ...payload.forbiddenSideEffects.map((effect) => `- ${effect}`),
    '',
    'Next steps:',
    ...payload.nextSteps.map((step) => `- ${step}`)
  ].join('\n');
}

function isInstructionAction(action: string): action is InstructionAction {
  return action === 'overview' || action === 'init' || action === 'doctor' || action === 'update' || action === 'spec' || action === 'plan' || action === 'tasks' || action === 'verifies' || action === 'test' || action === 'do' || action === 'verify' || action === 'sync-back' || action === 'ship' || action === 'run-task' || action === 'verify-task';
}
