# Phase 8 Final Validation

## Build and typecheck

```text
npm run build
```

Result: PASS.

```text
npm run typecheck
```

Result: PASS. The command ran `npm run build` first and then `tsc --noEmit`.

## Full regression

```text
npm test
```

Result: PASS, 238 tests.

## Package dry-run

```text
npm pack --dry-run --json
```

Result: PASS. Package artifact: `sdd-agent-platform-0.3.0.tgz`.

## Focused Phase 8 runtime and diagnostics

```text
node --test --import tsx "packages/core/src/work-units/runtime.test.ts" "packages/core/src/subagents/runtime.test.ts" "packages/core/src/context-offload/runtime.test.ts" "packages/core/src/status/project-status.test.ts" "packages/core/src/doctor/doctor.test.ts"
```

Result: PASS, 34 tests.

```text
node --test --import tsx "packages/cli/src/commands/cli-regression.test.ts"
```

Result: PASS, 36 tests.

## SDD smoke commands

```text
npm run sdd -- status --branch master
```

Result: command returned exit code 1 because the current master workflow has a pre-existing stale `verify.md` document gap. Output includes the new Phase 8 observe/compare diagnostics:

```text
- lifecycle_risk status=missing profile=none approval=none input=none expected=a1f9a9d3f0c590f9ff6baa28b5d3966c191e3267041f089160de7649b4f4b615
- workflow_handoff status=missing active_stage=none latest_stage=none latest_handoff=none stage_projections=0 handoff_projections=0
- context_offload level=unknown action=none load_signals=0 offload_decisions=0 dispatch_refs=0
- subagent_dispatch status=missing dispatches=0 blocking_open=0 failed=0 stale=0 completed=0
```

```text
npm run sdd -- statusline --branch master --json
```

Result: command returned exit code 1 because the current master workflow has a pre-existing blocking document gap/stale verify state. JSON output includes:

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
npm run sdd -- tasks list --branch master
```

Result: command returned exit code 1 because the current master workflow has `gaps=1`; it still listed tasks successfully.

```text
npm run sdd -- doctor --latest-only --branch master
```

Result: PASS command execution. Doctor status is WARN because of pre-existing stale verify contract and context token pressure. Output includes:

```text
- [PASS] context_offload_state: level=unknown action=none load_signals=0 offload_decisions=0 dispatch_refs=0
- [PASS] subagent_dispatch_state: status=missing dispatches=0 blocking_open=0 failed=0 stale=0 completed=0
```

## Notes

- The non-zero status/statusline/tasks smoke exits are caused by existing master document gap state, not Phase 8 runtime regressions.
- Phase 8 remains observe/compare for lifecycle risk, stage handoff, context offload, and subagent dispatch diagnostics.
- Phase 9 code graph providers were not implemented in Phase 8.
