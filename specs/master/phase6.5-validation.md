# Phase 6.5 Validation: Parallel Branch Run Isolation

## Validation Matrix

| Area | Command / Check | Required |
|---|---|---|
| Type safety | `npm run typecheck` | yes |
| Focused regression | `node --test --import tsx --test-name-pattern "Phase 6.5|run isolation|latest eligible|affected files|stale run|sync-back" "packages/**/*.test.ts"` | yes |
| Unit/integration tests | `npm test` | yes |
| Build | `npm run build` | yes |
| Run index smoke | `node ./dist/packages/cli/src/main.js run index rebuild --json` | yes |
| SDD health | `sdd doctor --latest-only` | recommended |

## Current Evidence

Status: PASS.

Evidence:
- `npm run typecheck` PASS.
- `node --test --import tsx --test-name-pattern "Phase 6.5|run isolation|latest eligible|affected files|stale run|sync-back" "packages/**/*.test.ts"` PASS, 8 tests.
- `npm test` PASS, 144/144 tests.
- `npm run build` PASS.
- `node ./dist/packages/cli/src/main.js run index rebuild --json` PASS: rebuilt the derived run index from `.sdd/runs/*/state.json` with partition/task and affectedFiles views.
- `node ./dist/packages/cli/src/main.js update` PASS: refreshed managed Claude Code entries after built-template drift.
- `node ./dist/packages/cli/src/main.js doctor --latest-only` WARN only: no failed checks; document-chain check is skipped for current Git branch `fix_20260507_bug` because branch-local spec/tasks documents do not exist.

## Pass Criteria

- Run state binds partition, gitBranch, taskId, affectedFiles, and document snapshot hashes.
- Partition+task lookup finds latest eligible run without user/AI guessing runId.
- Same task id in different partitions does not cross-resolve.
- Status displays partition-specific latest run and stale state.
- Verify/sync-back protect against stale run, wrong Git branch, and affectedFiles conflict.
- Run index remains rebuildable from `.sdd/runs/*/state.json`.
- Typecheck, focused regression, full tests, build, and CLI smoke pass.
