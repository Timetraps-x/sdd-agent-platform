# Phase 8 Stage Handoff Review

## Scope

PHASE8-6 adds observable stage run and workflow handoff runtime projections. The implementation introduces state transition helpers, validation helpers, projection read/write helpers, and branch-level inspection without changing the legacy workflow next-command authority.

## Runtime model

- `StageRun` records the lifecycle stage, owner agent, co-main agents, status, input/output/decision refs, and blocking reasons.
- `WorkflowHandoff` records control transfer from one stage/agent to the next, including required input refs, risk decision ref, evidence refs, open questions, and blocking gaps.
- Projection types:
  - `phase8_stage_run`
  - `phase8_workflow_handoff`
- Producer version: `phase8-stage-runtime-v1`.
- Projection storage reuses the existing Runtime Store `projections` table and envelope helpers; no new Runtime Store schema was added.

## State transitions

Stage run transitions:

```text
pending -> active | blocked | skipped
active -> completed | blocked | failed
blocked -> active | skipped | failed
completed/skipped/failed -> terminal
```

Workflow handoff transitions:

```text
proposed -> accepted | rejected | blocked
blocked -> proposed | rejected
accepted/rejected -> terminal
```

Illegal transitions return structured validation results instead of mutating state.

## Handoff validation matrix

The handoff validator considers:

- Source stage status: only completed or skipped stages can hand off control.
- Source stage identity: handoff `fromStage` must match the source `StageRun.stage`.
- Lifecycle risk decision: missing or blocked risk decisions block handoff validation.
- Required refs: handoffs must carry required input refs and source output refs.
- Evidence refs: handoffs to `test`, `sync-back`, or `ship` require evidence refs.
- Open questions: any open question blocks the proposed handoff.
- Blocking gaps: any blocking gap blocks the proposed handoff.

## Subagent authority boundary

- Stage ownership rejects subagent-like owner roles such as `subagent`, `subagent:*`, or `*-subagent`.
- Subagents may still produce side artifacts or evidence elsewhere in Phase 8, but they cannot own lifecycle stages or drive authoritative handoff decisions.
- Lifecycle control remains with main workflow agents and runtime contracts.

## Compatibility boundary

- Existing workflows still run without stage or handoff projections.
- Missing projections are reported as observable diagnostics, not hard readiness failures.
- Handoff projections are compare/observe state for PHASE8-6; they do not replace legacy next-command selection in this task.
