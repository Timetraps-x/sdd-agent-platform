# Phase 6.4 Validation: Spec Partition Entry

## Validation Matrix

| Area | Command / Check | Required |
|---|---|---|
| Type safety | `npm run typecheck` | yes |
| Focused regression | `node --test --import tsx --test-name-pattern "Phase 6.4|branch|partition|status|spec revision" "packages/**/*.test.ts"` | yes |
| Unit/integration tests | `npm test` | yes |
| Build | `npm run build` | yes |
| Current branch status smoke | `node ./dist/packages/cli/src/main.js status --json` | yes |
| Explicit branch status smoke | `node ./dist/packages/cli/src/main.js status --branch master --json` | yes |
| SDD health | `sdd doctor --latest-only` | recommended |

## Current Evidence

Status: PASS.

Evidence:
- `npm run typecheck` PASS.
- `node --test --import tsx --test-name-pattern "Phase 6.4|branch|partition|status|spec revision" "packages/**/*.test.ts"` PASS, 17 tests.
- `npm test` PASS, 140/140 tests.
- `npm run build` PASS.
- `node ./dist/packages/cli/src/main.js status --json` PASS: current Git branch `fix_20260507_bug` resolves to partition `fix_20260507_bug`, reports `workflowStatus: "not_started"`, and recommends `/sdd:spec`.
- `node ./dist/packages/cli/src/main.js status --branch master --json` PASS: explicit `master` partition reports active document state, current Git branch mismatch visibility, and document hashes.

## Pass Criteria

- `/sdd:spec` is the workflow partition entry.
- `sdd init` remains project-level and is not the branch/spec namespace entry.
- `sdd status` reports current Git branch partition state read-only.
- `sdd status --branch <name>` reports specified partition state read-only.
- Safe branch-to-partition mapping prevents path ambiguity.
- Repeated `/sdd:spec` creates traceable spec revision/hash changes and stale downstream visibility.
- Typecheck, focused regression, full tests, build, and CLI smoke pass.
