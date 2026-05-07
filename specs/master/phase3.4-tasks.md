# Phase 3.4 Tasks

### P3.4-T1: Implement delegation state machine contract core and CLI

```sdd-task
id: P3.4-T1
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

只实现 delegation state machine contract、transition validator、doctor visibility 和 CLI inspect。

#### Acceptance

- Core 能返回 state machine snapshot。
- Transition validator 能允许声明转移并拒绝 terminal reopen。
- CLI 能 `state-machine inspect`。
- Doctor 包含 delegation state machine check。
- 不实现 worker、task execution、artifact ingestion、worktree 或 wave scheduling。

#### Implementation Notes

Delegation state machine contract core APIs, CLI inspect command, event transition audit, and doctor visibility check are complete.

### P3.4-T2: Add tests and retained docs

```sdd-task
id: P3.4-T2
status: completed
wave: 1
depends_on: [P3.4-T1]
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.4-delegation-state-machine.md
  - specs/master/phase3.4-spec.md
  - specs/master/phase3.4-plan.md
  - specs/master/phase3.4-tasks.md
  - specs/master/phase3.4-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js state-machine inspect
risk: []
```

#### Boundary

补测试、索引和验证记录。

#### Acceptance

- Tests 覆盖 state machine API、transition validator、doctor check、event transition audit、CLI help/inspect。
- Phase 3.4 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

State machine API, CLI help/inspect, doctor visibility, illegal event transition detection, retained docs, indexes, and validation are complete.
