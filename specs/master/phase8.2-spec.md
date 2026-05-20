# Phase 8.2 Spec — Risk Workflow Enforcement and Human-Readable Gates

## Goal

Phase 8.2 turns the Phase 8.1 full risk matrix findings into an enforceable, user-readable workflow model. The platform must decide the shortest safe lifecycle from requirement/task risk, enforce the correct pre-execution or pre-sync-back gate, and explain blocked states in concise human language without exposing internal router/profile/team-mode details by default.

This phase does not start the code knowledge graph work. It is a workflow correctness and interaction-hardening slice required before graph-driven automation can safely consume lifecycle decisions.

## Problem basis

Phase 8.1 representative validation passed, but the full installed-project risk workflow matrix exposed gaps that were not visible in the smaller gate:

- Security, token/secret, external unknown, and unknown risks block before route/test execution.
- Source boundary, runtime state, API/schema, database/data-loss, state/concurrency, and CI/build risks are recognized as risky enough for `hyperplan` and sync-back confirmation, but still allow `/sdd:test` command execution before approval/review.
- Allowed-but-risky route JSON hides lifecycle profile, approval policy, and required stages behind `recommendedProfile: implementer` and team-mode details.
- Task-level `external-unknown` and requirement-level low-confidence external impact use different semantics: approval-blocked full workflow versus research-before-implementation.
- Unknown/blocked work currently tells the user to approve risk when the safer next action is usually to clarify intent, acceptance, validation, or impact.

## Risk taxonomy calibration

Phase 8.2 must start with a short calibration checkpoint before implementation. The checkpoint is recorded in `phase8.2-risk-taxonomy-research.md` and is binding for this phase unless implementation validation proves a policy exception is needed.

Calibration conclusions:

- Normalize risk synonyms before lifecycle gate decisions: `api` -> `api-schema`, `build` -> `ci-build`, `data_loss` -> `data-loss`, and ambiguous `external` -> `external-unknown` only when impact is unknown.
- Keep detailed risk families through gate selection; do not collapse database, security, token/secret, schema, state/concurrency, CI/release, and runtime-state into a generic workflow risk before deciding pre-test behavior.
- Use preview/review/apply separation as the interaction model: safe validation can run, risky mutation or high-impact automation needs review/approval, unknown impact needs research/clarification.
- Multiple risk signals use strictest-gate precedence.

## Target workflow gates

| Gate class | Default lifecycle | Pre-test behavior | Sync-back behavior | Human output intent |
|---|---|---|---|---|
| direct | `do -> test` or `verifies-lite -> do/test -> goal-verify-lite -> sync-back` | commands may run | direct apply may be allowed after PASS | tell the user it is safe to validate now |
| review-before-sync-back | compact SDD path | commands may run after verifies PASS | confirmation/review required before applying task status | tell the user validation can proceed but apply is gated |
| review-before-test | compact/full path | commands do not run until review checkpoint is satisfied | confirmation remains required if evidence changes task state | tell the user review is needed before validation commands |
| approval-before-test | full/high-risk path | commands do not run without explicit human approval | sync-back remains gated | tell the user approval is required before automation continues |
| research-before-implementation | research path | implementation/test commands do not run | no implementation sync-back | tell the user to resolve uncertainty first |
| clarify-before-routing | blocked path | no route/test execution | no sync-back | tell the user which missing intent/acceptance/validation/impact data blocks routing |
| verify-contract-blocked | SDD test path | commands do not run | no sync-back | tell the user `verify.md` must be fixed/refreshed first |

## Risk matrix policy

Phase 8.2 must make the current taxonomy explicit. The policy may be encoded in lifecycle/risk modules, but its user-visible behavior must be stable:

| Risk family | Expected default gate |
|---|---|
| Direct low-risk docs/frontend-safe task | direct |
| Validation/evidence-only | review-before-sync-back |
| Token/context budget | review-before-sync-back |
| Context budget | review-before-sync-back |
| Performance | review-before-sync-back unless source/runtime impact escalates |
| Source boundary | review-before-test or approval-before-test, not silent direct execution |
| Runtime state boundary | review-before-test or approval-before-test |
| API/schema contract | review-before-test or approval-before-test |
| Database/data-loss | approval-before-test |
| State/concurrency | review-before-test or approval-before-test |
| CI/build/release | review-before-test or approval-before-test |
| Security | approval-before-test |
| Token/secret | approval-before-test |
| External unknown | research-before-implementation or approval-before-test, explicitly documented |
| Unknown/blocked | clarify-before-routing |

The implementation must not treat all non-direct risks the same. Risk classes should produce different gates when their blast radius, reversibility, or uncertainty differs.

## `/sdd` command consistency requirements

- `sdd tasks route` must expose lifecycle gate, approval policy, required stages, and next safe action in JSON for every route decision, not only blocked decisions.
- Default route text must describe workflow gate semantics, not internal execution profiles.
- `/sdd:test` must honor the same lifecycle gate as route. If a task is approval-before-test, review-before-test, research-before-implementation, clarify-before-routing, or verify-contract-blocked, it must not run validation commands.
- `/sdd:test` may continue to create/refresh `verify.md` before checking command execution gates when that helps produce a precise verifies blocker.
- `sync-back inspect` must remain task-scoped for apply readiness while preserving branch/global lifecycle diagnostics as context.
- `sdd ship --dry-run` remains branch/global conservative and may block on any unresolved high-risk or stale lifecycle state.

## Human-readable output model

Default terminal output should be compact and product-like:

```text
SDD test <task>

<result sentence>

Why:
- <one main actionable reason>

Next:
- <one concrete next step>
```

Rules:

- Default output shows one primary reason and one next action.
- Internal terms such as `implementer`, `review-lite`, `hyperplan`, lifecycle projection keys, and runtime table names are hidden by default.
- `--verbose` may show secondary reasons, lifecycle profile, approval policy, required stages, and diagnostic scope.
- `--json` must keep full machine-readable fields for automation and validation.
- Blocked output must always answer why it blocked and what to do next.

## Agent and subagent boundary

- Main workflow authority owns lifecycle gate decisions, sync-back apply decisions, and ship decisions.
- `task-planner`, `verification-designer`, `implementer`, `evidence-runner`, `goal-verifier`, reviewer, and workflow-gate roles remain separated by authority.
- Subagents may research risk, collect side evidence, inspect files, summarize logs, or produce advisory reports.
- Subagents must not close lifecycle gates, approve high-risk execution, own authoritative goal verification, apply sync-back, or ship.
- Dynamic agent/team mode may change after risk/lifecycle changes, but the user-facing workflow gate must remain stable and explainable.

## Acceptance criteria

- AC-0: `phase8.2-risk-taxonomy-research.md` records internal taxonomy alignment, external CLI precedents, canonical risk families, synonym normalization, and gate precedence before implementation starts.
- AC-1: Every current risk family in the Phase 8.1 matrix maps to an explicit lifecycle gate.
- AC-2: `/sdd:test` blocks before command execution for all risk families configured as review-before-test, approval-before-test, research-before-implementation, clarify-before-routing, or verify-contract-blocked.
- AC-3: Direct low-risk tasks still run through the lightweight path and can reach direct sync-back readiness without unrelated branch/global high-risk tasks blocking the task apply decision.
- AC-4: Allowed-but-risky route/test JSON includes lifecycle gate, lifecycle profile, approval policy, required stages, primary reason, and next action.
- AC-5: Default terminal output for route, test, sync-back, ship, lifecycle decide, and doctor gate states uses the concise `result / Why / Next` model.
- AC-6: `--verbose` and `--json` preserve detailed diagnostics needed for debugging and automation.
- AC-7: External unknown and unknown/blocked semantics are explicit and do not both collapse to generic approval wording.
- AC-8: Real installed-project validation reruns the full risk matrix and produces an analyzable report comparing expected and observed route/test/sync-back/ship behavior.
- AC-9: Real validation includes agent/subagent authority checks for high-risk, research, verifies, goal-verify, and sync-back boundaries.

## Out of scope

- Do not implement code graph indexing in this phase.
- Do not change branch/global ship conservatism.
- Do not add a new primary slash command for verifies or lifecycle approval unless the implementation proves an existing command cannot express the workflow.
- Do not introduce broad orchestration facades or rewrite runtime storage.
- Do not make every non-direct task require full workflow; the policy must preserve compact and direct paths where safe.
