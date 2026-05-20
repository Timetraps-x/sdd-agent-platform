# Plan — E2E T1 Verify Regression

## Scope

- Restore the minimal document chain required by the existing T1 run.
- Use local commands only.
- Keep evidence run-relative under `.sdd/runs/e2e/evidence/artifacts/`.

## Validation

Run `/sdd:test` equivalent through the source CLI, then run goal-level verify for `T1` on run `20260518-001`.
