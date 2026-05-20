# Phase 8 Contract Validation

## Commands

```text
npm run build
```

Result: PASS.

```text
node --test --import tsx "packages/core/src/phase8-contracts.test.ts"
```

Result: PASS, 4 tests.

```text
npm run typecheck
```

Result: PASS.

```text
node --test --import tsx "packages/core/src/index.test.ts" "packages/core/src/contracts.test.ts" "packages/core/src/phase8-contracts.test.ts"
```

Result: PASS, 6 tests.

```text
npm test
```

Result: PASS, 203 tests.

## Notes

- Existing `specs/master` stale verify state is pre-existing and was not changed by PHASE8-1.
- PHASE8-1 stayed contract-only and did not wire new models into runtime gates.
