# Phase 5.6 Phase 7 Graph Handoff Hardening

## 1. 定位

Phase 5.6 稳定未来 Phase 7 Code Knowledge Graph Baseline 的 Phase 5 harness metadata 输入。它只做 graph-ready harness metadata handoff，不实现 graph database、embedding、AST/LSP graph 或 graph query runtime。

新的 Phase 6 Agent / Skill Runtime Harness 会在图谱前补充 agent / skill / host adapter runtime metadata；Phase 5.6 只定义 Phase 7 仍需消费的 Phase 5 harness metadata 边界。

## 2. 依赖

- depends_on: Phase 5.5 Eval / Learning / Context Pack Harness
- blocks: Phase 7.0 Code Knowledge Graph Baseline

## 3. 范围

- 定义 Phase 7 消费的 graph-ready harness metadata schema。
- 更新 Phase 7 artifact/spec 输入边界，使 Phase 7 依赖 Phase 5.6 handoff 和 Phase 6 runtime metadata，而不是从自由文本反推 Phase 5/6 语义。
- 明确 graph-ready metadata 与 `.sdd/runs`、specs、Project Context Pack、eval/learning contract 的事实源关系。

## 3.1 Graph-ready harness metadata schema

| Metadata | Fact source | Required fields | Phase 7 usage |
|---|---|---|---|
| HarnessContract | Phase 5 contract exports and docs | contract id, version, owner, scope, boundary, source artifact | 建立 harness contract 节点，连接 workflow、agent、query/status、eval、learning 边界 |
| ContextResolverDecision | `sdd status` context output and lifecycle records | branch, source, spec_dir, project_root boundary | 连接 spec 分支、项目上下文和后续 graph query scope |
| LifecycleRiskGateDecision | lifecycle decision state/event/artifact | profile, hard_gates, risk_signals, required_stages, autonomy_ceiling, next_action | 连接需求风险、执行路径、人工 checkpoint 和后续 impact analysis |
| AutonomyLevel | lifecycle gate and agent registry metadata | level, allowed_actions, confirmation_required, stop_conditions | 约束 agent/run 节点，解释为什么某些任务不能自动执行 |
| WorkflowGateResult | WorkflowGateContract and run events | stage, allowed_agents, required_artifacts, gate_result, next_action | 连接 SDD stage、agent artifact 和执行状态迁移 |
| AgentFit | task graph metadata and AgentRegistryContract | task_id, candidate_agents, selected_agent, non_use_reason, stop_condition | 让 Phase 7 能解释任务为何适合 scout/planner/implementer/reviewer/validator |
| VerificationAvailability | task metadata and validation artifacts | task_id, validation_sources, executable_commands, unavailable_reason, evidence_path | 连接验收点、可执行验证和缺失验证 gap |
| TaskGraphNode | `sdd-task` blocks and task graph planner | id, depends_on, wave, affected_files, risk, validation, graph diagnostics | 构建 SDD semantic graph 的 task dependency / file impact baseline |
| TaskRunEvidence | `.sdd/runs/<run_id>/state.json`, `events.jsonl`, artifacts | run_id, task_id, delegation_id, agent, artifact_path, status, validation_status | 连接 run graph、artifact evidence 和 agent performance |
| GapClosure | gap artifacts, sync-back proposal, run events | gap_id, blocked_task, source, closure_target, status, sync_back_path | 追踪 blocker、回流路径和架构漂移证据 |
| SkillAgentEvalResult | SkillAgentEvalContract and eval validation output | corpus, dimensions, score/threshold, regression_assertions, failing_dimension | 将真实 trial 评分变成可查询 regression/eval 节点 |
| ProjectContextPackChange | Project Context Pack contract and reviewed memory/context updates | entry_point, durable_context_type, runtime_source_boundary, reviewed_change | 保留长期上下文，但明确不替代 runtime source of truth |

## 3.2 Fact source boundary

- specs：`spec.md`、`plan.md`、`tasks.md` 是 SDD semantic source of truth。
- `.sdd/runs`：`state.json`、`events.jsonl`、artifact index 和 run artifacts 是 runtime source of truth。
- Project Context Pack：只提供 durable collaboration/project context，不能标记 task 完成、不能替代 run evidence。
- eval/learning：只产出 reviewed sink、regression assertion、doctor/checklist/guidance，不自修改 runtime。
- Phase 5.6 只稳定 metadata handoff；graph database、embedding、AST/LSP graph、query dashboard 进入 Phase 7 或更后续拆分。

## 4. 非目标

- 不实现 code graph。
- 不选择 graph database 或 embedding provider。
- 不实现 AST/LSP graph。
- 不引入 graph query dashboard。

## 5. 验收标准

- Phase 7 artifact 明确消费 Phase 5 harness metadata，并依赖 Phase 5.6 handoff。
- Phase 5 不实现图谱存储、embedding、AST/LSP graph 或 query runtime。
- graph-ready metadata schema 足以让 Phase 7 拆分 executable phases。
- metadata fact source boundary 明确区分 specs、`.sdd/runs`、Project Context Pack 和 eval/learning outputs。
- `sdd status --branch master` 无 route gaps。