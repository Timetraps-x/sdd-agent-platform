# Phase 1.0 Lifecycle Decision Model 调研、对比与定稿 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-1.0-lifecycle-research.md` 的执行 spec。

Phase 1.0 是当前执行阶段，必须先于 `specs/master/phases/phase-1.1-architecture-baseline.md` 和后续 runtime / assets / command / loop 阶段完成。

## 1. 背景

平台的核心目标不是让所有需求都走重型 SDD，而是根据需求风险选择最短安全路径。当前已有一版 lifecycle decision Baseline Draft，但它来自项目目标推导和工程启发式，不能直接固化为核心算法。

因此 Phase 1.0 需要先独立调研外部机制，再与 Baseline Draft 对比，最终交付 lifecycle decision 的模型、算法和架构文档，作为 Phase 1.1 架构基线的输入。

## 2. 目标

Phase 1.0 要完成 lifecycle decision model 的调研、对比和定稿：

```text
Baseline Draft sealed
  -> independent external research
  -> Independent Research Model
  -> Baseline comparison
  -> Final Model + routing algorithm + architecture handoff
  -> validation checkpoint
```

最终模型至少回答：

- 输入信号如何定义。
- 如何选择 direct / compact / full / research profile。
- 哪些 hard gates 不允许降级。
- confidence 如何表达。
- 如何升级、降级和人工介入。
- 如何控制误判。
- runtime record 与 command gate 分别消费哪些字段和规则。

## 3. 范围

### 3.1 包含

- 封存 Baseline Draft，避免污染独立调研。
- 独立调研 risk-based testing / risk-based change management。
- 独立调研 change impact analysis。
- 独立调研 policy / rule engine。
- 独立调研 adaptive workflow / workflow routing。
- 独立调研 human-in-the-loop automation。
- 独立调研 LLM agent orchestration failure patterns。
- 产出 Independent Research Model。
- 将 Research Model 与 Baseline Draft 对比。
- 形成 Final Lifecycle Decision Model。
- 形成 profile routing algorithm。
- 形成 lifecycle decision architecture handoff，供 Phase 1.1 吸收。
- 记录仍需 Phase 1.1 或后续 phase 处理的 open gaps。

### 3.2 不包含

- 不冻结全平台最终架构基线。
- 不实现 runtime、CLI、parser、validator 或 command gate。
- 不调度 agent。
- 不编写 command / agent / workflow 资产。
- 不把 Baseline Draft 当作独立调研的提纲、评分模板或结论模板。

## 4. 用户场景

### 场景 A：小改动不应被迫进入完整 SDD

用户提出低风险小改时，平台应能选择 direct 或 compact，而不是机械执行 spec -> plan -> tasks -> do -> verify。

### 场景 B：高风险改动必须升级

当改动涉及数据库、权限、安全、状态机、CI、跨模块或数据丢失风险时，平台应能强制进入更重 profile。

### 场景 C：模型不确定时必须可解释

当输入信号不足或调研证据不充分时，模型应明确 confidence、hard gate、人工确认和 open gaps，而不是伪装成确定结论。

### 场景 D：Phase 1.1 需要可吸收输入

Phase 1.1 不应重新发明 lifecycle decision，而应吸收 Phase 1.0 的最终模型、算法和架构交付，再补齐全平台架构所需的其他调研和 contract 决策。

## 5. 功能需求

### FR-1 Baseline Draft 封存

- Baseline Draft 必须保留现状和来源标记。
- Baseline Draft 不得作为 Independent Research Model 的提纲、评分模板或结论模板。

### FR-2 独立调研记录

- 每个外部机制都要记录可转译到本项目的关键机制。
- 每个外部机制都要记录不能直接套用或仍需验证的 gap。

### FR-3 Independent Research Model

Independent Research Model 至少包含：

- input signals。
- profile routing。
- hard gates。
- confidence。
- escalation / downgrade rules。
- false-positive / false-negative control。
- audit record shape。

### FR-4 Baseline 对比

- 对比 Research Model 与 Baseline Draft 的差异。
- 明确保留、替换、融合和废弃项。
- 对争议点记录证据、风险和后续处理方式。

### FR-5 Final Model 与算法

- 形成最终 lifecycle decision model。
- 形成 profile routing algorithm。
- 明确 hard gate 优先级、confidence 输出和人工确认触发条件。
- 明确 direct / compact / full / research 的边界和升级/降级规则。

### FR-6 架构交付

- 形成 lifecycle decision architecture handoff。
- 明确哪些内容由 Phase 1.2 runtime record contract 承载。
- 明确哪些内容由 Phase 1.7 command decision gate 执行。
- 明确 Phase 1.1 需要吸收和补齐的架构问题。

## 6. 非功能需求

- 文档默认中文。
- 独立调研、对比、最终模型和架构交付必须在文档结构上可区分。
- Phase 1.0 的最终产物必须能被 Phase 1.1 架构基线直接引用。
- 不引入实现代码，不运行 runtime 验证命令。

## 7. 验收标准

- `docs/research/lifecycle-decision-model-research.md` 明确 Baseline Draft 封存状态。
- Independent Research Model 独立成节，且不是 Baseline Draft 的改写。
- 调研覆盖 risk-based testing、change impact analysis、policy engine、adaptive workflow、human-in-the-loop automation、LLM agent failure patterns。
- Baseline vs Research Model 对比明确差异、取舍和融合结果。
- `docs/architecture/lifecycle-decision-model.md` 明确 Final Model 的输入信号、profile routing、confidence、hard gates、升级/降级和误判控制。
- `docs/architecture/lifecycle-decision-model.md` 的 routing algorithm 能作为 Phase 1.2 record contract 和 Phase 1.7 command gate 的设计输入。
- `docs/architecture/lifecycle-decision-model.md` 的 architecture handoff 明确交给 Phase 1.1 吸收的模型、算法、架构边界和 open gaps。

## 8. 风险与边界

- 最大风险是被 Baseline Draft 污染，因此独立调研和 Research Model 必须先完成，再进行 Baseline 对比。
- Phase 1.0 只定 lifecycle decision 的模型、算法和局部架构交付，不冻结全平台架构基线。
- Phase 1.0 不实现 runtime record contract，record contract 属于 Phase 1.2。
- Phase 1.0 不实现 command gate，command gate 属于 Phase 1.7。
