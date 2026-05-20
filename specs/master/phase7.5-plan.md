# Phase 7.5 Plan — Test Runtime and Evidence Execution

## Step 1 — Add runtime store test tables

- Extend runtime SQLite initialization with `test_runs` and `test_steps` tables.
- Add `recordRuntimeTestRun()`, `recordRuntimeTestStep()`, and `listRuntimeTestRuns()` helpers.
- Preserve Runtime Storage v2 compatibility by using additive `CREATE TABLE IF NOT EXISTS` schema changes.

## Step 2 — Implement core test runtime

- Create `packages/core/src/verification/test-runtime.ts`.
- Resolve branch/task context and inspect `verify.md` before execution.
- Bind or create a run state for the target task.
- Register a RUNNING test run before writing step rows.
- Execute commands with timeout and bounded stdout/stderr capture.
- Write command logs, validator artifact, test index artifact, invocation ledger entries, runtime projection, and final run state validation status.

## Step 3 — Preserve verify boundary

- Generate validator `sdd-result` and `sdd-evidence` blocks that point to command and artifact refs.
- Add a focused test proving `runGoalVerify()` can accept test-runtime validator evidence when reviewer evidence is present.
- Keep sync-back proposal creation inside `/sdd:verify`, not `/sdd:test`.

## Step 4 — Add CLI surface

- Add `packages/cli/src/commands/test.ts`.
- Route `sdd test task` from dispatch.
- Add text/JSON rendering through existing JSON renderer and `renderSddTestResult()`.
- Update CLI help to place `sdd test task` before `sdd verify task`.

## Step 5 — Add instruction and AI projection

- Add `test` to `InstructionAction`.
- Add dynamic test instructions with allowed/forbidden side effects.
- Add `.claude/commands/sdd/test.md` to generated AI entries.
- Run `sdd update` to create the managed entry.

## Step 6 — Validate and close out

- Add core runtime tests and CLI regression tests.
- Run build, typecheck, targeted tests, full tests, package dry-run, and SDD smoke commands.
- Archive accidental failed smoke evidence if needed and rebuild local run index.
- Record Phase 7.5 completion evidence in validation docs and phase status.
