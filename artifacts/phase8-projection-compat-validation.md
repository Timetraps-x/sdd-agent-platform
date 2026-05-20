# Phase 8 Projection Compatibility Validation

## Commands

```text
node --test --import tsx "packages/core/src/phase8-projection-compat.test.ts"
```

Result: PASS, 3 tests.

```text
npm run typecheck
```

Result: PASS. The command ran `npm run build` first and then `tsc --noEmit`.

```text
node --test --import tsx "packages/core/src/index.test.ts" "packages/core/src/phase8-projection-compat.test.ts"
```

Result: PASS, 4 tests.

```text
npm run build
```

Result: PASS.

```text
npm test
```

Result: PASS, 206 tests.

## Notes

- PHASE8-2 remained observable-only.
- No Runtime Store schema tables were added.
- Existing legacy projection writes remain supported through `recordRuntimeProjection`.
- Legacy `TaskRiskProfile` and `LifecycleDecisionRecord` were adapted for comparison without becoming new command gates.
