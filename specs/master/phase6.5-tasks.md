# Phase 6.5 Tasks: Parallel Branch Run Isolation

## PHASE6.5-1 Add Phase 6.5 documents and status chain

Boundary:
- Create Phase 6.5 phase artifact and execution docs.
- Insert Phase 6.5 before Phase 7.0.

Acceptance:
- Phase 6.5 appears after Phase 6.4 in phase index/status.
- Phase 7.0 depends on Phase 6.5 evidence.

Validation:
- Manual doc/index review.

## PHASE6.5-2 Bind run state to partition/task/document snapshot

Boundary:
- Extend run state with partition, gitBranch, taskId, affectedFiles, and document hashes.
- Populate values during `do task` run creation/update.

Acceptance:
- New runs record partition and task identity.
- Existing runs remain readable.

Validation:
- Run creation tests.

## PHASE6.5-3 Extend local run index for partition-aware lookup

Boundary:
- Add latestByPartitionTask and activeByAffectedFile derived views.
- Preserve rebuildability from run states.

Acceptance:
- Same task id in two partitions has two independent latest runs.
- Rebuild produces deterministic partition/task lookup.

Validation:
- Run index tests and CLI smoke.

## PHASE6.5-4 Implement latest eligible run resolver

Boundary:
- Add helper resolving explicit run id or latest eligible partition/task run.
- Fail closed on ambiguity or missing run.

Acceptance:
- `verify task TASK` can find the current partition latest run when unambiguous.
- `--run` remains highest priority.

Validation:
- Resolver tests.

## PHASE6.5-5 Integrate status/verify/sync-back with partition-aware runs

Boundary:
- Status shows latest run per task for selected partition.
- Verify/sync-back inspect can use resolved run state.

Acceptance:
- Switching Git branches changes default status partition without affecting existing runs.
- `status --branch` reads specified partition latest run metadata.

Validation:
- CLI/core integration tests.

## PHASE6.5-6 Add stale/wrong-branch/conflict gates

Boundary:
- Detect stale run when document hashes changed.
- Detect current Git branch mismatch before apply/write operations.
- Detect active affectedFiles overlap.

Acceptance:
- Stale run cannot silently verify/sync-back apply.
- Wrong branch apply is blocked or requires explicit confirmation.
- File overlap appears in status/doctor/governance evidence.

Validation:
- Focused stale/conflict tests.

## PHASE6.5-7 Validate and record evidence

Boundary:
- Run focused/full validation.
- Update validation evidence and phase status after PASS.

Acceptance:
- Typecheck, focused tests, full tests, build pass.
- `phase6.5-validation.md` records evidence.

Validation:
```powershell
npm run typecheck
node --test --import tsx --test-name-pattern "Phase 6.5|run isolation|latest eligible|affected files|stale run|sync-back" "packages/**/*.test.ts"
npm test
npm run build
```
