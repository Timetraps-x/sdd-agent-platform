# Event Log Contract

## Header

- contract: `sdd-event-log-v1`
- version: `1.3.0`
- phase: `1.3`
- storage: `.sdd/runs/<run_id>/events.jsonl`
- owner: `core/event-log`
- writer: runtime CLI/core append-only writes
- readers: doctor, resume, audit, validator, future graph

## Purpose

`events.jsonl` is append-only runtime history. Each line is one JSON object with a compact summary and paths to larger artifacts.

## Contract ID Compatibility

- Canonical Phase 1.3 contract id: `sdd-event-log-v1`. New event log records must use this id.
- Legacy Phase 1.2 contract id accepted for existing run evidence: `phase-1.2-event-log-contract`.
- Phase 1.3 readers/audit/doctor specs should accept legacy event records for existing runs and emit `WARN` rather than failing when the record shape is otherwise readable.
- Migration rule: append new records with the canonical id; never rewrite old JSONL lines only to migrate ids.
- Unknown contract ids remain `FAIL` for compatibility checks.
## Record Shape

```json
{
  "contract": "sdd-event-log-v1",
  "version": "1.3.0",
  "time": "ISO-8601",
  "event": "run_started",
  "runId": "YYYYMMDD-001",
  "phase": null,
  "task": null,
  "agent": null,
  "summary": "short human-readable summary",
  "artifact": null,
  "data": {}
}
```

## Reserved Event Vocabulary

```text
run_started
lifecycle_decision_recorded
phase_started
phase_completed
task_selected
agent_started
agent_completed
agent_failed
review_passed
review_failed
debug_started
debug_completed
validation_passed
validation_failed
gap_created
gap_detected
gap_classified
gap_resolution_proposed
gap_resolved
gap_deferred
gap_escalated
sync_back_proposed
sync_back_applied
delegation_started
delegation_completed
delegation_failed
delegation_timeout
delegation_cancelled
delegation_stale
delegation_recovered
artifact_missing
artifact_invalid
run_completed
```

## Rules

- Events are append-only; never rewrite old lines to hide history.
- Event data should remain summary-level. Full output belongs in artifact files.
- Terminal events are required for blocking delegations.

- The reserved vocabulary is a static Phase 1.3 contract list, not a runtime implementation requirement.
- `gap_created` is reserved for durable gap record creation; `gap_detected` may precede classification or durable record creation.
- `delegation_stale` and `delegation_recovered` are reserved for liveness/recovery flows described by `sdd-delegation-liveness-v1`.
## Extension Points

New event types may be added if they are documented and do not change existing event semantics.
