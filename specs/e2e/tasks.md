# Tasks — E2E T1 Verify Regression

## T1 — Repair goal-level verify evidence

```sdd-task
id: T1
status: pending
wave: 1
depends_on: []
affected_files:
  - specs/e2e/spec.md
  - specs/e2e/plan.md
  - specs/e2e/tasks.md
  - specs/e2e/verify.md
acceptance_refs:
  - AC-1
  - AC-2
  - AC-3
  - AC-4
validation:
  - node --version => AC-1, AC-2, AC-3, AC-4
risk:
  - validation-only
  - local-artifacts-only
```

#### Boundary

Repair the local SDD evidence chain for run `20260518-001`; do not change platform source behavior or publish external state.

#### Acceptance

- AC-1: Explicit `e2e` partition resolves without fallback to another branch.
- AC-2: The spec/plan/tasks/verify document chain exists and is hash-tracked.
- AC-3: `/sdd:test` records real local command execution evidence.
- AC-4: Goal-level verify maps validator evidence to acceptance coverage without command-output corroboration gaps.
