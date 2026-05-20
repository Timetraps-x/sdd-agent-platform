# Phase 7.3 Spec — Workflow State Resolver and Performance Read Path

## 1. Goal

Introduce a Workflow State Resolver that gives status, tasks, doctor, and sync-back a shared read model for branch context, workflow documents, task state, latest runtime facts, blocking reasons, and recommended next action.

## 2. Scope

Phase 7.3 includes:

- Workflow State Resolver contract and public core subpath export.
- Resolver projection stored in Runtime Storage v2 as `workflow_state`.
- Status read path based on resolver output.
- Sync-back implicit run resolution based on resolver output.
- Doctor latest-only fast path based on resolver output.
- Tests for resolver, status, sync-back, and doctor behavior.

## 3. Non-goals

Phase 7.3 does not include:

- `verify.md` or `/sdd:verifies`.
- `/sdd:test`.
- command-scoped team runtime.
- ship/release readiness.
- removal of deep diagnostics; deep/all-runs paths remain available.

## 4. Functional requirements

### FR1 — Shared workflow state

The resolver must include branch context, document state, task counts, gaps, latest run, latest run-by-task view, affected-file conflicts, blocking reasons, and next action.

### FR2 — Runtime projection

The resolver must persist a compact `workflow_state` projection into `runtime.sqlite` without making the projection authoritative.

### FR3 — Fast read paths

High-frequency commands must avoid unnecessary run-index rebuilds and deep evidence scans by default.

### FR4 — Deep diagnostics remain available

Doctor deep/all-runs behavior must remain available for trust, delegation, artifact, worker, and team evidence diagnostics.

## 5. Acceptance criteria

- `sdd status` can use resolver-derived workflow state and next action.
- `sdd sync-back inspect` can resolve the latest task run through resolver state.
- `sdd doctor --latest-only` uses resolver fast path rather than deep run evidence scan.
- Phase 7.3 tests and typecheck pass.
