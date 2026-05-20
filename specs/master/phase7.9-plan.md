# Phase 7.9 Plan — Workflow Semantics, Risk, Context and Token Runtime Hardening

## Strategy

Phase 7.9 is implemented as a semantic hardening phase, not as isolated bug fixes. The implementation order starts with shared models and side-effect safety, then evidence semantics, then context/token runtime, then E2E matrix expansion.

## Workstream 1 — Command lifecycle boundary

- Add command descriptor metadata for side-effect categories.
- Centralize help/preflight handling before command handlers execute side effects.
- Add `--preflight` for `do task`, `sync-back apply`, and `ship` where useful.
- Add regression tests proving help/preflight does not create runs, artifacts, sync-back changes, or release docs.

## Workstream 2 — Unified task risk profile

- Add core task risk profile model and classifier.
- Classify affected files into spec-doc, runtime-state, cli-source, core-source, test-source, generated-ai-entry, release-doc, and unknown.
- Consume the profile from router/team-mode, sync-back inspect/apply, doctor, statusline, and ship.
- Replace misleading low-risk wording with real downgrade reasons when team runtime does not activate.

## Workstream 3 — Scoped run and artifact scope model

- Introduce a single run scope resolver.
- Make `run create --branch --task` create scoped runs or explicitly fail.
- Make `artifact template --run` infer scope from runtime store.
- Reject branch/run mismatches and unscoped writes unless explicitly allowed.
- Add doctor checks for unscoped artifact writes and scope inconsistencies.

## Workstream 4 — Evidence coverage mapping

- Extend task validation parsing to support structured validation entries with `command`, `acceptance_refs`, `id`, and `required`.
- Add CLI flags for `sdd test task --acceptance <AC>`.
- Generate AC PASS/FAIL only for mapped refs.
- Treat unmapped commands as command evidence only.
- Preserve compatibility by warning on old string validation entries instead of silently blanket-PASSing all ACs.

## Workstream 5 — Verification selection/reporting

- Separate planned validation commands from executed commands in verify results.
- Add evidence strength levels and selected/discarded evidence reporting.
- Ensure weak/manual claims do not shadow ledger-backed claims.
- Add partial/unproven coverage statuses.
- Update rendering and JSON output without changing artifact path contracts.

## Workstream 6 — Shell-safe test command execution

- Add one or more shell-safe command inputs: `--` passthrough, `--command-json`, and/or `--command-file`.
- Preserve executed argv, shell mode, platform, exit code, and log artifact in test index.
- Add Windows/PowerShell focused tests for quoted commands.

## Workstream 7 — Sync-back consistency recovery

- Detect verify staleness immediately after sync-back apply.
- Print exact `sdd verifies write --branch <branch> --force` recovery command.
- Add `--refresh-verify` to safely refresh verify contracts after apply when conditions are clean.
- Ensure refresh failures are reported without rolling back already-applied sync-back state.

## Workstream 8 — Context budget enforcement

- Extend context build package with included summaries, deferred refs, excluded refs, truncation notes, estimated bytes, and token estimate.
- Enforce `brief`, `normal`, and `forensic` byte budgets.
- Materialize refs differently by budget instead of only listing all candidate refs.
- Persist context build and budget pressure as runtime projections.

## Workstream 9 — Token estimate runtime

- Add heuristic token estimation for context packages and team plans.
- Project `tokenHealth` as nominal, pressure, or over-budget when estimates exist.
- Add doctor checks for missing token/context projections on high-risk or team-mode tasks.
- Add statusline and ship integration.

## Workstream 10 — Role-scoped context packages and token-aware team runtime

- Generate role-specific context packages for implementer, reviewer, validator, context-curator, and risk-reviewer roles.
- Use task risk profile and token pressure to select team mode, material policy, and context budget.
- Persist team context decisions as runtime projections.
- Keep context packages non-authoritative for PASS evidence.

## Workstream 11 — Plan-stage performance/context/token checks

- Add planning/task-stage projection that reports large context footprints, token pressure, material pack selections, validation cost, and deferred materials.
- Expose this through context build, route, command-team decide, or a compact plan/runtime command surface.

## Workstream 12 — E2E matrix and closeout

- Create/refresh E2E cases for: low-risk full chain, readiness full chain, high-risk routing consistency, partial coverage negative case, help side-effect-free behavior, scoped run/artifact behavior, shell-safe command execution, sync-back refresh, and token/context pressure.
- Run build, typecheck, full tests, pack dry-run, update check, doctor fast, and focused smokes.
- Update Phase status and validation docs only after all ACs are satisfied.

## Validation plan

- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm pack --dry-run --json`
- CLI boundary grep for `core/src` and root `@sdd-agent-platform/core` imports.
- Focused tests for command lifecycle, risk profile, scope resolver, evidence mapping, verify reporting, test command execution, sync-back refresh, context/token projections.
- SDD smokes for status/tasks/verifies/do/test/verify/sync-back/statusline/doctor/ship/update.
- Phase 7.9 E2E scenario matrix.
