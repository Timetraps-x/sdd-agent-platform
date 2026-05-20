# Phase 7.9 Spec — Workflow Semantics, Risk, Context and Token Runtime Hardening

## Goal

Harden Phase 7 so workflow completion is semantically trustworthy: commands have predictable side-effect boundaries, risk decisions are consistent, run/artifact scopes are explicit, evidence only proves mapped acceptance criteria, context budgets are enforced, and token pressure is projected instead of remaining unknown.

## In scope

- Add a command lifecycle boundary for help/preflight/validation before side-effect execution.
- Introduce a unified task risk profile consumed by router, team-mode, sync-back, doctor, statusline, and ship.
- Normalize scoped run creation and artifact template scope resolution.
- Replace blanket test-to-acceptance PASS mapping with explicit evidence coverage mapping.
- Separate planned validation commands from executed runtime commands in verification output.
- Add shell-safe test command execution inputs for Windows/PowerShell and cross-platform use.
- Improve sync-back consistency by detecting stale verify contracts and optionally refreshing them.
- Upgrade context budget from declaration to enforced runtime projection.
- Add token estimate and token pressure runtime projections.
- Generate role-scoped context packages for implementer/reviewer/validator/context-curator/team roles.
- Make plan-stage performance/context/token checks first-class workflow outputs.
- Expand E2E coverage to include negative/partial evidence, high-risk routing, scoped run/artifact, side-effect-free help, token pressure, and sync-back refresh scenarios.

## Out of scope

- Do not implement Phase 8 code graph intelligence in Phase 7.9.
- Do not publish, push, tag, deploy, or mutate remote/shared release state.
- Do not make context summaries authoritative PASS evidence.
- Do not hide failed/partial evidence behind a final PASS.
- Do not restore root `@sdd-agent-platform/core` imports or CLI imports into `packages/core/src`.
- Do not replace SQLite runtime storage; extend existing Runtime Storage v2 projections instead.

## Acceptance criteria

- AC-1: Help and preflight for side-effect commands are side-effect-free and regression-tested.
- AC-2: Router/team-mode/sync-back/doctor/ship consume the same task risk profile; high-risk source-boundary tasks are not described as low-risk.
- AC-3: `sdd run create --branch <branch> --task <task>` creates a scoped run or fails explicitly; `artifact template --run <run>` infers scoped run paths and rejects ambiguous/unscoped writes by default.
- AC-4: `sdd test task` only emits PASS/FAIL evidence for explicitly mapped acceptance refs; unmapped commands create command evidence without AC PASS.
- AC-5: `sdd verify task` reports planned validation commands and executed commands separately, selects strongest policy-backed evidence, and surfaces unproven/partial coverage.
- AC-6: Test command execution supports shell-safe input (`--` passthrough, command JSON, or command file) and preserves executed argv in test indexes.
- AC-7: `sdd sync-back apply` detects stale verify contracts and either prints an exact recovery command or refreshes verify with an explicit option.
- AC-8: Context budget enforcement records included, deferred, excluded, and truncated refs/summaries per profile and keeps context package output within budget.
- AC-9: Token estimate runtime projections drive `tokenHealth` away from `unknown` when context packages or team plans exist.
- AC-10: Role-scoped context packages provide different must-read/deferred materials for implementer, reviewer, validator, and context-curator roles without becoming PASS evidence.
- AC-11: Plan/tasks routing emits performance/context/token risk notes for tasks with relevant risk signals or large context footprints.
- AC-12: E2E matrix covers low-risk full chain, readiness full chain, high-risk route consistency, partial acceptance coverage, help side-effect-free behavior, scoped run/artifact behavior, shell-safe command execution, sync-back refresh, and token/context pressure projection.
- AC-13: Build, typecheck, full tests, package dry-run, CLI boundary grep, SDD update check, doctor fast, and Phase 7.9 E2E smokes pass.

## Public contracts

### Command lifecycle

Commands that can write runtime state, artifacts, docs, release documents, or sync-back changes must process help and preflight before side effects.

### Task risk profile

A derived risk profile must include risk level, file classes, source/runtime boundaries, validation-only/docs-only signals, team recommendation, approval recommendation, and reasons.

### Evidence coverage

Validation commands must declare acceptance refs to produce AC-level PASS/FAIL. Command execution without mapping remains supporting evidence only.

### Context/token runtime

Context packages must expose budget, included/deferred/excluded material, estimated bytes/tokens, and pressure. Token estimates are advisory but must be persisted as runtime projections.

## Expected behavior

- A high-risk source-boundary task may still run manually with artifacts, but route output must not call it low-risk.
- A passing `npm --version` command must not prove unrelated ACs.
- sync-back can complete while verify refresh fails, but the user must receive precise recovery guidance.
- Context/token projections guide routing and statusline health but cannot replace validation evidence.
