# Tasks — Phase 7 E2E Workflow Validation

## PHASE7E2E-1 — Run real Phase 7 workflow lifecycle case

```sdd-task
id: PHASE7E2E-1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/phase7-e2e/spec.md
  - specs/phase7-e2e/plan.md
  - specs/phase7-e2e/tasks.md
  - specs/phase7-e2e/verify.md
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
  - node --version
  - npm run sdd -- statusline --branch phase7-e2e
  - npm run sdd -- doctor fast --branch phase7-e2e
risk:
  - validation-only
  - local-artifacts-only
```

#### Boundary

Use the current project and current CLI to validate Phase 7 workflow behavior. Do not change platform source behavior, publish, push, tag, deploy, or create external release state.

#### Acceptance

- AC-1: Explicit `phase7-e2e` partition resolves without fallback to `master`.
- AC-2: The spec/plan/tasks/verify document chain exists and is hash-tracked.
- AC-3: Task routing returns deterministic route evidence.
- AC-4: `sdd do task` records implementation, review, and validation artifacts for a real run.
- AC-5: `sdd test task` records real local command execution evidence.
- AC-6: `sdd verify task` reports acceptance coverage from collected evidence.
- AC-7: `sdd sync-back inspect` renders approval card contract output.
- AC-8: `sdd statusline`, `sdd doctor fast`, and `sdd ship --dry-run` report current readiness.

## Evidence links

To be filled by the workflow run.

#### Implementation Notes

- Sync-back applied from run `20260516-005` (2026-05-16T01:11:07.266Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE7E2E-1.md`, `artifacts/validation-PHASE7E2E-1.md`, `artifacts/acceptance-coverage-PHASE7E2E-1.md`.
