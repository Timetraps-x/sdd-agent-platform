# Phase 8 Unified Test Evidence Validation

## Commands

```text
node --test --import tsx "packages/core/src/verification/test-runtime.test.ts"
```

Result: PASS, 4 tests.

```text
node --test --import tsx "packages/cli/src/commands/cli-regression.test.ts"
```

Result: PASS, 36 tests. The CLI regression covers mapped `/sdd:test` PASS, JSON output, and unmapped argv command success returning BLOCKED with `commandStatus=PASS`.

```text
node --test --import tsx "packages/core/src/config/init-project.test.ts"
```

Result: PASS, 10 tests. Generated managed entry assertions now expect `/sdd:test` as the primary runtime gate and `/sdd:verify` as compatibility/diagnostic.

```text
node --test --import tsx "packages/core/src/instructions.test.ts"
```

Result: PASS, 1 test. Instruction API overview includes `sdd test task <task_id> --branch <branch>` as the runtime gate.

```text
npm run typecheck
```

Result: PASS. The command ran `npm run build` first and then `tsc --noEmit`.

```text
npm test
```

Result: PASS, 216 tests.

```text
npm run sdd -- update --check
```

Result: PASS. Managed AI entries are current after regenerating from source templates.

## Evidence coverage

- Focused runtime tests cover mapped PASS, command failure FAIL, missing acceptance mapping BLOCKED, argv execution, generated validator artifacts, and sync-back readiness.
- CLI regression confirms text and JSON output distinguish `commandStatus`, `evidenceCoverage`, and task-level status.
- Generated entry tests confirm `/sdd:test` is projected as the primary post-`/sdd:do` runtime gate.
- Full regression confirms the unified test evidence changes do not break existing CLI/core behavior.

## Compatibility boundary

- Low-level `sdd verify task` remains available for compatibility diagnostics, CI/replay, and old-run inspection.
- `/sdd:test` is now the primary user-facing runtime gate before sync-back.
- Command success without mapped acceptance evidence is BLOCKED, not PASS.
