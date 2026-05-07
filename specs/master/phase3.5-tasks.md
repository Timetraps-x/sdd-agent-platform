# Phase 3.5 Tasks

### P3.5-T1: Implement worker adapter contract core and CLI

```sdd-task
id: P3.5-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
validation:
  - npm run typecheck
  - npm test
risk: []
```

#### Boundary

只实现 worker adapter manifest、registry API、doctor compatibility 和 CLI visibility。

#### Acceptance

- Core 能 list/inspect worker adapter contracts。
- Adapter contract 包含 input/output/status/evidence/permission prompt/forbidden uses。
- Adapter 引用 Phase 3.1 capability、Phase 3.2 plugin contract 和 Phase 3.4 state machine。
- CLI 能 `workers list/inspect`。
- Doctor 包含 worker adapter contract check。
- 不执行 adapter、不启动 background process、不实现 wave executor。

#### Implementation Notes

Worker adapter contract registry, built-in adapter manifests, CLI list/inspect commands, and doctor compatibility check are complete.

### P3.5-T2: Add tests and retained docs

```sdd-task
id: P3.5-T2
status: completed
wave: 1
depends_on: [P3.5-T1]
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.5-worker-adapter-contract.md
  - specs/master/phase3.5-spec.md
  - specs/master/phase3.5-plan.md
  - specs/master/phase3.5-tasks.md
  - specs/master/phase3.5-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js workers list
risk: []
```

#### Boundary

补测试、索引和验证记录。

#### Acceptance

- Tests 覆盖 worker adapter API、doctor check、CLI help/list/inspect。
- Phase 3.5 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

Worker adapter API, CLI help/list/inspect, doctor visibility, retained docs, indexes, and validation are complete.
