# Phase 6.7 Plan: Token Budget and Output Dedup Runtime

## Metadata

- spec_id: `phase6.7-token-budget-output-dedup-runtime`
- plan_id: `phase6.7-token-budget-output-dedup-runtime`
- branch: `master`

## Requirement Trace

| Spec Item | Plan Section | Design Response |
|---|---|---|
| AC-1 | §3 CLI JSON Output | Use shared JSON output helpers for previously direct JSON surfaces. |
| AC-2 | §3 CLI JSON Output | Normalize compact JSON behavior across target commands. |
| AC-3 | §4 Text Renderer Dedup | Extract only small repeated text helpers. |
| AC-4 | §6 Compatibility | Preserve all machine-readable fields. |
| AC-5 | §8 Validation Plan | Validate with tests, build, installed CLI workflow, sync-back, run-index, doctor, uninstall. |

## 1. Context

Phase 6.6 proved installed CLI workflow usability but exposed token cost in status, doctor, run-index, instructions, artifact validation, and repeated evidence prose. Phase 6.7 turns that into a runtime output concern rather than a documentation-only concern.

## 2. Goals and Non-goals

Goals:

- Centralize CLI JSON formatting and compact JSON handling.
- Remove output-related duplication where it increases token volume or inconsistent behavior.
- Keep output schemas and command behavior stable.
- Prepare a cleaner output layer for Phase 6.8 document-language work.

Non-goals:

- Do not rewrite the dispatcher architecture.
- Do not change core state or artifact contracts.
- Do not localize runtime output.
- Do not clean unrelated code.

## 3. CLI JSON Output

Primary file: `packages/cli/src/main.ts`.

Reuse existing helpers:

- `wantsJson(args)`
- `jsonOutput(value, args)`

Add a narrow helper such as `emitTextOrJson(args, value, renderText)` to remove repeated branches. Migrate direct JSON serialization for instructions, run index, sync-back, and artifact validate so compact JSON behavior is consistent.

## 4. Text Renderer Dedup

Review and minimally deduplicate:

- `renderProjectStatus`
- `renderLocalRunIndex`
- `renderLocalRunIndexInspection`
- `renderRunInspection`
- `renderSyncBackInspection`
- `renderAgentRouterDecision`
- `renderArtifactValidationReport`

Allowed helpers include section rendering for `decision`, `evidence`, `gaps`, `next`, list caps, and repeated artifact validation wording.

## 5. Instruction and Evidence Prose

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

## 7. Task Breakdown

- `PHASE6.7-1`: register phase docs and active task chain.
- `PHASE6.7-2`: implement shared CLI JSON/output dispatch.
- `PHASE6.7-3`: deduplicate renderer/instruction/artifact evidence prose and add guardrail tests.

## 8. Validation Plan

Run:

```powershell
npm run typecheck
npm test
npm run build
node ./dist/packages/cli/src/main.js status --branch master --compact-json
node ./dist/packages/cli/src/main.js instructions overview --compact-json
node ./dist/packages/cli/src/main.js run index rebuild --compact-json
node ./dist/packages/cli/src/main.js artifact validate <run_id> artifacts/validation-PHASE6.7-3.md --task PHASE6.7-3 --agent validator --compact-json
node ./dist/packages/cli/src/main.js doctor --latest-only
npm pack --dry-run --json
```
