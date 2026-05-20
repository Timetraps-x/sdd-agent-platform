# Phase 8 Risk Consumer Validation

## Commands

```text
node --test --import tsx "packages/core/src/phase8-risk-kernel.test.ts"
```

Result: PASS, 10 tests.

```text
npm run typecheck
```

Result: PASS. The command ran `npm run build` first and then `tsc --noEmit`.

```text
node --test --import tsx "packages/core/src/index.test.ts" "packages/core/src/phase8-projection-compat.test.ts" "packages/core/src/phase8-risk-kernel.test.ts"
```

Result: PASS, 14 tests.

```text
node --test --import tsx "packages/core/src/verification/single-task-loop.test.ts"
```

Result: PASS, 4 tests.

```text
npm run build
```

Result: PASS.

```text
npm test
```

Result: PASS, 216 tests.

## Smoke commands

```text
npm run sdd -- status --branch master
```

Result: command returned exit code 1 because current `specs/master/verify.md` is stale against `tasks.md`. Output includes lifecycle risk diagnostics:

```text
- lifecycle_risk status=missing profile=none approval=none input=none expected=a1f9a9d3f0c590f9ff6baa28b5d3966c191e3267041f089160de7649b4f4b615
```

```text
npm run sdd -- doctor --latest-only --branch master
```

Result: PASS command execution. Doctor status is WARN because of pre-existing stale verify contract and context token pressure. Output includes lifecycle risk observe/compare diagnostics:

```text
- [PASS] lifecycle_risk_decision: status=missing profile=none approval=none input=none expected=a1f9a9d3f0c590f9ff6baa28b5d3966c191e3267041f089160de7649b4f4b615 action=Run lifecycle risk projection for master:all:none:none; current command behavior remains on legacy gates during observe/compare.
```

```text
npm run sdd -- ship --branch master --dry-run
```

Result: PASS command execution. Ship status is BLOCKED by existing master readiness blockers. Output includes lifecycle risk observe/compare diagnostics:

```text
- PASS lifecycle_risk_decision: observe_compare status=missing profile=none approval=none
- lifecycle_risk status=missing profile=none approval=none
```

```text
npm run sdd -- sync-back inspect 20260515-002 --branch master --task PHASE6.10-1
```

Result: command returned exit code 1 because the existing run has stale task snapshot, stale verify contract, and no sync-back proposal. Output includes lifecycle risk diagnostics on both inspection and approval card:

```text
lifecycle_risk=missing profile=none approval=none input=none expected=a1f9a9d3f0c590f9ff6baa28b5d3966c191e3267041f089160de7649b4f4b615
- lifecycle_risk=missing profile=none approval=none
```

## Notes

- Focused tests cover missing, stale, blocked, and incompatible lifecycle risk consumer diagnostics.
- Observe/compare diagnostics are visible without changing legacy readiness outcomes.
- The only smoke command failures are caused by documented pre-existing master stale/proposal blockers, not lifecycle risk enforcement.
