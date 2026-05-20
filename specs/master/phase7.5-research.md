# Phase 7.5 Research — Test Runtime and Evidence Execution

## Research question

After Phase 7.4 introduced `verify.md` as a task-derived verification contract, Phase 7.5 asks how the platform should execute validation commands without confusing command success with semantic verification PASS.

## Local findings

- `runGoalVerify()` already owns final semantic verification: it resolves the eligible run, validates reviewer and validator artifacts, evaluates `sdd-evidence` claims, checks command/artifact ledger corroboration, writes acceptance coverage, and creates a sync-back proposal.
- `writeArtifact()` already stores branch-scoped evidence attachments under `.sdd/runs/<branchSlug>/evidence/artifacts/` and records artifact hashes in the invocation ledger and runtime SQLite store.
- Runtime Storage v2 already supports projections and branch-scoped evidence attachment records, but it lacked first-class test run/test step records.
- `verify.md` is guidance/contract state, not runtime evidence. `/sdd:test` should inspect it before execution but must not replace `/sdd:verify`.
- The existing `RunState.validation` field can expose compact validation status/evidence for status and downstream verify without storing large logs in state.

## External/reference findings

- CI systems separate execution records from final release gates: raw logs are persisted as artifacts, while pass/fail decisions are derived from structured metadata and policy gates.
- Test report formats such as JUnit/CTRF are useful future parsing targets, but Phase 7.5 should first establish a stable execution/evidence boundary.
- Evidence summaries should remain derived views; they should not become authoritative proof unless linked to source artifacts and provenance.
- A command execution runtime should be CI-compatible but not CI-dependent, so local SDD workflows can collect command evidence before later CI integrations.

## Direction

Phase 7.5 implements a minimal but policy-compatible test runtime:

1. Add `sdd test task <task_id>` and generated `/sdd:test` guidance.
2. Execute task validation commands or explicit `--command` overrides.
3. Store command output as branch evidence artifacts rather than inline state.
4. Record SQLite `test_runs` and `test_steps` rows.
5. Write a validator artifact containing `sdd-result` and structured `sdd-evidence` blocks.
6. Preserve `/sdd:verify` as the final semantic PASS boundary.

## Boundary decisions

- `/sdd:test` may execute validation commands and mutate runtime evidence state.
- `/sdd:test` may write validator evidence artifacts but must not create sync-back proposals.
- `/sdd:test` PASS means all executed commands completed successfully and evidence was indexed; it does not mean task acceptance is semantically verified.
- `/sdd:verify` remains responsible for acceptance coverage, policy-backed evidence checks, and sync-back proposal creation.
