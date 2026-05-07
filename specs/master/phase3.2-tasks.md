# Phase 3.2 Tasks

### P3.2-T1: Implement plugin loading contract core and CLI

```sdd-task
id: P3.2-T1
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

只实现静态 plugin loading contract、list/inspect API、CLI 展示和 doctor compatibility visibility。

#### Acceptance

- Core 能列出/检查内置 plugin contract。
- 每个 plugin contract 引用已存在 capability id。
- CLI 能 `plugins list/inspect`。
- Doctor 包含 plugin loading contract check。
- 不实现动态 plugin loading、外部插件扫描、permission injection、background write、worktree 或 dependency wave。

#### Implementation Notes

Static plugin loading contract core APIs, CLI list/inspect commands, and doctor compatibility visibility check are complete.

### P3.2-T2: Add tests and retained docs

```sdd-task
id: P3.2-T2
status: completed
wave: 1
depends_on: [P3.2-T1]
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.2-tool-plugin-loading-contract.md
  - specs/master/phase3.2-spec.md
  - specs/master/phase3.2-plan.md
  - specs/master/phase3.2-tasks.md
  - specs/master/phase3.2-validation.md
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

- Tests 覆盖 plugin contract API、CLI help/list/inspect 和 doctor check。
- Phase 3.2 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

Plugin contract API, CLI help/list/inspect, doctor visibility tests, retained docs, indexes, and validation are complete.
