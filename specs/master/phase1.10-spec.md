# Phase 1.10 Spec — 真实项目验收试跑

## 定位

Phase 1.10 只执行真实/合成项目试跑，用当前 `sdd-agent-platform` TypeScript/Node 项目作为真实工作树，验证 Phase 1.0~1.9 已构建的平台是否能完成最小闭环。

## 目标

- 在真实项目工作树中创建 trial SDD 文档并解析 task。
- 使用 CLI 覆盖 lifecycle decide、task parsing、single-task loop、goal-level verify 与 doctor。
- 验证 run state/events/artifacts/sync-back proposal 能形成可审计证据链。
- 保持 sync-back 为 proposal，不自动写回 `tasks.md`。

## 非目标

- 不自动 commit / push / PR。
- 不调用外部 agent API。
- 不引入 Phase 2 入口投影、Phase 3 worktree/tool registry/dashboard/run database、Phase 4 npm distribution、Phase 5 harness engineering、Phase 6 agent/skill runtime harness 或 Phase 7 代码知识图谱。
- 不把试跑结果静默同步回上游 spec/plan/tasks。
- 不做超出 trial blocker 的实现修复。

## Trial Project Setup

项目根目录：`D:\project\sdd-agent-platform`

适配文件：`.sdd/project.yml`

Trial SDD branch：`specs/trial/`

- `specs/trial/spec.md`
- `specs/trial/plan.md`
- `specs/trial/tasks.md`

Trial task：`P1.10-T1`

```text
P1.10-T1: 验证 Phase 1.10 CLI 闭环
```

## Acceptance

- `npm run typecheck`、`npm test`、`npm run build` 通过。
- `lifecycle decide` 能将 full profile decision 记录到 run state/events。
- `tasks list / inspect / gaps` 能解析 trial task 且无 task gap。
- `do task` 能接受 reviewer/validator artifacts，完成单 task loop，并生成 sync-back proposal。
- `verify task` 能生成 acceptance coverage artifact，且全部 acceptance PASS。
- `doctor` 能只读报告历史 run 中的 liveness/artifact gaps，不 auto-fix。

## Boundaries

- Trial reviewer/validator artifacts 为本地预置 `sdd-result-v1` 文件，用来模拟 agent 输出；未调用外部 agent API。
- Runtime 只写 `.sdd/runs/<run_id>/` 与 trial SDD 文档；未自动 commit/push/PR。
- Sync-back 停留在 `.sdd/runs/20260501-020/artifacts/sync-back-proposal.md`。
