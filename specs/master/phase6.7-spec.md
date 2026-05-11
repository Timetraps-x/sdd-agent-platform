# Phase 6.7 Spec: Token Budget and Output Dedup Runtime

## Goal

Reduce SDD runtime token consumption by centralizing CLI output selection and deduplicating repeated JSON/text/policy/evidence rendering without changing SDD contracts.

## Problem

Several CLI commands repeat JSON/text branching and some output surfaces still use direct `JSON.stringify`. Runtime renderers also repeat section prose such as decision, evidence, gaps, next actions, artifact rules, and policy guidance. This increases token cost and makes compact output behavior inconsistent across commands.

## Scope

- Normalize target CLI JSON output through shared helpers.
- Add or reuse compact JSON behavior for instructions, run index, sync-back, artifact validate, status, doctor, tasks inspect/route, verify, and run inspect surfaces.
- Deduplicate only output-related code and repeated runtime prose.
- Keep existing schema fields, contract identifiers, status enum, paths, and command semantics stable.

## Non-goals

- No broad unrelated refactor.
- No SDD workflow state-machine change.
- No run-state or artifact schema migration.
- No multilingual runtime output.
- No npm publish, commit, push, reset, or destructive cleanup.

## Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | CLI JSON output surfaces must use the shared JSON formatting path or an equivalent single helper. | Must |
| FR-2 | Commands with compact JSON support must emit valid compact JSON without losing required contract fields. | Must |
| FR-3 | Repeated text sections should be rendered through small shared helpers when that reduces token-heavy duplication. | Must |
| FR-4 | Instruction and artifact evidence prose should avoid repeating full policy text when a concise reference is enough. | Should |
| FR-5 | Existing command behavior and machine-readable JSON keys must remain compatible. | Must |

## Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-1 | `instructions`, `run index`, `sync-back`, and `artifact validate` no longer bypass the shared JSON formatter for normal JSON output. | code inspection / tests | Must |
| AC-2 | `--compact-json` works consistently for the Phase 6.7 target output surfaces where JSON output is available. | CLI smoke / tests | Must |
| AC-3 | Text output still exposes decision/evidence/gaps/next or equivalent execution guidance while reducing repeated boilerplate. | snapshot/contains tests | Must |
| AC-4 | No JSON contract keys, status enum, task IDs, or artifact paths are renamed or localized. | regression tests | Must |
| AC-5 | Full validation passes and installed CLI workflow records artifacts, verify, sync-back, run-index, doctor, package dry-run, and uninstall evidence. | SDD run artifacts | Must |

## Validation commands

```powershell
npm run typecheck
npm test
npm run build
node ./dist/packages/cli/src/main.js status --branch master --compact-json
node ./dist/packages/cli/src/main.js instructions overview --compact-json
node ./dist/packages/cli/src/main.js run index rebuild --compact-json
node ./dist/packages/cli/src/main.js doctor --latest-only
npm pack --dry-run --json
```
