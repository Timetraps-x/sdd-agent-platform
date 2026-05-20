---
contract: sdd-spec-doc-v1
---

# Spec: Runtime Trust Layer and Fast Path Hardening

## 0. Metadata

- spec_id: `phase6.9-runtime-trust-fast-path-hardening`
- branch: `master`
- lifecycle_profile: `standard`
- source_request: `real project runtime trust, provenance, routing consistency, and command latency improvement`
- status: `approved`
- retained_specs:
  - `phase6.9-spec.md`

## 1. Objective / Customer Value

Phase 6.9 upgrades the SDD runtime from artifact self-declaration to a policy-proven Runtime Trust Layer before Phase 8 consumes run history as graph input. Acceptance PASS must be derived from CER claims over provenance-backed attestations and deterministic policy rules.

User value:

- PASS means a policy-proven acceptance claim, not a markdown assertion, AC mention, copied acceptance text, or template TODO.
- Weak references become `REFERENCED_ONLY` or `MISSING` instead of false PASS.
- Agent / skill / material usage can be proven from runtime invocation records.
- Delegation routing and execution policy are explainable per delegation.
- Sync-back state does not reopen completed writeback work after re-verify.
- Common commands remain explicit but become measurable and faster through safe fast paths.

Engineering value:

- Evidence claims, reasoning, coverage, provenance facts, attestations, policy decisions, route plans, execution records, invocation records, sync-back state, doctor diagnostics, profiling, and caches share stable contracts.
- Deterministic policy checks run before performance shortcuts and before verify/sync-back can accept evidence.
- Derived caches accelerate parsing/scanning/policy evaluation only and never become source of truth.

## 2. Problem / Intent

Real EMP project workflow runs proved that SDD can execute end-to-end, but exposed structural trust gaps: weak TODO artifacts can pass, coverage can become PASS from a substring mention, generated validator template mapping can be mistaken for validation evidence, route decisions can be reused across incompatible delegation profiles, execution records can mix `profile` and `toolPermission.profile`, material usage cannot be distinguished from catalog availability, sync-back can regress from `applied` to `proposed`, `doctor` can inspect the wrong branch context, and repeated commands redo parse/route/run-scan work.

This phase must be stable rather than minimal: the fix is not to patch each symptom independently, but to introduce a coherent trust layer with CER contracts, PROV-style facts, evidence attestations, deterministic policy rules, fixtures, gates, ledgers, state-machine guards, diagnostics, and cache invalidation boundaries.

## 3. Runtime Trust Layer Scope

### In Scope

- Define canonical runtime trust contracts for CER evidence claims/reasoning, evidence items, coverage, PROV-like entities/activities/agents/links, evidence attestations, policy rule sets/decisions, delegation route plans, invocation ledger entries, sync-back proposals, doctor trust findings, profiling, and cache metadata.
- Harden artifact validation and ingestion so PASS artifacts require claim + evidence + reasoning + source artifact + command/material refs.
- Replace mention-based acceptance coverage with deterministic policy classification over CER/provenance/attestation facts.
- Implement Design A: every delegation is routed independently.
- Normalize `AgentExecutionRecord` so profile, route, policy, and permission fields are coherent or explicitly marked as policy reuse.
- Add append-only invocation ledger records for actual agent / skill / tool / material / policy / cache use.
- Make material usage claims ledger-backed; catalog presence alone is never usage evidence.
- Enforce sync-back monotonic state and friendly explicit-run semantics.
- Add branch-scoped doctor trust checks for evidence policy, provenance graph, attestation, coverage, route, execution, invocation, sync-back, and cache gaps.
- Add command profiling and content-addressed derived caches for hot parse/route/scan/evidence/provenance/policy paths.
- Add team-mode cost routing that preserves high-risk hyperplan and downgrades simple/read-only work.
- Add EMP-style regression fixtures for weak evidence, generated template TODOs, mention-only coverage, applied re-verify, route mismatch, material non-use, branch-scoped doctor, and command cache invalidation.

### Out of Scope

- No Phase 8 graph database, graph query API, embedding store, or code knowledge graph implementation.
- No daemon or remote worker fleet as a hard dependency.
- No command hiding or forced command merging; the workflow remains explicit.
- No weakening validation gates, sync-back approvals, artifact provenance, or branch partition boundaries.
- No runtime localization changes.
- No claim that a source/material library was used unless invocation evidence exists.
- No cache that can create, mutate, or validate source-of-truth run state by itself.

## 4. Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-6.9-1 | Runtime must expose stable contracts for `EvidenceClaim`, `EvidenceItem`, `EvidenceReasoning`, `EvidenceCoverage`, `ProvenanceEntity`, `ProvenanceActivity`, `ProvenanceAgent`, `ProvenanceLink`, `SddEvidenceAttestation`, `PolicyRuleSet`, `PolicyDecision`, `DelegationRoutePlan`, `InvocationLedgerEntry`, `SyncBackProposal`, `DoctorTrustFinding`, `CommandProfile`, and derived cache metadata. | Must |
| FR-6.9-2 | PASS artifact validation must reject TODO placeholders, empty evidence, template text, mention-only evidence, unsourced PASS claims, and missing command/material references before ingestion, verify, and sync-back. | Must |
| FR-6.9-3 | Acceptance coverage must classify each AC as `PASS`, `FAIL`, `BLOCKED`, `REFERENCED_ONLY`, or `MISSING` from deterministic policy decisions over CER/provenance/attestation facts rather than substring mentions. | Must |
| FR-6.9-4 | Artifact ingestion must persist evidence quality and policy issue codes and must not mark weak PASS artifacts as accepted successful evidence. | Must |
| FR-6.9-5 | Each implementer/reviewer/validator delegation must have an independently computed route plan; router-rejected profiles must not create delegations. | Must |
| FR-6.9-6 | Agent execution records must align `profile`, `toolPermission.profile`, and route profile, or record explicit `policyReuse` with source profile and reason. | Must |
| FR-6.9-7 | Runtime must record append-only invocation ledger entries for actual agent, skill, tool, material, policy decision, and cache use where observable; these entries become provenance activities/materials. | Must |
| FR-6.9-8 | Material usage must be rendered only from material invocation/provenance entries; catalog/source availability alone must not count as usage. | Must |
| FR-6.9-9 | Sync-back state must be monotonic across `not_created -> proposed -> applied`; re-verify must not reopen an applied writeback, and missing explicit `--run` targets must fail with an actionable error. | Must |
| FR-6.9-10 | Doctor must support the intended branch/partition context and detect weak evidence, mention-only coverage, policy/provenance/attestation gaps, route/delegation mismatch, profile/policy mismatch, sync-back regression, material-without-invocation, and stale/unsafe cache evidence. | Must |
| FR-6.9-11 | Commands must expose opt-in phase timing for project resolution, config load, document parse, task model build, route computation, run scan/index, evidence validation, policy evaluation, cache lookup, and render. | Should |
| FR-6.9-12 | Fast paths must use content-addressed derived caches invalidated by runtime version, partition, config hash, document hashes, run/artifact hashes, router policy version, policy version, and command options. | Should |
| FR-6.9-13 | Team-mode routing must downgrade simple/read-only work while preserving high-risk hyperplan for API, schema, security, data, migration, or broad blast-radius changes. | Should |
| FR-6.9-14 | Full validation must include unit tests, deterministic policy fixtures, EMP-style weak evidence fixtures, built CLI smoke, package dry-run, installed CLI workflow, and run-index/doctor checks. | Must |

## 5. Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-1 | Runtime trust contract types and JSON shapes for CER, evidence, provenance, attestation, policy, route, ledger, sync-back, doctor, profile, and cache surfaces are documented by tests and remain stable for run inspect / doctor / artifact validation output. | typecheck + focused tests | Must |
| AC-2 | TODO/template/empty/mention-only/unsourced PASS artifacts are invalid before successful ingestion. | artifact validate + ingestion regression | Must |
| AC-3 | Honest BLOCKED/FAIL artifacts with explicit blocker evidence are preserved, override PASS-like references, and are not misreported as PASS. | fixture regression | Must |
| AC-4 | Mention-only AC id or acceptance text yields `REFERENCED_ONLY` and blocks verify PASS. | verify regression | Must |
| AC-5 | T004-style weak validation and generated template TODO mapping yield `REFERENCED_ONLY`, `BLOCKED`, `FAIL`, or `MISSING`, not PASS. | EMP fixture | Must |
| AC-6 | Coverage artifacts cite policy decision, evidence text, reasoning, provenance facts, attestation subject/materials, source artifact, commands/material refs, blocker reasons, and issue codes for every non-missing row. | acceptance coverage artifact | Must |
| AC-7 | Reviewer-only or validator-only tasks create no implementer delegation when implementer is rejected. | task-loop test | Must |
| AC-8 | Every delegation has its own route plan and coherent execution record; any policy reuse is explicit and doctor-visible. | agent execution test | Must |
| AC-9 | Agent / skill / tool / material usage claims are backed by invocation ledger/provenance entries; absent invocation means no usage claim. | run inspect + doctor test | Must |
| AC-10 | Applied sync-back remains applied after subsequent verify, or inspect returns already-applied/noop without reopening proposed. | sync-back regression | Must |
| AC-11 | `doctor --branch <branch>` and latest-only diagnostics report trust gaps in the intended partition. | doctor CLI/core tests | Must |
| AC-12 | Command profiling reports phase timing without changing default JSON/text contracts. | CLI/profile tests | Should |
| AC-13 | Cache hits are invalidated by relevant hash/config/runtime/option/policy changes and never skip evidence gates, policy evaluation, provenance checks, or sync-back guards. | cache correctness tests | Should |
| AC-14 | Team-mode cost routing downgrades simple/read-only tasks and preserves high-risk hyperplan behavior. | route tests | Should |
| AC-15 | Installed CLI regression validates weak-evidence, mention-only, generated-template TODO, route mismatch, invocation ledger, sync-back monotonicity, profiling, cache, doctor, and package dry-run evidence before Phase 6.9 completion. | installed CLI smoke | Must |

## 6. Assumptions / Dependencies

| Item | Description | Impact if Wrong |
|---|---|---|
| Phase 6.8 complete | Runtime output stays English and document prose language is already project-level | Phase 6.9 could accidentally mix trust work with localization work |
| Run artifacts remain source of truth | Ledgers, provenance facts, attestations, policy decisions, and caches are file-backed runtime evidence, not external services | External dependency would make the phase too broad |
| Commands stay explicit | User wants faster command calls, not fewer/hidden commands | UX work should focus on latency, profiling, and cache correctness |
| Phase 8 consumes runtime history | Graph inputs require policy-proven evidence, invocation provenance, attestation materials, and Phase 7 core module boundaries | Phase 8 would amplify false PASS and self-declared usage |

## 7. Risks / Hard Gates

| Risk | Why it matters | Required Handling |
|---|---|---|
| evidence_false_negative | Strict gates may reject concise but valid evidence | Provide issue codes, allow explicit blocker/failure evidence, and test terse valid CER claims |
| evidence_false_positive | Weak artifacts may still PASS | Include TODO/template/mention-only/empty/unsourced/generated-template fixtures and block ingestion |
| policy_rule_drift | Policy rules may become implicit or non-deterministic | Version rule sets, fixture decisions, and render issue codes |
| provenance_gap | Claims may lack command/material/source provenance | Require source artifact, command/material refs, and attestation materials for PASS |
| route_policy_drift | Per-delegation routing may change execution shape | Persist route plans and test implementer/reviewer/validator combinations |
| invocation_overclaim | Runtime may still render usage from declarations | Render usage only from invocation ledger entries |
| syncback_state_drift | Re-verify may reopen applied writebacks | Enforce state transition guards and proposal hashes |
| doctor_partition_drift | Doctor may inspect current Git branch instead of requested branch | Thread branch/partition through CLI and core diagnostics |
| cache_stale_decision | Fast path could serve stale task/route/policy data | Use content-addressed keys and fall back to recompute on mismatch |
| cost_under_routing | Cost routing could skip needed review | Preserve hyperplan for high-risk classes and explicit user/team-mode overrides |

## 8. Lifecycle Decision Reference

- decision_artifact: `specs/master/phases/phase-6.9-runtime-trust-fast-path-hardening.md`
- predecessor_artifact: `specs/master/phases/phase-6.8-project-document-language-runtime.md`
- downstream_artifact: `specs/master/phases/phase-7.0-core-runtime-modularization.md`
- canonical_model: `docs/architecture/lifecycle-decision-model.md`
- recommended_profile: `standard`
- risk_signals: [`evidence_contract_drift`, `route_execution_drift`, `invocation_provenance_gap`, `cache_stale_decision`, `syncback_state_drift`, `doctor_partition_drift`]
- autonomy_ceiling: `full_sdd_with_checkpoint`
