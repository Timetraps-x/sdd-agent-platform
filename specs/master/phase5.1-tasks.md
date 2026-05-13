# Phase 5.1 Tasks

## Metadata

- phase_id: `5.1`
- plan_id: `phase5.1-context-risk-output-harness-plan`
- lifecycle_profile: `full`

## Task List

### P5.1-T1: Implement ContextResolverContract

```sdd-task
id: P5.1-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm test
  - npm run build
risk:
  - branch-context
```

#### Acceptance

- fallback 顺序为 explicit branch > project config branch > current git branch > configured default。
- status 输出 branch source。

### P5.1-T2: Implement LifecycleRiskGateContract

```sdd-task
id: P5.1-T2
status: completed
wave: 2
depends_on:
  - P5.1-T1
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm test
  - npm run build
risk:
  - lifecycle-hard-gate
```

#### Acceptance

- `sdd lifecycle decide --from-file` 可用。
- `sdd lifecycle decide --from-text` 可用。
- hard gate 命中时不回落到 compact。

### P5.1-T3: Implement OutputQualityContract

```sdd-task
id: P5.1-T3
status: completed
wave: 3
depends_on:
  - P5.1-T1
  - P5.1-T2
affected_files:
  - packages/core/src/instructions.ts
  - packages/cli/src/main.ts
  - commands/sdd-spec.md
  - commands/sdd-plan.md
  - commands/sdd-tasks.md
validation:
  - npm test
  - npm run build
risk:
  - output-quality
```

#### Acceptance

- 关键输出结构为 changed / decision / evidence / gaps / next。
- 输出不重复大段 onboarding 或源文档内容。
