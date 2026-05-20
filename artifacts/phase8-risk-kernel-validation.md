# Phase 8 Risk Kernel Validation

## Commands

```text
node --test --import tsx "packages/core/src/phase8-risk-kernel.test.ts"
```

Result: PASS, 6 tests.

```text
npm run typecheck
```

Result: PASS. The command ran `npm run build` first and then `tsc --noEmit`.

```text
node --test --import tsx "packages/core/src/index.test.ts" "packages/core/src/phase8-projection-compat.test.ts" "packages/core/src/phase8-risk-kernel.test.ts"
```

Result: PASS, 10 tests.

```text
npm run build
```

Result: PASS.

```text
npm test
```

Result: PASS, 212 tests.

## Notes

- Direct, compact, full, research, and blocked outcomes are covered by focused tests.
- Blocking outranks direct/compact/full/research implementation paths.
- Legacy task risk adapter feeds the kernel through `taskRiskProfileToCodingRiskProfile`.
- Decision projection write/read is covered by focused tests.
- No command gate enforcement was added in PHASE8-3.
