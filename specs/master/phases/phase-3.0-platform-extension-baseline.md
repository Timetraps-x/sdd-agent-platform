# Phase 3.0 Platform Extension Baseline

## 定位

Phase 3.0 是 Phase 3 平台化扩展的入口阶段。目标是在 Phase 1 本地 SDD 闭环、Phase 2 AI 工具入口投影和 Phase 2.11 artifact/run hygiene 稳定后，明确 Phase 3 的能力顺序、contract 边界和安全门槛，避免直接把 background write、worktree 或 dependency wave 做成不可控复杂度。

## 依赖

- Phase 1 runtime contract：state/events/artifacts、delegation、sdd-result、goal-level verify、sync-back proposal。
- Phase 2 AI tool entry projection：global CLI、init/update、Claude Code generated entries、instruction API、doctor drift check。
- Phase 2.11 artifact/run hygiene：artifact template/validate、run archive、doctor scope controls。

## 范围

- 定义 Phase 3 子阶段顺序：
  - Phase 3.1 Tool / Capability Registry Baseline。
  - Phase 3.2 Tool / Plugin Loading Contract。
  - Phase 3.3 Delegation Queue Contract。
  - Phase 3.4 Delegation State Machine。
  - Phase 3.5 Worker Adapter Contract。
  - Phase 3.6 Artifact Result Ingestion。
  - Phase 3.7 Worktree Isolation Contract。
  - Phase 3.8 Worktree Lifecycle Manager。
  - Phase 3.9 Task Graph Planner。
  - Phase 3.10 Wave Planner。
  - Phase 3.11 Background Executor。
  - Phase 3.12 Wave Executor。
  - Phase 3.13 Local Run Index。
  - Phase 3.14 Governance Policy。
- 明确每个子阶段的前置 contract、非目标和验收方式。
- 固化 Phase 3 的执行原则：先 declaration/state/isolation/planning，再 execution/index/governance。
- 更新 phase artifact index 与 status；future phase 的 spec/plan/tasks/validation 在进入对应 phase 时创建。

## 非目标

- Phase 3.0 不实现 plugin loader。
- Phase 3.0 不启动 background write agents。
- Phase 3.0 不创建 per-task worktree。
- Phase 3.0 不实现 dependency wave 并发执行。
- Phase 3.0 不引入 SQLite/dashboard。
- Phase 3.0 不改变 Claude Code 原生权限模型。
- Phase 3.0 不自动 commit/push/sync-back apply。

## 交付物

- Phase 3.0 artifact：本文件。
- Phase 3.0 retained execution docs：`phase3.0-spec.md`、`phase3.0-plan.md`、`phase3.0-tasks.md`、`phase3.0-validation.md`。
- Phase indexes updated for Phase 3.
- Phase status marks Phase 3.0 as the active gate.

## 验收标准

- Phase 3.0 明确 Phase 3.1~3.14 子阶段顺序和每个子阶段的安全边界。
- Phase 3.1/3.2 的 first implementation targets 是 capability registry 和 plugin loading contract，而不是 background write/worktree/concurrency。
- 所有索引都能指向 Phase 3.0 retained docs。
- `sdd tasks gaps --branch master` 对 retained phase docs 不产生新的 blocking gap。
- `sdd doctor --latest-only` 保持 PASS。

## 下游引用

- Phase 3.1 必须以本文件定义的 tool/capability registry baseline 为执行边界。
- Phase 3.3+ 必须按 queue、state machine、worker adapter、artifact ingestion、isolation、planning、execution、index、governance 的顺序推进，不把 planner 和 executor 混入同一 phase。
