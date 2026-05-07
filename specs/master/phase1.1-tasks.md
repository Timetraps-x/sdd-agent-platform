# Phase 1.1 架构基线 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-1.1-architecture-baseline.md` 的执行 tasks。

Phase 1.1 完成并验证后，Phase 1.2 runtime skeleton 才可开始。

## Task List

### P1.1-T1: 吸收 Phase 1.0 lifecycle model

```sdd-task
id: P1.1-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - docs/architecture/sdd-agent-platform-architecture.md
validation:
  - manual-doc-review
risk:
  - 重新发明 Phase 1.0 模型
  - 架构文档与 canonical model 漂移
```

#### Boundary

只吸收 `docs/architecture/lifecycle-decision-model.md` 的 canonical 结论，不重新执行研究或 Baseline 对比。

#### Acceptance

- architecture baseline 明确 lifecycle decision 是平台入口第一层。
- hard gates、direct whitelist、confidence、升级/降级和误判控制有架构位置。
- 明确 Phase 1.2 record contract 与 Phase 1.7 command gate 的边界。

---

### P1.1-T2: 固化平台分层和 ownership

```sdd-task
id: P1.1-T2
status: completed
wave: 1
depends_on:
  - P1.1-T1
affected_files:
  - docs/architecture/sdd-agent-platform-architecture.md
validation:
  - manual-doc-review
risk:
  - command prompt 承载状态机
  - core/cli/asset 边界混乱
```

#### Boundary

只定义架构职责，不创建 packages、commands、agents、schemas 实现文件。

#### Acceptance

- core、cli、commands/skills、platform assets、project workspace、future layers 的责任与非责任明确。
- 明确 command/agent prompt 不承载长期状态机。
- 明确 TypeScript core 是可测试 contract 与 runtime 事实逻辑层。

---

### P1.1-T3: 补齐核心 contract 总览

```sdd-task
id: P1.1-T3
status: completed
wave: 2
depends_on:
  - P1.1-T1
  - P1.1-T2
affected_files:
  - docs/architecture/sdd-agent-platform-architecture.md
validation:
  - manual-doc-review
risk:
  - contract 只有自然语言，没有 owner/writer/reader/storage
```

#### Boundary

只定义 contract overview 和演进规则，不实现 schema validator。

#### Acceptance

- lifecycle decision、project config、run state、event log、artifact path、sdd-task、sdd-result、delegation、gap、sync-back 均有存储、owner、写入方、读取方、phase。
- contract evolution rules 明确版本、兼容性和 doctor 检查原则。

---

### P1.1-T4: 明确 Phase 2/3/4 extension points

```sdd-task
id: P1.1-T4
status: completed
wave: 2
depends_on:
  - P1.1-T2
  - P1.1-T3
affected_files:
  - docs/architecture/sdd-agent-platform-architecture.md
validation:
  - manual-doc-review
risk:
  - Phase 2 入口投影能力提前污染 Phase 1
  - Phase 3 平台化扩展能力提前污染 Phase 1/2
  - Phase 4 metadata 未提前结构化
```

#### Boundary

只记录扩展点和前置 contract，不实现 tool registry、plugin loader、worktree、dashboard、graph。

#### Acceptance

- Phase 2 AI 工具入口投影接入点明确。
- Phase 3 tool/plugin/worktree/concurrency/run DB/dashboard 的接入点明确。
- Phase 4 graph-ready metadata 来源明确。
- 明确 Phase 2/3/4 不能推翻 Phase 1 contract。

---

### P1.1-T5: 定义 Phase 1.2+ dependency prerequisites

```sdd-task
id: P1.1-T5
status: completed
wave: 3
depends_on:
  - P1.1-T3
  - P1.1-T4
affected_files:
  - docs/architecture/sdd-agent-platform-architecture.md
validation:
  - manual-doc-review
risk:
  - 后续 phase 缺少架构输入
```

#### Boundary

只列下游 phase 的架构前置条件，不重写各 phase artifact。

#### Acceptance

- Phase 1.2 runtime skeleton 的 lifecycle decision record、state/events、doctor 前置清晰。
- Phase 1.3 contract assets、Phase 1.4 command assets、Phase 1.5 parser、Phase 1.6 artifact/delegation、Phase 1.7 command gate、Phase 1.8/1.9/1.10 的依赖输入清晰。

---

### P1.1-T6: 更新执行文档、索引和状态

```sdd-task
id: P1.1-T6
status: completed
wave: 4
depends_on:
  - P1.1-T1
  - P1.1-T2
  - P1.1-T3
  - P1.1-T4
  - P1.1-T5
affected_files:
  - specs/master/phase1.1-spec.md
  - specs/master/phase1.1-plan.md
  - specs/master/phase1.1-tasks.md
  - specs/master/phase1.1-validation.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/PHASE_STATUS.md
  - README.md
validation:
  - manual-doc-review
risk:
  - 未写验证证据就标记 completed
  - 索引遗漏 Phase 1.1 文档
```

#### Boundary

只更新文档、索引和 phase status，不提交 git。

#### Acceptance

- Phase 1.1 execution docs 使用短命名留存。
- README 和 SDD 索引包含 Phase 1.1。
- `phase1.1-validation.md` 写入 manual doc review evidence。
- `PHASE_STATUS.md` 在验证证据存在后标记 Phase 1.1 completed。
