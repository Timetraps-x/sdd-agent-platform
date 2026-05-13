# Phase 6.8 Tasks: Project Document Language Runtime

## 0. Metadata

- tasks_id: `phase6.8-project-document-language-runtime`
- spec_id: `phase6.8-project-document-language-runtime`
- plan_id: `phase6.8-project-document-language-runtime`
- branch: `master`
- lifecycle_profile: `standard`
- status: `approved`

## 1. Delivery Map

| Task | Spec Acceptance | Plan Section | Boundary Reason |
|---|---|---|---|
| PHASE6.8-1 | AC-6, AC-10 | §3 Project Language Contract | project config contract semantics must be stable before generation |
| PHASE6.8-2 | AC-7, AC-8, AC-9 | §4 Document Generation, §5 Runtime Boundary | document prose localization with runtime/contract boundary |
| PHASE6.8-3 | AC-10 | §8 Validation Plan | installed CLI workflow and sync-back evidence |

## 2. Wave Plan

| Wave | Tasks | Gate |
|---|---|---|
| 1 | PHASE6.8-1 | project config semantics and round-trip tests |
| 2 | PHASE6.8-2 | generated document prose tests and runtime English smoke |
| 3 | PHASE6.8-3 | installed CLI workflow, verify, sync-back, run-index, doctor, uninstall |

## 3. Task List

### PHASE6.8-1: Clarify project-level docs language contract

```sdd-task
id: PHASE6.8-1
status: pending
wave: 1
depends_on:
  - PHASE6.7-3
acceptance_refs:
  - AC-6
  - AC-10
plan_refs:
  - "§3 Project Language Contract"
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

### PHASE6.8-2: Generate document prose from project docs_language

```sdd-task
id: PHASE6.8-2
status: pending
wave: 2
depends_on:
  - PHASE6.8-1
acceptance_refs:
  - AC-7
  - AC-8
  - AC-9
plan_refs:
  - "§4 Document Generation"
  - "§5 Runtime Boundary"
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

### PHASE6.8-3: Validate installed CLI document language workflow

```sdd-task
id: PHASE6.8-3
status: pending
wave: 3
depends_on:
  - PHASE6.8-2
acceptance_refs:
  - AC-10
plan_refs:
  - "§8 Validation Plan"
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

- Phase 6.8 depends on Phase 6.7 because output profile boundaries should be stable before document-language behavior is validated.
- The language model must remain project-level; no per-run override layer is allowed.

## 5. Phase Gate Checkpoint

- ready_for_implementation: `true`
- blockers: []
- required_user_decisions: []
