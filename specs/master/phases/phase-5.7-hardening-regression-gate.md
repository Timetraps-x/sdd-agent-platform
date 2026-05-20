# Phase 5.7 Hardening / Regression Gate

## 1. 定位

Phase 5.7 是 Phase 5 Harness Engineering 的收口加固门。它不新增新的平台大能力，而是把真实 ERP 高风险 case、A/B 评测暴露出的缺陷、agent 参与叙事和对外 demo 统一固化为回归门，确保 Phase 5 能以可展示、可复测、可解释的形态进入 Phase 6 Agent / Skill Runtime Harness。

## 2. 依赖

- depends_on: Phase 5.6 Phase 7 Graph Handoff Hardening
- blocks: Phase 6.0 Agent / Skill Runtime Harness

## 3. 范围

- 建立 Phase 5 hardening / regression gate，覆盖真实 ERP inbound-sync full-chain case。
- 回归验证 A/B 评测发现的三类缺陷：task acceptance parser bleed、artifact path confusion、doctor git dependency hint。
- 让 scout / implementer / reviewer / validator 的参与方式在 README、dynamic instructions、generated Claude Code entries 中变成用户可见叙事。
- 增加外部 demo 叙事：普通 agent 直接改代码 vs SDD Harness 对高风险 ERP 任务的风险门、任务图、证据、验证、sync-back 与 doctor 闭环。

## 4. 非目标

- 不引入新的 agent 调度器或后台自主执行。
- 不实现 Phase 6 agent/skill runtime、Phase 7 core modularization 或 Phase 8 code graph。
- 不把 Oh My OpenCode、Spec Kit、GSD、BMAD、OpenSpec 的实现直接照搬进平台。
- 不发布 npm 新版本；发布仍需要独立审批和 Phase 4 发布流程。

## 5. 交付物

- `specs/master/phase5.7-spec.md`
- `specs/master/phase5.7-plan.md`
- `specs/master/phase5.7-tasks.md`
- `specs/master/phase5.7-validation.md`
- README 外部 demo / ordinary agent vs SDD Harness section
- `packages/core/src/ai-tools.ts` agent participation wording
- `packages/core/src/instructions.ts` agent participation and artifact path wording
- post-fix ERP regression report

## 6. 验收标准

- ERP regression rerun 能证明 acceptance 不再跨 task 泄漏。
- Artifact 相关输出明确区分 CLI run-relative path 与 `.sdd/runs/<run_id>/artifacts/` physical path。
- init/status/doctor 输出能提前说明 fresh temp project 需要 Git context 或 `git init`。
- 高风险 ERP task 仍会被 lifecycle/manual gate 阻断，而不是直接自动执行。
- README 能用一个高风险 ERP case 解释本平台相对普通 agent 的差异：不是更会写代码，而是更会约束风险、保存证据、分离角色、验证验收和回流状态。
- Generated Claude Code entries 和 dynamic instructions 明确描述 scout / implementer / reviewer / validator 的证据流。
- `npm test` 和 `npm run build` 通过。

## 7. 可被下游引用的产物

- Phase 6 可引用 Phase 5.7 regression gate，作为 agent/skill runtime harness 的质量基线；Phase 8 可继续消费这些 harness metadata 进入 code graph。
- README demo 可作为对外说明：SDD Harness 与通用 agent/command collection 的核心竞争力差异。
- ERP regression report 可作为后续 eval corpus 的 reviewed case。