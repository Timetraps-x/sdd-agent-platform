# Phase 8.0 Code Knowledge Graph Baseline

## 1. 定位

Supersession note: this artifact is retained as historical graph baseline provenance. Current Phase 8 scope is Coding Runtime Convergence, and code graph signals are deferred to Phase 9 after risk/context/evidence/workflow consumers are stable.

本阶段目标是让平台从“按任务执行并记录证据”进一步演进为“理解项目结构、依赖、变更影响、agent 执行历史和历史决策”的持续迭代系统。

## 2. 依赖

- depends_on: Phase 5.6 Graph Handoff Hardening
- depends_on: Phase 6.10 Context Budget Runtime and Non-authoritative Log Workers
- depends_on: Phase 7.8 Sync-back Approval, Ship and Observability
- blocks: []
- required_by: []

## 3. 范围

- 消费 Phase 5.6 定义的 graph-ready harness metadata：HarnessContract、ContextResolverDecision、LifecycleRiskGateDecision、AutonomyLevel、WorkflowGateResult、AgentFit、VerificationAvailability、TaskGraphNode、TaskRunEvidence、GapClosure、SkillAgentEvalResult、ProjectContextPackChange。
- 消费 Phase 6 / 6.1 新增的 agent / skill / resident runtime metadata：AgentProfileContract、SkillCapabilityContract、HostAdapterContract、AgentRouterDecision、AgentExecutionRecord、SkillReuseDecision、EvidenceIngestionRecord、ResidentWorkerRuntimeRecord。
- 消费 Phase 6.2 的 RC validation evidence、Phase 6.3 的 merged runtime registry evidence、Phase 6.4 的 partition/revision evidence、Phase 6.5 的 partition-aware run isolation evidence、Phase 6.6 的 documentation IA evidence、Phase 6.7 的 output dedup evidence、Phase 6.8 的 document language evidence、Phase 6.9 的 policy-proven runtime trust / fast-path evidence、Phase 6.10 的 context budget / non-authoritative projection evidence，以及 Phase 7.1-7.8 的 runtime storage v2、workflow state resolver、verification contract、test evidence、agent capability、team runtime、sync-back approval、ship/observability evidence，确保 graph baseline 基于稳定且可扩展的 runtime state、evidence refs、agent/skill/source registry、spec namespace、run provenance、文档分类边界、runtime 输出边界、证据质量、policy-backed acceptance coverage、provenance graph、attestation materials、delegation routing、sync-back 状态、命令 profiling、context package 和非权威摘要边界启动。
- 代码结构图谱：module / package / class / function / API / table / mapper / config。
- 依赖与影响图谱：调用关系、数据流、配置依赖、affected_files 与真实影响面映射。
- SDD 语义图谱：spec / plan / task / acceptance / artifact / gap / validation evidence。
- 运行历史图谱：run、agent profile、host adapter、skill capability、version、task result、debug attempt、validation result。
- 检索与推理能力：impact analysis、相似任务召回、风险提示、测试建议、架构漂移识别。

## 4. 非目标

- 不作为 Phase 1~7 的前置条件。
- 不从自由文本倒推全部事实；优先消费前置 phase 已结构化的 metadata。
- 不在 Phase 8.0 之前引入 graph database 或 embedding store 作为平台硬依赖。
- 不替代 Phase 6 的 agent / skill router；图谱只为 router、planner、reviewer、validator 提供事实输入。

## 4.1 Handoff inputs

| Input | Source of truth | Graph baseline role |
|---|---|---|
| HarnessContract | Phase 5 contract docs/runtime exports | contract nodes and governance edges |
| ContextResolverDecision | `sdd status` and lifecycle decision evidence | branch/context scoping for graph queries |
| LifecycleRiskGateDecision | lifecycle records and run artifacts | risk/profile/required-stage decision edges |
| AutonomyLevel | lifecycle gate and agent registry | automation boundary and checkpoint explanation |
| WorkflowGateResult | workflow gate contracts and run events | stage transition and required artifact edges |
| AgentFit | task graph metadata and agent registry | task-to-agent suitability edges |
| VerificationAvailability | task metadata and validation artifacts | acceptance-to-command/evidence edges |
| TaskGraphNode | `sdd-task` blocks and task graph planner | SDD task dependency and affected-file graph |
| TaskRunEvidence | Runtime Storage v2 SQLite state and branch-scoped evidence refs | run/evidence provenance graph |
| GapClosure | gap artifacts, sync-back proposal, run events | blocker resolution and drift feedback edges |
| SkillAgentEvalResult | eval contract and validation output | regression/eval graph nodes |
| ProjectContextPackChange | Project Context Pack contract and reviewed context updates | durable context nodes that do not replace runtime facts |
| AgentProfileContract | Phase 6 profile registry | role/capability nodes for planner/architect/implementer/reviewer/validator/researcher/orchestrator |
| SkillCapabilityContract | Phase 6 skill capability catalog | reusable skill/tool capability nodes and provenance |
| HostAdapterContract | Phase 6 host adapter boundary | host integration edges for Claude Code/OpenCode-compatible execution |
| AgentRouterDecision | Phase 6 router output | task-to-profile/category/model/autonomy routing explanation |
| AgentExecutionRecord | Runtime Storage v2 agent role records and evidence refs | actual agent execution provenance graph |
| SkillReuseDecision | Phase 6 reuse policy | borrowed-vs-built capability decisions and source attribution |
| EvidenceIngestionRecord | Phase 6 evidence ingestion contract | agent output to SDD artifact/evidence edges |
| RuntimeRegistryEvidence | Phase 6.3 merged runtime registry and route decisions | built-in/project-config agent, skill, source, alias, routing-rule provenance graph inputs |
| PartitionRevisionEvidence | Phase 6.4 workflow partition resolver and spec revision/stale status | branch/spec namespace, safe partition id, spec hash, and downstream stale edges |
| PartitionAwareRunIsolationEvidence | Phase 6.5 run state/index/resolver and conflict gates | partition-aware run/task/document snapshot, stale run, wrong-branch, and affected-file conflict graph inputs |
| DocumentationIAEvidence | Phase 6.6 documentation information architecture | document category, runtime/generated/archive boundary, migration risk class, and validation gate graph inputs |
| OutputDedupEvidence | Phase 6.7 token budget and output dedup runtime | compact/full JSON output behavior, renderer dedup boundary, and runtime English output graph inputs |
| DocumentLanguageEvidence | Phase 6.8 project document language runtime | project-level `docs_language`, generated document prose language, and contract-preservation graph inputs |
| RuntimeTrustFastPathEvidence | Phase 6.9 CER evidence claims, PROV-like facts, evidence attestations, policy decisions, evidence gate, coverage, invocation ledger, route records, sync-back state, doctor trust checks, and profiling output | policy-proven PASS evidence, acceptance-to-evidence/provenance/attestation edges, invocation provenance, routing consistency, monotonic sync-back, and command fast-path confidence graph inputs |
| ContextBudgetEvidence | Phase 6.10 context profiles, evidence summaries, command output summaries, context build packages, and non-authoritative log worker summaries | compact context projections, expandable source refs, source hashes, and non-authoritative summary boundaries for graph ingestion |
| Phase7RuntimeRepairEvidence | Phase 7.1-7.8 runtime storage, resolver, verify/test, team, sync-back, ship artifacts | SQLite-first runtime graph, verification/test evidence graph, command-scoped team provenance, release/readiness graph inputs |
| RCValidationEvidence | Phase 6.2 validation checklist and package smoke | graph baseline launch readiness and package/source hygiene confidence |

## 5. 交付物

- harness graph-ready metadata 消费模型。
- agent / skill runtime graph input model。
- project code index baseline。
- SDD semantic graph baseline。
- run/evidence graph baseline。
- impact analysis query baseline。

## 6. 验收标准

- 能消费 Phase 5.6 handoff 中的 harness metadata。
- 能消费 Phase 6.0/6.1 中的 AgentProfileContract、SkillCapabilityContract、HostAdapterContract、AgentRouterDecision、AgentExecutionRecord、SkillReuseDecision、EvidenceIngestionRecord、ResidentWorkerRuntimeRecord。
- 能消费 Phase 6.2 的 RC validation evidence、Phase 6.3 的 merged runtime registry evidence、Phase 6.4 的 partition/revision evidence、Phase 6.5 的 partition-aware run isolation evidence、Phase 6.6 的 documentation IA evidence、Phase 6.7 的 output dedup evidence、Phase 6.8 的 document language evidence、Phase 6.9 的 runtime trust / fast-path evidence、Phase 6.10 的 context budget / non-authoritative projection evidence，以及 Phase 7.0 的 core module boundary evidence，确认 graph baseline 启动时 core/CLI/test/package 边界、agent/skill/source 扩展机制、spec namespace、run provenance、文档分类边界、runtime 输出边界、文档语言边界、policy-proven PASS 边界、provenance graph、attestation materials、invocation provenance、sync-back 单调状态、fast-path 正确性、context package、摘要非权威边界和 core 模块边界已通过验证。
- 能把至少一个真实 run 的 spec / task / agent execution / worker runtime / artifact / validation evidence 串成可查询关系。
- 能对一个 task 的 affected_files 给出结构化影响面解释。
- 不要求 graph 结果替代人工 review，只作为 planner / reviewer / validator 的证据输入。
- 不从 Project Context Pack、eval summary 或自然语言说明反向覆盖 specs / `.sdd/runs` 的结构化事实。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-8.0-code-knowledge-graph-baseline.md`
- 后续 `specs/master/phase8.0-spec.md`
- 后续 `specs/master/phase8.0-plan.md`
- 后续 `specs/master/phase8.0-tasks.md`
- 后续 `specs/master/phase8.0-validation.md`