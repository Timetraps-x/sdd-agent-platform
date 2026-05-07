# 自建 SDD + subagent 工作流平台方案

## 1. 目标与定位

本方案目标不是给现有 Spec Kit 做一个最小补丁，也不是直接引入 cc-sdd、GSD、BMAD 或 Oh My OpenAgent 全家桶，而是设计一套自己的 **SDD + subagent 工作流平台**。

战略目标是：

```text
个人 AI 开发平台优先
SDD 是第一阶段的首个完整闭环
subagent / tools / plugins / skills / runtime 能力逐步平台化
```

也就是说，第一阶段必须能真实支撑一个规格驱动开发任务从需求到验证闭环；第二阶段先产品化“全局 CLI 安装 + 项目 init + AI 工具入口投影”能力，让平台能像 Spec Kit、GSD、OpenSpec、Oh My OpenCode/OpenAgent 一样进入目标仓库并生成对应 AI 工具入口；第三阶段再扩展成更完整的 agent harness / tool registry / plugin runtime / 并发隔离平台。

本平台吸收以下外部项目的优点，但不让任何一个项目成为主框架：

- **Spec Kit**：规格产物链路与 `spec -> plan -> tasks` 阶段语言。
- **cc-sdd**：task 级 implementer / reviewer / debugger 闭环。
- **GSD**：dependency wave、files overlap、goal-level verifier、gap closure。
- **BMAD**：step-file 纪律、角色分工、定制分层。
- **Oh My OpenAgent / Oh My OpenCode**：skills / tools / plugins / agents 接入思想、doctor、background task、agent routing、tool harness、Discipline Agents 编排思路。
- **OpenSpec**：`init/update`、多 AI 工具 skills/commands 投影、schema-driven artifact graph、动态 instructions API。

核心定位：

```text
SDD 产物定义“应该做什么”
Agent runtime 定义“如何安全、可恢复、可审计地让 agents 做”
Tool/plugin layer 定义“外部能力如何逐步接入”
Project adapter 定义“不同项目如何落地验证”
```

## 2. 顶层原则：阶段推进可控，阶段内编排自动化

本平台的自动化边界必须清楚：

```text
Controlled phase transitions, automated intra-phase orchestration.
阶段推进可控，阶段内编排自动化。
```

也就是说，agent / skill / plugin / tool 可以在一个已批准的阶段内部自动调度，但核心阶段之间不能静默连跳。

但这不意味着所有需求都必须进入完整生命周期。平台入口需要 lifecycle decision 能力，根据需求规模、风险、不确定性和规格完整度决定最短安全路径。小改即使从 `/sdd-*` 入口进入，也应能快速完成；中等需求走 compact path；复杂需求再进入完整 SDD path；架构型任务进入 research / architecture path。

### 2.0 生命周期决策：核心能力与待验证模型

本平台不是固定生命周期执行器，而是具备生命周期决策能力的 SDD workflow platform。

核心原则：

```text
Sufficient SDD, not maximum SDD.
只做足以安全完成当前需求的规格化，不多做，不少做。
```

但 lifecycle decision 的具体模型和算法不能只靠经验启发式直接固化。当前已生成的启发式模型先封存在 `docs/research/lifecycle-decision-model-research.md` 的 Baseline Draft 中；Phase 1.0 必须先独立调研并产出 Research Model，再与 Baseline Draft 对比，最后交付本项目的 Final Model、routing algorithm 和 architecture handoff。

Phase 1.0 需要重点调研：

- risk-based testing / risk-based change management：如何按风险决定验证、审查和门禁深度。
- change impact analysis：如何根据文件、符号、依赖、接口、配置、测试映射推断影响范围。
- policy engine / rule engine：如何表达不可绕过的 hard gates。
- adaptive workflow / workflow routing：如何根据输入复杂度选择执行路径。
- human-in-the-loop automation：哪些判断可自动化，哪些必须升级给用户。
- LLM agent orchestration failure patterns：哪些场景容易误判、跑偏或过度自动化。

下列 profile 先作为候选路径词汇，而不是最终算法：

| Profile | 适用场景 | 最短路径 | 是否需要完整 SDD 文档 |
|---|---|---|---|
| direct | 意图明确、风险极低、验证显然的小改 | intent -> implement -> minimal validation | 否 |
| compact | 不大但有业务边界、验收或影响面 | intent/mini-spec -> task boundary -> implement -> validation | 不一定 |
| full | 多模块、多 task、高风险或验收复杂 | spec -> plan -> tasks -> do -> verify -> sync-back | 是 |
| research | 架构设计、技术选型、外部方案调研 | research -> options -> decision -> architecture artifact -> implementation spec | 视情况 |

候选决策输入：

- 用户意图是否明确。
- 验收是否明确。
- 边界是否明确。
- 影响范围。
- 风险类型：接口、数据库、权限、安全、状态机、并发、构建、依赖、CI、外部系统。
- 是否需要代码探索、外部研究或架构判断。
- 验证是否显然，是否需要 goal-level validation。
- project adapter 中声明的策略。

候选决策输出：

```yaml
lifecycle_decision:
  profile: direct | compact | full | research
  model_version: "phase-1.0-research"
  confidence: high | medium | low
  required_stages: []
  skipped_stages: []
  reason: []
  escalation_triggers: []
```

生命周期可升级：

```text
direct -> compact -> full -> research/architecture
```

触发升级的典型条件：

- 实际影响文件超过初始判断。
- 出现接口、数据库、权限、安全、状态机或构建依赖影响。
- 验收标准变得不明确。
- validation 失败且原因不直接。
- agent 发现 Spec Gap / Plan Gap / Task Gap / Scope Gap。

因此，`/sdd-*` 命令是智能入口，不是固定流程入口。命令可以快速完成小任务，也可以在发现 gap 或风险后升级到更完整的生命周期。


### 2.1 阶段推进必须有 gate

以下核心阶段不能自动推进：

```text
spec -> plan
plan -> tasks
tasks -> implement
implement -> sync-back
verify fail -> rewrite plan / continue implement
```

每次跨阶段都必须产出 checkpoint artifact，并由主会话或用户确认是否进入下一阶段。

checkpoint 至少包含：

- 当前阶段产物。
- 已定决策。
- 未决问题。
- 发现的 gap。
- 风险与影响面。
- 下一阶段建议。
- 是否满足进入下一阶段的条件。

orchestrator 可以建议推进，但不能静默推进；subagent 可以提供证据和建议，但不能越过阶段闸门。

### 2.2 阶段内部允许自动编排

阶段一旦被批准，阶段内部可以自动调用 agent / skill / plugin / tool。

示例：

```text
/sdd-plan 内部：
  scout background 查代码
  librarian background 查外部文档
  oracle 做只读架构咨询
  planner 汇总形成 plan checkpoint

/sdd-do 内部：
  implementer 前台串行实现
  reviewer 独立审查
  debugger 最多自动介入一次
  validator 做 goal-level validation
  runtime 生成 sync-back proposal
```

可控的是 phase transition，不是每一次搜索、读取、审查或验证。否则平台会变成不可用的人工审批流水线。

### 2.3 自动化边界

允许自动化：

- background 只读探索。
- 文档/issue/research 检索。
- Oracle-style 只读咨询。
- reviewer 独立审查。
- validator goal-level validation。
- doctor 只读自检。
- 阶段内部 artifact 生成。

必须显式确认：

- 进入下一核心阶段。
- 开始 implement。
- sync-back 写回 Markdown。
- 高风险 git / 文件 / 依赖 / worktree / 外部发布操作。
- gap 需要改变上游 spec / plan / tasks 的情况。

### 2.4 任意步骤发现 gap 的处理原则

任何阶段、任何 agent 都可以发现 gap。gap 不是普通失败日志，而是说明当前阶段产物、任务边界、实现或验证证据不足以继续安全推进。

gap 处理原则：

```text
先分类，再决定回流层级；
能在当前阶段内修复的，不回滚上游；
会改变上游事实源的，必须回到对应 gate；
不能静默修复，也不能硬标完成。
```

gap 必须形成 artifact，并进入 events：

```text
gap_detected
gap_classified
gap_resolution_proposed
gap_resolved | gap_deferred | gap_escalated
```

gap artifact 至少包含：

- gap id。
- 发现阶段。
- 发现 agent。
- 影响对象：spec / plan / tasks / code / validation / environment。
- 证据。
- 影响判断。
- 推荐处理：fix-in-phase / revise-task / revise-plan / revise-spec / ask-user / defer。
- 是否阻塞当前阶段。

gap 分类：

| 类型 | 含义 | 默认处理 |
|---|---|---|
| Spec Gap | 需求、边界、验收缺失或冲突 | 回到 spec checkpoint，不进入 plan/tasks/implement |
| Plan Gap | 技术路线、影响面、风险、验证策略不足 | 回到 plan checkpoint，不进入 tasks/implement |
| Task Gap | task 边界、依赖、affected_files、validation 不清楚 | 回到 tasks checkpoint，不进入 implement |
| Context Gap | agent 缺关键上下文或证据不足 | 阶段内补 scout/librarian/oracle artifact |
| Implementation Gap | 实现未覆盖 task 或越界 | 当前 task 内 review -> debugger once -> re-review |
| Validation Gap | 验证命令不足、验收映射不完整 | 补 validation 或生成 gap report |
| Environment Gap | 工具、MCP、Maven、权限、目录异常 | 进入 doctor / ask-user，不继续自动化 |
| Scope Gap | 发现新需求或历史数据/迁移等超出原范围 | 生成 gap，回主会话决策是否新建 task 或另开 spec |

gap 回流规则：

```text
Spec Gap        -> /sdd-spec checkpoint
Plan Gap        -> /sdd-plan checkpoint
Task Gap        -> /sdd-tasks checkpoint
Context Gap     -> 当前阶段内补证据
Implementation Gap -> debugger once, then review/verify again
Validation Gap  -> /sdd-verify 或补 validation task
Environment Gap -> /sdd-doctor / ask-user
Scope Gap       -> 主会话决策：新增 task / defer / 新 spec
```

gap 不能被 subagent 私自吞掉。即使最终选择 defer，也必须写入 sync-back proposal 或 gap report。

## 3. 分阶段落地路线

> 路线原则：大 Phase 只表达战略边界，小 Phase 才作为执行、验收和排期单位。每个小 Phase 都必须能独立形成按 phase 命名留存的 `spec / plan / tasks / validation` 文档，并在进入实现前完成目标、范围、非目标、验收标准和风险边界确认。

### 3.1 Phase 1：SDD 闭环验证阶段

Phase 1 的目标是跑通一个稳定、可恢复、可审查、可验证的 SDD 工作流。它不是一次性实现完整平台，而是先完成 Phase 1.0 lifecycle decision model 独立调研、Baseline 对比、最终模型/算法和 architecture handoff，再完成 Phase 1.1 架构基线，随后按 1.2~1.10 逐步建立可执行骨架。

Phase 1 总完成定义：

```text
/sdd-spec
  -> /sdd-plan
  -> /sdd-tasks
  -> /sdd-do
  -> /sdd-verify
  -> /sdd-doctor
```

Phase 1 总范围：

- Lifecycle decision model 的调研结论、候选算法、误判控制和最小记录 contract。
- Spec Kit-compatible 的 `spec.md / plan.md / tasks.md` 语义。
- 双事实源：Markdown 作为 SDD 语义事实源，run state/events 作为 runtime 执行事实源。
- 7 个核心 SDD lifecycle agent 角色及其 command/workflow contract，不在 Phase 1.4 静态交互资产阶段提前执行 agent 调度。
- background 只读 / 审查 / 验证任务，用来保护主会话上下文窗口。
- `state.json + events.jsonl` 执行状态。
- 文件型 artifacts。
- goal-level validator。
- 轻量 `/sdd-doctor`，并在 Phase 1.9 加固为 goal-level / artifact / liveness 检查。
- `.sdd/project.yml` 项目适配。
- sync-back proposal，而不是自动改写核心 Markdown。

Phase 1 不做：

- tool registry。
- plugin loader。
- background write agents。
- 默认 worktree。
- dependency wave 并发执行。
- 自动 commit / push / merge。
- dashboard / run database。
- doctor auto-fix。

#### 3.1.0 Phase 1 小阶段索引

Phase 1 的小阶段以 `specs/master/phases/` 下的独立 phase artifact 为准。每个小 phase 都可以在执行中独立调整目标、范围、非目标、交付物、验收标准、依赖与下游引用。

总方案只维护阶段顺序和战略边界，不复制每个小 phase 的完整执行细节，避免与 phase artifact 漂移。
具体 phase artifact 列表、命名规范、依赖元数据语义和直接依赖矩阵见 `specs/master/phases/README.md`。

| Phase | Phase artifact | 主要交付 |
|---|---|---|
| 1.0 | `specs/master/phases/phase-1.0-lifecycle-research.md` | Lifecycle Decision Model 调研、对比、Final Model、routing algorithm、architecture handoff |
| 1.1 | `specs/master/phases/phase-1.1-architecture-baseline.md` | 吸收 Phase 1.0 输出并补齐全平台架构基线 |
| 1.2 | `specs/master/phases/phase-1.2-runtime-skeleton.md` | Runtime 骨架 |
| 1.3 | `specs/master/phases/phase-1.3-contract-templates-adapters.md` | Contract / Templates / Adapters Pack |
| 1.4 | `specs/master/phases/phase-1.4-commands-agents-workflows.md` | Commands / Agents / Workflows Pack |
| 1.5 | `specs/master/phases/phase-1.5-sdd-parser-task-model.md` | SDD 文档读取与 Task 模型 |
| 1.6 | `specs/master/phases/phase-1.6-artifact-delegation-contract.md` | Artifact 与 Delegation Contract |
| 1.7 | `specs/master/phases/phase-1.7-claude-code-command-integration.md` | Claude Code 命令接入 |
| 1.8 | `specs/master/phases/phase-1.8-single-task-loop.md` | 单 Task 执行闭环 |
| 1.9 | `specs/master/phases/phase-1.9-goal-verify-doctor.md` | Goal-level Verify 与 Doctor 加固 |
| 1.10 | `specs/master/phases/phase-1.10-real-project-trial.md` | 真实项目验收试跑 |

引用规则：

- phase 的可执行边界以对应 phase artifact 为准。
- 每个 phase 的 spec / plan / tasks / validation 都按 phase 命名留存，不被下一 phase 覆盖。
- 顶层 `spec.md / plan.md / tasks.md / validation.md` 只作为索引入口。
- phase 执行中如果目标、范围或验收变化，优先更新对应 phase artifact，再同步该 phase 命名的 spec/plan/tasks/validation。
- 下游 phase 必须引用上游 phase artifact 和命名执行文档，而不是复制上游内容。

### 3.2 Phase 2：AI 工具入口投影与全局安装接入

Phase 2 的目标不是复刻 OpenSpec，而是落地一类已经在 Spec Kit、GSD、OpenSpec、Oh My OpenCode/OpenAgent 中反复出现的通用模式：**CLI 到 AI 工具入口的投影层**。

共同机制可以概括为：

```text
global/package CLI
  -> project init
  -> detect target project/tooling
  -> generate tool-native skills/commands/instructions
  -> runtime/instruction API keeps workflow brain in CLI/core
  -> update/doctor checks generated asset drift
```

这说明 `/sdd` 不应该只是仓库内几份手写 command 文档，而应该成为可安装、可初始化、可更新、可诊断的产品化入口。

Phase 2 总范围：

- 全局或本机可复用安装：让 `sdd` 可在任意目标仓库执行。
- `sdd init` 项目初始化：创建 `.sdd/project.yml`、必要目录和 AI 工具入口。
- AI tool adapter registry：Claude Code 优先，预留 OpenCode/Cursor 等工具。
- 入口投影：生成 `.claude/skills/.../SKILL.md`、`.claude/commands/...` 或其他工具对应入口。
- `sdd update`：升级平台后刷新已生成入口，并保留 generatedBy/version 元数据。
- `sdd doctor` 漂移检查：发现入口缺失、版本不一致、配置过期。
- instruction API：skills/commands 保持薄入口，通过 CLI 获取当前状态、artifact graph、下一步 instructions。
- 项目识别能力产品化：从 Phase 1 的 evidence scoring 继续演进为 detector registry，支持 mixed stack 和 confidence。

Phase 2 不做：

- background write agents。
- per-task worktree。
- dependency wave 并发执行。
- plugin loader。
- dashboard / run database。
- 代码知识图谱。

Phase 2 验收标准：

- 在本机全局安装后，进入任意目标仓库运行 `sdd init` 能生成正确 `.sdd/project.yml` 和 Claude Code 入口。
- 进入 Claude Code 后，可通过 `/sdd` 或 `/sdd-*` 入口触发平台，而不是手工复制命令文档。
- 生成入口含版本元数据，`sdd update` 可刷新，`sdd doctor` 可发现漂移。
- skills/commands 是薄入口，复杂 workflow 逻辑仍由 CLI/core/instruction API 承载。
- 项目栈识别不是按文件顺序写死，而是 detector registry + evidence/confidence/mixed stack。

#### 3.2.1 共同模式来源

| 项目 | 共同模式 | 对本平台的转译 |
|---|---|---|
| Spec Kit | `specify init` + agent integration，把通用命令模板投影为 Claude skills/commands | `sdd init` 生成 Claude Code 原生入口，命令模板来自平台资产包 |
| GSD | slash command 入口 + workflow/agent assets + phase/queue/status 命令 | `/sdd` 作为总入口，子命令查询 run/task/status/doctor |
| Oh My OpenCode/OpenAgent | 全局/项目配置 + skills/commands/hooks/agents 包装层 | 平台资产可安装、可更新、可被 doctor 检查，但不绑定 OpenCode plugin API |
| OpenSpec | `openspec init/update` + 多工具 skills/commands + schema-driven artifact instructions | `sdd init/update` + tool adapter registry + instruction API + artifact graph |

#### 3.2.2 Phase 2 小阶段候选

| Phase | 主要交付 |
|---|---|
| 2.1 | 全局 CLI 安装与本机包分发验证 |
| 2.2 | AI tool adapter registry 与 Claude Code adapter |
| 2.3 | `sdd init/update` 生成与刷新 skills/commands |
| 2.4 | instruction API 与薄入口 command/skill 改造 |
| 2.5 | detector registry、mixed stack/confidence 输出与 init 回归测试 |
| 2.6 | 全局安装 -> 目标仓库 init -> Claude Code `/sdd` 触发 -> update/doctor -> uninstall E2E |

### 3.3 Phase 3：平台化扩展阶段

Phase 3 的目标是在 Phase 1 闭环和 Phase 2 入口投影稳定后，把工具、插件、并发隔离和长期治理平台化。Phase 3 不作为 Phase 1 或 Phase 2 的前置条件。

#### 3.3.1 Phase 3.1：Tool / Plugin 能力层

目标：把 Phase 1 中散落在 agent guidelines 里的工具使用规则沉淀为 capability mapping。

范围：

- tool registry。
- plugin loader。
- MCP/tool capability mapping。
- prompt auto-injection。
- doctor auto-detect tools。
- skill/tool/agent package management。

验收标准：

- agent 能按 capability 获取可用工具说明。
- doctor 能检查关键 MCP/tool/plugin 是否可用。
- 工具能力变化不需要手改每个 agent prompt。

#### 3.3.2 Phase 3.2：并发与隔离执行

目标：吸收 GSD 的 dependency wave、files overlap 和 per-task worktree 思路，让多个 task 能安全并行。

范围：

- background write agents。
- per-task worktree。
- dependency wave scheduler。
- files overlap gate。
- merge/reconcile。
- post-merge verifier。

验收标准：

- 无文件重叠的同 wave task 可并行执行。
- 文件重叠能被 gate 阻止或要求人工确认。
- worktree merge 后必须通过 post-merge verifier。

#### 3.3.3 Phase 3.3：长期运行治理与可视化

目标：让平台可以长期运行、检索、复盘和对比历史 run。

范围：

- dashboard。
- run database。
- cross-project history。
- agent/version analytics。
- stale task monitor。
- doctor auto-fix。

验收标准：

- 能按项目、spec、task、agent、status 查询历史 run。
- 能发现长期 stale / failed / gap-heavy 的任务。
- 能对比不同 agent version 的执行表现。

#### 3.3.4 Phase 3.4：跨 Runtime 与高级 Agent 编排

目标：在核心 contract 稳定后，支持 Claude Code 之外的 runtime 或更复杂的 agent/model routing。

范围：

- Claude Code / OpenCode 等 runtime adapter。
- agent/model capability matching。
- Oracle / Hephaestus 类长期执行 agent。
- category + skill 动态路由。

验收标准：

- 同一 SDD contract 可以由不同 runtime adapter 执行。
- runtime 差异不污染 `spec.md / plan.md / tasks.md`。
- 高成本 agent 调用有清晰 gate、预算和 artifact。

### 3.4 Phase 4：NPM Package Distribution / Public Install Baseline

Phase 4 从原“代码知识图谱”前移出一个发布分发阶段：先把当前 GitHub direct install 能力升级为标准 npm published package，让普通用户最终可以像 OpenSpec 一样使用 `npm install -g <package>@latest` 安装 CLI。

Phase 4 关注：

- npm package identity：包名、scope、registry、public access。
- public package metadata：license、repository、homepage、bugs、keywords、engines、files、bin、publishConfig。
- package contents audit：只发布运行所需资产，排除 `.sdd/runs`、本地 smoke、私有 settings、日志和临时包。
- publish readiness validation：`npm pack --dry-run`、本地 tarball install smoke、`npm publish --dry-run`。
- human-operated publish guide：npm account、2FA、`npm login`、`npm whoami`、真实 publish 确认和 post-publish smoke。
- docs install path：真实 npm publish 成功前继续以 GitHub direct install 为可用默认路径；成功后再切换到 npm package。

Phase 4 不做自动发布 CI/CD，不配置 npm token/secret，不静默执行真实 `npm publish`，也不改变 SDD runtime 主路径。

### 3.5 Phase 5：项目代码知识图谱阶段

原 Phase 4 代码知识图谱方向顺延为 Phase 5。该方向暂不拆分小阶段，只作为长期架构目标保留。它的目标是在 SDD workflow、入口投影、agent runtime 和 npm 分发基线稳定后，建设项目代码知识图谱，让平台从“按任务执行”进一步演进为“理解项目结构、依赖、变更影响和历史决策”的持续迭代系统。

Phase 5 关注：

- 代码结构图谱：module / package / class / function / API / table / mapper / config 的关系。
- 依赖与影响图谱：调用关系、数据流、配置依赖、任务 affected_files 与真实影响面的映射。
- SDD 语义图谱：spec / plan / task / acceptance / artifact / gap / validation evidence 的关系。
- 运行历史图谱：run、agent、version、task result、debug attempt、validation result 的演进。
- 检索与推理能力：支持 impact analysis、相似任务召回、风险提示、测试建议和架构漂移识别。

Phase 5 可参考开源图谱和代码智能方向，但不直接照搬实现：

- GSD 的 dependency wave / files overlap / gap closure 可转译为任务依赖与影响图谱。
- Oh My OpenCode / Oh My OpenAgent 的 Explore / Librarian / Oracle 编排可转译为图谱采集、外部知识补充和高成本架构咨询。
- Spec Kit 的 spec / plan / tasks 产物链可转译为 SDD 语义节点与阶段边。
- 代码索引、AST、LSP、调用图、数据库 schema 和运行 artifact 应逐步汇入统一知识层。

Phase 5 不作为 Phase 1、Phase 2、Phase 3 或 Phase 4 的前置条件。Phase 1/2/3/4 的架构必须为 Phase 5 预留稳定 contract：task metadata、artifact schema、event log、agent version、validation evidence 和 package distribution evidence 都不能只服务当前命令，而要能被后续图谱长期消费。

## 4. Phase 1 完成定义

Phase 1 不是“能生成几个文档”就完成，而是必须能用一个真实任务验证完整链路。

最小闭环：

```text
1. 创建或读取 specs/<branch>/ 下的 spec.md / plan.md / tasks.md。
2. 根据 tasks.md 选择一个 task。
3. scout / planner / spec-reviewer 可在 background 做只读分析；关键问题可触发 Oracle-style 只读咨询。
4. implementer 在前台串行实现。
5. reviewer 独立审查 diff。
6. review 或 validation 失败时，debugger 最多自动介入一次。
7. validator 做 goal-level validation，并运行项目适配中定义的最小验证命令。
8. runtime 记录 state、events、artifacts。
9. 生成 sync-back proposal，由主会话确认是否写回 tasks.md。
10. doctor 能检查基础环境与配置是否可用。
```

Phase 1 验收标准：

- 一个 Java/Spring/MyBatis 真实任务可以从规格到验证跑完。
- 主会话上下文不会因为大规模只读探索而爆满。
- 每个 subagent 输出能沉淀为 artifact。
- 失败能进入一次 debugger 闭环。
- 未解决问题能生成 gap report，而不是硬标完成。
- `tasks.md` 不被 runtime 随意污染。
- 所有高风险操作仍由 Claude Code 原生权限、用户审批、settings、hooks 管理。

## 5. 架构分层

总体架构：

```text
User Commands / Skills
  /sdd-spec /sdd-plan /sdd-tasks /sdd-do /sdd-verify /sdd-doctor

SDD Core
  spec / plan / tasks / acceptance / validation / sync-back proposal

Agent Runtime
  agent selection / background read tasks / foreground write tasks / review-debug-verify loop

Run State Layer
  state.json / events.jsonl / artifacts / agent version / task result

Project Adapter Layer
  .sdd/project.yml / validation commands / language / spec dir / editing preference

Future Tool & Plugin Layer
  tool registry / plugin loader / MCP bridge / doctor auto-detect / prompt injection
```

Phase 1 重点实现前五层，Tool & Plugin Layer 只保留概念接口，不做实际 registry 或 loader。

### 5.1 架构设计原则

本项目本身就是 SDD + subagent workflow 平台，因此不能把架构设计推迟到后期。Phase 1 虽然要小步落地，但每一步都必须服务长期演进。

核心原则：

```text
project-first architecture
contract-first runtime
artifact-first agent output
event-sourced execution trail
thin command layer, stable core library
future graph-ready metadata
```

具体要求：

- `packages/core` 承载稳定领域能力，不能让 slash command prompt 成为事实上的业务逻辑层。
- `packages/cli` 只做命令分发、输出和运行入口，不承载长期状态机。
- commands / agents / workflows / templates / adapters 是平台资产，必须版本化、可检查、可替换。
- schemas/contracts 是跨 phase 的边界，优先保证稳定和可演进，不追求一开始复杂。
- state/events/artifacts 要面向恢复、审计和未来知识图谱消费，而不只是当前命令输出。
- 参考开源项目时只吸收机制：Spec Kit 的阶段产物、GSD 的 dependency wave 与 overlap、Oh My OpenCode 的 agent 分工和背景任务纪律；不直接复制其实现结构。

## 6. 目录结构

### 6.1 用户级平台目录

平台能力优先放用户级目录，避免污染每个业务仓库。

建议目录：

```text
~/.claude/sdd-platform/
  VERSION
  README.md
  commands/
    sdd-spec.md
    sdd-plan.md
    sdd-tasks.md
    sdd-do.md
    sdd-verify.md
    sdd-doctor.md
  agents/
    scout.md
    spec-reviewer.md
    planner.md
    implementer.md
    reviewer.md
    debugger.md
    validator.md
  templates/
    spec-template.md
    plan-template.md
    tasks-template.md
    project-template.yml
    sync-back-proposal-template.md
  workflows/
    spec.yml
    plan.yml
    tasks.yml
    do.yml
    verify.yml
    doctor.yml
  adapters/
    java-maven.yml
    generic.yml
```

说明：

- `commands/`：用户入口命令说明。
- `agents/`：agent prompt / contract。
- `templates/`：SDD 文档与 run artifact 模板。
- `workflows/`：阶段流程说明。
- `adapters/`：项目适配模板，不做复杂 plugin。

### 6.2 项目级目录

项目级只放项目配置、运行状态、产物，不复制整套平台。

建议目录：

```text
<repo>/
  specs/<branch>/
    spec.md
    plan.md
    tasks.md

  .sdd/
    project.yml
    runs/
      <run_id>/
        state.json
        events.jsonl
        artifacts/
          scout-T1.md
          review-T1.md
          validation-T1.md
          debug-T1.md
          gap-report-T1.md
        sync-back-proposal.md
```

原则：

- `specs/<branch>/` 是 SDD 语义事实源。
- `.sdd/project.yml` 是项目适配配置。
- `.sdd/runs/<run_id>/` 是 runtime 执行事实源。
- artifacts 保存子任务详细输出，避免主会话上下文膨胀。

## 7. Spec Kit-compatible，而不是 Spec Kit-based

本平台保留 Spec Kit 的阶段语言和产物命名：

```text
spec.md
plan.md
tasks.md
```

但不依赖 Spec Kit CLI 作为 runtime。

边界：

```text
兼容 Spec Kit 的产物命名和阶段语言
不依赖 Spec Kit CLI 执行 implement/review/verify
不改 Spec Kit vendor 模板
自家 .sdd 定义 run state / events / artifacts / agents / project adapter
```

这样既保留当前项目已有习惯，也避免核心 contract 被外部 CLI 细节绑定。

## 8. 双事实源模型

### 8.1 Markdown 语义事实源

Markdown 面向人类阅读和讨论：

```text
spec.md   需求与验收语义
plan.md   技术设计与边界
tasks.md  任务拆解与执行计划
```

Markdown 是 SDD 的长期沉淀，不应该被 runtime 在执行过程中随意改写。

### 8.2 Runtime 执行事实源

Runtime 面向恢复、审计、后台任务和自动化：

```text
.sdd/runs/<run_id>/state.json
.sdd/runs/<run_id>/events.jsonl
.sdd/runs/<run_id>/artifacts/
```

`state.json` 记录当前快照，`events.jsonl` 记录追加事件，`artifacts/` 保存大块 agent 输出。

示例 `state.json`：

```json
{
  "runId": "20260430-001",
  "phase": "do",
  "currentTask": "T3",
  "status": "running",
  "agents": {
    "implementer": {
      "version": "0.1.0",
      "status": "completed"
    },
    "reviewer": {
      "version": "0.1.0",
      "status": "running"
    }
  },
  "tasks": {
    "T3": {
      "status": "reviewing",
      "artifacts": [
        ".sdd/runs/20260430-001/artifacts/implement-T3.md"
      ]
    }
  }
}
```

示例 `events.jsonl`：

```jsonl
{"time":"2026-04-30T10:00:00+08:00","event":"run_started","runId":"20260430-001"}
{"time":"2026-04-30T10:02:00+08:00","event":"task_selected","task":"T3"}
{"time":"2026-04-30T10:05:00+08:00","event":"agent_started","agent":"implementer","task":"T3","version":"0.1.0"}
{"time":"2026-04-30T10:20:00+08:00","event":"agent_completed","agent":"implementer","task":"T3","artifact":"artifacts/implement-T3.md"}
{"time":"2026-04-30T10:25:00+08:00","event":"review_failed","task":"T3","artifact":"artifacts/review-T3.md"}
```

## 9. Task 模型

Phase 1 虽然不做并发执行，但 task 文档必须从第一天支持 dependency metadata，避免 Phase 2 重写格式。

建议 task 格式：

```markdown
### T3: 收紧 DeviceFactoryThrd 输入闸门

```sdd-task
id: T3
status: pending
wave: 2
depends_on:
  - T1
affected_files:
  - emp-upms/emp-upms-rpc-service/src/main/java/com/emp/upms/rpc/thread/ERPSyncSvr.java
validation:
  - mvn compile -Ptest -pl emp-upms/emp-upms-rpc-service -am
risk:
  - 状态流转
  - 历史数据
  - 下游消费闸门
```

#### Boundary

只允许调整 DeviceFactoryThrd 查询闸门，不重构线程模型，不调整数据库结构。

#### Acceptance

- 主单未进入 ERP_READY 时，DeviceFactoryThrd 查询不到该 qty。
- 只消费生产入库、已审核、主单已 ERP_READY 的 qty。

#### Implementation Notes

执行后通过 sync-back proposal 写入。
```

字段说明：

- `id`：稳定 task 标识。
- `status`：任务状态。
- `wave`：未来并发/分波执行依据。
- `depends_on`：依赖任务。
- `affected_files`：文件边界与 overlap gate 的基础。
- `validation`：最小验证命令。
- `risk`：reviewer / validator 重点关注点。
- `Boundary`：防止 agent 改穿层。
- `Acceptance`：validator 做 goal-level validation 的依据。

## 10. Agent registry：Phase 1 七角色

Phase 1 使用 7 个核心 agent 角色。

### 10.1 scout

职责：只读探索、代码定位、上下文收集。

特点：

- 可 background。
- 不写文件。
- 输出 artifact，避免主会话塞满搜索结果。

输入：

```text
spec/plan/tasks 当前片段
探索问题
项目 adapter
```

输出：

```text
相关文件
相关类/方法
观察结果
不确定点
建议下一步阅读范围
```

### 10.2 spec-reviewer

职责：审查 spec 是否完整、验收是否可验证、范围是否清楚。

特点：

- 可 background。
- 不写文件。
- 重点发现需求缺口和验收不可测问题。

### 10.3 planner

职责：任务拆解、依赖关系、wave、affected_files、validation 建议。

特点：

- 可 background。
- 不写文件。
- 不直接生成最终计划，只输出建议 artifact。

### 10.4 implementer

职责：按当前 task 做最小必要实现。

特点：

- Phase 1 只前台串行执行。
- 可写文件。
- 不自动 commit。
- 不自动 push。
- 不创建 worktree。
- 不改 task 之外的范围。

### 10.5 reviewer

职责：独立审查 diff 是否满足 task、是否越界、是否引入风险。

特点：

- 可 background。
- 默认只读。
- 输出 PASS / FAIL / BLOCKED。

### 10.6 debugger

职责：当 review 或 validation 失败时，定位并修复当前 task 的失败。

特点：

- Phase 1 只允许自动介入一次。
- 可写文件。
- 只修当前失败，不顺手重构。

### 10.7 validator

职责：goal-level validation。

特点：

- 可 background 执行只读审查。
- 运行命令时按项目 adapter。
- 不只是 build runner，必须把 diff / 验收 / 命令结果映射起来。

输出状态：

```text
PASS
PASS_WITH_GAPS
FAIL
BLOCKED
```

### 10.8 Oh My OpenCode Discipline Agents 转向分析

本节基于重新阅读 `code-yeongyu/oh-my-openagent` 仓库源码和文档后补充。重点不是 README 的营销表述，而是实际 agent 定义、动态 prompt section、委派工具和 background task 机制。

关键源码路径：

```text
src/agents/sisyphus.ts
src/agents/hephaestus/agent.ts
src/agents/oracle.ts
src/agents/librarian.ts
src/agents/explore.ts
src/agents/builtin-agents.ts
src/agents/dynamic-agent-core-sections.ts
src/tools/delegate-task/tools.ts
src/tools/call-omo-agent/tools.ts
src/tools/background-task/*
src/plugin/tool-registry.ts
src/create-tools.ts
docs/guide/orchestration.md
docs/guide/agent-model-matching.md
```

源码复核后的判断：Oh My OpenCode 的 `Discipline Agents` 不是 SDD 产物链，而是 harness 层的“专家团队编排”。它的核心是：

```text
Sisyphus 负责 intent gate / planning / delegation / synthesis
Explore 负责本地代码库只读探索
Librarian 负责外部文档和开源源码检索
Oracle 负责高成本架构、调试、复杂判断咨询
Hephaestus 负责深度执行，但更像 primary worker，不是普通后台 subagent
```

其中 `Sisyphus` 的 prompt 明确强调不要独自工作，应该把独立搜索、文档检索、架构咨询拆给专家 agent，并尽量并行。实际委派机制主要有两类：

```text
call_omo_agent(subagent_type, run_in_background)
task(category | subagent_type, load_skills, run_in_background, task_id)
```

这说明 “full AI dev team in parallel” 不是单纯起几个角色名，而是由三层共同构成：

1. **职责分层**：orchestrator 不亲自完成所有探索、咨询、实现。
2. **委派工具**：通过 agent 名或 category 把任务发给不同专家。
3. **后台任务管理**：只读探索、文档检索、咨询可以并行跑，结果再由 orchestrator 综合。

对本方案的转向影响：

```text
原先：SDD lifecycle agents 串起 spec -> plan -> tasks -> do -> verify
补充后：SDD lifecycle agents 之上，需要一个 Discipline Agents 视角
```

两套 agent 不是替代关系，而是正交关系：

| Oh My OpenCode Discipline Agent | 本方案 Phase 1 对应角色 | 说明 |
|---|---|---|
| Sisyphus | 主会话 / sdd-orchestrator | 负责 intent gate、任务选择、委派、综合判断，不亲自吞掉所有上下文 |
| Explore | scout | 本地代码库只读探索，适合 background，输出 artifact |
| Librarian | research scout / docs scout | 外部文档、开源仓库、issue 调研，适合 background |
| Oracle | oracle-style reviewer / debugger consultant | 高成本只读咨询，用于架构风险、复杂 bug、关键决策闸门 |
| Hephaestus | implementer 的 Phase 2 强化形态 | 深度执行型 primary worker，Phase 1 不应后台化或并行写代码 |

因此，Phase 1 的 7 个 agent 仍保持不变，但需要补一个编排原则：**主会话是 Sisyphus-style orchestrator，默认把独立的只读探索、文档检索、关键咨询拆给 background agents，而不是让主会话串行读完整个世界。**

Phase 1 应吸收的 Discipline Agents 能力：

- `scout` 明确拆成两种任务语义：本地代码 Explore-style、外部资料 Librarian-style。
- 关键架构判断、复杂 debug、方案分歧可触发 Oracle-style 只读咨询 artifact。
- background 并行只用于只读 / 审查 / 咨询，不用于写代码。
- 每个 delegation prompt 必须包含：任务目标、输入文档、禁止事项、成功标准、输出 artifact 格式。
- events 需要记录 `delegation_started` / `delegation_completed`，并保存 agent type、background 标记、artifact 路径。
- `task_id` 或等价字段应作为 Phase 1 state 预留，用于后续续接同一 background/subagent 会话。

Phase 1 不吸收的能力：

- 不照搬 Sisyphus 的超重 prompt。
- 不把 Hephaestus 作为后台写代码 agent。
- 不做 category + model routing。
- 不做多模型 fallback / concurrency control。
- 不做 OpenCode plugin API 绑定。

Phase 2 应吸收的能力：

- Atlas / Hephaestus 类长期执行 agent。
- Prometheus / Metis / Momus 类规划、gap analysis、plan review 闭环。
- category + skill 动态路由。
- tool registry 与 plugin loader。
- background write + worktree isolation + overlap gate。
- agent/model capability matching。

风险限制：

- Oh My OpenCode 深度绑定 OpenCode plugin API，不能直接作为 Claude Code 原生实现复制。
- 默认并行会制造重复搜索和上下文噪音，需要由 orchestrator 控制并行预算。
- Oracle 必须保持只读咨询，否则会和 reviewer/debugger/implementer 职责混乱。
- Hephaestus 更像 primary 深度工作模式，不应在 Phase 1 被当成普通 subagent 并行改代码。
- Discipline Agents 的价值在编排纪律，不在角色命名。

## 11. Agent operating guidelines

Phase 1 不做 tool registry，不做 plugin loader，不做动态工具注入。

工具治理只作为 Claude Code-native 的 agent 行为准则：

```text
真实权限仍由 Claude Code permission、settings、hooks、MCP server、用户审批决定。
agent prompt 只说明这个角色应该怎样使用 Claude Code 已有工具。
```

基本准则：

- `scout / spec-reviewer / planner / reviewer / validator` 默认只读。
- `implementer / debugger` 可以按当前 task 写文件。
- UTF-8 文本编辑优先使用 `hashline-edit`。
- native Edit 作为 fallback。
- Bash / PowerShell 只用于验证、构建、git 状态、必要 CLI。
- 不用 Bash / PowerShell 代替专用 Read / Grep / Glob / Edit。
- 高风险操作交回主会话确认。

这不是替代 Claude Code 的权限系统，而是让 fresh context subagent 不丢失本项目的工作偏好。

### 11.1 避免成为大 prompt 工程

本平台不能退化成一组越来越长的超级 prompt。prompt 只能表达角色职责和当前阶段规则，不能承载全部状态、流程、工具治理和恢复逻辑。

核心原则：

```text
用 contract 替代长提示词；
用 state/events 替代聊天记忆；
用 artifacts 替代上下文堆叠；
用 project.yml 替代反复复制项目规则；
用 checkpoint/gap/liveness 机制替代 prompt 里的口头约束。
```

Phase 1 的 prompt 设计限制：

- 每个 agent prompt 只写角色边界、输入要求、禁止事项、输出格式。
- 不把完整平台说明塞进每个 agent。
- 不在 prompt 中重复大段项目背景；项目差异通过 `.sdd/project.yml` 和当前 task 输入传递。
- 不靠 prompt 要求 agent 记住历史状态；历史状态来自 `state.json / events.jsonl / artifacts`。
- 不靠 prompt 隐式判断下一阶段；阶段推进由 checkpoint gate 控制。
- 不靠 prompt 隐式处理失败；失败走 gap / liveness / recovery 机制。

每个 delegation prompt 应保持短输入、强 contract：

```text
role
task
allowed scope
forbidden actions
required inputs
expected artifact
success criteria
output format
timeout/blocking metadata
```

不建议的做法：

- 一个 Sisyphus-style 巨型总 prompt 试图覆盖所有场景。
- 每个 agent 都复制完整 SDD 平台规则。
- 用更长 prompt 修复状态管理、权限边界或恢复机制缺失。
- 把工具选择、阶段推进、gap 分类都藏在自然语言提示中。

可接受的做法：

- 主 orchestrator 读取 workflow step 文件，只加载当前阶段规则。
- subagent 只接收当前 task 所需上下文和 artifact 链接。
- 复杂规则沉淀为模板、state schema、event type、project adapter。
- prompt 版本化，发现漂移后修改 contract，而不是无限追加说明。

这也是本方案和 Oh My OpenCode / GSD 的取舍差异：借鉴其编排纪律和 agent 分工，但不照搬超重 prompt，不让平台演变成 prompt 堆砌。

## 12. Background task 边界

Phase 1 支持 background，但只用于只读 / 审查 / 验证类任务。

允许 background：

```text
scout
spec-reviewer
planner
reviewer
validator 的只读部分
文档/issue/research 类任务
```

不允许 background：

```text
implementer 写代码
debugger 修改代码
自动 merge
自动 cleanup
自动 commit/push
```

原因：

- background 的主要价值是保护主会话上下文窗口。
- Phase 1 还没有 worktree isolation、files overlap gate、merge/reconcile，不应允许后台写代码。

## 13. State / Events / Artifacts

### 13.1 state.json

`state.json` 是当前 run 快照，用于断点恢复和当前状态显示。

记录内容：

- run id。
- 当前 phase。
- 当前 task。
- task 状态。
- agent 状态。
- agent version。
- artifacts 索引。
- validation 状态。
- sync-back proposal 状态。
- delegation liveness 状态。
- timeout / deadline。
- expected artifact 校验状态。
- terminal event 状态。

### 13.2 events.jsonl

`events.jsonl` 是追加事件日志，用于审计和复盘。

事件类型：

```text
run_started
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
gap_detected
gap_classified
gap_resolution_proposed
gap_resolved
gap_deferred
gap_escalated
validation_failed
gap_created
sync_back_proposed
sync_back_applied
run_completed
delegation_started
delegation_completed
delegation_timeout
delegation_cancelled
delegation_recovered
delegation_stale
artifact_missing
artifact_invalid
```

### 13.3 artifacts

artifacts 存放大块输出，events 只记录摘要和路径。

建议命名：

```text
artifacts/scout-T1.md
artifacts/spec-review-T1.md
artifacts/plan-review-T1.md
artifacts/implement-T1.md
artifacts/review-T1.md
artifacts/debug-T1.md
artifacts/validation-T1.md
artifacts/gap-report-T1.md
artifacts/diff-summary-T1.md
```

### 13.4 delegation liveness state

每个 subagent delegation 都必须进入 run state，不能只依赖聊天记录。

最小状态字段：

```json
{
  "delegationId": "D-T3-reviewer-001",
  "task": "T3",
  "agent": "reviewer",
  "runMode": "background",
  "blocking": true,
  "requiredForPhaseExit": true,
  "status": "RUNNING",
  "startedAt": "2026-04-30T10:05:00+08:00",
  "lastHeartbeatAt": null,
  "timeoutSeconds": 900,
  "expectedArtifact": ".sdd/runs/20260430-001/artifacts/review-T3.md",
  "terminalEventRequired": true
}
```

Phase 1 不要求真实 heartbeat，但必须有 `startedAt + timeoutSeconds + expectedArtifact + blocking`。Phase 2 再补真实 heartbeat、后台管理器、取消和续接。

## 14. 执行隔离

Phase 1 不做 worktree 管理。

执行边界：

```text
写操作默认在当前工作树
implementer/debugger 前台串行
不创建 per-task worktree
不自动 merge
不自动 cleanup
```

原因：

- Phase 1 的主要目标是验证 SDD workflow 和 subagent 闭环。
- 默认 worktree 会引入 Windows 路径、Maven 缓存、合并、清理、状态同步等复杂度。
- GSD 的 issue 已显示 worktree cleanup / merge / background write 是高风险区域。

但 contract 预留隔离字段：

```yaml
execution:
  isolation: current_worktree
```

Phase 2 可扩展为：

```yaml
execution:
  isolation: per_task_worktree
```

## 15. Task Liveness / Timeout / Recovery

subagent 任务可能死掉、超时、被工具中断、只写了一半 artifact，或者状态停在 `RUNNING`。这不是异常边角，而是多 agent workflow 的常见故障模式，GSD 类系统已经暴露过类似风险。

Phase 1 必须最少支持 liveness、timeout、terminal event 和 artifact validation。

### 15.1 delegation 生命周期

每个 delegation 的状态必须在有限状态集合内流转：

```text
PENDING
RUNNING
COMPLETED
FAILED
TIMED_OUT
CANCELLED
RECOVERABLE
STALE
```

规则：

- `RUNNING` 不能无限存在。
- 每个 background delegation 必须有 terminal event。
- terminal event 包括 `COMPLETED / FAILED / TIMED_OUT / CANCELLED`。
- `COMPLETED` 不代表有效完成，必须再校验 artifact。
- stale delegation 不能被当成成功。

### 15.2 timeout 规则

每个 delegation 必须有 timeout：

```yaml
timeoutSeconds: 900
blocking: true
requiredForPhaseExit: true
expectedArtifact: .sdd/runs/<run_id>/artifacts/review-T3.md
```

Phase 1 的 timeout 不需要后台守护进程实时触发，但 orchestrator、`/sdd-doctor`、resume 时必须检查：

```text
now - startedAt > timeoutSeconds && status == RUNNING
  -> mark TIMED_OUT or STALE
  -> write event
  -> write recovery note
  -> ask orchestrator decision
```

### 15.3 artifact validation

agent 返回或 delegation 标记 completed 后，必须校验 artifact：

```text
artifact 文件存在
artifact 非空
artifact 包含 sdd-result block 或约定标题
status 属于 PASS / FAIL / BLOCKED / PASS_WITH_GAPS / TIMED_OUT
task id 匹配
agent id/version 匹配
```

校验失败时记录：

```text
artifact_missing
artifact_invalid
```

并把 delegation 状态转为 `RECOVERABLE` 或 `FAILED`，不能继续当作正常完成。

### 15.4 不同 agent 的阻塞语义

不同 agent 超时的处理不同：

| Agent | 超时默认影响 | 处理 |
|---|---|---|
| scout / Explore-style | 通常不直接阻塞 | 转为 Context Gap 或证据不足 warning |
| Librarian-style | 通常不直接阻塞 | 外部资料缺失时可继续，但记录 gap |
| Oracle-style | 取决于是否关键 gate | 关键决策 gate 超时则 BLOCKED，否则 warning |
| reviewer | 阻塞 task completed | 不能跳过 review 直接完成 |
| validator | 阻塞 completed | 只能 FAIL / BLOCKED / PASS_WITH_GAPS |
| implementer | 必须检查工作树 diff | 不能假设成功或失败，需人工/主会话判断 |
| debugger | 超时后停止自动修复 | 生成 failure/gap report |

因此 state 需要记录：

```yaml
blocking: true | false
requiredForPhaseExit: true | false
```

### 15.5 recovery 策略

timeout 或 stale 后不做无限 retry。

可选恢复动作：

```text
retry same agent
retry with smaller scope
switch to another agent/model（Phase 2）
skip non-blocking result and mark Context Gap
turn into blocking gap
ask user
cancel delegation
```

Phase 1 默认策略：

```text
non-blocking timeout -> Context Gap / warning
blocking timeout -> BLOCKED + recovery proposal
implementer/debugger timeout -> inspect diff before decision
reviewer/validator timeout -> cannot complete task
```

### 15.6 doctor / resume 检查

`/sdd-doctor` 和 resume 必须检查 stale delegation：

```text
RUNNING but timeout exceeded
expected artifact missing
terminal event missing
state says completed but artifact invalid
events has agent_started but no terminal event
```

发现后输出 recovery proposal，不自动删除状态、不自动重跑、不自动标成功。

## 16. Sync-back proposal

Phase 1 不自动写回 `tasks.md`。

流程：

```text
runtime 记录 state/events/artifacts
  -> 生成 sync-back proposal
  -> 主会话审查
  -> 用户或主会话确认后写回 tasks.md
```

sync-back 允许写回范围：

- task status。
- implementation notes。
- artifact links。
- gap references。

sync-back 不允许：

- 修改 spec 原文。
- 修改 plan 原文。
- 擅自改变 task 边界。
- 擅自删除未完成 task。

示例：

```markdown
## Sync-back Proposal

### T3

- status: pending -> completed
- artifacts:
  - .sdd/runs/20260430-001/artifacts/review-T3.md
  - .sdd/runs/20260430-001/artifacts/validation-T3.md
- implementation_notes:
  - DeviceFactoryThrd 查询闸门已收紧。
  - Maven compile 通过。
- gaps: none
```

## 17. Validator：goal-level validation

validator 不是 build runner。

输入：
```text
spec.md
plan.md
tasks.md 当前 task
acceptance
boundary
diff summary
review result
project.yml validation commands
```

动作：

1. 读取验收点。
2. 检查 diff 是否覆盖验收点。
3. 检查是否越界修改。
4. 执行最小验证命令。
5. 将命令结果映射回验收点。
6. 输出 gaps。

输出：

```markdown
## Status
PASS | PASS_WITH_GAPS | FAIL | BLOCKED

## Commands Run
- mvn compile -Ptest -pl emp-upms/emp-upms-rpc-service -am

## Acceptance Mapping
- [PASS] 主单未 ready 时不能进入 ERP_READY
- [PASS] DeviceFactoryThrd 不消费 ERP_SYNCING 主单
- [GAP] 未覆盖历史脏数据订正场景

## Evidence
...

## Gaps
...
```

## 18. `/sdd-doctor`

Phase 1 提供轻量只读 doctor，不做 auto-fix。

检查项：

```text
当前目录是否 git repo / worktree
specs/<branch>/ 是否存在
spec.md / plan.md / tasks.md 是否存在
.sdd/project.yml 是否存在且可读
.sdd/runs 是否可写
7 个 agent prompt 是否存在
agent prompt version 是否完整
hashline MCP 是否可用（如可检测）
Claude Code 当前工具环境是否满足基本使用
项目 adapter 的 validation command 是否存在
Maven 是否可用（Java 项目）
stale RUNNING delegation 是否存在
expected artifact 是否缺失或无效
events 是否存在 agent_started 但没有 terminal event
```

输出：

```text
PASS
WARN
FAIL
```

原则：

- doctor 只诊断，不自动修。
- auto-fix 留到 Phase 2。

## 19. 命令入口

Phase 1 使用 6 个入口命令。

```text
/sdd-spec
/sdd-plan
/sdd-tasks
/sdd-do
/sdd-verify
/sdd-doctor
```

### 19.1 `/sdd-spec`

职责：创建或更新需求规格。

输出：

```text
specs/<branch>/spec.md
```

### 19.2 `/sdd-plan`

职责：基于 spec 形成技术方案。

输出：

```text
specs/<branch>/plan.md
```

### 19.3 `/sdd-tasks`

职责：基于 spec/plan 形成 tasks，并补齐 dependency metadata。

输出：

```text
specs/<branch>/tasks.md
```

### 19.4 `/sdd-do`

职责：执行 task。

内部阶段：

```text
task selection
scout/planner optional background
implementer foreground write
reviewer independent review
debugger once if needed
sync-back proposal
```

### 19.5 `/sdd-verify`

职责：独立执行 goal-level validation。

可用于：

- 单 task 验证。
- 整个 plan 验证。
- gap closure 后复验。

### 19.6 `/sdd-doctor`

职责：只读环境和配置自检。

## 20. 项目适配：`.sdd/project.yml`

Phase 1 使用轻量项目适配文件，不做完整 adapter plugin。

示例：

```yaml
project:
  name: inshn-emp
  language: java
  framework: spring-mybatis

sdd:
  spec_dir: specs/<branch>
  docs_language: zh-CN
  compatible_with: spec-kit

validation:
  default:
    - mvn compile -Ptest -pl emp-upms/emp-upms-rpc-service -am
  java_compile:
    - mvn compile -Ptest -pl emp-upms/emp-upms-rpc-service -am

editing:
  prefer_hashline: true
  native_edit_fallback: true

risk:
  confirm_required:
    - git_push
    - git_commit
    - git_reset
    - delete_files
    - dependency_install
    - worktree_create
    - worktree_remove
    - ci_cd_change
    - external_publish

runtime:
  background_write: false
  worktree_isolation: false
  sync_back_mode: proposal
```

说明：

- `spec_dir` 保留 `<branch>` 占位，由 runtime 解析。
- `validation` 可按项目覆盖。
- `risk.confirm_required` 是提示性配置，真实权限仍由 Claude Code 管理。
- `runtime` 声明 Phase 1 的执行边界。

## 21. Prompt / Agent 版本管理

每个 agent prompt 需要版本头。

示例：

```yaml
---
name: sdd-reviewer
version: 0.1.0
contract: sdd-agent-result-v1
mode: read-only
---
```

`state.json` 和 `events.jsonl` 必须记录本次 run 使用的 agent version。

原因：

- 方便复盘历史 run。
- 方便定位某个 reviewer/validator prompt bug 影响范围。
- 为 Phase 2 的 agent package / compatibility matrix 留接口。

## 22. Agent 输出格式

Phase 1 使用轻结构化 Markdown，不强制纯 JSON。

推荐格式：

```markdown
```sdd-result
agent: reviewer
task: T3
status: PASS
version: 0.1.0
artifacts:
  - .sdd/runs/20260430-001/artifacts/review-T3.md
```

## Status

PASS

## Summary

...

## Files Touched

- emp-upms/...

## Evidence

...

## Gaps

None
```

优点：

- 人类可读。
- runtime 可粗解析顶部 `sdd-result` block。
- 不把 Phase 1 变成严格 schema 工程。

## 23. 风险控制

Phase 1 风险控制以 Claude Code 原生能力为底座。

原则：

```text
主体依赖 Claude Code 默认权限、settings、hooks、用户审批。
agent prompt 只补充高风险操作应回主会话。
不做自研风险 policy。
不做拦截器。
```

高风险操作包括：

- `git commit` / `git push` / `git amend` / `git reset` / `git clean`。
- 删除文件或目录。
- 安装 / 升级 / 降级依赖。
- 修改 CI/CD。
- 修改全局 settings / hooks。
- 创建 / 删除 worktree。
- 执行数据库 schema / data SQL。
- 外部发布、PR、issue、comment。

Phase 1 只在 agent operating guidelines 和 `.sdd/project.yml` 中声明这些边界。

## 24. Gap 处理与失败恢复模型

Phase 1 同时处理两类异常：`gap` 与普通执行失败。gap 代表阶段产物或证据不足，需要决定是否回流上游；普通执行失败代表当前 task 的实现、审查或验证未通过。

### 24.1 普通执行失败：一次 debugger 闭环

```text
implement
  -> review/verify fail
  -> debugger once
  -> review/verify again
  -> pass or gap report
```

不做无限 retry。

失败后必须产出：

```text
failure artifact
debug attempt artifact
remaining gaps
recommendation: retry / split task / revise plan / ask user
```

状态：

```text
PASS
FAIL
BLOCKED
PASS_WITH_GAPS
```

如果 debugger 后仍失败：

- 不硬标完成。
- 生成 `gap-report-Tx.md`。
- 建议回到 plan 或拆分 task。

### 24.2 任意阶段 gap 处理

gap 可以由任何 agent 在任何阶段发现。发现后不允许静默修复或硬标完成，必须产出 gap artifact，并由 orchestrator 判断回流层级。

处理流程：

```text
gap detected
  -> classify gap
  -> write gap artifact
  -> record events
  -> propose resolution
  -> fix in current phase OR return to upstream checkpoint OR ask user OR defer
```

gap resolution 选项：

```text
fix-in-phase      当前阶段补证据或修正，不改变上游事实源
revise-task       回到 /sdd-tasks checkpoint
revise-plan       回到 /sdd-plan checkpoint
revise-spec       回到 /sdd-spec checkpoint
ask-user          需要用户决策
defer             明确不在本轮处理，写入 gap report / sync-back proposal
new-task          新增 task
new-spec          超出本轮，另起 spec
```

阻塞规则：

- 阻塞性 Spec / Plan / Task Gap 不能进入 implement。
- Implementation Gap 可进入一次 debugger。
- debugger 后仍未解决，转为 gap report。
- Validation Gap 不能直接标 completed，只能 PASS_WITH_GAPS 或 FAIL。
- Environment Gap 进入 `/sdd-doctor` 或 ask-user。
- Scope Gap 不能由 subagent 自动扩范围，必须回主会话。

gap artifact 示例：

```markdown
## Gap G3

- type: Task Gap
- detected_in: /sdd-do
- detected_by: reviewer
- blocking: true
- affected_task: T3

## Evidence

当前 task 未声明 `affected_files`，但实现修改了 ERPSyncSvr.java 和 mapper XML。

## Impact

reviewer 无法判断是否越界，validator 也无法基于 task 边界做验收映射。

## Recommendation

回到 /sdd-tasks checkpoint，补齐 affected_files 与 validation，再重新进入 implement。
```

### 24.3 gap 与 sync-back

sync-back proposal 必须包含未关闭 gap：

```text
open gaps
deferred gaps
new tasks proposed
upstream revision required
```

如果 gap 被 defer，必须写明原因和后续触发条件。

## 25. Phase 2 详细路线：AI 工具入口投影

### 25.1 全局 CLI 与安装形态

目标：让 `sdd` 从当前仓库内可执行工具演进为可在本机任意目标仓库使用的入口。

能力：

```text
npm/global or local package install
sdd --help
sdd init [path]
sdd update [path]
sdd doctor
```

触发条件：

- 需要在真实业务仓库中直接 `sdd init`。
- 需要进入 Claude Code 后用 `/sdd` 或 `/sdd-*` 触发，而不是手工复制 commands。
- 需要平台升级后能刷新目标仓库中的 generated assets。

### 25.2 AI Tool Adapter Registry

目标：把 Claude Code、OpenCode、Cursor 等 AI 工具的入口差异收敛到 adapter，而不是把路径和格式散落在 init 逻辑中。

能力：

```text
tool detection
skill path mapping
command path mapping
frontmatter formatting
generatedBy/version metadata
tool capability flags
```

Claude Code 优先支持：

```text
.claude/skills/sdd-*/SKILL.md
.claude/commands/sdd/*.md
```

### 25.3 Init / Update / Doctor 闭环

目标：让生成入口可重复、可升级、可诊断。

能力：

```text
sdd init      create project config + projected entries
sdd update    refresh generated entries after platform upgrade
sdd doctor    detect missing/stale generated entries
```

关键规则：

- 生成文件必须带 `generatedBy` 或等价版本元数据。
- `update` 只刷新平台生成区域，不覆盖用户项目语义文档。
- `doctor` 报告 drift，不静默修复高风险改动。

### 25.4 Instruction API 与薄入口

目标：避免 skills/commands 变成新的巨型 prompt。

能力：

```text
sdd instructions <action> --json
sdd status --json
sdd tasks list --json
sdd lifecycle decide --json
```

原则：

- skill/command 负责触发和展示。
- CLI/core 负责状态、artifact graph、下一步 instructions。
- 入口文档只保留当前 action 的最小规则，不复制完整平台方案。

### 25.5 Detector Registry

目标：把 Phase 1 暂时实现的 evidence scoring 演进为可扩展的项目识别能力。

能力：

```text
stack detectors
evidence collection
confidence scoring
mixed stack classification
validation command recommendation
```

示例输出：

```yaml
project:
  primary:
    language: java
    framework: ssm-maven-multimodule
    confidence: high
  secondary:
    - language: node
      role: tooling
      confidence: medium
```

## 26. Phase 3 详细路线：平台化扩展

### 26.1 Tool / Plugin 平台化

目标：把 Phase 1 的 agent operating guidelines 抽象为工具能力系统。

能力：

```text
tool registry
plugin loader
MCP bridge
tool capability mapping
agent prompt auto-injection
tool usage audit
doctor tool auto-detection
```

触发条件：

- tools 数量变多。
- agent prompt 里反复复制工具规则。
- 不同 agent 经常用错工具。
- 需要支持 Claude Code + OpenCode 双 runtime。
- 需要动态加载 LSP / AST-Grep / browser / GitHub / Hashline 等工具。

### 26.2 并发 / 隔离执行

目标：吸收 GSD 的 wave / overlap / worktree 能力。

能力：

```text
background write agents
per-task worktree
files overlap gate
dependency wave scheduler
merge/reconcile
post-merge verifier
```

前置条件：

- Phase 2 入口投影和 update/doctor 稳定。
- tool/plugin 边界稳定。
- task metadata 足够完整。
- sync-back writer 稳定。
- doctor 能检查 worktree 和环境。

### 26.3 可视化 / 长期治理

目标：让平台可长期运行和复盘。

能力：

```text
SQLite / local run database
dashboard
cross-project history
agent/version analytics
stale task monitor
doctor auto-fix
artifact search
run comparison
```

## 27. 不做事项

Phase 1 明确不做：

- 不做 tool registry。
- 不做 plugin loader。
- 不做 OpenCode/Bun runtime 绑定。
- 不复制 Oh My OpenAgent 的实现代码。
- 不默认启用 background write。
- 不默认创建 worktree。
- 不自动 commit / push / PR。
- 不自动清理 worktree / branch。
- 不做 dashboard。
- 不做 SQLite run database。
- 不做 doctor auto-fix。
- 不把 `.sdd` 变成大型项目管理系统。
- 不把平台能力建立在单个巨型 orchestrator prompt 上。

Phase 2 明确不做：

- 不做 background write。
- 不做 per-task worktree。
- 不做 dependency wave 并发执行。
- 不做 plugin loader。
- 不做 dashboard / run database。
- 不做代码知识图谱。

## 28. 验收标准

Phase 1 的验收用真实任务验证，而不是只看文件生成。

必须满足：

1. 能在一个真实仓库初始化 `.sdd/project.yml`。
2. 能读取或生成 `spec.md / plan.md / tasks.md`。
3. `tasks.md` 支持 `depends_on / wave / affected_files / validation`。
4. `/sdd-do` 能执行一个 task。
5. implementer 前台串行写代码。
6. reviewer 独立审查并输出 artifact。
7. validator 做 goal-level validation。
8. 失败时 debugger 最多介入一次。
9. run 目录包含 `state.json / events.jsonl / artifacts/`。
10. background scout/reviewer/validator 输出不污染主会话上下文。
11. 生成 sync-back proposal，而不是自动改 `tasks.md`。
12. `/sdd-doctor` 能检查基础环境与配置。
13. 高风险操作不由 subagent 自主执行。
14. 不依赖 Spec Kit CLI runtime。
15. 不引入 tool registry / plugin loader 作为 Phase 1 前置条件。
16. background delegation 有 timeout、terminal event 和 artifact validation。
17. stale RUNNING delegation 能被 `/sdd-doctor` 或 resume 检出。
18. subagent 超时不会无限卡住 workflow，也不会被误判为 completed。
19. agent prompt 保持短 contract，不依赖巨型 prompt 承载流程状态。

最终判断：

```text
如果一个真实 Java 任务能通过本平台完成：规格确认、任务执行、独立 review、debug 一次、goal-level validation、artifact 沉淀、sync-back proposal，Phase 1 即可认为成功。
```
