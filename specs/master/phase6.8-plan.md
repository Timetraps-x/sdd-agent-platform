# Phase 6.8 Plan: Project Document Language Runtime

## Metadata

- spec_id: `phase6.8-project-document-language-runtime`
- plan_id: `phase6.8-project-document-language-runtime`
- branch: `master`

## Requirement Trace

| Spec Item | Plan Section | Design Response |
|---|---|---|
| AC-6 | §3 Project Language Contract | Round-trip `docs_language` as one project-level preference. |
| AC-7 | §4 Document Generation | Generate Chinese prose while preserving stable contract terms. |
| AC-8 | §4 Document Generation | Fallback unsupported language to English. |
| AC-9 | §5 Runtime Boundary | Keep CLI/runtime output English. |
| AC-10 | §8 Validation Plan | Validate through installed CLI workflow. |

## 1. Context

`docs_language` already exists in project config assets, but generated SDD markdown prose is still effectively English-only. The runtime must stay English and contract-stable, while project documents should follow the project's chosen prose language.

## 2. Goals and Non-goals

Goals:

- Make `docs_language` a clear project-level SDD document prose preference.
- Generate localized prose for initial spec/plan/tasks scaffolds when configured.
- Preserve machine-readable SDD contracts inside localized documents.

Non-goals:

- No runtime output localization.
- No per-run or per-task language override.
- No parser schema migration.
- No translation of command names, IDs, metadata keys, or status enum.

## 3. Project Language Contract

Touchpoints:

- `schemas/contracts/project-yml-contract.md`
- `templates/project-template.yml`
- `adapters/generic.yml`
- `adapters/java-maven.yml`
- `packages/core/src/index.ts` project config parse/render/defaults

Semantics:

- `docs_language` is project-level.
- `init`, config, chat, and workflow instructions are only entrypoints for setting the same preference.
- The same project should not alternate SDD document languages run-by-run.

## 4. Document Generation

Touchpoints:

- `renderInitSpecDocument`
- `renderInitPlanDocument`
- `renderInitTasksDocument`
- `templates/spec-template.md`
- `templates/plan-template.md`
- `templates/tasks-template.md`

Behavior:

- `zh-CN`: prose is Chinese or bilingual where stable English headings help tooling.
- `en-US` or unsupported: English fallback.
- Always preserve `sdd-task`, `sdd-result`, YAML keys, `AC-*`, `PHASE*`, status enum, artifact paths, and command names.

## 5. Runtime Boundary

Do not localize:

- CLI text output
- JSON output
- generated Claude Code runtime instructions
- contract diagnostics

## 6. Task Breakdown

- `PHASE6.8-1`: clarify project-level `docs_language` contract and config round-trip.
- `PHASE6.8-2`: generate localized SDD document prose while preserving contracts.
- `PHASE6.8-3`: validate installed CLI workflow and evidence.

## 7. Compatibility / Rollback

If localization behavior causes parser risk, fallback to English prose while retaining project-level config semantics. Do not remove `docs_language` or introduce a second language parameter.

## 8. Validation Plan

Run:

```powershell
npm run typecheck
npm test
npm run build
node ./dist/packages/cli/src/main.js status --branch master --compact-json
node ./dist/packages/cli/src/main.js doctor --latest-only
npm pack --dry-run --json
```

Also inspect generated scaffold documents for both default language and `zh-CN` config.
