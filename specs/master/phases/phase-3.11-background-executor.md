# Phase 3.11 Background Executor

## 定位

Phase 3.11 实现单 task background executor MVP。它基于 queue、state machine、worker adapter 和 artifact ingestion 执行一个 delegation，并保持权限、状态和证据可审计。

## 依赖

- Phase 3.3 Delegation Queue Contract。
- Phase 3.4 Delegation State Machine。
- Phase 3.5 Worker Adapter Contract。
- Phase 3.6 Artifact Result Ingestion。
- Phase 3.8 Worktree Lifecycle Manager（仅在 isolation decision 要求时使用）。

## 范围

- 实现单 task enqueue -> claim -> run -> ingest -> terminal state 的最小闭环。
- 执行前检查 capability/plugin/worker/isolation contract。
- 记录 executor events 和 failure diagnostics。
- CLI 支持受控启动/inspect。

## 非目标

- 不执行 dependency wave。
- 不自动 sync-back apply。
- 不跳过 Claude Code 或本地命令权限提示。
- 不做 destructive cleanup。

## 交付物

- `phase3.11-spec.md`、`phase3.11-plan.md`、`phase3.11-tasks.md`、`phase3.11-validation.md`。
- Background executor API/CLI/tests。
- End-to-end single task background smoke。

## 验收标准

- 单 task background delegation 能进入 terminal state。
- Artifact result 被 ingestion 并能被 verify/doctor 读取。
- 失败路径产生 gap/action，而不是静默卡住。
- Executor 不越过已声明 capability 和 permission boundary。

## 下游引用

- Phase 3.12 Wave Executor 基于本 executor 执行 wave 内 task。
- Phase 3.13 Local Run Index 索引本 executor 产生的 state/events/artifacts。
