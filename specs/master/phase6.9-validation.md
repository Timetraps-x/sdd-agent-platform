# Phase 6.9 Validation: Runtime Trust Layer and Fast Path Hardening

## 0. Metadata

- validation_id: `phase6.9-runtime-trust-fast-path-hardening`
- spec_id: `phase6.9-runtime-trust-fast-path-hardening`
- plan_id: `phase6.9-runtime-trust-fast-path-hardening`
- branch: `master`
- status: `planned`

## 1. Validation Scope

Phase 6.9 validates that SDD runtime PASS state is policy-proven from CER claims over provenance-backed attestations, acceptance coverage is deterministic policy output rather than mention matching, agent/skill/material usage is ledger-backed, sync-back is monotonic, diagnostics are branch-scoped, and common commands become faster only through safe derived fast paths.

In scope:

- CER / PROV / attestation / policy trust contracts and fixture coverage;
- PASS artifact evidence quality gate that rejects TODO/template/empty/mention-only/unsourced PASS and missing command/material references;
- policy-backed acceptance coverage with `PASS`, `FAIL`, `BLOCKED`, `REFERENCED_ONLY`, and `MISSING` decisions;
- artifact ingestion, policy decision, and evidence quality issue persistence;
- per-delegation routing and execution record normalization;
- invocation ledger for agent, skill, tool, material, policy, and cache activity;
- material provenance rendering only from invocation evidence;
- monotonic sync-back and explicit-run error handling;
- branch-scoped doctor trust checks for evidence policy, provenance graph, attestation, ledger, route, sync-back, material, and cache gaps;
- command profiling and content-addressed derived caches;
- team-mode cost routing for simple/read-only/high-risk task classes;
- EMP-style regressions for weak evidence, mention-only coverage, generated validator template TODO mappings, missing command/material refs, explicit FAIL/BLOCKED override, weak PASS sync-back prevention, route mismatch, applied re-verify, invocation provenance, and command latency.

Out of scope:

- Phase 8 code knowledge graph implementation;
- graph database, embedding store, daemon, remote worker fleet, or external telemetry;
- command hiding or forced command merging;
- runtime localization;
- LLM-only acceptance judging;
- generated acceptance coverage artifacts as source evidence for another PASS;
- TTL-only correctness caches;
- material usage claims without invocation evidence.

## 2. Task Evidence

| Task | Expected Evidence | Status |
|---|---|---|
| PHASE6.9-1 | retained and active Phase 6.9 docs align on AC-1 through AC-15 | PLANNED |
| PHASE6.9-2 | CER, PROV, attestation, policy, routing, ledger, sync-back, doctor, profiling, and cache contracts plus fixtures exist | PLANNED |
| PHASE6.9-3 | weak PASS artifacts and PASS artifacts missing command/material refs are rejected before ingestion/verify/sync-back | PLANNED |
| PHASE6.9-4 | acceptance coverage uses deterministic policy statuses and cites claim, evidence, reasoning, provenance, attestation, and issue codes | PLANNED |
| PHASE6.9-5 | every delegation has an independent route plan and coherent execution policy | PLANNED |
| PHASE6.9-6 | invocation ledger backs provenance activities, material usage claims, and evidence attestation materials | PLANNED |
| PHASE6.9-7 | sync-back remains monotonic and explicit missing run errors are actionable | PLANNED |
| PHASE6.9-8 | doctor reports branch-scoped evidence policy, provenance graph, attestation, ledger, route, sync-back, material, and cache findings | PLANNED |
| PHASE6.9-9 | profiling and derived graph/policy fast paths preserve correctness | PLANNED |
| PHASE6.9-10 | simple/read-only routing downgrades while high-risk hyperplan is preserved | PLANNED |
| PHASE6.9-11 | installed CLI, weak-evidence fixtures, weak PASS sync-back prevention, and EMP-style regression suite pass | PLANNED |

## 3. Required Commands

```powershell
npm run typecheck
npm test
npm run build
node ./dist/packages/cli/src/main.js status --branch master --compact-json
node ./dist/packages/cli/src/main.js tasks inspect PHASE6.9-1 --branch master --json
node ./dist/packages/cli/src/main.js tasks route PHASE6.9-1 --branch master --json
node ./dist/packages/cli/src/main.js artifact validate <weak_fixture_run_id> artifacts/validation-T004.md --task T004 --agent validator --compact-json
node ./dist/packages/cli/src/main.js verify task PHASE6.9-4 --branch master --run <coverage_fixture_run_id>
node ./dist/packages/cli/src/main.js tasks route PHASE6.9-5 --branch master --json
node ./dist/packages/cli/src/main.js run inspect <ledger_fixture_run_id> --json
node ./dist/packages/cli/src/main.js verify task PHASE6.9-7 --branch master --run <applied_fixture_run_id>
node ./dist/packages/cli/src/main.js sync-back inspect <applied_fixture_run_id> --task PHASE6.9-7 --branch master --json
node ./dist/packages/cli/src/main.js doctor --latest-only --branch master
node ./dist/packages/cli/src/main.js status --branch master --profile
node ./dist/packages/cli/src/main.js tasks inspect PHASE6.9-9 --branch master --profile --json
node ./dist/packages/cli/src/main.js tasks route PHASE6.9-10 --branch master --json
npm pack --dry-run --json
sdd --version
sdd status --branch master --compact-json
sdd tasks inspect PHASE6.9-11 --branch master --json
sdd tasks route PHASE6.9-11 --branch master --json
sdd do task PHASE6.9-11 --branch master --run <installed_cli_run_id> --implement-artifact artifacts/implement-PHASE6.9-11.md --review-artifact artifacts/review-PHASE6.9-11.md --validation-artifact artifacts/validation-PHASE6.9-11.md
sdd verify task PHASE6.9-11 --branch master --run <installed_cli_run_id>
sdd sync-back inspect <installed_cli_run_id> --task PHASE6.9-11 --branch master
sdd run index rebuild --json
sdd doctor --latest-only --branch master
```

## 4. Acceptance Mapping

| Acceptance | Validation Method | Result |
|---|---|---|
| AC-1 | type/fixture tests for `EvidenceClaim`, `EvidenceItem`, `EvidenceReasoning`, `EvidenceCoverage`, `ProvenanceEntity`, `ProvenanceActivity`, `ProvenanceAgent`, `ProvenanceLink`, `SddEvidenceAttestation`, `PolicyRuleSet`, `PolicyDecision`, `DelegationRoutePlan`, `InvocationLedgerEntry`, `SyncBackProposal`, `DoctorTrustFinding`, `CommandProfile`, and cache metadata | PLANNED |
| AC-2 | artifact validate and ingestion regression for TODO/template/empty/mention-only/unsourced PASS artifacts and PASS artifacts missing command/material refs | PLANNED |
| AC-3 | BLOCKED/FAIL artifact regression proving explicit blocker/failure evidence overrides PASS-like references and is preserved | PLANNED |
| AC-4 | verify regression proving mention-only AC references return `REFERENCED_ONLY` and block verify PASS | PLANNED |
| AC-5 | generated validator template TODO mapping and EMP T004-style weak validation fixtures cannot PASS | PLANNED |
| AC-6 | PASS regression requires claim + evidence + reasoning + source artifact + command/material refs, and renderer shows policy decision, evidence text, reasoning, provenance facts, attestation subject/materials, and issue codes | PLANNED |
| AC-7 | task-loop regression for reviewer/validator-only task delegation set | PLANNED |
| AC-8 | agent execution tests for per-delegation route plan and policy field coherence | PLANNED |
| AC-9 | run inspect/doctor tests for invocation ledger-backed agent, skill, tool, material, policy, cache, provenance, and attestation claims | PLANNED |
| AC-10 | EMP T007-style sync-back apply then re-verify regression and missing explicit `--run` CLI error | PLANNED |
| AC-11 | doctor tests for branch-scoped evidence policy, provenance graph, attestation, ledger, route, profile, sync-back, material, and cache findings | PLANNED |
| AC-12 | CLI/profile tests for phase timing on status, inspect, route, verify, doctor, policy evaluation, and run index paths | PLANNED |
| AC-13 | cache invalidation tests for runtime version, partition, config hash, document hash, run/artifact/material hash, router/policy rule version, provenance source hash, and option hash | PLANNED |
| AC-14 | route tests for simple/read-only downgrade and high-risk hyperplan preservation | PLANNED |
| AC-15 | typecheck, tests, build, package dry-run, installed CLI workflow, run-index, doctor, weak-evidence fixtures, weak PASS sync-back prevention, and EMP-style trust fixtures | PLANNED |

## 5. Completion Notes

Phase 6.9 is the runtime trust layer and fast path hardening phase before Phase 7.0 core modularization and Phase 8.0 code graph. Completion evidence must be filled only after implementation tasks, installed CLI regression, weak-evidence fixtures, weak PASS sync-back prevention, and EMP-style trust fixtures pass.
