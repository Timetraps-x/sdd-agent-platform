# Phase 7.2 Plan — Runtime Storage v2 Implementation

## Gate 0 — Research and scope freeze

Inputs:

- `specs/master/phase7.1-research.md`
- `specs/master/phases/phase-7.2-runtime-storage-v2-implementation.md`
- local runtime/storage code scan
- real project runtime data scan
- external SQLite/evidence/checkpoint/artifact gate references

Deliverables:

- `specs/master/phase7.2-research.md`
- `specs/master/phase7.2-spec.md`
- confirmed implementation scope and non-goals

Exit criteria:

- SQLite-first boundary is explicit.
- Branch evidence path is explicit.
- Legacy file compatibility is scoped as migration/import, not source of truth.

## Gate 1 — Runtime path contract

Change area:

- `packages/core/src/runtime-paths.ts`
- tests that cover runtime paths

Work:

- Add branch-scoped evidence helpers:
  - branch run root: `.sdd/runs/<branchSlug>`
  - evidence root: `.sdd/runs/<branchSlug>/evidence`
  - evidence attachment path resolver
- Preserve old run-id helpers only for compatibility/migration.
- Avoid introducing deep task/phase/run nested layouts.

Validation:

```powershell
npm run build
npm test -- --test-name-pattern runtime-paths
```

Use the closest available test command if the exact filter is unsupported.

## Gate 2 — Runtime Store v2 API extension

Change area:

- `packages/core/src/storage/runtime-store.ts`
- storage tests

Work:

- Add or expose SQLite-first repository methods for:
  - runs
  - events
  - activities / invocation ledger entries
  - artifacts
  - artifact ingestions
  - evidence attachments / evidence refs
  - projections
- Add schema migration only where the existing schema cannot represent Phase 7.2 needs.
- Reuse existing tables where possible.
- Track legacy imports idempotently.

Validation:

```powershell
npm run build
npm test -- --test-name-pattern runtime-store
```

## Gate 3 — SQLite-first run state, events, and ledger

Change area:

- `packages/core/src/run-state/run-state.ts`
- `packages/core/src/run-state/events.ts`
- `packages/core/src/run-state/invocation-ledger.ts`
- related tests

Work:

- Make reads prefer SQLite.
- Stop new authoritative writes to `state.json`, `events.jsonl`, and `invocations.jsonl`.
- Keep legacy import path for existing run directories.
- Ensure old projects remain readable.

Validation:

```powershell
npm run build
npm test
```

## Gate 4 — Evidence attachment and artifact migration path

Change area:

- `packages/core/src/run-state/artifacts.ts`
- artifact/evidence rendering and parsing modules
- source ref builders

Work:

- Add branch evidence writer/reader.
- Index evidence attachments in SQLite with branch, run, task, kind, path, hash, bytes, and payload metadata.
- Keep old run-local artifact reads as compatibility.
- Update source refs away from `state.json` / `events.jsonl` as authoritative evidence.

Validation:

```powershell
npm run build
npm test
```

## Gate 5 — Run-index/projection and command compatibility

Change area:

- `packages/core/src/run-state/run-index.ts`
- `packages/core/src/status/project-status.ts`
- `packages/core/src/sync-back/inspect.ts`
- `packages/core/src/doctor/checks/run-evidence.ts`
- context package builders

Work:

- Derive run-index/projections from SQLite.
- Remove default deep scan requirement from status/doctor/sync-back minimal paths.
- Keep explicit legacy/deep diagnostics only where needed.
- Update user-facing remediation text to point to `runtime.sqlite` and branch evidence refs.

Validation:

```powershell
npm run sdd -- status --branch master
npm run sdd -- tasks list --branch master
npm run sdd -- doctor --latest-only --branch master
```

## Gate 6 — Full validation and package smoke

Commands:

```powershell
npm run build
npm run typecheck
npm test
npm pack --dry-run --json
npm run sdd -- status --branch master
npm run sdd -- tasks list --branch master
npm run sdd -- doctor --latest-only --branch master
```

Deliverables:

- updated `specs/master/phase7.2-validation.md`
- updated Phase 7.2 status in `specs/master/phases/PHASE_STATUS.md`

## Implementation guardrails

- Do not implement `/sdd:verifies`, `/sdd:test`, team runtime, or ship readiness.
- Do not move formal workflow docs into `.sdd/runs`.
- Do not delete legacy files as a shortcut.
- Do not make hidden branch fallback to `master`.
- Prefer small compatibility adapters over one large rewrite.
- Keep raw evidence out of main Claude context; store attachment refs and summaries instead.
