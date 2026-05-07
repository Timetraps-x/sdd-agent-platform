# Phase 1.4 Tasks — Commands / Agents / Workflows Pack

## Tasks

### T1: 新增 command 静态资产

```sdd-task
id: P1.4-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - commands/sdd-spec.md
  - commands/sdd-plan.md
  - commands/sdd-tasks.md
  - commands/sdd-do.md
  - commands/sdd-verify.md
  - commands/sdd-doctor.md
validation:
  - manual static asset review
risk: []
```

#### Boundary

只定义 command contract 和 lifecycle gate placeholder，不实现 Claude Code 集成或 gate 执行。

#### Acceptance

- 6 个 command 文件存在。
- 每个 command 有 contract/version metadata。
- 每个 command 声明输入、输出、禁止事项、成功标准。

#### Implementation Notes

已完成。

### T2: 新增 agent 静态资产

```sdd-task
id: P1.4-T2
status: completed
wave: 1
depends_on: []
affected_files:
  - agents/scout.md
  - agents/spec-reviewer.md
  - agents/planner.md
  - agents/implementer.md
  - agents/reviewer.md
  - agents/debugger.md
  - agents/validator.md
validation:
  - manual static asset review
risk: []
```

#### Boundary

只定义七角色短 prompt contract，不实现 subagent 调度或 runtime 写入。

#### Acceptance

- 7 个 agent 文件存在。
- 每个 agent 有 contract/version metadata。
- 每个 agent 声明角色边界、输入、允许/禁止事项、输出格式、成功标准。

#### Implementation Notes

已完成。

### T3: 新增 workflow 静态资产

```sdd-task
id: P1.4-T3
status: completed
wave: 1
depends_on: []
affected_files:
  - workflows/spec.yml
  - workflows/plan.yml
  - workflows/tasks.yml
  - workflows/do.yml
  - workflows/verify.yml
  - workflows/doctor.yml
validation:
  - manual static asset review
risk: []
```

#### Boundary

只定义 workflow contract，不实现 workflow runtime、loop、artifact/delegation runtime。

#### Acceptance

- 6 个 workflow 文件存在。
- 每个 workflow 有 contract/version metadata。
- 每个 workflow 声明 gate、输入/输出 artifact、禁止自动跨越 checkpoint、allowed_agents、doctor_checks。

#### Implementation Notes

已完成。

### T4: 更新索引、doctor 检查和状态

```sdd-task
id: P1.4-T4
status: completed
wave: 2
depends_on:
  - P1.4-T1
  - P1.4-T2
  - P1.4-T3
affected_files:
  - schemas/contracts/doctor-static-assets-contract.md
  - README.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - manual static asset review
risk: []
```

#### Boundary

只同步 Phase 1.4 文档和静态资产索引；Phase 1.5+ 保持 planned。

#### Acceptance

- README 和 top-level indexes 引用 Phase 1.4 retained docs。
- Doctor static assets contract 包含 Phase 1.4 command/agent/workflow 检查路径。
- `PHASE_STATUS.md` 在 validation evidence 写入后将 Phase 1.4 标为 completed。

#### Implementation Notes

已完成。
