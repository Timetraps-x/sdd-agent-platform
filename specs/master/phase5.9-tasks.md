# Phase 5.9 Tasks

## Metadata

- phase_id: `5.9`
- plan_id: `phase5.9-task-contract-parser-inspect-plan`
- lifecycle_profile: `full`

## Task List

### P5.9-T1: Surface task evidence fields

```sdd-task
id: P5.9-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
validation:
  - npm test
risk:
  - parser-regression
```

### P5.9-T2: Add parser and inspect tests

```sdd-task
id: P5.9-T2
status: completed
wave: 2
depends_on:
  - P5.9-T1
affected_files:
  - packages/core/src/index.test.ts
validation:
  - npm test
  - npm run build
risk:
  - regression
```
