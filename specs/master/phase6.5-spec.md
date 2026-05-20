# Phase 6.5 Spec: Parallel Branch Run Isolation

## Goal

Allow multiple branch/spec partitions and task runs to coexist without cross-partition interference, and let the workflow find the correct run through partition + task state rather than user/AI memory of run ids.

## Problem

Phase 6.4 makes partition creation deterministic, but execution can still drift if verify/sync-back relies on manual run ids, current workflow pointers, or current Git branch guesses. Multi-branch work also needs protection against stale document snapshots, wrong-branch apply, and overlapping active affected files.

## Scope

- Run state binding to partition/gitBranch/taskId/document hashes.
- Derived run index keyed by partition + task.
- Internal run resolver for explicit run id or latest eligible partition/task run.
- Status visibility for latest run per task in current or requested partition.
- Stale run detection when spec/plan/tasks changed after run creation.
- Wrong Git branch and affectedFiles conflict gates for high-risk commands.

## Non-goals

- No new `/sdd` command.
- No remote worker fleet or full worktree scheduler.
- No automatic run rebase onto changed specs.
- No authoritative database beyond `.sdd/runs/*/state.json`.
- No Phase 8 code graph.

## Acceptance criteria

| Area | Required behavior |
|---|---|
| Run binding | `do task` creates run state with partition, gitBranch, taskId, affectedFiles, and document hash snapshot. |
| Run lookup | `verify task <task>` can resolve latest eligible run by partition + taskId when `--run` is omitted. |
| Partition isolation | Same task id in different partitions resolves to different latest runs. |
| Status | `sdd status` and `sdd status --branch` show partition-specific latest run and stale status. |
| Stale protection | Changed spec/plan/tasks make older runs stale; verify/sync-back do not silently proceed. |
| Wrong branch protection | `sync-back apply` blocks or requires confirmation when current Git branch differs from run.gitBranch. |
| File conflict protection | Active runs with overlapping affectedFiles are visible and gated. |
| Rebuildability | Run index can be rebuilt from run state files. |

## Validation commands

```powershell
npm run typecheck
node --test --import tsx --test-name-pattern "Phase 6.5|run isolation|latest eligible|affected files|stale run|sync-back" "packages/**/*.test.ts"
npm test
npm run build
node ./dist/packages/cli/src/main.js run index rebuild --json
```
