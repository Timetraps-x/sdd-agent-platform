# 支持 subagent 的 SDD 工作流调研

## 1. 调研目标

本次调研关注“规格驱动开发（SDD）如何和 Claude Code subagent 结合”，重点判断哪些外部工作流值得引入、借鉴或本地化改写。

核心判断标准：

- 是否真正支持 subagent / fresh context，而不是只提供多角色提示词。
- 是否有清晰的规格产物链路：需求、设计、任务、实施、验证。
- 是否能适配当前仓库的工作方式：中文规格文档、`specs/<branch>/`、最小改动、Java/Spring/MyBatis、Maven 最小验证。
- 是否会引入过重流程或与现有 Spec Kit / memory / CLAUDE.md 规则冲突。

## 2. Claude Code subagent 能力基线

Claude Code 当前可支撑 SDD + subagent 的基础能力包括：

- 自定义 subagent 可通过文件配置，放在用户级或项目级 agents 目录。
- subagent 在独立上下文中运行，适合代码探索、规格审查、实现、独立 review、验证等角色。
- skills / slash command 可作为流程入口，把阶段性任务分派给 subagent。
- subagent 独立上下文有利于降低长会话污染，但也意味着必须通过文档、CLAUDE.md、任务说明传递关键上下文。
- 工具权限和写入权限需要额外控制；不要让执行型 subagent 自动做高风险操作。

对 SDD 的实际含义：

```text
规格文档负责稳定上下文
任务清单负责切边界
subagent 负责隔离执行 / 独立审查 / 验证
主会话负责综合判断和最终决策
```

## 3. GitHub Spec Kit

### 3.1 定位

GitHub Spec Kit 是标准 SDD 工具链，核心是：

```text
specify -> plan -> tasks -> implement
```

它强在规格、计划、任务拆解、constitution、模板和 AI agent 集成。当前项目已经安装并使用 `specify-cli`，且项目规则也明确规格产物默认放在当前分支对应的 `specs/<current-branch>/` 下。

### 3.2 与 subagent 的关系

Spec Kit 本身更像规格产物生成器，不是完整的 subagent 编排器。它产出的 `spec.md`、`plan.md`、`tasks.md` 非常适合作为 subagent 的输入，但具体的执行、review、验证仍需要 Claude Code skill 或本地流程来调度。

推荐映射：

```text
Spec Kit 产物
  -> spec-reviewer subagent 审核规格完整性
  -> planner subagent 审核任务边界
  -> implementer subagent 逐任务实现
  -> reviewer subagent 独立复核 diff
  -> validator subagent 跑最小验证
```

### 3.3 适配当前仓库的评价

优点：

- 与当前 `specs/<branch>/` 习惯最接近。
- 可保持中文文档和项目定制。
- 不强制引入另一套庞大流程。
- 适合当前 Java 旧系统的“小范围方案文档 + 实施 + Maven 编译验证”。

不足：

- subagent 实施层需要自己补。
- 对长任务中断恢复、独立 review、失败 debug 没有 cc-sdd / GSD 那样的完整内置模型。

结论：**适合作为本仓库 SDD 主底座，但需要本地补一个 subagent execution layer。**

## 4. cc-sdd

### 4.1 定位

`gotalab/cc-sdd` 是更贴近“SDD + subagent 实施”的候选。它提供 Kiro-inspired workflow，核心流程是：

```text
/kiro-discovery
  -> /kiro-spec-init
  -> /kiro-spec-requirements
  -> /kiro-spec-design
  -> /kiro-spec-tasks
  -> /kiro-impl
```

它支持 Agent Skills，Claude Code 和 Codex 稳定，其他平台为 beta。

### 4.2 subagent 实施模型

`/kiro-impl` 是 cc-sdd 的关键价值点：

- 每个 task 使用 fresh implementer context。
- task 后有 independent reviewer。
- 被阻塞或 review 多次失败时进入 debugger。
- reviewer approval 后才算完成。
- 每轮一个 task，适合中断后恢复。
- 经验写回 `tasks.md` 的 Implementation Notes，后续 task 可继承。
- 最终通过 `/kiro-validate-impl` 做整体完成验证。

简化为：

```text
tasks.md
  -> implementer subagent
  -> reviewer subagent
  -> debugger subagent（必要时）
  -> implementation notes
  -> next task
  -> final validation
```

### 4.3 适配当前仓库的评价

优点：

- 真正支持 subagent 长跑实施。
- 任务级独立 review / debug 闭环清晰。
- boundary-first、dependency annotations 对防止 agent 改穿层有帮助。

风险：

- 默认 Kiro 文档体系可能和当前 `specs/<branch>/` 并行。
- TDD、feature flag、长跑自动实施偏重，不一定适合所有 Java 旧系统修改。
- 全量引入可能比当前项目需要更重。

结论：**值得重点借鉴 `/kiro-impl` 的 subagent 模式，但不建议直接全量接管当前项目。**

## 5. BMAD Method

### 5.1 定位

BMAD 是多角色软件交付方法论，阶段大致是：

```text
Analysis -> Planning -> Solutioning -> Implementation
```

它有 analyst、PM、architect、dev、QA 等角色，适合产品型需求、PRD、架构、story、sprint 流程。

### 5.2 与 subagent 的关系

BMAD 的角色体系可以映射到 subagent，但它更像“角色与阶段工作流”，不一定天然等同于 Claude Code subagent 编排器。

### 5.3 适配当前仓库的评价

优点：

- 多角色分工成熟。
- 适合较大的产品型需求或从 0 到 1 的系统建设。

风险：

- 对当前 ERP / Java 旧系统修复来说偏重。
- 容易把一次状态流修复拉成 PRD / story / architecture 全流程。
- 可能诱导过度角色化输出。

结论：**可借鉴角色思想，不建议作为当前仓库主 SDD 流程。**

## 6. GSD / Get Shit Done

### 6.1 定位

`gsd-build/get-shit-done` 是一个更激进的 meta-prompting、context engineering、spec-driven development 系统，目标是解决长会话中的 context rot。

安装入口：

```bash
npx get-shit-done-cc@latest
```

它支持 Claude Code、Codex、Gemini CLI、Copilot、Cursor、Windsurf、Cline 等多个 AI coding runtime。

### 6.2 核心流程

GSD 的主流程更像 milestone / phase 驱动：

```text
/gsd-new-project
  -> /gsd-map-codebase（已有项目推荐）
  -> /gsd-discuss-phase N
  -> /gsd-plan-phase N
  -> /gsd-execute-phase N
  -> /gsd-verify-work N
  -> /gsd-ship / /gsd-next / /gsd-complete-milestone
```

它也提供较轻的 `/gsd-quick` 用于小任务。

### 6.3 subagent 与执行模型

GSD 是本次调研中 subagent 体系最重的候选之一。其公开资料显示：

- 默认包含大量 workflow 文件和 agent 定义。
- agents 目录包含 `gsd-executor`、`gsd-verifier`、`gsd-planner`、`gsd-debugger`、`gsd-code-reviewer`、`gsd-security-auditor`、`gsd-codebase-mapper` 等角色。
- 执行阶段采用 thin orchestrator：orchestrator 协调，不亲自执行。
- `/gsd-execute-phase` 使用 dependency waves。
- wave 内可并行执行，但要通过安全检查。
- 并行工作可使用 per-plan worktree，后续合并、审计、跑 post-merge gates。
- 每个 plan 可有 atomic commit 和 `SUMMARY.md`。
- 最终验证不是只看 task 完成，而是看 phase goal 和 requirement 是否真实满足。
- gaps 会触发 gap-closure planning loop。

简化模型：

```text
milestone / phase
  -> plan index
  -> dependency waves
  -> per-plan executor agents
  -> per-plan worktree / summary / commit
  -> merge audit
  -> post-merge build/test gates
  -> verifier goal-level validation
  -> gaps planning loop
```

### 6.4 优点

- subagent 编排最完整，角色覆盖研究、计划、执行、验证、调试、安全、UI、文档等。
- 对长任务、并行任务、多 worktree、阶段验证有完整设计。
- 重视 context rot，通过 fresh context、状态文件、summary、verification artifact 传递上下文。
- 比 cc-sdd 更偏“工程项目管理 + 多代理流水线”。

### 6.5 风险

- 流程很重，远超当前仓库日常 Java 业务修复所需。
- 推荐 `claude --dangerously-skip-permissions` 以降低自动化摩擦，这不适合默认在当前项目采用。
- 大量 agents / workflows 会污染本地技能体系，且和当前 Spec Kit、memory、中文 specs 规则并行。
- per-plan worktree / atomic commit / auto-merge 等能力如果未经约束，容易扩大操作风险。
- 当前仓库强调最小改动、避免无谓抽象、不要自动切分支；GSD 默认更偏大型自动化交付。

### 6.6 适配当前仓库的评价

GSD 值得借鉴的是执行阶段的“波次 + 独立验证 + gap closure”模型，而不是整套安装接管。

推荐借鉴点：

- orchestrator coordinates, not executes。
- 任务按依赖 wave 分组。
- 任务级执行输出 `SUMMARY.md` 或 implementation notes。
- 独立 verifier 做 goal-level validation。
- gaps 重新进入 planning，不硬说完成。
- 并行前做 files overlap / boundary 检查。

不建议直接采用：

- 默认全量 agent/workflow 安装。
- skip permissions 自动化。
- 自动 commit / merge / worktree 清理。
- 大规模 milestone 管理作为日常小修主流程。

结论：**GSD 是强参考样本，但当前仓库不宜全量引入；适合作为未来 `/sdd-do` 的高级形态参考。**

## 7. Oh My OpenAgent / Oh My OpenCode

### 7.1 定位

`code-yeongyu/oh-my-openagent`，原名 Oh My OpenCode，是一个通用 agent harness，而不是 SDD 专用框架。它的重点不是规格文档链路，而是多模型、多 agent、工具增强和自动化执行。

它的公开定位包括：

- multi-model orchestration；
- coding agent harness；
- Claude Code compatibility；
- 背景 agents 并行；
- LSP、AST-Grep、Hashline、tmux、MCP 等工具增强；
- `ultrawork` / `ulw` 一键长跑执行。

安装/使用入口在不同资料里有两个口径：README 偏向 `oh-my-opencode`，官网提到 `bunx oh-my-openagent install`。当前处于从 oh-my-opencode 到 oh-my-openagent 的命名迁移期，实际引入前需要确认当前发布包名和安装路径。

### 7.2 agent 与编排模型

它的核心角色不是 SDD 的 spec/planning/task 文档链，而是“开发团队式 agent 编排”：

- **Sisyphus**：主 orchestrator，解析意图、规划、委派、推动任务完成。
- **Prometheus**：战略规划/访谈式澄清，先问清楚再执行。
- **Atlas / Hephaestus**：执行型 agent，处理长任务或深度实现。
- **Oracle**：架构、调试、复杂逻辑。
- **Librarian / Explore**：文档、代码搜索、只读探索。
- **Multimodal Looker**：图片/PDF 等多模态输入。

它的编排特点：

```text
Intent Gate
  -> Sisyphus orchestrator
  -> Prometheus / Metis / Momus 规划与审查
  -> Atlas / Hephaestus 执行
  -> Oracle / Librarian / Explore 等专家并行
  -> review-work / verification / browser / LSP / AST 工具校验
```

它更像“增强版 OpenCode / Claude Code harness”，而不是类似 Spec Kit、cc-sdd 那样的 SDD 产物流水线。

### 7.3 强项

- 多模型路由：agent 说任务类别，harness 选择模型。
- 背景 agents 并行能力强。
- 工具链很重：LSP、AST-Grep、tmux、MCP、Hashline。
- 对 Claude Code 的 hooks、commands、skills、agents、MCP、settings 有兼容层。
- Hashline 编辑理念和当前机器已有的 `hashline-edit` 偏好高度一致。
- `Prometheus` 的访谈式规划和当前 `/brainstorming`、`/grill-me` 有可借鉴点。
- `review-work` 的多路 review 思路可借鉴到本地 `/sdd-do`。

### 7.4 风险

- 不是 SDD 专用工具，缺少稳定的 `spec -> plan -> tasks -> implement -> validate` 文档契约。
- 更像运行时 harness，接管面比 skill/workflow 更大。
- 强烈依赖 OpenCode 生态和多模型配置，未必适合当前 Claude Code 主工作流。
- README 风格激进，包含大量营销性表达，工程落地前需要实际 dry-run。
- 许可证显示为非标准 `Other / SUL-1.0`，不能像 MIT 项目一样直接复制整套实现。
- 默认启用 anonymous telemetry，需要引入前确认是否关闭。
- 自动长跑、todo enforcer、session recovery、model fallback 等能力强，但也容易扩大不可控行为。

### 7.5 适配当前仓库的评价

Oh My OpenAgent 对当前仓库最有价值的不是 SDD 流程，而是 harness 层能力参考：

- Hashline / 稳定锚点编辑；
- LSP diagnostics；
- AST-aware rewrite；
- 背景只读探索 agents；
- 多路 review；
- 规划前 Intent Gate；
- 长任务恢复和 session recovery。

不建议当前引入它作为主工作流，也不建议全量安装到项目里接管 Claude Code / OpenCode 配置。

结论：**Oh My OpenAgent 是强 harness 参考，不是当前 SDD 主候选；可借工具和编排思想，不宜直接接入当前仓库。**

## 8. 横向对比

| 方案 | 强项 | subagent 支持 | 流程重量 | 当前仓库适配度 | 建议 |
|---|---|---:|---:|---:|---|
| GitHub Spec Kit | 规格、计划、任务产物 | 间接，需要本地补 | 中 | 高 | 作为主底座 |
| cc-sdd | task 级 implement/review/debug | 强 | 中高 | 中高 | 借 `/kiro-impl` 模式 |
| BMAD | 多角色产品交付方法论 | 中，偏角色映射 | 高 | 中低 | 借角色思想 |
| GSD | 长任务、多 agent、wave、验证闭环 | 很强 | 很高 | 中 | 借执行/验证模型，不全量接管 |
| Oh My OpenAgent | 多模型 harness、工具增强、并行 agents | 很强，但偏 harness | 很高 | 中低 | 借 harness 能力，不全量接管 |
| 自建轻量 SDD | 完全贴合本项目 | 可控 | 可控 | 最高 | 长期推荐 |

## 9. 推荐路线

### 9.1 短期

继续以当前 Spec Kit / `specs/<branch>/` 为主，不全量安装 cc-sdd / GSD / BMAD / Oh My OpenAgent 到当前项目。

可以先在临时目录 dry-run：

```bash
npx cc-sdd@latest --dry-run --claude-skills --lang zh
npx get-shit-done-cc@latest --help
bunx oh-my-openagent install --help
```

只看产物和 workflow，不让它直接接管当前仓库。

### 9.2 中期

基于当前习惯做一个轻量 `/sdd-do`：

```text
/specs/<branch>/方案.md
/specs/<branch>/tasks.md
```

执行模型：

```text
主会话 orchestrator
  -> implementer subagent 逐任务实现
  -> reviewer subagent 独立 review
  -> validator subagent 跑最小验证
  -> 必要时 debugger subagent
  -> implementation notes 写回 specs
```

约束：

- 默认不自动 commit。
- 默认不自动 push / PR。
- 默认不自动创建 worktree，除非用户要求。
- 默认不使用 skip permissions。
- 保持中文文档。
- Java 修改后跑最小 Maven 验证。
- 任务必须标注 boundary / affected files / validation。

### 9.3 长期

如果后续任务规模变大，再逐步吸收 GSD 和 Oh My OpenAgent 的高级能力：

- dependency wave；
- files overlap gate；
- per-task summary；
- goal-level verifier；
- gap closure plan；
- 可选 per-task worktree；
- Intent Gate；
- Hashline / LSP / AST-Grep 类工具增强；
- 多路 review agents。

## 10. 初步结论

当前最优路径不是引入一个完整外部框架，而是：

```text
Spec Kit 继续做规格底座
cc-sdd 提供 task 级 subagent 实施参考
GSD 提供 wave / verifier / gap closure 高级参考
Oh My OpenAgent 提供 harness / 工具 / 多模型编排参考
BMAD 只借多角色思路
最终沉淀成本地轻量 SDD + subagent 工作流
```

一句话：**当前项目应走“Spec Kit + 本地 `/sdd-do`”路线，而不是让 cc-sdd、GSD、BMAD 或 Oh My OpenAgent 全量接管。**

## 11. 参考来源

- GitHub Spec Kit: https://github.com/github/spec-kit
- GitHub Spec Kit README: https://github.com/github/spec-kit/blob/main/README.md
- Claude Code Subagents: https://code.claude.com/docs/en/sub-agents
- Claude Code Subagents SDK: https://code.claude.com/docs/en/agent-sdk/subagents
- Anthropic Subagents Docs: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Claude Blog: https://claude.com/blog/how-and-when-to-use-subagents-in-claude-code
- cc-sdd: https://github.com/gotalab/cc-sdd
- cc-sdd Skill Reference: https://github.com/gotalab/cc-sdd/blob/main/docs/guides/skill-reference.md
- BMAD Agents: https://docs.bmad-method.org/reference/agents/
- BMAD Workflow Map: https://docs.bmad-method.org/reference/workflow-map/
- GSD: https://github.com/gsd-build/get-shit-done
- GSD Official Site: https://gsd.build/
- GSD Docs: https://getshitdone.help/
- GSD execute-phase: https://github.com/gsd-build/get-shit-done/blob/main/get-shit-done/workflows/execute-phase.md
- GSD agents docs: https://github.com/gsd-build/get-shit-done/blob/main/docs/AGENTS.md
- Oh My OpenAgent: https://github.com/code-yeongyu/oh-my-openagent
- Oh My OpenAgent Official Site: https://ohmyopenagent.com/
- Oh My OpenAgent Overview: https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/overview.md
- Oh My OpenAgent Features: https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/features.md
