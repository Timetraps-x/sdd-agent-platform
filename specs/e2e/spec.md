# Spec — E2E T1 Verify Regression

## Goal

Provide a minimal explicit `e2e` workflow partition for run `20260518-001` so T1 can be verified against real local runtime evidence.

## Acceptance criteria

- AC-1: Explicit `e2e` partition resolves without fallback to another branch.
- AC-2: The spec/plan/tasks/verify document chain exists and is hash-tracked.
- AC-3: `sdd test task T1 --branch e2e --run 20260518-001` records real local command execution evidence.
- AC-4: `sdd verify task T1 --branch e2e --run 20260518-001` reports policy-backed acceptance coverage from collected evidence.
