# Phase 1.8 Tasks — 单 Task 执行闭环

### P1.8-T1: 实现 artifact-mode single-task loop

```sdd-task
id: P1.8-T1
status: completed
wave: 1
depends_on:
  - P1.7-T1
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk:
  - runtime-state
  - artifact-contract
  - command-boundary
```

#### Boundary

只实现单 task loop 的 state/events/artifact/delegation/proposal 编排；不调用外部 agent API，不做 Phase 1.9 verify/doctor hardening。

#### Acceptance

- `sdd do task <task_id>` 能选择一个 task。
- 合法 reviewer + validator artifact 可推进 completed。
- 缺失/非法 artifact 进入 blocked/failed 并生成 gap report。
- sync-back proposal 只写入 run artifact，不改 `tasks.md`。

#### Implementation Notes

- 已实现 `runSingleTaskLoop` 和 `renderSingleTaskLoopResult`。
- 已新增 CLI `do task`。

### P1.8-T2: 增加单 task loop 测试

```sdd-task
id: P1.8-T2
status: completed
wave: 1
depends_on:
  - P1.8-T1
affected_files:
  - packages/core/src/index.test.ts
validation:
  - npm test
risk:
  - test-coverage
```

#### Boundary

只覆盖 Phase 1.8 新 loop 行为，不扩展 Phase 1.9 goal verifier。

#### Acceptance

- 成功路径测试验证 state/events/syncBack/tasks.md 不被修改。
- 阻塞路径测试验证缺失 reviewer/validator artifact 不会误判成功。

#### Implementation Notes

- 测试数从 22 增至 24。

### P1.8-T3: 更新 Phase 1.8 retained docs 与索引状态

```sdd-task
id: P1.8-T3
status: completed
wave: 1
depends_on:
  - P1.8-T1
  - P1.8-T2
affected_files:
  - specs/master/phase1.8-spec.md
  - specs/master/phase1.8-plan.md
  - specs/master/phase1.8-tasks.md
  - specs/master/phase1.8-validation.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/phase-1.8-single-task-loop.md
  - specs/master/phases/PHASE_STATUS.md
  - commands/sdd-do.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk:
  - documentation-drift
```

#### Boundary

只更新 Phase 1.8 文档和索引；不覆盖顶层 index 为 phase body。

#### Acceptance

- retained Phase 1.8 docs 存在且使用短命名。
- 顶层四个 index 仅新增 Phase 1.8 链接。
- PHASE_STATUS 记录 Phase 1.8 completed evidence。

#### Implementation Notes

- 本文件即 retained tasks evidence。
