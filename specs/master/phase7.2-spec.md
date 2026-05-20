# Phase 7.2 Spec — Runtime Storage v2 Implementation

## 1. Goal

Implement Runtime Storage v2 so that structured runtime state is SQLite-first, raw evidence is stored as branch-scoped attachments, and formal workflow documents remain under `specs/<branch>`.

Phase 7.2 converts the Phase 7.1 architecture decision into code. It must create the runtime foundation required by Phase 7.3 Workflow State Resolver, Phase 7.4 verification contracts, Phase 7.5 test runtime, and later sync-back/ship observability.

## 2. Problem statement

The current runtime is still partially filesystem-authoritative:

- run state is mirrored between `.sdd/runs/<runId>/state.json` and SQLite;
- events are mirrored between `events.jsonl` and SQLite;
- invocation ledger still reads `invocations.jsonl`;
- run-index is rebuilt by scanning `.sdd/runs/*`;
- status, doctor, sync-back, and context packaging still depend on file-era paths;
- raw artifacts live under run-local `.sdd/runs/<runId>/artifacts` instead of a branch-scoped evidence area.

This prevents later verification/test/sync-back decisions from relying on one stable runtime source of truth.

## 3. Scope

Phase 7.2 includes:

- Runtime Store schema/API extension for SQLite-first reads and writes.
- Branch evidence path API for `.sdd/runs/<branchSlug>/evidence/`.
- Evidence attachment writer/reader/indexing in SQLite.
- SQLite-first run state, event, activity/invocation, artifact metadata, and projection reads.
- Legacy import compatibility for old `state.json`, `events.jsonl`, `invocations.jsonl`, and run-local artifacts.
- Run-index/projection rebuild from SQLite rather than deep `.sdd/runs/*` scans.
- Minimal status/doctor/sync-back compatibility updates.
- Validation evidence for build, typecheck, tests, pack, and SDD smoke commands.

## 4. Non-goals

Phase 7.2 does not include:

- `/sdd:verifies` or `verify.md` implementation.
- `/sdd:test` implementation.
- command-scoped team runtime.
- complete Workflow State Resolver design.
- release readiness or `/sdd:ship`.
- moving formal workflow docs under `.sdd/runs`.
- deep `.sdd/runs/<branch>/<task>/<phase>/<runId>` directory structure.
- hash store plus branch views.
- copying GSD, AgentPlane, GitHub Agentic Workflows, or other external runtimes wholesale.

## 5. Runtime boundary

Authoritative structured runtime state:

```text
.sdd/runtime.sqlite
```

Formal workflow documents:

```text
specs/<branch>/spec.md
specs/<branch>/plan.md
specs/<branch>/tasks.md
```

Raw evidence attachments:

```text
.sdd/runs/<branchSlug>/evidence/
```

Compatibility-only legacy inputs:

```text
.sdd/runs/<runId>/state.json
.sdd/runs/<runId>/events.jsonl
.sdd/runs/<runId>/invocations.jsonl
.sdd/runs/<runId>/artifacts/**
.sdd/run-index.json
```

## 6. Functional requirements

### FR1 — SQLite-first runtime state

New runtime writes must persist structured state into `runtime.sqlite` as the source of truth.

`readRunState()`, event reads, and invocation/activity reads must prefer SQLite and use legacy files only for compatibility import.

### FR2 — Branch-scoped evidence path

Runtime APIs must expose a branch-scoped evidence root:

```text
.sdd/runs/<branchSlug>/evidence/
```

Raw command output, SQL/API samples, screenshot/network files, failure excerpts, and large validation logs should be written as evidence attachments and indexed by SQLite metadata.

### FR3 — Legacy import compatibility

Existing projects with old run directories must remain readable. Legacy import should be idempotent and tracked through existing or extended import metadata.

### FR4 — Run-index/projection behavior

Run-index/projections must be derived from SQLite, not by scanning all run directories as the default path.

### FR5 — Minimal command compatibility

The following must continue to work after migration:

```text
npm run sdd -- status --branch master
npm run sdd -- tasks list --branch master
npm run sdd -- doctor --latest-only --branch master
```

### FR6 — Formal docs separation

Phase 7.2 must not write runtime logs or raw evidence into `spec.md`, `plan.md`, `tasks.md`, phase docs, or `.sdd/runs` workflow documents.

## 7. Acceptance criteria

- New runtime state is read from SQLite first.
- New evidence attachments are stored under `.sdd/runs/<branchSlug>/evidence/` and indexed in SQLite.
- Legacy run files can still be imported/read for existing projects.
- Common status/doctor/sync-back paths no longer require deep run-directory scans as their default behavior.
- Build/typecheck/test/pack pass.
- SDD smoke commands pass for `master`.
- Phase 7.2 validation records concrete commands and evidence.

## 8. Downstream handoff

Phase 7.3 may assume Runtime Storage v2 exists and can build a Workflow State Resolver on top of SQLite-first state and branch evidence refs.

Phase 7.4/7.5 may assume verification/test evidence can attach raw evidence by SQLite ref without stuffing large logs into the main context or workflow docs.
