# Phase 8 Unified Test Evidence Review

## Scope

PHASE8-5 refactors `/sdd:test` from a command-output capture step into the primary runtime gate for task validation evidence. Low-level `sdd verify task` remains available for compatibility and diagnostics, but it is no longer the recommended primary next step after `/sdd:do` or generated `/sdd` instructions.

## Runtime behavior

- `/sdd:test` now reports `commandStatus`, `evidenceCoverage`, and `policyJudgment` separately while still returning one task-level status.
- Command execution success alone is not enough for PASS.
- PASS requires successful command execution plus complete mapped acceptance evidence coverage.
- Missing acceptance mapping returns BLOCKED with `commandStatus=PASS`, `evidenceCoverage=missing`, and `policyJudgment=BLOCKED`.
- PASS now recommends `sdd sync-back inspect <run_id> --branch <branch> --task <task_id>` instead of `sdd verify task`.
- Each run records a `test_evidence_run` runtime projection containing command evidence, acceptance coverage, gaps, next action, and `syncBackReady`.

## Entry and documentation alignment

- `.claude/commands/sdd/test.md` describes unified command execution and acceptance coverage judgment.
- `.claude/commands/sdd/do.md` recommends `/sdd:test` after completed task execution.
- `.claude/commands/sdd/verifies.md` keeps `verify.md` as guidance only and points runtime PASS to `/sdd:test`.
- `.claude/commands/sdd/verify.md` is framed as compatibility/diagnostic.
- `packages/core/src/ai-tools.ts` and `packages/core/src/instructions.ts` were updated so `sdd update` regenerates the same lifecycle guidance.
- `sdd update --force` refreshed managed entries, and `sdd update --check` reports current entries.

## Compatibility boundary

- `sdd verify task` was not removed.
- Existing goal verify semantics remain available for explicit diagnostics, replay, CI, or old-run inspection.
- Sync-back remains explicit and is only recommended after `/sdd:test` PASS.
- Missing or unmapped acceptance evidence blocks the unified test result instead of silently advancing the workflow.

## Regression coverage

- Test runtime focused tests cover pass, fail, blocked, argv execution, generated validator artifacts, and sync-back readiness.
- CLI regression verifies text/JSON output and distinguishes mapped PASS from unmapped command-success BLOCKED.
- Generated entry tests confirm managed command templates use `/sdd:test` as the primary runtime gate.
