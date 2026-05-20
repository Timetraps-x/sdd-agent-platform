# Spec — Phase 7 E2E Hardening Boundary Validation

## Goal

Validate previously uncovered Phase 7 behavior with a real current-repository case focused on high-risk routing/team boundary signals, scoped runtime state, and evidence semantics.

## Scope

- Use an explicit workflow partition: `phase7-e2e-hardening`.
- Exercise status/spec/plan/tasks/verify through route/do/test/verify/sync-back/statusline/doctor/ship.
- Use a task shaped like a high-risk platform hardening change while keeping actual effects local to SDD validation artifacts.
- Capture whether team-mode activates or safely downgrades with policy-backed evidence.
- Capture whether a narrowly scoped test command can over-claim acceptance coverage.

## Non-goals

- Do not modify platform source behavior in this validation case.
- Do not publish, push, tag, deploy, or create external release state.
- Do not treat this case as a substitute for implementing the hardening fixes it discovers.

## Acceptance criteria

- AC-1: `sdd status --branch phase7-e2e-hardening` resolves the explicit partition and does not silently fall back to `master`.
- AC-2: The spec/plan/tasks/verify document chain exists and is hash-tracked for `phase7-e2e-hardening`.
- AC-3: `sdd tasks route PHASE7E2EH-1 --branch phase7-e2e-hardening` reports deterministic route evidence and an explicit team-mode activation or downgrade reason.
- AC-4: `sdd do task PHASE7E2EH-1` records implementation, review, and validation artifacts for a real run.
- AC-5: `sdd test task PHASE7E2EH-1` records command execution evidence from a deliberately narrow command so evidence coverage semantics can be inspected.
- AC-6: `sdd verify task PHASE7E2EH-1` reports acceptance coverage and exposes whether narrow evidence is allowed to cover unrelated ACs.
- AC-7: `sdd sync-back inspect` renders the approval card contract and local sync-back apply succeeds with explicit approval.
- AC-8: `sdd statusline`, `sdd doctor fast`, `sdd ship --dry-run`, and `sdd ship` report readiness after sync-back and verify refresh.

## Risks and gates

- Generated AI entry drift must be checked with `sdd update --check`.
- Any source-level hardening issue discovered here must be reported separately rather than fixed inside this validation-only case.
- Any sync-back apply step must remain local to `specs/phase7-e2e-hardening/tasks.md`.
