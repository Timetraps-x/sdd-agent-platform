# Phase 5.0 Spec

## Metadata

- phase_id: `5.0`
- title: `SDD Harness Engineering Reframe and Contract Freeze`
- supersedes_title: `Source Architecture Localization`
- status: `completed`
- depends_on: `4.4`
- blocks: `5.1`
- source_artifact: `specs/master/phases/phase-5.0-source-architecture-localization.md`

## Problem / Intent

Phase 5 原先把 context、risk、output、workflow、agent、task graph、run evidence、query/status、eval、learning 和 graph handoff 都放在一个 Phase 5.0 中，边界过大，不利于执行和验收。

Phase 5.0 的职责收敛为：完成路线重构和 contract freeze，把 Phase 5 总主题确认为 **SDD Harness Engineering**，并把后续 runtime work 拆分为 5.1~5.6。旧的 `Source Architecture Localization` 只保留为 superseded/historical input。

## Requirements

### Functional Requirements

- FR-1: Phase 5.0 必须把当前路线定位为 `SDD Harness Engineering`。
- FR-2: Phase 5.0 必须明确不建设 OS、scheduler、generic plugin runtime、model router、OpenCode clone 或 Claude Code 权限替代。
- FR-3: Phase 5.0 必须冻结十个 harness contracts 的名称和责任边界：`ContextResolverContract`、`LifecycleRiskGateContract`、`OutputQualityContract`、`WorkflowGateContract`、`AgentRegistryContract`、`TaskGraphContract`、`TaskRunEvidenceContract`、`QueryStatusContract`、`SkillAgentEvalContract`、`HarnessLearningContract`。
- FR-4: Phase 5.0 必须定义 autonomy model：`report_only`、`assisted`、`agent_safe`、`human_required`。
- FR-5: Phase 5.0 必须把后续实现拆分为 Phase 5.1~5.6，而不是继续把 runtime work 塞进 5.0。
- FR-6: Phase 5.0 必须确认 Phase 6 拥有 Agent / Skill Runtime Harness，Phase 7 拥有 Code Knowledge Graph，Phase 5 只提供 graph-ready harness metadata。

### Non-functional Requirements

- NFR-1: Phase 5.0 不改 runtime code。
- NFR-2: Phase 5.0 不声明后续 harness runtime 已完成。
- NFR-3: Phase 5.0 保留原文件路径，避免已有链接大规模迁移。

## Phase Split

| Phase | Title | Boundary |
|---|---|---|
| 5.0 | Harness Reframe and Contract Freeze | 路线重构、contract freeze、no-OS guardrail、Phase 7 handoff 边界 |
| 5.1 | Context / Risk / Output Harness | branch/context resolver、risk extraction、autonomy decision、输出结构 |
| 5.2 | Workflow / Agent Registry Harness | workflow inspect/validate、agent registry、slash command agent evidence |
| 5.3 | Task Graph / Run Evidence Harness | task graph、agent_fit、verification availability、run evidence、verifier |
| 5.4 | Managed Assets / Query Status Harness | managed manifest、doctor drift、status/doctor/run inspect/debug 边界 |
| 5.5 | Eval / Learning / Context Pack Harness | ERP trial eval、HarnessLearning、Project Context Pack |
| 5.6 | Phase 7 Graph Handoff Hardening | graph-ready metadata schema 和 Phase 7 输入稳定化 |

## Acceptance Criteria

- AC-1: Phase 5.0 当前标题和路线事实源均为 SDD Harness Engineering。
- AC-2: `Source Architecture Localization` 只作为 superseded/historical input 出现。
- AC-3: 十个 harness contracts 被定义，并映射到 5.1~5.6。
- AC-4: Phase 5.0 不建设 OS/scheduler/plugin runtime/OpenCode clone，不替代 Claude Code 权限模型。
- AC-5: Phase 5.1~5.6 都有独立 artifact/spec/plan/tasks/validation 入口。
- AC-6: Phase 6 拥有 Agent / Skill Runtime Harness，Phase 7 拥有 Code Knowledge Graph。

## Out of Scope

- 实现 5.1~5.6 的 runtime work。
- 实现代码知识图谱。
- 建设 OS、scheduler、generic plugin runtime、OpenCode clone。
- 替代 Claude Code 权限、hooks、tool execution、worktree 机制。
