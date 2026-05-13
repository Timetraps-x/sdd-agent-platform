# Phase 5.7 Spec

## Metadata

- phase_id: `5.7`
- title: `Hardening / Regression Gate`
- status: `in_progress`
- depends_on: `5.6`
- blocks: `6.0`
- source_artifact: `specs/master/phases/phase-5.7-hardening-regression-gate.md`

## Problem / Intent

Phase 5 已经实现 Harness Engineering 的核心 runtime 与文档合同，但真实 ERP full-chain 和 A/B 评测暴露出三个需要收口的问题：输出缺陷必须被回归验证，agent 参与必须对用户可见，平台差异必须能通过一个高风险 case 对外解释。

## Requirements

- FR-1: 必须把 parser bleed、artifact path confusion、doctor git hint 纳入 Phase 5 regression gate。
- FR-2: 必须跑一次修复后的 ERP inbound-sync full-chain regression，并保留报告路径和结果摘要。
- FR-3: 必须在 README 中加入 ordinary agent vs SDD Harness 的高风险 ERP demo 叙事。
- FR-4: 必须在 generated Claude Code entries 和 dynamic instructions 中显式说明 agent participation evidence flow。
- FR-5: 必须保持 Phase 5.7 为 hardening / narrative / regression scope，不引入新的 scheduler、graph runtime 或发布流程。

## Out of Scope

- Agent runtime scheduler。
- Code knowledge graph implementation。
- NPM publish。
- 新的外部 tool adapter。

## Acceptance Criteria

- AC-1: ERP regression 报告显示 ERP-SCRK-1 acceptance 只包含本 task 验收，不包含 ERP-SCRK-2 metadata。
- AC-2: `do task`、`verify task` 或 artifact validation 输出包含 run-relative / physical artifact path 说明。
- AC-3: init/status/doctor 路径包含 Git context / `git init` 提示。
- AC-4: 高风险 task 在 supplied artifacts 后仍被 manual isolation / approval gate 正确阻断。
- AC-5: README 能清楚说明本平台与普通 agent 的差异。
- AC-6: instructions / generated entries 能清楚说明 scout、implementer、reviewer、validator 的职责和 evidence handoff。
- AC-7: `npm test` 和 `npm run build` 通过。
