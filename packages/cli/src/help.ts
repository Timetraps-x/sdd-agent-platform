export function helpText(topic?: string): string {
  if (topic === 'advanced') {
    return advancedHelpText();
  }
  if (topic === 'workflow') {
    return workflowHelpText();
  }
  return `sdd Phase 2 platform CLI

Common workflow:
  sdd init [--force] [--ai <mode>] [--scaffold-docs] [--json]
  sdd status [--branch <branch>] [--json|--compact-json]
  sdd statusline [--branch <branch>] [--json|--compact-json]
  sdd tasks inspect <task_id> [--branch <branch>] [--json|--compact-json]
  sdd tasks route <task_id> [--branch <branch>] [--approved] [--json|--compact-json]
  sdd do task <task_id> [--approved] [options]
  sdd verifies inspect|write [--branch <branch>] [--force] [--json|--compact-json]
  sdd test task <task_id> [--branch <branch>] [--run <run_id>] [--command <command>] [--timeout-ms <ms>] [--json|--compact-json]
  sdd sync-back inspect [<run_id>] [--task <task_id>] [--branch <branch>] [--json|--compact-json]
  sdd sync-back apply [<run_id>] [--task <task_id>] [--branch <branch>] [--approved] [--json|--compact-json]
  sdd subagents run <task_id> [--agent <agent>]... [--branch <branch>] [--run <run_id>] [--timeout-seconds <n>] [--approved] [--json|--compact-json]
  sdd ship [--branch <branch>] [--dry-run] [--json|--compact-json]
  sdd doctor [fast|deep] [--latest-only] [--all-runs] [--json|--compact-json]
  sdd doctor recover [--branch <branch>] [--json|--compact-json]

Evidence helpers:
  sdd run create
  sdd run list [--json]
  sdd run inspect <run_id> [--json|--compact-json]
  sdd run index rebuild|inspect|query [options] [--json|--compact-json]
  sdd artifact template <path> --task <task_id> --agent <agent> [--run <run_id> --write]
  sdd artifact validate <run_id> <path> [--task <task_id>] [--agent <agent>] [--json|--compact-json]
  sdd evidence summary <run_id> [--task <task_id>] [--json|--compact-json]
  sdd context build --task <task_id> --mode do|verify|sync-back|doctor [--agent <agent>] [--branch <branch>] [--profile brief|normal|forensic] [--json|--compact-json]

Generated AI entries:
  sdd update [--check] [--force] [--ai <mode>]
  sdd instructions [action] [--json|--compact-json]

More help:
  sdd help workflow     Show core workflow options.
  sdd help advanced     Show platform/agent/runtime commands.

Notes:
  /sdd:spec owns workflow partition docs after project init.
  init --branch is legacy starter-doc scaffolding; prefer sdd status --branch or /sdd:spec --branch for workflow partitions.
`;
}

export function workflowHelpText(): string {
  return `sdd workflow help

Core path:
  1. sdd status [--branch <branch>]
  2. sdd tasks inspect <task_id> [--branch <branch>]
  3. sdd tasks route <task_id> [--branch <branch>] [--approved]
  4. sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent> --run <run_id> --write
  5. sdd verifies inspect --branch <branch>
  6. sdd do task <task_id> --run <run_id> --approved --implement-artifact <path> --review-artifact <path> --validation-artifact <path>
  7. sdd test task <task_id> [--branch <branch>]
  8. sdd sync-back inspect --task <task_id> [--branch <branch>]
  9. sdd sync-back apply --task <task_id> [--branch <branch>]
  10. sdd ship --branch <branch> [--dry-run]

JSON:
  --json prints readable JSON; --compact-json prints one-line JSON for logs and scripts.
`;
}

export function advancedHelpText(): string {
  return `sdd advanced help

Runtime/catalog:
  sdd agent-runtime inspect|validate [--json]
  sdd agent-capabilities list|validate [--json]
  sdd command-team inspect|validate|decide [--json]
  sdd skill-capabilities list|inspect [--json]
  sdd capability-sources list|inspect [--json]
  sdd external-packs inspect <source_id> [--json]
  sdd team-mode inspect [--task <id>] [--team-mode [auto|force|off]] [--no-team-mode] [--json]
  sdd progress [--branch <branch>] [--json|--compact-json]

Harness/platform:
  sdd workflow list|inspect|validate [--json]
  sdd agents list|inspect|validate [--json]
  sdd query-status inspect|validate [--json]
  sdd eval inspect|validate [--json]
  sdd learning inspect|validate [--json]
  sdd context-pack inspect|validate [--json]
  sdd capabilities list|inspect [--json]
  sdd governance inspect|evaluate [options]
  sdd plugins list|inspect [--json]
  sdd queue list|inspect [options]
  sdd state-machine inspect [--json]
  sdd workers list|inspect [--json]

Execution/isolation:
  sdd background run|inspect [options]
  sdd subagents run <task_id> [--agent <agent>]... [--branch <branch>] [--json|--compact-json]
  sdd worker-runtime claim|heartbeat|status|inspect [options]
  sdd isolation inspect <task_id> [options]
  sdd graph inspect [--branch <branch>] [--json]
  sdd wave inspect|run|executor [options]
  sdd worktree create|inspect|keep|remove [options]

Foreground subagents:
  Runs synchronously and collects non-authoritative evidence artifacts only; it does not approve, sync-back, or ship.

Legacy init partition option:
  sdd init --branch <branch> creates starter docs for that branch, but normal workflow partitioning belongs to /sdd:spec and sdd status --branch.
`;
}

export function taskFormatText(): string {
  return `# Canonical sdd-task format

\`\`\`sdd-task
id: T1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
plan_refs:
  - "§4 Target Design Overview"
affected_files:
  - path/to/file
validation:
  - command string
risk:
  - state-machine
agent_fit:
  - scout
  - implementer
  - reviewer
  - validator
verification_availability:
  - unit:command string
  - build:command string
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - scout
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/review-T1.md
  - artifacts/validation-T1.md
\`\`\`

Put contract metadata inside the fenced block: acceptance_refs, plan_refs, agent_fit, verification_availability, autonomy, allowed_agents, and required_artifacts. Companion sections such as #### Boundary, #### Acceptance, and #### Implementation Notes must stay outside the fenced sdd-task metadata block.

#### Boundary

Allowed implementation scope. Explicitly list forbidden scope when relevant.

#### Acceptance

- Verifiable acceptance item.

#### Implementation Notes

Reserved for approved sync-back notes and artifact links.
`;
}
