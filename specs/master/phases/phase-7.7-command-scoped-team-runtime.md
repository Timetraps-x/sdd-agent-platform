# Phase 7.7 Command-scoped Team Runtime

## 1. 定位

Phase 7.7 将 team mode 从局部 task/do 能力升级为 command-scoped runtime 能力。team mode 是效率、质量和上下文隔离机制，但不能变成全局 agent OS。

本阶段先调研 Phase 7.6 capability catalog、现有 router/team-mode、Claude Code subagent context isolation、Oh My OpenAgent/OpenCode team mode，以及 AutoGen/CrewAI/LangGraph 等 GitHub/open-source 多 agent orchestration 的可转译边界，再走 0.3.0 SDD 链路。

## 2. 依赖

- depends_on: Phase 7.6 Agent Capability Upgrade
- blocks: Phase 7.8 Sync-back Approval, Ship and Observability
- required_by: Phase 7.8 Sync-back Approval, Ship and Observability

## 3. 范围

- 定义 command role profile。
- 定义 capability requirements -> agent/material selection -> context projection -> role execution -> summary/evidence output -> runner decision。
- 支持 spec/plan/tasks/verifies/do/test/verify/sync-back/ship/doctor deep/recover 的 command-scoped team mode。
- 记录 role evidence、independence rule、context/token telemetry。

## 4. 非目标

- 不共享大聊天上下文。
- 不让 subagent 驱动 workflow state transition。
- 不引入 LangGraph/Temporal/CrewAI 作为核心依赖。
- 不改变 `/sdd:test`、`/sdd:verify`、`/sdd:sync-back` 的基本语义。

## 5. 交付物

- Command role profile contract：9 个 command role profile，覆盖 norm、uncertainty、performance、verification、evidence、sync-back、release、context 等能力。
- Team runtime orchestration policy：11 个 command profile，支持 `single`、`team-lite`、`team-required`、`blocked`。
- Role independence checks：verify/test/ship/recover 的角色独立规则。
- Summary-only return contract：role 输出必须 summary-only 且 artifact-backed。
- Context/token telemetry：记录 context/summary/evidence refs 的 estimated-only policy。
- Registry/doctor/CLI visibility：`sdd command-team inspect|validate|decide` 与 doctor `command_team_runtime` check。

## 6. 验收标准

- 每个支持的 command 可声明 role profile。
- runtime 能根据风险选择 single-agent 或 team mode。
- subagent 输出受 summary/evidence contract 限制。
- tasks agent 与 verifies/test/verify agent 可被区分并校验。
- doctor 能检查 team mode contract。
- CLI 能展示 command profile、role、independence rule、decision 和 validation 状态。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-7.7-command-scoped-team-runtime.md`
- `specs/master/phase7.7-research.md`
- `specs/master/phase7.7-spec.md`
- `specs/master/phase7.7-plan.md`
- `specs/master/phase7.7-tasks.md`
- `specs/master/phase7.7-validation.md`
- Command-scoped team runtime contract and decision API