# Phase 7.9 — Workflow Semantics, Risk, Context and Token Runtime Hardening

## Status

In progress.

## Purpose

Phase 7.9 hardens the Phase 7 workflow after three real E2E cases proved the main lifecycle can pass but exposed semantic gaps in risk routing, evidence coverage, command side-effect boundaries, run/artifact scope, sync-back consistency, and context/token runtime support.

## Scope

- Command lifecycle and side-effect boundary.
- Unified task risk profile.
- Scoped run and artifact model.
- Evidence coverage mapping.
- Verification evidence selection and reporting.
- Shell-safe test command execution.
- Sync-back verify refresh flow.
- Context budget enforcement.
- Token estimate runtime projection.
- Role-scoped context packages.
- Token-aware team runtime.
- Plan-stage performance/context/token checks.
- Expanded E2E scenario matrix.

## Non-goals

- Do not implement Phase 8 code graph intelligence.
- Do not publish, push, tag, deploy, or create external release state.
- Do not make context summaries authoritative PASS evidence.
- Do not restore root core imports or CLI `core/src` deep imports.

## Execution documents

- `../phase7.9-research.md`
- `../phase7.9-spec.md`
- `../phase7.9-plan.md`
- `../phase7.9-tasks.md`
- `../phase7.9-validation.md`

## Completion gate

Phase 7.9 completes only when workflow semantics are hardened, context/token runtime support is enforced and projected, and the expanded E2E matrix passes with build/typecheck/full-test/pack/update/doctor gates.
