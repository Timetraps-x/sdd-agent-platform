# Phase 7.9 Tasks — Workflow Semantics, Risk, Context and Token Runtime Hardening

## Task list

| Task | Status | Acceptance refs | Notes |
|---|---|---|---|
| PHASE7.9-1 | completed | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13 | Created Phase 7.9 research/spec/plan/tasks/validation docs and marked the phase active. |
| PHASE7.9-2 | completed | AC-1 | Added CLI help/preflight gates before side-effect command handlers for `do task`, `test task`, `run create`, `run index rebuild`, `run archive`, `artifact template`, `artifact ingest`, `sync-back apply`, and `ship`; added regression coverage proving help/preflight do not create runs, artifacts, sync-back changes, or release docs. |
| PHASE7.9-3 | completed | AC-2, AC-11 | Added shared `TaskRiskProfile` classification and wired router/team-mode/sync-back/doctor/statusline/ship/planning/worktree surfaces to consistent source-boundary, context, token, performance, security, and external risk semantics. |
| PHASE7.9-4 | completed | AC-3 | Added scoped `createRun` branch/task binding, CLI `run create --branch --task`, artifact template run-scope guards for unscoped and branch/task mismatch writes, and doctor artifact-scope diagnostics. |
| PHASE7.9-5 | completed | AC-4 | Added explicit `validation` command acceptance mapping (`command => AC-*`), changed legacy unmapped commands to command evidence only, and covered unmapped PASS commands staying unproven in verify. |
| PHASE7.9-6 | completed | AC-5 | Added planned vs executed command reporting in verify results/artifacts, selected strongest policy-backed PASS evidence over weak PASS claims, and surfaced missing/referenced/unproven coverage as gaps. |
| PHASE7.9-7 | completed | AC-6 | Added shell-safe `sdd test task -- <argv>` plus `--command-json`/`--command-file` inputs, executed argv/shell recording in test steps, indexes, output artifacts, and invocation ledger metadata. |
| PHASE7.9-8 | completed | AC-7 | Added sync-back stale verify contract blocking with exact recovery command output and explicit `--refresh-verify` safe refresh before apply. |
| PHASE7.9-9 | completed | AC-8, AC-9 | Added context package budget accounting and output trimming, runtime token projections from context/team decisions, and token health integration for statusline, doctor, and ship readiness. |
| PHASE7.9-10 | completed | AC-10, AC-11 | Added role-scoped context packages for implementer/reviewer/validator/context-curator and token-aware team runtime trimming of optional roles/material packs under context pressure. |
| PHASE7.9-11 | completed | AC-12, AC-13 | Expanded the E2E scenario matrix, ran final validation gates and SDD smokes, documented evidence, and closed Phase 7.9. |

## Acceptance criteria

- AC-1: Help and preflight for side-effect commands are side-effect-free and regression-tested.
- AC-2: Router/team-mode/sync-back/doctor/ship consume the same task risk profile; high-risk source-boundary tasks are not described as low-risk.
- AC-3: `sdd run create --branch <branch> --task <task>` creates a scoped run or fails explicitly; `artifact template --run <run>` infers scoped run paths and rejects ambiguous/unscoped writes by default.
- AC-4: `sdd test task` only emits PASS/FAIL evidence for explicitly mapped acceptance refs; unmapped commands create command evidence without AC PASS.
- AC-5: `sdd verify task` reports planned validation commands and executed commands separately, selects strongest policy-backed evidence, and surfaces unproven/partial coverage.
- AC-6: Test command execution supports shell-safe input and preserves executed argv in test indexes.
- AC-7: `sdd sync-back apply` detects stale verify contracts and either prints an exact recovery command or refreshes verify with an explicit option.
- AC-8: Context budget enforcement records included, deferred, excluded, and truncated refs/summaries per profile and keeps context package output within budget.
- AC-9: Token estimate runtime projections drive `tokenHealth` away from `unknown` when context packages or team plans exist.
- AC-10: Role-scoped context packages provide different materials for implementer, reviewer, validator, and context-curator roles without becoming PASS evidence.
- AC-11: Plan/tasks routing emits performance/context/token risk notes for tasks with relevant risk signals or large context footprints.
- AC-12: E2E matrix covers low-risk full chain, readiness full chain, high-risk route consistency, partial acceptance coverage, help side-effect-free behavior, scoped run/artifact behavior, shell-safe command execution, sync-back refresh, and token/context pressure projection.
- AC-13: Build, typecheck, full tests, package dry-run, CLI boundary grep, SDD update check, doctor fast, and Phase 7.9 E2E smokes pass.

## Evidence links

- PHASE7.9-2 / AC-1: `packages/cli/src/options.ts`, `packages/cli/src/commands/verify.ts`, `packages/cli/src/commands/test.ts`, `packages/cli/src/commands/run.ts`, `packages/cli/src/commands/artifact.ts`, `packages/cli/src/commands/sync-back.ts`, `packages/cli/src/commands/ship.ts`, and `packages/cli/src/commands/cli-regression.test.ts` implement and test side-effect-free help/preflight behavior.
- PHASE7.9-3 / AC-2, AC-11: `packages/core/src/task-risk-profile.ts`, router/team-mode risk policy, sync-back inspect policy, doctor document-chain checks, planning task graph risk notes, project status/statusline/ship risk summaries, worktree isolation, and focused regression tests share the same task risk profile semantics.
- PHASE7.9-4 / AC-3: `packages/core/src/run-state/run-state.ts`, `packages/cli/src/commands/run.ts`, `packages/cli/src/commands/artifact.ts`, `packages/core/src/doctor/checks/run-evidence.ts`, and focused regression tests implement scoped run creation plus artifact unscoped/mismatch safeguards.
- PHASE7.9-5 / AC-4: `packages/core/src/sdd-docs/task-parser.ts`, `packages/core/src/verification/test-runtime.ts`, parser tests, and test-runtime/goal-verify regressions implement explicit validation command-to-acceptance mapping and prevent unmapped commands from creating AC PASS/FAIL evidence.
- PHASE7.9-6 / AC-5: `packages/core/src/verification/goal-verify.ts`, `packages/core/src/verification/rendering.ts`, `packages/core/src/verification/goal-verify.test.ts`, and `packages/core/src/verification/test-runtime.test.ts` separate planned/executed commands, choose strongest policy-backed evidence, and preserve partial/unproven coverage gaps.
- PHASE7.9-7 / AC-6: `packages/core/src/verification/test-runtime.ts`, `packages/cli/src/commands/test.ts`, `packages/core/src/verification/test-runtime.test.ts`, and `packages/cli/src/commands/cli-regression.test.ts` implement shell-safe argv execution and preserve executed argv in runtime evidence.
- PHASE7.9-8 / AC-7: `packages/core/src/sync-back/inspect.ts`, `packages/core/src/sync-back/apply.ts`, `packages/cli/src/commands/sync-back.ts`, `packages/cli/src/renderers/workflow.ts`, and `packages/core/src/sync-back/sync-back.test.ts` detect stale verify contracts, emit recovery commands, and support explicit safe verify refresh.
- PHASE7.9-9 / AC-8, AC-9: `packages/core/src/context/build-package.ts`, `packages/core/src/status/project-status.ts`, `packages/core/src/registries/command-team-runtime.ts`, `packages/core/src/doctor/doctor.ts`, `packages/core/src/lifecycle/ship.ts`, `packages/cli/src/renderers/context.ts`, and focused tests enforce context budgets, persist token projections, and surface token health in runtime/status outputs.
- PHASE7.9-10 / AC-10, AC-11: `packages/core/src/context/build-package.ts`, `packages/core/src/registries/command-team-runtime.ts`, `packages/core/src/context/context-build.test.ts`, and `packages/core/src/registries/registries.test.ts` provide role-scoped context material boundaries and token-aware team runtime role/material decisions without creating PASS evidence.
- PHASE7.9-11 / AC-12, AC-13: `specs/master/phase7.9-validation.md` records the final E2E matrix plus build/typecheck/test/package/boundary/update/doctor/status/tasks/statusline/context/team/ship/sync-back smoke evidence for Phase 7.9 closeout.
