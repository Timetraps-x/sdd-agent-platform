# Phase 5.4 Tasks

## Metadata

- phase_id: `5.4`
- plan_id: `phase5.4-managed-assets-query-status-harness-plan`
- lifecycle_profile: `full`

## Task List

### P5.4-T1: Harden managed asset manifest

```sdd-task
id: P5.4-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/ai-tools.ts
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm test
  - npm run build
risk:
  - managed-assets
```

### P5.4-T2: Implement doctor drift categories

```sdd-task
id: P5.4-T2
status: completed
wave: 2
depends_on:
  - P5.4-T1
affected_files:
  - packages/core/src/ai-tools.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm test
  - npm run build
risk:
  - doctor-drift
```

### P5.4-T3: Implement QueryStatusContract output boundaries

```sdd-task
id: P5.4-T3
status: completed
wave: 3
depends_on:
  - P5.4-T2
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - docs/architecture/command-information-architecture.md
validation:
  - npm test
  - npm run build
risk:
  - query-boundary
  - output-overlap
```
