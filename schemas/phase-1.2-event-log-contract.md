# Phase 1.2 Event Log Contract

## Contract

- contract id: `phase-1.2-event-log-contract`
- storage: `.sdd/runs/<run_id>/events.jsonl`
- owner: `packages/core` event log module
- writer: runtime CLI/core append-only writes
- readers: doctor, future resume/audit/graph

## Event record

Each line is one JSON object:

```json
{
  "contract": "phase-1.2-event-log-contract",
  "time": "ISO-8601",
  "event": "run_started|lifecycle_decision_recorded|...",
  "runId": "YYYYMMDD-001",
  "summary": "short human-readable summary",
  "data": {}
}
```

Phase 1.2 writes `run_started` and `lifecycle_decision_recorded`. The broader event vocabulary remains reserved for later phases and must stay append-only.
