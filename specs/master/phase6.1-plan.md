# Phase 6.1 Plan: Resident Agent Worker Runtime

## 1. Design Summary

Phase 6.1 adds a minimal resident worker runtime on top of existing SDD execution primitives. A runtime is a run-bound JSON record with identity, task, agent profile, worker adapter, delegation id, queue item id, expected artifact, lease timestamps, and status. Claiming a runtime delegates to the existing background executor; heartbeats renew only the runtime lease and never complete the SDD task.

## 2. Reused Mechanisms

- `runBackgroundExecutor(...)` remains the canonical delegation claim path.
- `DelegationRecord` and `DelegationQueueItem` remain the queue/liveness source.
- `WorkerAdapterContract` remains the declared execution adapter boundary.
- `RunState`, `events.jsonl`, `AgentExecutionRecord`, and `run inspect` remain evidence surfaces.
- Artifact ingestion, review, validation, verify, and sync-back remain completion truth.

## 3. Runtime State

Runtime records live at:

```text
.sdd/runs/<run_id>/worker-runtimes/<runtime_id>.json
```

A runtime may be:

- `claimed`: background delegation was claimed and a runtime record exists.
- `active`: heartbeat has renewed the lease and the delegation is still running.
- `stale`: lease expired while delegation is still running.
- `terminal`: associated delegation reached a terminal state.
- `blocked`: claim or inspection found a contract issue.

## 4. CLI Surfaces

- `sdd worker-runtime claim <task_id> ...`
- `sdd worker-runtime heartbeat <runtime_id> --run <run_id> ...`
- `sdd worker-runtime status --run <run_id> ...`
- `sdd worker-runtime inspect <runtime_id> --run <run_id> ...`

## 5. Evidence and Doctor

`inspectRun(...)` includes resident worker runtime records. Doctor warns about stale running runtimes, missing queue items, and unknown worker adapters. These warnings recommend heartbeat, inspection, or re-claiming with a new delegation id; they do not delete or restart anything.

## 6. Implementation Steps

1. Add runtime types, path helpers, read/write/list helpers.
2. Implement claim by wrapping `runBackgroundExecutor(...)` with no artifact path.
3. Implement heartbeat and lease status calculation.
4. Add inspect/status APIs and run inspection integration.
5. Add doctor evidence checks.
6. Add CLI command group and renderers.
7. Add focused tests and run full validation.
