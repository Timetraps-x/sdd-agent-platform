# Delegation Liveness Contract

## Header

- contract: `sdd-delegation-liveness-v1`
- version: `1.3.0`
- phase: `1.3`
- storage: `state.json.delegations`, delegation events
- owner: `core/delegation`
- writer: runtime/command orchestration in later phases
- readers: doctor, resume, validator, future graph

## Purpose

Delegation liveness records whether an agent/subagent task is pending, running, terminal, stale, or recoverable. It prevents `RUNNING` states from being treated as successful completion.

## Required Shape

```json
{
  "contract": "sdd-delegation-liveness-v1",
  "version": "1.3.0",
  "delegationId": "D-T1-reviewer-001",
  "task": "T1",
  "agent": "reviewer",
  "runMode": "foreground|background",
  "blocking": true,
  "requiredForPhaseExit": true,
  "status": "PENDING|RUNNING|COMPLETED|FAILED|TIMED_OUT|CANCELLED|RECOVERABLE|STALE",
  "startedAt": "ISO-8601",
  "lastHeartbeatAt": null,
  "timeoutSeconds": 900,
  "expectedArtifact": "artifacts/review-T1.md",
  "terminalEventRequired": true
}
```

## Path Canonicalization

- `expectedArtifact` is a run-relative artifact reference because delegation records live inside run state/events. Use `artifacts/<file>`, for example `artifacts/review-T3.md`.
- Runtime artifact helper calls should strip the run-relative prefix and pass artifact-root-relative input such as `review-T3.md`.
- Markdown documents outside the run may point to the same artifact with repo-relative form `.sdd/runs/<run_id>/artifacts/review-T3.md`.
- Avoid storing `.sdd/runs/<run_id>/artifacts/...` in `expectedArtifact`; that form is for cross-document references, not run-local records.

## Rules

- `RUNNING` must not be considered terminal.
- Blocking delegations require a terminal event before phase exit.
- `COMPLETED` means the agent ended, not that the artifact is valid.
- Expected artifact validation is separate and may convert a result to `RECOVERABLE` or `FAILED`.
- Phase 1.3 defines the contract only; background manager/runtime enforcement belongs to later phases.

## Extension Points

Future versions may add heartbeat details, cancellation reasons, retry counters, or worker identity without changing current required fields.
