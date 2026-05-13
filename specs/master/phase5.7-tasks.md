# Phase 5.7 Tasks

## Metadata

- phase_id: `5.7`
- plan_id: `phase5.7-hardening-regression-gate-plan`
- lifecycle_profile: `full`

## Task List

### P5.7-T1: Add hardening regression gate documents

```sdd-task
id: P5.7-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/master/phases/phase-5.7-hardening-regression-gate.md
  - specs/master/phase5.7-spec.md
  - specs/master/phase5.7-plan.md
  - specs/master/phase5.7-tasks.md
  - specs/master/phase5.7-validation.md
  - specs/master/phases/README.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - npm test
  - npm run build
risk:
  - documentation
```

### P5.7-T2: Expose agent participation narrative

```sdd-task
id: P5.7-T2
status: completed
wave: 2
depends_on:
  - P5.7-T1
affected_files:
  - packages/core/src/ai-tools.ts
  - packages/core/src/instructions.ts
validation:
  - npm test
  - npm run build
risk:
  - generated-entry-drift
```

### P5.7-T3: Add external ERP demo comparison

```sdd-task
id: P5.7-T3
status: completed
wave: 2
depends_on:
  - P5.7-T1
affected_files:
  - README.md
validation:
  - README review
risk:
  - public-positioning
```

### P5.7-T4: Run clean ERP regression case

```sdd-task
id: P5.7-T4
status: completed
wave: 3
depends_on:
  - P5.7-T2
  - P5.7-T3
affected_files:
  - specs/master/phase5.7-validation.md
validation:
  - npm test
  - npm run build
  - fresh ERP inbound-sync full-chain regression
risk:
  - regression
  - high-risk-case
```
