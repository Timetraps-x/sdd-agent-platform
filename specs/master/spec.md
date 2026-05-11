---
contract: sdd-spec-doc-v1
---

# Spec: Token Budget and Project Document Language Runtime

## 0. Metadata

- spec_id: `phase6.7-6.8-output-document-language-runtime`
- branch: `master`
- lifecycle_profile: `standard`
- source_request: `token consumption optimization and project-level SDD document language`
- status: `approved`
- retained_specs:
  - `phase6.7-spec.md`
  - `phase6.8-spec.md`

## 1. Objective / Customer Value

- User value: SDD CLI output becomes less token-expensive and more consistent, while generated project documents can use the project's chosen prose language.
- Engineering value: runtime output stays English and contract-stable; document prose localization is isolated to project scaffold generation.
- Observable success: Phase 6.7 and Phase 6.8 tasks are inspectable, routed, validated, and backed by retained phase evidence.

## 2. Problem / Intent

Phase 6.6 proved real installed workflow usability, but status, doctor, run-index, instruction, artifact validation, and evidence renderers still contain repeated output paths that increase token cost and create inconsistent compact JSON behavior. The project also has `docs_language`, but generated SDD markdown prose does not consistently consume it. Runtime output must stay stable English for automation, while project documents should follow one project-level prose preference.

## 3. Scope

### Phase 6.7 In Scope

- Centralize CLI JSON formatting and compact JSON handling for direct JSON surfaces.
- Reduce repeated text output where duplication affects token volume or output consistency.
- Deduplicate repeated instruction/evidence prose without changing policy meaning.
- Preserve JSON schemas, task IDs, status enum, artifact paths, command names, and default command semantics.

### Phase 6.8 In Scope

- Clarify `docs_language` as one project-level SDD document prose preference.
- Generate localized prose for initial spec/plan/tasks scaffolds when configured.
- Support `zh-CN` document prose generation while preserving stable English contract terms.
- Keep runtime CLI text, JSON output, diagnostics, and generated runtime instructions English.

### Out of Scope

- No broad dispatcher rewrite or unrelated cleanup.
- No runtime output localization.
- No per-run, per-task, or per-document language override layer.
- No parser schema migration.
- No translation of `sdd-task`, `sdd-result`, metadata keys, status values, artifact paths, command names, or IDs.
- No npm publish, commit, push, reset, or destructive cleanup.

## 4. Requirements

### Phase 6.7 Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-6.7-1 | CLI JSON output paths for instructions, run index, sync-back, and artifact validation must use shared formatting helpers. | Must |
| FR-6.7-2 | `--compact-json` behavior must be consistent for targeted JSON commands. | Must |
| FR-6.7-3 | Repeated text renderer sections should be deduplicated where it reduces token volume without changing meaning. | Must |
| FR-6.7-4 | Runtime output contracts must remain schema-compatible and English. | Must |

### Phase 6.8 Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-6.8-1 | `docs_language` must remain a single project-level parameter. | Must |
| FR-6.8-2 | `init`/config/chat/workflow entrypoints must be modeled as ways to set the same project preference, not ephemeral overrides. | Must |
| FR-6.8-3 | `docs_language: zh-CN` must produce Chinese prose in generated SDD markdown scaffolds. | Must |
| FR-6.8-4 | Generated docs must preserve stable English contract terms and Arabic numerals. | Must |
| FR-6.8-5 | Runtime CLI/JSON output must remain English regardless of `docs_language`. | Must |

## 5. Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-1 | Direct CLI JSON surfaces use shared JSON output helpers and preserve schemas. | unit/CLI tests | Must |
| AC-2 | `--compact-json` produces parseable compact JSON for targeted commands. | CLI smoke | Must |
| AC-3 | Text output preserves required decision/evidence/gaps/next information with less repeated boilerplate. | tests / fixture inspection | Must |
| AC-4 | Machine-readable fields remain unchanged and runtime output remains English. | regression tests | Must |
| AC-5 | Phase 6.7 validates through tests, build, CLI smoke, package dry-run, and SDD workflow evidence. | validation artifacts | Must |
| AC-6 | Project config parse/render round-trips `docs_language` with project-level semantics. | unit test | Must |
| AC-7 | `zh-CN` init/scaffold output contains Chinese prose for spec/plan/tasks while preserving stable contract terms. | fixture inspection / tests | Must |
| AC-8 | `en-US` or unsupported language safely generates English prose. | tests | Must |
| AC-9 | CLI runtime output remains English under `docs_language: zh-CN`. | CLI smoke | Must |
| AC-10 | Installed CLI workflow verifies Phase 6.8 and sync-back evidence without introducing per-run language state. | SDD run artifacts | Must |

## 6. Assumptions / Dependencies

| Item | Description | Impact if Wrong |
|---|---|---|
| Phase 6.6 complete | Documentation IA and installed workflow evidence are complete | Phase 6.7/6.8 task chain lacks stable predecessor evidence |
| Existing project config has `docs_language` | Phase 6.8 should clarify and consume it, not create another field | Introducing a second field would drift from project-level language semantics |
| Runtime output is automation-facing | CLI text/JSON should stay English and contract-stable | Localized runtime output could break scripts and tests |

## 7. Risks / Hard Gates

| Risk | Why it matters | Required Handling |
|---|---|---|
| token_budget_regression | dedup work could accidentally increase output size or duplicate sections | targeted tests and output inspection |
| cli_output_contract_drift | shared helpers could alter JSON fields or formatting semantics | schema-compatible regression tests |
| language_boundary_drift | document localization could leak into runtime output or contracts | explicit tests for runtime English and preserved contract terms |
| config_contract_drift | docs language could become per-run instead of project-level | round-trip config tests and no override layer |

## 8. Lifecycle Decision Reference

- decision_artifact: `specs/master/phases/phase-6.7-token-budget-output-dedup-runtime.md`
- followup_artifact: `specs/master/phases/phase-6.8-project-document-language-runtime.md`
- canonical_model: `docs/architecture/lifecycle-decision-model.md`
- recommended_profile: `standard`
- risk_signals: [`token_budget_regression`, `cli_output_contract_drift`, `language_boundary_drift`]
- autonomy_ceiling: `direct_execution_allowed`
