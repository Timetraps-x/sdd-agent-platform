# Phase 5.2 Tasks

## Metadata

- phase_id: `5.2`
- plan_id: `phase5.2-workflow-agent-registry-harness-plan`
- lifecycle_profile: `full`

## Task List

### P5.2-T1: Implement WorkflowGateContract

```sdd-task
id: P5.2-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - workflows/spec.yml
  - workflows/plan.yml
  - workflows/tasks.yml
  - workflows/do.yml
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
validation:
  - npm test
  - npm run build
risk:
  - workflow-gate
```

### P5.2-T2: Implement AgentRegistryContract

```sdd-task
id: P5.2-T2
status: completed
wave: 2
depends_on:
  - P5.2-T1
affected_files:
  - agents/scout.md
  - agents/spec-reviewer.md
  - agents/planner.md
  - agents/implementer.md
  - agents/reviewer.md
  - agents/debugger.md
  - agents/validator.md
  - packages/core/src/index.ts
validation:
  - npm test
  - npm run build
risk:
  - agent-orchestration
```

### P5.2-T3: Expose agent participation in generated entries

```sdd-task
id: P5.2-T3
status: completed
wave: 3
depends_on:
  - P5.2-T1
  - P5.2-T2
affected_files:
  - commands/sdd-spec.md
  - commands/sdd-plan.md
  - commands/sdd-tasks.md
  - commands/sdd-do.md
validation:
  - npm test
  - npm run build
risk:
  - output-boundary
```
