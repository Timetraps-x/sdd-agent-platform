# Phase 8.2 Risk Taxonomy Research — Calibration Checkpoint

## Status

COMPLETE — this is a calibration checkpoint for Phase 8.2 implementation, not a new standalone phase.

## Purpose

Phase 8.2 needs a stable risk taxonomy before implementing lifecycle gates. The goal is not to invent a large new model, but to align existing project risk sources, current runtime behavior, and external CLI workflow precedents into one explicit gate policy.

## Internal findings

Current risk signals are split across several layers:

| Layer | Current role | Calibration issue |
|---|---|---|
| `sdd-task risk:` tags | User/task-declared risk metadata parsed from task docs | Tags are flexible but not fully normalized across runtime consumers. |
| `packages/core/src/task-risk-profile.ts` | Task-level risk classification and file-derived source/runtime signals | Contains detailed families like database, data-loss, security, api-schema, ci-build, context/token/performance. |
| `packages/core/src/lifecycle/risk-signals.ts` | Requirement/text-level risk extraction | Uses partly different names such as `api`, `build`, `data_loss`, `external_unknown`. |
| `packages/core/src/lifecycle/decision-gate.ts` | Lifecycle hard-gate decision rules | Encodes high-risk categories but does not expose a compact user-facing gate vocabulary. |
| `packages/core/src/risk/kernel.ts` | Phase 8 risk profile kernel | Collapses detailed tags into broad dimensions: source, runtime-state, workflow, evidence, security, external, context, performance. |
| Router/test/sync-back/ship consumers | Apply lifecycle behavior | Some high-risk families are recognized late but not consistently blocked before test execution. |

Observed alignment gaps:

- Naming drift: `api` vs `api-schema`, `build` vs `ci-build`, `data_loss` vs `data-loss`, `external` vs `external-unknown`.
- Granularity drift: detailed task risks like database/data-loss/state/concurrency/token can collapse into broader kernel dimensions before route/test behavior.
- Gate drift: some classes become sync-back approval only even when the intended lifecycle should block before validation commands.
- Message drift: unknown/blocked work may produce approval-oriented next actions instead of clarify/research guidance.

## External workflow precedents

The relevant pattern across comparable CLIs is separation of preview/validation from apply/execution, plus stronger review for destructive or uncertain changes.

| Tool family | Useful precedent for SDD |
|---|---|
| Terraform | `plan` previews changes for review before `apply`; apply normally asks for confirmation, and automation guidance treats destructive changes as requiring review. |
| Kubernetes | `kubectl diff` previews live-vs-would-apply changes; `apply --dry-run=client/server` separates validation from actual mutation. |
| Liquibase | `update-sql` shows SQL that would run before schema mutation; update commands are treated as database-changing operations that benefit from pre-review. |
| OpenAPI Generator | `validate` and `generate --dry-run` separate spec validation / generation preview from real output changes. |

SDD should follow the same shape:

- Direct/safe work can validate and proceed.
- Review-only risks can run validation but must not auto-apply sync-back.
- High-impact, destructive, or contract-changing risks should preview/route/review before validation commands or implementation automation.
- Unknown impact should become research/clarify, not generic approval.

## Calibrated gate vocabulary

Phase 8.2 should implement one user-facing gate vocabulary:

| Gate | Meaning |
|---|---|
| `direct` | Validation commands may run; sync-back may be direct after PASS. |
| `review-before-sync-back` | Validation may run, but applying task state requires review/confirmation. |
| `review-before-test` | Validation/automation commands should not run until review checkpoint is satisfied. |
| `approval-before-test` | Human approval is required before route/test automation continues. |
| `research-before-implementation` | Uncertainty must be reduced before implementation or validation commands. |
| `clarify-before-routing` | Missing intent/acceptance/validation/impact blocks routing. |
| `verify-contract-blocked` | `/sdd:test` cannot run commands because `verify.md` is missing, invalid, or unrefreshable. |

## Calibrated risk mapping

| Risk family | Canonical tags/signals | Default gate | Notes |
|---|---|---|---|
| Direct low-risk | no strict risk; docs/frontend-safe affected files | direct | Preserve lightweight direct path. |
| Validation/evidence-only | `validation-only`, evidence-only work | review-before-sync-back | Safe to validate; do not silently apply if evidence changes state. |
| Context budget | `context-risk`, `context-budget` | review-before-sync-back | Usually not destructive; review before applying status/evidence. |
| Token/context budget | `token-risk` without secret material | review-before-sync-back | Must stay distinct from token/secret exposure. |
| Performance/cost | `performance`, `latency`, `cost` | review-before-sync-back | Escalate if paired with source/runtime/schema/database risk. |
| Source boundary | source affected files, `source-boundary` | review-before-test | Escalate to approval-before-test if paired with security/data-loss/schema. |
| Runtime state | `.sdd` runtime state, `platform-runtime`, runtime projection files | review-before-test | Avoid commands that mutate/validate against unsafe runtime assumptions before review. |
| API/schema contract | `api-schema`, `api`, public contract files | review-before-test | Approval may be required for breaking or external contracts. |
| Database/data-loss | `database`, `sql`, `data-loss`, `data_loss` | approval-before-test | Destructive or persistent data risks require approval before automation. |
| State/concurrency | `state-machine`, `concurrency`, liveness | review-before-test | Escalate to approval when migration/release/data-loss is involved. |
| CI/build/release | `ci-build`, `build`, dependency/release workflow | review-before-test | Approval required for publish/release/deploy actions. |
| Security | `security`, auth/session/permission changes | approval-before-test | Must block before automated execution. |
| Token/secret | `token`, secret/credential material | approval-before-test | Distinct from token budget/context risk. |
| External unknown | `external-unknown`, low impact confidence | research-before-implementation | Can become approval-before-test only after research clarifies impact. |
| Unknown/blocked | `unknown`, unclear intent/acceptance/validation | clarify-before-routing | Do not ask for approval when the actual blocker is unclear requirements. |

## Gate precedence

When multiple risk signals are present, choose the strictest applicable gate:

```text
verify-contract-blocked
clarify-before-routing
research-before-implementation
approval-before-test
review-before-test
review-before-sync-back
direct
```

Precedence rules:

- `verify-contract-blocked` is test-scoped and should not hide route lifecycle details.
- `unknown` beats approval because approving unclear work is not meaningful.
- `external-unknown` beats approval until research resolves impact confidence.
- `database`, `data-loss`, `security`, and token/secret risks force approval-before-test.
- Medium risks such as performance/context/validation-only escalate when combined with stricter affected-file or tag signals.

## Implementation guidance

- Normalize synonyms at the boundary: `api` -> `api-schema`, `build` -> `ci-build`, `data_loss` -> `data-loss`, `external` only when it means `external-unknown`.
- Keep raw tags in JSON/verbose diagnostics, but compute one canonical risk family list for lifecycle gates.
- Do not collapse database/state/schema/security/token into generic `workflow` before deciding pre-test behavior.
- Route and `/sdd:test` must call the same gate mapping or share the same derived decision object.
- Default terminal output should name the gate effect, not internal implementation profile.

## Sources

- Internal: Phase 8.1 risk workflow matrix report, current Phase 8.2 planning docs, risk/task/lifecycle modules in `packages/core/src`.
- External: Terraform plan/apply workflow, Kubernetes diff/apply dry-run, Liquibase update-sql/update workflow, OpenAPI Generator validate/generate dry-run.
