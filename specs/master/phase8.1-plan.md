# Phase 8.1 Plan — Verifies-Centered Lifecycle and Agent-Team Separation

## 1. Implementation strategy

Phase 8.1 is a focused convergence slice on top of Phase 8. It does not replace the Phase 8 architecture; it tightens lifecycle semantics exposed by real `/sdd` usage.

Implementation order:

1. Update lifecycle stage model so `goal-verify` is first-class.
2. Update risk profile required stages:
   - direct: `do -> test`
   - compact: `tasks -> verifies -> do -> test -> goal-verify -> sync-back`
   - full: `spec -> plan -> tasks -> verifies -> do -> test -> goal-verify -> sync-back`
   - research: `spec -> plan -> verifies`
3. Update legacy adapters to preserve current profile semantics when reading old lifecycle records.
4. Update orchestration/stage handoff so `test` hands off to `goal-verify`, then `sync-back`.
5. Add verify contract role metadata and inspection warnings.
6. Update `/sdd:test` runtime to ensure `verify.md` is present and fresh before command execution.
7. Add focused tests and then run real installed-project validation.

## 2. Runtime behavior

`/sdd:test` verify handling:

```text
inspect verify.md
  BLOCKED -> return verifies blocker, do not execute validation commands
  PASS -> continue test runtime
  WARN/missing -> write or refresh verify.md, re-inspect
    PASS -> continue test runtime
    WARN/BLOCKED -> return verifies blocker, do not execute validation commands
```

The result records `verifyContractAction`:

- `none`: existing verify contract was PASS.
- `created`: missing verify contract was created.
- `refreshed`: existing stale/warn verify contract was rewritten.
- `blocked`: verifies could not be made PASS.

## 3. Files to change

- `packages/core/src/contracts.ts`
- `packages/core/src/risk/kernel.ts`
- `packages/core/src/risk/legacy-adapters.ts`
- `packages/core/src/orchestration/runtime.ts`
- `packages/core/src/stage-runtime/runtime.ts`
- `packages/core/src/verification/verify-contract.ts`
- `packages/core/src/verification/test-runtime.ts`
- Focused tests under `packages/core/src/*test.ts`
- Phase docs under `specs/master/phase8.1-*`

## 4. Validation plan

Targeted unit tests:

```powershell
node --test --import tsx packages/core/src/verification/verify-contract.test.ts
node --test --import tsx packages/core/src/verification/test-runtime.test.ts
node --test --import tsx packages/core/src/phase8-risk-kernel.test.ts packages/core/src/phase8-projection-compat.test.ts packages/core/src/phase8-contracts.test.ts
node --test --import tsx packages/core/src/stage-runtime/runtime.test.ts packages/core/src/orchestration/runtime.test.ts
```

Broader checks:

```powershell
npm run typecheck
npm test
npm pack --dry-run --json
```

Real installed-project validation must exercise actual `sdd` commands in a temp project and inspect behavior/evidence, not just exit codes.

## 5. Non-goals

- No publish, push, deploy, tag, or remote mutation.
- No broad refactor of risk kernel beyond stage semantics.
- No new public command required for primary verifies flow.
- No subagent final authority.
