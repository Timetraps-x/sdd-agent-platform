# Phase 5.6 Plan

## Metadata

- phase_id: `5.6`
- plan_id: `phase5.6-phase7-graph-handoff-hardening-plan`
- depends_on: `5.5`
- blocks: `7.0`

## Implementation Slices

### P1: Graph-ready metadata schema

- Define harness metadata consumed by Phase 8.
- Map metadata to source facts: specs, task graph, runs, eval, context pack.

### P2: Phase 8 artifact alignment

- Update Phase 8 dependency wording.
- Ensure Phase 8 does not depend on graph implementation work in Phase 5, and can also consume Phase 6 runtime metadata and Phase 7 core boundary metadata when available.

### P3: Guardrail validation

- Validate no graph database / embedding / AST-LSP runtime is added to Phase 5.

## Validation Strategy

- `sdd status --branch master`
- grep Phase 5/7 graph ownership references
- phase index/status review

## Risks

- Handoff schema must be specific enough for Phase 8, but not become graph implementation.