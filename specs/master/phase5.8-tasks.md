# Phase 5.8 Tasks

## Metadata

- phase_id: `5.8`
- plan_id: `phase5.8-semantic-document-contracts-plan`
- lifecycle_profile: `full`

## Task List

### P5.8-T1: Upgrade shared semantic templates

```sdd-task
id: P5.8-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - templates/spec-template.md
  - templates/tasks-template.md
validation:
  - npm test
risk:
  - documentation-contract
```

### P5.8-T2: Upgrade init scaffolds

```sdd-task
id: P5.8-T2
status: completed
wave: 1
depends_on:
  - P5.8-T1
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm test
risk:
  - generated-scaffold
```

### P5.8-T3: Upgrade instructions and generated entries

```sdd-task
id: P5.8-T3
status: completed
wave: 2
depends_on:
  - P5.8-T2
affected_files:
  - packages/core/src/instructions.ts
  - packages/core/src/ai-tools.ts
  - .claude/commands/sdd/spec.md
  - .claude/commands/sdd/tasks.md
validation:
  - npm run sdd -- update
  - npm test
risk:
  - generated-entry-drift
```

### P5.8-T4: Update docs and validation

```sdd-task
id: P5.8-T4
status: completed
wave: 3
depends_on:
  - P5.8-T3
affected_files:
  - docs/user-guide.md
  - docs/ai-readme.md
  - docs/architecture/sdd-agent-platform-architecture.md
  - specs/master/phase5.8-validation.md
validation:
  - npm test
  - npm run build
risk:
  - documentation
```
