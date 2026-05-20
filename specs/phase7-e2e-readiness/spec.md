# Spec — Phase 7 E2E Readiness Workflow Validation

## Goal

Validate the latest Phase 7 workflow implementation against a second real project case focused on readiness and reporting surfaces in the current repository.

## Scope

- Use an explicit workflow partition: `phase7-e2e-readiness`.
- Exercise the full lifecycle from status/spec/plan/tasks/verify through route/do/test/verify/sync-back/statusline/doctor/ship.
- Use real local commands and runtime evidence from this project.
- Keep the case local and non-release-producing except for branch-scoped SDD artifacts.

## Non-goals

- Do not publish, push, tag, deploy, or create external release state.
- Do not change production source behavior for this validation-only case.
- Do not treat `doctor deep` historical debt as a current-run blocker.

## Acceptance criteria

- AC-1: `sdd status --branch phase7-e2e-readiness` resolves the explicit partition and does not silently fall back to `master`.
- AC-2: The document chain contains spec, plan, tasks, and verify contracts for `phase7-e2e-readiness`.
- AC-3: `sdd tasks route PHASE7E2ER-1 --branch phase7-e2e-readiness` returns deterministic route evidence.
- AC-4: `sdd do task PHASE7E2ER-1` records implementation, review, and validation artifacts for a real run.
- AC-5: `sdd test task PHASE7E2ER-1` records command execution evidence for a real readiness/reporting command in this repository.
- AC-6: `sdd verify task PHASE7E2ER-1` reports acceptance coverage from collected evidence.
- AC-7: `sdd sync-back inspect --task PHASE7E2ER-1 --branch phase7-e2e-readiness` renders the approval card contract and `sync-back apply` completes locally.
- AC-8: `sdd statusline`, `sdd doctor fast`, `sdd ship --dry-run`, and `sdd ship` report ready state for `phase7-e2e-readiness` after evidence and sync-back are complete.

## Risks and gates

- Generated AI entry drift must be checked with `sdd update --check`.
- The workflow must run at least one real local readiness/reporting command through `sdd test task`.
- Any sync-back apply step must remain local to `specs/phase7-e2e-readiness/tasks.md`.
