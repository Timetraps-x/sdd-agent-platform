# Phase 1.2 Run State Contract

## Contract

- contract id: `phase-1.2-run-state-contract`
- storage: `.sdd/runs/<run_id>/state.json`
- owner: `packages/core` run state module
- writer: runtime CLI/core
- readers: CLI status, doctor, future resume, future graph

## Required fields

```json
{
  "contract": "phase-1.2-run-state-contract",
  "runtimeVersion": "phase-1.2-runtime-skeleton",
  "runId": "YYYYMMDD-001",
  "status": "created|running|completed|blocked|failed",
  "phase": null,
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

Phase 1.2 creates the snapshot and reserves task/agent/delegation/validation slots. It does not implement parser, artifact validator, liveness manager, or workflow transitions.
