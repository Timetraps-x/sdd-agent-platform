# Phase 7.1 Research — Runtime Architecture and Storage v2

## 1. Research scope

Phase 7.1 research covers four lines:

1. Local runtime source-of-truth scan.
2. Real project Phase 6 runtime data analysis.
3. External GitHub / open-source SDD and agent workflow patterns.
4. Phase 7.2 Runtime Storage v2 implementation handoff.

This research is intentionally broader than local code inspection. External projects and Claude Code runtime guidance are treated as design inputs, but not as implementations to copy directly.

## 2. Local runtime source-of-truth findings

Current runtime is not SQLite-first. It is effectively filesystem-authoritative with SQLite mirrors/projections.

Key current behavior:

- `readRunState()` prefers `.sdd/runs/<runId>/state.json` and only falls back to SQLite when the legacy file is absent.
- `writeRunState()` writes both `state.json` and SQLite `runs`.
- `appendEvent()` appends `events.jsonl` and writes SQLite `events`.
- Invocation ledger still reads `.sdd/runs/<runId>/invocations.jsonl` directly.
- Agent execution, team session, worker runtime records still live under per-run directories.
- `run-index.json` is derived by scanning `.sdd/runs/*`, then mirrored into SQLite projections.

Important file-tree dependencies:

```text
.sdd/runs/<runId>/state.json
.sdd/runs/<runId>/events.jsonl
.sdd/runs/<runId>/invocations.jsonl
.sdd/runs/<runId>/artifacts/**
.sdd/runs/<runId>/agent-executions/*.json
.sdd/runs/<runId>/team-sessions/*.json
.sdd/runs/<runId>/worker-runtimes/*.json
.sdd/run-index.json
```

Main code hubs:

```text
packages/core/src/runtime-paths.ts
packages/core/src/run-state/run-state.ts
packages/core/src/run-state/events.ts
packages/core/src/run-state/invocation-ledger.ts
packages/core/src/run-state/artifacts.ts
packages/core/src/run-state/run-index.ts
packages/core/src/run-state/inspect-run.ts
packages/core/src/storage/runtime-store.ts
packages/core/src/status/project-status.ts
packages/core/src/sync-back/inspect.ts
packages/core/src/doctor/checks/run-evidence.ts
packages/core/src/verification/goal-verify.ts
```

Existing SQLite capabilities are useful but not authoritative yet. Current `runtime-store.ts` already has tables for `runs`, `events`, `attempts`, `activities`, `artifacts`, `artifact_ingestions`, `policy_decisions`, `evidence_claims`, `gaps`, `recovery_actions`, `source_snapshots`, `projections`, `legacy_imports`, and `runtime_meta`.

## 3. Real project runtime data findings

Projects checked:

```text
D:\project_01\inshn_emp
D:\project_02\inshn_emp
D:\project\inshn_emp
```

Common layout:

```text
.sdd/runs/<runId>/
  state.json
  events.jsonl
  invocations.jsonl
  artifacts/
  agent-executions/
  team-sessions/
  worker-runtimes/
```

Run IDs are date-sequence local IDs such as:

```text
20260514-009
20260515-011
20260515-003
```

They do not expose branch/partition context. Branch visibility exists separately in state, events, invocations, and `run-index.json`.

Observed runtime.sqlite row counts show that the platform already records enough structure to evolve rather than introduce SQLite from scratch:

| Project | runs | events | artifacts | evidence_claims |
|---|---:|---:|---:|---:|
| `D:\project_01\inshn_emp` | 29 | 1010 | 173 | 58 |
| `D:\project_02\inshn_emp` | 10 | 347 | 112 | 37 |
| `D:\project\inshn_emp` | 16 | 587 | 210 | 71 |

Good SQLite row candidates from real data:

- Run lifecycle: run id, status, phase, task, partition, git branch, timestamps.
- Event stream index: event time/name/hash/source and JSON payload.
- Invocation ledger: command declarations, artifact hashes, policy evaluations.
- Artifact metadata: path, kind, task, agent, hash, bytes, status.
- Artifact ingestion result: delegation id, agent, result status, ingestion status.
- Evidence claims: task, acceptance id, status, source artifact, derived flag.
- Policy decisions: PASS/FAIL and issue codes.
- Sync-back status/proposal digest.
- Delegation/agent execution summaries.
- Source document snapshots: spec/plan/tasks hashes.

Good branch evidence attachments:

- SQL result samples.
- API response samples.
- Browser/network captures and raw responses.
- Failure log excerpts.
- Diff patches.
- Manual confirmation raw text.
- External reports.
- Review/validation narratives that are meant for human audit rather than hot-path status.

Examples:

```text
D:\project_02\inshn_emp\.sdd\runs\20260515-011\artifacts\order-detail-export.network-response
D:\project_02\inshn_emp\.sdd\runs\20260515-011\artifacts\pending-renew-16.network-response
D:\project\inshn_emp\specs\feat_erp_sim_outstock_20260513\artifacts\validation-e2e.md
D:\project\inshn_emp\specs\feat_erp_sim_outstock_20260513\artifacts\release-readiness.md
D:\project\inshn_emp\.sdd\runs\20260515-003\artifacts\validation-T12.md
```

Important distinction:

- Runtime evidence is audit/source evidence.
- Branch artifact is reviewable workflow deliverable evidence.
- SQLite should index both and relate them; it should not collapse them into one blob or duplicate formal workflow docs into `.sdd/runs`.

## 4. External project and GitHub/open-source findings

### GitHub Spec Kit

Sources:

- https://github.github.io/spec-kit/
- https://github.com/github/spec-kit
- https://github.com/github/spec-kit/blob/main/spec-driven.md

Relevant ideas:

- Branch/spec-scoped workflow artifacts are human-facing contracts.
- Specs/plans/tasks should remain reviewable files.
- Generated/runtime projections should not replace canonical workflow documents.

Translation for this project:

- Keep `specs/<branch>` as workflow doc source.
- Do not put `verify.md`, `release.md`, or formal workflow outputs under `.sdd/runs`.

### OpenSpec

Sources:

- https://openspec.dev/
- https://github.com/Fission-AI/OpenSpec

Relevant ideas:

- Active changes and long-lived specs are distinct.
- Checks emphasize consistency across proposal/spec/tasks.

Translation:

- Runtime state and workflow docs should be separate but cross-linked.
- Task checkboxes are useful user-facing progress, but not enough as machine runtime truth.

### cc-sdd / claude-code-spec

Sources:

- https://github.com/gotalab/cc-sdd
- https://github.com/gotalab/claude-code-spec

Relevant ideas:

- Lightweight spec/task boundary.
- Task-by-task execution discipline.
- Independent review / validation concepts.

Translation:

- Borrow task boundary and validation discipline.
- Do not overbuild full runtime before source-of-truth boundaries are clean.

### GSD

Source:

- https://github.com/gsd-build/gsd-2

Relevant ideas:

- SQLite can be authoritative for hierarchy, dispatch, completion, metrics, sessions, and resume.
- Cost/token metrics can be tracked structurally.

Translation:

- Good reference for SQLite-first durability and metrics.
- Too heavy to copy fully into Phase 7.1/7.2.

### AgentPlane

Sources:

- https://agentplane.org/docs/user/overview
- https://agentplane.org/docs/user/workflow

Relevant ideas:

- Git-native workflow with task/evidence records.
- Generated context/cache is disposable.
- External coding agents and PR review remain outside the runtime core.

Translation:

- Evidence should be reviewable and branch/task-scoped.
- SDD runtime should not replace Git, CI, PR review, or the coding agent.

### Oh My OpenAgent / Oh My OpenCode

Sources:

- https://ohmyopenagent.com/docs
- https://github.com/code-yeongyu/oh-my-openagent
- https://github.com/opensoft/oh-my-opencode

Relevant ideas:

- Team mode and runtime state can improve execution.
- Team mode should be optional and constrained.
- Notepads/mailboxes/task JSON can become heavy if copied directly.

Translation:

- Useful for later Phase 7.7 command-scoped team runtime.
- Not a reason to move team mode before Storage v2.

### GitHub Agentic Workflows

Sources:

- https://github.github.io/gh-aw/
- https://github.github.io/gh-aw/introduction/how-they-work/

Relevant ideas:

- Editable workflow source and generated lock/runtime projection are separate.

Translation:

- Keep editable SDD workflow docs separate from runtime projections.

### Claude Code context/cost/statusline

Sources:

- https://code.claude.com/docs/en/context-window
- https://code.claude.com/docs/en/costs#reduce-token-usage
- https://code.claude.com/docs/en/statusline
- https://github.com/liuup/claude-code-analysis.git
- https://cloud.tencent.com/developer/article/2649112

Relevant ideas:

- Context window is consumed by system prompt, memory, CLAUDE.md, skills, tools, and file reads.
- Subagents are useful for isolating verbose research and returning summaries only.
- Statusline/progress surfaces must be cheap and should cache expensive operations.
- Cost/token optimization is a platform/runtime concern, not something every workflow doc should hand-author.

Translation:

- Status/doctor/statusline must read compact SQLite/projection state, not scan runs/evidence files.
- Context pack boundaries, subagent usage boundaries, and token risk control belong in platform runtime and later agent/team capability phases.

## 5. Runtime Storage v2 architecture decision

Adopt this source-of-truth split:

```text
runtime.sqlite = structured runtime source of truth
specs/<branch> = official workflow documents
.sdd/runs/<branchSlug>/evidence = raw evidence attachments only
```

Target evidence layout:

```text
.sdd/
  runtime.sqlite
  runs/
    <branchSlug>/
      evidence/
        evi_<date>_<time>_<scope>_<phase>_<kind>_<short>.<ext>
```

Do not create:

```text
.sdd/runs/<branch>/<task>/<phase>/<runId>/
.sdd/runs/<runId>/state.json
.sdd/runs/<runId>/events.jsonl
.sdd/runs/<runId>/invocations.jsonl
.sdd/runs/<runId>/result.json
```

Do not use hash store + branch views for Phase 7.2. It is too heavy for the current project target.

## 6. Phase 7.2 implementation handoff

### Minimal schema direction

Phase 7.2 should start small and avoid pulling future verify/test/team semantics forward.

Candidate tables:

```text
runtime_meta(key, value, updated_at)
branches(branch_slug, raw_branch, spec_dir, created_at, updated_at)
runs(run_id, branch_slug, status, phase, current_task, task_id, created_at, updated_at, payload_json)
events(event_id, run_id, event_time, event_name, payload_json)
activities(activity_id, run_id, task_id, kind, ref, status, created_at, payload_json)
artifacts(artifact_id, run_id, task_id, kind, ref, content_hash, bytes, created_at, payload_json)
evidence_attachments(evidence_id, branch_slug, run_id, task_id, kind, relative_path, content_hash, bytes, created_at, payload_json)
projections(projection_type, scope_key, generated_at, payload_json)
```

Suggested indexes:

```text
(branch_slug, task_id, updated_at)
(run_id, event_time)
(branch_slug, created_at)
(projection_type, scope_key)
```

### Path API direction

Add new helpers in `runtime-paths.ts`:

```text
getBranchRunRoot(projectRoot, branchSlug)
getEvidenceDir(projectRoot, branchSlug)
getEvidenceAttachmentPath(projectRoot, branchSlug, relativeEvidencePath)
```

Deprecate new-call usage of:

```text
getRunDir
getArtifactsDir
getInvocationLedgerPath
getAgentExecutionsDir
getTeamSessionsDir
getWorkerRuntimesDir
```

### Runtime API direction

- `createRun()` allocates a run row in SQLite and ensures branch evidence root only when needed.
- `writeRunState()` upserts SQLite only for v2 runs.
- `readRunState()` reads SQLite first.
- `listRuns()` and `readAllRunStates()` query SQLite, not `.sdd/runs`.
- `appendEvent()` writes SQLite `events`, not `events.jsonl`.
- `invocation-ledger` maps to `activities`.
- `artifacts.ts` splits structured artifact records from raw evidence attachments.

### Staged implementation order

1. Add schema v2 initialization and version guard.
2. Add branch/evidence path helpers and path safety tests.
3. Convert run state and events to SQLite-first writes for new runs.
4. Convert invocation ledger to activities.
5. Convert local run index/projections to SQL queries.
6. Convert status/sync-back lookup paths to SQLite projections.
7. Convert doctor latest-only to avoid full `.sdd/runs` scan.
8. Keep any legacy importer explicit and non-authoritative.

## 7. Risks

- `doctor/checks/run-evidence.ts` currently scans `.sdd/runs`; it is the largest compatibility trap.
- Existing tests may assert `state.json` / `events.jsonl` behavior.
- SQLite support depends on current Node runtime availability.
- Existing artifact paths mix workflow deliverables and runtime evidence; API names must be clarified before implementation.
- If SQLite and filesystem dual-write remains too long, divergence risk continues.

## 8. Phase 7.1 conclusion

Runtime Storage v2 is the correct next architectural priority after Phase 7.0. The current platform already has SQLite projections, but the operational source of truth is still the run directory tree. Phase 7.2 should make new runtime state SQLite-first, reduce `.sdd/runs` to branch-scoped raw evidence attachments, and preserve `specs/<branch>` as the formal workflow document boundary.
