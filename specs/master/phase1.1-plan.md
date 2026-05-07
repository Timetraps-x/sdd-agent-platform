# Phase 1.1 架构基线 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-1.1-architecture-baseline.md` 的执行 plan。

本阶段交付架构基线与下游 phase 前置条件，不实现 runtime、CLI、parser 或 command gate。

## 1. 执行原则

```text
Phase 1.0 canonical lifecycle model
  -> architecture baseline absorption
  -> platform layer ownership
  -> contract overview
  -> Phase 2/3/4 extension points
  -> Phase 1.2+ dependency prerequisites
  -> manual validation checkpoint
```

关键约束：

- 只吸收 Phase 1.0 final model，不重新执行 lifecycle decision 调研或 Baseline 对比。
- 架构基线必须清楚说明哪些规则进入 runtime record，哪些到 command gate 才执行。
- 架构文档维护全局边界，不复制每个 phase 的完整执行细节。
- 不新增代码、不运行构建或测试。

## 2. 输入文档

- `context/memory/MEMORY.md`
- `docs/research/自建_SDD_subagent_工作流平台方案.md`
- `docs/research/lifecycle-decision-model-research.md`
- `docs/architecture/lifecycle-decision-model.md`
- `docs/architecture/sdd-agent-platform-architecture.md`
- `specs/master/phases/phase-1.1-architecture-baseline.md`
- `specs/master/phases/README.md`
- `specs/master/phases/PHASE_STATUS.md`

## 3. 更新策略

### 3.1 架构文档

更新 `docs/architecture/sdd-agent-platform-architecture.md`：

1. 在总体架构中明确 lifecycle decision 是入口 gate，runtime record 是执行事实源，platform assets 是版本化 contract pack。
2. 在核心分层表中补齐 owner / writer / reader / 不负责边界。
3. 将 lifecycle decision 章节从候选模型改为吸收 Phase 1.0 canonical model，并引用 `docs/architecture/lifecycle-decision-model.md`。
4. 扩展 contract 总览，补齐 owner、writer、reader、storage、phase、下游消费者。
5. 明确 Phase 2 AI 工具入口投影 extension points 的前置 contract 和禁止提前实现项。
6. 明确 Phase 3 平台化扩展 extension points。
7. 明确 Phase 5 graph-ready metadata 的来源和不得只写自然语言的规则。
8. 增加 Phase 1.2+ dependency prerequisites。
9. 调整 ADR，使 lifecycle decision 已从“待调研验证”变为“Phase 1.0 已定稿，Phase 1.1 吸收”。


### 3.2 Phase 执行文档

新增并留存：

- `specs/master/phase1.1-spec.md`
- `specs/master/phase1.1-plan.md`
- `specs/master/phase1.1-tasks.md`
- `specs/master/phase1.1-validation.md`

### 3.3 索引与状态

更新：

- `specs/master/spec.md`
- `specs/master/plan.md`
- `specs/master/tasks.md`
- `specs/master/validation.md`
- `README.md`
- `specs/master/phases/PHASE_STATUS.md`

只有在 `phase1.1-validation.md` 写入通过证据后，才将 Phase 1.1 标记为 completed。

## 4. 手工验证方式

本阶段只做 manual doc review：

- 对照 Phase 1.1 phase artifact 的范围与验收标准。
- 对照 Phase 1.0 lifecycle model handoff。
- 检查架构文档是否覆盖分层、contract、ownership、extension points、dependency prerequisites。
- 检查索引与 phase status 是否一致。

不运行项：

- `npm run typecheck`
- `npm test`
- `npm run build`
- CLI smoke tests

原因：本阶段只修改 Markdown 文档，没有修改 TypeScript、配置、依赖、接口契约或构建脚本。

## 5. 风险处理

### 过度复制 lifecycle model

架构文档只保留必要架构边界和表格；完整模型继续以 `docs/architecture/lifecycle-decision-model.md` 为准。

### 提前实现

任何 schema、CLI、parser、validator、doctor 细节只作为下游 phase prerequisite 记录，不在 Phase 1.1 创建代码或资产。

### 下游前置不清

用独立章节列出 Phase 1.2~1.10 的直接依赖输入，防止后续 phase 各自发明 contract。
