# Phase 7.9 Validation — Workflow Semantics, Risk, Context and Token Runtime Hardening

## Status

Phase 7.9 is completed.

## Planned validation gates

- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm pack --dry-run --json`
- CLI import boundary grep for forbidden `core/src` and root `@sdd-agent-platform/core` imports.
- `npm run sdd -- update --check`
- `npm run sdd -- doctor fast --branch master`
- Focused command lifecycle tests.
- Focused task risk profile/router/sync-back consistency tests.
- Focused run scope/artifact scope tests.
- Focused evidence coverage mapping and verify reporting tests.
- Focused shell-safe test command execution tests.
- Focused sync-back verify refresh tests.
- Focused context/token runtime tests.
- Phase 7.9 E2E scenario matrix.

## Validation evidence

- PHASE7.9-2 / AC-1 command lifecycle gate:
  - `node --test --import tsx --test-name-pattern "help and preflight" "packages/cli/src/commands/cli-regression.test.ts"` — PASS.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 188/188 tests.
- PHASE7.9-3 / AC-2, AC-11 shared task risk profile gate:
  - `node --test --import tsx "packages/core/src/router/route-sdd-task.test.ts" "packages/core/src/planning/task-graph.test.ts"` — PASS, 9/9 tests.
  - `node --test --import tsx "packages/cli/src/commands/cli-regression.test.ts"` — PASS, 36/36 tests.
  - `node --test --import tsx "packages/core/src/verification/goal-verify.test.ts"` — PASS, 5/5 tests.
  - `node --test --import tsx "packages/core/src/worktree/worktree.test.ts"` — PASS, 6/6 tests.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 188/188 tests.
- PHASE7.9-4 / AC-3 scoped run and artifact scope gate:
  - `node --test --import tsx "packages/core/src/run-state/run-state.test.ts"` — PASS, 3/3 tests.
  - `node --test --import tsx "packages/core/src/doctor/doctor.test.ts"` — PASS, 11/11 tests.
  - `node --test --import tsx "packages/cli/src/commands/cli-regression.test.ts"` — PASS, 36/36 tests.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 190/190 tests.
- PHASE7.9-5 / AC-4 evidence coverage mapping gate:
  - `node --test --import tsx "packages/core/src/sdd-docs/task-parser.test.ts" "packages/core/src/verification/test-runtime.test.ts" "packages/core/src/verification/goal-verify.test.ts"` — PASS, 15/15 tests.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 190/190 tests.
- PHASE7.9-6 / AC-5 verify reporting and evidence selection gate:
  - `node --test --import tsx "packages/core/src/verification/test-runtime.test.ts" "packages/core/src/verification/goal-verify.test.ts"` — PASS, 9/9 tests.
  - `node --test --import tsx "packages/core/src/status/project-status.test.ts"` — PASS, 6/6 tests after stabilizing Windows temporary-directory cleanup.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 191/191 tests.
- PHASE7.9-7 / AC-6 shell-safe command execution gate:
  - `node --test --import tsx "packages/core/src/verification/test-runtime.test.ts"` — PASS, 4/4 tests.
  - `node --test --import tsx --test-name-pattern "test task runtime" "packages/cli/src/commands/cli-regression.test.ts"` — PASS, 1/1 focused CLI passthrough test after rebuilding package-local dist.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 192/192 tests.
- PHASE7.9-8 / AC-7 sync-back stale verify refresh gate:
  - `node --test --import tsx "packages/core/src/sync-back/sync-back.test.ts"` — PASS, 9/9 tests.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 194/194 tests.
- PHASE7.9-9 / AC-8, AC-9 context budget and token health gate:
  - `node --test --import tsx "packages/core/src/context/context-build.test.ts"` — PASS, 4/4 tests.
  - `node --test --import tsx "packages/core/src/status/project-status.test.ts"` — PASS, 7/7 tests.
  - `node --test --import tsx "packages/core/src/doctor/doctor.test.ts"` — PASS, 11/11 tests.
  - `node --test --import tsx "packages/cli/src/commands/cli-regression.test.ts"` — PASS, 36/36 tests.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 195/195 tests.
- PHASE7.9-10 / AC-10, AC-11 role-scoped context and token-aware team runtime gate:
  - `node --test --import tsx "packages/core/src/context/context-build.test.ts"` — PASS, 5/5 tests.
  - `node --test --import tsx "packages/core/src/registries/registries.test.ts"` — PASS, 17/17 tests.
  - `node --test --import tsx "packages/cli/src/commands/cli-regression.test.ts"` — PASS, 36/36 tests.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 197/197 tests.
- PHASE7.9-11 / AC-12, AC-13 final E2E matrix and validation closeout:
  - `npm run build` — PASS.
  - `npm run typecheck` — PASS.
  - `npm test` — PASS, 197/197 tests.
  - `npm pack --dry-run --json` — PASS; package dry-run completed after prepare/build.
  - CLI import boundary grep for `../../core/src`, `../../../core/src`, and root `@sdd-agent-platform/core` imports — PASS, no forbidden CLI imports found after corrected PowerShell quoting.
  - `npm run sdd -- update --check` — PASS; managed AI entries current.
  - `npm run sdd -- doctor fast --branch master` — PASS before token-pressure smokes, 46 PASS / 0 WARN / 0 FAIL.
  - `npm run sdd -- status --branch master --compact-json` — PASS.
  - `npm run sdd -- tasks list --branch master --compact-json` — PASS.
  - `npm run sdd -- statusline --branch master --compact-json` — PASS with `tokenHealth=nominal` before pressure smokes.
  - `npm run sdd -- context build --task PHASE6.10-5 --branch master --mode do --agent context-curator --profile brief --compact-json` — PASS; role-scoped context package remained non-authoritative, `usableForPass=false`, and enforced the 2048-byte brief budget with output trimming.
  - `npm run sdd -- command-team decide --command verify --risk runtime_evidence --compact-json` — PASS; context/token pressure trimmed optional roles/material packs and kept required verification roles.
  - `npm run sdd -- ship --branch master --dry-run --compact-json` — PASS as a pressure-detection smoke: readiness returned `BLOCKED` because `token_health=pressure`, proving ship readiness consumes token runtime projections.
  - `npm run sdd -- sync-back apply --task PHASE6.10-5 --branch master --preflight --compact-json` — PASS; preflight reported `sideEffects=none`.

## E2E scenario matrix

| Scenario | AC refs | Evidence | Result |
|---|---|---|---|
| Low-risk full chain | AC-1, AC-4, AC-5, AC-13 | Phase 7.9 research E2E run `20260516-005`; final task/run completed, validation passed, sync-back applied, doctor fast PASS, ship PASS. | PASS |
| Readiness full chain | AC-2, AC-5, AC-13 | Phase 7.9 research E2E run `20260516-006`; statusline readiness command completed full lifecycle with doctor fast PASS and ship PASS. | PASS |
| High-risk route consistency | AC-2, AC-11 | Shared `TaskRiskProfile` focused tests plus route/team/sync-back/doctor/statusline/ship surfaces classify source-boundary/context/token/performance risks consistently. | PASS |
| Partial acceptance coverage | AC-4, AC-5 | `task-parser`, `test-runtime`, and `goal-verify` tests prove unmapped commands remain command evidence and verify surfaces missing/referenced/unproven coverage. | PASS |
| Help and preflight side-effect-free behavior | AC-1, AC-13 | Focused CLI regression for side-effect commands and final `sync-back apply --preflight` smoke report no runtime/artifact/sync-back side effects. | PASS |
| Scoped run and artifact behavior | AC-3 | `run-state`, doctor run-evidence, and CLI regression tests cover scoped `run create` plus unscoped/mismatched artifact template rejection. | PASS |
| Shell-safe command execution | AC-6 | `test-runtime` focused tests and CLI passthrough regression record argv execution with `shell=false`; legacy command strings remain shell mode. | PASS |
| Sync-back refresh | AC-7 | `sync-back.test.ts` covers stale verify blocking, exact recovery command output, and explicit `--refresh-verify` safe refresh before apply. | PASS |
| Token/context pressure projection | AC-8, AC-9, AC-10, AC-11, AC-13 | Context build role smoke enforces budget and non-PASS authority; command-team smoke trims optional roles under pressure; ship dry-run blocks on `token_health=pressure`. | PASS |
