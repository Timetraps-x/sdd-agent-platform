# Phase 5.3 Plan

## Metadata

- phase_id: `5.3`
- plan_id: `phase5.3-task-graph-run-evidence-harness-plan`
- depends_on: `5.2`
- blocks: `5.4`

## Implementation Slices

### P1: TaskGraphContract

- Extend task metadata parser.
- Add file overlap and dependency graph helpers.
- Add agent_fit, verification availability and autonomy fields.

### P2: TaskRunEvidenceContract

- Normalize run state/events/artifact layout.
- Add event types for task/agent/gate/validation/gap.
- Ensure artifacts can link back to tasks and agents.

### P3: Verifier output states

- Standardize PASS / GAPS / BLOCKED / HUMAN_NEEDED.
- Emit gap closure guidance and sync-back proposal references.

## Validation Strategy

- `npm test`
- `npm run build`
- run inspect smoke with sample run evidence
- tasks parse smoke with enriched task metadata

## Risks

- Evidence model must stay file-backed and lightweight.
- Task graph must not imply automatic parallel writes.
