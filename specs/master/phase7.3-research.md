# Phase 7.3 Research — Workflow State Resolver and Performance Read Path

## 1. Research scope

Phase 7.3 researched the Phase 7.2 Runtime Storage v2 implementation, current high-frequency read paths, and external fast status/projection patterns.

The implementation target is a shared resolver layer:

```text
Workflow State Resolver = branch/context + workflow docs + task counts/gaps + latest run + blocking reasons + next action
```

## 2. Local code findings

Primary read-path duplication existed in:

- `packages/core/src/status/project-status.ts`
  - resolved branch/docs/tasks and rebuilt local run index before selecting latest run.
- `packages/core/src/sync-back/inspect.ts`
  - rebuilt local run index for implicit run resolution and affected-file conflicts.
- `packages/core/src/doctor/checks/run-evidence.ts`
  - `--latest-only` still entered deep run evidence inspection after reading all states.
- `packages/core/src/run-state/run-index.ts`
  - already provided derived views, but callers still mixed rebuild/query/read behavior.

Reusable foundations:

- `resolveSddContext()` for branch/partition resolution.
- `parseSddBranch()` for formal workflow docs and task model.
- Runtime Storage v2 SQLite state for run summaries and latest run selection.
- `recordRuntimeProjection()` for non-authoritative resolver projections.

## 3. External mechanism findings

Fast status/read-path mechanisms from Claude Code statusline/cost guidance and external workflow systems support:

- compact structured projections for frequent status commands;
- raw evidence excluded from hot-path context;
- explicit deep diagnostics separated from default status checks;
- next-action guidance derived from a single workflow-state model.

## 4. Implementation decision

Phase 7.3 implements a minimal resolver contract instead of a broad command rewrite:

1. Add `workflow-state` resolver module.
2. Resolve branch/docs/tasks/runs from current authoritative sources.
3. Persist compact `workflow_state` runtime projection.
4. Rewire status and sync-back default paths to resolver.
5. Rewire doctor latest-only to resolver fast path while preserving deep checks for all-runs/default diagnostics.

## 5. Non-goals confirmed

- No `verify.md` or `/sdd:verifies` implementation.
- No `/sdd:test` runtime.
- No command-scoped team runtime.
- No release/ship readiness semantics.
