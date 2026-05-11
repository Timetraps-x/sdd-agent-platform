---
contract: sdd-plan-doc-v1
---

# Plan: Token Budget and Project Document Language Runtime

## Metadata

- spec_id: `phase6.7-6.8-output-document-language-runtime`
- plan_id: `phase6.7-6.8-output-document-language-runtime`
- branch: `master`
- retained_plans:
  - `phase6.7-plan.md`
  - `phase6.8-plan.md`

## 0.1 Requirement Trace

| Spec Item | Plan Section | Design Response |
|---|---|---|
| AC-1 | §3 Phase 6.7 CLI JSON Output | Use shared JSON output helpers for previously direct JSON surfaces. |
| AC-2 | §3 Phase 6.7 CLI JSON Output | Normalize compact JSON behavior across target commands. |
| AC-3 | §4 Phase 6.7 Text Renderer Dedup | Extract only output/token-related repeated text helpers. |
| AC-4 | §6 Compatibility | Preserve all machine-readable fields and English runtime wording. |
| AC-5 | §8 Validation Plan | Validate with tests, build, package dry-run, and SDD workflow evidence. |
| AC-6 | §9 Phase 6.8 Project Language Contract | Round-trip `docs_language` as one project-level preference. |
| AC-7 | §10 Phase 6.8 Document Generation | Generate Chinese prose while preserving stable contract terms. |
| AC-8 | §10 Phase 6.8 Document Generation | Fallback unsupported language to English. |
| AC-9 | §11 Runtime Boundary | Keep CLI/runtime output English. |
| AC-10 | §8 Validation Plan | Validate through installed CLI workflow. |

## 1. Background / Context

Phase 6.6 completed the documentation IA and installed workflow evidence. Phase 6.7 now addresses token-heavy runtime output and duplicated output paths. Phase 6.8 then consumes the cleaner output boundary to make SDD document prose language project-configurable without localizing runtime output.

## 2. Goals and Non-goals

Goals:

- Centralize CLI JSON formatting and compact JSON handling.
- Remove output-related duplication where it increases token volume or inconsistent behavior.
- Keep output schemas and runtime wording stable.
- Make `docs_language` a clear project-level SDD document prose preference.
- Generate localized initial SDD document prose for configured projects.

Non-goals:

- Do not rewrite the CLI dispatcher architecture.
- Do not change core state or artifact contracts.
- Do not localize runtime output.
- Do not introduce per-run or per-task language overrides.
- Do not clean unrelated code.

## 3. Phase 6.7 CLI JSON Output

Primary file: `packages/cli/src/main.ts`.

Reuse existing helpers:

- `wantsJson(args)`
- `jsonOutput(value, args)`

Add a narrow helper such as `emitTextOrJson(args, value, renderText)` to remove repeated branches. Migrate direct JSON serialization for instructions, run index, sync-back, and artifact validate so compact JSON behavior is consistent.

## 4. Phase 6.7 Text Renderer Dedup

Review and minimally deduplicate:

- `renderProjectStatus`
- `renderLocalRunIndex`
- `renderLocalRunIndexInspection`
- `renderRunInspection`
- `renderSyncBackInspection`
- `renderAgentRouterDecision`
- `renderArtifactValidationReport`

Allowed helpers include section rendering for `decision`, `evidence`, `gaps`, `next`, list caps, and repeated artifact validation wording.

## 5. Phase 6.7 Instruction and Evidence Prose

Review:

- `packages/core/src/instructions.ts` `renderSddInstructions`
- `packages/core/src/index.ts` `renderGoalVerifyResult`
- `packages/core/src/index.ts` `renderTaskInspect`
- `packages/core/src/index.ts` `renderDoctorReport`

Only extract repeated output prose that affects token cost. Preserve policy meaning and English runtime wording.

## 6. Compatibility

Keep stable:

- JSON keys
- contract IDs
- task IDs
- status enum
- artifact paths
- command names
- default command semantics

## 7. Phase 6.8 Project Language Contract

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

## 8. Phase 6.8 Document Generation

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

## 9. Runtime Boundary

Do not localize:

- CLI text output
- JSON output
- generated Claude Code runtime instructions
- contract diagnostics

## 10. Validation Plan

Run:

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

Also inspect generated scaffold documents for default language and `zh-CN` config, then complete the installed CLI workflow for PHASE6.8-3.

## 11. Task Breakdown Rationale

Phase 6.7 runs first because compact JSON/output dedup boundaries should be stable before Phase 6.8 verifies runtime English behavior. Phase 6.8 then validates project-level document prose language without creating per-run language state.

## 12. Gaps / Assumptions

- Existing uncommitted changes must not block workflow execution; use explicit `--branch master`.
- If localization creates parser risk, keep fallback English prose while retaining project-level config semantics.

## Phase Gate Checkpoint

- ready_for_tasks: `true`
- blockers: []
- required_user_decisions: []
