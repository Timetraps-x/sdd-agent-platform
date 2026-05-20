# Phase 8 Code Graph Handoff Review

## Scope

PHASE8-11 prepares the Phase 9 code graph handoff without implementing graph providers, graph caches, graph projections, or graph-consuming gates in Phase 8.

## Handoff target

`specs/master/phase9-spec.md` now captures the deferred code graph scope:

- goals: changed refs, impacted modules/tests, public API refs, dependency fanout, confidence, and reasons
- inputs: Git changed refs, SDD task metadata, TypeScript project metadata, and Phase 8 runtime projections
- outputs: optional graph signal projections, cache metadata, test-impact hints, context-impact hints, and lifecycle risk input signals
- consumers: lifecycle risk, context offload, unified test evidence, status, and doctor
- compatibility boundary: missing graph signals are optional absent evidence and must not block Phase 8 gates

## Phase 8 boundary

Phase 8 remains absent-safe:

- No command, status, doctor, ship, sync-back, or `/sdd:test` gate depends on graph signals.
- Graph signals do not assign agents or dispatch subagents.
- Graph signals do not own lifecycle authority or mark gates complete.
- Low-confidence graph data cannot be the sole ship or sync-back blocker.

## Architecture note

The command information architecture now treats `sdd test task` as the user-facing test + evidence judgment gate, with sync-back after PASS. Low-level verify remains compatibility/diagnostic rather than the main lifecycle path.
