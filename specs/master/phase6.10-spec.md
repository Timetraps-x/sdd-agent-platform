---
contract: sdd-spec-doc-v1
---

# Spec: Context Budget Runtime and Non-authoritative Log Workers

## 0. Metadata

- spec_id: `phase6.10-context-budget-runtime-log-workers`
- branch: `master`
- lifecycle_profile: `standard`
- source_request: `optimize token consumption and context occupancy without reducing SDD workflow output quality`
- status: `approved`
- retained_specs:
  - `phase6.10-spec.md`

## 1. Objective / Customer Value

Phase 6.10 makes SDD cheaper to operate in long Claude Code sessions by reducing repeated large outputs and unnecessary main-context residency. The runtime must preserve effect quality first: workflow authority remains in core contracts, and summaries/projections are expandable, hash-backed, and non-authoritative.

User value:

- Routine commands return concise next-action summaries by default.
- Full forensic evidence remains available when needed.
- Long command output is stored in run files and projected as compact source-hash summaries.
- Agent context can be built from deterministic working sets instead of rereading broad docs/logs.
- Subagents can help with run log writing/archival/summarization, but cannot affect workflow decisions.

## 2. Algorithm / Model Feasibility

The current plan is feasible because it maps known context-management techniques onto SDD runtime contracts:

- Hierarchical summarization compacts long logs into stable summaries with expandable source paths.
- Retrieval / working-set selection chooses only files, artifacts, and commands required for the next mode.
- Content-addressed projection prevents stale summaries from hiding changed source evidence.
- Failure-first extraction preserves blockers and warnings while omitting low-value verbose success logs.
- Provenance/hash-backed summaries make compaction auditable without making summaries authoritative.
- Authority separation keeps PASS/BLOCKED/doctor/sync-back decisions deterministic in core runtime.

## 3. Scope

### In Scope

- Define `ContextProfile` as `brief | normal | forensic`.
- Define `ContextBudget`, `ContextSourceRef`, `CommandOutputSummary`, `EvidenceSummaryProjection`, `ContextBuildPackage`, and `LogWorkerSummary` contracts.
- Add CLI context/profile options where they reduce default output size without breaking JSON contracts.
- Add `sdd context build --task <id> --mode <do|verify|sync-back|doctor> [--agent <agent>] [--branch <branch>] [--json]`.
- Add evidence summary projection for run/task evidence.
- Mark every derived projection as `authoritative=false` and `usableForPass=false`.
- Keep full source output in run artifacts/log paths with hashes.
- Add doctor/test checks that summaries/cache/context packages cannot satisfy PASS evidence.

### Out of Scope

- No vector database, graph database, embedding retrieval, daemon, or remote worker fleet.
- No subagent-driven workflow authority.
- No hidden command execution or automatic sync-back apply.
- No weakening Phase 6.9 trust policy.
- No runtime localization changes.

## 4. Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-6.10-1 | Runtime must expose stable context budget contracts for profiles, budgets, source refs, command summaries, evidence summaries, context packages, and log worker summaries. | Must |
| FR-6.10-2 | Default human output for status/doctor/sync-back/context commands must be brief by default while preserving JSON and forensic full output. | Must |
| FR-6.10-3 | Evidence summary projections must include source artifact paths, content hashes, issue counts, policy refs, and non-authoritative markers. | Must |
| FR-6.10-4 | `sdd context build` must emit deterministic working sets for do/verify/sync-back/doctor and optional agent-specific packages. | Must |
| FR-6.10-5 | Command output summaries must preserve failure/blocker lines and source log hashes while avoiding full log replay in normal output. | Should |
| FR-6.10-6 | Log workers/subagents may write summaries, logs, archives, and indexes under run paths only when marked non-authoritative. | Must |
| FR-6.10-7 | Runtime must reject derived summaries/cache/profile/context packages as PASS source evidence. | Must |
| FR-6.10-8 | Validation must include budget regressions, trust regressions, CLI smokes, package dry-run, and installed CLI workflow. | Must |

## 5. Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-1 | Context budget contract JSON shapes are stable and covered by tests. | typecheck + focused tests | Must |
| AC-2 | Brief output preserves blockers/current task/next action while omitting verbose repeated evidence. | CLI output tests | Must |
| AC-3 | Forensic mode returns or points to complete source evidence without relying on summaries as authority. | CLI/core tests | Must |
| AC-4 | Evidence summaries include source path/hash, policy refs, issue counts, `authoritative=false`, and `usableForPass=false`. | evidence summary tests | Must |
| AC-5 | `sdd context build` emits minimal working sets for do/verify/sync-back/doctor. | context CLI tests | Must |
| AC-6 | Agent-specific context packages differ by implementer/reviewer/validator needs but never contain authority to self-pass. | context agent tests | Must |
| AC-7 | Log worker summaries are accepted only as non-authoritative run evidence projections. | log worker tests | Must |
| AC-8 | Derived summaries/cache/profile/context packages cannot satisfy PASS acceptance evidence. | Phase 6.9 trust regression | Must |
| AC-9 | Default output budget regression prevents status/doctor/sync-back summaries from expanding without explicit forensic mode. | budget tests | Should |
| AC-10 | Installed CLI validates the Phase 6.10 chain from package tarball. | installed CLI smoke | Must |

## 6. Assumptions / Dependencies

| Item | Description | Impact if Wrong |
|---|---|---|
| Phase 6.9 trust layer exists | Derived outputs are already forbidden as PASS source evidence | Phase 6.10 could accidentally make summaries authoritative |
| Full run files remain source of truth | Summaries can be compact because source paths/hashes are expandable | Context packages would need external storage |
| User prefers effect quality over aggressive compression | Brief mode must not hide blockers or decision facts | Overcompression would harm workflow correctness |

## 7. Risks / Hard Gates

| Risk | Why it matters | Required Handling |
|---|---|---|
| summary_false_authority | A summary may be mistaken for source evidence | Always render `authoritative=false` and `usableForPass=false`; test trust rejection |
| hidden_blocker | Brief output may omit a blocker | Failure-first extraction and budget tests must preserve blockers |
| context_underfetch | Context package may omit required files | Packages include required/optional/deferred sections and source hashes |
| subagent_authority_leak | Log worker may influence workflow output | Log worker contract forbids workflow decisions and doctor flags violations |
| stale_projection | Cached projection may hide changed evidence | Content hashes invalidate derived projections |

## 8. Lifecycle Decision Reference

- decision_artifact: `specs/master/phases/phase-6.10-context-budget-runtime-log-workers.md`
- predecessor_artifact: `specs/master/phases/phase-6.9-runtime-trust-fast-path-hardening.md`
- downstream_artifact: `specs/master/phases/phase-7.0-code-knowledge-graph-baseline.md`
- recommended_profile: `standard`
- risk_signals: [`summary_false_authority`, `hidden_blocker`, `context_underfetch`, `subagent_authority_leak`, `stale_projection`]
- autonomy_ceiling: `full_sdd_with_checkpoint`
