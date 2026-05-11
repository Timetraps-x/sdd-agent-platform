# Phase 6.8 Validation: Project Document Language Runtime

## 0. Metadata

- validation_id: `phase6.8-project-document-language-runtime`
- spec_id: `phase6.8-project-document-language-runtime`
- plan_id: `phase6.8-project-document-language-runtime`
- branch: `master`
- status: `pass`

## 1. Validation Scope

Phase 6.8 validates project-level SDD document prose language while keeping runtime output and contracts English/stable.

In scope:

- `docs_language` parse/render round-trip as one project-level preference;
- `zh-CN` prose generation for initial spec/plan/tasks scaffolds;
- English fallback for `en-US` and unsupported values;
- preservation of fenced block names, YAML keys, IDs, status enum, artifact paths, command names, and Arabic numerals;
- runtime CLI/JSON output remaining English under `docs_language: zh-CN`.

Out of scope:

- runtime CLI localization;
- per-run/per-task/per-document language overrides;
- parser schema migration;
- translation of contract identifiers.

## 2. Task Evidence

| Task | Expected Evidence | Status |
|---|---|---|
| PHASE6.8-1 | project config contract and round-trip tests | PASS |
| PHASE6.8-2 | generated document prose tests and runtime English smoke | PASS |
| PHASE6.8-3 | installed CLI workflow, verify, sync-back, run-index, doctor, uninstall evidence | PASS |

## 3. Required Commands

```powershell
npm run typecheck
npm test
npm run build
node ./dist/packages/cli/src/main.js status --branch master --compact-json
node ./dist/packages/cli/src/main.js doctor --latest-only
npm pack --dry-run --json
sdd --version
sdd status --branch master --compact-json
sdd tasks inspect PHASE6.8-3 --branch master --json
sdd tasks route PHASE6.8-3 --branch master --json
sdd do task PHASE6.8-3 --branch master --run <run_id> --implement-artifact artifacts/implement-PHASE6.8-3.md --review-artifact artifacts/review-PHASE6.8-3.md --validation-artifact artifacts/validation-PHASE6.8-3.md
sdd verify task PHASE6.8-3 --branch master --run <run_id>
sdd sync-back inspect <run_id> --task PHASE6.8-3 --branch master
sdd run index rebuild --json
sdd doctor --latest-only
```

## 4. Acceptance Mapping

| Acceptance | Validation Method | Result |
|---|---|---|
| AC-6 | unit test project config parse/render round-trip for `docs_language` | PASS: `initProject creates readable project config` asserts `docs_language: zh-CN` round-trip and rendered project-level comment. |
| AC-7 | inspect/test `zh-CN` scaffolds for Chinese prose and stable contract terms | PASS: starter spec/plan/tasks include Chinese prose while preserving `sdd-task`, YAML keys, AC IDs, command names, artifact paths, and parser headings. |
| AC-8 | test English fallback for `en-US` and unsupported language values | PASS: `en-US` and `fr-FR` fallback test generates English starter prose and rejects Chinese scaffold markers. |
| AC-9 | smoke CLI output under `docs_language: zh-CN` and confirm runtime English | PASS: built `status --compact-json`, `doctor --latest-only`, and CLI status regression remain English/runtime-stable. |
| AC-10 | installed CLI SDD workflow evidence without per-run language state | PASS: installed CLI run `20260511-005` verified PHASE6.8-3 and sync-back inspect is ready with approval required. |

## 5. Completion Notes

Evidence recorded: `npm run typecheck`, `npm test` (147 pass), `npm run build`, built CLI status/doctor smoke, `npm pack --dry-run --json`, isolated installed CLI workflow for run `20260511-005`, `sdd verify task PHASE6.8-3 --branch master --run 20260511-005` PASS, `sdd sync-back inspect 20260511-005 --task PHASE6.8-3 --branch master` ready with approval required, `sdd run index rebuild --json`, `sdd doctor --latest-only`, and isolated uninstall `UNINSTALLED=True`.
