# Phase 6.1 Spec: Resident Agent Worker Runtime

## Metadata

- phase_id: `6.1`
- title: `Resident Agent Worker Runtime`
- source_artifact: `specs/master/phases/phase-6.1-resident-agent-worker-runtime.md`
- status: `planned`

## 1. Objective / Customer Value

Phase 6.1 turns Phase 6.0 agent/team routing into an observable resident worker runtime contract. Users should be able to claim a task for a long-lived worker, renew its lease with heartbeats, inspect active/stale/terminal worker state, and see that worker evidence in run inspection and doctor output without treating the worker itself as task completion truth.

## 2. Problem / Intent

Phase 6.0 defines agent profiles, skills, team-mode, routing, execution records, and team session records, but the execution shape is still mostly one-shot. `sdd background run` can claim one delegation and optionally ingest an artifact, while `sdd wave run` can drive planned waves. Neither gives a resident worker identity, lease, heartbeat, stale detection, or a first-class status surface.

Phase 6.1 introduces the minimum SDD-owned runtime layer needed before Oh My OpenCode-like team behavior: worker identity, claim, lease, heartbeat, inspect, status, and doctor-visible stale recovery. It does not add a daemon, tmux UI, remote worker fleet, or automatic task completion.

## 3. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Define `ResidentWorkerRuntimeRecord` stored under `.sdd/runs/<run_id>/worker-runtimes/<runtime_id>.json`. | Must |
| FR-2 | Provide a `worker-runtime claim` path that reuses the existing background delegation claim instead of implementing a second queue. | Must |
| FR-3 | Provide a `worker-runtime heartbeat` path that renews lease timestamps without completing the task. | Must |
| FR-4 | Provide `worker-runtime status` and `worker-runtime inspect` surfaces for active, stale, terminal, and blocked runtime state. | Must |
| FR-5 | Expose resident worker runtime evidence through `sdd run inspect <run_id>`. | Must |
| FR-6 | Add doctor-visible warnings when a running runtime is stale, points to a missing queue item, or references an unknown worker adapter. | Must |
| FR-7 | Preserve artifact ingestion, review, validation, verify, and sync-back as completion truth. | Must |

## 4. Non-functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-1 | Reuse `runBackgroundExecutor`, delegation queue, worker adapter contracts, run state, event log, and AgentExecutionRecord where possible. | Must |
| NFR-2 | Keep the runtime host-neutral: Claude Code, OpenCode, or future hosts may provide actual processes, but SDD owns only contract and evidence. | Must |
| NFR-3 | Avoid daemon/supervisor scope in this phase. | Must |
| NFR-4 | Never let a heartbeat or lease renewal mark a task completed. | Must |
| NFR-5 | Render next actions locally and safely; do not automatically kill, delete, or restart workers. | Must |

## 5. Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-6.1-1 | Core API can claim a resident worker runtime and persist a run-bound runtime record. | unit test | Must |
| AC-6.1-2 | Heartbeat renews `lastHeartbeatAt` and `leaseExpiresAt` and reports active state. | unit test | Must |
| AC-6.1-3 | Expired leases render stale state without changing task completion status. | unit test | Must |
| AC-6.1-4 | Terminal delegations cannot be reactivated by worker heartbeat. | unit test | Must |
| AC-6.1-5 | CLI exposes claim/status/heartbeat/inspect in text and JSON forms. | CLI test | Must |
| AC-6.1-6 | `sdd run inspect` and doctor expose resident worker runtime evidence and stale warnings. | run inspect / doctor test | Must |

## 6. Out of Scope

- Full daemon process management.
- tmux focus/grid UI.
- Remote worker fleet management.
- Chief/coordinator autonomous planning beyond Phase 6.0 routing/team-mode contracts.
- Auto-generating implementation/review/validation artifacts.
- Marking SDD tasks complete from heartbeat or worker presence alone.
