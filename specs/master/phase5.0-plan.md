# Phase 5.0 Plan

## Metadata

- phase_id: `5.0`
- plan_id: `phase5.0-harness-reframe-contract-freeze-plan`
- depends_on: `4.4`
- blocks: `5.1`

## Recommended Approach

Phase 5.0 只负责完成 **SDD Harness Engineering Reframe and Contract Freeze**。它不再承载后续 runtime implementation，而是把原本过大的 Phase 5 拆为 5.1~5.6。

## Scope

Phase 5.0 owns:

- 当前 Phase 5 定位重构为 SDD Harness Engineering。
- `Source Architecture Localization` 降级为 superseded/historical input。
- no-OS / no-scheduler / no-plugin-runtime / no-OpenCode-clone guardrail。
- 十个 harness contracts 的名称、职责和后续 phase 映射。
- autonomy level、agent_fit、verification availability、gap closure、Project Context Pack 的概念冻结。
- Phase 7 graph handoff 从 source localization metadata 升级为 harness metadata。

Phase 5.0 does not own:

- runtime resolver / risk parser / output renderer implementation。
- workflow/agent registry runtime implementation。
- task graph / run evidence runtime implementation。
- managed manifest / query/status runtime implementation。
- eval runner / learning loop implementation。
- code graph、graph database、embedding、AST/LSP graph。

## Split Plan

| New phase | Primary contract | Why split |
|---|---|---|
| 5.1 Context / Risk / Output Harness | `ContextResolverContract` + `LifecycleRiskGateContract` + `OutputQualityContract` | 直接修复真实 trial 最痛问题：branch 错、risk 漏判、输出啰嗦；会改 core/CLI/generated output。 |
| 5.2 Workflow / Agent Registry Harness | `WorkflowGateContract` + `AgentRegistryContract` | 静态 workflow/agent 资产先变得可 inspect、可 validate、可见；不和 run evidence 混在一起。 |
| 5.3 Task Graph / Run Evidence Harness | `TaskGraphContract` + `TaskRunEvidenceContract` | 这是核心执行事实源，涉及 task parser、run state/events/artifacts/verifier，应单独验收。 |
| 5.4 Managed Assets / Query Status Harness | `QueryStatusContract` + managed manifest | 统一 status/doctor/run inspect/debug 和 generated entry ownership，避免输出边界重叠。 |
| 5.5 Eval / Learning / Context Pack Harness | `SkillAgentEvalContract` + `HarnessLearningContract` + `ProjectContextPack` | eval/learning 更偏质量闭环，不应阻塞前面的 runtime contracts。 |
| 5.6 Phase 7 Graph Handoff Hardening | graph-ready harness metadata | 只稳定 Phase 7 输入，不实现图谱；避免 Phase 5 scope creep。 |

## Dependency Model

```text
4.4 -> 5.0 -> 5.1 -> 5.2 -> 5.3 -> 5.4 -> 5.5 -> 5.6 -> ... -> 5.10 -> 6.0 -> 7.0
```

Rationale:

- 5.1 先解决 context/risk/output，否则后续 workflow/agent evidence 会继续落在错误 branch 或啰嗦输出里。
- 5.2 先让 workflow/agent registry 可见，再让 5.3 写入 run evidence。
- 5.3 的 task graph/evidence 是 5.4 query/status 的事实源。
- 5.5 的 eval/learning 需要前面输出和 evidence 稳定后才能评分。
- 5.6 收口 graph-ready metadata，作为 Phase 7 前置；新的 Phase 6 会先补充 agent / skill runtime metadata。

## Validation Strategy

- Phase 5.0：验证路线、guardrail、contract map 和 split index。
- Phase 5.1~5.4：需要 `npm test`、`npm run build` 和相关 CLI smoke。
- Phase 5.5：需要固定 `user_test` eval baseline 和 regression check。
- Phase 5.6：验证 metadata schema 被 Phase 7 artifact 消费，不实现 graph runtime。

## Risks / Hard Gates

- 若后续 runtime work 仍留在 5.0，判定拆分失败。
- 若 Phase 5 暗示建设 OS、scheduler、generic plugin runtime、OpenCode clone 或替代 Claude Code 权限模型，判定越界。
- 若 5.6 引入 graph database / embedding / AST-LSP graph implementation，判定越界。
