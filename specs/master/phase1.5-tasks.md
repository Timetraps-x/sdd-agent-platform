# Phase 1.5 Tasks — SDD Parser / Task Model

## Tasks

### T1: 实现 core task model 与 parser

```sdd-task
id: P1.5-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk:
  - parser boundary
```

#### Boundary

只实现 Markdown / `sdd-task` block 读取、结构化 model 和 gap model；不执行 task、不写回 SDD 文档、不实现 artifact/delegation runtime。

#### Acceptance

- Core 暴露 SDD task model 和 gap model 类型。
- 能解析 `id/status/wave/depends_on/affected_files/validation/risk`。
- 能解析 `Boundary`、`Acceptance`、`Implementation Notes` companion sections。
- 缺少必要 metadata 时返回 blocking gap。

#### Implementation Notes

已完成。

### T2: 增加 parser inspection CLI

```sdd-task
id: P1.5-T2
status: completed
wave: 2
depends_on:
  - P1.5-T1
affected_files:
  - packages/cli/src/main.ts
validation:
  - npm run typecheck
  - npm run sdd -- tasks list --branch master
  - npm run sdd -- tasks inspect P1.4-T1 --branch master
risk:
  - phase boundary
```

#### Boundary

只增加只读 task inspection CLI；不接入 Claude Code slash command，不执行 lifecycle gate，不执行 validation command。

#### Acceptance

- `sdd tasks list` 能列出解析出的 task。
- `sdd tasks inspect <task_id>` 能输出单 task 结构化详情。
- `sdd tasks gaps` 能输出 parser/gap report。

#### Implementation Notes

已完成。

### T3: 增加 parser 测试与 gap cases

```sdd-task
id: P1.5-T3
status: completed
wave: 2
depends_on:
  - P1.5-T1
affected_files:
  - packages/core/src/index.test.ts
validation:
  - npm test
risk: []
```

#### Boundary

只覆盖 parser/task model/gap cases，不测试执行 runtime、agent delegation 或 gate routing。

#### Acceptance

- Happy path 能提取 metadata 与 companion sections。
- Gap path 能报告 status、wave、affected_files、validation、Boundary、Acceptance、depends_on 问题。
- Branch parse path 能读取 branch docs 并 inspect 单 task。

#### Implementation Notes

已完成。

### T4: 更新文档、索引和状态

```sdd-task
id: P1.5-T4
status: completed
wave: 3
depends_on:
  - P1.5-T1
  - P1.5-T2
  - P1.5-T3
affected_files:
  - README.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phase1.5-spec.md
  - specs/master/phase1.5-plan.md
  - specs/master/phase1.5-tasks.md
  - specs/master/phase1.5-validation.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk: []
```

#### Boundary

只同步 Phase 1.5 retained docs、索引、README 和 phase status；Phase 1.6+ 保持 planned。

#### Acceptance

- Phase 1.5 retained short docs 存在。
- README 和 top-level indexes 引用 Phase 1.5 retained docs。
- Validation evidence 写入后，`PHASE_STATUS.md` 将 Phase 1.5 标为 completed。

#### Implementation Notes

已完成。
