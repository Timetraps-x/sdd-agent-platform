# Phase 7.5 Spec — Test Runtime and Evidence Execution

## Goal

Introduce a first-class SDD test runtime that executes task validation commands, captures output as branch-scoped evidence, indexes test run/step records, and produces validator artifacts that `/sdd:verify` can evaluate.

## Functional requirements

### FR-1 Test command runtime

- The CLI must expose `sdd test task <task_id> [--branch <branch>] [--run <run_id>] [--command <command>] [--timeout-ms <ms>] [--json]`.
- The core API must expose `runSddTest()` and `renderSddTestResult()` through `@sdd-agent-platform/core/verification`.
- If `--command` is provided, those commands are executed in order; otherwise the task `validation` commands from `tasks.md` are used.

### FR-2 Evidence capture

- Each command step must capture stdout/stderr metadata, exit code, signal, duration, timeout state, truncation state, and output artifact path.
- Raw command output must be stored as branch evidence artifacts under `artifacts/test-<task>-<sequence>.log`.
- Test runtime must write an index artifact at `artifacts/test-index-<task>.json`.

### FR-3 Runtime storage indexing

- Runtime SQLite must store `test_runs` and `test_steps` records.
- Step records must be linked to their test run and run state.
- The test run should be recorded before step rows so SQLite foreign-key constraints remain valid, then updated with the terminal status.

### FR-4 Validator artifact handoff

- Test runtime must write `artifacts/validation-<task>.md` with a valid `sdd-result` block and `sdd-evidence` blocks for task acceptance targets.
- Evidence refs must include command refs and output artifact refs so goal verify can corroborate them with the invocation ledger.
- A failing command must produce FAIL validator status and must not promote the run to semantic verification PASS.

### FR-5 CLI/instruction projection

- Dynamic instructions must include a `test` action.
- Generated AI entries must include `.claude/commands/sdd/test.md`.
- CLI help must list the `sdd test task` workflow step before `sdd verify task`.

## Non-goals

- Do not implement full command-scoped team runtime in this phase.
- Do not parse every external test report format yet.
- Do not move large logs into main workflow docs or run state JSON.
- Do not create sync-back proposals from `/sdd:test`; `/sdd:verify` remains the proposal boundary.

## Acceptance criteria

- AC-1: `runSddTest()` records PASS command output, validation artifact, index artifact, run state validation evidence, and SQLite test run rows.
- AC-2: Failing command execution records FAIL status and failed run validation state.
- AC-3: The generated validator artifact can be accepted by `runGoalVerify()` when reviewer evidence is present.
- AC-4: CLI regression covers text and JSON output for `sdd test task`.
- AC-5: Build, typecheck, full test suite, package dry-run, instructions/update/status/doctor smokes, and real `sdd test task` smoke pass.
