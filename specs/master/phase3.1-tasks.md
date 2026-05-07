# Phase 3.1 Tasks

### P3.1-T1: Implement capability registry core and CLI

```sdd-task
id: P3.1-T1
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

只实现静态 capability registry、list/inspect API、CLI 展示和 doctor visibility。

#### Acceptance

- Core 能列出/检查内置 capability。
- CLI 能 `capabilities list/inspect`。
- Doctor 包含 capability registry check。
- 不实现动态 plugin loading、background write、worktree 或 dependency wave。

#### Implementation Notes

Static capability registry core APIs, CLI list/inspect commands, and doctor visibility check are complete.

### P3.1-T2: Add tests and retained docs

```sdd-task
id: P3.1-T2
status: completed
wave: 1
depends_on: [P3.1-T1]
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.1-tool-capability-registry-baseline.md
  - specs/master/phase3.1-spec.md
  - specs/master/phase3.1-plan.md
  - specs/master/phase3.1-tasks.md
  - specs/master/phase3.1-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
risk: []
```

#### Boundary

补测试、索引和验证记录。

#### Acceptance

- Tests 覆盖 registry API、CLI help 和 doctor check。
- Phase 3.1 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

Registry API, CLI help/list/inspect, and doctor capability registry tests are complete; validation passed.
