# 真实项目 SDD 试跑评测与技改方案（2026-05-07）

## 1. 评测对象

本报告评测 `user_test/` 中一次真实业务仓库试跑结果。

输入与产物：

- 原始需求：`user_test/source_ERP入库同步状态流转修复方案.md`
- 生成规格：`user_test/generated_spec.md`
- 生成计划：`user_test/generated_plan.md`
- 生成任务：`user_test/generated_tasks.md`
- 会话归档：`user_test/session_2026-05-07_sdd_erp_scrk.md`

本次真实需求是 ERP 入库同步状态流转修复，涉及三条线程、主单/qty/wl 三层状态、生产入库导入、设备/SIM 存在态、最小 Maven 验证。它不是简单文案任务，而是一个很适合检验 SDD 平台价值的状态契约修复场景。

## 2. 总体评分

| 维度 | 分数 | 评价 |
|---|---:|---|
| 需求理解 | 7/10 | 原始方案关键信息基本被转写进 spec，但没有进一步审问状态模型、并发语义和验收证据。 |
| SDD 阶段产物完整度 | 6/10 | spec/plan/tasks 结构完整、可解析，但大多是原文规整化，缺少平台增值。 |
| 输出简洁性 | 4/10 | 会话输出和文档都偏啰嗦，重复说明“已更新/下一步/边界”，信息密度不足。 |
| 任务可执行性 | 6/10 | task 有 boundary、acceptance、affected_files、validation，但过度压成一个大 task，未体现可审查切片。 |
| 技术洞察质量 | 5/10 | 能定位核心文件和方法，但没有形成独立的状态机/数据契约审查，也没有验证代码实际实现细节。 |
| 生命周期决策准确性 | 3/10 | 真实需求命中 state-flow/concurrency hard gate，却被判为 `compact`，与模型文档不一致。 |
| 分支/项目上下文适配 | 2/10 | 大量路径默认 `master`，没有正确解析当前 git 分支或已有 semantic branch。 |
| agent / skill / runtime 体现 | 2/10 | 只运行 CLI 和手工写文档，用户看不到 scout、planner、reviewer、validator 等角色参与。 |
| 与竞品差异化 | 3/10 | 输出像轻量 Spec Kit 转写；没有体现 cc-sdd/GSD 风格的 fresh context、独立 review、gap closure。 |
| 证据链与可恢复性 | 4/10 | 只生成 semantic docs，没有 run、agent artifact、review artifact、decision record 的真实闭环。 |

综合评分：**4.2 / 10**。

结论：本次试跑证明平台已有“文档模板和 CLI 骨架”，但还没有形成“有竞争力的 SDD agent workflow”。用户感受到的主要问题不是偶发 bug，而是产品核心路径仍停留在 **prompt wrapper + 文档转写**。

## 3. 主要问题诊断

### 3.1 Git 分支 / semantic branch 解析缺陷

现象：真实试跑全部写入和读取 `specs/master/...`，状态输出也显示 `branch: master`。

根因：当前 CLI 和 core 在未传 `--branch` 时硬编码使用 `master`，没有解析当前 git 分支。

关键位置：

- `packages/cli/src/main.ts`
  - `sdd init` 默认 `readOption(..., '--branch') ?? 'master'`
  - `sdd status` 默认 `readOption(..., '--branch') ?? 'master'`
  - `tasks`、`do`、`verify`、`sync-back`、`graph`、`wave`、`background`、`artifact template` 等路径均有类似默认。
- `packages/core/src/index.ts`
  - `initProject(...)` 默认 branch 为 `master`
  - `getProjectStatus(...)` 默认 branch 为 `master`
  - `parseSddBranch(projectRoot, branch = 'master')`
  - `runSingleTaskLoop(...)`、`runGoalVerify(...)`、`inspectTaskGraph(...)`、`inspectWavePlan(...)` 等也默认 `master`。

这不是“git 命令失败”，而是**没有实现 branch resolver**。

影响：

- 在真实业务分支上使用时，SDD 语义文档不跟随当前工作分支。
- 用户会误以为平台感知不到仓库状态。
- 后续 task、run、sync-back 都可能写错 semantic branch。

### 3.2 生命周期决策和 hard gate 不一致

原始需求明显涉及：

- 三线程状态契约。
- 主单/qty/wl 多对象状态流转。
- 并发与幂等语义。
- 生产入库和销售出库之间的失败追溯。
- SQL 拼接移除。

按 `docs/architecture/lifecycle-decision-model.md`，`state_machine/concurrency/liveness` 命中 hard gate 时最低应为 `full`。模型文档写明：

```text
状态机、并发、恢复、liveness -> full
```

但真实会话中 `sdd lifecycle decide` 输出：

```text
profile=compact
confidence=medium
required_stages=intent-or-mini-spec -> task-boundary -> implement -> validation
```

根因：

- CLI 的 `sdd lifecycle decide` 不会从用户需求或文档中自动提取 risk tags。
- 若用户/AI 没传 `--risk state-machine --risk concurrency`，core 只按默认 medium/small/local 信号判断，容易降级为 compact。
- generated command 没有强制在状态流、并发、数据库、API 等关键词出现时补充 risk signals。

影响：

- 平台宣称有 lifecycle hard gate，但真实体验中 hard gate 需要人工显式传参。
- 用户看不到 SDD 相比普通“整理方案文档”的安全优势。
- 高风险任务可能被压成轻量单任务，降低验证和 review 深度。

### 3.3 输出像“规整转写”，不是 SDD 增值

`generated_spec.md` 基本覆盖了原始方案，但主要是把原文改写成：

- Problem / Intent
- Scope
- Requirements
- Acceptance Criteria
- Risks

这有价值，但平台增值不足。

缺失的高价值分析包括：

1. 没有把三层对象状态建模成明确状态表：
   - `upms_erp_scrk.sync_status`
   - `upms_erp_scrk_qty.sync_status`
   - `upms_erp_scrk_wl.status`
2. 没有画出允许/禁止状态迁移。
3. 没有把“谁驱动谁”说清楚：
   - ERP 拉取驱动主单 ready？
   - 字典线程驱动 qty ready？
   - 导入线程驱动 qty sync ready？
   - wl 明细结果如何汇总为 qty 结果？
4. 没有明确 failure reason 写在哪里、谁消费、是否幂等。
5. 没有把验收条件转成测试/检查矩阵。
6. 没有识别“原始方案本身已经很完整”，因此应走“审查和约束强化”而不是大段重写。

### 3.4 plan 质量偏浅

`generated_plan.md` 的推荐方案正确，但更像实施摘要：

- 修 `erpFinish`
- 修 `saveOrUpdateQty`
- 收紧 `DeviceFactoryThrd`
- 修导入结果汇总
- 去掉字符串拼接 SQL

问题是缺少技术设计层的独立判断：

- 没有对现有代码模式做足够 evidence-backed 引用。
- 没有列出关键方法内的 current behavior vs target behavior。
- 没有提出最小补丁策略和验证插桩策略。
- 没有分析事务边界、重试、线程重复扫描、历史异常状态对新逻辑的影响。
- 没有把状态流转整理成 implementation checklist。

因此 plan 对 implementer 的帮助有限，仍需要实现者重新理解大量上下文。

### 3.5 tasks 过度合并，不能发挥 SDD 调度价值

`generated_tasks.md` 只生成一个任务：

```text
ERP-SCRK-1: 收紧 ERP 入库同步状态流转
```

优点：符合“只改一个文件、避免过度拆分”。

问题：该任务内部包含四类不同风险：

1. 主单放行闸门。
2. qty 字典状态保留。
3. DeviceFactoryThrd 输入查询。
4. 设备/SIM 导入结果汇总与 SQL 安全修复。

全部压成一个 task，导致：

- reviewer 很难独立审查每个状态边界。
- validator 很难按验收矩阵定位失败。
- wave/agent/skill 无法体现作用。
- implementation notes 只能粗粒度记录。

更合理的方式是保持同一文件边界，但拆成 **审查子边界** 或 **task slices**：

```text
ERP-SCRK-1A 主单 ERP_READY 放行闸门
ERP-SCRK-1B ERP 重拉后的 qty 字典状态保留
ERP-SCRK-1C DeviceFactoryThrd 输入查询闸门
ERP-SCRK-1D 设备/SIM 导入结果汇总与 SQL 安全修复
ERP-SCRK-1V 状态流验收矩阵与最小编译验证
```

如果担心多 task 改同一个文件引入冲突，可以不并行执行，但仍保留分段验收和 review。

### 3.6 skill / agent 没有真实参与

当前项目中已经有静态 agent contract：

- `agents/scout.md`
- `agents/spec-reviewer.md`
- `agents/planner.md`
- `agents/implementer.md`
- `agents/reviewer.md`
- `agents/debugger.md`
- `agents/validator.md`

workflow 也声明了 allowed agents，例如 `workflows/plan.yml` 中有：

```text
allowed_agents:
  - scout
  - planner
  - spec-reviewer
```

但真实试跑中没有看到 agent 使用。根因是：

- `.claude/commands/sdd/*.md` 是薄 markdown wrapper。
- `sdd instructions spec/plan/tasks` 只返回规则文本，不调度 agent。
- `/sdd:spec`、`/sdd:plan`、`/sdd:tasks` 的 generated prompt 结构过于相似。
- `/sdd:do` 当前要求用户/AI 提供 artifact，不直接 dispatch external agents。
- runtime 里有 queue/background/wave/worker adapter 概念，但 slash command 层没有接到这些能力。

这解释了用户感受：**看不到 skill/agent，且看不到与普通 SDD 文档工作流的核心区别**。

### 3.7 啰嗦来自“报告模板化”，不是信息丰富

会话输出多次重复：

- 已更新哪个文件。
- 当前 branch 是 master。
- gaps=0。
- 下一步是什么。
- 禁止自动 commit/worktree。

这些信息不是没有用，但缺少聚合。用户真正需要的是：

```text
我比原始方案多发现了什么？
我在哪些地方确认了代码事实？
当前能不能安全进入下一步？
如果不能，缺什么证据？
```

当前输出没有形成“delta-first”风格，而是“阶段完成通知”风格，导致啰嗦但不深。

## 4. 与外部项目的差距

### 4.1 GitHub Spec Kit

Spec Kit 的强项是标准化 `spec -> plan -> tasks -> implement`，并通过 init/integration 把命令投影到不同 AI 工具。它有 constitution、clarify、plan、tasks、implement、templates/overrides 等机制。

本平台当前已借到：

- spec/plan/tasks 产物链。
- CLI init + AI entry projection。
- managed command/skill 更新。

但差距在：

- Spec Kit 有 `/speckit.clarify` 思路，本平台真实试跑没有 clarification/gap interrogation。
- Spec Kit tasks 会强调 dependencies、parallel markers、TDD flow，本平台任务只有最小 metadata。
- 本平台应避免只成为“中文轻量 Spec Kit”。

### 4.2 cc-sdd

cc-sdd 的核心竞争力不是 requirements/design/tasks，而是 `/kiro-impl`：

```text
tasks.md
  -> fresh implementer
  -> independent reviewer
  -> debugger if blocked/rejected
  -> implementation notes
  -> final validation
```

本平台差距：

- 没有 visible implementer/reviewer/debugger loop。
- `/sdd:do` 仍是 artifact-driven facade，不调度 agent。
- 任务状态没有被 review/debug 结果驱动。
- implementation notes 没成为后续 task 的上下文桥。

应该借鉴：

- parent controller 不亲自做所有事。
- 每个 task/slice 用 fresh context。
- reviewer 独立，不复用 implementer 上下文。
- review 多次失败后 debugger 介入。
- task notes 写回。

### 4.3 GSD

GSD 的核心竞争力是长任务运行治理：

- phase/milestone。
- dependency waves。
- small isolated plans。
- verifier。
- gap closure。
- persistent state files。
- fresh context agents。

本平台已实现部分 graph/wave/run/doctor 概念，但真实试跑没用上。

应该借鉴：

- `orchestrator coordinates, not executes`。
- verifier 不是只看 task 是否完成，而是看目标是否满足。
- gap 要进入 planning loop，不是简单输出 gaps=0。
- wave 能力必须以 files overlap 和 risk gate 为前提。

不应照搬：

- 默认 skip permissions。
- 自动 commit / merge / ship。
- 大型 milestone 流程作为日常小修默认路径。

### 4.4 BMAD

BMAD 的价值是角色化和 step-file 纪律：

- Analyst / PM / Architect / Developer / QA 等角色。
- 每个角色有明确 artifact ownership。
- guided workflow 和 conversational trigger 分离。
- quick flow 支持小任务。

本平台应借鉴：

- spec-reviewer、planner、validator 的 artifact ownership。
- step-file / staged instruction，不把所有规则塞给主会话。
- readiness check。

不应照搬：

- PRD/story/sprint 全套产品流程。
- 对小型 Java 修复过度角色化。

### 4.5 Oh My OpenAgent / Oh My OpenCode

它的价值不在 SDD 文档，而在 harness：

- orchestrator / planner / executor 分离。
- category routing。
- skill injection。
- LSP / AST / hashline / MCP tools。
- session recovery。
- parallel background agents。
- independent verification。

本平台应借鉴：

- capability-driven agent routing。
- tool capability 注入，而不是每个 prompt 手写工具规则。
- hashline/LSP/AST 类工具增强。
- long-running session 的 resumable state。

不应照搬：

- 大规模 harness 接管。
- 默认 telemetry / 多模型配置复杂度。
- 过强 autonomous loop。

## 5. 目标架构方向

### 5.1 从“文档生成器”升级为“SDD evidence orchestrator”

新的定位应是：

```text
SDD semantic docs define what should be true.
Runtime evidence proves what actually happened.
Agents produce bounded artifacts.
Doctor/verifier reject unsupported completion claims.
```

也就是说，本平台的竞争力不应是比别人更会写 spec/plan/tasks，而是：

1. 自动判断当前需求需要多少 SDD。
2. 用 scout/reviewer/planner/validator 补证据。
3. 把 agent 输出变成可验证 artifact。
4. 通过 run state/events 保持可恢复。
5. 通过 doctor/verifier/gap 回流防止“看起来完成”。

### 5.2 核心路径重塑

推荐目标路径：

```text
/sdd
  -> resolve branch/project/status
  -> lifecycle decision with auto risk extraction
  -> choose route

/sdd:spec
  -> spec-writer drafts from user input
  -> spec-reviewer reviews clarity/testability/scope
  -> gap checkpoint or ready_for_plan

/sdd:plan
  -> scout explores code impact
  -> planner proposes options/impact/validation
  -> plan-reviewer or main session chooses shortest safe path
  -> ready_for_tasks

/sdd:tasks
  -> planner generates task graph/slices
  -> task-graph validator checks dependencies/files/validation
  -> parser validates sdd-task blocks
  -> ready_for_do

/sdd:do
  -> implementer fresh context executes one task/slice
  -> reviewer fresh context checks diff against boundary
  -> debugger once if blocked/rejected
  -> validator maps acceptance to evidence
  -> runtime ingests artifacts
  -> sync-back proposal

/sdd:verify
  -> goal-level verifier checks acceptance, not just command success
  -> doctor checks run/event/artifact liveness
  -> sync-back inspect/apply policy
```

### 5.3 三层事实源

| 层 | 文件/状态 | 职责 |
|---|---|---|
| Semantic source | `specs/<branch>/spec.md|plan.md|tasks.md` | 需求、方案、任务边界 |
| Runtime source | `.sdd/runs/<run_id>/state.json` + `events.jsonl` | 执行事实、阶段、事件、恢复 |
| Evidence source | `.sdd/runs/<run_id>/artifacts/*.md` | agent 产物、review、validation、gap |

完成态必须满足：

```text
semantic task status + runtime state + evidence artifacts + verifier result 一致
```

### 5.4 Agent 使用策略

不要一上来全自动。按阶段逐步启用：

| 阶段 | 必须 agent | 可选 agent | 说明 |
|---|---|---|---|
| spec | spec-reviewer | scout | 审查需求是否可测试、范围是否闭合 |
| plan | scout、planner | oracle | 代码证据和方案选择，避免空泛 plan |
| tasks | planner、task-graph validator | scout | 生成可执行 task graph，不只是一个大任务 |
| do | implementer、reviewer | debugger | fresh context 实施 + 独立 review |
| verify | validator | doctor | 验收映射和 evidence 审计 |

用户可见输出必须显示：

```text
used_agents: scout, planner, spec-reviewer
artifacts: artifacts/scout-xxx.md, artifacts/spec-review-xxx.md
```

否则用户无法感知平台差异。

## 6. 可落地技改方案

### Phase A：修复真实试跑阻塞 bug 与输出体验

#### A1. 实现 canonical branch resolver

新增 core API：

```ts
resolveSddBranch(projectRoot, explicitBranch?)
```

优先级：

```text
1. explicit --branch
2. .sdd/project.yml 中记录的 semantic default branch
3. 当前 git branch
4. specs/ 下唯一已有分支
5. legacy specs/master
6. fallback main/master
```

规则：

- 显式 `--branch` 永远优先。
- git detached HEAD 时进入 fallback。
- 若当前 git branch 和已有唯一 specs branch 不一致，输出 warning 和 next command。
- init 默认使用当前 git branch，而不是 `master`。

需改文件：

- `packages/core/src/index.ts`
- `packages/cli/src/main.ts`
- `packages/core/src/index.test.ts`
- help 文案：`default current git branch` 代替 `default master`

测试：

- git 当前分支非 master 时 init 写入 `specs/<current-branch>/`。
- status/tasks/do/verify 不传 branch 时读取当前分支。
- legacy 只有 `specs/master` 时不破坏旧项目。
- explicit `--branch` 仍优先。

#### A2. 改进 lifecycle decide 自动风险识别

新增输入方式：

```text
sdd lifecycle decide --from-file <path>
sdd lifecycle decide --from-text <text>
sdd lifecycle decide --from-status
```

至少实现 deterministic keyword extraction：

| 关键词/信号 | risk tag |
|---|---|
| 状态流转、状态机、sync_status、liveness | `state-machine` |
| 线程、并发、重试、锁、幂等 | `concurrency` |
| SQL、数据库、表结构、历史数据、迁移 | `database` |
| API、contract、schema | `api` / `contract` |
| 权限、认证、泄露 | `security` |
| Maven、CI、构建脚本 | `ci` |

本次 ERP 需求应输出：

```text
profile=full
hard_gates=state_machine_concurrency_liveness
checkpoint_required=true 或至少 full path required
```

需改文件：

- `packages/core/src/index.ts`
- `packages/cli/src/main.ts`
- `packages/core/src/index.test.ts`
- `packages/core/src/instructions.ts`

#### A3. 输出改成 delta-first

当前输出模板过度重复。推荐每阶段输出固定 5 行以内：

```text
更新: specs/<branch>/spec.md
本阶段新增判断: <不是原文已有的 1-3 条>
阻塞/缺口: none | <gap>
验证: <command> PASS/FAIL
下一步: <recommended next command>
```

禁止每次重复长列表：

- 禁止事项全集。
- 所有文件存在状态。
- 大段 instructions JSON 摘要。

需改：

- generated command bodies in `packages/core/src/ai-tools.ts`
- instruction nextSteps in `packages/core/src/instructions.ts`
- docs/user-guide.md 中示例输出。

### Phase B：让 spec/plan/tasks 真正有 SDD 增值

#### B1. 加入 spec-reviewer artifact

`/sdd:spec` 写完 spec 后必须生成或要求生成：

```text
artifacts/spec-review-<spec_id>.md
```

内容：

- intent clarity。
- scope closure。
- acceptance testability。
- state/data/API/security hard gates。
- open questions。
- ready_for_plan。

如果 spec-reviewer 发现 blocking gap，不允许直接进入 plan。

#### B2. plan 阶段强制 scout 证据

`/sdd:plan` 不应只从 spec 写 plan。至少要有：

```text
sdd scout prepare --question <impact question>
```

或由 Claude Code 调用 Explore/scout agent 形成 artifact。

plan 必须包含：

- current behavior evidence。
- target behavior。
- impacted symbols/methods。
- validation mapping。
- rejected approaches。

对 ERP 场景，plan 应明确：

```text
erpFinish: current overwrite ERP_READY risk
saveOrUpdateQty: dictionary retention behavior
DeviceFactoryThrd query: missing parent ERP_READY gate
importDevice/importSim: wl result -> qty summary contract
```

#### B3. tasks 支持 slices，而不只是一维 task

新增 task slice 语义：

```yaml
slices:
  - id: ERP-SCRK-1A
    boundary: erpFinish ready gate
    acceptance: [AC-1, AC-2, AC-3]
  - id: ERP-SCRK-1B
    boundary: saveOrUpdateQty dictionary retention
    acceptance: [AC-4, AC-5, AC-6]
```

或保持多个 `sdd-task`，但标记：

```yaml
same_file_serial: true
parallel_allowed: false
```

这样既避免并行冲突，又能让 review/validation 按边界执行。

#### B4. 对多对象状态问题生成状态契约表

当 risk 包含 `state-machine` 时，spec/plan 必须包含：

```text
Object State Table
Transition Table
Driver/Consumer Table
Failure Reason Contract
Acceptance Matrix
```

ERP 场景应输出类似：

| 对象 | 状态字段 | 驱动线程 | 消费方 | 完成条件 |
|---|---|---|---|---|
| 主单 | `upms_erp_scrk.sync_status` | ErpScrkSyncThrd | DeviceFactoryThrd | 明细完整 |
| qty | `upms_erp_scrk_qty.sync_status` | Dictionary / DeviceFactory | DeviceFactory / 销售出库追溯 | 字典 ready / 导入完成 |
| wl | `upms_erp_scrk_wl.status` | DeviceFactory | 追溯/汇总 | 单序列号导入结果 |

### Phase C：接入可见 agent 编排

#### C1. 生成 Claude Code subagent assets

当前只有 `agents/*.md` 作为平台资产，未投影为 Claude Code subagents。

需要在 `sdd init/update` 中支持：

```text
.claude/agents/sdd-scout.md
.claude/agents/sdd-spec-reviewer.md
.claude/agents/sdd-planner.md
.claude/agents/sdd-implementer.md
.claude/agents/sdd-reviewer.md
.claude/agents/sdd-debugger.md
.claude/agents/sdd-validator.md
```

或以 skills 形式投影：

```text
.claude/skills/sdd-spec-reviewer/SKILL.md
.claude/skills/sdd-planner/SKILL.md
...
```

推荐：短期优先 skills，避免与用户已有 agents 冲突。

#### C2. 修改 generated `/sdd:*` command bodies

当前 generated command 主要是：

```text
Run sdd instructions <action> --json
Then follow payload
```

应改为：

```text
1. Run sdd status --json
2. Resolve branch/run/task
3. Run sdd instructions <action> --json
4. Invoke phase-specific agent/skill if required
5. Write artifact under .sdd/runs/<run_id>/artifacts
6. Validate/ingest artifact
7. Output delta-first summary
```

#### C3. `/sdd:do` 使用 implement/review/debug/validate loop

目标闭环：

```text
sdd do start <task_id>
  -> create run
  -> implementer artifact
  -> reviewer artifact
  -> debugger artifact if needed
  -> validator artifact
  -> sdd do task consumes artifacts
  -> sdd verify task
  -> sync-back inspect
```

短期不必完全自动执行外部 agent，但必须做到：

- command 明确要求使用 implementer/reviewer/validator。
- run state 记录 delegation expected/started/completed。
- 缺少 artifact 时输出具体 next action，而不是让用户看不懂。

#### C4. user-visible used_agents

所有阶段完成输出必须包含：

```yaml
used_agents:
  - scout: artifacts/scout-ERP-SCRK.md
  - planner: artifacts/plan-review-ERP-SCRK.md
quality_gates:
  - lifecycle: full/state-machine
  - task_gaps: PASS
  - spec_review: PASS_WITH_GAPS
```

## 7. Bug 修复清单

### P0

1. **默认分支 resolver**
   - 修复所有硬编码 `master` 默认。
   - init/status/tasks/do/verify/sync-back/graph/wave 共用 resolver。

2. **lifecycle hard gate 自动识别**
   - 支持 `--from-file` / `--from-text`。
   - state/concurrency/database/security/API/CI 关键词转 risk tags。

3. **`/sdd:spec|plan|tasks` 输出压缩**
   - 改成 delta-first。
   - 禁止重复打印长 instructions 摘要。

### P1

4. **spec-reviewer / scout / planner artifact 接入**
   - spec 阶段至少 spec-reviewer。
   - plan 阶段至少 scout + planner。
   - tasks 阶段至少 task graph validation。

5. **状态流任务模板增强**
   - state-machine risk 下强制生成状态契约表、迁移表、验收矩阵。

6. **task slice / serial task 支持**
   - 支持同文件多 slice 串行执行。
   - graph/wave 不把 same-file slices 并行化。

### P2

7. **Claude Code subagent/skill projection**
   - `sdd init/update` 投影 phase-specific agents/skills。
   - `sdd doctor` 检查这些 assets drift。

8. **artifact-driven `/sdd:do` agent loop**
   - implementer/reviewer/debugger/validator artifact lifecycle。
   - reviewer fail -> debugger once -> re-review。

9. **goal-level verifier 强化**
   - verify 不只检查 artifact 存在，而要映射 exact acceptance。

## 8. 针对本次 ERP 场景的理想输出形态

### 理想 `/sdd:spec` 输出

```text
更新: specs/<branch>/spec.md
新增判断:
- 该需求命中 state-machine + concurrency hard gate，应走 full，而不是 compact。
- 状态源分为主单/qty/wl 三层，必须分别定义 driver 和 consumer。
- 原始方案已较完整，本阶段重点是补状态契约表和验收矩阵，而不是重写长文。
缺口: 需要确认 EXIST_IMPORT 对 qty 成功汇总是否按设备/SIM 分别处理。
下一步: sdd plan --branch <branch> after spec-review PASS
```

### 理想 `/sdd:plan` 输出

```text
使用 agent:
- scout: 已确认 ERPSyncSvr.java 中 erpFinish/saveOrUpdateQty/DeviceFactoryThrd/importDevice/importSim 为影响点。
- planner: 已生成 current->target 行为矩阵。
新增判断:
- 不新增 service 是合理的，但必须分 4 个串行 slice 审查。
- SQL 拼接修复属于安全子边界，应单独验收。
下一步: sdd tasks generate --slices --branch <branch>
```

### 理想 `/sdd:tasks` 输出

```text
生成 5 个串行 slices，均影响 ERPSyncSvr.java，parallel_allowed=false。
验证矩阵覆盖 AC-1..AC-10。
下一步: sdd do task ERP-SCRK-1A --branch <branch>
```

## 9. 实施顺序建议

推荐先做能最快改善真实体验的最小闭环：

```text
Week 1 / Phase 3.16
  P0 branch resolver
  P0 lifecycle risk extraction
  P0 delta-first output

Week 2 / Phase 3.17
  spec-reviewer/scout/planner artifacts
  state-machine templates
  task slices

Week 3 / Phase 3.18
  Claude Code agent/skill projection
  /sdd:do visible implement/review/validate loop
  doctor verifies agent assets + artifact liveness
```

每个 phase 都应有真实 trial acceptance：

```text
重新跑 user_test ERP 场景，比较：
- branch 是否正确。
- lifecycle 是否升级 full。
- 输出 token/字数是否下降 40%+。
- 是否出现 used_agents 和 artifacts。
- spec/plan/tasks 是否新增非原文转写的状态契约/验收矩阵/任务切片。
```

## 10. 验收标准

本轮技改完成后，必须满足：

1. 在非 `master` git 分支执行 `sdd init/status`，默认读取当前分支或清晰提示 fallback。
2. ERP 状态流需求自动识别为 state-machine/concurrency hard gate。
3. `/sdd:spec` 输出不再只是重写原文，而包含状态对象/驱动/消费者/验收矩阵。
4. `/sdd:plan` 必须包含 scout evidence 和 current/target behavior matrix。
5. `/sdd:tasks` 能生成串行 task slices 或多个非并行 task，而不是无脑一个大 task。
6. 用户可见输出包含 used_agents、artifacts、quality_gates。
7. `sdd doctor` 能检查 projected agent/skill assets 是否缺失或 drift。
8. 再次评测 `user_test` 场景，综合评分从 4.2 提升到至少 7.0。

## 10.1 Phase 5 Harness Engineering Implications

本次真实 trial 已成为 Phase 5.5 `SkillAgentEvalContract` 的固定 eval baseline，同时为 5.1~5.4 的 runtime harness 拆分提供 failure mapping。它不只验证文档是否生成，而是验证平台是否能在 Claude Code 等 AI tool harness 上形成可控的 SDD agent workflow。

| Trial failure | Phase 5 contract / phase | 改造含义 |
|---|---|---|
| 默认落到 `master` | Phase 5.1 `ContextResolverContract` | branch 必须按 explicit branch > project config branch > current git branch > configured default 解析，并输出 branch source。 |
| lifecycle hard gate 漏判 | Phase 5.1 `LifecycleRiskGateContract` | 从需求文本/文件提取状态机、并发、数据一致性、安全、SQL、API/schema、CI/build、external unknown 等 deterministic signals。 |
| 输出啰嗦且像源文档转写 | Phase 5.1 `OutputQualityContract` | `/sdd:*` 和关键 CLI 输出必须收敛到 changed / decision / evidence / gaps / next。 |
| skill / agent 不可见 | Phase 5.2 `AgentRegistryContract` | 输出中应能看到 agent 参与点、read/write boundary、required artifact 和 autonomy ceiling。 |
| task 过粗 | Phase 5.3 `TaskGraphContract` | task 必须表达 depends_on、wave、affected_files、agent_fit、verification availability、autonomy 和 gap state。 |
| 没有 run evidence | Phase 5.3 `TaskRunEvidenceContract` | `.sdd/runs`、events、artifacts、review/validation evidence 和 sync-back proposal 成为执行事实源。 |
| command 输出重叠 | Phase 5.4 `QueryStatusContract` | 保持 `status = next action`、`doctor = health audit`、`run inspect = run evidence`、debug = drill-down。 |
| 无法持续评分 | Phase 5.5 `SkillAgentEvalContract` | 以 `user_test` 样本评估新增判断、风险识别、任务切分、agent evidence、输出简洁度和验证可执行性。 |
| 重复失败无法沉淀 | Phase 5.5 `HarnessLearningContract` | failure 只能沉淀为 Project Context Pack、risk vocabulary、checklist、doctor check、eval assertion 或 generated-entry guidance，不形成自修改 runtime。 |

后续 eval 维度必须覆盖 autonomy correctness、agent_fit、verification availability、gap closure 和 Project Context Pack 质量；这些维度决定 Phase 5 是否真正从文档生成器升级为 evidence-backed harness。

## 11. 参考资料

本报告综合了项目内已有调研与本轮外部复核：

- `docs/research/支持_subagent_的_SDD_工作流调研.md`
- `docs/research/支持_subagent_的_SDD_工作流深度分析报告.md`
- GitHub Spec Kit: https://github.com/github/spec-kit
- cc-sdd: https://github.com/gotalab/cc-sdd
- GSD: https://github.com/gsd-build/get-shit-done
- GSD Docs: https://getshitdone.help/
- BMAD Workflow Map: https://docs.bmad-method.org/reference/workflow-map/
- BMAD Agents: https://docs.bmad-method.org/reference/agents/
- Oh My OpenAgent: https://github.com/code-yeongyu/oh-my-openagent
- Oh My OpenAgent site: https://ohmyopenagent.com/
