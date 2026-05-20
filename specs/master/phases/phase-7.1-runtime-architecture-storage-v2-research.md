# Phase 7.1 Runtime Architecture and Storage v2 Research

## 1. 定位

Phase 7.1 是 Phase 7.0 边界拆分后的第一个后续 phase，优先处理 runtime 架构与 source of truth 问题。本阶段只做调研、架构决策和 Storage v2 可执行 spec，不直接迁移运行时代码。

本阶段必须先调研，再使用当前 0.3.0 SDD 链路生成 phase 执行文档：`phase7.1-spec.md`、`phase7.1-plan.md`、`phase7.1-tasks.md`、`phase7.1-validation.md`。

## 2. 依赖

- depends_on: Phase 7.0 Core Runtime Modularization
- blocks: Phase 7.2 Runtime Storage v2 Implementation
- required_by: Phase 7.2 Runtime Storage v2 Implementation

## 3. 范围

- 调研当前 `.sdd/runs/<runId>`、`run-state`、`run-index`、`runtime-store`、`status`、`doctor`、`sync-back` 的 source-of-truth 假设。
- 明确 `runtime.sqlite`、`specs/<branch>`、`.sdd/runs/<branch>/evidence` 的职责边界。
- 定义 Runtime Storage v2 的对象模型、命名规则、evidence 规则、性能读路径和破坏性迁移范围。
- 评估外部参考：Claude Code context/cost/statusline、Spec Kit/OpenSpec/cc-sdd/AgentPlane/Oh My OpenAgent、LangGraph/Temporal checkpoint 思想。
- 明确每个后续 Phase 7.x 都必须先调研，再走 0.3.0 SDD 链路。

## 4. 非目标

- 不实现 SQLite v2 schema。
- 不迁移旧 runs 文件。
- 不新增 `/sdd:verifies`、`/sdd:test` 或 team runtime。
- 不做 agent 能力升级。
- 不引入 LangGraph、Temporal、CrewAI 等重型 runtime 依赖。
- 不要求兼容旧内测项目 `.sdd/runs/<runId>` 结构作为核心路径。

## 5. 交付物

- Runtime Storage v2 research summary。
- Runtime Storage v2 object model and responsibility boundary。
- Phase 7.2 implementation-ready architecture spec。
- Phase 7.1 spec/plan/tasks/validation 执行文档。
- Phase 7.1 validation 记录调研范围、决策、未决 gap 和进入 7.2 的 gate。

## 6. 验收标准

- 明确 SQLite-first runtime state 的 source-of-truth 边界。
- 明确 `.sdd/runs/<branch>/evidence` 只存 SQLite 不适合承载且不属于 workflow docs 的原始证据附件。
- 明确 `specs/<branch>` 继续承载正式 workflow 文档。
- 明确常用命令不应依赖全量扫描 `.sdd/runs`。
- 明确 7.2 可实现的 schema、API 和迁移切面。
- `npm run sdd -- status --branch master`、`npm run sdd -- tasks list --branch master`、`npm run sdd -- doctor --latest-only --branch master` 作为 0.3.0 smoke 通过或记录非阻塞 WARN。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-7.1-runtime-architecture-storage-v2-research.md`
- `specs/master/phase7.1-spec.md`
- `specs/master/phase7.1-plan.md`
- `specs/master/phase7.1-tasks.md`
- `specs/master/phase7.1-validation.md`
- `specs/master/phase7.1-research.md`
