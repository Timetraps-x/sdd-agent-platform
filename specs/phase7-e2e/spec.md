# Spec — Phase 7 E2E Workflow Validation

## Goal

Validate the latest Phase 7 workflow implementation against a real project case using the current repository and current `sdd` CLI projection.

## Scope

- Use an explicit workflow partition: `phase7-e2e`.
- Exercise the full lifecycle from status/spec/plan/tasks/verify through route/do/test/verify/sync-back/statusline/doctor/ship.
- Use real local commands and runtime evidence from this project.
- Keep the case local and non-release-producing except for branch-scoped SDD artifacts.

## Non-goals

- Do not publish, push, tag, deploy, or create external release state.
- Do not change production source behavior for this validation-only case.
- Do not treat `doctor deep` historical debt as a current-run blocker.

## Acceptance criteria

- AC-1: `sdd status --branch phase7-e2e` resolves the explicit partition and does not silently fall back to `master`.
- AC-2: The document chain contains spec, plan, tasks, and verify contracts for `phase7-e2e`.
- AC-3: `sdd tasks route PHASE7E2E-1 --branch phase7-e2e` returns deterministic route evidence.
- AC-4: `sdd do task PHASE7E2E-1` records implementation, review, and validation artifacts for a real run.
- AC-5: `sdd test task PHASE7E2E-1` records command execution evidence for a real local command.
- AC-6: `sdd verify task PHASE7E2E-1` reports acceptance coverage from collected evidence.
- AC-7: `sdd sync-back inspect --task PHASE7E2E-1 --branch phase7-e2e` renders the approval card contract.
- AC-8: `sdd statusline`, `sdd doctor fast`, and `sdd ship --dry-run` report current workflow readiness for `phase7-e2e`.

## Risks and gates

- Generated AI entry drift must be checked with `sdd update --check`.
- Full project tests are not required for this validation-only case, but the workflow must run at least one real local command through `sdd test task`.
- Any sync-back apply step must remain local to `specs/phase7-e2e/tasks.md`.
