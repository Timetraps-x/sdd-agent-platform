# SDD Agent Platform 架构设计方案

## 1. 设计目标

本项目不是单次 prompt workflow，也不是对 Spec Kit、GSD、BMAD、Oh My OpenCode、LangGraph、Temporal 等项目的直接封装，而是一套面向个人长期使用的 **SDD + subagent workflow 平台**。

架构目标是：

```text
用经过调研验证的 lifecycle decision model 判断“当前需求需要多少 SDD”
用 SDD 文档定义“应该做什么”
用 runtime state/events/artifacts 定义“实际做到了哪里”
用 agent contract 定义“谁能做什么、产出什么证据”
用 project adapter 定义“不同项目如何验证”
用 graph-ready metadata 为 Phase 7 代码知识图谱预留演进空间
```

第一阶段必须先完成 lifecycle decision model 调研、架构基线和 runtime 骨架，再跑通一个真实任务的规格、计划、任务、实现、审查、验证和回写建议闭环；第二阶段产品化全局 CLI、项目 init、AI 工具入口投影、update/doctor 和 instruction API；第三阶段扩展工具、插件、并发和隔离执行；第四阶段补齐 npm published package 分发基线；第五阶段重构为基于 Claude Code 等 AI 工具的 SDD Harness Engineering，定义 context、risk gate、workflow gate、agent registry、task evidence、query/status、eval 和 learning contract；Phase 6 建设 SDD-controlled Agent / Skill Runtime Harness，引入 profile、router、host adapter、execution record、evidence ingestion 和 reuse-first capability catalog；Phase 7 再建设项目代码知识图谱。

## 2. 架构驱动因素

### 2.1 硬约束

- Phase 1 使用 TypeScript / Node.js 实现平台编排与 runtime。
- 业务仓库只接入 `.sdd/project.yml`、`specs/<branch>/`、`.sdd/runs/`、artifacts，不复制整个平台。
- 阶段推进必须可控，阶段内可以自动编排。
- Markdown 是 SDD 语义事实源；runtime state/events/artifacts 是执行事实源。
- 不把平台做成巨型 prompt 工程。
- Phase 1 不做 plugin loader、tool registry、background write、默认 worktree、自动 commit/push/merge、dashboard、run database。
- 高风险动作继续依赖 Claude Code 原生权限、用户审批、settings、hooks。
- 命令入口不能机械触发完整生命周期；lifecycle decision model 已由 Phase 1.0 调研验证并固化，后续 phase 只消费 canonical model。

### 2.2 质量目标

| 目标 | 含义 |
|---|---|
| 可恢复 | 中断后能通过 state/events/artifacts 判断执行进度和缺口。 |
| 可审计 | 每次阶段推进、agent 产出、gap、validation 都有 artifact 或 event。 |
| 可验证 | validator 映射 acceptance，不只看命令是否成功。 |
| 可演进 | Phase 2/3/4 能接入而不推翻 Phase 1 contract。 |
| 可入口化 | 全局 CLI 能在目标仓库 init，并投影为 Claude Code 等 AI 工具的薄入口。 |
| 可隔离 | Phase 1 串行前台写代码，Phase 3 再引入 worktree/container。 |
| 可持续迭代 | commands、agents、workflows、templates、schemas 和 tool entry adapters 都是版本化平台资产。 |
| 自适应 | 根据需求规模、风险、不确定性和规格完整度裁剪生命周期；模型必须可解释、可升级、可审计。 |

## 3. 外部项目借鉴与取舍

### 3.1 Spec Kit

借鉴：

- `spec.md / plan.md / tasks.md` 的阶段语言和产物链。
- 规格驱动开发的 checkpoint 形态。

不照搬：

- 不依赖 Spec Kit CLI 作为 runtime。
- 不改 vendor 模板。
- 不把 implement/review/verify 绑定到 Spec Kit 的执行模型。

原因：本项目需要自己的 runtime state、events、artifacts 和 subagent contract。Spec Kit 适合作为 SDD 语义层，而不是执行事实源。

### 3.2 GSD

借鉴：

- dependency wave。
- files overlap gate。
- goal-level verifier。
- gap closure。
- orchestrator 负责调度和综合，不亲自吞掉所有上下文。

不照搬：

- Phase 1 不做并发写代码。
- Phase 1 不做自动 worktree merge/reconcile。

原因：GSD 的 wave/overlap 对 Phase 3 很有价值，但 Phase 1 的主要风险是先把单 task 闭环跑稳，Phase 2 的主要风险是先把安装、init、入口投影和 update/doctor 产品化。过早并发会把合并、冲突、验证、恢复复杂度提前引入。

### 3.3 BMAD

借鉴：

- step-file discipline。
- 角色分工。
- 核心流程和项目定制分层。

不照搬：

- 不引入完整 PRD/story/sprint 管理体系。
- 不把一次代码修复拉成重型产品流程。

原因：本项目首先服务个人 AI 开发平台和 SDD 执行闭环，不能变成通用项目管理系统。

### 3.4 Oh My OpenCode / Oh My OpenAgent

借鉴：

- Agent team / orchestrator：主会话做 intent gate、delegation、综合判断。
- Explore / Librarian / Oracle 等分工思想。
- category routing、model policy、sync/background child session 的 runtime 机制。
- skill/tool/MCP capability reuse 和 adapter pattern。
- delegation prompt contract、stale/background task 检测、doctor/eval 思想。

不照搬：

- 不绑定 OpenCode plugin API。
- 不复制 agent 名称、prompt 或 provider/model 配置。
- 不把 Hephaestus 类 agent 作为 Phase 1 后台写代码 worker。
- 不重造 OpenCode / Claude Code plugin runtime、agent framework、MCP hub 或 scheduler。

原因：其价值在 agent runtime 编排纪律和复用优先机制。Claude Code 环境下应在 Phase 6 转译为 SDD-owned AgentProfileContract、AgentRouterContract、ModelPolicyContract、HostAdapterContract、SkillCapabilityContract 和 evidence artifacts。

### 3.5 LangGraph

借鉴：

- graph/state/checkpoint/resume 思想。
- interrupt + human-in-the-loop 的阶段 gate。

不照搬：

- 不把 LangGraph 作为主 workflow engine。
- 不让自由 graph workflow 替代 SDD phase gate。

原因：本项目的核心是 SDD 阶段事实源，不是任意 agent graph。Phase 1 文件型 state/events 已足够。

### 3.6 Temporal

借鉴：

- durable execution。
- append-only event history。
- worker replay 和 terminal event 思想。

不照搬：

- 不引入 Temporal server/worker 集群。
- 不把 Phase 1 做成分布式工作流系统。

原因：Temporal 的思想适合状态可靠性，但其基础设施复杂度远超 Phase 1 需求。Phase 1 使用 `events.jsonl` 即可实现轻量审计和恢复。

### 3.7 Dagger

借鉴：

- session、DAG、cache、capability API 的思想。
- 把外部工具能力抽象为可组合能力。

不照搬：

- 不引入 GraphQL runtime。
- 不在 Phase 1 做 DAG executor。

原因：Dagger 的模型适合 Phase 3 tool/plugin/capability 层，而不是 Phase 1 的 SDD 闭环或 Phase 2 入口投影前置。

### 3.8 OpenHands

借鉴：

- sandbox / action execution server / 隔离执行思想。

不照搬：

- Phase 1 不引入 Docker/container sandbox。
- 不让平台接管所有文件、shell、browser action。

原因：写操作隔离很重要，但 Phase 1 先采用 Claude Code 原生权限和当前工作树串行执行。worktree/container 应进入 Phase 3。

### 3.9 Aider / Continue / Sourcegraph Cody / GraphRAG

借鉴：

- repo map / symbols / references / embeddings / reranking / code graph / entity relationship extraction。
- 用结构化代码上下文降低 agent 盲搜和 token 成本。

不照搬：

- 不把代码图谱作为 Phase 1 前置。
- 不先建设完整 embeddings 或 graph database。

原因：代码知识图谱已顺延为 Phase 7 方向。Phase 1/2/3/4/5 必须先产出 graph-ready metadata、harness contract metadata 和可复用分发证据；Phase 6 再补齐 agent / skill runtime metadata，后续才能自然汇入图谱。

## 4. 总体架构

```text
User / Claude Code
  |
  v
Commands / Skills Layer
  /sdd-spec /sdd-plan /sdd-tasks /sdd-do /sdd-verify /sdd-doctor
  |
  v
Lifecycle Decision Layer
  direct | compact | full | research
  |
  v
Runtime CLI Layer
  packages/cli
  |
  v
Core Domain Layer
  packages/core
  project config / lifecycle decision / spec docs / task model / run state / events / artifacts / doctor / validation contracts
  |
  +--------------------+
  |                    |
  v                    v
Project Workspace      Platform Asset Pack
.sdd/                  commands/ agents/ workflows/ templates/ adapters/ schemas/
specs/                 versioned contracts
artifacts/
  |
  v
Future Layers
Entry Projection Layer -> Tool & Plugin Layer -> Worktree/Concurrency Layer -> Package Distribution Layer -> SDD Harness Engineering Layer -> Agent / Skill / Team Runtime Harness -> Run DB/Dashboard -> Code Knowledge Graph
```

### 4.1 核心分层

| 层 | Owner | 责任 | 写入/读取 | 不负责 |
|---|---|---|---|---|
| Commands / Skills | Claude Code command asset | 用户交互入口、收集最小 signals、触发 lifecycle decision、组织 prompt、调用 CLI、请求 checkpoint | 读取 project config、spec artifacts、runtime status；写入用户确认和 command-level artifact | 长期状态机、复杂解析、核心 contract 规则、直接绕过 hard gate |
| Lifecycle Decision | Core contract + command gate | 判断最短安全路径、执行 hard gates、裁剪阶段、定义升级触发条件和 checkpoint need | Phase 1.2 起写入 state/events；Phase 1.7 起由 command gate 执行 | 直接写代码、直接修改 spec/plan/tasks、替代 validator |
| CLI | `packages/cli` | 命令分发、参数处理、结构化输出、退出码、调用 core | 读写 `.sdd` 文件型 runtime；读取 platform assets | SDD 领域规则本身、Claude Code 权限、agent prompt 编排 |
| Core | `packages/core` | lifecycle decision contract、project config、state/events、task parser、artifact validator、doctor、sync-back proposal、validation contract | 写入 runtime state/events/artifacts；读取 spec/task/project config/platform assets | 用户交互、外部发布、自动审批、高风险权限接管 |
| Platform Assets | versioned asset pack | schemas、templates、adapters、commands、agents、workflows 的版本化 contract | Phase 1.3 固化 schema/template/adapter；Phase 1.4 固化 command/agent/workflow | 运行时状态、实际 agent 调度、项目私有配置 |
| Project Workspace | target repo `.sdd` + `specs` | 业务项目的语义事实源和执行事实源 | 存储 `.sdd/project.yml`、`specs/<branch>`、`.sdd/runs`、artifacts | 平台实现代码、全局资产包 |
| Future Entry Projection Layer | Phase 2 extension | global CLI install、project init/update、AI tool adapter、generated skills/commands、instruction API、generated asset drift check | 读取 platform assets、project config、runtime status；写入 generated AI tool entries | Phase 1 核心闭环、替代 CLI/core workflow brain、覆盖用户语义文档 |
| Future Platform Extension Layer | Phase 3 extension | tool registry、plugin loader、capability mapping、runtime adapter、worktree/concurrency、run DB/dashboard | 读取 agent/tool capability；扩展 project.yml、schemas、runtime execution model | Phase 1 核心闭环、Phase 2 入口投影、替代 Claude Code 权限 |
| Future Distribution Layer | Phase 4 extension | npm package distribution、package metadata、publish dry-run、public install smoke | 消费 CLI build、package assets、docs install path、release evidence | 自动 publish、token/secret 管理、CI release automation |
| SDD Harness Engineering Layer | Phase 5 extension | 基于 Claude Code 等 AI 工具的 context resolver、lifecycle risk gate、workflow gate、agent registry、task graph/evidence、query/status、managed entries、eval、harness learning、Project Context Pack | 消费 Phase 1/2/3/4 的 contracts、assets、runtime evidence、真实 trial 反馈、外部源码机制调研 | OS、scheduler、generic plugin runtime、OpenCode clone、graph database、embedding store、完整 AST/LSP 图谱 |
| Agent / Skill / Team Runtime Harness Layer | Phase 6 extension | agent profile、category/router、model_policy abstraction、host adapter、skill capability catalog、external material quarantine、tool permission、team-mode policy、delegation wave、execution record、evidence ingestion、reuse-first policy | 消费 Phase 5 harness contracts、task metadata、risk/autonomy/required artifacts、Claude Code/OpenCode/native skill/MCP/tool/team capabilities | 重造 OpenCode/Claude Code/plugin runtime、MCP hub、generic scheduler、team runtime、Phase 7 code graph |
| Future Graph Layer | Phase 7 extension | code graph、SDD graph、run graph、agent execution graph、team execution graph、impact analysis | 消费 task metadata、events、artifacts、validation、decision records、distribution evidence、harness contract metadata、Phase 6 agent/skill/team runtime metadata | Phase 1~6 前置条件、运行时事实源写入 |

## 5. 目录与包设计

### 5.1 仓库包结构

```text
packages/
  core/
    src/
      project-config/
      spec-docs/
      task-model/
      run-state/
      event-log/
      artifact/
      delegation/
      gap/
      validation/
      sync-back/
      doctor/
      platform-assets/
      index.ts

  cli/
    src/
      main.ts
      commands/
        init.ts
        doctor.ts
        run-create.ts
        run-status.ts
        task-list.ts
        task-inspect.ts
        artifact-validate.ts
        sync-back.ts
```

Phase 1.1 不实现上述 runtime / CLI 代码，只冻结架构与 contract 边界；`project-config`、`run-state`、`event-log`、`artifact path`、`doctor`、`cli` 等实现从 Phase 1.2+ 按路线图逐步落地。

### 5.2 Lifecycle Decision 模块

Phase 1.0 定义模型，Phase 1.1 冻结 architecture / contract 边界，Phase 1.2 在 state/events 中记录 contract 字段，Phase 1.7 命令接入时开始执行 decision gate。

建议 core 模块：

```text
packages/core/src/lifecycle-decision/
  decision.ts
  profile.ts
  escalation.ts
  contract.ts
```

该模块输出 `lifecycle_decision`，但不直接执行任务。命令层根据 decision 选择后续路径，runtime 只记录决策和升级事件。

### 5.3 平台资产目录

```text
commands/
agents/
templates/
workflows/
adapters/
schemas/
```

这些目录不是“示例文件”，而是平台资产包。Phase 1.2 先落地 runtime skeleton；`schemas/templates/adapters` 在 Phase 1.3 固化为静态 contract pack；`commands/agents/workflows` 在 Phase 1.4 固化为交互与编排 contract；Claude Code 命令集成与 lifecycle decision gate 执行由 Phase 1.7 落地。每个文件必须可版本化、可被 doctor 检查、可被后续命令加载。

### 5.4 项目级目录

```text
<repo>/
  specs/<branch>/
    spec.md
    plan.md
    tasks.md

  .sdd/
    project.yml
    runs/<run_id>/
      state.json
      events.jsonl
      artifacts/
      sync-back-proposal.md
```

原则：平台代码不复制进业务仓库；业务仓库只保存配置、语义事实源和执行事实源。

## 6. 核心事实源模型

### 6.1 Markdown 语义事实源

| 文件 | 责任 |
|---|---|
| spec.md | 轻量需求契约：objective/customer value、actors/scenarios、scope、requirements、AC IDs、assumptions/dependencies、risks/hard gates、lifecycle reference |
| plan.md | 交付级技术方案：requirements trace、当前/目标设计、组件/交互/状态/数据/API/并发、风险控制、验证矩阵、任务拆解依据 |
| tasks.md | 执行证据契约：delivery map、wave plan、acceptance_refs、plan_refs、task boundary、agent/artifact/verification/autonomy、Definition of Done |

Markdown 面向人类审阅和长期沉淀。runtime 不直接污染它，必须通过 sync-back proposal 建议写回。

### 6.2 Runtime 执行事实源

| 文件 | 责任 |
|---|---|
| state.json | 当前 run 快照 |
| events.jsonl | 追加式事件历史 |
| artifacts/ | agent 输出、review、validation、gap、diff summary |
| sync-back-proposal.md | 对 Markdown 语义事实源的写回建议 |

Runtime 面向恢复、审计和自动化。后续 Phase 3 也会消费这些文件构建运行历史图谱。

## 7. Lifecycle Decision Model 设计边界

### 7.1 定位

Lifecycle Decision 是平台入口的第一层判断。它解决的问题不是“要不要 SDD”，而是“当前需求需要多少 SDD 才足够安全”。

Phase 1.0 已完成独立调研、Baseline 对比和最终模型定稿。Phase 1.1 起，canonical lifecycle model 以 `docs/architecture/lifecycle-decision-model.md` 为准；本架构基线只吸收其结果并定义平台落点，不再维护另一份候选算法。

### 7.2 Phase 1.0 canonical model 吸收项

| 吸收项 | 架构落点 | 下游消费者 |
|---|---|---|
| `direct / compact / full / research` profile | workflow path 词汇，不是 agent 自由选择 | commands、runtime、doctor、graph |
| decision inputs | command gate 收集或推断；runtime record 保留摘要 | Phase 1.2、Phase 1.7 |
| hard gates | command gate 必须先执行；runtime 记录命中结果 | Phase 1.7、doctor |
| direct whitelist | direct 是显式白名单，不是默认路径 | Phase 1.7 |
| confidence model | 记录原因和缺失信号，不只记录分数 | Phase 1.2、Phase 1.7 |
| escalation / downgrade | 执行中发现影响面、风险、validation gap 时升级；降级必须记录原因 | Phase 1.6、Phase 1.8、Phase 1.9 |
| human checkpoint | 由 command/Claude Code 交互层暂停并请求确认，runtime 只记录状态 | Phase 1.7 |
| misclassification controls | 保守 direct、impact confidence、audit record、gap/checkpoint | Phase 1.2、Phase 1.7、Phase 1.9 |

### 7.3 Runtime record 与 Command gate 边界

| 内容 | Phase 1.2 runtime record | Phase 1.7 command gate |
|---|---|---|
| input signals | 记录 `input_summary` 和缺失信号，不负责完整交互追问 | 收集、推断或向用户询问信号 |
| hard gates | 记录 `hard_gate_hits`、profile 和 reasons | 执行 hard gate，不允许静默绕过 |
| profile | 记录最终选择、required/skipped stages | 根据 profile 路由 command path |
| confidence | 记录 confidence、原因、assumptions | 用于解释、ask-user 和升级判断 |
| escalation triggers | 记录触发器和执行中升级事件 | 执行中监控并触发 profile 升级或 checkpoint |
| human checkpoint | 记录 checkpoint 状态和原因 | 暂停 workflow，请求用户确认 |
| direct path record | 可只记录 decision artifact 或轻量 run，不能假装无决策 | direct 仍必须满足白名单条件 |

### 7.4 架构规则

- Hard gates 优先于 soft complexity；文件数量、时间压力或用户偏好不能降低最低 profile。
- Profile 是受控 workflow path：`direct`、`compact`、`full`、`research` 只决定最短安全阶段集合，不授权 agent 自行越权。
- Soft complexity score 如果后续保留，只能作为解释字段，不能覆盖 hard gates。
- Phase 1 不引入外部 OPA 类 policy engine；policy 先以 contract/rule table 形式进入 core 和 command gate。
- direct path 可以不创建完整 `spec.md / plan.md / tasks.md`，但只要进入 runtime，就必须记录 lifecycle decision，供 doctor、resume 和未来知识图谱消费。


## 8. 核心 Contract 设计

### 8.1 Contract 总览

| Contract | 存储位置 | Owner | 写入方 | 读取方 | Phase | 下游消费者 |
|---|---|---|---|---|---|---|
| lifecycle decision | state/events/artifact | core lifecycle contract | command gate / core | CLI / doctor / resume / graph | 1.0 research, 1.1 define, 1.2 record, 1.7 gate | Phase 1.2、1.7、1.9、1.10、Phase 2 instruction API、Phase 6 runtime、Phase 7 graph |
| project config | `.sdd/project.yml` | project adapter contract | init / 用户 | CLI / core / doctor / validator / command | 1.2 | Phase 1.2+、Phase 2 init/detector/entry projection、Phase 3 tool/plugin |
| run state | `.sdd/runs/<run_id>/state.json` | runtime core | runtime | CLI / doctor / resume / graph | 1.2 | Phase 1.6、1.8、1.9、Phase 2 instruction API/doctor、Phase 6 runtime、Phase 7 graph |
| event log | `.sdd/runs/<run_id>/events.jsonl` | runtime core | runtime | doctor / resume / audit / graph | 1.2 | Phase 1.6、1.9、1.10、Phase 2 doctor、Phase 6 runtime、Phase 7 graph |
| artifact path | `.sdd/runs/<run_id>/artifacts/*` | runtime artifact contract | runtime / agents | validator / sync-back / graph | 1.2 | Phase 1.6、1.8、1.9、Phase 2 instruction API、Phase 6 evidence ingestion、Phase 7 graph |
| sdd-task | `tasks.md` fenced block | task model contract | tasks command / 用户 | task parser / do / validator / graph | 1.3/1.5 | Phase 1.5、1.7、1.8、Phase 3 concurrency、Phase 6 router、Phase 7 graph |
| sdd-result | artifact fenced block | artifact result contract | agents | artifact validator / doctor / graph | 1.3/1.6 | Phase 1.6、1.8、1.9、Phase 2 doctor、Phase 6 evidence ingestion、Phase 7 graph |
| delegation | state/events | delegation contract | runtime / command | doctor / liveness / resume | 1.3/1.6 | Phase 1.6、1.8、1.9、Phase 3 background write |
| gap | artifact + events | gap contract | any agent / runtime | orchestrator / sync-back / graph | 1.6+ | Phase 1.8、1.9、1.10、Phase 2 doctor、Phase 6 router/evidence、Phase 7 graph |
| sync-back | proposal markdown | sync-back contract | runtime | user / command | 1.3/1.8 | Phase 1.8、1.10 |

### 8.2 Ownership 边界

- Command 负责交互、确认和 prompt 编排；不能成为 contract 的唯一事实源。
- Core 负责可测试、可恢复、可审计的事实逻辑；不能接管 Claude Code 权限和用户审批。
- Agent 负责按角色输出 artifact；不能直接改写 runtime contract 或越过 task boundary。
- Adapter 负责项目差异声明；Phase 1 不是 plugin loader。
- Platform assets 负责版本化静态 contract；不保存具体 run 状态。

### 8.3 Contract 演进规则

- 所有 contract 必须有版本或 contract id。
- 新字段默认向后兼容；删除或语义改变必须升级 contract。
- command 和 agent 不能依赖未声明字段。
- doctor 必须能检查关键 contract 是否缺失或版本不匹配。
- Phase 3 消费的 metadata 不能只写在自然语言正文里，必须进入 task metadata、event、sdd-result、decision record 或 artifact index。

## 9. Phase Gate 与 Workflow 机制

### 9.1 阶段推进

```text
lifecycle decision -> minimal sufficient path
direct: intent -> implement -> minimal validation
compact: intent/mini-spec -> task boundary -> implement -> validation
full: spec -> plan -> tasks -> implement -> verify -> sync-back
research: research -> options -> decision -> architecture artifact -> implementation spec
```

只有进入 full path 或需要改变上游事实源时，核心阶段才不能静默连跳。每次跨阶段必须形成 checkpoint，包含：

- 当前阶段产物。
- 已定决策。
- 未决问题。
- gap。
- 风险和影响面。
- 下一阶段建议。
- 是否满足推进条件。

### 9.2 阶段内自动化

阶段内部可以自动编排：

- 只读 scout。
- docs / issue / external research。
- reviewer。
- validator。
- doctor 检查。
- artifact 生成。

但 Phase 1 不允许后台写代码，不允许自动 commit/push，不允许自动 worktree merge。

## 10. Agent Runtime 设计

### 10.1 七角色

| Agent | 模式 | 责任 |
|---|---|---|
| scout | read-only/background | 本地代码探索、上下文收集 |
| spec-reviewer | read-only/background | 审查 spec 完整性和验收可测性 |
| planner | read-only/background | 拆 task、依赖、affected_files、validation 建议 |
| implementer | foreground/write | 按当前 task 最小实现 |
| reviewer | read-only/background | 独立审查 diff 是否满足 task |
| debugger | foreground/write | review/validation 失败后最多修一次 |
| validator | read-only + command | goal-level validation |

### 10.2 Agent 输出规则

Agent 不应只在聊天中输出结论，必须沉淀 artifact，并包含 `sdd-result` block：

```markdown
```sdd-result
agent: reviewer
task: T3
status: PASS
version: 0.1.0
artifacts:
  - .sdd/runs/<run_id>/artifacts/review-T3.md
```
```

Artifact validator 至少检查：

- 文件存在。
- 文件非空。
- status 合法。
- task 匹配。
- agent/version 存在。
- artifacts 路径存在或可解释。

## 11. Event 与 Liveness 设计

### 11.1 Event 原则

`events.jsonl` 是 append-only，不覆盖历史。事件只记录摘要和路径，大内容进入 artifacts。

核心事件：

```text
run_started
lifecycle_decision_recorded
phase_started
phase_completed
task_selected
agent_started
agent_completed
agent_failed
review_passed
review_failed
debug_started
debug_completed
validation_passed
validation_failed
gap_detected
gap_classified
gap_resolution_proposed
gap_resolved
gap_deferred
gap_escalated
sync_back_proposed
sync_back_applied
delegation_started
delegation_completed
delegation_timeout
delegation_cancelled
artifact_missing
artifact_invalid
run_completed
```

### 11.2 Liveness 原则

每个 delegation 必须有：

- `delegationId`
- `agent`
- `task`
- `runMode`
- `blocking`
- `requiredForPhaseExit`
- `status`
- `startedAt`
- `timeoutSeconds`
- `expectedArtifact`
- terminal event 要求

`RUNNING` 不能无限存在。doctor 和 resume 必须能发现 stale delegation。

## 12. Gap 与 Recovery 设计

Gap 是阶段产物、任务边界、实现或验证证据不足，不是普通报错。Gap 需要 artifact 和 event。

| Gap 类型 | 回流 |
|---|---|
| Spec Gap | 回到 spec checkpoint |
| Plan Gap | 回到 plan checkpoint |
| Task Gap | 回到 tasks checkpoint |
| Context Gap | 阶段内补证据 |
| Implementation Gap | debugger once |
| Validation Gap | 补 validation 或 PASS_WITH_GAPS / FAIL |
| Environment Gap | doctor / ask-user |
| Scope Gap | 主会话决策新增 task 或新 spec |

Recovery 不做无限 retry。Phase 1 默认：blocking timeout -> BLOCKED + recovery proposal；non-blocking timeout -> warning / Context Gap。

## 13. Validator 设计

Validator 不是 build runner，而是 goal-level verifier。

输入：

- spec acceptance。
- plan validation strategy。
- task boundary。
- affected_files。
- diff summary。
- review result。
- project.yml validation commands。

输出：

- PASS。
- PASS_WITH_GAPS。
- FAIL。
- BLOCKED。

Validator 必须把命令结果映射回 acceptance，而不是只输出“构建成功”。

## 14. Project Adapter 设计

`.sdd/project.yml` 是项目适配入口，不是 plugin。Phase 1 使用轻量 YAML：

```yaml
project:
  name: example
  language: java
  framework: spring-mybatis

sdd:
  spec_dir: specs/<branch>
  docs_language: zh-CN
  compatible_with: spec-kit

validation:
  default:
    - mvn compile -Ptest -pl module -am

editing:
  prefer_hashline: true
  native_edit_fallback: true

runtime:
  background_write: false
  worktree_isolation: false
  sync_back_mode: proposal

# 说明：`worktree_isolation: false` 表示平台不默认为每个任务自动创建 worktree；Phase 6.5 已通过 partition-aware run state、latest eligible run resolver、document snapshot stale gate 和 affected-files conflict gate 提供多分支 run 隔离。
lifecycle:
  decision_required: true
  profiles:
    - direct
    - compact
    - full
    - research
```

Phase 2 会优先产品化入口投影 adapter；如果后续需要复杂项目 adapter package 或 plugin loader，放入 Phase 3。

## 15. CLI 与 Command 分工

### 15.1 CLI 负责

- 读取/写入 `.sdd`。
- 创建 run。
- 读写 state/events。
- 校验 artifact。
- 检查 doctor。
- 生成 sync-back proposal。
- 返回结构化退出状态。

### 15.2 Claude Code Command 负责

- 与用户交互。
- phase gate。
- 组织 agent prompt。
- 调用 CLI。
- 综合 subagent 输出。
- 请求高风险确认。

### 15.3 Agent Prompt 负责

- 当前角色职责。
- 输入上下文。
- 允许/禁止操作。
- 输出 artifact 格式。
- 成功标准。

Agent prompt 不承载平台状态机，不复制完整方案文档。

## 16. Phase 2 入口投影接入点

Phase 2 能力不能推翻 Phase 1 contract，只能把 Phase 1 已有 CLI/core/workflow 能力产品化投影到目标 AI 工具中。判断标准不是“生成更多 prompt”，而是目标仓库能否通过 `sdd init/update/doctor` 获得可版本化、可刷新、可诊断的薄入口。

| Phase 2 能力 | Phase 1 预留点 | 前置条件 | 禁止提前扩张 |
|---|---|---|---|
| global CLI install | `packages/cli` + package metadata | build/test 稳定；CLI 可从任意 cwd 解析 target repo | 不把业务仓库复制成平台仓库 |
| project init | `.sdd/project.yml` + `.sdd/runs` | project config contract 稳定；项目检测可解释 | 不按文件顺序硬编码语言判断 |
| AI tool adapter registry | platform assets + commands/agents/workflows | 入口路径、frontmatter、generatedBy/version 元数据稳定 | 不绑定单一工具实现；Claude Code 优先但不污染 core |
| generated skills/commands | Phase 1 command/agent/workflow assets | command/skill 保持薄入口；CLI 提供状态与 instructions | 不把 workflow brain 塞进 SKILL.md |
| `sdd update` | asset version + generated metadata | 可区分平台生成内容和用户内容 | 不覆盖 spec/plan/tasks 等语义事实源 |
| doctor drift check | doctor + generated metadata | doctor 可检查入口缺失、版本不一致、配置过期 | 不自动执行高风险修复 |
| instruction API | CLI JSON output + runtime status | status/tasks/lifecycle/artifact graph 可结构化输出 | 不让 generated prompt 承载长期状态机 |
| detector registry | Phase 1 evidence scoring | detector/evidence/confidence/mixed stack contract 稳定 | 不为 Python/Go/Rust 等逐个散落 if/else |

## 17. Phase 3 平台化扩展接入点

Phase 3 承接原平台化扩展能力：工具、插件、并发、隔离、长期治理。它依赖 Phase 1 的 runtime contract 和 Phase 2 的入口投影稳定。

| Phase 3 能力 | Phase 1/2 预留点 | 前置条件 | Phase 1/2 禁止提前实现 |
|---|---|---|---|
| tool registry | agent operating guidelines + project.yml + schemas | agent/tool capability contract 稳定；doctor 能检查关键工具 | 不做动态工具注入，不改 Claude Code 权限模型 |
| plugin loader | platform assets + capability mapping | assets 版本、schema 版本、兼容性检查稳定 | 不绑定 OpenCode / Dagger / LangGraph plugin API |
| background write | delegation + liveness + artifacts | artifact validation、stale detection、blocking semantics 稳定 | Phase 1 不允许后台写代码 |
| per-task worktree | task affected_files + runtime isolation field | affected_files、overlap gate、post-merge validation 稳定 | Phase 1/2 不自动创建/清理/merge worktree |
| dependency wave | tasks.md wave/depends_on | task parser 和 dependency metadata 稳定 | Phase 1/2 不并发执行 task |
| files overlap gate | affected_files + run state | parser、task boundary、diff summary 稳定 | Phase 1/2 不以 overlap gate 自动调度写任务 |
| merge/reconcile | post-merge verifier + sync-back proposal | validator、sync-back、gap model 稳定 | Phase 1/2 不自动 merge/reconcile |
| dashboard/run DB | events.jsonl + artifacts | event schema、artifact index、run status 稳定 | Phase 1/2 不引入 DB/dashboard |

## 18. Phase 5 SDD Harness Engineering 接入点

Phase 5 插入在 npm 分发完成之后、Agent / Skill Runtime Harness 和代码知识图谱之前，用来把本项目重构为依托 Claude Code 等 AI tool harness 的 SDD Harness Engineering 层。该层已拆分为 5.0~5.10，其中 5.6 收口 Phase 7 graph handoff，5.8~5.10 继续强化 semantic document chain、task contract parser 和 document-chain verify/doctor。

Phase 5 不建设 OS、scheduler、generic plugin runtime、OpenCode clone 或替代 Claude Code 的执行内核；Claude Code 的权限、hooks、worktree、slash command 和 tool execution 仍由外部 AI tool harness 提供。本项目只定义 SDD harness contracts、evidence、gates、query/status、eval 和 bounded learning inputs。

### 18.1 Harness contract 节点

```text
HarnessContract
ContextResolverContract
LifecycleRiskGateContract
OutputQualityContract
WorkflowGateContract
AgentRegistryContract
TaskGraphContract
TaskRunEvidenceContract
QueryStatusContract
ManagedAssetManifest
SkillAgentEvalContract
HarnessLearningContract
ProjectContextPack
AutonomyLevel
AgentFit
VerificationAvailability
GapClosure
```

### 18.2 外部机制作为 Harness Engineering 输入

| 输入机制 | 本项目落点 | 说明 |
|---|---|---|
| Spec Kit integration adapter / manifest | managed entry manifest + AI tool adapter | 入口投影必须可安装、可检查、可漂移修复，不能只生成 Markdown |
| Spec Kit workflow gate / quality checklist | `WorkflowGateContract` | spec / plan / tasks / do / verify 的进入条件和质量检查应可测试 |
| cc-sdd tool layout registry | adapter registry 扩展 | 不同 AI 工具的 commands / skills / agents 布局由 registry 描述 |
| cc-sdd `/kiro-impl` loop | `TaskRunEvidenceContract` | `/sdd:do` 必须体现 implement / review / debug / validate 的可见证据闭环 |
| GSD state digest / query dispatch | `QueryStatusContract` | status、doctor、run inspect 共享查询视图，减少输出重叠 |
| GSD wave / overlap / verifier / gap closure | `TaskGraphContract` + `GapClosure` | 并发治理、文件重叠和 gap 回流必须 artifact-first |
| BMAD roles / workflows / checklists | `AgentRegistryContract` + `WorkflowGateContract` | 借角色、step discipline 和 checklist，不接管为项目管理套件 |
| Oh My OpenAgent/OpenCode agent team/category/model/background/skill/team-mode reuse | Phase 6 Agent / Skill / Team Runtime Harness 输入 | agent routing、model policy、host adapter、skill capability reuse、team-mode/delegation wave 进入 SDD-owned contracts，不复制 prompt/runtime |
| OpenAI / Mitchell harness practice | `ProjectContextPack` + `HarnessLearningContract` | 把重复失败沉淀为 context、checklist、doctor check 或 eval assertion |

### 18.3 Phase 5 拆分路线

| Phase | Boundary |
|---|---|
| 5.0 | reframe / contract freeze / no-OS guardrail |
| 5.1 | ContextResolverContract / LifecycleRiskGateContract / OutputQualityContract |
| 5.2 | WorkflowGateContract / AgentRegistryContract |
| 5.3 | TaskGraphContract / TaskRunEvidenceContract |
| 5.4 | managed asset manifest / QueryStatusContract |
| 5.5 | SkillAgentEvalContract / HarnessLearningContract / ProjectContextPack |
| 5.6 | Phase 7 graph-ready harness metadata handoff |


### 18.4 Phase 5 不做什么

Phase 5 不引入 graph database、embedding store、完整 AST/LSP 索引，不把项目重写为 OpenCode plugin，也不建设 OS、scheduler、generic plugin runtime 或后台自主编码平台。它只把成熟机制变成本项目自己的 SDD harness contracts、CLI/core 改造点、generated entry 投影规则、validation/eval 标准和 graph-ready metadata。

## 19. Phase 7 代码知识图谱接入点

Phase 7 承接原代码图谱 baseline 方向。Phase 1/2/3/4/5 必须为它预留可消费 metadata，其中 Phase 5.6 是 graph-ready harness metadata handoff；Phase 6 会在图谱前补齐 agent / skill / host adapter runtime metadata。

### 19.1 图谱节点

```text
Project
Spec
Plan
Task
Acceptance
File
Symbol
API
DatabaseTable
Run
Event
Agent
Artifact
Gap
ValidationCommand
ValidationEvidence
Decision
HarnessContract
AutonomyLevel
AgentFit
VerificationAvailability
GapClosure
ProjectContextPack
SkillAgentEvalResult
AgentProfileContract
SkillCapabilityContract
HostAdapterContract
AgentRouterDecision
AgentExecutionRecord
SkillReuseDecision
EvidenceIngestionRecord
```

### 19.2 图谱边

```text
Task depends_on Task
Task affects File
Task routed_to AgentProfileContract
AgentRouterDecision selects AgentProfileContract
AgentExecutionRecord executes Task
AgentExecutionRecord uses SkillCapabilityContract
AgentExecutionRecord runs_on HostAdapterContract
EvidenceIngestionRecord produces Artifact
Artifact produced_by Agent
Artifact proves Acceptance
Gap blocks Task
ValidationCommand verifies Acceptance
Run executes Task
Event belongs_to Run
Symbol defined_in File
Symbol references Symbol
Decision changes Contract
HarnessContract governs WorkflowGate
AutonomyLevel constrains Agent
GapClosure resolves Gap
```

### 19.3 为什么现在要预留

如果前置 phase 的 task、event、artifact、agent orchestration、harness contracts 和 Phase 6 runtime records 只是自然语言输出，未来图谱只能做脆弱文本抽取。现在通过 `sdd-task`、`sdd-result`、event type、artifact path、agent version、validation mapping、harness contract metadata、gap closure、eval result 和 AgentExecutionRecord 保留结构化信息，后续可以自然汇入 graph。

### 19.4 Graph-ready metadata 来源

| Metadata | 上游来源 | Phase 7 用途 |
|---|---|---|
| HarnessContract | Phase 5 contract exports and docs | 连接 context/risk/workflow/agent/query/eval/learning contract 节点 |
| ContextResolverDecision | `sdd status` context output and lifecycle records | 连接 branch、spec_dir、project scope 和 graph query scope |
| LifecycleRiskGateDecision | lifecycle decision state/event/artifact | 连接 risk signals、profile、hard gates、required stages、next action |
| AutonomyLevel | lifecycle gate and agent registry metadata | 解释 agent/run 的自动化上限和 checkpoint 边界 |
| WorkflowGateResult | WorkflowGateContract and run events | 连接 SDD stage、allowed agents、required artifacts 和 gate result |
| AgentFit | task graph metadata and AgentRegistryContract | 连接 task、候选 agent、selected agent、non-use rationale 和 stop condition |
| VerificationAvailability | task metadata and validation artifacts | 连接验收点、validation source、executable command、unavailable reason 和 evidence path |
| TaskGraphNode | `sdd-task` blocks and task graph planner | 构建 task dependency、wave、affected_files、risk 和 graph diagnostics |
| TaskRunEvidence | `.sdd/runs/<run_id>/state.json`, `events.jsonl`, artifacts | 构建 run/evidence provenance graph 和 agent performance 视图 |
| GapClosure | gap artifacts, sync-back proposal, run events | 分析 blocker、closure target、sync-back 和架构漂移 |
| SkillAgentEvalResult | SkillAgentEvalContract and eval validation output | 连接真实 trial corpus、scoring dimensions、thresholds 和 regression assertions |
| ProjectContextPackChange | Project Context Pack contract and reviewed context updates | 提供 durable context 节点，但不替代 specs / `.sdd/runs` runtime facts |
| AgentProfileContract | Phase 6 profile registry | 连接 planner/architect/implementer/reviewer/validator/researcher/orchestrator 角色与能力边界 |
| SkillCapabilityContract | Phase 6 capability catalog | 连接可复用 skill/tool/MCP/source attribution 与 evidence type |
| HostAdapterContract | Phase 6 host adapter boundary | 连接 Claude Code/OpenCode-compatible execution 与 SDD execution record |
| AgentRouterDecision | Phase 6 router output | 连接 task metadata、risk/autonomy、required artifacts、profile/category/model policy |
| AgentExecutionRecord | `.sdd/runs/<run_id>/agent-executions` | 构建真实 agent/skill execution provenance graph |
| SkillReuseDecision | Phase 6 reuse policy | 连接 borrowed-vs-built capability decision 与 gap reason |
| EvidenceIngestionRecord | Phase 6 evidence ingestion contract | 连接 host output 到 `sdd-result-v1` artifact/evidence edges |

规则：Phase 1~6 的新增 metadata 必须优先进入结构化 block、event field、execution record 或 artifact index；自然语言解释只能作为补充。Project Context Pack、eval summary 和 learning note 只能作为上下文/回归证据，不能覆盖 specs 或 `.sdd/runs` 的结构化事实。

## 20. 为什么这样设计

### 20.1 为什么不是纯 Spec Kit

Spec Kit 适合 SDD 语义产物，但不提供本项目需要的 subagent runtime、artifact validation、liveness、gap recovery 和 project adapter 执行事实源。

### 20.2 为什么不是直接 LangGraph / Temporal

它们提供强大的 workflow/durable execution 思想，但引入后会让 Phase 1 从“个人平台 SDD 闭环”变成“通用 workflow runtime 集成”。本项目先用文件型 state/events 落地核心 contract，等复杂度证明必要后再演进。

### 20.3 为什么 runtime 要放 TypeScript core，而不是 command prompt

Prompt 适合表达角色边界，不适合承载长期状态、恢复、版本、校验和审计。TypeScript core 可以测试、复用、演进，也能为 Phase 2/3/4 提供稳定 API。

### 20.4 为什么 Phase 1 不做 worktree 并发

没有 artifact validation、liveness、overlap gate、post-merge verifier 前，并发写代码会制造合并和验证风险。Phase 1 先串行前台写，Phase 2 先入口投影，Phase 3 再引入 isolation。

### 20.5 为什么需要 Phase 1.0

Runtime 骨架只是地基；架构基线定义承重结构。没有 Phase 1.0 的 lifecycle decision 调研、对比、模型定稿和 Phase 1.1 的架构基线，后续 1.2~1.10 容易各自实现局部逻辑，最终变成 prompt、CLI、artifact、schema 彼此不一致。

## 21. Phase 1 实施路线映射
本节只维护架构视角的路线映射；具体 phase artifact 列表、命名规范、依赖元数据语义和直接依赖矩阵见 `specs/master/phases/README.md`。

| Phase | Phase artifact | 主要交付 |
|---|---|---|
| 1.0 | `specs/master/phases/phase-1.0-lifecycle-research.md` | Lifecycle Decision Model 调研、对比、Final Model、routing algorithm、architecture handoff |
| 1.1 | `specs/master/phases/phase-1.1-architecture-baseline.md` | 架构基线 |
| 1.2 | `specs/master/phases/phase-1.2-runtime-skeleton.md` | Runtime 骨架 |
| 1.3 | `specs/master/phases/phase-1.3-contract-templates-adapters.md` | Contract / Templates / Adapters Pack |
| 1.4 | `specs/master/phases/phase-1.4-commands-agents-workflows.md` | Commands / Agents / Workflows Pack |
| 1.5 | `specs/master/phases/phase-1.5-sdd-parser-task-model.md` | SDD 文档读取与 Task 模型 |
| 1.6 | `specs/master/phases/phase-1.6-artifact-delegation-contract.md` | Artifact 与 Delegation Contract |
| 1.7 | `specs/master/phases/phase-1.7-claude-code-command-integration.md` | Claude Code 命令接入 |
| 1.8 | `specs/master/phases/phase-1.8-single-task-loop.md` | 单 Task 执行闭环 |
| 1.9 | `specs/master/phases/phase-1.9-goal-verify-doctor.md` | Goal-level Verify 与 Doctor 加固 |
| 1.10 | `specs/master/phases/phase-1.10-real-project-trial.md` | 真实项目验收试跑 |

### 21.1 Phase 1.2+ dependency prerequisites

| 下游 Phase | 必须从 Phase 1.1 继承的前置条件 | 不得重新发明的内容 |
|---|---|---|
| 1.2 Runtime skeleton | 文件型 runtime、lifecycle decision record fields、state/events/artifact path、doctor 最小边界 | 不重新定义 profile 或 hard gates |
| 1.3 Contract / Templates / Adapters | contract owner/storage/writer/reader、project.yml 是 adapter 入口、template/schema 版本规则 | 不把 adapter 做成 plugin loader |
| 1.4 Commands / Agents / Workflows | command 薄入口、agent artifact-first、workflow phase gate、background read-only 边界 | 不把完整状态机塞进 prompt |
| 1.5 Parser / Task Model | `sdd-task` 的 graph-ready metadata、dependency/wave/affected_files/validation/risk 字段 | 不改变 tasks.md 作为语义事实源的定位 |
| 1.6 Artifact / Delegation | `sdd-result`、delegation liveness、gap/artifact validation、terminal event 语义 | 不允许后台写代码 |
| 1.7 Command Integration | canonical lifecycle model、hard gates、direct whitelist、confidence、checkpoint UX 边界 | 不在 command 中复制一套不同算法 |
| 1.8 Single Task Loop | Markdown/runtime 双事实源、review-debug-verify、sync-back proposal、gap 回流 | 不自动 commit/push/merge |
| 1.9 Verify / Doctor | goal-level validation、contract/version/artifact/liveness 检查、PASS_WITH_GAPS/BLOCKED 语义 | 不把 validator 降级为 build runner |
| 1.10 Real Project Trial | 跨层 evidence：decision、spec/plan/tasks、state/events、artifacts、review、validation、sync-back | 不用“文件已生成”替代真实闭环证据 |

## 22. 架构决策记录

### ADR-001：TypeScript core 是平台事实逻辑层

决定：核心状态、事件、artifact、doctor、parser、validator contract 放在 TypeScript core。

原因：可测试、可复用、可演进，避免 prompt 承载状态机。

### ADR-002：Markdown 与 runtime 双事实源

决定：`spec.md / plan.md / tasks.md` 作为语义事实源；`.sdd/runs` 作为执行事实源。

原因：人类需要可读规格，runtime 需要可恢复和可审计状态。

### ADR-003：Phase 1 文件型 runtime，不引入数据库

决定：Phase 1 使用 `state.json + events.jsonl + artifacts`。

原因：足够支撑个人平台闭环，避免过早引入 run database/dashboard。

### ADR-004：Phase 1 不后台写代码

决定：implementer/debugger 只能前台串行写。

原因：未实现 worktree isolation、overlap gate、merge/reconcile 前，后台写代码风险过高。

### ADR-005：所有 agent 输出必须 artifact-first

决定：agent 结论必须沉淀 artifact，并带 `sdd-result` block。

原因：主上下文不能承载所有证据；artifact 是 review、validation、sync-back、graph 的共同输入。

### ADR-006：Phase 7 graph-ready metadata 从 Phase 1 开始预留

决定：task metadata、events、artifact result、validation mapping 需要结构化。

原因：代码知识图谱不应未来重新从自由文本里艰难反推。

### ADR-007：Lifecycle Decision model 已由 Phase 1.0 定稿，Phase 1.1 吸收为入口架构

决定：所有 `/sdd-*` 入口最终都应先经过 lifecycle decision，再选择 direct / compact / full / research。Phase 1.0 已完成独立调研、Baseline 对比、Final Model 和 routing algorithm；Phase 1.1 不再维护候选算法，只把 canonical model 放入平台分层、runtime record 和 command gate 边界。

原因：小需求不应被迫进入重生命周期；复杂需求也不能因为入口轻而跳过必要规格化。模型一旦进入架构基线，后续 phase 必须引用 `docs/architecture/lifecycle-decision-model.md`，不能在 prompt、CLI 或 agent 中各自复制变体。

### ADR-008：Phase 2 是通用 AI 工具入口投影

决定：Phase 2 插入全局 CLI、project init/update、AI tool adapter、generated skills/commands、instruction API 和 doctor drift check。该模式来自 Spec Kit、GSD、OpenSpec、Oh My OpenCode/OpenAgent 的共同机制，命名为 AI 工具入口投影。

原因：平台要能在真实目标仓库中产品化接入 Claude Code `/sdd`，但 workflow brain 仍属于 CLI/core，generated skills/commands 只能作为薄入口。

## 23. 参考来源

本设计综合了本项目本地研究文档和外部项目机制：

- `docs/research/自建_SDD_subagent_工作流平台方案.md`
- `docs/research/lifecycle-decision-model-research.md`
- `docs/research/支持_subagent_的_SDD_工作流深度分析报告.md`
- `docs/research/支持_subagent_的_SDD_工作流调研.md`
- LangGraph durable execution: https://docs.langchain.com/oss/javascript/langgraph/durable-execution
- Temporal architecture: https://github.com/temporalio/temporal/blob/main/docs/architecture/README.md
- Dagger API internals: https://docs.dagger.io/api/internals/
- OpenHands runtime: https://docs.openhands.dev/openhands/usage/architecture/runtime
- AutoGen docs: https://microsoft.github.io/autogen/stable/
- LlamaIndex multi-agent: https://developers.llamaindex.ai/python/framework/understanding/agent/multi_agent/
- CrewAI flows: https://docs.crewai.com/en/concepts/flows
- Aider repo map: https://aider.chat/docs/repomap.html
- Continue docs indexing: https://docs.continue.dev/reference/deprecated-docs
- Sourcegraph Code Graph: https://sourcegraph.com/docs/cody/core-concepts/code-graph
- GraphRAG overview: https://microsoft.github.io/graphrag/index/overview/
