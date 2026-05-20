# Phase 8.1 Tasks — Verifies-Centered Lifecycle and Agent-Team Separation

## PHASE8.1-1 — Align lifecycle stages

```sdd-task
id: PHASE8.1-1
status: completed
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
  - AC-2
  - AC-3
affected_files:
  - packages/core/src/contracts.ts
  - packages/core/src/risk/kernel.ts
  - packages/core/src/risk/legacy-adapters.ts
  - packages/core/src/orchestration/runtime.ts
  - packages/core/src/stage-runtime/runtime.ts
validation:
  - node --test --import tsx packages/core/src/phase8-risk-kernel.test.ts packages/core/src/phase8-projection-compat.test.ts packages/core/src/phase8-contracts.test.ts
  - node --test --import tsx packages/core/src/stage-runtime/runtime.test.ts packages/core/src/orchestration/runtime.test.ts
risk:
  - workflow
  - source-boundary
allowed_agents:
  - implementer
  - validator
```

### Acceptance

- Direct remains `do/test`.
- Compact/full include `verifies` and `goal-verify`.
- Test handoff moves to `goal-verify` before `sync-back`.

## PHASE8.1-2 — Add verify contract role separation

```sdd-task
id: PHASE8.1-2
status: completed
wave: 1
depends_on:
  - PHASE8.1-1
acceptance_refs:
  - AC-4
  - AC-5
affected_files:
  - packages/core/src/verification/verify-contract.ts
  - packages/core/src/verification/verify-contract.test.ts
validation:
  - node --test --import tsx packages/core/src/verification/verify-contract.test.ts
risk:
  - workflow
allowed_agents:
  - verification-designer
  - validator
```

### Acceptance

- Generated `verify.md` declares `verification-designer` ownership.
- Generated `verify.md` declares independence from `task-planner` and `implementer`.
- Inspection warns on missing or wrong metadata.

## PHASE8.1-3 — Make /sdd:test advance verifies

```sdd-task
id: PHASE8.1-3
status: completed
wave: 2
depends_on:
  - PHASE8.1-2
acceptance_refs:
  - AC-6
  - AC-7
  - AC-8
  - AC-9
affected_files:
  - packages/core/src/verification/test-runtime.ts
  - packages/core/src/verification/test-runtime.test.ts
validation:
  - node --test --import tsx packages/core/src/verification/test-runtime.test.ts
risk:
  - workflow
  - evidence
allowed_agents:
  - implementer
  - validator
```

### Acceptance

- Missing `verify.md` is created by `/sdd:test` before commands run.
- Stale/warn `verify.md` is refreshed and re-inspected.
- Remaining verifies blockers stop test execution.
- Result records verify action.

## PHASE8.1-4 — Run real /sdd validation cases

```sdd-task
id: PHASE8.1-4
status: completed
wave: 3
depends_on:
  - PHASE8.1-3
acceptance_refs:
  - AC-10
affected_files:
  - specs/master/phase8.1-validation.md
validation:
  - npm pack --dry-run --json
  - sdd test task <task> --branch master
  - sdd sync-back inspect --branch master --task <task>
  - sdd tasks route <task> --branch master --json
  - sdd ship --dry-run --branch master --json
risk:
  - workflow
allowed_agents:
  - validator
```

### Acceptance

- Validation uses installed package in a temp project.
- Evidence checks behavior and artifacts, not only exit code.
- Failures are turned into follow-up implementation fixes before completion.
