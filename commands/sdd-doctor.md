---
name: sdd-doctor
version: 0.2.0
phase: 1.9
contract: sdd-command-v1
workflow: workflows/doctor.yml
lifecycle_gate: phase-1.7-command-gate
---

# /sdd-doctor Command Contract

## Purpose

Check platform static assets, project configuration, and runtime evidence readiness without modifying files.

## Inputs

- Platform asset directories: `commands/`, `agents/`, `workflows/`, `templates/`, `adapters/`, `schemas/`.
- Static asset contract: `schemas/contracts/doctor-static-assets-contract.md`.
- Optional runtime evidence under `.sdd/runs/<run_id>/`.

## Lifecycle decision gate

Doctor can be invoked directly for read-only diagnosis. When doctor is used as an entry command for a change request, first run `sdd lifecycle decide` to record profile, confidence, reasons, checkpoint need, and escalation triggers. Phase 1.9 adds run evidence hardening but still does not auto-fix.

## Outputs

- Read-only diagnostic result: `PASS`, `WARN`, or `FAIL`.
- Missing asset, missing marker, version mismatch, stale delegation, or artifact issue summaries.
- Recovery proposal only; no auto-fix.

## Forbidden

- Do not auto-fix files.
- Do not install dependencies.
- Do not delete stale state.
- Do not mark runtime tasks successful.
- Do not auto-fix Phase 1.9 doctor hardening findings.

## Success criteria

- Required command/agent/workflow assets are checkable by path and metadata markers.
- Doctor rules remain read-only and contract-based.
- `.sdd/runs/*/state.json` and `events.jsonl` are inspected for stale RUNNING delegations.
- Completed terminal delegation state without terminal event is reported.
- Completed delegation with missing/invalid expected artifact is reported.
- `delegation_started` without terminal event is reported.
- Findings include recovery proposal text only; doctor does not delete, rewrite, retry, or mark success.