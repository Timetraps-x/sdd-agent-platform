# SDD command 信息架构评估

## 背景

当前 `sdd` CLI 已从 Phase 1/2 的 SDD 主工作流入口，扩展到 Phase 3 的平台 runtime、执行器、治理、队列、索引、worktree、worker adapter 等内部能力入口。

这说明平台能力在增长，但也带来一个产品层问题：**所有 command 都有存在价值，不代表都应该作为同等用户入口暴露**。

本文评估两类入口：

1. Shell CLI：例如 `sdd init`、`sdd status`、`sdd do task`。
2. AI 工具入口 / slash command：当前 Claude Code 投影为 `.claude/skills/sdd/SKILL.md` 根 skill 和 `.claude/commands/sdd/*.md` 子 command；主生命周期形态是 `/sdd`、`/sdd:spec`、`/sdd:plan`、`/sdd:tasks`、`/sdd:do`、`/sdd:test`、`/sdd:sync-back`、`/sdd:ship`，诊断入口是 `/sdd:doctor`。低层 `sdd verify task`、`sdd verifies`、`sdd update`、`sdd instructions` 保留为 CLI/core 能力，不再投影成默认 slash 入口。

## 结论

当前 command 面不建议直接删除能力，但建议做信息架构分层：

```text
用户主路径 command
  稳定暴露在 README、user guide、默认 help 中。

高级执行 command
  可暴露，但必须标明适用场景，避免用户绕过主工作流。

平台调试 / 审计 / contract introspection command
  保留能力，但不应在默认 help 中与主路径平铺。
```

核心判断：

```text
必要性 ≠ 默认可见性
```

## 当前 command 分层

### 用户主路径 command

这些 command 是 SDD 平台的日常用户路径，应保留为一等入口。

```text
sdd --version
sdd init
sdd update
sdd instructions
sdd doctor
sdd status

sdd lifecycle decide
sdd tasks format
sdd tasks list
sdd tasks inspect
sdd tasks gaps

sdd run create
sdd run status
sdd run inspect
sdd run archive

sdd artifact template
sdd artifact validate

sdd do task
sdd test task
sdd sync-back inspect
sdd sync-back apply
```

职责边界：

| Command | 用户心智 | 主要职责 |
|---|---|---|
| `sdd init` | 接入项目 | 创建 `.sdd`、可选 starter docs、AI entries；不作为 workflow partition 入口 |
| `sdd update` | 修复入口漂移 | 刷新 managed AI entries |
| `sdd instructions` | 获取动态规则 | 由 CLI/core 返回当前 action 指令 |
| `sdd doctor` | 健康检查 | 检查配置、入口漂移、runtime evidence |
| `sdd status` | 下一步导航 | 汇总 docs/tasks/latest run/gaps/recommended next command |
| `sdd lifecycle decide` | 选择生命周期 | 评估 direct/compact/full/research 等路径 |
| `sdd tasks *` | 理解任务文档 | 解析、检查、定位 task gap |
| `sdd run *` | 管理执行证据 | 创建、查看、归档 run |
| `sdd artifact template/validate` | 标准化 evidence | 生成和校验 agent result artifact |
| `sdd do task` | 执行单个任务 | ingestion-aware task workflow |
| `sdd test task` | 测试 + 证据判断 | 执行验证命令、收集 evidence、评估 acceptance coverage，作为主运行时门禁 |
| `sdd sync-back *` | 写回任务状态 | `/sdd:test` PASS 后 inspect，再按 policy apply |

### 高级执行 command

这些 command 可保留，但不应被用户误解为主路径替代品。

```text
sdd graph inspect
sdd wave inspect
sdd wave run
sdd wave executor
sdd background run
sdd background inspect
sdd isolation inspect
sdd worktree create
sdd worktree inspect
sdd worktree keep
sdd worktree remove
```

建议定位：

| Command | 建议定位 | 风险 |
|---|---|---|
| `sdd graph inspect` | task graph / dependency / overlap 视图 | 与 `tasks inspect/gaps` 输出心智重叠 |
| `sdd wave inspect` | wave plan 只读视图 | 与 graph/task 状态重叠 |
| `sdd wave run` | 高级批量执行入口 | 容易被误当成 `do task` 替代 |
| `sdd background run` | runtime/internal 单 delegation 执行 | 可能绕过用户主工作流 |
| `sdd worktree *` | runtime isolation lifecycle | 对普通用户过底层，且涉及文件系统状态 |
| `sdd isolation inspect` | worktree isolation dry-run | 更适合作为 wave/background 的解释视图 |

推荐规则：

```text
普通任务执行：优先 `sdd do task`
批量 wave 执行：用户明确要求 wave/background 后使用 `sdd wave run`
runtime 调试：才直接使用 `sdd background run` 或 `sdd worktree *`
```

### 平台调试 / contract introspection command

这些 command 对平台开发、doctor 扩展、smoke 验证有价值，但不建议与用户主路径同级展示。

```text
sdd run list
sdd run index rebuild
sdd run index inspect
sdd run index query

sdd governance inspect
sdd governance evaluate
sdd capabilities list
sdd capabilities inspect
sdd plugins list
sdd plugins inspect
sdd workers list
sdd workers inspect
sdd queue list
sdd queue inspect
sdd state-machine inspect
sdd artifact ingest
sdd artifact ingestions
```

建议长期迁移到更清晰的 namespace：

```text
sdd platform capabilities list|inspect
sdd platform plugins list|inspect
sdd platform workers list|inspect
sdd platform governance inspect|evaluate
sdd platform state-machine inspect

sdd debug run-index rebuild|inspect|query
sdd debug queue list|inspect
sdd debug artifact-ingestions <run_id>
sdd debug background inspect <run_id>
sdd debug wave-executor <run_id>
```

如果短期不改命令路径，也建议至少调整 `sdd --help`：

```text
Default commands
Advanced execution commands
Platform/debug commands
```

## 输出重叠分析

### `sdd status` / `sdd doctor` / `sdd run inspect`

这三者都可能输出 run、gap、validation、sync-back 信息，但推荐边界不同：

| Command | 输出目标 | 不应承担的职责 |
|---|---|---|
| `sdd status` | 当前项目的下一步导航 | 不做完整 health audit |
| `sdd doctor` | 项目和 runtime evidence 健康检查 | 不替代 run 详情审计 |
| `sdd run inspect` | 单个 run 的证据审计 | 不替代项目级下一步导航 |

推荐输出边界：

```text
status = where am I, what next
 doctor = is the system/evidence healthy
 run inspect = what happened in this run
```

### `sdd run list` / `sdd run index query`

重叠点：两者都能呈现 run 摘要。

建议边界：

| Command | 定位 |
|---|---|
| `sdd run list` | 用户查看最近 runs |
| `sdd run index query` | 平台/调试用途的跨 run 检索 |

推荐：`run index` 不进入默认 help 主路径。

### `sdd tasks *` / `sdd graph inspect` / `sdd wave inspect`

重叠点：都会涉及 task 状态、依赖、阻塞、可执行性。

建议边界：

| Command | 定位 |
|---|---|
| `sdd tasks list/inspect/gaps` | 文档层 task contract |
| `sdd graph inspect` | 执行前 task graph 和依赖图 |
| `sdd wave inspect` | wave executor 的调度计划 |

推荐：默认用户只看 `tasks`；graph/wave 作为 advanced execution 视图。

### `sdd run inspect` / `sdd queue inspect` / `sdd background inspect` / `sdd wave executor` / `sdd artifact ingestions`

这是当前最明显的输出重叠区，因为它们都围绕 delegation、artifact、ingestion、event evidence。

建议边界：

| Command | 定位 |
|---|---|
| `sdd run inspect` | 默认 run 审计入口 |
| `sdd queue inspect` | 单个 queue item drill-down |
| `sdd background inspect` | background executor drill-down |
| `sdd wave executor` | wave executor drill-down |
| `sdd artifact ingestions` | artifact ingestion ledger drill-down |

推荐：普通用户只需要 `run inspect`；其余入口应标记为 debug drill-down。

### `capabilities` / `plugins` / `workers` / `governance` / `state-machine`

重叠点：都是平台 contract introspection。

建议统一归类为 platform 命令，而不是主工作流命令。

```text
platform = what can this runtime do, under which contracts and policy
workflow = what should I do next for this project/task
```

## `sdd init`、`/sdd` 与 `/sdd:spec` 的边界

### 名称说明

`sdd init` 是 shell CLI 的项目级接入命令；`/sdd` 是 Claude Code 的 SDD 根 skill 投影；`/sdd:spec` 是 workflow/spec partition 入口。

当前代码里对应的是：

```text
root skill artifact id: sdd
root projected path: .claude/skills/sdd/SKILL.md
workflow command projected paths: .claude/commands/sdd/spec.md, plan.md, tasks.md, do.md, test.md, sync-back.md, ship.md
diagnostic command projected path: .claude/commands/sdd/doctor.md
```
low-level verify contract CLI: sdd verifies inspect|write|format, consumed by /sdd:test rather than projected as /sdd:verifies
maintenance/helper CLI only: sdd update, sdd instructions <action>

在 Claude Code 中，常用入口是：

```text
/sdd
/sdd:spec
/sdd:plan
/sdd:tasks
/sdd:do
/sdd:test
/sdd:sync-back
/sdd:ship
```

### `sdd init`

`sdd init` 是真正执行项目级初始化的 CLI 命令。它负责把一个仓库接入 SDD，不负责在日常 workflow 中切换或创建分支分区；workflow partition 入口是 `/sdd:spec`。

入口行为：

```text
sdd init [--force] [--ai auto|claude-code|none] [--scaffold-docs] [--no-scaffold-docs]
```

实际 side effects：

```text
创建/更新 .sdd/project.yml
创建 .sdd/runs/
可选创建 starter specs/master/plan/tasks 文档（legacy scaffold）
投影 managed Claude Code entries
```

重要规则：

- `sdd init` 默认是项目级接入；不同 Git branch 不需要重复 init。
- starter semantic docs 是 scaffold 行为，不是 workflow branch 入口；常规分区文档由 `/sdd:spec` 创建/细化。
- 传 `--scaffold-docs` 时创建 starter docs；传 `--no-scaffold-docs` 时显式跳过 starter docs。
- 已存在的 semantic docs 默认保留。
- 只有显式 `--force` 才覆盖已有 semantic docs。
- `--ai claude-code` 会显式投影 Claude Code entries。
- `--ai none` 跳过 AI entry projection。

源码边界：

- CLI 解析 `sdd init` 后调用 `initProject(...)`。
- `initProject(...)` 负责 `.sdd`、runs、project config、可选 starter docs、AI entries；分支/分区 workflow 由 spec/plan/tasks/do/test/sync-back/status 命令链处理，`verify` 只保留为兼容诊断。

### `/sdd` 与 `/sdd:spec`

`/sdd` 是 AI 操作者根入口，是一个薄 skill / intent router。它本身不承载 workflow 状态逻辑，而是要求 Claude Code 先运行 `sdd status`，必要时运行 `sdd instructions overview --json`，再按 CLI/core 的 recommended command 继续。

`/sdd:spec` 是 workflow partition 入口：

- 不传 `--branch` 时，CLI/core 从当前 Git branch 解析 partition。
- 传 `--branch <branch>` 时，只解析/创建指定 partition，不要求重复 init。
- 后续 `/sdd:plan`、`/sdd:tasks`、`/sdd:do`、`/sdd:test`、`/sdd:sync-back` 继续使用已解析的 partition/task 语义；`sdd verify task` 仅作为低层 CLI 兼容诊断或旧 run replay；`/sdd:ship` 使用目标 branch/partition 做上线前检查，但不执行 publish/push/tag。

这些 AI 入口不应该：

- 自己手写 `.sdd/project.yml`。
- 自己猜测项目检测结果或 workflow 状态。
- 绕过 CLI/core 直接写 `.claude/commands`。
- 在未显式授权时使用 `--force` 覆盖用户文档。

### 两者关系

```text
/sdd            = AI 操作说明 / 根 skill 投影 / thin intent router
/sdd:spec       = workflow partition 入口投影
/sdd:test       = 验证命令执行 + acceptance evidence judgment 主门禁
/sdd:sync-back  = verified task completion 写回入口投影
/sdd:ship       = 上线前 release-readiness / dry-run 入口投影
sdd init        = source of truth / 项目级初始化执行器 / state writer
```

也就是说：

```text
用户在 Claude Code 里触发 /sdd
  -> AI 读取 generated skill contract
  -> AI 运行 sdd status 和 sdd instructions overview --json
  -> CLI/core 返回当前 partition、workflow_status、recommended command
  -> 若需要进入新 workflow，AI 运行 /sdd:spec 对应的 spec 指令
  -> 后续 plan/tasks/do/test/sync-back 继续由 CLI/core 状态驱动
  -> 若用户要求上线，AI 运行 /sdd:ship，先执行 sdd ship --branch <branch> --dry-run 做本地 readiness 检查
```

### 为什么需要两类入口

这是 Phase 2 “AI 工具入口投影”的核心设计：

```text
CLI/core 是事实源。
AI skill / slash command 是入口投影。
```

原因：

1. Shell CLI 可被人类、CI、其他 agent、其他 IDE 统一调用。
2. Skill 和 slash command 给 Claude Code 用户一个自然入口。
3. 动态状态由 CLI/core 判断，不由生成的 markdown 猜测。
4. `sdd update` 可以检查/修复 managed AI entry drift，但不需要作为默认 slash 入口投影。
5. 未来可以投影到其他 AI 工具，而不用复制平台逻辑。

### 什么时候用哪个

| 场景 | 推荐入口 |
|---|---|
| 人类在终端接入项目 | `sdd init --ai claude-code` |
| Claude Code 里让 AI 判断下一步 | `/sdd` |
| 进入或细化某个 workflow partition | `/sdd:spec` |
| `/sdd:test` PASS 后写回任务完成态 | `/sdd:sync-back` |
| 上线前 readiness 检查 | `/sdd:ship` / `sdd ship --branch <branch> --dry-run` |
| CI 或脚本初始化 | `sdd init --ai none` 或指定 AI mode |
| 修复 generated entry drift | CLI `sdd update` |
| 重新覆盖 starter docs | `sdd init --force`，且必须显式确认风险 |
| 初始化后判断下一步 | `sdd status` |

## 推荐改动

### 短期

1. 保留所有现有 command，不删除能力。
2. 调整 `sdd --help` 分组：
   - Default workflow commands
   - Advanced execution commands
   - Platform/debug commands
3. README 和 user guide 只展示用户主路径。
4. 在 AI README 中继续强调：高级能力不是普通用户主路径。
5. 在 `/sdd` 文案里明确：它是 thin wrapper，source of truth 是 CLI/core；workflow partition 入口是 `/sdd:spec`。

### 中期

引入 namespace，降低顶层 command 数量：

```text
sdd platform ...
sdd debug ...
```

候选迁移：

```text
sdd capabilities *       -> sdd platform capabilities *
sdd plugins *            -> sdd platform plugins *
sdd workers *            -> sdd platform workers *
sdd governance *         -> sdd platform governance *
sdd state-machine *      -> sdd platform state-machine *

sdd queue *              -> sdd debug queue *
sdd run index *          -> sdd debug run-index *
sdd artifact ingestions  -> sdd debug artifact-ingestions
sdd background inspect   -> sdd debug background inspect
sdd wave executor        -> sdd debug wave-executor inspect
sdd worktree *           -> sdd debug worktree *
```

保留兼容期时，可以让旧命令继续可用，但从默认 help 中移除或标记 deprecated/advanced。

### 长期

建立 command 设计原则：

```text
一个 command 只能属于一个主心智：
- workflow navigation
- task/document operation
- run/evidence operation
- execution orchestration
- platform contract introspection
- debug drill-down
```

新增 command 前必须回答：

1. 它是用户主路径、advanced execution，还是 debug/platform？
2. 它是否能通过现有 command 的 `--json` 或 drill-down 满足？
3. 它的输出是否和 `status`、`doctor`、`run inspect` 重叠？
4. 它是否会让用户绕过 `do task` / `test task` / `sync-back inspect` 主路径？
5. 它是否应该默认出现在 `sdd --help`？

## 推荐默认 help 形态

```text
sdd workflow platform CLI

Default workflow and maintenance commands:
  sdd init [options]
  sdd update [options]
  sdd instructions [action] [--json]
  sdd doctor [--latest-only] [--all-runs]
  sdd status [--branch <branch>] [--json]
  sdd lifecycle decide [options]
  sdd tasks format|list|inspect|gaps [options]
  sdd run create|status|list|inspect|archive [options]
  sdd artifact template|validate [options]
  sdd do task <task_id> [options]
  sdd test task <task_id> [--run <run_id>] [options]
  sdd sync-back inspect|apply [<run_id>] [options]
  sdd verify task <task_id> [--run <run_id>] [options]  # compatibility / diagnostics

Advanced execution commands:
  sdd graph inspect [options]
  sdd wave inspect|run|executor [options]
  sdd background run|inspect [options]
  sdd isolation inspect [options]
  sdd worktree create|inspect|keep|remove [options]

Platform/debug commands:
  sdd capabilities list|inspect [options]
  sdd plugins list|inspect [options]
  sdd workers list|inspect [options]
  sdd governance inspect|evaluate [options]
  sdd queue list|inspect [options]
  sdd state-machine inspect [options]
  sdd run index rebuild|inspect|query [options]
  sdd artifact ingest|ingestions [options]
```

## Phase 5 Harness Engineering Usage

本文是 Phase 5 SDD Harness Engineering 的输入文档，其中输出质量边界进入 Phase 5.1 `OutputQualityContract`，命令查询边界进入 Phase 5.4 `QueryStatusContract`。

| 本文结论 | Phase 5 contract / phase | 用途 |
|---|---|---|
| 用户主路径 / advanced execution / platform-debug 分层 | Phase 5.4 `QueryStatusContract` | 决定默认可见性、next action 和 drill-down 边界 |
| `status` / `doctor` / `run inspect` 输出边界 | Phase 5.4 `QueryStatusContract` + Phase 5.1 `OutputQualityContract` | 避免重复输出和命令心智重叠 |
| `/sdd` 是 thin wrapper，`/sdd:spec` 是 workflow partition 入口，`sdd init` 是项目级 source of truth | Phase 5.1 `ContextResolverContract` + Phase 5.4 managed entry boundary | generated AI entry 不承载核心 workflow brain |
| debug/platform commands 不应平铺给普通用户 | no-OS/no-runtime guardrail | Phase 5 不把平台调试能力包装成自主执行 OS |

## 最终建议

当前 command 的主要问题不是“太多无用命令”，而是：

```text
主路径、执行器、debug drill-down、platform contract introspection 被平铺成了同一层。
```

因此不建议直接删除命令。更稳妥的路线是先调整默认可见性和命名分层，再观察哪些旧入口可以在兼容期后降级或合并。
