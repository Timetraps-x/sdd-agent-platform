# Phase 7.5 Validation — Test Runtime and Evidence Execution

## Result

PASS.

## Commands

```powershell
npm run build
node --test --import tsx packages/core/src/verification/test-runtime.test.ts packages/cli/src/commands/cli-regression.test.ts
node --test --import tsx packages/core/src/verification/test-runtime.test.ts
npm run typecheck
npm test
npm pack --dry-run --json
npm run sdd -- instructions test --json
npm run sdd -- update
npm run sdd -- doctor --latest-only --branch master
npm run sdd -- test task PHASE6.10-1 --branch master --command "node -e \"process.stdout.write('phase7.5-smoke')\""
npm run sdd -- test task PHASE6.10-1 --branch master --command "node --version"
npm run sdd -- status --branch master
npm run sdd -- doctor --latest-only --branch master
npm run sdd -- run archive 20260515-001 --reason "archive failed quote-smoke run"
npm run sdd -- run index rebuild
npm run sdd -- doctor --latest-only --branch master
```

## Evidence summary

- `npm run build` passed after narrowing `writeIndexArtifact()` payload typing to exclude `indexArtifact` before the index artifact exists.
- Targeted Phase 7.5 runtime/CLI regression initially exposed a SQLite foreign-key issue because `test_steps` were inserted before the parent `test_runs` row.
- The foreign-key issue was fixed by recording a RUNNING `test_runs` row before command step execution and replacing it with terminal status at completion.
- Focused runtime tests passed: 3 tests, 3 pass, 0 fail.
- Targeted runtime + CLI regression passed: 37 tests, 37 pass, 0 fail.
- `npm run typecheck` passed.
- `npm test` passed: 183 tests, 183 pass, 0 fail.
- `npm pack --dry-run --json` completed for `sdd-agent-platform@0.3.0`.
- `sdd instructions test --json` returned the new `test` instruction contract.
- `sdd update` created the managed `.claude/commands/sdd/test.md` entry.
- Initial doctor latest-only after update passed: 43 checks, 43 pass, 0 warn, 0 fail.
- First real smoke with nested PowerShell/Node quoting intentionally recorded a FAIL runtime because shell quoting split the command; this confirmed failing command evidence is captured without promoting semantic PASS.
- Second real smoke using `--command "node --version"` passed and produced run `20260515-002`, validation artifact `artifacts/validation-PHASE6.10-1.md`, index artifact `artifacts/test-index-PHASE6.10-1.json`, and command log artifact `artifacts/test-PHASE6.10-1-001.log`.
- Status showed latest run `20260515-002` in phase `test` with validation `pass`.
- The failed quote-smoke run `20260515-001` temporarily caused doctor latest-only WARN via active affected-file conflict and stale local run-index projections.
- `sdd run archive 20260515-001` archived the accidental failed smoke run.
- `sdd run index rebuild` repaired local run-index projections.
- Final `sdd doctor --latest-only --branch master` passed: 43 checks, 43 pass, 0 warn, 0 fail.

## Boundary checks

- `/sdd:test` executes validation commands and indexes evidence but does not create sync-back proposals.
- Runtime PASS from `sdd test task` means executed commands passed and artifacts were generated; semantic task PASS remains owned by `sdd verify task`.
- Generated validator artifacts contain `sdd-result` and `sdd-evidence` blocks with command/artifact refs that goal verify can evaluate.
- Raw command logs remain branch-scoped evidence artifacts, not workflow documents.
- Phase 7.7 remains responsible for command-scoped team runtime; Phase 7.8 remains responsible for ship/sync-back observability hardening.
