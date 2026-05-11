---
name: sdd-verify
version: 0.2.0
phase: 1.9
contract: sdd-command-v1
workflow: workflows/verify.yml
lifecycle_gate: phase-1.7-command-gate
---

# /sdd-verify Command Contract

## Purpose

Run or request goal-level validation evidence for a task, phase, or gap closure by mapping results back to acceptance criteria.

## Inputs

- Spec acceptance criteria.
- Plan validation strategy.
- Task boundary and affected files.
- Review result and diff summary when available.
- Project adapter validation declarations.
- Contracts:
  - `schemas/contracts/sdd-result-contract.md`
  - `schemas/contracts/project-yml-contract.md`

## Lifecycle decision gate

Entry contract:

```text
user request -> `sdd lifecycle decide` -> profile/checkpoint -> verify workflow
```

- Re-run the gate when validation reveals unclear acceptance, missing evidence, or new risk tags.
- Validation failure with non-obvious cause is an escalation trigger, not an automatic implementation loop.
- If a run exists, record the decision with `sdd lifecycle decide --run <run_id>`.
- Phase 1.9 implements local goal-level verification from existing run state/events/artifacts/task model; it does not invoke external agents or auto-fix failures.

## Outputs

- Validation artifact with `PASS`, `PASS_WITH_GAPS`, `FAIL`, or `BLOCKED`.
- Acceptance mapping and evidence summary.
- Gap recommendations when validation cannot prove acceptance.

## Forbidden

- Do not treat successful commands as sufficient without acceptance mapping.
- Do not auto-fix failures.
- Do not mark completed when blocking validation gaps remain.

## Success criteria

- Validation evidence is mapped to every task acceptance item.
- Reviewer and validator artifacts use `sdd-result-v1` and match the requested task.
- Command execution declarations are summarized without becoming the only oracle.
- Remaining gaps are explicit and enter sync-back proposal as blocked verification evidence.

## CLI support

```text
sdd verify task <task_id> [--branch <branch>] [--run <run_id>] [--review-artifact artifacts/path.md] [--validation-artifact artifacts/path.md]
```

Rules:

- Reads `specs/<branch>/tasks.md` task acceptance and validation commands.
- Uses supplied artifact paths or completed reviewer/validator artifacts discoverable from the latest eligible partition/task run; explicit `--run` is reserved for replay, CI, or old-run inspection.
- Writes `artifacts/acceptance-coverage-<task_id>.md`.
- Updates run `phase=verify`, validation status, events, and `artifacts/sync-back-proposal.md`.
- Does not run build/test commands itself in Phase 1.9; command execution evidence must be present in validator artifact.
- Does not modify `spec.md` / `plan.md` / `tasks.md`.