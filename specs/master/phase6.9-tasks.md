---
contract: sdd-tasks-doc-v1
---

# Tasks: Runtime Trust Layer and Fast Path Hardening

## 0. Metadata

- tasks_id: `phase6.9-runtime-trust-fast-path-hardening`
- spec_id: `phase6.9-runtime-trust-fast-path-hardening`
- plan_id: `phase6.9-runtime-trust-fast-path-hardening`
- branch: `master`
- lifecycle_profile: `standard`
- status: `approved`
- retained_tasks:
  - `phase6.9-tasks.md`

## 1. Delivery Map

| Task | Spec Acceptance | Plan Section | Boundary Reason |
|---|---|---|---|
| PHASE6.9-1 | AC-1, AC-15 | §3 Trust Contract Foundation; §12 Validation and Regression Plan | stabilize retained/active documents so implementation starts from one coherent Runtime Trust Layer contract |
| PHASE6.9-2 | AC-1 | §3 Trust Contract Foundation | define CER, PROV, attestation, policy rule, fixture, and serialization contracts before gates depend on them |
| PHASE6.9-3 | AC-2, AC-3 | §4 Evidence Quality Gate | block weak PASS artifacts before ingestion, verify, or sync-back can consume unsourced or unproven claims |
| PHASE6.9-4 | AC-4, AC-5, AC-6 | §5 Policy-backed Acceptance Coverage | replace mention matching with deterministic policy classification over CER/provenance/attestation facts |
| PHASE6.9-5 | AC-7, AC-8 | §6 Per-delegation Routing and Execution Normalization | route every delegation independently and make execution records policy-coherent |
| PHASE6.9-6 | AC-9 | §7 Invocation Ledger and Material Provenance | make usage claims and attestation materials auditable from append-only provenance activity evidence |
| PHASE6.9-7 | AC-10 | §8 Sync-back State Machine and Run Semantics | enforce monotonic writeback and actionable explicit-run behavior |
| PHASE6.9-8 | AC-11 | §9 Doctor Trust Suite | report branch-scoped evidence policy, provenance graph, attestation, ledger, route, sync-back, and cache gaps |
| PHASE6.9-9 | AC-12, AC-13 | §10 Profiling and Content-addressed Fast Paths | measure hot phases and cache only derived graph/policy results with hash invalidation |
| PHASE6.9-10 | AC-14 | §11 Team-mode Cost Routing | reduce high-cost routing for safe work without weakening high-risk workflows |
| PHASE6.9-11 | AC-15 | §12 Validation and Regression Plan | prove the full phase through tests, package dry-run, installed CLI, weak-evidence regressions, and EMP-style fixtures |

## 2. Wave Plan

| Wave | Tasks | Gate |
|---|---|---|
| 1 | PHASE6.9-1 | retained and active docs align on AC-1 through AC-15 |
| 2 | PHASE6.9-2 | CER, PROV, attestation, and policy trust contracts and fixtures are stable |
| 3 | PHASE6.9-3, PHASE6.9-4 | artifact PASS and acceptance coverage are policy-proven, not mention-derived |
| 4 | PHASE6.9-5 | delegation routing and execution policy are coherent |
| 5 | PHASE6.9-6 | invocation ledger proves provenance activities and attestation materials |
| 6 | PHASE6.9-7, PHASE6.9-8 | sync-back and doctor enforce runtime trust, policy, provenance, and attestation invariants |
| 7 | PHASE6.9-9, PHASE6.9-10 | commands are profiled, derived graph/policy caches are hash-safe, and routing is cost-aware |
| 8 | PHASE6.9-11 | installed CLI, weak-evidence regressions, and EMP-style regression pass |

## 3. Task List

### PHASE6.9-1: Stabilize runtime trust phase documents

```sdd-task
id: PHASE6.9-1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
  - AC-15
plan_refs:
  - "§3 Trust Contract Foundation"
  - "§12 Validation and Regression Plan"
affected_files:
  - specs/master/phases/phase-6.9-runtime-trust-fast-path-hardening.md
  - specs/master/phase6.9-spec.md
  - specs/master/phase6.9-plan.md
  - specs/master/phase6.9-tasks.md
  - specs/master/phase6.9-validation.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/README.md
  - specs/master/phases/PHASE_STATUS.md
  - specs/master/phases/phase-6.8-project-document-language-runtime.md
  - specs/master/phases/phase-8.0-code-knowledge-graph-baseline.md
validation:
  - node ./dist/packages/cli/src/main.js status --branch master --compact-json
  - node ./dist/packages/cli/src/main.js tasks inspect PHASE6.9-1 --branch master --json
  - node ./dist/packages/cli/src/main.js tasks route PHASE6.9-1 --branch master --json
risk:
  - document_chain_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-1.md
  - artifacts/review-PHASE6.9-1.md
  - artifacts/validation-PHASE6.9-1.md
verification_availability:
  - inspect:specs/master/spec.md
  - inspect:specs/master/plan.md
  - inspect:specs/master/tasks.md
  - inspect:specs/master/phase6.9-validation.md
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Align retained Phase 6.9 docs with the active `spec.md`, `plan.md`, `tasks.md`, and validation chain.
- Make the task chain explicit enough to implement the full Runtime Trust Layer instead of isolated symptom patches.
- Keep Phase 6.8, Phase 7.0 core modularization, and Phase 8.0 code graph dependency handoff references intact.

Forbidden scope:

- Do not implement runtime behavior in this task.
- Do not delete or rewrite prior retained Phase 6.7 or Phase 6.8 evidence.
- Do not commit, push, publish, reset, or clean unrelated files.

#### Acceptance

- AC-1 design surface is present: all trust-layer contract names are declared before implementation starts.
- AC-15 validation surface is present: installed CLI and EMP-style regression expectations are registered.
- `PHASE6.9-1` is inspectable and routable from `specs/master/tasks.md`.

### PHASE6.9-2: Add CER / PROV / attestation / policy trust contracts and fixtures

```sdd-task
id: PHASE6.9-2
status: pending
wave: 2
depends_on:
  - PHASE6.9-1
acceptance_refs:
  - AC-1
plan_refs:
  - "§3 Trust Contract Foundation"
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js tasks inspect PHASE6.9-2 --branch master --json
risk:
  - trust_contract_drift
  - serialization_incompatibility
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-2.md
  - artifacts/review-PHASE6.9-2.md
  - artifacts/validation-PHASE6.9-2.md
verification_availability:
  - inspect:packages/core/src/index.ts
  - inspect:packages/core/src/index.test.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Define stable runtime shapes for `EvidenceClaim`, `EvidenceItem`, `EvidenceReasoning`, `EvidenceCoverage`, `ProvenanceEntity`, `ProvenanceActivity`, `ProvenanceAgent`, `ProvenanceLink`, `SddEvidenceAttestation`, `PolicyRuleSet`, `PolicyDecision`, `DelegationRoutePlan`, `InvocationLedgerEntry`, `SyncBackProposal`, `DoctorTrustFinding`, `CommandProfile`, and derived cache metadata.
- Add fixtures for weak PASS artifacts, mention-only coverage, generated validator template TODO mappings, missing command/material references, route mismatch, invocation usage, explicit FAIL/BLOCKED override, policy determinism, and cache invalidation.
- Keep contracts serializable through existing run state, artifact ingestion, acceptance coverage, doctor/report, and future graph handoff paths.

Forbidden scope:

- Do not introduce external storage, graph database, daemon, or telemetry service.
- Do not make caches authoritative state.
- Do not change existing machine-readable field names without migration coverage.

#### Acceptance

- AC-1: CER, PROV, attestation, policy, routing, ledger, sync-back, doctor, profiling, and cache contracts are stable, typed, covered by fixtures, and safe for JSON/report rendering.

### PHASE6.9-3: Harden artifact evidence gate and ingestion

```sdd-task
id: PHASE6.9-3
status: pending
wave: 3
depends_on:
  - PHASE6.9-2
acceptance_refs:
  - AC-2
  - AC-3
plan_refs:
  - "§4 Evidence Quality Gate"
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js artifact validate <weak_fixture_run_id> artifacts/validation-T004.md --task T004 --agent validator --compact-json
risk:
  - evidence_false_negative
  - evidence_false_positive
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-3.md
  - artifacts/review-PHASE6.9-3.md
  - artifacts/validation-PHASE6.9-3.md
verification_availability:
  - inspect:packages/core/src/index.ts
  - inspect:packages/core/src/index.test.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Extract candidate CER claims, evidence sections, commands, artifact references, material references, AC references, and result statements from artifact markdown.
- Reject PASS artifacts with empty evidence, TODO placeholders, template text, mention-only evidence, unsourced PASS, missing command output, missing artifact reference, missing material reference, or provenance gaps.
- Persist evidence quality issue codes in artifact validation, ingestion, policy decision, and run state summaries.
- Preserve honest BLOCKED/FAIL artifacts when they carry explicit blocker/failure evidence.

Forbidden scope:

- Do not weaken `sdd-result` metadata validation.
- Do not let natural-language AC mentions count as PASS evidence.
- Do not require PASS-level proof for explicitly blocked or failed work.

#### Acceptance

- AC-2: TODO/template/empty/mention-only/unsourced PASS artifacts and PASS artifacts missing command/material refs are invalid before ingestion, verify, and sync-back.
- AC-3: Honest BLOCKED and FAIL artifacts keep explicit blocker/failure evidence instead of being forced into PASS validation rules.

### PHASE6.9-4: Replace acceptance coverage with policy-backed evidence classification

```sdd-task
id: PHASE6.9-4
status: pending
wave: 3
depends_on:
  - PHASE6.9-3
acceptance_refs:
  - AC-4
  - AC-5
  - AC-6
plan_refs:
  - "§5 Policy-backed Acceptance Coverage"
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js verify task PHASE6.9-4 --branch master --run <coverage_fixture_run_id>
risk:
  - coverage_false_pass
  - acceptance_trace_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-4.md
  - artifacts/review-PHASE6.9-4.md
  - artifacts/validation-PHASE6.9-4.md
verification_availability:
  - inspect:packages/core/src/index.ts
  - inspect:packages/core/src/index.test.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Parse accepted artifacts into `EvidenceClaim`, `EvidenceItem`, and `EvidenceReasoning`, then normalize source artifacts, commands, materials, run state, document hashes, and agent records into provenance facts and attestations.
- Evaluate deterministic policy rules to classify `PASS`, `FAIL`, `BLOCKED`, `REFERENCED_ONLY`, and `MISSING`.
- Apply the ordering `FAIL > BLOCKED > PASS > REFERENCED_ONLY > MISSING` when multiple evidence items mention an AC.
- Render coverage with policy decision, evidence text, reasoning, provenance facts, attestation subject/materials, source artifact, command/material references, and issue codes.

Forbidden scope:

- Do not report PASS from an AC id, copied acceptance text, artifact self-claim, generated template TODO, or `Mentioned in artifacts/...` line alone.
- Do not hide weak evidence behind an overall validator PASS or generated acceptance coverage artifact.
- Do not make `EvidenceCoverage` source evidence for another PASS; it is derived output only.

#### Acceptance

- AC-4: Mention-only AC references classify as `REFERENCED_ONLY` and block verify PASS.
- AC-5: EMP T004-style weak validation and generated template TODO mappings classify as `REFERENCED_ONLY`, `BLOCKED`, `FAIL`, or `MISSING`, not PASS.
- AC-6: Coverage output cites policy decision, concrete evidence items, reasoning, provenance facts, attestation subject/materials, source artifact, command/material refs, and issue codes.

### PHASE6.9-5: Route each delegation and normalize execution records

```sdd-task
id: PHASE6.9-5
status: pending
wave: 4
depends_on:
  - PHASE6.9-4
acceptance_refs:
  - AC-7
  - AC-8
plan_refs:
  - "§6 Per-delegation Routing and Execution Normalization"
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js tasks route PHASE6.9-5 --branch master --json
risk:
  - route_behavior_drift
  - execution_policy_mismatch
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-5.md
  - artifacts/review-PHASE6.9-5.md
  - artifacts/validation-PHASE6.9-5.md
verification_availability:
  - inspect:packages/core/src/index.ts
  - inspect:packages/core/src/index.test.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Compute and persist `DelegationRoutePlan` independently for implementer, reviewer, validator, and any validator-only delegation.
- Do not create delegations for router-rejected profiles.
- Align `AgentExecutionRecord.profile`, `toolPermission.profile`, route profile, model policy, and route hash.
- Record explicit `policyReuse` only when policy reuse is intentional and justified.

Forbidden scope:

- Do not reuse a task-level route decision across incompatible delegation profiles.
- Do not invent implementer delegations for reviewer-only or validator-only work.
- Do not hide route/profile mismatch from diagnostics.

#### Acceptance

- AC-7: Reviewer/validator-only tasks do not create implementer delegations when the router rejects implementer work.
- AC-8: Every delegation has its own route plan and coherent execution policy snapshot, or explicit policy reuse metadata.

### PHASE6.9-6: Add invocation ledger and material provenance

```sdd-task
id: PHASE6.9-6
status: pending
wave: 5
depends_on:
  - PHASE6.9-5
acceptance_refs:
  - AC-9
plan_refs:
  - "§7 Invocation Ledger and Material Provenance"
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js run inspect <ledger_fixture_run_id> --json
risk:
  - invocation_evidence_gap
  - material_usage_overclaim
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-6.md
  - artifacts/review-PHASE6.9-6.md
  - artifacts/validation-PHASE6.9-6.md
verification_availability:
  - inspect:packages/core/src/index.ts
  - inspect:packages/core/src/index.test.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Write append-only invocation ledger entries for observable agent, skill, tool, material, policy decision, cache hit, and cache miss activity.
- Link entries to run, task, delegation, name, status, input hash, output artifact, and `ProvenanceActivity` id where available.
- Use ledger entries as materials/activities for evidence attestations and render agent/skill/material usage only from ledger-backed provenance.

Forbidden scope:

- Do not claim material usage from catalog/source availability alone.
- Do not synthesize invocation records during inspection.
- Do not add external telemetry or graph storage.

#### Acceptance

- AC-9: Agent, skill, tool, material, policy, and cache usage claims are backed by invocation ledger/provenance entries; absent invocation means no usage claim or attestation material.

### PHASE6.9-7: Enforce sync-back state machine and explicit run semantics

```sdd-task
id: PHASE6.9-7
status: pending
wave: 6
depends_on:
  - PHASE6.9-6
acceptance_refs:
  - AC-10
plan_refs:
  - "§8 Sync-back State Machine and Run Semantics"
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js verify task PHASE6.9-7 --branch master --run <applied_fixture_run_id>
  - node ./dist/packages/cli/src/main.js sync-back inspect <applied_fixture_run_id> --task PHASE6.9-7 --branch master --json
risk:
  - syncback_state_regression
  - explicit_run_error_regression
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-7.md
  - artifacts/review-PHASE6.9-7.md
  - artifacts/validation-PHASE6.9-7.md
verification_availability:
  - inspect:packages/core/src/index.ts
  - inspect:packages/cli/src/main.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Enforce `not_created -> proposed -> applied` as the only forward sync-back state path.
- Return already-applied/noop for re-verify or inspect of applied task writeback.
- Make explicit `--run <missing>` fail with an actionable error instead of raw filesystem errors.

Forbidden scope:

- Do not skip approval for new sync-back proposals.
- Do not reopen applied sync-back as proposed.
- Do not hide unrelated stale document changes behind already-applied status.

#### Acceptance

- AC-10: Applied sync-back remains applied after re-verify, and missing explicit `--run` targets produce actionable guidance.

### PHASE6.9-8: Add branch-scoped doctor trust suite

```sdd-task
id: PHASE6.9-8
status: pending
wave: 6
depends_on:
  - PHASE6.9-7
acceptance_refs:
  - AC-11
plan_refs:
  - "§9 Doctor Trust Suite"
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only --branch master
risk:
  - doctor_false_negative
  - branch_context_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-8.md
  - artifacts/review-PHASE6.9-8.md
  - artifacts/validation-PHASE6.9-8.md
verification_availability:
  - inspect:packages/core/src/index.ts
  - inspect:packages/cli/src/main.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Add branch/partition-aware doctor input and report rendering.
- Detect evidence policy failures, provenance graph gaps, missing/invalid attestations, weak evidence, mention-only PASS coverage, generated TODO mappings, route/delegation mismatch, profile/policy mismatch, sync-back regression, material-without-invocation, and stale/unsafe cache evidence.
- Keep `--latest-only` focused on latest run while still running trust checks for that run.

Forbidden scope:

- Do not make doctor silently inspect the current Git branch when `--branch` is provided.
- Do not downgrade trust findings to informational output when they block workflow safety.
- Do not require external services for doctor diagnostics.

#### Acceptance

- AC-11: `doctor --branch <branch>` reports branch-scoped runtime trust findings for evidence policy, provenance graph, attestation, ledger, route, sync-back, material, and cache gaps.

### PHASE6.9-9: Add profiling and content-addressed fast paths

```sdd-task
id: PHASE6.9-9
status: pending
wave: 7
depends_on:
  - PHASE6.9-8
acceptance_refs:
  - AC-12
  - AC-13
plan_refs:
  - "§10 Profiling and Content-addressed Fast Paths"
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js status --branch master --profile
  - node ./dist/packages/cli/src/main.js tasks inspect PHASE6.9-9 --branch master --profile --json
risk:
  - cache_stale_decision
  - profile_output_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-9.md
  - artifacts/review-PHASE6.9-9.md
  - artifacts/validation-PHASE6.9-9.md
verification_availability:
  - inspect:packages/core/src/index.ts
  - inspect:packages/cli/src/main.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Add opt-in timing for project resolution, config load, document parse, task model build, route computation, run scan/index, evidence validation, policy evaluation, cache lookup, and render.
- Cache only derived parse, task model, route, run-index, evidence, provenance graph fragment, policy decision, and doctor computation results.
- Invalidate cache entries by runtime version, partition, project config hash, document hashes, run/artifact/material hashes, router/policy rule version, provenance source hashes, and command options.

Forbidden scope:

- Do not cache authoritative run state, source artifacts, or sync-back decisions.
- Do not bypass evidence gates, policy evaluation, doctor trust checks, or sync-back guards on cache hits.
- Do not use TTL-only invalidation for correctness-sensitive paths.

#### Acceptance

- AC-12: Profiling reports command phase timing for the hot paths.
- AC-13: Content-addressed fast paths preserve correctness, cache only derived graph/policy results, and invalidate on relevant hash or policy-version changes.

### PHASE6.9-10: Add team-mode cost routing

```sdd-task
id: PHASE6.9-10
status: pending
wave: 7
depends_on:
  - PHASE6.9-9
acceptance_refs:
  - AC-14
plan_refs:
  - "§11 Team-mode Cost Routing"
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js tasks route PHASE6.9-10 --branch master --json
risk:
  - cost_under_routing
  - high_risk_downgrade
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-10.md
  - artifacts/review-PHASE6.9-10.md
  - artifacts/validation-PHASE6.9-10.md
verification_availability:
  - inspect:packages/core/src/index.ts
  - inspect:packages/core/src/index.test.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Classify simple/read-only tasks for direct, compact, or validator-only execution where safe.
- Preserve hyperplan/team-mode for API, schema, security, data, migration, high blast-radius, or user-forced team-mode work.
- Include route explanations that make downgrades auditable.

Forbidden scope:

- Do not downgrade explicit high-risk tasks.
- Do not use team-mode cost routing to skip required reviewer/validator evidence.
- Do not hide route downgrade reasons.

#### Acceptance

- AC-14: Simple/read-only tasks downgrade while high-risk tasks preserve hyperplan behavior.

### PHASE6.9-11: Validate installed CLI and EMP-style regressions

```sdd-task
id: PHASE6.9-11
status: pending
wave: 8
depends_on:
  - PHASE6.9-10
acceptance_refs:
  - AC-15
plan_refs:
  - "§12 Validation and Regression Plan"
affected_files:
  - specs/master/phase6.9-validation.md
  - specs/master/tasks.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - npm pack --dry-run --json
  - sdd --version
  - sdd status --branch master --compact-json
  - sdd tasks inspect PHASE6.9-11 --branch master --json
  - sdd tasks route PHASE6.9-11 --branch master --json
  - sdd do task PHASE6.9-11 --branch master --run <installed_cli_run_id> --implement-artifact artifacts/implement-PHASE6.9-11.md --review-artifact artifacts/review-PHASE6.9-11.md --validation-artifact artifacts/validation-PHASE6.9-11.md
  - sdd verify task PHASE6.9-11 --branch master --run <installed_cli_run_id>
  - sdd sync-back inspect <installed_cli_run_id> --task PHASE6.9-11 --branch master
  - sdd run index rebuild --json
  - sdd doctor --latest-only --branch master
risk:
  - workflow_validation_drift
  - package_smoke_drift
  - emp_regression_gap
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.9-11.md
  - artifacts/review-PHASE6.9-11.md
  - artifacts/validation-PHASE6.9-11.md
verification_availability:
  - inspect:sdd status --branch master
  - inspect:sdd doctor --latest-only --branch master
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Validate Phase 6.9 with typecheck, tests, build, package dry-run, installed CLI workflow, run-index, doctor, weak-evidence fixtures, and EMP-style regression fixtures.
- Record weak-evidence, mention-only coverage, generated template TODO mapping, missing command/material reference, explicit FAIL/BLOCKED override, weak PASS sync-back prevention, applied-reverify, route mismatch, invocation ledger, profiling/cache, and cost-routing evidence.
- Keep explicit `--branch master` for workflows with uncommitted changes.

Forbidden scope:

- Do not publish to npm.
- Do not commit, push, reset, force clean, or destructively alter repository state.
- Do not treat fixture PASS as production evidence without artifact validation.

#### Acceptance

- AC-15: Unit tests, weak-evidence fixtures, EMP-style fixtures, built CLI smoke, package dry-run, installed CLI workflow, run-index, doctor, and sync-back weak-PASS prevention checks pass.

## 4. Dependency Notes

- CER/PROV/attestation/policy trust contracts and fixtures must precede evidence gate behavior.
- Evidence quality gates must precede policy-backed coverage, verify, sync-back, and doctor trust changes.
- Policy-backed coverage must precede installed workflow claims about PASS quality.
- Per-delegation routing must precede execution record normalization checks in doctor.
- Invocation ledger must precede material usage claims and attestation material validation.
- Sync-back state guards must precede doctor assertions about writeback monotonicity.
- Profiling and derived caches must not bypass hardened validation, policy evaluation, sync-back, or doctor gates.
- Existing uncommitted changes must not block workflow execution; use explicit `--branch master`.

## 5. Phase Gate Checkpoint

- ready_for_implementation: `true`
- blockers: []
- required_user_decisions: []
