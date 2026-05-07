# Phase 1.0 Lifecycle Decision Model 调研、对比与定稿

## 1. 定位

Phase 1.0 是 Phase 1 的第一个落地阶段，负责 lifecycle decision model 的独立调研、Baseline Draft 对比、最终模型定稿、routing algorithm 和 lifecycle decision architecture handoff。

本阶段必须先于架构基线、runtime skeleton、platform assets、parser、artifact、command 接入和单 task 闭环执行，避免后续设计直接固化未经验证的经验启发式，也避免 Phase 1.1 重新发明 lifecycle decision。

## 2. 依赖

```yaml
depends_on: []
blocks:
  - phase-1.1-architecture-baseline
  - phase-1.10-real-project-trial
```

## 3. 范围

- 封存当前 lifecycle decision Baseline Draft。
- 不参考 Baseline Draft，独立调研外部机制。
- 调研 risk-based testing / risk-based change management。
- 调研 change impact analysis。
- 调研 policy / rule engine。
- 调研 adaptive workflow / workflow routing。
- 调研 human-in-the-loop automation。
- 调研 LLM agent orchestration failure patterns。
- 基于调研独立产出 Research Model。
- 将 Research Model 与 Baseline Draft 对比，明确保留、替换、融合和废弃项。
- 形成 Final Lifecycle Decision Model。
- 形成 profile routing algorithm。
- 形成 lifecycle decision architecture handoff，明确 Phase 1.1、Phase 1.2 和 Phase 1.7 的消费边界。
- 记录仍需 Phase 1.1 或后续 phase 处理的 open gaps。

## 4. 非目标

- 不冻结全平台最终架构基线。
- 不实现 TypeScript runtime。
- 不实现 CLI。
- 不编写 command / agent / workflow 资产。
- 不执行 agent 调度。
- 不把 Baseline Draft 当作调研提纲、评分模板或独立调研结论。

## 5. 交付物

- `docs/research/lifecycle-decision-model-research.md`
  - Baseline Draft 封存状态
  - Independent Research Model
  - Research evidence notes
  - Baseline vs Research Model 对比
  - Research gaps / architecture gaps
- `docs/architecture/lifecycle-decision-model.md`
  - Final Lifecycle Decision Model
  - profile routing algorithm
  - lifecycle decision architecture handoff
- `specs/master/phase1.0-spec.md`
- `specs/master/phase1.0-plan.md`
- `specs/master/phase1.0-tasks.md`
- `specs/master/phase1.0-validation.md`
- `specs/master/phases/phase-1.0-lifecycle-research.md`

## 6. 验收标准

- Research Model 独立产出，且没有用 Baseline Draft 作为检索提纲、评分模板或结论模板。
- 外部机制至少覆盖 risk-based testing、change impact analysis、policy engine、adaptive workflow、human-in-the-loop automation、LLM agent failure patterns。
- Baseline vs Research Model 对比明确差异、取舍、融合和废弃项。
- Final Model 明确输入信号、profile routing、confidence、hard gates、升级/降级和误判控制。
- routing algorithm 能作为 Phase 1.2 record contract 和 Phase 1.7 command gate 的设计输入。
- lifecycle decision architecture handoff 明确供 Phase 1.1 吸收的模型、算法、架构边界和 open gaps。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.0-lifecycle-research.md
research_artifact: docs/research/lifecycle-decision-model-research.md
model_artifact: docs/architecture/lifecycle-decision-model.md
spec_artifact: specs/master/phase1.0-spec.md
plan_artifact: specs/master/phase1.0-plan.md
tasks_artifact: specs/master/phase1.0-tasks.md
validation_artifact: specs/master/phase1.0-validation.md
required_by:
  - phase-1.1-architecture-baseline
  - phase-1.10-real-project-trial
```
