import { SDD_VERSION } from './ai-tools.js';

export const SDD_INSTRUCTIONS_CONTRACT = 'sdd-instructions-v1';

export type InstructionAction = 'overview' | 'init' | 'doctor' | 'update' | 'spec' | 'plan' | 'tasks' | 'do' | 'verify' | 'run-task' | 'verify-task';

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
    summary: 'Guide SDD workflow from project status to task execution, verification, and explicit sync-back.',
    requiredCommands: ['sdd status', 'sdd doctor', 'sdd tasks inspect <task_id>', 'sdd run inspect <run_id>', 'sdd do task <task_id>', 'sdd verify task <task_id> --run <run_id>', 'sdd sync-back inspect <run_id> --task <task_id>'],
    allowedSideEffects: ['read .sdd state', 'read specs documents', 'read generated AI entries'],
    forbiddenSideEffects: ['background write', 'worktree creation', 'auto commit', 'force push', 'unapproved complex sync-back apply'],
    nextSteps: [
      'Run sdd status first to see tasks, latest run, gaps, and the recommended next command.',
      'Follow the recommended next command from CLI/core output; do not infer dynamic state from generated markdown.',
      'If status reports generated entry drift or missing config, run sdd doctor and sdd update before do/verify.',
      'If status recommends a pending task, run sdd tasks inspect <task_id> and execute only the approved task boundary with sdd do task <task_id>.',
      'If status or verify points at a run, run sdd run inspect <run_id> before selecting verify or sync-back work.',
      'After verify PASS, run sdd sync-back inspect <run_id> --task <task_id>; direct-safe tasks may apply directly, while confirm-required tasks need sdd sync-back apply --approved after human confirmation.'
    ]
  },
  init: {
    summary: 'Initialize .sdd project configuration, starter semantic documents, and managed AI tool entries for the current repository.',
    requiredCommands: ['sdd init --ai claude-code', 'sdd status', 'sdd doctor'],
    allowedSideEffects: ['write .sdd/project.yml', 'write .sdd/runs', 'write specs/<branch>/spec.md', 'write specs/<branch>/plan.md', 'write specs/<branch>/tasks.md', 'write managed generated AI entries'],
    forbiddenSideEffects: ['overwrite foreign AI entry files', 'overwrite user-authored semantic documents without --force', 'background write', 'auto commit'],
    nextSteps: ['Run sdd init --ai claude-code.', 'Run sdd status to inspect starter semantic documents and the recommended next command.', 'Refine or replace the starter specs/<branch>/spec.md, plan.md, and tasks.md before real implementation.', 'Run sdd doctor after initialization.']
  },
  doctor: {
    summary: 'Check project config, scoped runtime evidence, and generated AI entry drift.',
    requiredCommands: ['sdd doctor', 'sdd doctor --latest-only', 'sdd doctor --all-runs', 'sdd run archive <run_id> --reason <text>'],
    allowedSideEffects: ['read .sdd state', 'read specs documents', 'read generated AI entries', 'archive failed exploratory run state when explicitly requested'],
    forbiddenSideEffects: ['delete run evidence', 'write project source files', 'background write', 'worktree creation'],
    nextSteps: ['Run sdd doctor for normal health checks.', 'Use sdd doctor --latest-only to ignore older non-archived exploratory evidence during current-run checks.', 'Use sdd doctor --all-runs for historical audit.', 'Use sdd run archive <run_id> --reason <text> for failed exploratory runs instead of deleting evidence.', 'Run sdd update if generated entry drift is reported.']
  },
  update: {
    summary: 'Refresh missing or drifted managed AI tool entries.',
    requiredCommands: ['sdd update', 'sdd doctor'],
    allowedSideEffects: ['write managed generated AI entries'],
    forbiddenSideEffects: ['overwrite foreign AI entry files', 'modify user source code', 'auto commit'],
    nextSteps: ['Run sdd update.', 'Run sdd doctor to verify drift is resolved.']
  },
  spec: {
    summary: 'Create if missing during init, otherwise refine specs/<branch>/spec.md as the SDD semantic source for requirements, scope, non-goals, and acceptance.',
    requiredCommands: ['sdd lifecycle decide', 'read specs/<branch>/spec.md', 'write specs/<branch>/spec.md'],
    allowedSideEffects: ['read project context', 'read existing specs/<branch>/spec.md', 'write proposed or approved spec document'],
    forbiddenSideEffects: ['implement code', 'silently advance to plan', 'auto commit'],
    nextSteps: ['Clarify user intent and constraints.', 'Run lifecycle decision when impact is unclear.', 'If init created starter docs, replace the onboarding scaffold in specs/<branch>/spec.md instead of creating a parallel document.', 'Stop with explicit spec gaps and plan readiness.']
  },
  plan: {
    summary: 'Create if missing during init, otherwise refine specs/<branch>/plan.md from an approved spec, including approach, impact, risks, and validation strategy.',
    requiredCommands: ['read specs/<branch>/spec.md', 'read specs/<branch>/plan.md', 'write specs/<branch>/plan.md'],
    allowedSideEffects: ['read project context', 'read spec document', 'write proposed or approved plan document'],
    forbiddenSideEffects: ['implement code', 'silently advance to tasks', 'bypass unresolved spec gaps'],
    nextSteps: ['Read the approved spec.', 'Design the technical approach and validation strategy.', 'If init created starter docs, replace the onboarding scaffold in specs/<branch>/plan.md instead of creating a parallel document.', 'Stop with explicit plan gaps and tasks readiness.']
  },
  tasks: {
    summary: 'Create if missing during init, otherwise refine specs/<branch>/tasks.md from approved spec and plan artifacts with graph-ready sdd-task metadata.',
    requiredCommands: ['read specs/<branch>/spec.md', 'read specs/<branch>/plan.md', 'sdd tasks format', 'write specs/<branch>/tasks.md', 'sdd tasks list', 'sdd tasks gaps'],
    allowedSideEffects: ['read spec and plan documents', 'write proposed or approved task document'],
    forbiddenSideEffects: ['implement code', 'execute dependency waves', 'silently advance to do'],
    nextSteps: ['Read approved spec and plan.', 'Run sdd tasks format to get the canonical block format.', 'Keep #### Boundary, #### Acceptance, and #### Implementation Notes as companion sections outside the ```sdd-task fenced block; keep only metadata inside the fence.', 'If init created starter docs, replace the ONBOARDING-1 starter task with real executable task blocks instead of creating a parallel tasks.md.', 'Run sdd tasks list and sdd tasks gaps.', 'Stop with implement readiness or blocking task gaps.']
  },
  do: {
    summary: 'Execute one approved task boundary through the ingestion-aware SDD task workflow.',
    requiredCommands: ['sdd status', 'sdd instructions do --json', 'sdd tasks inspect <task_id>', 'sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent>', 'sdd artifact validate <run_id> <artifact> --task <task_id> --agent <agent>', 'sdd do task <task_id>'],
    allowedSideEffects: ['write .sdd/runs artifacts', 'update .sdd run state', 'modify files within selected task boundary'],
    forbiddenSideEffects: ['background write', 'worktree creation', 'auto commit', 'expand beyond selected task boundary without checkpoint', 'mark missing evidence as PASS'],
    nextSteps: ['Run sdd status and resolve exactly one task id from the user request or recommended next command.', 'Run sdd instructions do --json and sdd tasks inspect <task_id>.', 'Restate Boundary, Acceptance, gaps, and validation commands before implementation.', 'Use sdd artifact template before creating implement/review/validation artifacts; keep source/test files in ## Evidence, not in sdd-result.artifacts.', 'Run sdd artifact validate before passing artifacts into sdd do task <task_id>.', 'Run or coordinate implementation only within the selected task boundary.', 'Run sdd do task <task_id> with explicit artifact paths when evidence is available.', 'Report run id, status, artifacts, and gaps; if completed, recommend sdd verify task <task_id> --run <run_id>.']
  },
  verify: {
    summary: 'Verify task acceptance coverage and prepare explicit sync-back inspection for tasks.md.',
    requiredCommands: ['sdd status', 'sdd run inspect <run_id>', 'sdd instructions verify --json', 'sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator', 'sdd artifact validate <run_id> <artifact> --task <task_id> --agent validator', 'sdd verify task <task_id> --run <run_id>', 'sdd sync-back inspect <run_id> --task <task_id>'],
    allowedSideEffects: ['write acceptance coverage artifact', 'update .sdd run state', 'create sync-back proposal'],
    forbiddenSideEffects: ['auto commit', 'force push', 'auto-fix failures', 'unapproved complex sync-back apply', 'mark completed with blocking validation gaps'],
    nextSteps: ['Run sdd status and resolve exactly one run id and task id from the latest run, recommended command, or user request.', 'Run sdd run inspect <run_id> before verifying so state, events, artifacts, validation, and sync-back are visible.', 'Ensure the validator artifact includes exact Acceptance text, preferably under ## Acceptance Mapping from sdd artifact template.', 'Run sdd artifact validate before goal-level verify.', 'Run sdd instructions verify --json and sdd verify task <task_id> --run <run_id>.', 'Inspect acceptance coverage and sync-back proposal.', 'If PASS, run sdd sync-back inspect <run_id> --task <task_id> and follow its apply_policy.', 'Direct-safe tasks may run sdd sync-back apply directly; confirm-required tasks require human confirmation and --approved before writing tasks.md.']
  },
  'run-task': {
    summary: 'Run the ingestion-aware task workflow using CLI/core runtime state and artifacts.',
    requiredCommands: ['sdd tasks inspect <task_id>', 'sdd do task <task_id>'],
    allowedSideEffects: ['write .sdd/runs artifacts', 'update .sdd run state'],
    forbiddenSideEffects: ['background write', 'worktree creation', 'auto commit'],
    nextSteps: ['Inspect the task.', 'Run the task loop with explicit artifacts and validation evidence.']
  },
  'verify-task': {
    summary: 'Verify task acceptance coverage using CLI/core verifier artifacts.',
    requiredCommands: ['sdd verify task <task_id> --run <run_id>'],
    allowedSideEffects: ['write acceptance coverage artifact', 'update .sdd run state'],
    forbiddenSideEffects: ['auto commit', 'force push', 'unapproved complex sync-back'],
    nextSteps: ['Run goal-level verify.', 'Inspect sync-back proposal and follow apply_policy before applying any semantic document update.']
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
  return action === 'overview' || action === 'init' || action === 'doctor' || action === 'update' || action === 'spec' || action === 'plan' || action === 'tasks' || action === 'do' || action === 'verify' || action === 'run-task' || action === 'verify-task';
}
