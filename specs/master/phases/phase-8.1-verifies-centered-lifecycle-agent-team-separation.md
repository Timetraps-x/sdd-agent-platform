# Phase 8.1 Verifies-Centered Lifecycle and Agent-Team Separation

## 1. 定位

Phase 8.1 是 Phase 8 前置工作流修复阶段。它根据真实 `/sdd` 使用场景，把 verifies、goal-verify、agent-team authority separation 纳入生命周期语义，并修复 `/sdd:test` 在 missing/stale/broken `verify.md` 下的真实执行行为。

本阶段已经完成，并通过代表性真实 installed-project `/sdd` 场景验证。随后扩展的风险矩阵报告暴露了 Phase 8.2 需要处理的风险 gate 一致性问题。

## 2. 依赖

- depends_on: Phase 7.8 Sync-back Approval, Ship and Observability
- depends_on: Phase 7.9 Workflow Semantics Context Token Hardening
- blocks: Phase 8.2 Risk Workflow Enforcement and Human-Readable Gates
- required_by: Phase 8.2 Risk Workflow Enforcement and Human-Readable Gates

## 3. 范围

- 将 `verifies` 和 `goal-verify` 作为 SDD-controlled workflow 的显式 lifecycle stage。
- 保留 direct-simple 小任务路径，支持低风险页面、样式、文案等小范围变更走 `do -> test`。
- 让 `/sdd:test` 在命令执行前创建、刷新或阻断 `verify.md`。
- 生成 `verify.md` 的 role metadata：`verification-designer`，并声明独立于 `task-planner` 和 `implementer`。
- 明确 implementer 不拥有权威 goal verification。
- 明确 subagent 只能提供辅助证据，不能关闭 sync-back、ship 或 approval gate。
- 修复 stale verify refresh 后仍使用旧 branch model 导致误阻断的 bug。
- 修复 sync-back task scope 和 router nextAction approval 文案问题。

## 4. 非目标

- 不把 `/sdd:verifies` 投影为主要用户侧 slash lifecycle 入口。
- 不移除低层 verify diagnostic 命令。
- 不实现完整风险矩阵 gate enforcement。
- 不改变 branch/global ship 保守语义。
- 不让 subagent 获得最终 gate authority。

## 5. 交付物

- `specs/master/phase8.1-spec.md`
- `specs/master/phase8.1-plan.md`
- `specs/master/phase8.1-tasks.md`
- `specs/master/phase8.1-validation.md`
- `specs/master/phase8.1-risk-workflow-matrix-report.md`
- verifies-centered lifecycle/runtime changes
- missing/stale/broken verify contract real validation evidence

## 6. 验收标准

- `/sdd:test` 能创建 missing `verify.md`，刷新 stale `verify.md`，并在 broken `verify.md` 时阻断命令执行。
- Generated `verify.md` 包含 role separation metadata。
- Direct low-risk task 仍保持轻量路径。
- Security/token/unknown 等高风险 blocker 不被误表述为 task gap。
- Task-scoped sync-back 不被 unrelated branch/global lifecycle diagnostic 误阻断。
- Branch/global ship gate 保持保守。
- 真实 installed-project `/sdd` 场景验证通过。
- 完整风险矩阵报告输出后，未解决的风险 gate 一致性问题进入 Phase 8.2。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-8.1-verifies-centered-lifecycle-agent-team-separation.md`
- `specs/master/phase8.1-spec.md`
- `specs/master/phase8.1-plan.md`
- `specs/master/phase8.1-tasks.md`
- `specs/master/phase8.1-validation.md`
- `specs/master/phase8.1-risk-workflow-matrix-report.md`
