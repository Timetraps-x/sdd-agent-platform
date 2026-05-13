# Phase 6.7 Validation: Token Budget and Output Dedup Runtime

## 0. Metadata

- validation_id: `phase6.7-token-budget-output-dedup-runtime`
- spec_id: `phase6.7-token-budget-output-dedup-runtime`
- plan_id: `phase6.7-token-budget-output-dedup-runtime`
- branch: `master`
- status: `pass`

## 1. Validation Scope

Phase 6.7 validates runtime output/token-budget behavior without changing machine-readable SDD contracts.

In scope:

- shared CLI JSON output dispatch for direct JSON surfaces;
- consistent `--compact-json` support on targeted commands;
- text renderer prose dedup only where it reduces repeated output boilerplate;
- instruction/evidence wording dedup only where it affects token volume;
- schema/key/status/command compatibility checks.

Out of scope:

- broad dispatcher rewrite;
- unrelated cleanup;
- runtime localization;
- JSON schema migration.

## 2. Task Evidence

| Task | Expected Evidence | Status |
|---|---|---|
| PHASE6.7-1 | phase docs registered; active task chain inspectable | PASS |
| PHASE6.7-2 | CLI JSON/compact dispatch normalized; tests/build pass | PASS |
| PHASE6.7-3 | renderer/instruction/evidence dedup validated; package smoke pass | PASS |

## 3. Required Commands

```powershell
npm run typecheck
npm test
npm run build
node ./dist/packages/cli/src/main.js status --branch master --compact-json
node ./dist/packages/cli/src/main.js instructions overview --compact-json
node ./dist/packages/cli/src/main.js run index rebuild --compact-json
node ./dist/packages/cli/src/main.js sync-back inspect --task PHASE6.7-2 --branch master --compact-json
node ./dist/packages/cli/src/main.js artifact validate <run_id> artifacts/validation-PHASE6.7-3.md --task PHASE6.7-3 --agent validator --compact-json
node ./dist/packages/cli/src/main.js doctor --latest-only
npm pack --dry-run --json
```

## 4. Acceptance Mapping

| Acceptance | Validation Method | Result |
|---|---|---|
| AC-1 | inspect CLI JSON surfaces for shared formatter usage and valid JSON output | PASS: instructions, run-index, sync-back, and artifact validation use shared `wantsJson`/`jsonOutput` dispatch. |
| AC-2 | run targeted commands with `--compact-json` and compare parseability | PASS: `CLI compact JSON supports instructions run-index sync-back and artifact validation` asserts one-line parseable JSON. |
| AC-3 | inspect text outputs for preserved decision/evidence/gaps/next sections with less boilerplate | PASS: repeated issue/gap rendering now reuses shared helpers without removing required sections. |
| AC-4 | compare JSON keys, task IDs, status enum, artifact paths, and command names before/after | PASS: tests and compact JSON smoke preserve machine-readable keys and English runtime semantics. |
| AC-5 | full typecheck/test/build/package and installed workflow evidence | PASS: `npm run typecheck`, `npm test` (147 pass), `npm run build`, built CLI smoke, `npm pack --dry-run --json`, and installed package workflow smoke completed. |

## 5. Completion Notes

Evidence recorded: compact JSON regression passed for `instructions overview`, `run index rebuild`, `sync-back inspect`, and `artifact validate`; `npm run typecheck`, `npm test` (147 pass), `npm run build`, `status --branch master --compact-json`, `doctor --latest-only`, `npm pack --dry-run --json`, and isolated package install/uninstall all completed. PHASE6.7 sync-back status is not auto-applied; repository policy still requires explicit approval for risky/dependent task status writes.
