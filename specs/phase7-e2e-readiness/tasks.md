# Tasks — Phase 7 E2E Readiness Workflow Validation

## PHASE7E2ER-1 — Run readiness/reporting lifecycle case

```sdd-task
id: PHASE7E2ER-1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/phase7-e2e-readiness/spec.md
  - specs/phase7-e2e-readiness/plan.md
  - specs/phase7-e2e-readiness/tasks.md
  - specs/phase7-e2e-readiness/verify.md
  - specs/phase7-e2e-readiness/release.md
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
  - npm run sdd -- statusline --branch phase7-e2e-readiness --compact-json
  - npm run sdd -- doctor fast --branch phase7-e2e-readiness
  - npm run sdd -- ship --branch phase7-e2e-readiness --dry-run
risk:
  - validation-only
  - local-artifacts-only
  - readiness-surfaces
```

#### Boundary

Use the current project and current CLI to validate Phase 7 workflow behavior through a second real case centered on readiness surfaces. Do not change platform source behavior, publish, push, tag, deploy, or create external release state.

#### Acceptance

- AC-1: Explicit `phase7-e2e-readiness` partition resolves without fallback to `master`.
- AC-2: The spec/plan/tasks/verify document chain exists and is hash-tracked.
- AC-3: Task routing returns deterministic route evidence.
- AC-4: `sdd do task` records implementation, review, and validation artifacts for a real run.
- AC-5: `sdd test task` records real local command execution evidence for a readiness/reporting command.
- AC-6: `sdd verify task` reports acceptance coverage from collected evidence.
- AC-7: `sdd sync-back inspect` renders the approval card contract and local sync-back apply succeeds.
- AC-8: `sdd statusline`, `sdd doctor fast`, `sdd ship --dry-run`, and `sdd ship` report current readiness.

## Evidence links

To be filled by the workflow run.

#### Implementation Notes

- Sync-back applied from run `20260516-006` (2026-05-16T01:31:08.964Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE7E2ER-1.md`, `artifacts/validation-PHASE7E2ER-1.md`, `artifacts/acceptance-coverage-PHASE7E2ER-1.md`.
