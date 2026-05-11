# Phase 6.1 Validation: Resident Agent Worker Runtime

## Validation Scope

Phase 6.1 is valid when resident worker runtimes can be claimed, heartbeated, inspected, surfaced in run evidence, and checked by doctor without replacing artifact/review/validation/verify completion truth.

## Acceptance Mapping

| Acceptance | Validation |
|---|---|
| AC-6.1-1 | Core claim test asserts a runtime record exists under the run and references a background delegation. |
| AC-6.1-2 | Heartbeat test asserts renewed `lastHeartbeatAt`, `leaseExpiresAt`, and active status. |
| AC-6.1-3 | Stale test asserts expired lease renders stale while run/task completion status is unchanged. |
| AC-6.1-4 | Terminal safety test asserts heartbeat returns terminal and does not reopen completed/failed/timed-out/cancelled delegation. |
| AC-6.1-5 | CLI test asserts claim/status/heartbeat/inspect work in text and JSON output. |
| AC-6.1-6 | Run inspect and doctor tests assert worker runtime evidence and stale warnings are visible. |

## Commands

```powershell
node --test --import tsx --test-name-pattern "resident worker|worker-runtime|background executor|Phase 6" "packages/**/*.test.ts"
npm run build
npm test
```

## Manual Smoke

```powershell
sdd worker-runtime claim ONBOARDING-1 --branch master --agent implementer --json
sdd worker-runtime status --run <run_id>
sdd worker-runtime heartbeat <runtime_id> --run <run_id>
sdd worker-runtime inspect <runtime_id> --run <run_id>
sdd run inspect <run_id>
sdd doctor --latest-only
```

## Pass Criteria

- Runtime claim creates a run-bound runtime record and background delegation claim.
- Heartbeat renews the lease but does not mark the task complete.
- Stale runtime state is visible and actionable.
- Terminal delegations cannot be reactivated.
- Doctor provides safe recovery guidance only.
