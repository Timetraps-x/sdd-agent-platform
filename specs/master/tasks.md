---
contract: sdd-tasks-doc-v1
---

# Tasks: Token Budget and Project Document Language Runtime

## 0. Metadata

- tasks_id: `phase6.7-6.8-output-document-language-runtime`
- spec_id: `phase6.7-6.8-output-document-language-runtime`
- plan_id: `phase6.7-6.8-output-document-language-runtime`
- branch: `master`
- lifecycle_profile: `standard`
- status: `approved`
- retained_tasks:
  - `phase6.7-tasks.md`
  - `phase6.8-tasks.md`

## 1. Delivery Map

| Task | Spec Acceptance | Plan Section | Boundary Reason |
|---|---|---|---|
| PHASE6.7-1 | AC-1, AC-5 | §3 Phase 6.7 CLI JSON Output, §10 Validation Plan | active task chain and retained docs must be registered before runtime changes |
| PHASE6.7-2 | AC-1, AC-2, AC-4 | §3 Phase 6.7 CLI JSON Output, §6 Compatibility | CLI output path change with schema compatibility risk |
| PHASE6.7-3 | AC-3, AC-4, AC-5 | §4 Text Renderer Dedup, §5 Instruction and Evidence Prose | renderer/instruction evidence dedup with token guardrails |
| PHASE6.8-1 | AC-6, AC-10 | §7 Phase 6.8 Project Language Contract | project config contract semantics must be stable before generation |
| PHASE6.8-2 | AC-7, AC-8, AC-9 | §8 Phase 6.8 Document Generation, §9 Runtime Boundary | document prose localization with runtime/contract boundary |
| PHASE6.8-3 | AC-10 | §10 Validation Plan | installed CLI workflow and sync-back evidence |

## 2. Wave Plan

| Wave | Tasks | Gate |
|---|---|---|
| 1 | PHASE6.7-1 | phase docs and active task chain inspectable |
| 2 | PHASE6.7-2, PHASE6.7-3 | output dedup tests, build, CLI output smoke |
| 3 | PHASE6.8-1 | project config semantics and round-trip tests |
| 4 | PHASE6.8-2 | generated document prose tests and runtime English smoke |
| 5 | PHASE6.8-3 | installed CLI workflow, verify, sync-back, run-index, doctor, uninstall |

## 3. Task List

### PHASE6.7-1: Register token budget phase docs

```sdd-task
id: PHASE6.7-1
status: completed
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
  - AC-5
plan_refs:
  - "§1 Background / Context"
  - "§11 Task Breakdown Rationale"
affected_files:
  - specs/master/phase6.7-spec.md
  - specs/master/phase6.7-plan.md
  - specs/master/phase6.7-tasks.md
  - specs/master/phase6.7-validation.md
  - specs/master/phase6.8-spec.md
  - specs/master/phase6.8-plan.md
  - specs/master/phase6.8-tasks.md
  - specs/master/phase6.8-validation.md
  - specs/master/phases/phase-6.7-token-budget-output-dedup-runtime.md
  - specs/master/phases/phase-6.8-project-document-language-runtime.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/README.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - node ./dist/packages/cli/src/main.js status --branch master --compact-json
  - node ./dist/packages/cli/src/main.js tasks inspect PHASE6.7-1 --branch master --json
  - node ./dist/packages/cli/src/main.js tasks route PHASE6.7-1 --branch master --json
risk:
  - document_chain_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.7-1.md
  - artifacts/review-PHASE6.7-1.md
  - artifacts/validation-PHASE6.7-1.md
verification_availability:
  - inspect:specs/master/tasks.md
  - inspect:sdd status --branch master
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Register retained Phase 6.7/6.8 docs and active index pointers.
- Validate active PHASE6.7-1 status, inspect, and route with explicit `--branch master`.
- Preserve completed Phase 6.6 docs and evidence.

Forbidden scope:

- Do not alter runtime code behavior in this task.
- Do not delete or rewrite prior retained phase docs.
- Do not commit, push, publish, reset, or clean unrelated files.

#### Acceptance

- AC-1/AC-5: Active `spec.md`, `plan.md`, `tasks.md`, validation index, phase index, and phase status expose the PHASE6.7/PHASE6.8 chain.
- `PHASE6.7-1` is inspectable and routable from `specs/master/tasks.md` using the built CLI.
- Phase 6.7/6.8 retained spec, plan, tasks, validation, and phase artifacts exist.

#### Implementation Notes

- Sync-back applied from run `20260511-007` (2026-05-11T11:27:39.438Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.7-1.md`, `artifacts/validation-PHASE6.7-1.md`, `artifacts/acceptance-coverage-PHASE6.7-1.md`.

### PHASE6.7-2: Normalize CLI JSON and compact output dispatch

```sdd-task
id: PHASE6.7-2
status: completed
wave: 2
depends_on:
  - PHASE6.7-1
acceptance_refs:
  - AC-1
  - AC-2
  - AC-4
plan_refs:
  - "§3 Phase 6.7 CLI JSON Output"
  - "§6 Compatibility"
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js instructions overview --compact-json
  - node ./dist/packages/cli/src/main.js run index rebuild --compact-json
  - node ./dist/packages/cli/src/main.js sync-back inspect --task PHASE6.7-2 --branch master --compact-json
risk:
  - cli_output_contract_drift
  - token_budget_regression
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.7-2.md
  - artifacts/review-PHASE6.7-2.md
  - artifacts/validation-PHASE6.7-2.md
verification_availability:
  - inspect:packages/cli/src/main.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Update CLI JSON dispatch paths for instructions, run-index, sync-back, and artifact validation.
- Add only narrow output helpers needed to share JSON/compact formatting.
- Add regression tests for targeted compact JSON surfaces.

Forbidden scope:

- Do not change JSON schemas, keys, status enum, artifact paths, task IDs, or command names.
- Do not rewrite the CLI dispatcher architecture.
- Do not localize runtime output.

#### Acceptance

- AC-1: Targeted direct JSON surfaces use shared JSON formatting helpers.
- AC-2: Targeted commands emit parseable compact JSON with `--compact-json`.
- AC-4: Existing JSON fields and English runtime semantics remain compatible.

#### Implementation Notes

- Sync-back applied from run `20260511-010` (2026-05-11T11:47:30.952Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.7-2.md`, `artifacts/validation-PHASE6.7-2.md`, `artifacts/acceptance-coverage-PHASE6.7-2.md`.

### PHASE6.7-3: Deduplicate renderer and evidence prose

```sdd-task
id: PHASE6.7-3
status: completed
wave: 2
depends_on:
  - PHASE6.7-2
acceptance_refs:
  - AC-3
  - AC-4
  - AC-5
plan_refs:
  - "§4 Phase 6.7 Text Renderer Dedup"
  - "§5 Phase 6.7 Instruction and Evidence Prose"
  - "§10 Validation Plan"
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/index.ts
  - packages/core/src/instructions.ts
  - packages/core/src/index.test.ts
  - specs/master/phase6.7-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js status --branch master --compact-json
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js artifact validate <run_id> artifacts/validation-PHASE6.7-3.md --task PHASE6.7-3 --agent validator --compact-json
  - npm pack --dry-run --json
risk:
  - cli_output_contract_drift
  - token_budget_regression
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.7-3.md
  - artifacts/review-PHASE6.7-3.md
  - artifacts/validation-PHASE6.7-3.md
verification_availability:
  - inspect:packages/core/src/instructions.ts
  - inspect:packages/core/src/index.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Deduplicate renderer/instruction/evidence prose only where repetition affects token volume or output consistency.
- Preserve decision/evidence/gaps/next content and policy meaning.
- Record Phase 6.7 validation evidence after tests and CLI smoke pass.

Forbidden scope:

- Do not perform unrelated cleanup or broad renderer rewrites.
- Do not remove required human-readable evidence sections.
- Do not change machine-readable contracts or runtime localization boundaries.

#### Acceptance

- AC-3: Text output keeps required decision/evidence/gaps/next information with reduced repeated boilerplate.
- AC-4: Machine-readable contracts and English runtime output remain stable.
- AC-5: Typecheck, tests, build, CLI smoke, package dry-run, and SDD evidence are recorded for Phase 6.7.

#### Implementation Notes

- Sync-back applied from run `20260511-011` (2026-05-11T11:48:46.873Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.7-3.md`, `artifacts/validation-PHASE6.7-3.md`, `artifacts/acceptance-coverage-PHASE6.7-3.md`.

### PHASE6.8-1: Clarify project-level docs language contract

```sdd-task
id: PHASE6.8-1
status: completed
wave: 3
depends_on:
  - PHASE6.7-3
acceptance_refs:
  - AC-6
  - AC-10
plan_refs:
  - "§7 Phase 6.8 Project Language Contract"
affected_files:
  - schemas/contracts/project-yml-contract.md
  - templates/project-template.yml
  - adapters/generic.yml
  - adapters/java-maven.yml
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk:
  - config_contract_drift
  - language_boundary_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.8-1.md
  - artifacts/review-PHASE6.8-1.md
  - artifacts/validation-PHASE6.8-1.md
verification_availability:
  - inspect:schemas/contracts/project-yml-contract.md
  - inspect:packages/core/src/index.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Clarify `docs_language` semantics in project config contracts, templates, adapters, and config round-trip code.
- Treat init/config/chat/workflow as entrypoints for the same project-level preference.
- Add tests for parse/render round-trip behavior.

Forbidden scope:

- Do not introduce per-run, per-task, or per-document language overrides.
- Do not add a second language field.
- Do not localize runtime CLI/JSON output.

#### Acceptance

- AC-6: Project config parse/render round-trips `docs_language`.
- AC-10: The contract states document language is project-level and has no per-run override layer.
- Config template and adapter defaults describe the same project-level semantics.

#### Implementation Notes

- Sync-back applied from run `20260511-012` (2026-05-11T11:51:01.690Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.8-1.md`, `artifacts/validation-PHASE6.8-1.md`, `artifacts/acceptance-coverage-PHASE6.8-1.md`.

### PHASE6.8-2: Generate document prose from project docs_language

```sdd-task
id: PHASE6.8-2
status: completed
wave: 4
depends_on:
  - PHASE6.8-1
acceptance_refs:
  - AC-7
  - AC-8
  - AC-9
plan_refs:
  - "§8 Phase 6.8 Document Generation"
  - "§9 Runtime Boundary"
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
  - templates/spec-template.md
  - templates/plan-template.md
  - templates/tasks-template.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js status --branch master --compact-json
  - node ./dist/packages/cli/src/main.js doctor --latest-only
risk:
  - parser_contract_drift
  - language_boundary_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.8-2.md
  - artifacts/review-PHASE6.8-2.md
  - artifacts/validation-PHASE6.8-2.md
verification_availability:
  - inspect:templates/spec-template.md
  - inspect:packages/core/src/index.ts
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Generate localized initial spec/plan/tasks prose from project `docs_language`.
- Preserve `sdd-task`, `sdd-result`, YAML keys, IDs, status enum, artifact paths, command names, and Arabic numerals.
- Add tests for `zh-CN`, `en-US`, unsupported fallback, and runtime English output.

Forbidden scope:

- Do not translate contract identifiers or parser-sensitive fields.
- Do not localize CLI/runtime text, JSON output, diagnostics, or generated runtime instructions.
- Do not change parser semantics.

#### Acceptance

- AC-7: `zh-CN` scaffolds contain Chinese prose while preserving stable contract terms.
- AC-8: `en-US` and unsupported language values generate English fallback prose.
- AC-9: CLI runtime output remains English under `docs_language: zh-CN`.

#### Implementation Notes

- Sync-back applied from run `20260511-013` (2026-05-11T11:55:14.755Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.8-2.md`, `artifacts/validation-PHASE6.8-2.md`, `artifacts/acceptance-coverage-PHASE6.8-2.md`.

### PHASE6.8-3: Validate installed CLI document language workflow

```sdd-task
id: PHASE6.8-3
status: completed
wave: 5
depends_on:
  - PHASE6.8-2
acceptance_refs:
  - AC-10
plan_refs:
  - "§10 Validation Plan"
affected_files:
  - specs/master/phase6.8-validation.md
  - specs/master/tasks.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - npm pack --dry-run --json
  - sdd --version
  - sdd status --branch master --compact-json
  - sdd tasks inspect PHASE6.8-3 --branch master --json
  - sdd tasks route PHASE6.8-3 --branch master --json
  - sdd do task PHASE6.8-3 --branch master --run <run_id> --implement-artifact artifacts/implement-PHASE6.8-3.md --review-artifact artifacts/review-PHASE6.8-3.md --validation-artifact artifacts/validation-PHASE6.8-3.md
  - sdd verify task PHASE6.8-3 --branch master --run <run_id>
  - sdd sync-back inspect <run_id> --task PHASE6.8-3 --branch master
  - sdd run index rebuild --json
  - sdd doctor --latest-only
risk:
  - workflow_validation_drift
  - package_smoke_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.8-3.md
  - artifacts/review-PHASE6.8-3.md
  - artifacts/validation-PHASE6.8-3.md
verification_availability:
  - inspect:sdd status --branch master
  - inspect:sdd doctor --latest-only
  - inspect:npm test
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Validate Phase 6.8 with installed CLI workflow evidence after implementation passes local checks.
- Record do/verify/sync-back/run-index/doctor/package/uninstall evidence in Phase 6.8 validation artifacts.
- Keep explicit `--branch master` for repository workflows with uncommitted changes.

Forbidden scope:

- Do not publish to npm.
- Do not commit, push, reset, force clean, or destructively alter repository state.
- Do not introduce per-run language state during workflow validation.

#### Acceptance

- AC-10: Installed CLI workflow verifies PHASE6.8-3 and sync-back evidence without per-run language state.
- Package dry-run, run-index, doctor, and uninstall evidence are recorded.
- Active task status can be updated only after PASS evidence is available.

## 4. Dependency Notes

- PHASE6.7-2 and PHASE6.7-3 must not broaden into unrelated cleanup.
- Phase 6.8 depends on Phase 6.7 because output profile boundaries should be stable before document-language behavior is validated.
- The language model must remain project-level; no per-run override layer is allowed.
- Existing uncommitted changes must not block workflow execution; use explicit `--branch master`.

## 5. Phase Gate Checkpoint

- ready_for_implementation: `true`
- blockers: []
- required_user_decisions: []

#### Implementation Notes

- Sync-back applied from run `20260511-005` (2026-05-11T11:14:42.369Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.8-3.md`, `artifacts/validation-PHASE6.8-3.md`, `artifacts/acceptance-coverage-PHASE6.8-3.md`.
