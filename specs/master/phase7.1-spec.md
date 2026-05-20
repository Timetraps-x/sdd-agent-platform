# Phase 7.1 Spec — Runtime Architecture and Storage v2 Research

## Goal

在 Phase 7.0 已完成 core/CLI package boundary 和 runtime modularization 的基础上，先调研并冻结 Runtime Storage v2 架构方向，为后续 Phase 7.2 runtime source-of-truth 实现提供可执行 spec。

本阶段优先级高于 agent capability、team mode、verification contract 和 ship/sync-back，因为这些能力都依赖稳定的 runtime 状态模型。

## Problem

当前平台已存在 `runtime.sqlite`，但实际运行路径仍大量依赖 `.sdd/runs/<runId>` 文件树：`state.json`、`events.jsonl`、`invocations.jsonl`、`artifacts/`。这导致：

- runId 不含 branch 语义，真实项目多分支运行时难以定位。
- runtime state、事件、调用账本、evidence、workflow 报告混杂。
- status/tasks/doctor/sync-back 容易退化为扫描文件树。
- 后续 `/sdd:verifies`、`/sdd:test`、sync-back approval、team telemetry 无法建立在可信统一状态上。

## In scope

- 调研当前 runtime source-of-truth 假设和代码切面。
- 调研真实项目 Phase 6 runtime 数据暴露的问题。
- 调研外部参考项目和 Claude Code context/cost/statusline 对 runtime 设计的约束。
- 定义 Runtime Storage v2 的职责边界：
  - `runtime.sqlite`：结构化 runtime source of truth。
  - `specs/<branch>`：正式 SDD workflow 文档。
  - `.sdd/runs/<branchSlug>/evidence`：原始证据附件。
- 定义 Phase 7.2 可实现的对象模型、schema 方向、path API、evidence 规则和性能读路径目标。
- 明确 Phase 7.1-7.8 的依赖顺序和并行边界。
- 每个后续小 phase 必须先调研，再走当前 0.3.0 SDD 链路。

## Out of scope

- 不实现 Runtime Storage v2。
- 不迁移旧 `.sdd/runs/<runId>` 数据。
- 不新增 `/sdd:verifies`、`verify.md`、`/sdd:test`。
- 不做 agent capability upgrade 或 command-scoped team runtime。
- 不引入 LangGraph、Temporal、CrewAI 等重型依赖。
- 不恢复任何 Phase 7.0 已清理的 core/CLI 边界穿透。

## Acceptance

- Phase 7.1 artifact、spec、plan、tasks、validation 文档齐备。
- Runtime Storage v2 三层边界清晰：SQLite / workflow docs / branch evidence。
- 明确哪些当前模块依赖 run directory，哪些模块应在 7.2 改造。
- 明确 Phase 7.2 的最小实现范围和不做事项。
- 明确常用命令性能目标：默认 SQLite/projection fast path，deep 模式才读重 evidence。
- `npm run sdd -- status --branch master`、`npm run sdd -- tasks list --branch master`、`npm run sdd -- doctor --latest-only --branch master` 用当前 0.3.0 链路 smoke。
