# Phase 3.12 Wave Executor

## 定位

Phase 3.12 实现 dependency wave executor MVP。它基于 Phase 3.10 的 wave plan 和 Phase 3.11 的单 task executor 执行安全并发，不重新定义 planner。

## 依赖

- Phase 3.10 Wave Planner。
- Phase 3.11 Background Executor。
- Phase 3.8 Worktree Lifecycle Manager。
- Phase 3.14 Governance Policy 的初始手工 gate 可先以 hardcoded policy draft 表达，正式治理在 3.14 固化。

## 范围

- 执行 wave plan 中 parallel-safe 的 tasks。
- 对 manual-gate/blocked task 停止并报告原因。
- 聚合每个 task 的 terminal state 和 artifact ingestion result。
- 支持失败 fast-stop 或 safe-continue 策略的显式配置。

## 非目标

- 不重新计算 wave plan。
- 不自动 merge 多 worktree 改动。
- 不自动 sync-back apply。
- 不绕过用户确认 gate。

## 交付物

- `phase3.12-spec.md`、`phase3.12-plan.md`、`phase3.12-tasks.md`、`phase3.12-validation.md`。
- Wave executor API/CLI/tests。
- Multi-task safe wave smoke。

## 验收标准

- Executor 只执行 planner 标记为 safe 的 wave task。
- 失败、blocked、manual gate 都有清晰事件和 summary。
- 并发执行不写入同一 unsafe affected file set。
- Doctor 能检查 wave execution evidence。

## 下游引用

- Phase 3.13 Local Run Index 索引 wave execution 历史。
- Phase 3.14 Governance Policy 固化长期并发和确认策略。
