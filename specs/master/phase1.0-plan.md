# Phase 1.0 Lifecycle Decision Model 调研、对比与定稿 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-1.0-lifecycle-research.md` 的执行 plan。

本阶段交付 lifecycle decision 的独立调研、Baseline 对比、最终模型、routing algorithm 和架构交付文档，不实现 runtime 或 command gate。

## 1. 执行原则

```text
Baseline Draft sealed
  -> independent external research
  -> Independent Research Model
  -> Baseline comparison
  -> Final Model + routing algorithm
  -> architecture handoff for Phase 1.1
  -> validation checkpoint
```

关键约束：

- 调研提纲来自外部问题域，不来自 Baseline Draft。
- Independent Research Model 先独立产出，再与 Baseline Draft 对比。
- Final Model 必须说明保留、替换、融合和废弃项。
- 架构交付只覆盖 lifecycle decision，Phase 1.1 再补齐全平台架构。
- 不新增代码、不实现 CLI、不写 runtime contract。

## 2. 调研对象

### 2.1 Risk-based testing / risk-based change management

关注：风险分级如何决定验证深度、审批强度、回归范围和门禁。

输出：可转译的 risk tags、risk scoring 或 hard gate 规则。

### 2.2 Change impact analysis

关注：如何根据文件、符号、接口、配置、测试和依赖推断影响范围。

输出：impact signals、scope estimation、升级条件。

### 2.3 Policy / rule engine

关注：哪些规则应是不可绕过 hard gates，哪些可以作为 soft signals。

输出：hard gate 表达方式、规则优先级、冲突处理。

### 2.4 Adaptive workflow / workflow routing

关注：如何根据复杂度、风险和不确定性选择不同 workflow path。

输出：profile routing 模型。

### 2.5 Human-in-the-loop automation

关注：哪些判断可以自动化，哪些需要用户 checkpoint 或显式确认。

输出：ask-user triggers、confidence threshold、checkpoint 规则。

### 2.6 LLM agent orchestration failure patterns

关注：LLM agent 在任务拆分、上下文收集、验证和恢复中的常见误判。

输出：escalation triggers、false-positive / false-negative control。

## 3. Independent Research Model 结构

Independent Research Model 应包含以下小节：

1. Problem framing
2. Input signals
3. Profile routing
4. Hard gates
5. Confidence model
6. Escalation / downgrade rules
7. Misclassification control
8. Audit record shape
9. Open gaps

## 4. Baseline 对比结构

Baseline 对比必须在 Independent Research Model 完成之后进行，至少包含：

| 对比项 | Research Model | Baseline Draft | 结论 | 原因 |
|---|---|---|---|---|
| input signals | TBD | TBD | keep / replace / merge / drop | TBD |
| profile routing | TBD | TBD | keep / replace / merge / drop | TBD |
| hard gates | TBD | TBD | keep / replace / merge / drop | TBD |
| confidence | TBD | TBD | keep / replace / merge / drop | TBD |
| escalation / downgrade | TBD | TBD | keep / replace / merge / drop | TBD |
| audit record | TBD | TBD | keep / replace / merge / drop | TBD |

## 5. Final Model / Algorithm 结构

Final Model 应包含：

1. Decision inputs
2. Derived signals
3. Hard gate evaluation order
4. Profile routing algorithm
5. Confidence output
6. Human checkpoint triggers
7. Escalation / downgrade rules
8. Misclassification controls
9. Audit record schema draft
10. Runtime / command ownership boundary

## 6. 写入位置

主要写入：

- `docs/research/lifecycle-decision-model-research.md`
- `docs/architecture/lifecycle-decision-model.md`
命名执行文档：

- `specs/master/phase1.0-spec.md`
- `specs/master/phase1.0-plan.md`
- `specs/master/phase1.0-tasks.md`
- `specs/master/phase1.0-validation.md`

阶段引用：

- `specs/master/phases/phase-1.0-lifecycle-research.md`

不得在本阶段写入：

- runtime code
- command / agent / workflow assets
- full platform architecture baseline

## 7. 验证方式

本阶段是文档调研和模型定稿阶段，不运行 `npm run typecheck` 或测试。

验证依据：

- Independent Research Model 是否独立于 Baseline Draft。
- 六类外部机制是否都有调研结论或 gap。
- Baseline 对比是否明确保留、替换、融合和废弃项。
- `docs/architecture/lifecycle-decision-model.md` 是否承载 Final Model 和 routing algorithm，且足够供 Phase 1.1 吸收。
- `docs/architecture/lifecycle-decision-model.md` 是否明确 Phase 1.2 / Phase 1.7 消费边界。

## 8. 风险处理

### Baseline 污染

先写 Independent Research Model，再进入 Baseline 对比。不得边看 Baseline 边整理调研结论。

### 调研过宽

只收敛到 lifecycle decision 需要的机制：signals、routing、hard gates、confidence、escalation、audit。

### 过早实现

发现需要 runtime 字段或 command gate 时，只记录为 Phase 1.2 / Phase 1.7 输入，不在本阶段实现。

### 架构边界外溢

Phase 1.0 只形成 lifecycle decision architecture handoff，不替代 Phase 1.1 的全平台架构基线。
