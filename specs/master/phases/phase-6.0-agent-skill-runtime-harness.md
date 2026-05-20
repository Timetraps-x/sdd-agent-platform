# Phase 6.0 Agent / Skill / Team Runtime Harness

## 1. 定位

Phase 6.0 把 agent、skill、MCP、host tools、外部 agent 素材库和 team-mode 并行协作，转译为 SDD-owned runtime contract layer。它不是重造 OpenCode、Claude Code、Cline/Roo、CrewAI、AutoGen、LangGraph、Oh My OpenAgent、plugin runtime、MCP hub 或 scheduler，而是在 SDD lifecycle risk gate、task metadata、router decision、run evidence、verify/doctor 约束下复用已有轮子。

本阶段的目标不是“找更强 prompt 替代本地 agent”，而是让外部仓库成为素材库、机制库和能力目录来源：抽取 taxonomy、tool permission、evidence pattern、team coordination、quality gate、file ownership、trajectory、skill package 和 marketplace manifest，再转译成 SDD contract。SDD profile、task state、risk gate、required artifacts 和 completion truth 仍由本平台掌握。

Phase 6.0 将 `agent_fit`、`allowed_agents`、`required_artifacts`、`autonomy`、`risk` 从 `tasks.md` 的外在标注升级为 runtime router 输入，并新增 capability catalog、external pack quarantine、tool permission、team-mode policy、agent execution/team session records 和 evidence ingestion，使平台从“可解释的 SDD 文档链”升级为“SDD contract 控制下的 agent / skill / team execution harness”。

## 2. 依赖

- depends_on: Phase 5.10 Document Chain Verify / Doctor
- blocks: Phase 6.1 Resident Agent Worker Runtime; Phase 7.0 Core Runtime Modularization; Phase 8.0 Code Knowledge Graph Baseline
- required_by: Phase 6.1 Resident Agent Worker Runtime; Phase 7.0 Core Runtime Modularization; Phase 8.0 Code Knowledge Graph Baseline

## 3. 调研结论转译

| 外部来源 / 理念 | 可借鉴机制 | SDD 转译 | Phase 6 产物 |
|---|---|---|---|
| Claude Code | subagents、skills、slash commands、MCP、hooks、settings/permissions、background tasks | host-native execution capability，不重造执行内核 | HostAdapterContract / SkillCapabilityContract |
| OpenCode / Oh My OpenAgent | category routing、model fallback、config merge、hook bridge、background/tmux/session discipline | host adapter 和 model policy 参考，不复制 agent 名称/prompt | AgentRouterContract / ModelPolicyContract |
| Oh My team-mode | chief agent、specialist team、`team_create` / `team_send_message` / `team_task_create`、tmux focus/grid、hyperplan、security-research | 自适应 team execution contract，默认由 router 判断 off/review-lite/hyperplan/security-research，成员并行但受 SDD risk/artifact/evidence 约束 | TeamModePolicy / TeamSessionRecord / DelegationWavePolicy |
| Roo Code / Cline | mode、tool group、runtime permission validation、approval、subagent result envelope | 工具权限和执行结果 envelope | ToolPermissionSpec / HostAdapterResult / AgentExecutionRecord |
| cc-sdd | task-local implementer/reviewer/debugger dispatch、completion gate、bounded debug loop | SDD task graph 驱动的 delegation wave 和 completion gate | DelegationWavePolicy / CompletionGate |
| agency-agents | 约 200 个 domain expert agent、minimal-change、evidence collector、reality checker、MCP builder、multi-tool convert/install | 外部素材库，先 quarantine/scan/mapping，再抽取 guardrail 和 capability metadata | ExternalAgentPackImportPolicy / CapabilitySourceCatalog |
| wshobson / BuildWithClaude | agent team、file ownership、marketplace manifest、comprehensive review | capability marketplace 和并行文件所有权策略参考 | CapabilityManifest / FileOwnershipPolicy |
| levnikolaevich Claude skills | evidence lanes、quality gate、worker summary、runtime checkpoint | child worker 输出只消费 summary/evidence，形成 GO/NO-GO gate | EvidenceLane / QualityGateDecision |
| Aider / SWE-agent | file admission、read-only vs editable files、trajectory、timeout、submit/retry loop | coding harness guardrail 和可恢复执行轨迹 | FileAdmissionPolicy / ExecutionTrajectory |
| Continue / OpenHands / SuperClaude | skill/rules/MCP/profile projection、installer、microagents | 多 host 投影和 package discovery 参考 | HostProjectionPolicy / SkillPackageDiscovery |
| CrewAI / AutoGen / LangGraph | agent/task/graph/handoff/checkpoint 思路 | 只借鉴显式状态、handoff、checkpoint，不作为 Phase 6 core runtime | WorkflowAdapterBoundary |

## 4. Anti Big-Prompt 原则

外部 agent/skill 仓库的价值在于可复用知识结构，而不是把大段 persona prompt 堆进 SDD runtime。Phase 6.0 必须遵守：

- 不批量复制外部 agent prompt 到主流程。
- 不把 agent personality 当作 workflow state machine。
- 不用长 prompt 表达权限、风险、阶段推进、完成状态或证据规则。
- 优先抽取结构化字段：domain、when_to_use、allowed_stage、risk_ceiling、tool_scope、evidence_type、output_schema、source_attribution。
- Prompt 只做 host projection：由 SDD router 在执行时按 profile/capability 生成短上下文。
- 外部 agent pack 进入 catalog 前必须 quarantine：license/source attribution、hidden Unicode scan、secret scan、dangerous command scan、SDD frontmatter mapping。

## 5. 范围

- 定义 AgentProfileContract：planner / architect / implementer / reviewer / validator / researcher / orchestrator / security / domain_expert 等 profile 的角色、阶段、风险边界、默认 autonomy、required artifacts、model_policy、host capability 需求。
- 定义 SkillCapabilityContract：复用已有 skill/MCP/tool/plugin 能力的 catalog，不重复造轮子。
- 定义 CapabilitySourceCatalog：记录 Claude Code、OpenCode、Context7、Playwright、Roo/Cline、cc-sdd、agency-agents、wshobson、SuperClaude 等来源的 reuse/adapt/borrow/avoid 分类。
- 定义 ExternalAgentPackImportPolicy：外部素材库只通过 quarantine、scan、license/source attribution、SDD mapping 后进入候选能力目录。
- 定义 ToolPermissionSpec：参考 Roo/Cline，把 tool group、file scope、approval policy、deny/allow、runtime validation 和 host permission 分层表达。
- 定义 HostAdapterContract：优先对接 Claude Code 原生 agent/skill/command/MCP/hook 能力，预留 OpenCode / Cline/Roo / future host adapter。
- 定义 AgentRouterContract：从 task metadata、lifecycle decision、risk gate、available host capabilities、tool permission、team-mode activation 产出 recommended profile、capability、team mode/wave、autonomy ceiling、blocked reason。
- 定义 TeamModePolicy：默认 `auto` 自适应判断 agent team 使用；低风险保持 `off`，review/validation 选择 `review-lite`，高风险非安全任务选择 `hyperplan`，安全任务选择 `security-research`；`--team-mode` 只表示 bounded force，`--no-team-mode` 可关闭当次 route/run。
- 定义 DelegationWavePolicy：支持 hyperplan、security-research、review/validation、implementation 等并行 wave，控制依赖、文件所有权、risk compatibility 和 artifact isolation。
- 定义 AgentExecutionRecord / TeamSessionRecord / TeamMessageRecord：记录 agent/skill/team 执行、成员通信、host session/task id、model policy、capability used、tool calls、artifacts、status 和 risk/autonomy 决策引用。
- 定义 EvidenceIngestionContract：把 host agent 输出转为 `sdd-result-v1`、implementation/review/validation artifacts、security findings、browser evidence、command evidence 和 verify/doctor 可读证据。
- 定义 SkillReusePolicy：优先复用 Claude Code skills、MCP、Playwright、Context7、ripgrep/ast-grep、OpenCode/Oh My adapter 思路；只有 contract/evidence/risk gap 无现成能力时才新增本项目实现。

## 6. 非目标

- 不重造 OpenCode plugin runtime。
- 不重造 Claude Code agent / skill / command / MCP 体系。
- 不引入自研通用 scheduler、OS 或多 agent chat framework。
- 不把 Oh My OpenAgent、agency-agents、SuperClaude、wshobson 等仓库的 agent 名称、prompt、persona 或模型配置原样照搬。
- 不把外部素材库批量拼成大 prompt。
- 不让 team-mode、delegate_task、tmux/background execution 绕过 SDD lifecycle risk gate、verify、doctor 或 sync-back policy。
- 不让 security-research 或 PoC 任务越过授权、防御、非破坏边界。
- 不在本阶段实现 Phase 8 code graph、embedding store、AST/LSP graph database。

## 7. 推荐架构

```text
spec / plan / tasks
  -> lifecycle risk gate
  -> capability source catalog + external pack quarantine
  -> AgentRouterContract
  -> ToolPermissionSpec / TeamModePolicy / DelegationWavePolicy
  -> HostAdapterContract
  -> Claude Code / OpenCode / MCP / Playwright / Context7 / host shell / external material projection
  -> AgentExecutionRecord / TeamSessionRecord / TeamMessageRecord / ExecutionTrajectory
  -> EvidenceIngestionContract
  -> sdd-result artifacts / review artifacts / validation artifacts / security findings
  -> verify / doctor / sync-back
  -> Phase 8 graph inputs
  -> Phase 6.1 resident worker runtime claim / lease / heartbeat / inspect
```

## 8. Team-Mode 转译

Oh My OpenCode 的 team-mode 是 Phase 6 的重要参考，但必须转译成可选、可审计、可阻断的 SDD contract：

| Oh My team-mode | SDD 转译 | 约束 |
|---|---|---|
| chief agent | `orchestrator` / `TeamChiefProfile` | 只能编排，不能绕过 risk gate 或 completion truth |
| specialist team | `TeamMemberProfile[]` | 每个成员有 allowed_stage、risk_ceiling、tool_scope、required_artifacts |
| `team_create` | `TeamSessionRecord` | 记录 team id、chief、members、task scope、risk/autonomy、host session refs |
| `team_task_create` | `DelegationWavePolicy` / child task record | 子任务必须来自 SDD task graph 或 router decision |
| `team_send_message` | `TeamMessageRecord` | 只传递任务上下文、artifact refs、阻塞点和 evidence summary |
| tmux focus/grid | `HostObservabilityCapability` | 用于观察，不作为 canonical state |
| hyperplan | `AdversarialPlanReviewWave` | 编码前多 profile 并行攻击方案，输出 plan-risk artifact |
| security-research | `SecurityResearchWave` | 只在授权/防御/非破坏边界内做漏洞研究和 PoC，按实际可利用性校准严重度 |

默认命令策略：`team_mode.activation=auto`。router 自动判断是否需要 agent team；低风险任务保持 `mode=off`，需要 review/validation evidence 时选择 `review-lite`，高风险非安全任务选择 `hyperplan`，授权防御性安全任务选择 `security-research`。`--team-mode` 映射为 `force`，只强制尝试最低安全成本的 team；`--no-team-mode` 映射为 `off`。所有模式都必须产生可 verify/doctor 消费的 evidence。

## 9. 复用优先级

| 能力 | 优先复用对象 | 本项目只做 |
|---|---|---|
| agent 定义与调用 | Claude Code agents / OpenCode agents / host subagents | profile contract、router decision、execution record |
| skill 加载与使用 | Claude Code skills、项目 `.claude/skills`、MCP tools、Anthropic Skills package shape | SkillCapability catalog、reuse policy、evidence bridge |
| 外部 agent 素材库 | agency-agents、wshobson、SuperClaude、cc-sdd、awesome collections | quarantine、source attribution、mapping、anti-big-prompt projection |
| tool permission | Claude Code permission、Roo/Cline mode/tool groups、OpenCode permission | ToolPermissionSpec 和 runtime validation record |
| team-mode | Oh My OpenCode team tools、tmux/background discipline | TeamModePolicy、TeamSessionRecord、evidence ingestion |
| browser/UI verification | Playwright skill/MCP/CLI | evidence path 与 validation contract |
| docs/library lookup | Context7 / WebFetch / existing MCP | capability declaration 与 source attribution |
| 搜索与代码定位 | ripgrep、glob、ast-grep、LSP/host tools | route policy 与 evidence ingestion；不建图谱 |
| background execution | host native task/session/background ability | execution record、risk gate、artifact contract |
| model routing | host model selection、Oh My category/model fallback 思路 | model_policy abstraction，不暴露 provider 复杂度 |

## 10. 验收标准

- Phase 6 的 artifact/spec/plan/tasks/validation 文档存在，并明确原代码图谱 Phase 6 顺延为 Phase 8，且 Phase 7 先收敛 core module boundary。
- Phase 6 明确外部 agent/skill 仓库是素材库、机制库和 capability source，不是 SDD profile 替代品。
- AgentProfileContract、SkillCapabilityContract、CapabilitySourceCatalog、ExternalAgentPackImportPolicy、ToolPermissionSpec、HostAdapterContract、AgentRouterContract、TeamModePolicy、DelegationWavePolicy、AgentExecutionRecord、TeamSessionRecord、EvidenceIngestionContract 和 SkillReusePolicy 均有明确字段、事实源和边界。
- 文档明确“复用已有轮子优先”，禁止重造 OpenCode/Claude Code/plugin/MCP runtime、agent framework、MCP hub、scheduler 或多 agent OS。
- 文档明确 anti-big-prompt 规则：外部素材必须结构化映射，不批量复制 prompt，不用 prompt 表达 state/risk/evidence。
- `tasks.md` 中的 `agent_fit`、`allowed_agents`、`required_artifacts`、`autonomy`、`risk` 被定义为 router 输入，而不是展示字段。
- Team-mode 默认自适应判断而不是全局强制；启用后仍受 SDD risk gate、required artifacts、tool permission、evidence ingestion 和 verify/doctor 约束。
- Phase 8 code graph artifact 消费 Phase 6 agent/skill/team runtime metadata 和 Phase 7 core module boundary metadata。
- Phase 6.1 consumes Phase 6.0 router/team metadata to provide resident worker claim、lease、heartbeat、status 和 inspect；Phase 6.0 不直接实现常驻 worker。
- `sdd status --branch master` 无 route gaps。

## 11. 可被下游引用的产物

- `specs/master/phases/phase-6.0-agent-skill-runtime-harness.md`
- `specs/master/phase6.0-spec.md`
- `specs/master/phase6.0-plan.md`
- `specs/master/phase6.0-tasks.md`
- `specs/master/phase6.0-validation.md`
- `artifacts/phase6.0-skill-reuse-catalog.md`
- `specs/master/phases/phase-6.1-resident-agent-worker-runtime.md`
