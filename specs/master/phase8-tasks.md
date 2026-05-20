# Phase 8 Tasks — Coding Runtime Convergence

## Task metadata

- based_on_spec: `specs/master/phase8-spec.md`
- based_on_plan: `specs/master/phase8-plan.md`
- based_on_plan_hash: `84a969c23246b4ff9f1e5609260bdf142a3034d458a91b2d6baeb3971141b704`
- generated_by: `/sdd:tasks` workflow instructions (`sdd instructions tasks --json`, `sdd tasks format`)
- status: proposed task execution/evidence contract

## Delivery Map

| Wave | Goal | Tasks |
|---|---|---|
| 1 | Contract foundation and compatibility boundary | PHASE8-1, PHASE8-2 |
| 2 | Lifecycle risk kernel and safe consumption | PHASE8-3, PHASE8-4 |
| 3 | Unified test evidence user path | PHASE8-5 |
| 4 | Stage handoff and workflow state convergence | PHASE8-6, PHASE8-7 |
| 5 | Work units, subagents, and context offload | PHASE8-8, PHASE8-9, PHASE8-10 |
| 6 | Final integration and Phase 9 code graph handoff | PHASE8-11, PHASE8-12 |

## Wave Plan

Phase 8 must preserve the current workflow while new runtime models are introduced. The implementation order follows an observe / compare / enforce migration pattern:

```text
Wave 1: introduce contracts and projection helpers without changing command behavior.
Wave 2: produce lifecycle risk decisions and compare against legacy signals before enforcing.
Wave 3: unify /sdd:test result while preserving low-level verify compatibility.
Wave 4: add stage/handoff state first as observable projection, then derive next command.
Wave 5: add work units/subagent/context offload without giving subagents lifecycle authority.
Wave 6: finalize integration and prepare Phase 9 code graph handoff without implementing graph providers.
```

## PHASE8-1 — Add Phase 8 contract foundation

```sdd-task
id: PHASE8-1
status: completed
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
  - AC-2
  - AC-6
  - AC-9
  - AC-10
  - AC-13
  - AC-16
plan_refs:
  - "§5 Target design"
  - "§8 State and data design"
  - "§9 API and schema design"
affected_files:
  - packages/core/src/contracts.ts
  - packages/core/src/coding-facts/
  - packages/core/src/risk/
  - packages/core/src/stage-runtime/
  - packages/core/src/work-units/
  - packages/core/src/subagents/
  - packages/core/src/context-offload/
  - packages/core/src/evidence-runtime/
  - packages/core/src/index.test.ts
validation:
  - npm run build
  - npm run typecheck
  - node --test --import tsx packages/core/src/index.test.ts
risk:
  - source-boundary
  - public-api-change
  - platform-runtime
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - unit:node --test --import tsx packages/core/src/index.test.ts
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-contract-review.md
  - artifacts/phase8-contract-validation.md
```

#### Boundary

Add Phase 8 contract types and export boundaries only. Do not wire new models into status, doctor, sync-back, ship, or command behavior yet.

#### Acceptance

- Contract types exist for coding facts, coding risk, lifecycle risk decision, stage run, workflow handoff, work unit, subagent definition/dispatch/result, context load/offload, unified test evidence, model-produced artifacts, and Phase 9 graph extension boundaries.
- Lifecycle risk decision type contains no agent, team, or subagent selection fields.
- Public subpath strategy remains domain-level and does not restore root `@sdd-agent-platform/core` barrel imports.

#### Definition of Done

- Build and typecheck pass.
- Contract-focused tests prove required fields and forbidden fields.
- Review artifact confirms risk, handoff, work unit, subagent, context, evidence, and model-boundary concepts are not conflated.

#### Evidence Expectations

- Contract diff summary.
- Test output proving type/export compatibility.
- Review note confirming no root barrel restoration.

#### Implementation Notes

Start with type-only or pure-model modules. Keep behavior changes out of this task.

## PHASE8-2 — Add projection helpers and legacy compatibility adapters

```sdd-task
id: PHASE8-2
status: completed
wave: 1
depends_on:
  - PHASE8-1
acceptance_refs:
  - AC-3
  - AC-4
  - AC-21
  - AC-22
plan_refs:
  - "§8.2 Storage strategy"
  - "§9.3 Compatibility behavior"
  - "§14 Rollout and rollback"
affected_files:
  - packages/core/src/storage/runtime-store.ts
  - packages/core/src/task-risk-profile.ts
  - packages/core/src/lifecycle/decision-gate.ts
  - packages/core/src/risk/
  - packages/core/src/coding-facts/
  - packages/core/src/index.test.ts
validation:
  - npm run build
  - npm run typecheck
  - node --test --import tsx packages/core/src/index.test.ts
risk:
  - platform-runtime
  - runtime-state
  - evidence-semantics
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - unit:node --test --import tsx packages/core/src/index.test.ts
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-projection-compat-review.md
  - artifacts/phase8-projection-compat-validation.md
```

#### Boundary

Add read/write helpers for Phase 8 projections and adapters from existing `TaskRiskProfile` / `LifecycleDecisionRecord` into new risk signals. Do not add Runtime Store tables yet.

#### Acceptance

- Projection helpers support deterministic `projection_type + scope_key` writes for Phase 8 models.
- Existing task risk data can produce `CodingRiskSignal[]` without removing legacy fields.
- Existing lifecycle decision data can be mapped for comparison without becoming the new source of truth.
- Existing commands continue to work without requiring new projections.

#### Definition of Done

- Legacy tests still pass.
- New adapter tests cover source-boundary, docs-only, runtime-state, security, external, context/token legacy signals, and lifecycle profile mapping.
- Projection helpers are observable-only.

#### Evidence Expectations

- Unit test output for adapter coverage.
- Runtime projection helper review artifact.

#### Implementation Notes

Use projection-first strategy from the plan. Schema migration is explicitly out of this task.

## PHASE8-3 — Implement lifecycle risk decision kernel

```sdd-task
id: PHASE8-3
status: completed
wave: 2
depends_on:
  - PHASE8-1
  - PHASE8-2
acceptance_refs:
  - AC-1
  - AC-2
  - AC-3
  - AC-21
plan_refs:
  - "§5 Target design"
  - "§8 State and data design"
  - "§11 Key decisions"
affected_files:
  - packages/core/src/risk/
  - packages/core/src/coding-facts/
  - packages/core/src/task-risk-profile.ts
  - packages/core/src/lifecycle/decision-gate.ts
  - packages/core/src/index.test.ts
validation:
  - npm run build
  - npm run typecheck
  - node --test --import tsx packages/core/src/index.test.ts
risk:
  - lifecycle-policy
  - evidence-semantics
  - source-boundary
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - unit:node --test --import tsx packages/core/src/index.test.ts
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-risk-kernel-review.md
  - artifacts/phase8-risk-kernel-validation.md
```

#### Boundary

Implement deterministic risk policy evaluation from coding facts/signals to `LifecycleRiskDecision`. Do not yet enforce it in sync-back or ship.

#### Acceptance

- Direct, compact, full, research, and blocked outcomes are covered by focused tests.
- Blocking rules outrank human checkpoint, full lifecycle, compact lifecycle, and direct allow rules.
- Required stages, blocked stages, required evidence, review requirements, approval policy, and human checkpoint are populated deterministically.
- Risk decision contains no agent/team/subagent fields.

#### Definition of Done

- Focused rule-engine tests pass.
- Legacy task risk adapter feeds the kernel.
- Decision projection can be written and read.

#### Evidence Expectations

- Rule matrix test output.
- Review artifact confirming no agent/risk conflation.

#### Implementation Notes

Prefer a simple deterministic rule engine. Do not introduce ML scoring or agent-judged policy decisions.

## PHASE8-4 — Integrate lifecycle risk decision into status, doctor, sync-back, and ship as observe/compare

```sdd-task
id: PHASE8-4
status: completed
wave: 2
depends_on:
  - PHASE8-3
acceptance_refs:
  - AC-4
  - AC-5
  - AC-21
  - AC-22
plan_refs:
  - "§6 Architecture and component impact"
  - "§13 Risk control"
  - "§14 Rollout and rollback"
affected_files:
  - packages/core/src/status/
  - packages/core/src/doctor/
  - packages/core/src/sync-back/
  - packages/core/src/lifecycle/ship.ts
  - packages/core/src/risk/
  - packages/core/src/index.test.ts
validation:
  - npm run build
  - npm run typecheck
  - npm test
  - npm run sdd -- status --branch master
  - npm run sdd -- doctor --latest-only --branch master
  - npm run sdd -- ship --branch master --dry-run
risk:
  - platform-runtime
  - release-gate
  - sync-back-risk
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - regression:npm test
  - smoke:npm run sdd -- status --branch master
  - smoke:npm run sdd -- doctor --latest-only --branch master
  - smoke:npm run sdd -- ship --branch master --dry-run
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-risk-consumer-review.md
  - artifacts/phase8-risk-consumer-validation.md
```

#### Boundary

Integrate lifecycle risk decision as observe/compare diagnostics first. Do not make new risk decision the only gate until mismatch behavior is visible and tested.

#### Acceptance

- Status and doctor can report missing, stale, blocked, or incompatible lifecycle risk decisions.
- Sync-back and ship can read lifecycle risk decisions and compare them with legacy readiness.
- Legacy behavior remains available during this task.
- Mismatches are surfaced as diagnostics rather than silently changing command outcomes.

#### Definition of Done

- Existing status/doctor/ship tests remain green.
- New tests cover missing/stale/blocked decision diagnostics.
- Smoke commands are run or explicitly documented if blocked by existing master stale state.

#### Evidence Expectations

- Test output.
- Smoke output or documented pre-existing blocker.
- Review artifact for observe/compare migration safety.

#### Implementation Notes

This task is the main workflow-preservation guard. Do not switch to enforcement-only behavior here.

## PHASE8-5 — Refactor `/sdd:test` into unified test evidence runtime

```sdd-task
id: PHASE8-5
status: completed
wave: 3
depends_on:
  - PHASE8-3
acceptance_refs:
  - AC-16
  - AC-17
  - AC-18
  - AC-21
  - AC-22
plan_refs:
  - "§7.2 /sdd:test unified flow"
  - "§10 Concurrency, consistency, and transaction design"
  - "§11 Decision 5 — /sdd:test owns evidence judgment"
affected_files:
  - packages/core/src/verification/test-runtime.ts
  - packages/core/src/verification/goal-verify.ts
  - packages/core/src/evidence-runtime/
  - packages/core/src/sync-back/
  - packages/cli/src/commands/
  - packages/cli/src/renderers/
  - packages/core/src/index.test.ts
validation:
  - npm run build
  - npm run typecheck
  - npm test
  - npm run sdd -- test --branch master --task <representative-task>
risk:
  - evidence-semantics
  - workflow-mainline
  - compatibility
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - regression:npm test
  - smoke:npm run sdd -- test --branch master --task <representative-task>
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-unified-test-review.md
  - artifacts/phase8-unified-test-validation.md
```

#### Boundary

Unify test execution and evidence evaluation under `/sdd:test`. Keep low-level `sdd verify task` as compatibility/diagnostic. Do not remove compatibility in this task.

#### Acceptance

- `/sdd:test` result includes command execution summary, evidence evaluation summary, acceptance coverage summary, gaps, and next action.
- PASS no longer recommends `sdd verify task` as the primary next step.
- PASS recommends sync-back inspection or apply according to policy.
- FAIL/BLOCKED reports evidence gaps and missing acceptance coverage.
- Low-level verify remains available for diagnostics.

#### Definition of Done

- Existing test-runtime behavior remains covered.
- New unified evidence tests cover PASS, FAIL, BLOCKED, missing acceptance coverage, and sync-back readiness.
- CLI rendering and JSON output remain stable enough for automation.

#### Evidence Expectations

- Focused test output.
- CLI smoke output.
- Compatibility note for `sdd verify task`.

#### Implementation Notes

Keep command execution and evidence evaluation as separate internal modules under one unified result contract.

## PHASE8-6 — Add stage run and workflow handoff projections

```sdd-task
id: PHASE8-6
status: completed
wave: 4
depends_on:
  - PHASE8-3
  - PHASE8-4
acceptance_refs:
  - AC-6
  - AC-7
  - AC-21
plan_refs:
  - "§7.3 Stage handoff flow"
  - "§8 State and data design"
  - "§10 Concurrency, consistency, and transaction design"
affected_files:
  - packages/core/src/stage-runtime/
  - packages/core/src/workflow-state/resolve.ts
  - packages/core/src/storage/runtime-store.ts
  - packages/core/src/index.test.ts
validation:
  - npm run build
  - npm run typecheck
  - node --test --import tsx packages/core/src/index.test.ts
risk:
  - state-machine
  - workflow-mainline
  - runtime-state
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - unit:node --test --import tsx packages/core/src/index.test.ts
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-stage-handoff-review.md
  - artifacts/phase8-stage-handoff-validation.md
```

#### Boundary

Add stage run and workflow handoff contracts, state transition helpers, and projections. Start observable-only; do not yet replace all workflow next-command logic.

#### Acceptance

- Stage run can record active/completed/blocked/skipped states with owner and co-main agents.
- Workflow handoff can be proposed, accepted, rejected, or blocked.
- Handoff validation considers source stage status, lifecycle risk decision, required refs, evidence refs, open questions, and blocking gaps.
- Subagents cannot be stage owners.

#### Definition of Done

- State transition tests cover legal and illegal transitions.
- Handoff projection read/write tests pass.
- Review artifact confirms lifecycle control is not delegated to subagents.

#### Evidence Expectations

- State-machine test output.
- Handoff validation matrix.

#### Implementation Notes

Use projection storage first. Stable Runtime Store schema can follow after contract validation.

## PHASE8-7 — Integrate stage handoff into workflow state, status, and doctor

```sdd-task
id: PHASE8-7
status: completed
wave: 4
depends_on:
  - PHASE8-6
acceptance_refs:
  - AC-8
  - AC-21
  - AC-22
plan_refs:
  - "§6 Architecture and component impact"
  - "§7.1 Standard high-level workflow"
  - "§14 Rollout and rollback"
affected_files:
  - packages/core/src/workflow-state/resolve.ts
  - packages/core/src/status/
  - packages/core/src/doctor/
  - packages/core/src/stage-runtime/
  - packages/cli/src/commands/
validation:
  - npm run build
  - npm run typecheck
  - npm test
  - npm run sdd -- status --branch master
  - npm run sdd -- doctor --latest-only --branch master
risk:
  - workflow-mainline
  - compatibility
  - runtime-state
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - regression:npm test
  - smoke:npm run sdd -- status --branch master
  - smoke:npm run sdd -- doctor --latest-only --branch master
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-workflow-state-review.md
  - artifacts/phase8-workflow-state-validation.md
```

#### Boundary

Expose active stage and latest handoff in workflow state/status/doctor. Use compare mode before making handoff-derived next command authoritative.

#### Acceptance

- Workflow state includes active stage and latest handoff state when projections exist.
- Doctor reports missing, stale, rejected, or blocked handoffs.
- Recommended next command can be compared between legacy heuristic and handoff/risk-derived logic.
- Existing workflow status still works when no Phase 8 handoff projections exist.

#### Definition of Done

- Backward compatibility tests pass for workflows without handoff projections.
- New tests cover handoff-derived next command comparison.
- Smoke output is captured or existing blockers are documented.

#### Evidence Expectations

- Test output.
- Status/doctor smoke output.
- Review artifact for main workflow preservation.

#### Implementation Notes

Do not make handoff enforcement unconditional in this task.

## PHASE8-8 — Add work unit runtime and subagent contract enforcement

```sdd-task
id: PHASE8-8
status: completed
wave: 5
depends_on:
  - PHASE8-6
acceptance_refs:
  - AC-9
  - AC-10
  - AC-11
  - AC-12
  - AC-21
plan_refs:
  - "§8 State and data design"
  - "§11 Decision 2 — WorkUnit replaces CommandTeamRuntime as execution model"
  - "§11 Decision 3 — Subagents are non-authoritative by default"
affected_files:
  - packages/core/src/work-units/
  - packages/core/src/subagents/
  - packages/core/src/registries/command-team-runtime.ts
  - packages/core/src/storage/runtime-store.ts
  - packages/core/src/index.test.ts
validation:
  - npm run build
  - npm run typecheck
  - node --test --import tsx packages/core/src/index.test.ts
risk:
  - multi-agent-review
  - permission-boundary
  - runtime-state
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - unit:node --test --import tsx packages/core/src/index.test.ts
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-work-unit-review.md
  - artifacts/phase8-work-unit-validation.md
```

#### Boundary

Add work unit and subagent definition/dispatch/result contracts plus policy enforcement. Do not actually spawn external Claude Code subagents unless a later task explicitly wires host integration.

#### Acceptance

- Work units distinguish main-agent, co-main-agent, and subagent authority.
- Subagent results are non-authoritative by default.
- Blocking and non-blocking work units can be recorded.
- Subagent policy rejects production code edit authority and lifecycle ownership.
- Test-writer permission mode is restricted to test paths.

#### Definition of Done

- Policy tests cover production path blocked and test path allowed for test-writer.
- Work unit status tests cover pending/running/completed/blocked/failed/cancelled.
- CommandTeamRuntime remains compatibility metadata and is not removed.

#### Evidence Expectations

- Policy test output.
- Review artifact for subagent boundary.

#### Implementation Notes

This task creates the runtime contract; host execution integration can remain mocked or projection-only.

## PHASE8-9 — Add context load and offload runtime

```sdd-task
id: PHASE8-9
status: completed
wave: 5
depends_on:
  - PHASE8-8
acceptance_refs:
  - AC-13
  - AC-14
  - AC-15
  - AC-21
plan_refs:
  - "§5 Target design"
  - "§11 Decision 4 — Context offload replaces token budget as primary model"
  - "§13 Risk control"
affected_files:
  - packages/core/src/context/build-package.ts
  - packages/core/src/context-offload/
  - packages/core/src/subagents/
  - packages/core/src/status/
  - packages/core/src/doctor/
  - packages/core/src/index.test.ts
validation:
  - npm run build
  - npm run typecheck
  - node --test --import tsx packages/core/src/index.test.ts
  - npm run sdd -- statusline --branch master --json
risk:
  - context-risk
  - token-risk
  - performance
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - unit:node --test --import tsx packages/core/src/index.test.ts
  - smoke:npm run sdd -- statusline --branch master --json
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-context-offload-review.md
  - artifacts/phase8-context-offload-validation.md
```

#### Boundary

Introduce context load/offload decisions while retaining existing context package compatibility. Do not delete budget accounting; downgrade it to guardrail/diagnostic.

#### Acceptance

- Context load levels normal/elevated/high/overloaded are computed from refs, large artifacts/logs, many files, unknown impact, or dependency depth.
- High load recommends summarize or subagent offload instead of only trimming optional refs.
- Statusline and doctor surface context load/delegation pressure as primary concepts.
- Token estimates remain diagnostics and do not serve as the top-level readiness concept.

#### Definition of Done

- Context load tests cover normal/elevated/high/overloaded.
- Offload decision tests cover inline/summarize/dispatch-subagent/block-for-curation.
- Existing context package tests remain green.

#### Evidence Expectations

- Context offload decision test output.
- Statusline smoke output or documented existing blocker.

#### Implementation Notes

Do not make context packages authoritative PASS evidence.

## PHASE8-10 — Add foreground/background subagent dispatch integration points

```sdd-task
id: PHASE8-10
status: completed
wave: 5
depends_on:
  - PHASE8-8
  - PHASE8-9
acceptance_refs:
  - AC-10
  - AC-11
  - AC-12
  - AC-14
  - AC-21
plan_refs:
  - "§7.1 Standard high-level workflow"
  - "§10 Concurrency, consistency, and transaction design"
  - "§13 Risk control"
affected_files:
  - packages/core/src/subagents/
  - packages/core/src/work-units/
  - packages/core/src/context-offload/
  - packages/core/src/doctor/
  - packages/cli/src/commands/
validation:
  - npm run build
  - npm run typecheck
  - npm test
risk:
  - multi-agent-review
  - permission-boundary
  - workflow-mainline
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - regression:npm test
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-subagent-dispatch-review.md
  - artifacts/phase8-subagent-dispatch-validation.md
```

#### Boundary

Add integration points for recording foreground/background dispatches and consuming completed results. Do not require actual external background agent execution for this task unless host support is already available.

#### Acceptance

- Foreground and background dispatch records can be created.
- Blocking dispatches can block declared gates when incomplete/failed.
- Non-blocking dispatches do not block the main stage by default.
- Completed results are consumed only through summary/artifact/evidence refs.
- Doctor reports stale, failed, or missing required subagent results.

#### Definition of Done

- Dispatch lifecycle tests cover blocking and non-blocking behavior.
- Result consumption tests prove non-authoritative default.
- Doctor diagnostic tests cover missing/failed/stale required dispatches.

#### Evidence Expectations

- Dispatch tests.
- Doctor diagnostic test output.
- Review artifact for foreground/background semantics.

#### Implementation Notes

Keep subagent host invocation swappable; this task defines platform-side runtime semantics.

## PHASE8-11 — Prepare Phase 9 code graph handoff

```sdd-task
id: PHASE8-11
status: completed
wave: 6
depends_on:
  - PHASE8-9
acceptance_refs:
  - AC-19
  - AC-20
  - AC-21
plan_refs:
  - "§12 Alternatives considered"
  - "§18.7 Phase 9 code graph handoff"
affected_files:
  - specs/master/phase9-spec.md
  - specs/master/phase8-plan.md
  - specs/master/phase8-tasks.md
  - docs/architecture/
validation:
  - npm run build
  - npm run typecheck
risk:
  - phase-boundary
  - release-doc
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-code-graph-handoff-review.md
  - artifacts/phase8-code-graph-handoff-validation.md
```

#### Boundary

Document Phase 9 code graph scope and extension points. Do not implement code graph providers, graph caches, graph projections, or graph-consuming gates in Phase 8.

#### Acceptance

- Phase 9 handoff identifies code graph goals, inputs, outputs, and likely consumers after Phase 8 stabilization.
- Phase 8 runtime contracts remain absent-safe when graph signals are missing.
- No Phase 8 command, status, doctor, ship, sync-back, or `/sdd:test` gate depends on code graph signals.

#### Definition of Done

- Phase 9 handoff document exists or architecture docs clearly capture the deferred scope.
- Review confirms graph implementation is not part of Phase 8.
- Build/typecheck pass after documentation and reference updates.

#### Evidence Expectations

- Handoff review artifact.
- Validation output.

#### Implementation Notes

Keep the handoff concise. Phase 9 will define the detailed graph provider, cache, and consumer algorithms.

## PHASE8-12 — Final integration, docs, and regression hardening

```sdd-task
id: PHASE8-12
status: completed
wave: 6
depends_on:
  - PHASE8-4
  - PHASE8-5
  - PHASE8-7
  - PHASE8-10
  - PHASE8-11
acceptance_refs:
  - AC-15
  - AC-17
  - AC-18
  - AC-21
  - AC-22
plan_refs:
  - "§14 Rollout and rollback"
  - "§15 Validation matrix"
  - "§17 Plan gaps and task readiness"
affected_files:
  - packages/cli/src/main.ts
  - packages/cli/src/commands/
  - packages/cli/src/renderers/
  - packages/core/src/status/
  - packages/core/src/doctor/
  - packages/core/src/lifecycle/ship.ts
  - packages/core/src/sync-back/
  - .claude/commands/sdd/test.md
  - .claude/commands/sdd/verify.md
  - docs/architecture/
  - specs/master/phase8-validation.md
validation:
  - npm run build
  - npm run typecheck
  - npm test
  - npm pack --dry-run --json
  - npm run sdd -- status --branch master
  - npm run sdd -- tasks list --branch master
  - npm run sdd -- doctor --latest-only --branch master
risk:
  - workflow-mainline
  - generated-ai-entry
  - release-doc
agent_fit:
  - implementer
  - reviewer
  - validator
verification_availability:
  - build:npm run build
  - typecheck:npm run typecheck
  - regression:npm test
  - package:npm pack --dry-run --json
  - smoke:npm run sdd -- status --branch master
  - smoke:npm run sdd -- tasks list --branch master
  - smoke:npm run sdd -- doctor --latest-only --branch master
autonomy: full_sdd_with_checkpoint
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/phase8-final-regression-review.md
  - artifacts/phase8-final-validation.md
```

#### Boundary

Finalize integration and documentation. Do not implement Phase 9 code graph providers. Do not remove compatibility commands unless all planned compatibility gates pass.

#### Acceptance

- Status, doctor, sync-back, ship, and statusline consistently surface Phase 8 concepts.
- `/sdd:test` is documented as the unified test + evidence judgment stage.
- Standalone verify is documented as compatibility/diagnostic only.
- Token health is no longer the primary readiness concept in docs or generated AI entries.
- Phase 8 validation document records build/typecheck/test/pack and SDD smokes.

#### Definition of Done

- Full validation matrix is executed or blockers are documented.
- Generated AI entries reflect the simple slash lifecycle.
- Architecture docs and Phase 8 validation are updated.
- No CLI/core package boundary regression is introduced.

#### Evidence Expectations

- Full command output summary.
- Pack dry-run output.
- SDD smoke output.
- Final review artifact.

#### Implementation Notes

This task should close the phase only after earlier workstream evidence exists.

## Boundary

Phase 8 tasks are implementation tasks for the SDD agent platform runtime. They may modify platform source, generated AI entries, architecture docs, and Phase 8 validation docs. They must not publish, push, tag, deploy, or mutate remote/shared release state.

## Acceptance

- Every Phase 8 spec acceptance criterion AC-1 through AC-22 is mapped to at least one task.
- Tasks preserve dependency order from contract foundation to final integration.
- Risk, context, subagent, workflow handoff, unified test evidence, and Phase 9 graph handoff work are separated enough to avoid concept mixing.
- Main workflow preservation is explicit through projection-first and observe/compare/enforce migration.

## Definition of Done

- All tasks are completed with required artifacts.
- Phase 8 validation records build, typecheck, tests, pack dry-run, and SDD smokes.
- `/sdd:test` is the documented user-facing test + evidence judgment entry.
- Risk decisions are independent from agent/subagent/team modeling.
- Subagents are non-authoritative and cannot edit production code.
- Context optimization is documented and implemented as offload/delegation pressure, not token budget as primary model.

## Evidence Expectations

Each task should produce:

- Implementation summary.
- Review artifact when source-boundary or runtime behavior changes.
- Validation artifact with exact commands and outputs.
- Notes for any pre-existing blockers, especially current `specs/master` stale verify state.

## Implementation Notes

Run `/sdd:do` only after task boundaries, acceptance refs, plan refs, affected files, validation commands, and evidence requirements are accepted. Do not silently skip review artifacts for high-risk runtime tasks.

## Architecture Hardening Requirements

Before `/sdd:do` starts implementation, the relevant Phase 8 tasks must apply these constraints from `phase8-plan.md` §18.

### Projection and storage requirements

- PHASE8-2 must introduce a common projection envelope with `projectionType`, `scopeKey`, `inputHash`, `producerVersion`, `generatedAt`, stale reason support, and deterministic latest-projection identity.
- PHASE8-2 must test idempotent projection writes and stale projection detection.
- PHASE8-12 must document which Phase 8 models remain projection-only and which are candidates for stable Runtime Store tables.
- Large logs, raw model outputs, and large context dumps must be artifact refs; projections should stay compact.

### Risk and algorithm requirements

- PHASE8-3 must include a deterministic lifecycle risk rule matrix with priority `blocked > human-required > full > compact > direct`.
- PHASE8-3 must include policy version, input refs, signal refs, input hash, confidence, and reasons in risk decision output.
- PHASE8-3 tests must cover docs-only, source-boundary, public API, runtime-state, generated AI entry, security-sensitive, external unknown, unknown impact, and missing acceptance scenarios.

### State-machine and workflow reliability requirements

- PHASE8-6 must define legal transition tables for stage runs and workflow handoffs before any enforcement.
- PHASE8-8 must define legal transition tables for work units and subagent dispatch records.
- PHASE8-6, PHASE8-7, PHASE8-8, and PHASE8-10 must reject illegal transitions with structured contract issues.
- Late non-blocking subagent results may append diagnostics/evidence refs but must not retroactively mutate a passed gate.
- Rejected handoffs, failed work units, and blocked stages must preserve recovery context and unblock requirements.

### Unified evidence requirements

- PHASE8-5 must model `commandStatus`, `evidenceCoverage`, and `policyJudgment` separately while returning one `/sdd:test` result.
- PHASE8-5 PASS requires successful required commands plus complete non-stale evidence coverage for relevant acceptance refs.
- PHASE8-5 BLOCKED must report missing commands, stale evidence, missing AC mapping, or policy requirements that cannot be judged.

### Context and performance requirements

- PHASE8-9 must compute context load from explicit signals: file count, artifact/log size, dependency fanout, unknown impact, stale evidence, and source impact confidence.
- PHASE8-9 must define thresholds for `normal`, `elevated`, `high`, and `overloaded` and map them to inline, summarize, dispatch-subagent, or block-for-curation outcomes.
- PHASE8-9 must avoid repeated full scans when input hashes prove inputs unchanged.

### Phase 9 code graph handoff requirements

- PHASE8-11 must document code graph as Phase 9 scope, including expected changed refs, exported/public API refs, reverse import fanout, impacted tests, confidence, reasons, and cache invalidation inputs.
- PHASE8-11 must confirm Phase 8 gates are absent-safe when graph signals are missing.
- Code graph providers, caches, projections, and graph-consuming gates must not be implemented in Phase 8.

### LLM boundary requirements

- PHASE8-1 and PHASE8-8 must define model-produced artifact authority: `stage-owned`, `candidate`, or `non-authoritative`.
- Model-produced summaries, diagnostics, test suggestions, and evidence candidates must be consumed through refs and runtime policy checks.
- Subagent results must not become final risk decisions, stage-completion authority, or ship-gate PASS authority by default.
- Test-writer subagents may write only under explicit test path policy.

### Validation additions

Each affected task should add focused tests for the hardening rule it implements. PHASE8-12 must include a final review confirming projection envelope, stale detection, risk matrix, state transitions, evidence judgment, context scoring, Phase 9 graph handoff, and LLM boundary behavior are covered by tests or documented blockers.
