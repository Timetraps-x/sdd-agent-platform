# Phase 6.4 Spec: Spec Partition Entry

## Goal

Make `/sdd:spec` the normal SDD workflow entry for branch/spec namespace resolution while keeping `sdd init` project-level and `sdd status` read-only.

## Problem

Current branch resolution is still centered on explicit `--branch`, `.sdd/project.yml` defaults, or legacy `specs/master` assumptions. This makes users repeat branch flags through the workflow and makes it unclear whether `init`, `status`, or the first workflow artifact command owns `specs/<branch>/` creation.

The desired model is:

```text
sdd init      -> project-level files only
/sdd:spec     -> resolve/create workflow partition
sdd status    -> read current or specified partition state
middle stages -> read resolved partition or run state, not guess branch
```

## Scope

- Unified branch-to-partition resolver.
- Current Git branch fallback for workflow entry and status view.
- `/sdd:spec [--branch]` creates/uses `specs/<partition>/`.
- `sdd status [--branch]` reads partition state without creating/switching.
- Safe partition mapping for Git branch names containing path separators or unsafe characters.
- Spec revision/hash and downstream stale detection for repeated `/sdd:spec` calls.
- Compatibility messaging for legacy explicit `--branch` flows.

## Non-goals

- No new `/sdd` command.
- No `sdd workflow start` command.
- No Phase 6.5 run lookup/isolation implementation.
- No automatic active-run rebase after spec changes.
- No Phase 7 code graph.

## Acceptance criteria

| Area | Required behavior |
|---|---|
| Init boundary | `sdd init` remains project-level and is no longer presented as branch/spec partition entry. |
| Spec entry | `/sdd:spec` without `--branch` resolves current Git branch and creates/uses `specs/<partition>/`. |
| Explicit branch | `/sdd:spec --branch <name>` creates/uses the specified branch partition. |
| Status current | `sdd status` reads current Git branch partition and reports `not_started` if missing. |
| Status explicit | `sdd status --branch <name>` reads the specified partition without creating or switching context. |
| Safety | Raw branch names map to stable safe partition ids. |
| Revisions | Repeated `/sdd:spec` updates spec hash/revision and marks stale downstream documents. |
| Compatibility | Existing `--branch master` status/task inspection remains compatible. |

## Validation commands

```powershell
npm run typecheck
node --test --import tsx --test-name-pattern "Phase 6.4|branch|partition|status|spec revision" "packages/**/*.test.ts"
npm test
npm run build
node ./dist/packages/cli/src/main.js status --json
node ./dist/packages/cli/src/main.js status --branch master --json
```
