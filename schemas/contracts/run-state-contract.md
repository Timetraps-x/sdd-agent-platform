# Run State Contract

## Header

- contract: `sdd-run-state-v1`
- version: `1.3.0`
- phase: `1.3`
- storage: `.sdd/runs/<run_id>/state.json`
- owner: `core/run-state`
- writer: runtime CLI/core
- readers: CLI status, doctor, resume, validator, future graph

## Purpose

`state.json` is the current run snapshot. It records enough state to resume, audit, inspect gaps, check liveness, and connect runtime facts to SDD semantic documents.

## Contract ID Compatibility

- Canonical Phase 1.3 contract id: `sdd-run-state-v1`. New run state snapshots must use this id.
- Legacy Phase 1.2 contract id accepted for existing run evidence: `phase-1.2-run-state-contract`.
- Phase 1.3 readers/resume/doctor specs should accept legacy run snapshots for inspection and emit `WARN` about migration instead of blocking static evidence review.
- Migration rule: do not rewrite historical `state.json` files automatically. A resumed run may write the canonical id only as part of an intentional state update in a later runtime phase.
- Unknown contract ids remain `FAIL` for compatibility checks.
## Required Shape

```json
{
  "contract": "sdd-run-state-v1",
  "version": "1.3.0",
  "runId": "YYYYMMDD-001",
  "runtimeVersion": "phase-1.x",
  "status": "created|running|completed|blocked|failed",
  "phase": "spec|plan|tasks|do|verify|doctor|null",
  "currentTask": null,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "projectRoot": "absolute path",
  "projectConfigPath": ".sdd/project.yml",
  "eventLogPath": ".sdd/runs/<run_id>/events.jsonl",
  "artifactRoot": ".sdd/runs/<run_id>/artifacts",
  "lifecycleDecision": {},
  "tasks": {},
  "agents": {},
  "delegations": {},
  "artifacts": [],
  "validation": {},
  "syncBack": {}
}
```

## Rules

- `state.json` is a snapshot, not the audit history. Historical facts belong to `events.jsonl`.
- Large agent output belongs to artifacts, not inline state fields.
- `delegations` must use `sdd-delegation-liveness-v1` once delegation runtime exists.
- `lifecycleDecision` must use `sdd-lifecycle-decision-v1`.

- Artifact paths in `artifactRoot` are repo-relative run roots (`.sdd/runs/<run_id>/artifacts`). Entries in `artifacts` should use run-relative paths such as `artifacts/review-T1.md`; runtime helper inputs that create artifacts remain artifact-root-relative such as `review-T1.md`.
## Extension Points

Add fields under existing object sections. Do not rename top-level keys without a new contract version.
