# Tasks — Phase 7 E2E Hardening Boundary Validation

## PHASE7E2EH-1 — Validate high-risk routing and evidence semantics boundaries

```sdd-task
id: PHASE7E2EH-1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/phase7-e2e-hardening/spec.md
  - specs/phase7-e2e-hardening/plan.md
  - specs/phase7-e2e-hardening/tasks.md
  - specs/phase7-e2e-hardening/verify.md
  - specs/phase7-e2e-hardening/release.md
  - packages/cli/src/commands/dispatch.ts
  - packages/core/src/verification/test-runtime.ts
  - packages/core/src/router/route-sdd-task.ts
acceptance_refs:
  - AC-1
  - AC-2
  - AC-3
  - AC-4
  - AC-5
  - AC-6
  - AC-7
  - AC-8
validation:
  - node --eval "console.log('hardening-narrow-check')"
risk:
  - high-risk
  - platform-runtime
  - source-boundary
  - evidence-semantics
  - multi-agent-review
```

#### Boundary

Use the current project and current CLI to validate uncovered Phase 7 hardening behavior. This case is shaped like a high-risk platform task but must not change platform source behavior, publish, push, tag, deploy, or create external release state.

#### Acceptance

- AC-1: Explicit `phase7-e2e-hardening` partition resolves without fallback to `master`.
- AC-2: The spec/plan/tasks/verify document chain exists and is hash-tracked.
- AC-3: Task routing reports deterministic route evidence and a clear team-mode activation or downgrade reason.
- AC-4: `sdd do task` records implementation, review, and validation artifacts for a real run.
- AC-5: `sdd test task` records real local command execution evidence from a deliberately narrow command.
- AC-6: `sdd verify task` reports acceptance coverage and exposes whether narrow evidence over-claims unrelated ACs.
- AC-7: `sdd sync-back inspect` renders the approval card contract and local sync-back apply succeeds.
- AC-8: `sdd statusline`, `sdd doctor fast`, `sdd ship --dry-run`, and `sdd ship` report current readiness.

## Evidence links

To be filled by the workflow run.

#### Implementation Notes

- Sync-back applied from run `20260516-007` (2026-05-16T01:54:50.843Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE7E2EH-1.md`, `artifacts/validation-PHASE7E2EH-1.md`, `artifacts/acceptance-coverage-PHASE7E2EH-1.md`.
