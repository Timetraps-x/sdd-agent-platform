# Phase 1.1 架构基线 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-1.1-architecture-baseline.md` 的执行 spec。

Phase 1.1 只执行架构基线，不实现 runtime、CLI、parser、command、agent 或 workflow 资产。

## 1. 背景

Phase 1.0 已完成 lifecycle decision model 的独立调研、Baseline 对比、Final Model、routing algorithm 和 architecture handoff。Phase 1.1 的任务不是重新设计该模型，而是把它吸收到全平台架构中，并冻结 Phase 1.2+ 可以依赖的架构边界。

架构基线必须回答：

- lifecycle decision 在平台入口、core、runtime record、command gate 中分别处于什么位置。
- core、cli、commands、agents、workflows、templates、adapters、schemas/contracts 的职责边界是什么。
- Markdown 语义事实源与 runtime 执行事实源如何协作。
- contract 的所有者、写入方、读取方、存储位置和演进规则是什么。
- Phase 2/3/4 扩展点如何在不推翻 Phase 1 contract 的前提下接入。
- Phase 1.2+ 进入实现前必须满足哪些架构前置条件。

## 2. 目标

Phase 1.1 完成后，`docs/architecture/sdd-agent-platform-architecture.md` 必须成为 Phase 1 的架构事实源，能够直接指导 Phase 1.2 runtime skeleton、Phase 1.3 contract assets、Phase 1.4 command assets、Phase 1.7 command integration 和 Phase 1.10 real project trial。

## 3. 范围

### 3.1 包含

- 吸收 `docs/architecture/lifecycle-decision-model.md` 的 canonical model、routing algorithm、hard gates、confidence、升级/降级和误判控制。
- 明确 lifecycle decision 的 runtime record 与 command gate 边界。
- 定义平台层次与每层 ownership。
- 定义平台资产与项目 `.sdd` 运行资产边界。
- 定义 contract 总览，包括 lifecycle decision、project config、run state、event log、artifact path、sdd-task、sdd-result、delegation、gap、sync-back。
- 定义 Phase 2 AI 工具入口投影接入点。
- 定义 Phase 3 tool/plugin/worktree/concurrency 接入点。
- 定义 Phase 4 graph-ready metadata 接入点。
- 定义 Phase 1.2+ 的依赖前置条件。
- 留存 Phase 1.1 spec / plan / tasks / validation 短命名执行文档。
- 更新 phase status 和必要索引。

### 3.2 不包含

- 不实现 TypeScript runtime。
- 不实现 CLI。
- 不实现 parser、schema validator、artifact validator 或 doctor。
- 不编写完整 command / agent / workflow / template / adapter 静态资产。
- 不执行 agent 调度。
- 不引入 plugin loader、tool registry、worktree、run DB、dashboard 或代码知识图谱。
- 不运行构建、typecheck 或测试命令，除非本阶段意外修改代码、配置、依赖或构建脚本。

## 4. 功能需求

### FR-1 吸收 Phase 1.0 Lifecycle Decision Model

- architecture baseline 必须明确 Phase 1.0 的 final model 是 canonical 输入。
- hard gates 必须先于 soft complexity，不允许被用户偏好或文件数量降级。
- profile 必须是受控 workflow path，不是 agent 自由选择。
- direct whitelist、confidence、escalation、downgrade、human checkpoint 必须有架构位置。

### FR-2 平台层与 ownership

- 每个层必须明确负责什么、不负责什么。
- command/skill 只能是薄交互入口，不承载长期状态机。
- TypeScript core 承载 contract、状态、事件、artifact、doctor、validation 等可测试逻辑。
- Claude Code 原生权限、settings、hooks 和用户确认仍是高风险动作的实际边界。

### FR-3 Contract 总览

每个核心 contract 必须明确：

- 存储位置。
- 写入方。
- 读取方。
- 所属 phase。
- ownership。
- 演进规则。

### FR-4 Phase 2/3/4 扩展点

- Phase 2 入口投影必须声明依赖 Phase 1 哪些 contract，不得推翻 Phase 1 文件型 runtime。
- Phase 3 平台化扩展必须声明 tool/plugin/worktree/concurrency 对 Phase 1/2 contract 的依赖。
- Phase 4 代码知识图谱必须能消费 task metadata、event、artifact、validation mapping、decision record 等结构化 metadata。

### FR-5 Phase 1.2+ 前置条件

- Phase 1.2 必须知道要记录哪些 lifecycle decision 字段，但不执行 command gate。
- Phase 1.3 必须知道静态 schema/template/adapter 的 contract 边界。
- Phase 1.4 必须知道 commands/agents/workflows 只承载交互和编排 contract。
- Phase 1.7 必须知道 command gate 执行哪些 lifecycle decision 规则。
- Phase 1.10 必须知道真实试跑要验收哪些跨层证据。

## 5. 验收标准

- `docs/architecture/sdd-agent-platform-architecture.md` 明确吸收 Phase 1.0 canonical lifecycle model。
- lifecycle decision 的输入信号、profile routing、confidence、hard gates、升级/降级、误判控制在架构中位置清晰。
- runtime record 与 command gate 的职责边界明确。
- core、cli、commands、agents、workflows、templates、adapters、schemas/contracts 的分层和 ownership 明确。
- 核心 contract 总览包含存储、写入方、读取方、phase、ownership 和演进规则。
- Phase 2/3/4 extension points 明确，且不要求 Phase 1 提前实现。
- Phase 1.2+ dependency prerequisites 明确。
- `specs/master/phase1.1-validation.md` 写入人工文档审查证据。
- `specs/master/phases/PHASE_STATUS.md` 只有在 validation evidence 写入后才将 Phase 1.1 标记为 completed。

## 6. 风险与边界

- 最大风险是 Phase 1.1 越界进入实现；本阶段只更新文档。
- 第二风险是架构文档重复 lifecycle model 细节导致漂移；架构文档只吸收 canonical 结论并引用 `docs/architecture/lifecycle-decision-model.md`。
- 第三风险是 contract 只停留在自然语言；本阶段必须补齐 owner、writer、reader、storage 和 phase，后续 phase 再实现 schema。
