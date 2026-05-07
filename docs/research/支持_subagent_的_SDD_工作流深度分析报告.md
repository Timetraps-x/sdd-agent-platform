# 支持 subagent 的 SDD 工作流深度分析报告

## 1. 本轮深度调研目标

上一版调研已经形成初步判断：当前仓库不宜让外部框架全量接管，更适合走“Spec Kit + 本地轻量 `/sdd-do`”路线。本轮深度调研进一步验证这个判断，重点不只看 README，而是向下看源码结构、workflow/agent 实现、安装脚本、状态文件、issue 风险信号。

本轮重点回答四个问题：

1. 这些项目是否真的支持 Claude Code subagent / fresh context，而不是只包装角色提示词？
2. 它们的 SDD 产物链路是否稳定，能否承接本仓库的中文 `specs/<branch>/` 文档习惯？
3. 它们的执行模型是否适合 Java/Spring/MyBatis 旧系统里的最小改动、最小 Maven 验证？
4. 哪些机制值得借鉴，哪些机制会带来流程污染、权限风险、自动化失控或维护成本？

结论先行：**前一版判断成立，但优先级更明确：Spec Kit 继续做规格底座；cc-sdd 的 `/kiro-impl` 是最值得直接本地化的 task 级实现闭环；GSD 的 wave / overlap / verifier 适合作为高级形态参考；BMAD 可借 step-file 与定制分层；Oh My OpenAgent 主要借 harness 思想，不宜直接接入。**

## 2. 横向结论更新

| 方案 | 深挖后定位 | 真实 subagent/执行能力 | 当前仓库可借鉴优先级 | 不建议直接采用的原因 |
|---|---|---:|---:|---|
| GitHub Spec Kit | 规格产物与 workflow engine 底座 | 间接，Claude 侧主要是 skills/commands，subagent 尚待补 | 最高 | subagent execution layer 不完整，部分 workflow/agent 集成仍有硬编码和 issue |
| cc-sdd | Kiro 风格 SDD + task 级 implement/review/debug | 强，尤其 `/kiro-impl` | 最高 | 全量文档体系偏重，parallel 仍不成熟，需本地约束 |
| BMAD Method | 角色化交付方法 + step-based skills | 中，更多是 workflow/role，不是执行编排器 | 中 | PRD/story/sprint 状态体系过重，已有 issue 暴露自动执行偏差 |
| GSD | 大型 milestone/phase 多代理执行系统 | 很强，wave/worktree/verifier 完整 | 中高（高级机制） | 自动 commit/worktree/merge/cleanup 风险大，流程重量明显超出日常修复 |
| Oh My OpenAgent | OpenCode/Claude Code 兼容的 agent harness | 很强，但偏运行时 harness | 中（工具和编排思想） | 非 SDD 专用，OpenCode/Bun 耦合、许可证/遥测/Windows issue 风险明显 |

推荐路线更新为：

```text
短期：Spec Kit 文档底座 + cc-sdd 式 task implement/review/debug
中期：补本地 /sdd-do，主会话编排，subagent 做 bounded work
长期：按需吸收 GSD 的 wave/overlap/verifier/gap closure
不采用：外部框架全量安装接管、skip permissions、默认自动 commit/push/merge
```

## 3. GitHub Spec Kit 深度分析

### 3.1 源码与产物结构

Spec Kit 的核心不是 subagent 编排器，而是规格产物、模板、workflow engine 与多 AI runtime 适配层。深挖重点路径包括：

```text
src/specify_cli/__init__.py
src/specify_cli/integrations/
src/specify_cli/integrations/claude/__init__.py
src/specify_cli/integrations/base.py
src/specify_cli/integrations/manifest.py
src/specify_cli/agents.py
src/specify_cli/workflows/engine.py
src/specify_cli/workflows/steps/*
workflows/speckit/workflow.yml
templates/commands/*.md
templates/*-template.md
presets/
extensions/
.specify/templates/overrides/
catalog*.json
```

从源码看，Spec Kit 已经不是单纯模板仓库，它有 workflow engine 和 integration 抽象。标准链路可以表达为：

```text
specify -> gate -> plan -> gate -> tasks -> implement
```

workflow run 状态会落在类似：

```text
.specify/workflows/runs/<run_id>/
```

这说明它具备“流程状态”概念，适合做 SDD 的规格与任务骨架。

### 3.2 Claude Code 集成方式

Claude integration 主要走 skills 方式，把命令安装成：

```text
.claude/skills/speckit-<name>/SKILL.md
```

CLI 层会把阶段性命令派发给 agent CLI，例如 Claude 侧可形成类似：

```text
claude -p "/speckit-specify ..."
```

因此，Spec Kit 对 Claude Code 的支持更像“把 SDD 阶段封装成 skill/command”，而不是“内建 task 级 subagent 执行器”。它产出的 `spec.md`、`plan.md`、`tasks.md` 很适合作为 subagent 输入，但 implement/review/debug/validate 的闭环需要本地补。

### 3.3 深挖后的风险信号

相关 issue 信号说明 Spec Kit 的 Claude/subagent 方向仍在演进：

- `#752` open：希望利用 Claude Code 的 subagent feature 执行命令。这说明官方也意识到当前命令执行与 subagent 结合还不完整。
- `#2406` open：workflow engine 存在 `copilot` 默认硬编码问题。对本仓库意味着必须显式选择 `claude` integration，不能假设默认正确。
- `#2398` open：agent context update 耦合/硬编码问题。
- `#1983` open：`specify init --ai claude` 不生成 `CLAUDE.md`。
- `#2278` open：`tasks-template` override 不生效。对本仓库定制模板有直接影响。
- `#2257` open：多 integration 安装体验有痛点。
- `#2100` closed：skills-only plugins 失去 slash command autocomplete。
- `#2246` closed：update-agent-context 容易膨胀 `CLAUDE.md`。

这些问题不推翻 Spec Kit 作为底座的价值，但说明不能把它当成“完整可托管执行系统”。

### 3.4 当前仓库应如何采用

适合保留：

- 继续让 `specs/<branch>/` 承接中文规格、方案、任务文档。
- 继续用 Spec Kit 的 `spec -> plan -> tasks` 思路稳定上下文。
- 项目定制优先放 `.specify/templates/overrides/` 与 `.specify/extensions.yml`，不要改 vendor 模板。

需要本地补：

- `tasks.md` 的 task 边界格式：affected files、boundary、validation、risk。
- task 级 implementer/reviewer/debugger/validator subagent 模型。
- Java 变更后的最小 Maven 验证规则。
- 主会话负责综合判断，不让 Spec Kit 自动决定完成态。

不建议：

- 直接依赖 Spec Kit 当前 implement 阶段完成代码写入与 review。
- 让 workflow engine 自动接管本仓库已有 memory、CLAUDE.md、中文 specs 规则。
- 在 issue 未稳定前重度依赖多 integration 或 template override 的边缘能力。

## 4. cc-sdd 深度分析

### 4.1 源码与模板结构

cc-sdd 是本轮最贴近“SDD + subagent 实施”的项目。深挖重点路径包括：

```text
tools/cc-sdd/package.json
tools/cc-sdd/src/agents/registry.ts
tools/cc-sdd/src/manifest/*
tools/cc-sdd/src/plan/*
tools/cc-sdd/templates/agents/claude-code-agent/commands/*.md
tools/cc-sdd/templates/agents/claude-code-agent/agents/*.md
tools/cc-sdd/templates/agents/claude-code-skills/skills/kiro-*/SKILL.md
docs/guides/claude-subagents.md
docs/guides/skill-reference.md
```

它同时支持 legacy agent/command 安装和 skills 模式：

```text
--claude-agent   -> .claude/agents/kiro/*.md + .claude/commands/kiro/*.md
--claude-skills  -> .claude/skills/kiro-*/SKILL.md
```

从当前 Claude Code 生态看，skills 模式更适合作为本地化参考，因为它更容易被显式调用、隔离维护，也不会强行污染项目级 agents/commands。

### 4.2 `/kiro-impl` 的真实价值

cc-sdd 的关键不在 requirements/design/tasks 文档，而在 `/kiro-impl` 的执行闭环。其模型可抽象为：

```text
tasks.md
  -> parent/controller skill 选择一个 task
  -> implementer fresh context 实现
  -> reviewer fresh context 独立审查
  -> debugger fresh context 处理失败或阻塞
  -> 更新 task 状态 / implementation notes
  -> 下一 task
  -> final validation
```

重要点是：parent/controller 不应亲自写所有代码，而是控制节奏、解析结构化输出、维护任务状态、决定是否进入 debugger 或 validation。

它使用的 prompt 模板类似：

```text
kiro-impl/templates/implementer-prompt.md
kiro-impl/templates/reviewer-prompt.md
kiro-impl/templates/debugger-prompt.md
```

这对当前仓库非常有价值，因为 ERP/Java 旧系统修复经常需要：

- 一个 agent 按任务边界最小修改；
- 一个 fresh reviewer 独立看 diff 是否改穿层；
- 必要时 debugger 定位编译或业务状态问题；
- 主会话最后决定是否真的完成。

### 4.3 并行与状态风险

cc-sdd 文档里存在 `(P)` parallel markers，但 issue 显示 skills 模式下并行执行并不成熟：

- `#112` open：`(P)` tasks parallel execution 未实现。
- `#162` open：progress update 有问题，`spec.json.phase` 不可靠。
- `#116` closed：用户对自定义 `Task(...)` 语法产生困惑。
- `#171` open：NLPM audit 指出 Claude Code tool names 错误、工具权限过宽。
- `#115` open：validate-gap 默认检查偏浅。
- `#4` closed：Claude Code 在 auto-accept edits disabled 下仍创建文件的行为曾引发困惑。

这些 issue 说明：cc-sdd 的 task 级模式值得借，但不能直接照搬自动化细节。

### 4.4 当前仓库应如何采用

最值得借：

- `/kiro-impl` 的 parent controller 模式。
- 每个 task 使用 fresh implementer context。
- 每个 task 后必须有 independent reviewer。
- review 多次失败或编译失败时进入 debugger。
- implementation notes 写回 task 文档，供后续 task 读取。
- `tasks.md` 作为真实进度来源，而不是依赖额外 `spec.json.phase`。

本地化时要改：

- 文档目录改成 `specs/<branch>/`。
- 中文任务文档保留。
- 默认不并行写代码。
- 默认不自动 commit。
- reviewer 重点检查“是否越界、是否符合最小改动、是否需要 Maven 最小验证”。
- validator 明确运行本仓库最小命令，例如：

```bash
mvn compile -Ptest -pl emp-upms/emp-upms-rpc-service -am
```

不建议直接采用：

- 全量 Kiro 文档体系替代现有 Spec Kit 产物。
- 把 `(P)` 并行标记作为默认执行能力。
- 自动 staging/commit 作为默认完成条件。
- 允许执行型 agent 自动做高风险操作。

## 5. BMAD Method 深度分析

### 5.1 源码与 workflow 结构

BMAD 更像方法论和角色工作流集合，而不是一个专门的 subagent runtime。深挖重点路径包括：

```text
.claude-plugin/marketplace.json
src/core-skills/
src/bmm-skills/
src/bmm-skills/1-analysis/
src/bmm-skills/2-plan-workflows/
src/bmm-skills/3-solutioning/
src/bmm-skills/4-implementation/
src/bmm-skills/module.yaml
src/core-skills/module.yaml
src/scripts/resolve_customization.py
tools/installer/
```

它的组织方式体现为：

```text
Analysis -> Planning -> Solutioning -> Implementation
```

并用 agent/role、skills、step 文件、customization 层组织交付。

### 5.2 值得借的工程纪律

BMAD 有两个对本仓库有用的点。

第一是 step-file 纪律：一次只读当前步骤，避免长上下文里把所有流程说明塞进主会话。这和 Claude Code subagent 的 fresh context 思路一致，也适合本地 `/sdd-do`：

```text
主流程只装载当前阶段规则
implementer 只读当前 task + 必要规格
reviewer 只读规格、task、diff
validator 只读验收与验证命令
```

第二是 customization 分层。BMAD 通过 TOML/模块等方式把核心流程和项目定制分开，这与本仓库“不要直接改 vendor 管理文件”的规则一致。

### 5.3 风险信号

BMAD 的 issue 暴露出角色化/自动化系统常见风险：

- `#1613` open：希望引入 Claude Code agent teams，说明 subagent 化仍在演进。
- `#2280` open：Party Mode 默认 subagent flow fabricated/deviated tests，暴露多 agent 自动化可能偏离事实。
- `#2208` open：quick-dev 未按规则添加 tests。
- `#2178` open：quick-dev 自动 commit/push。这与当前仓库默认不自动 commit/push 的原则冲突。
- `#2358` closed：dev-user-story 曾把 `sprint.yaml` 替换成 story 内容，说明状态文件边界风险真实存在。
- `#1930` open：correct-course 重写 completed stories。
- `#2199` open：deferred review items 未读回。
- `#1904` open：API contract gap 导致前后端不匹配。
- `#2338` open：per-user global config 在 git worktrees 下不共享。

### 5.4 当前仓库应如何采用

可借：

- 角色思想：analyst / planner / dev / QA 可映射为 spec-reviewer / implementer / reviewer / validator。
- step-file 当前步骤纪律。
- 核心流程与本地定制分层。
- 对大型产品型需求，可借 PRD/story 思路做需求澄清。

不建议：

- 把 ERP 状态流修复这种任务拉成完整 PRD/story/sprint 体系。
- 引入 Party Mode 或默认多 agent 自主开发。
- 自动 commit/push。
- 让 story/sprint 状态文件成为本仓库开发事实源。

BMAD 对当前仓库更像“流程包装参考”，不是 SDD 执行底座。

## 6. GSD / Get Shit Done 深度分析

### 6.1 源码与 workflow 结构

GSD 是本轮最完整、也最重的多代理执行系统之一。深挖重点路径包括：

```text
commands/gsd/*.md
get-shit-done/workflows/*.md
get-shit-done/workflows/execute-phase.md
get-shit-done/workflows/execute-plan.md
get-shit-done/workflows/plan-phase.md
get-shit-done/workflows/spec-phase.md
get-shit-done/workflows/verify-work.md
agents/*.md
get-shit-done/bin/gsd-tools.cjs
bin/gsd-sdk.js
hooks/*
bin/install.js
```

它的命令层较薄，真正逻辑在 workflow 与 SDK 工具里。执行阶段会加载 phase、config、plans、models、parallelization、worktree 配置。

### 6.2 执行模型

GSD 的执行模型可以概括为：

```text
phase / milestone
  -> plan index
  -> plan frontmatter: wave, depends_on, files_modified, autonomous
  -> waves sequentially
  -> same wave may parallelize
  -> files_modified overlap check
  -> per-plan executor subagent
  -> optional worktree isolation
  -> SUMMARY.md
  -> merge/audit
  -> post-merge build/test gates
  -> verifier goal-level validation
  -> gap closure loop
```

尤其值得注意的是，GSD 不只验证“任务是否打勾”，而是验证 phase goal / requirement 是否真实满足。这一点对本仓库很重要：ERP 状态修复不能只看代码改了，还要看状态契约是否闭环。

### 6.3 值得借的机制

GSD 最值得借的不是“大型自动化长跑”，而是这些局部机制：

1. **plan frontmatter**

   每个 task/plan 明确：

   ```text
   wave
   depends_on
   files_modified
   validation
   autonomous
   ```

   这可以直接变成本地 `tasks.md` 的字段。

2. **dependency waves**

   有依赖的 task 串行，无依赖 task 可归为同一 wave。当前仓库短期不建议并行写代码，但 wave 仍有助于理解顺序。

3. **files overlap gate**

   如果两个 task 都会改同一个 Java 文件，应自动降级为串行。这对本仓库尤其重要，因为很多 ERP 修复集中在 `ERPSyncSvr.java` 这类大文件。

4. **orchestrator coordinates, not executes**

   主会话负责调度和决策，执行交给 bounded subagent，但主会话必须保留最终判断权。

5. **goal-level verifier**

   validator 不只跑 compile，还要回看需求目标，例如：

   ```text
   主单未 ready 时不能进入 ERP_READY
   DeviceFactoryThrd 不能消费 ERP_SYNCING 主单
   qty 不能无条件标成功
   ```

6. **gap closure loop**

   如果验证发现缺口，不要硬说完成，而是生成 gap task 回到 planning。

### 6.4 风险信号

GSD 的 issue 也非常说明问题：它的能力强，但自动化面太大。

- `#2806` open：executor 在写 `SUMMARY.md` 和 commit 之间被截断。
- `#2839` closed：review-fix cleanup 非事务性，留下 orphan branch/worktree/stale STATE。
- `#2838` closed：`.planning/` 被 gitignore 导致 SUMMARY rescue 失败。
- `#2774` closed：worktree cleanup 在 Windows 上破坏 GSD workspace `.git`。
- `#2772` closed：`.gitmodules` 曾导致所有 worktrees 被禁用。
- `#2686` closed：background review-fix 在前台 session 活跃时修改 main tree。
- `#2864/#2775/#2829/#2861` closed：SDK PATH/local install 导致 workflow 失败。
- `#2796` closed：SDK argument parsing 损坏 `STATE.md`。

这些风险与当前仓库的工作方式冲突：本仓库强调最小改动、不要自动切分支、不要自动 commit/push、不要清理用户未确认的 worktree。

### 6.5 当前仓库应如何采用

适合借：

- task frontmatter / metadata。
- dependency wave。
- files overlap gate。
- per-task summary / implementation notes。
- independent verifier。
- gap closure planning。

不建议借：

- 默认 per-plan worktree。
- 自动 commit / merge / cleanup。
- `--dangerously-skip-permissions` 或跳过权限摩擦。
- 大型 milestone 管理作为日常小修主流程。
- 后台 agent 在主工作树上自主修改。

本地 `/sdd-do` 可以把 GSD 的强机制降级为“显式检查与保守执行”，而不是照搬它的自动化执行器。

## 7. Oh My OpenAgent / Oh My OpenCode 深度分析

### 7.1 源码与运行时结构

Oh My OpenAgent 不是 SDD 框架，而是 OpenCode/Claude Code 兼容的 agent harness。深挖重点路径包括：

```text
package.json
src/index.ts
src/plugin-interface.ts
src/plugin/*
src/config/schema.ts
src/config/schema/claude-code.ts
docs/reference/configuration.md
src/agents/*
docs/guide/orchestration.md
src/plugin/tool-registry.ts
src/tools/delegate-task/*
src/tools/call-omo-agent/*
src/tools/background-task/*
src/tools/task/*
src/features/claude-code-agent-loader/*
src/features/claude-code-command-loader/*
src/features/claude-code-mcp-loader/*
src/features/claude-code-plugin-loader/*
src/hooks/claude-code-hooks/*
src/features/builtin-skills/*
src/features/opencode-skill-loader/*
src/hooks/index.ts
docs/guide/installation.md
src/cli/install.ts
src/cli/doctor/*
LICENSE.md
docs/legal/privacy-policy.md
```

包名处于迁移状态：发布和 README 仍大量使用 `oh-my-opencode`，同时出现 `oh-my-openagent` alias。这本身就是接入风险。

### 7.2 编排模型

它的核心不是 `spec -> plan -> tasks -> implement`，而是 plan-first agent team：

```text
Prometheus 生成 .sisyphus/plans/*.md
  -> Metis 做 gap analysis
  -> Momus 做 plan review
  -> /start-work 激活 Atlas
  -> Atlas 委派给 Sisyphus-Junior / workers
  -> background task manager 跟踪任务
```

任务委派 primitive 接近：

```text
task(run_in_background, load_skills, category/subagent_type, permissions, model routing)
```

它有比较完整的运行时能力：

- category/subagent routing；
- skill 注入；
- 模型选择与 fallback chain；
- sync/background execution；
- queue/concurrency；
- stale timeout；
- notifications；
- task history；
- tmux panes；
- permissions: `ask|allow|deny`。

这些是 harness 层能力，不是 SDD 文档契约。

### 7.3 值得借的机制

可借思想：

- planner / reviewer / executor 分离。
- plan review loop：先由 reviewer 找 gap，再进入执行。
- category + skill routing：不同 task 自动加载不同上下文。
- bounded permissions：按 agent/task 限制工具权限。
- child-session metadata：子任务输出结构化摘要。
- stale-task detection：长任务卡住时显式暴露，而不是静默等待。
- Hashline/LSP/AST-Grep 类稳定编辑与诊断工具思路。

其中，Hashline 稳定锚点编辑和当前机器已有 `hashline-edit` 偏好高度一致，值得保留为本地工作方式，而不是引入整套 OpenAgent。

### 7.4 风险信号

issue 信号显示该项目作为主工作流接入风险偏高：

- `#3704`：`oh-my-openagent` / `oh-my-opencode` package-name plugin resolution 失败。
- `#3699`：config path 混乱。
- `#3721`：OpenCode Desktop Windows 加载失败，涉及 `bun:` protocol。
- `#3638`：plugin loader 在 array syntax 下崩溃。
- `#3582`：skill tool 忽略 `claude_code.plugins/plugins_override`。
- `#3544` closed：agent skills override 被忽略。
- `#3624`：同时传 category 和 subagent_type 导致错误执行。
- `#3592`：MCP servers 多时 task tool 被 OpenCode deferred，破坏 delegation。
- `#3593`：运行中的 work 看起来 idle。
- `#3588`：sync tasks 不实时 stream progress。
- `#3505`：tmux pane 自动关闭。
- `#3655`：context-window monitor 把系统指令注入 tool output，有 prompt-injection-like 风险。
- `#3532`：Copilot retry loop 导致账号暂停风险。
- `#3607`：Windows shell detection bug。

另有两个非功能风险：

- 许可证为非标准 `Sustainable Use License 1.0`，不能当 MIT 项目直接复制整套实现。
- 默认 anonymous telemetry 需要接入前确认关闭方式。

### 7.5 当前仓库应如何采用

适合借：

- harness 思想：任务路由、权限边界、后台任务状态、stale detection。
- Hashline / LSP / AST-aware 工具增强理念。
- plan-review-work 的多路 review 思路。
- Intent Gate：执行前先判断是探索、计划、实现、验证还是 review。

不建议：

- 安装后让它接管 Claude Code / OpenCode 配置。
- 把 `.sisyphus/plans` 作为本仓库规格事实源。
- 在当前 Java ERP 仓库引入 OpenCode/Bun 运行时耦合。
- 复制受 SUL-1.0 约束的实现代码。
- 开启默认匿名遥测或长跑自动化。

## 8. 对本仓库 `/sdd-do` 的具体设计建议

### 8.1 本地原则

本仓库的 `/sdd-do` 不应做成新的重型项目管理系统，而应是当前 Spec Kit 习惯上的一层执行闭环：

```text
specs/<branch>/方案.md
specs/<branch>/tasks.md
  -> 主会话 orchestrator
  -> implementer subagent
  -> reviewer subagent
  -> debugger subagent（必要时）
  -> validator subagent / 主会话最小验证
  -> implementation notes / gap tasks
```

硬约束：

- 默认不自动 commit。
- 默认不 push / PR。
- 默认不创建 worktree，除非用户明确要求。
- 默认不跳过权限，不使用 skip permissions。
- 默认不并行写代码。
- Java 修改后跑最小 Maven 编译或用户明确豁免。
- 主会话保留最终完成判断。

### 8.2 `tasks.md` 建议格式

每个 task 建议包含：

```markdown
### Task N: <任务标题>

- wave: 1
- depends_on: []
- boundary: 只允许修改哪些逻辑，不允许碰哪些范围
- affected_files:
  - emp-upms/...
- validation:
  - mvn compile -Ptest -pl emp-upms/emp-upms-rpc-service -am
- risk:
  - 状态流转、历史数据、并发、SQL 等
- status: pending
- implementation_notes:
  - <执行后补充>
```

这同时借了 cc-sdd 的 task notes 和 GSD 的 frontmatter/wave/files_modified 思路，但保持普通 Markdown，避免引入新状态系统。

### 8.3 subagent 角色定义

建议最少四类：

1. **sdd-implementer**

   输入：当前 task、相关 spec、affected files。

   职责：只做当前 task 的最小代码修改，不扩展范围，不自动 commit。

2. **sdd-reviewer**

   输入：spec、task、diff。

   职责：检查是否满足 task、是否越界、是否破坏分层、是否引入安全/状态问题、是否需要验证。

3. **sdd-debugger**

   输入：失败命令、错误日志、相关 diff。

   职责：只修当前失败，不顺手重构。

4. **sdd-validator**

   输入：spec 验收、validation 命令、diff。

   职责：运行或建议最小验证，并做 goal-level validation。

### 8.4 执行循环

建议执行循环：

```text
1. 主会话读取 spec/tasks，选择最低未完成 task。
2. 检查 affected_files 是否与其他 in-progress task 重叠。
3. 派 implementer 执行当前 task。
4. 主会话检查实际 diff。
5. 派 reviewer 独立 review。
6. 如 review 失败或 compile 失败，派 debugger。
7. 验证通过后，主会话更新 task status / implementation notes。
8. 如果发现 gap，新增 gap task，不硬标完成。
```

### 8.5 初始版本不要做的事

第一版 `/sdd-do` 不建议包含：

- dependency wave 并行执行。
- per-task worktree。
- 自动 commit。
- 自动 merge。
- 自动清理分支/worktree。
- 大型 milestone/phase 状态系统。
- 外部项目的完整 agent/team 安装。
- 非必要的 UI、dashboard、summary 文件泛滥。

## 9. 最终推荐

深挖源码和 issues 后，推荐比上一版更收敛：

```text
1. Spec Kit 留作规格底座。
2. 本地 /sdd-do 参考 cc-sdd 的 implementer/reviewer/debugger 循环。
3. tasks.md 参考 GSD 加 boundary / affected_files / wave / validation。
4. reviewer/validator 做 goal-level validation，不只看 task checkbox。
5. BMAD 只借 step-file 和 customization 分层。
6. Oh My OpenAgent 只借 harness 思路和工具增强，不直接接入。
```

一句话结论：**当前项目最该补的是“本地受控的 subagent execution layer”，不是引入一个外部全家桶。第一版 `/sdd-do` 应该小而硬：读中文 specs、逐 task fresh context 实现、独立 review、必要 debug、最小 Maven 验证、主会话最终裁决。**

## 10. 参考来源

- GitHub Spec Kit: https://github.com/github/spec-kit
- GitHub Spec Kit README: https://github.com/github/spec-kit/blob/main/README.md
- Spec Kit workflow / templates / integrations / issues
- cc-sdd: https://github.com/gotalab/cc-sdd
- cc-sdd docs / templates / Claude skills / issues
- BMAD Method docs and repository workflow/skills/issues
- GSD / Get Shit Done: https://github.com/gsd-build/get-shit-done
- GSD workflows / agents / SDK / hooks / issues
- Oh My OpenAgent: https://github.com/code-yeongyu/oh-my-openagent
- Oh My OpenAgent source / docs / plugin tools / issues / license
