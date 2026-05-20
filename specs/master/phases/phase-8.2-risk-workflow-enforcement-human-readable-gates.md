# Phase 8.2 Risk Workflow Enforcement and Human-Readable Gates

## 1. 定位

Phase 8.2 是 Phase 8 coding runtime convergence 的风险工作流一致性修复阶段。它承接 Phase 8.1 真实风险矩阵报告中暴露的问题：高风险类别的 route/test/sync-back/ship gate 不一致，且默认 CLI 输出过度暴露内部 profile/team-mode，用户难以判断为什么阻断以及下一步该做什么。

本阶段目标是把“需求/任务风险 -> 生命周期 gate -> agent/team 边界 -> 用户交互输出”整理成可执行、可验证、可解释的运行时策略。

## 2. 依赖

- depends_on: Phase 8.1 Verifies-Centered Lifecycle and Agent-Team Separation
- depends_on: `specs/master/phase8.1-risk-workflow-matrix-report.md`
- blocks: Phase 9 code graph signal slices that consume lifecycle/risk decisions
- required_by: Phase 9 graph-driven impact/risk signal automation

## 3. 范围

- 定义统一的 user-facing lifecycle gate：direct、review-before-sync-back、review-before-test、approval-before-test、research-before-implementation、clarify-before-routing、verify-contract-blocked。
- 将当前真实风险 taxonomy 映射到 gate，并处理多风险叠加时的严格度优先级。
- 以 `specs/master/phase8.2-risk-taxonomy-research.md` 作为实现前置校准，统一 canonical risk family、synonym normalization 和 strictest-gate precedence。
- 让 `sdd tasks route`、`sdd test task`、`sdd sync-back inspect`、`sdd ship --dry-run` 对同一任务/分支风险给出一致 gate。
- 让 `/sdd:test` 在需要 review/approval/research/clarification 的 pre-test gate 前停止，不执行验证命令。
- 保留 direct 小任务轻量路径，避免所有需求都进入 full workflow。
- 将默认 CLI 输出调整为精简的人类可读模型：结果句、Why、Next。
- 保留 `--json` 和 `--verbose` 的完整机器可读/诊断信息。
- 明确 agent/subagent 边界：subagent 可以提供辅助证据，但不能关闭 gate、批准高风险执行、sync-back 或 ship。

## 4. 非目标

- 不实现代码知识图谱、embedding store 或 graph database。
- 不改变 branch/global ship 的保守语义。
- 不新增宽泛 orchestration facade 或重写 runtime storage。
- 不把所有非 direct 任务都强制升级为 full workflow。
- 不让 subagent 获得最终 workflow authority。
- 不发布 npm 包、不 push、不 tag、不 release。

## 5. 交付物

- `specs/master/phase8.2-spec.md`
- `specs/master/phase8.2-risk-taxonomy-research.md`
- `specs/master/phase8.2-plan.md`
- `specs/master/phase8.2-tasks.md`
- `specs/master/phase8.2-validation.md`
- `specs/master/phase8.2-risk-workflow-matrix-report.md` after implementation validation
- runtime gate policy and focused tests
- default human-readable gate renderers

## 6. 验收标准

- 风险 taxonomy 校准已完成，并作为实现前置依据。
- 所有当前风险类别都有明确 gate。
- route/test/sync-back/ship 对 gate 的理解一致。
- `/sdd:test` 不会在 pre-test gate 阻断时执行命令。
- direct 小任务仍能轻量通过并进入 direct sync-back readiness。
- 默认 CLI 输出能让用户知道：发生了什么、为什么阻断、下一步做什么。
- JSON/verbose 输出仍能支撑自动化和深度诊断。
- 完整 installed-project 风险矩阵复跑，并输出可分析报告。
- agent/subagent 权限边界通过真实验证。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-8.2-risk-workflow-enforcement-human-readable-gates.md`
- `specs/master/phase8.2-spec.md`
- `specs/master/phase8.2-risk-taxonomy-research.md`
- `specs/master/phase8.2-plan.md`
- `specs/master/phase8.2-tasks.md`
- `specs/master/phase8.2-validation.md`
- `specs/master/phase8.2-risk-workflow-matrix-report.md`
