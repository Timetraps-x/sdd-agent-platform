# Phase 6.5 Plan: Parallel Branch Run Isolation

## Strategy

Build on Phase 6.4 partition resolution. Treat `.sdd/runs/<runId>/state.json` as source of truth and keep the run index as a rebuildable derived view. Add deterministic run resolution so normal workflow commands use partition + taskId instead of requiring users or AI to remember run ids.

## Work tracks

### 1. Phase docs and chain

- Add Phase 6.5 phase artifact and execution docs.
- Insert Phase 6.5 before Phase 7.0 core modularization and Phase 8.0 code graph.
- Update Phase 8.0 handoff to consume partition-aware run evidence after Phase 7.0 core modularization.

### 2. Run state snapshot binding

- Add partition, gitBranch, taskId, affectedFiles, basedOnSpecHash, basedOnPlanHash, basedOnTasksHash fields.
- Populate these fields when `do task` creates or updates a run.
- Keep older run states readable through migration/default handling.

### 3. Partition-aware run index

- Extend local run index with latestByPartitionTask and activeByAffectedFile views.
- Keep index rebuildable from run states.
- Detect stale/missing index and rebuild before lookup where practical.

### 4. Run resolver

- Add an internal resolver for `runId` or `partition + taskId`.
- Prefer explicit `--run`.
- Otherwise use latest eligible run in the current/requested partition.
- Fail closed with candidate listing when ambiguous.

### 5. Verify/sync-back/status integration

- Let verify and sync-back inspect resolve run by task when safe.
- Show latest run and stale status in `sdd status`.
- Keep explicit `--run` for replay/CI/old-run inspection.

### 6. Conflict and wrong-branch gates

- Detect current Git branch vs run.gitBranch mismatch for code-affecting commands.
- Detect active affectedFiles overlap across runs.
- Block or require explicit confirmation for sync-back apply in unsafe contexts.

### 7. Tests and validation

- Add same-task/different-partition run tests.
- Add stale run and wrong-branch apply tests.
- Add run index rebuild tests.
- Run focused/full validation and record evidence.

## Risk controls

- State remains authoritative; index is derived.
- Explicit `--run` remains supported and highest priority.
- Stale/wrong-branch conditions fail closed before write/apply operations.
- Older run states remain inspectable.
- No automatic rebase of active runs.

## Implementation order

1. Add docs and status chain.
2. Extend run state types/read/write compatibility.
3. Extend run index derived views.
4. Implement run resolver.
5. Integrate verify/sync-back/status.
6. Add stale/wrong-branch/affectedFiles gates.
7. Add tests.
8. Run validation and update evidence.
