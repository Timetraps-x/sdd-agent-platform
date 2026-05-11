# Phase 5.3 Tasks

## Metadata

- phase_id: `5.3`
- plan_id: `phase5.3-task-graph-run-evidence-harness-plan`
- lifecycle_profile: `full`

## Task List

### P5.3-T1: Extend task graph metadata

```sdd-task
id: P5.3-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
  - specs/master/phase5.3-tasks.md
validation:
  - npm test
  - npm run build
risk:
  - task-graph
```

### P5.3-T2: Standardize run evidence contract

```sdd-task
id: P5.3-T2
status: completed
wave: 2
depends_on:
  - P5.3-T1
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm test
  - npm run build
risk:
  - runtime-evidence
```

### P5.3-T3: Normalize verifier states

```sdd-task
id: P5.3-T3
status: completed
wave: 3
depends_on:
  - P5.3-T2
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm test
  - npm run build
risk:
  - validation-contract
```
