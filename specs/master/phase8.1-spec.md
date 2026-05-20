# Phase 8.1 Spec — Verifies-Centered Lifecycle and Agent-Team Separation

## Goal

Make the Phase 8 coding runtime match real `/sdd` usage after focused validation: lifecycle decisions must explicitly include `verifies` and `goal-verify` when SDD-controlled work needs them, `/sdd:test` must advance the verifies contract before command execution, and authoritative lifecycle roles must stay separated across tasks, verifies, implementation, goal verification, sync-back, and ship.

## Workflow taxonomy

| Workflow | Entry condition | Lifecycle | Notes |
|---|---|---|---|
| direct-simple | Low-risk work outside SDD task/run closure, including small frontend page/style/text changes | `do -> test` | No formal `verify.md`; use the smallest real validation such as page check, lint, typecheck, or targeted test. |
| direct-sdd | Low-risk task in SDD docs/run closure | `verifies-lite -> do/test -> goal-verify-lite -> sync-back` | `/sdd:test` may create missing `verify.md` lazily. |
| compact | Bounded coding work with known acceptance and validation | `tasks -> verifies -> do -> test -> goal-verify -> sync-back` | No new spec/plan unless gaps require them. |
| full | Source/runtime/security/schema/workflow changes or high-risk work | `spec -> plan -> tasks -> verifies -> do -> test -> goal-verify -> sync-back` | Human approval/review may be required before route, execution, or sync-back. |
| research | External or low-confidence impact | `spec/research -> plan -> verifies-draft` | Does not authorize implementation until uncertainty is resolved. |
| blocked | Missing intent, acceptance, validation, approval, or hard gate | stop at blocker | Must report next action; do not fabricate evidence. |

## `/sdd` consistency requirements

- `/sdd:test` is the user-facing path for verifies + command execution + acceptance evidence judgment.
- Low-level `sdd verifies` and `sdd verify task` remain diagnostic/compatibility tools.
- For SDD-controlled work, `verify.md` is generated after `tasks.md` is ready and before `do/test`; if missing or stale, `/sdd:test` must advance or refresh it before running commands.
- If verifies cannot pass, `/sdd:test` stops at a verifies blocker and must not run validation commands as if the contract were valid.
- A PASS from `/sdd:test` should point to sync-back inspection, not ask the user to run a separate verify command.

## Agent-team authority rules

- `task-planner` owns task generation.
- `verification-designer` owns `verify.md` and must differ from task planning and implementation authority.
- `implementer` owns production changes but must not authoritatively verify its own work.
- `evidence-runner` may execute validation commands and collect output.
- `goal-verifier` judges whether evidence proves acceptance and must differ from implementer authority.
- `workflow-gate` remains parent/main workflow authority for sync-back and ship.
- Subagents may research, scan, collect side evidence, or summarize context, but cannot close lifecycle gates, own sync-back, own ship, or bypass approvals.

## Acceptance criteria

- AC-1: Lifecycle risk profiles keep direct as `do/test` and include `verifies` plus `goal-verify` for compact/full SDD-controlled workflows.
- AC-2: Blocked lifecycle decisions include `goal-verify` in blocked stages.
- AC-3: Legacy lifecycle compatibility mapping adds current required stages for the selected profile so old full decisions do not omit `verifies` or `goal-verify`.
- AC-4: Generated `verify.md` declares `author_role: verification-designer` and `independent_from_roles: task-planner, implementer`.
- AC-5: `inspectVerifyContract` warns when author role or independence metadata is missing or wrong.
- AC-6: `/sdd:test` creates a missing verify contract before executing commands.
- AC-7: `/sdd:test` refreshes stale or warn verify contracts when safe, then re-inspects before continuing.
- AC-8: `/sdd:test` blocks before command execution when verifies remains BLOCKED.
- AC-9: Test/runtime output records whether verifies was `none`, `created`, `refreshed`, or `blocked`.
- AC-10: Real installed-project validation covers user scenarios, not just command success: missing verify, stale verify, independent role metadata, direct low-risk test path, high-risk route blocker, sync-back task scope, and branch-level ship blocking.

## Out of scope

- Do not project `/sdd:verifies` as a primary user-facing slash lifecycle entry.
- Do not remove low-level verify diagnostics.
- Do not implement a broad agent marketplace.
- Do not let subagents write production code or own final gates.
- Do not change branch/global ship semantics while fixing task-scoped sync-back behavior.
