# Phase 8 Workflow State Review

## Scope

PHASE8-7 exposes stage handoff state through project status and doctor diagnostics. The integration is observe/compare only: it surfaces active stage/latest handoff state when projections exist and reports missing/stale/rejected/blocked handoffs without replacing legacy workflow next-command behavior.

## Status integration

`getProjectStatus` now includes `workflowHandoff`, a branch-scoped diagnostic containing:

- diagnostic status: `missing`, `fresh`, `stale`, `blocked`, `rejected`, or `incompatible`
- active stage, when an active stage projection exists
- latest stage run projection
- latest workflow handoff projection
- stage/handoff projection counts
- staleness for latest stage and latest handoff envelopes
- human-readable reasons

CLI status renders the diagnostic as:

```text
workflow_handoff status=<status> active_stage=<stage|none> latest_stage=<stage|none> latest_handoff=<from->to:status|none> stage_projections=<n> handoff_projections=<n>
```

## Doctor integration

Doctor now emits a visible PASS-level observe/compare diagnostic named `workflow_handoff_state`.

- Missing handoff projections are visible but do not fail doctor.
- Stale, blocked, rejected, and incompatible handoffs are surfaced as diagnostics.
- The diagnostic action explicitly says current command behavior remains on legacy gates during observe/compare.
- The CLI doctor renderer keeps `workflow_handoff_state` visible alongside `lifecycle_risk_decision` instead of hiding it with ordinary PASS checks.

## Compatibility boundary

- Existing workflow status works when no Phase 8 handoff projections exist.
- Missing handoff state does not change the legacy recommended next command.
- Master smoke currently reports `workflow_handoff status=missing`, which is expected before runtime projections are produced.
- Existing master readiness remains blocked/warned by pre-existing verify staleness and context token pressure, not by the new handoff diagnostic.

## Mainline safety

The integration avoids changing source-of-truth workflow decisions in this task. Handoff state is available for comparison and future enforcement, but legacy document/run/readiness checks remain authoritative.
