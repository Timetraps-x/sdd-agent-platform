# Phase 3.3 Tasks

### P3.3-T1: Implement delegation queue contract core and CLI

```sdd-task
id: P3.3-T1
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

只实现从 run-state delegation 派生的只读 queue contract、API、CLI 和 doctor visibility。

#### Acceptance

- Core 能 list/inspect queue items。
- Queue item 包含 run/task/agent/status/capability/dedupe/evidence 字段。
- CLI 能 `queue list/inspect`。
- Doctor 包含 delegation queue contract check。
- 不实现 enqueue mutation、worker、background write、worktree 或 wave scheduling。

#### Implementation Notes

Delegation queue contract core APIs, CLI list/inspect commands, and doctor visibility check are complete.

### P3.3-T2: Add tests and retained docs

```sdd-task
id: P3.3-T2
status: completed
wave: 1
depends_on: [P3.3-T1]
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.3-delegation-queue-contract.md
  - specs/master/phase3.3-spec.md
  - specs/master/phase3.3-plan.md
  - specs/master/phase3.3-tasks.md
  - specs/master/phase3.3-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js queue list
risk: []
```

#### Boundary

补测试、索引和验证记录。

#### Acceptance

- Tests 覆盖 queue contract API、CLI help/list/inspect 和 doctor check。
- Phase 3.3 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

Queue contract API, CLI help/list/inspect, doctor visibility tests, retained docs, indexes, and validation are complete.
