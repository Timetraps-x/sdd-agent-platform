# Phase 6.7 Tasks: Token Budget and Output Dedup Runtime

## 0. Metadata

- tasks_id: `phase6.7-token-budget-output-dedup-runtime`
- spec_id: `phase6.7-token-budget-output-dedup-runtime`
- plan_id: `phase6.7-token-budget-output-dedup-runtime`
- branch: `master`
- lifecycle_profile: `standard`
- status: `approved`

## 1. Delivery Map

| Task | Spec Acceptance | Plan Section | Boundary Reason |
|---|---|---|---|
| PHASE6.7-1 | AC-1, AC-5 | §1 Context, §7 Task Breakdown | registers executable phase docs and SDD task chain |
| PHASE6.7-2 | AC-1, AC-2, AC-4 | §3 CLI JSON Output, §6 Compatibility | CLI output path change with schema compatibility risk |
| PHASE6.7-3 | AC-3, AC-4, AC-5 | §4 Text Renderer Dedup, §5 Instruction and Evidence Prose | renderer/instruction evidence dedup with token guardrails |

## 2. Wave Plan

| Wave | Tasks | Gate |
|---|---|---|
| 1 | PHASE6.7-1 | phase docs and active task chain inspectable |
| 2 | PHASE6.7-2, PHASE6.7-3 | tests, build, CLI output smoke, installed workflow evidence |

## 3. Task List

### PHASE6.7-1: Register token budget phase docs

```sdd-task
id: PHASE6.7-1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
  - AC-5
plan_refs:
  - "§1 Context"
  - "§7 Task Breakdown"
affected_files:
  - specs/master/phase6.7-spec.md
  - specs/master/phase6.7-plan.md
  - specs/master/phase6.7-tasks.md
  - specs/master/phase6.7-validation.md
  - specs/master/phases/phase-6.7-token-budget-output-dedup-runtime.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/README.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - sdd status --branch master --compact-json
  - sdd tasks inspect PHASE6.7-1 --branch master --json
  - sdd tasks route PHASE6.7-1 --branch master --json
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

- Register retained Phase 6.7 docs and active SDD pointers for the token-budget phase.
- Validate PHASE6.7-1 status, inspect, and route with explicit `--branch master`.
- Preserve prior Phase 6.6 docs and evidence.

Forbidden scope:

- Do not alter runtime code behavior in this task.
- Do not delete or rewrite prior retained phase docs.
- Do not commit, push, publish, reset, or clean unrelated files.

#### Acceptance

- AC-1/AC-5: Phase 6.7 retained docs and active SDD indexes expose PHASE6.7-1.
- `PHASE6.7-1` is inspectable and routable from `specs/master/tasks.md`.
- Phase 6.7 validation starts with document-chain gaps cleared.

### PHASE6.7-2: Normalize CLI JSON and compact output dispatch

```sdd-task
id: PHASE6.7-2
status: pending
wave: 2
depends_on:
  - PHASE6.7-1
acceptance_refs:
  - AC-1
  - AC-2
  - AC-4
plan_refs:
  - "§3 CLI JSON Output"
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

### PHASE6.7-3: Deduplicate renderer and evidence prose

```sdd-task
id: PHASE6.7-3
status: pending
wave: 2
depends_on:
  - PHASE6.7-2
acceptance_refs:
  - AC-3
  - AC-4
  - AC-5
plan_refs:
  - "§4 Text Renderer Dedup"
  - "§5 Instruction and Evidence Prose"
  - "§8 Validation Plan"
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

## 4. Dependency Notes

- PHASE6.7-2 and PHASE6.7-3 must not broaden into unrelated cleanup.
- Existing uncommitted changes must not block workflow execution; use explicit `--branch master`.

## 5. Phase Gate Checkpoint

- ready_for_implementation: `true`
- blockers: []
- required_user_decisions: []
