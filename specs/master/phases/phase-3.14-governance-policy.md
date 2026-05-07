# Phase 3.14 Governance Policy

## 定位

Phase 3.14 固化长期运行治理策略：并发限制、清理策略、用户确认 gate、失败重试边界、审计和风险升级。它把 Phase 3 的 runtime 能力收束为可控平台规则。

## 依赖

- Phase 3.10 Wave Planner。
- Phase 3.11 Background Executor。
- Phase 3.12 Wave Executor。
- Phase 3.13 Local Run Index。
- Phase 1.0 lifecycle decision model。

## 范围

- 定义 governance policy schema。
- 定义并发上限、manual confirmation、archive/cleanup、retry 和 stop conditions。
- 定义 risky operation escalation：destructive git、external interaction、permission-sensitive operation。
- 将 policy 接入 doctor 和 instruction/status 输出。

## 非目标

- 不自动批准 destructive action。
- 不绕过 Claude Code permission prompt。
- 不实现远程 dashboard 或云端队列。
- 不改变用户对 sync-back apply/commit/push 的显式控制。

## 交付物

- `phase3.14-spec.md`、`phase3.14-plan.md`、`phase3.14-tasks.md`、`phase3.14-validation.md`。
- Governance policy API/CLI/doctor check。
- Policy-driven executor gate tests。

## 验收标准

- Policy 能解释何时允许、阻塞或要求用户确认。
- Background/wave executor 遵守 policy gate。
- Doctor/status 能展示 policy 生效状态。
- Destructive/shared-state actions 默认需要显式用户确认。

## 下游引用

- Phase 5 知识图谱或更长期平台能力必须复用本 governance policy，不能绕开 runtime gate。
