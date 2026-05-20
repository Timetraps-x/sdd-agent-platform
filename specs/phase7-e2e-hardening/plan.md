# Plan — Phase 7 E2E Hardening Boundary Validation

1. Confirm the explicit `phase7-e2e-hardening` partition resolves cleanly and write the verify contract.
2. Route `PHASE7E2EH-1` and inspect whether high-risk signals trigger team-mode activation or a policy-backed downgrade.
3. Start a real task-scoped run, confirm missing artifacts block completion, then generate and curate run artifacts.
4. Run a deliberately narrow command through `sdd test task` to inspect whether verification semantics over-claim AC coverage.
5. Verify the task, inspect/apply sync-back, refresh verify after task mutation, and validate statusline/doctor/ship/update readiness.

## Intended commands

- `npm run sdd -- status --branch phase7-e2e-hardening`
- `npm run sdd -- verifies write --branch phase7-e2e-hardening --force`
- `npm run sdd -- tasks route PHASE7E2EH-1 --branch phase7-e2e-hardening`
- `npm run sdd -- do task PHASE7E2EH-1 --branch phase7-e2e-hardening`
- `npm run sdd -- artifact template artifacts/implement-PHASE7E2EH-1.md --task PHASE7E2EH-1 --agent implementer --run <runId> --branch phase7-e2e-hardening --write`
- `npm run sdd -- artifact template artifacts/review-PHASE7E2EH-1.md --task PHASE7E2EH-1 --agent reviewer --run <runId> --branch phase7-e2e-hardening --write`
- `npm run sdd -- artifact template artifacts/validation-PHASE7E2EH-1.md --task PHASE7E2EH-1 --agent validator --run <runId> --branch phase7-e2e-hardening --write`
- `npm run sdd -- do task PHASE7E2EH-1 --branch phase7-e2e-hardening --run <runId> --implement-artifact artifacts/implement-PHASE7E2EH-1.md --review-artifact artifacts/review-PHASE7E2EH-1.md --validation-artifact artifacts/validation-PHASE7E2EH-1.md`
- `npm run sdd -- test task PHASE7E2EH-1 --branch phase7-e2e-hardening --run <runId> --command "node --eval \"console.log('hardening-narrow-check')\""`
- `npm run sdd -- verify task PHASE7E2EH-1 --branch phase7-e2e-hardening --run <runId>`
- `npm run sdd -- sync-back inspect <runId> --task PHASE7E2EH-1 --branch phase7-e2e-hardening`
- `npm run sdd -- sync-back apply <runId> --task PHASE7E2EH-1 --branch phase7-e2e-hardening --approved`
- `npm run sdd -- verifies write --branch phase7-e2e-hardening --force`
- `npm run sdd -- statusline --branch phase7-e2e-hardening`
- `npm run sdd -- doctor fast --branch phase7-e2e-hardening`
- `npm run sdd -- ship --branch phase7-e2e-hardening --dry-run`
- `npm run sdd -- ship --branch phase7-e2e-hardening`
- `npm run sdd -- update --check`
- `npm run sdd -- status --branch phase7-e2e-hardening`
