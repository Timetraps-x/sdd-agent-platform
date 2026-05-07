# Trial Spec — Synthetic Real Project Task

## Goal

验证 Phase 1.10 能在一个真实 TypeScript/Node 项目工作树中，用平台 CLI 跑通 lifecycle decision、task parsing、single-task loop、goal-level verify 与 doctor。

## User Story

作为 SDD 平台维护者，我希望用一个合成但真实落盘的项目任务验证 Phase 1 闭环，且不调用外部 agent API、不自动 commit/push/PR、不把 sync-back 自动写回 tasks.md。

## Acceptance

- CLI 可以记录 full profile lifecycle decision 到 run state/events。
- CLI 可以解析 trial branch 的 sdd-task metadata。
- 单 task loop 可以接受 reviewer/validator artifacts 并生成 sync-back proposal。
- Goal-level verify 可以把 validator evidence 映射到全部 acceptance。
- Doctor 可以只读发现当前历史 run 中的 liveness/artifact gaps，且不 auto-fix。
