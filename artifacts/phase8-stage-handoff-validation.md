# Phase 8 Stage Handoff Validation

## Commands

```text
node --test --import tsx "packages/core/src/stage-runtime/runtime.test.ts"
```

Result: PASS, 6 tests.

Coverage:

- Legal stage run transitions and terminal reopen rejection.
- Subagent lifecycle owner rejection.
- Handoff validation across source stage status, lifecycle risk decision, required refs, evidence refs, open questions, and blockers.
- Handoff transition table for proposed/accepted/terminal behavior.
- Stage run and workflow handoff projection write/read/inspect.
- Blocked, rejected, and stale handoff diagnostics.

```text
node --test --import tsx "packages/core/src/index.test.ts" "packages/core/src/stage-runtime/runtime.test.ts" "packages/core/src/status/project-status.test.ts" "packages/core/src/doctor/doctor.test.ts"
```

Result: PASS, 27 tests.

```text
npm run typecheck
```

Result: PASS. The command ran `npm run build` first and then `tsc --noEmit`.

```text
npm run build
```

Result: PASS.

```text
npm test
```

Result: PASS, 224 tests.

## Notes

- Runtime Store schema was not changed; projections use existing envelope helpers.
- The implementation keeps stage/handoff state observable-only for this wave.
- Subagents are explicitly rejected as stage owners.
