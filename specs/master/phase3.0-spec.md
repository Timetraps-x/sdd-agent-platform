# Phase 3.0 Spec

## Problem

Phase 1/2 已经跑通本地 SDD 闭环、全局安装、目标仓库 init、Claude Code 入口投影、artifact UX 和 run hygiene。Phase 3 要进入平台化扩展，但如果直接实现 background write、per-task worktree 或 dependency wave，会把 tool capability、权限、隔离、merge/reconcile 和 doctor 复杂度一次性引入。

## Goal

建立 Phase 3 平台化扩展基线，先定义能力顺序和安全门槛，并按 durable agent workflow runtime 边界把 Phase 3 拆为 declaration、state、isolation、planning、execution、index、governance。

## Requirements

- Phase 3.0 必须列出 Phase 3 子阶段顺序和依赖关系。
- Phase 3.0 必须明确 Phase 3.1/3.2 已先完成 tool/capability registry 和 plugin loading contract baseline。
- Phase 3.0 必须把 background delegation、worktree、dependency wave、local index 和 governance 拆成可独立验收的小 phase，禁止 planner/executor、contract/lifecycle、index/governance 混在同一 phase。
- Phase 3.0 必须复用 Phase 1/2 contract，不引入平行事实源。
- Phase 3.0 必须更新 phase indexes/status 和 retained docs。

## Acceptance

- Phase 3.0 retained docs 存在并被索引。
- Phase status 中 Phase 3.0~3.2 为 `completed`，Phase 3.3~3.14 为 `planned`。
- Phase 3.3 之后的边界清晰：queue -> state machine -> worker adapter -> artifact ingestion -> isolation contract -> worktree lifecycle -> task graph -> wave planner -> background executor -> wave executor -> local index -> governance policy。
- 当前 CLI 验证仍保持 PASS。
