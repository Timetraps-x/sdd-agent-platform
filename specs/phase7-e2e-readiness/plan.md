# Plan — Phase 7 E2E Readiness Workflow Validation

1. Confirm the explicit `phase7-e2e-readiness` partition resolves cleanly and scaffold the verify contract.
2. Route `PHASE7E2ER-1`, create a real task-scoped run, and use artifact templates plus curated evidence to satisfy workflow artifact gates.
3. Execute a real readiness/reporting command via `sdd test task`.
4. Verify acceptance coverage, inspect and apply sync-back, then refresh the verify contract if task state changes.
5. Confirm readiness surfaces with `statusline`, `doctor fast`, `ship --dry-run`, `ship`, `update --check`, and final `status`.

## Intended commands

- `npm run sdd -- status --branch phase7-e2e-readiness`
- `npm run sdd -- verifies write --branch phase7-e2e-readiness --force`
- `npm run sdd -- tasks route PHASE7E2ER-1 --branch phase7-e2e-readiness`
- `npm run sdd -- do task PHASE7E2ER-1 --branch phase7-e2e-readiness`
- `npm run sdd -- artifact template --run <runId> --branch phase7-e2e-readiness --write`
- `npm run sdd -- do task PHASE7E2ER-1 --branch phase7-e2e-readiness --run <runId> --implement-artifact artifacts/implement-PHASE7E2ER-1.md --review-artifact artifacts/review-PHASE7E2ER-1.md --validation-artifact artifacts/validation-PHASE7E2ER-1.md`
- `npm run sdd -- test task PHASE7E2ER-1 --branch phase7-e2e-readiness --run <runId> --command "npm run sdd -- statusline --branch phase7-e2e-readiness --compact-json"`
- `npm run sdd -- verify task PHASE7E2ER-1 --branch phase7-e2e-readiness --run <runId>`
- `npm run sdd -- sync-back inspect <runId> --task PHASE7E2ER-1 --branch phase7-e2e-readiness`
- `npm run sdd -- sync-back apply <runId> --task PHASE7E2ER-1 --branch phase7-e2e-readiness --approved`
- `npm run sdd -- verifies write --branch phase7-e2e-readiness --force`
- `npm run sdd -- statusline --branch phase7-e2e-readiness`
- `npm run sdd -- doctor fast --branch phase7-e2e-readiness`
- `npm run sdd -- ship --branch phase7-e2e-readiness --dry-run`
- `npm run sdd -- ship --branch phase7-e2e-readiness`
- `npm run sdd -- update --check`
- `npm run sdd -- status --branch phase7-e2e-readiness`
