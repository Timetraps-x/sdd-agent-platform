# Phase 7.2 Research — Runtime Storage v2 Implementation

## 1. Research scope

Phase 7.2 research turns the Phase 7.1 architecture decision into an implementation-ready scope. It covers four lines:

1. Phase 7.1 Runtime Storage v2 handoff.
2. Current local runtime/storage code dependencies.
3. Real project runtime data and migration implications.
4. External SQLite-first, evidence, checkpoint, artifact gate, and observability mechanisms.

Phase 7.2 implementation must preserve the Phase 7.1 boundary:

```text
runtime.sqlite = structured runtime source of truth
specs/<branch> = official workflow documents
.sdd/runs/<branchSlug>/evidence = raw evidence attachments only
```

## 2. Local code findings

Current code is still partially filesystem-authoritative.

Primary source-of-truth dependencies:

- `packages/core/src/run-state/run-state.ts`
  - `readRunState()` imports legacy `state.json` first, then reads SQLite.
  - `writeRunState()` still writes `state.json` and mirrors to SQLite.
  - `listRuns()` / `readAllRunStates()` still scan `.sdd/runs/*`.
- `packages/core/src/run-state/events.ts`
  - `appendEvent()` writes `events.jsonl` and mirrors to SQLite.
  - `readRunEvents()` imports legacy events, then reads SQLite, then can fall back to files.
- `packages/core/src/run-state/invocation-ledger.ts`
  - `appendInvocationLedgerEntry()` writes `invocations.jsonl` and mirrors to `activities`.
  - `listInvocationLedgerEntries()` still reads the file directly.
- `packages/core/src/run-state/run-index.ts`
  - `buildLocalRunIndexSnapshot()` scans `.sdd/runs` directories and reads per-run state/events.
  - `rebuildLocalRunIndex()` writes `.sdd/run-index.json`.
- `packages/core/src/run-state/artifacts.ts`
  - `writeArtifact()` / `readArtifact()` use run-local `.sdd/runs/<runId>/artifacts` paths.
- `packages/core/src/runtime-paths.ts`
  - `getRunsDir()`, `getRunDir()`, `getArtifactsDir()`, `getLocalRunIndexPath()` still encode old layout.
- `packages/core/src/status/project-status.ts`
  - Calls `rebuildLocalRunIndex()` before resolving latest run state.
- `packages/core/src/sync-back/inspect.ts`
  - Resolves runs through run-index rebuild and reads state/events/artifacts.
- `packages/core/src/doctor/checks/run-evidence.ts`
  - Scans `.sdd/runs`, reads state/events/ledger, and points users to `state.json` / `events.jsonl`.
- `packages/core/src/context/evidence-summary.ts`
  - Emits source refs to `state.json`, `events.jsonl`, `invocations.jsonl`, and run-local artifacts.

Existing `packages/core/src/storage/runtime-store.ts` already has useful tables: `runs`, `events`, `activities`, `artifacts`, `artifact_ingestions`, `policy_decisions`, `evidence_claims`, `gaps`, `recovery_actions`, `source_snapshots`, `projections`, `legacy_imports`, and `runtime_meta`. Phase 7.2 should evolve these instead of replacing the store wholesale.

## 3. Real project runtime data findings

Projects sampled:

```text
D:\project_01\inshn_emp
D:\project_02\inshn_emp
D:\project\inshn_emp
```

All three projects contain:

```text
.sdd/project.yml
.sdd/run-index.json
.sdd/runtime.sqlite
.sdd/runs/<runId>/
```

Typical run directory contents:

```text
state.json
events.jsonl
invocations.jsonl
artifacts/
agent-executions/
team-sessions/
worker-runtimes/
```

No existing `.sdd/runs/<branchSlug>/evidence` directories were found in the sampled projects.

Observed run directory counts:

| Project | run directories |
|---|---:|
| `D:\project_01\inshn_emp` | 30 |
| `D:\project_02\inshn_emp` | 11 |
| `D:\project\inshn_emp` | 16 |

Observed SQLite row counts:

| Project | runs | events | artifacts | evidence_claims | artifact_ingestions | activities | legacy_imports |
|---|---:|---:|---:|---:|---:|---:|---:|
| `D:\project_01\inshn_emp` | 29 | 1010 | 173 | 58 | 84 | 125 | 68 |
| `D:\project_02\inshn_emp` | 10 | 347 | 112 | 37 | 26 | 168 | 29 |
| `D:\project\inshn_emp` | 16 | 587 | 210 | 71 | 48 | 263 | 47 |

Migration implications:

- Existing layout is run-id flat; Phase 7.2 needs compatibility for old `.sdd/runs/<runId>/...` evidence paths.
- Some on-disk runs are not represented in SQLite; import must remain idempotent and tolerate partial historical data.
- Stable `run_id` should remain an identity, but evidence storage should be resolved by branch/spec namespace.
- Old references such as `.sdd/runs/<runId>/artifacts/validation-T3.md` need alias or compatibility resolution.
- Existing `legacy_imports` table is useful for idempotent migration tracking.

## 4. External mechanism findings

Mechanisms to translate:

- GSD shows SQLite can be authoritative for hierarchy, dispatch, completion, metrics, sessions, and resume while rendered files remain review surfaces.
- Spec Kit, OpenSpec, cc-sdd, and claude-code-spec keep staged human-readable docs separate from runtime logs.
- GitHub Agentic Workflows separates workflow source/compiled lock from runtime artifacts such as `agent_output.json`, `prompt.txt`, usage data, firewall logs, and audit logs.
- OpenSpec and AgentPlane both reinforce scoped change/task evidence rather than global unscoped artifact folders.
- Claude Code cost/context guidance supports compact summaries in context while preserving raw output elsewhere.
- Claude Code statusline and GitHub Agentic Workflows usage artifacts show that cost, token, duration, model, context, and audit metadata should be stored structurally.

Anti-patterns to avoid:

- Treating generated Markdown dashboards as authoritative runtime state.
- Appending runtime logs into `spec.md`, `plan.md`, `tasks.md`, `verify.md`, or formal phase docs.
- Silent fallback from current branch to `master` evidence.
- Storing only summaries and losing raw evidence.
- Passing full raw logs back into Claude context instead of storing/indexing them.
- Letting gates pass when expected artifacts or evidence are missing.

Sources considered:

- GitHub Spec Kit.
- OpenSpec.
- cc-sdd / claude-code-spec.
- GSD.
- AgentPlane.
- Oh My OpenAgent/OpenCode.
- GitHub Agentic Workflows.
- Claude Code cost/context/statusline guidance.
- Cloudflare Agents durable SQLite/checkpoint ideas.
- AgentActa event-log-to-SQLite observability ideas.

## 5. Phase 7.2 implementation decision

Phase 7.2 should be implemented as a staged migration, not a wholesale runtime rewrite.

Implementation order:

1. Add branch-scoped evidence path contract.
2. Add SQLite-first repository/read APIs for runs, events, activities, artifacts, artifact ingestions, and evidence refs.
3. Make run-state/event/ledger reads SQLite-first with legacy file import only as compatibility.
4. Stop new core writes of `state.json`, `events.jsonl`, `invocations.jsonl`, and `result.json` as authoritative state.
5. Rebuild run-index/projections from SQLite rather than scanning `.sdd/runs/*`.
6. Update status/doctor/sync-back minimal read paths to use SQLite-first state.
7. Update artifact/evidence source refs and user-facing messages to point at branch-scoped evidence attachments.
8. Keep formal workflow docs under `specs/<branch>`.

## 6. Open implementation risks

- Historical compatibility: old runs may exist only on disk or only partially in SQLite.
- Path compatibility: existing evidence refs may point at run-local artifact paths.
- Test blast radius: status, doctor, sync-back, validation rendering, and context packaging all touch runtime state.
- Scope creep: Phase 7.2 must not implement `/sdd:verifies`, `/sdd:test`, command-scoped team runtime, or release readiness semantics.
- Performance: frequent status/tasks/doctor reads should avoid deep evidence scans, but Phase 7.3 owns the full resolver/read-path design.

## 7. Research conclusion

Phase 7.2 can proceed to implementation after the 0.3.0 SDD docs are generated. The safe path is SQLite-first migration plus branch evidence attachment support, with legacy file import retained only for compatibility and migration, not as the new source of truth.
