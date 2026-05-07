---
name: sdd-do
version: 0.1.0
phase: 1.4
contract: sdd-command-v1
workflow: workflows/do.yml
lifecycle_gate: phase-1.7-command-gate
---

# /sdd-do Command Contract

## Purpose

Execute one approved task boundary through foreground implementation, independent review, optional single debug attempt, and sync-back proposal preparation.

## Inputs

- `specs/<branch>/spec.md`, `plan.md`, and `tasks.md`.
- Selected task id and task boundary.
- Project adapter validation declarations.
- Runtime contracts from Phase 1.2/1.3.
- Agents:
  - `agents/scout.md` optional read-only context.
  - `agents/implementer.md` foreground write.
  - `agents/reviewer.md` read-only review.
  - `agents/debugger.md` foreground write once after failure.
  - `agents/validator.md` validation evidence.

## Lifecycle decision gate

Entry contract:

```text
user request -> `sdd lifecycle decide` -> profile/checkpoint -> do boundary
```

- Phase 1.7 may evaluate and record the gate result before `/sdd-do` proceeds.
- `direct` and `compact` still require explicit boundary, validation, and escalation triggers.
- Hard gates route to full SDD before task implementation.
- If a run exists, record the decision with `sdd lifecycle decide --run <run_id>`.
- Phase 1.8 provides `sdd do task <task_id>` as an artifact-mode loop: it validates supplied run artifacts and records state/events/proposal.
- The command still does not dispatch external agents; implement/review/debug/validate evidence must be produced explicitly and passed as artifact paths.

## Outputs

- Intended runtime artifacts under `.sdd/runs/<run_id>/artifacts/` when runtime exists.
- `sdd-result`-compatible agent artifacts per `schemas/contracts/sdd-result-contract.md`.
- Sync-back proposal input using `templates/sync-back-proposal-template.md`.

## Forbidden

- Do not invent or call an external agent/subagent API.
- Do not bypass artifact contract validation.
- Do not run background write agents.
- Do not auto commit, push, merge, create worktrees, or clean files.
- Do not expand beyond selected task boundary without checkpoint.

## Success criteria

- Task execution boundary is explicit.
- Implementer/debugger are foreground write only.
- Reviewer/validator evidence is artifact-first.
- Gaps prevent false completion.
