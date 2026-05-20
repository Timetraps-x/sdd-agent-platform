# Phase 8 Work Unit, Subagent, and Context Offload Validation

## Focused runtime tests

```text
node --test --import tsx "packages/core/src/work-units/runtime.test.ts" "packages/core/src/subagents/runtime.test.ts" "packages/core/src/context-offload/runtime.test.ts"
```

Result: PASS, 12 tests.

Coverage includes work unit transitions and authority validation, subagent policy/write checks, dispatch gate behavior, non-authoritative result consumption, context load scoring, offload action selection, and projection read/write/inspect flows.

## Runtime and diagnostics integration tests

```text
node --test --import tsx "packages/core/src/work-units/runtime.test.ts" "packages/core/src/subagents/runtime.test.ts" "packages/core/src/context-offload/runtime.test.ts" "packages/core/src/status/project-status.test.ts" "packages/core/src/doctor/doctor.test.ts"
```

Result: PASS, 34 tests.

Coverage includes `getProjectStatus`, `getStatuslineProjection`, and doctor exposing context offload and subagent dispatch diagnostics.

## CLI regression

```text
node --test --import tsx "packages/cli/src/commands/cli-regression.test.ts"
```

Result: PASS, 36 tests.

## Build and typecheck

```text
npm run build
```

Result: PASS.

```text
npm run typecheck
```

Result: PASS. The command ran `npm run build` first and then `tsc --noEmit`.

## Smoke commands

```text
npm run sdd -- statusline --branch master --json
```

Result: command returned exit code 1 because the current master workflow has a pre-existing blocking document gap/stale verify state. The JSON output was produced and includes the new fields:

```json
{
  "contextLoad": "unknown",
  "contextAction": "none",
  "subagentHealth": "missing",
  "counts": {
    "subagentDispatches": 0,
    "blockingSubagents": 0
  }
}
```

```text
npm run sdd -- doctor --latest-only --branch master
```

Result: PASS command execution. Doctor status is WARN because of pre-existing stale verify contract and context token pressure. Output includes the new observe/compare diagnostics:

```text
- [PASS] context_offload_state: level=unknown action=none load_signals=0 offload_decisions=0 dispatch_refs=0
- [PASS] subagent_dispatch_state: status=missing dispatches=0 blocking_open=0 failed=0 stale=0 completed=0
```

## Notes

- No external Claude Code subagents are spawned by these tests or runtime helpers.
- Subagent dispatch/result integration is projection-only.
- Blocking dispatches are visible and can block declared gates in diagnostics, but subagent results remain non-authoritative.
- Context offload replaces token budget as the primary conceptual model in statusline/doctor, while legacy token pressure remains a diagnostic guardrail.
