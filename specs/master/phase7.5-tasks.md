# Phase 7.5 Tasks — Test Runtime and Evidence Execution

## Task list

| Task | Status | Acceptance refs | Notes |
|---|---|---|---|
| PHASE7.5-1 | completed | AC-1 | Add runtime SQLite `test_runs` and `test_steps` tables plus record/list helpers. |
| PHASE7.5-2 | completed | AC-1, AC-2 | Implement `runSddTest()` command execution, output capture, evidence artifacts, test index, runtime projection, and run-state validation status. |
| PHASE7.5-3 | completed | AC-3 | Generate validator `sdd-result`/`sdd-evidence` artifacts and prove goal verify can consume them. |
| PHASE7.5-4 | completed | AC-4 | Add `sdd test task` CLI command, text/JSON output, dispatch routing, help text, and CLI regression. |
| PHASE7.5-5 | completed | AC-4 | Add dynamic `test` instructions and managed `.claude/commands/sdd/test.md` projection. |
| PHASE7.5-6 | completed | AC-5 | Validate build, typecheck, focused/full tests, pack dry-run, SDD smoke, update, doctor, and phase closeout. |

## Acceptance criteria

- AC-1: PASS test runtime records command output artifacts, validation/index artifacts, run-state evidence, and SQLite test run rows.
- AC-2: Failing commands record FAIL without promoting semantic verification pass.
- AC-3: Generated validator evidence is accepted by goal-level verify when reviewer evidence is supplied.
- AC-4: CLI supports text and JSON output for `sdd test task`, and generated AI entries include `/sdd:test`.
- AC-5: Validation gates pass and SDD smoke leaves doctor latest-only clean after run-index repair.

## Evidence links

- Core runtime: `packages/core/src/verification/test-runtime.ts`
- Runtime store extension: `packages/core/src/storage/runtime-store.ts`
- CLI command: `packages/cli/src/commands/test.ts`
- CLI dispatch/help: `packages/cli/src/dispatch.ts`; `packages/cli/src/help.ts`
- Instructions/projection: `packages/core/src/instructions.ts`; `packages/core/src/ai-tools.ts`; `.claude/commands/sdd/test.md`
- Tests: `packages/core/src/verification/test-runtime.test.ts`; `packages/cli/src/commands/cli-regression.test.ts`
