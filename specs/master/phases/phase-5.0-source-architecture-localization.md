# Phase 5.0 SDD Harness Engineering

## 1. 定位

Phase 5.0 当前定位为 **SDD Harness Engineering Reframe and Contract Freeze**：在 Claude Code 等 AI coding harness 之上，完成 Phase 5 总路线重构、contract 命名冻结、no-OS guardrail 和 5.1~5.6 可执行小阶段拆分。

本阶段不再以 `Source Architecture Localization` 作为主定位。外部项目源码机制仍是输入证据，但只服务于本项目 harness contract 的设计，不再作为阶段身份本身。

Phase 5.0 的核心目标不是建设 OS、scheduler、plugin runtime、OpenCode clone 或自主执行内核，也不直接实现全部 runtime contracts，而是定义 Claude Code 等现有 AI 工具可消费的 SDD harness contracts，并把后续实现拆分到 5.1 context/risk/output、5.2 workflow/agent、5.3 task graph/evidence、5.4 query/status/managed assets、5.5 eval/learning/context pack、5.6 Phase 7 graph handoff。

## 2. 依赖

- depends_on: Phase 4.4 Public Publish and Adoption
- blocks: Phase 5.1 Context / Risk / Output Harness
- required_by:
  - Phase 5.1 Context / Risk / Output Harness
  - Phase 5.2 Workflow / Agent Registry Harness
  - Phase 5.3 Task Graph / Run Evidence Harness
  - Phase 5.4 Managed Assets / Query Status Harness
  - Phase 5.5 Eval / Learning / Context Pack Harness
  - Phase 5.6 Phase 7 Graph Handoff Hardening
  - Phase 6.0 Agent / Skill Runtime Harness
  - Phase 7.0 Code Knowledge Graph Baseline

## 2.1 输入文档

- `docs/architecture/command-information-architecture.md`：Phase 5.0 的 `QueryStatusContract` 和 `OutputQualityContract` 输入，负责命令分层、输出边界、`/sdd` 根入口、`/sdd:spec` workflow partition 入口与 `sdd init` 项目级 source-of-truth 边界。
- `docs/research/real-project-trial-evaluation-20260507.md`：Phase 5.0 的真实 trial 证据输入，负责把 branch bug、risk 漏判、输出啰嗦、agent 不可见、task 过粗和 evidence 缺失映射为 harness contracts。
- `docs/research/支持_subagent_的_SDD_工作流深度分析报告.md`、`docs/research/支持_subagent_的_SDD_工作流调研.md`：外部 SDD / agent workflow 机制输入。
- OpenAI harness engineering、Mitchell Hashimoto AI adoption journey、Spec Kit、cc-sdd、GSD、BMAD、Oh My OpenAgent/OpenCode 的源码/实践调研，作为 contract 设计参考，不作为目录结构复制来源。

## 3. 为什么不再叫 Source Architecture Localization

`Source Architecture Localization` 解决的是“外部源码机制如何转译成本项目机制”的问题，但用户当前目标已经更明确：不是继续调研，也不是做 OS，而是依托 Claude Code 等 AI 工具做一个 SDD harness engineering 平台。

因此 Phase 5.0 的转换公式从：

```text
外部源码机制 -> 本项目 contract -> 后续任务
```

升级为：

```text
AI tool harness capabilities -> SDD harness contracts -> evidence-backed workflow execution
```

外部项目仍保留为证据来源：

| 输入来源 | 可借机制 | 本项目吸收方式 |
|---|---|---|
| Spec Kit | adapter、manifest/hash、workflow checklist | managed entry、drift ownership、workflow gate |
| cc-sdd | layout registry、task impl loop | AI tool projection、`/sdd:do` implement/review/debug/validate loop |
| GSD | state digest、query/dispatch、verifier、gap closure | query/status API、TaskGraph、TaskRunEvidence、GapClosure |
| BMAD | roles、steps、templates、checklists | AgentRegistry、WorkflowGate、quality checklist |
| Oh My OpenAgent/OpenCode | agent team、category routing、model policy、background execution、skill/tool reuse | Phase 6 runtime contracts；Phase 5 只吸收为 harness evidence 和 guardrail 输入 |
| OpenAI / Mitchell harness practice | environment, feedback, validation, repeated-failure-to-harness | Project Context Pack、HarnessLearning、autonomy levels |

## 4. Harness Engineering 范围

Phase 5.0 建立以下 SDD harness 能力边界：

- Context：统一 project / branch / semantic docs / latest run / generated entry context。
- Risk：从文本或文件中识别 hard gate signals，决定 lifecycle profile 和 autonomy level。
- Output：所有 `/sdd:*` 和关键 CLI 输出采用 delta-first、evidence-first、next-action-first。
- Workflow：`workflows/*.yml` 不再只是提示词输入，而是可 inspect / validate 的 gate contract。
- Agent：`agents/*.md` 不再只是角色描述，而是有 stage、boundary、artifact、autonomy ceiling 的 registry contract。
- Task Graph：task 不再只是 checklist，而要表达 dependency、wave、file ownership、agent fit、verification availability、gap state。
- Evidence：`.sdd/runs`、events、artifacts、validation、sync-back proposal 成为执行事实源。
- Query/Status：`status`、`doctor`、`run inspect`、debug drill-down 共享查询语义但输出边界清晰。
- Eval：真实 trial 样本用于评估 `/sdd:*`、agent evidence、输出质量和验证可执行性。
- Learning：重复失败沉淀为 context pack、checklist、risk vocabulary、doctor check 或 eval assertion。

## 5. Harness Contract Map

| Contract | 责任 | 输入 | 输出 | 不负责 |
|---|---|---|---|---|
| `ContextResolverContract` | 解析项目、分支、语义文档、latest run 和 context pack | explicit branch、project config、git current branch、fallback、generated entry context | branch、branch_source、project_root、semantic paths、state digest | 切换 git 分支或修改业务代码 |
| `LifecycleRiskGateContract` | 从文本/文件/用户信号提取风险并执行 hard gate | user text、source file、risk flags、project context | lifecycle profile、risk signals、hard gate reason、required stages | 直接实现任务 |
| `OutputQualityContract` | 约束输出为 delta-first/evidence-first/next-action-first | command result、workflow state、artifacts | changed / decision / evidence / gaps / next | 大段复述源文档 |
| `WorkflowGateContract` | 让 workflow 进入/退出条件可测试 | workflows、spec/plan/tasks、task state、artifacts | pass/fail/warn、next action、missing inputs、gap closure | 调度器或后台执行内核 |
| `AgentRegistryContract` | 定义 agent 角色、边界、工具和产物要求 | agents、workflows、AI tool capabilities | allowed agents、read/write boundary、required artifact、autonomy ceiling | 模型托管、权限替代、通用 agent OS |
| `TaskGraphContract` | 让 tasks 可被检查、切片和调度规划 | sdd-task metadata、affected files、dependencies、risk | dependency graph、wave、overlap、agent_fit、verification availability | 自动并发执行所有任务 |
| `TaskRunEvidenceContract` | 标准化任务执行证据 | `.sdd/runs`、events、agent outputs、validation results | implementation/review/debug/validation/gap artifacts、sync-back proposal | 替代人工审查 |
| `QueryStatusContract` | 统一 status/doctor/run inspect/debug 的读取模型 | docs、runtime state、artifacts、doctor evidence | next action、health audit、run evidence、drill-down view | dashboard database |
| `SkillAgentEvalContract` | 评估 skill/agent/workflow 是否产生新增价值 | real trial corpus、generated artifacts、expected criteria | scores、regression signals、quality gaps | 通用 LLM benchmark |
| `HarnessLearningContract` | 把重复失败沉淀为 harness 改进 | eval results、gap reports、user feedback、doctor findings | context pack updates、checklist/rule/eval assertions | 自修改 runtime 或隐藏自动化 |

## 6. Autonomy Level Model

Phase 5.0 将 autonomy 作为 SDD lifecycle 后的独立决策，而不是默认全自动。

| Level | 含义 | 允许行为 | 典型条件 |
|---|---|---|---|
| `report_only` | 只分析和报告 | 只读调研、风险判断、review report | context unknown、verification missing、高风险但边界未明 |
| `assisted` | 可产出方案/patch 建议 | 生成计划、diff 建议、命令建议，写入前需确认 | 中风险、有明确边界但需要人工确认 |
| `agent_safe` | 可通过 Claude Code 权限执行有界本地动作 | 在 task boundary 内修改、运行验证、产出 artifacts | 低/中风险、验证可用、agent_fit high |
| `human_required` | 必须停止并交给人 | 只输出 decision/gaps/next | secrets、发布、破坏性操作、数据丢失、安全/合规硬门 |

Autonomy 由以下因素决定：

- lifecycle profile
- risk signals
- affected files
- verification availability
- agent_fit
- tool/permission boundary
- destructive/shared/external blast radius
- user confirmation policy

## 7. Project Context Pack / AGENTS.md-style Context

Phase 5.0 引入 Project Context Pack 作为 agent 长期上下文层。它类似 AGENTS.md / ARCHITECTURE.md / docs references，但本项目保持明确事实源边界：

```text
Project Context Pack = durable agent-readable context
.sdd/project.yml / core query = structured source of truth
specs/<branch> = semantic task source of truth
.sdd/runs = execution evidence source of truth
generated AI entries = tool-specific projection
```

Project Context Pack 应包含：

- project identity
- branch/source rules
- tech stack and validation commands
- known risks and vocabulary
- safe/unsafe commands
- preferred agents and workflow hints
- forbidden actions / do-not-touch boundaries
- architecture/product/design references
- generated entry ownership boundaries
- eval and repeated-failure learning notes

Phase 5.0 不把 Project Context Pack 做成执行 runtime，它只提供 Claude Code 等工具可读的长期上下文。

## 8. 非目标

- 不建设 OS、scheduler、generic plugin runtime、model router、后台自主编码平台或 OpenCode clone。
- 不替代 Claude Code 的权限模型、hooks、worktree 行为、slash command 机制或工具执行边界。
- 不引入 graph database、embedding store、完整 AST/LSP 代码图谱；这些属于 Phase 7 或更后续。
- 不复制 Spec Kit、cc-sdd、GSD、BMAD、Oh My OpenAgent 的目录结构或命名体系。
- 不让 generated command 承担核心 workflow brain；核心 contract 仍在 CLI/core/docs 中。
- 不把所有任务都默认 agent 自动执行；必须通过 autonomy level、risk gate 和 verification availability 决策。

## 9. 交付物

- Phase 5.0 SDD Harness Engineering reframe / contract freeze artifact / spec / plan / tasks / validation。
- 十个 harness contracts 的名称、职责和后续 phase 映射。
- Autonomy level / agent_fit / verification availability / gap closure 的 task/workflow 语义冻结。
- Project Context Pack / AGENTS.md-style context 的边界定义。
- Phase 5.1~5.6 executable phase documents。
- Phase 7 graph-ready handoff 更新为 harness metadata，而不是 source localization metadata。

## 10. 拆分后的 Phase 5 路线

| Phase | Title | Boundary |
|---|---|---|
| 5.0 | SDD Harness Engineering Reframe and Contract Freeze | 路线重构、contract freeze、no-OS guardrail、拆分路线 |
| 5.1 | Context / Risk / Output Harness | branch context、risk extraction、autonomy decision、输出结构 |
| 5.2 | Workflow / Agent Registry Harness | workflow gate、agent registry、slash command agent evidence |
| 5.3 | Task Graph / Run Evidence Harness | task graph、agent_fit、verification availability、run evidence、verifier |
| 5.4 | Managed Assets / Query Status Harness | managed manifest、doctor drift、status/doctor/run inspect/debug 边界 |
| 5.5 | Eval / Learning / Context Pack Harness | ERP trial eval、HarnessLearning、Project Context Pack |
| 5.6 | Phase 7 Graph Handoff Hardening | graph-ready harness metadata，不实现图谱 |

## 11. 验收标准

- Phase 5 当前路线事实源为 `SDD Harness Engineering`。
- `Source Architecture Localization` 只作为 superseded/historical input 出现，不再作为当前阶段定位。
- Phase 5.0 明确依托 Claude Code 等 AI tool harness，不建设 OS/scheduler/plugin runtime。
- 十个 harness contracts 出现在 phase artifact、spec、plan、tasks、validation 的核心结构中，并映射到 5.1~5.6。
- Autonomy levels：`report_only`、`assisted`、`agent_safe`、`human_required` 被定义并进入后续任务/评估边界。
- `agent_fit`、verification availability、gap closure、Project Context Pack 被纳入后续 phase 范围。
- Phase 6 拥有 Agent / Skill Runtime Harness；Phase 7 拥有 Code Knowledge Graph，Phase 5 只提供 graph-ready harness metadata。
- Phase 5.0 只完成文档/路线 reframe；runtime implementation 从 Phase 5.1 开始。

## 12. Phase 7 Handoff

Phase 7.0 负责 Code Knowledge Graph Baseline；其输入从 source localization records 升级为 Phase 5 harness metadata，并会继续消费 Phase 6 agent / skill runtime metadata：

- `HarnessContract`
- `ContextResolverDecision`
- `LifecycleRiskGateDecision`
- `AutonomyLevel`
- `AgentFit`
- `VerificationAvailability`
- `WorkflowGateResult`
- `TaskGraphNode`
- `TaskRunEvidence`
- `GapClosure`
- `SkillAgentEvalResult`
- `ProjectContextPackChange`
- `AgentProfileContract`
- `SkillCapabilityContract`
- `HostAdapterContract`
- `AgentRouterDecision`
- `AgentExecutionRecord`
- `SkillReuseDecision`
- `EvidenceIngestionRecord`

这些 metadata 为 Phase 7 图谱提供结构化节点和关系，但 Phase 5 不实现图谱存储或查询。