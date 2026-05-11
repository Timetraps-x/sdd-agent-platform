# Phase 6.8 Spec: Project Document Language Runtime

## Goal

Allow SDD markdown document prose to follow one project-level `docs_language` preference while keeping runtime output, contracts, JSON keys, status enum, fenced block names, task IDs, artifact paths, command names, and numbers stable.

## Problem

The project already has `docs_language`, but generated SDD documents and templates do not consistently consume it. At the same time, runtime output must remain stable English for automation. The language model must not become per-run or per-task, because one project should not alternate SDD document language between workflow runs.

## Scope

- Clarify `docs_language` as one project-level document prose language parameter.
- Support `zh-CN` document prose generation for spec/plan/tasks scaffolds.
- Preserve English/stable contract elements inside localized markdown documents.
- Keep runtime CLI/JSON output English and contract-stable.
- Validate config round-trip and generated document scaffolds.

## Non-goals

- No runtime CLI localization.
- No per-run, per-task, or per-document language override layer.
- No translation of `sdd-task`, `sdd-result`, metadata keys, status values, artifact paths, command names, or IDs.
- No change to parser semantics.
- No npm publish, commit, push, reset, or destructive cleanup.

## Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | `docs_language` must remain a single project-level parameter. | Must |
| FR-2 | `init`/config/chat/workflow entrypoints must be modeled as ways to set the same project preference, not ephemeral overrides. | Must |
| FR-3 | `docs_language: zh-CN` must produce Chinese prose in generated SDD markdown scaffolds. | Must |
| FR-4 | Generated docs must preserve stable English contract terms and Arabic numerals. | Must |
| FR-5 | Runtime CLI/JSON output must remain English regardless of `docs_language`. | Must |

## Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-6 | Project config parse/render round-trips `docs_language` with project-level semantics. | unit test | Must |
| AC-7 | `zh-CN` init/scaffold output contains Chinese prose for spec/plan/tasks while preserving `sdd-task`, metadata keys, `AC-*`, status enum, command names, and artifact paths. | fixture inspection / tests | Must |
| AC-8 | `en-US` or unsupported language safely generates English prose. | tests | Must |
| AC-9 | CLI runtime output remains English under `docs_language: zh-CN`. | CLI smoke | Must |
| AC-10 | Installed CLI workflow verifies Phase 6.8 and sync-back evidence without introducing per-run language state. | SDD run artifacts | Must |

## Validation commands

```powershell
npm run typecheck
npm test
npm run build
node ./dist/packages/cli/src/main.js status --branch master --compact-json
node ./dist/packages/cli/src/main.js doctor --latest-only
npm pack --dry-run --json
```
