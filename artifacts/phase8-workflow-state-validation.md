# Phase 8 Workflow State Validation

## Commands

```text
node --test --import tsx "packages/core/src/status/project-status.test.ts"
```

Result: PASS, 8 tests. Coverage includes `getProjectStatus` exposing observable workflow handoff projections.

```text
node --test --import tsx "packages/core/src/doctor/doctor.test.ts"
```

Result: PASS, 12 tests. Coverage includes doctor reporting `workflow_handoff_state` diagnostics.

```text
node --test --import tsx "packages/core/src/index.test.ts" "packages/core/src/stage-runtime/runtime.test.ts" "packages/core/src/status/project-status.test.ts" "packages/core/src/doctor/doctor.test.ts"
```

Result: PASS, 27 tests.

```text
node --test --import tsx "packages/cli/src/commands/cli-regression.test.ts"
```

Result: PASS, 36 tests.

```text
npm run build
```

Result: PASS.

```text
npm run typecheck
```

Result: PASS. The command ran `npm run build` first and then `tsc --noEmit`.

```text
npm test
```

Result: PASS, 224 tests.

## Smoke commands

```text
npm run sdd -- status --branch master
```

Result: command returned exit code 1 because current `specs/master/verify.md` is stale against `tasks.md`. Output includes the new observable handoff diagnostic:

```text
- workflow_handoff status=missing active_stage=none latest_stage=none latest_handoff=none stage_projections=0 handoff_projections=0
```

```text
npm run sdd -- doctor --latest-only --branch master
```

Result: PASS command execution. Doctor status is WARN because of pre-existing stale verify contract and context token pressure. Output includes the new observe/compare diagnostic:

```text
- [PASS] workflow_handoff_state: status=missing active_stage=none latest_stage=none latest_handoff=none stage_projections=0 handoff_projections=0 action=Record or refresh workflow handoff projection for master; current command behavior remains on legacy gates during observe/compare.
```

## Notes

- Status and doctor remain compatible with projects that have no Phase 8 stage/handoff projections.
- The new diagnostic is visible but non-authoritative during observe/compare migration.
- Smoke command failures/warnings are caused by documented pre-existing master stale/token state, not handoff enforcement.
