# Phase 4.0 Tasks

## P4.0-T1: Record npm distribution research

status: completed

Capture npm official publishing requirements and comparable tool distribution patterns.

### Boundary

Read-only research and documentation. Do not change package metadata.

### Acceptance

- npm publish/package metadata/scoped public package requirements are summarized.
- Spec Kit, GSD and OpenSpec distribution patterns are compared.
- Research changes Phase 4 split decisions rather than merely decorating docs.

## P4.0-T2: Check package identity candidates

status: completed

Use npm registry read-only queries to check visible package occupancy for initial candidates.

### Boundary

Read-only `npm view` queries. Do not reserve, publish or login.

### Acceptance

- `sdd-agent-platform` registry query result recorded.
- `@timetraps/sdd-agent-platform` registry query result recorded.
- Docs clarify that scoped publish still depends on user-owned scope.

## P4.0-T3: Split Phase 4 into executable phases

status: completed

Define Phase 4.0~4.4 so each step has a smaller blast radius and validation boundary.

### Boundary

Phase docs and indexes only.

### Acceptance

- Phase 4 index includes 4.0~4.4.
- Phase status includes 4.0~4.4 gates.
- Validation index includes 4.0~4.4 docs.
- Phase 5 remains code knowledge graph.

## P4.0-T4: Create retained docs for downstream Phase 4.x work

status: completed

Create artifact/spec/plan/tasks/validation files for Phase 4.1~4.4.

### Boundary

Documentation only. Do not implement Phase 4.1 metadata changes.

### Acceptance

- Phase 4.1 retained docs exist.
- Phase 4.2 retained docs exist.
- Phase 4.3 retained docs exist.
- Phase 4.4 retained docs exist.

## P4.0-T5: Validate planning docs

status: pending

Run SDD status/gap checks and verify no obvious Phase 4/5 naming conflicts remain.

### Boundary

Read-only validation commands and grep checks.

### Acceptance

- `sdd status --branch master` reports no task parser gaps.
- `sdd tasks gaps --branch master` passes.
- Search does not show stale references that treat code knowledge graph as current Phase 4.