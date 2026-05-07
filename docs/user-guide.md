# SDD Agent Platform 用户指南

## 0. 5 分钟快速接入 Claude Code

这份指南面向**人类用户**：你想把一个项目接入 SDD，并在 Claude Code 里用 `/sdd` 系列入口推进需求。AI / Claude Code 操作者的内部规则见 [`docs/ai-readme.md`](ai-readme.md)。

如果 `sdd` 已经可用，最快接入目标项目的路径是：

```bash
# 在目标 Git 仓库中执行
sdd init --ai claude-code
sdd status
sdd doctor
```

然后打开 Claude Code，在项目里输入：

```text
/sdd
```

你不需要先记完整生命周期。`/sdd` 会读取当前状态，并告诉你下一步是补 spec、写 plan、拆 tasks、执行 task、验证，还是处理 sync-back。

成功接入后，项目里会有：

```text
.sdd/project.yml
.sdd/runs/
specs/<branch>/spec.md
specs/<branch>/plan.md
specs/<branch>/tasks.md
.claude/commands/...
.claude/skills/sdd/...
```

如果还没有安装 CLI，先看 [场景 A：从 npm 安装 CLI](#2-场景-a从-npm-安装-cli)。标准 npm published package 已发布并通过 public install smoke；GitHub direct install 只作为开发/排障备用路径。如果项目已经有自己的 spec/plan/tasks，直接看 [场景 C：在已有项目中接入 SDD](#4-场景-c在已有项目中接入-sdd)。

---

## 1. 在 Claude Code 里怎么用

### 1.1 只先记住这 7 个入口

| 你想做什么 | 在 Claude Code 中输入 | 结果 |
|---|---|---|
| 不知道下一步 | `/sdd` | 读取状态并给出推荐下一步 |
| 新需求还没写清楚 | `/sdd:spec` | 帮你补 requirements / scope / acceptance |
| 需求清楚但方案未定 | `/sdd:plan` | 从 spec 推导 approach / risks / validation |
| 要拆任务 | `/sdd:tasks` | 生成或检查 graph-ready task blocks |
| 要执行一个任务 | `/sdd:do` | 围绕一个 task 生成证据并执行主路径 |
| 要验证任务完成情况 | `/sdd:verify` | 做 goal-level acceptance coverage verify |
| 只检查健康状态 | `/sdd:doctor` | 检查 run evidence、artifact、状态漂移 |

最常用的是 `/sdd`。当你不确定该做什么时，不要猜命令，先输入 `/sdd`。

### 1.2 一次正常 Claude Code 协作长什么样

```text
你描述需求 -> /sdd -> 补 spec/plan/tasks（如需要） -> 选择一个 task -> /sdd:do -> /sdd:verify -> sync-back inspect -> 按 apply_policy 写回或等待确认
```

这不是强制每个需求都跑完整大流程。小任务应该走最短安全路径；复杂任务才需要 spec -> plan -> tasks(multiple waves) -> graph/wave inspect -> task-by-task do/verify -> sync-back。

### 1.3 你作为用户需要看什么

你不需要检查 AI 内部每一步命令，但需要看四个确认点：

1. **状态优先**：它有没有先读 `sdd status`，而不是凭聊天上下文猜状态。
2. **边界明确**：它有没有只推进一个 task，并遵守 task Boundary / Acceptance。
3. **证据足够**：artifact 里有没有 implementation / review / validation evidence。
4. **写回安全**：`sync-back inspect` 的 `apply_policy` 是 direct 还是 confirm。

`do` 和 `verify` 默认只写 `.sdd/runs`，不会自动把 `tasks.md` 的 task 改成 `completed`。写回前一定先 inspect：

```bash
sdd sync-back inspect <run_id> --task <task_id>
```

如果输出 `apply_policy=direct approval_required=false`，说明这是简单/direct-safe 任务，可以直接写回：

```bash
sdd sync-back apply <run_id> --task <task_id>
```

如果输出 `apply_policy=confirm approval_required=true`，说明这是复杂或高风险任务，需要你确认后再写回：

```bash
sdd sync-back apply <run_id> --task <task_id> --approved
```

### 1.4 什么时候不要继续自动跑

遇到这些情况，应该先停下来确认：

- task Boundary / Acceptance 不清楚。
- validation artifact 没有覆盖 Acceptance 原文或证据不足。
- `sync-back inspect` 显示 `approval_required=true`。
- 操作会影响外部系统、共享状态、CI/CD、数据库、Git push/PR 等。
- AI 想把多个 task、wave 或 background executor 当成默认主路径。

---

## 2. 场景 A：从 npm 安装 CLI

### 2.1 默认安装方式

普通用户不需要 clone 平台仓库。默认直接安装公开 npm 包：

```bash
npm install -g sdd-agent-platform@latest
sdd --version
sdd --help
```

如果需要验证 GitHub 源码安装路径，也可以使用：

```bash
npm install -g git+ssh://git@github.com/Timetraps-x/sdd-agent-platform.git
sdd --version
sdd --help
```

平台开发者才需要 clone 仓库并直接运行 dist CLI：

```bash
node ./dist/packages/cli/src/main.js status
```

### 2.2 更新已安装 CLI

```bash
npm install -g sdd-agent-platform@latest
sdd --version
```

SSH 安装方式同理：

```bash
npm install -g git+ssh://git@github.com/Timetraps-x/sdd-agent-platform.git
sdd --version
```

### 2.3 卸载

```bash
npm uninstall -g sdd-agent-platform
```

### 2.4 适用场景

| 场景 | 推荐方式 |
|---|---|
| 平台开发者本地调试 | `node ./dist/packages/cli/src/main.js ...` |
| 真实业务仓库试用 | `npm install -g sdd-agent-platform@latest` |
| CI 或脚本验证 | 使用 npm 安装后的全局 `sdd`，或平台仓库构建后的 dist CLI |

---

## 3. 场景 B：在新项目中初始化 SDD

### 3.1 初始化

进入目标 Git 仓库：

```bash
sdd init --ai claude-code
sdd status
sdd doctor
```

初始化会创建核心 SDD 文件：

```text
.sdd/project.yml
.sdd/runs/
specs/master/spec.md
specs/master/plan.md
specs/master/tasks.md
```

如果使用 `--ai claude-code`，还会生成 `.claude/` 下的托管 AI 入口文件；这些入口只负责调用平台能力，AI 操作规则见 [`AI README`](ai-readme.md)。

### 3.2 初始化后的默认状态

新仓库会生成 onboarding starter docs，其中 `tasks.md` 通常包含 `ONBOARDING-1`。

这不是业务实现任务，而是提示你把 starter docs 替换成真实项目内容。

```bash
sdd tasks inspect ONBOARDING-1 --branch master
```

### 3.3 初始化到其他 branch

```bash
sdd init --ai claude-code --branch feature-x
sdd status --branch feature-x
```

这会生成：

```text
specs/feature-x/spec.md
specs/feature-x/plan.md
specs/feature-x/tasks.md
```

### 3.4 不生成 starter docs

高级场景可以跳过 starter docs：

```bash
sdd init --ai claude-code --no-scaffold-docs
```

适用于你已经有自己的 `specs/<branch>/spec.md / plan.md / tasks.md` 模板，不希望 init 生成 placeholder。

---

## 4. 场景 C：在已有项目中接入 SDD

### 4.1 已有项目推荐步骤

```bash
sdd init --ai claude-code
sdd status
sdd doctor
```

如果已有 `specs/master/spec.md`、`plan.md`、`tasks.md`，默认不会覆盖。只有显式 `--force` 才覆盖：

```bash
sdd init --ai claude-code --force
```

### 4.2 接入后先做什么

先看状态：

```bash
sdd status --branch master
```

常见结果：

| 状态 | 下一步 |
|---|---|
| 缺 spec/plan/tasks | 先写语义文档 |
| 有 ONBOARDING-1 | 替换 starter docs |
| 有 pending task 且无 gaps | 进入 `sdd tasks inspect` / `sdd do task` |
| 有 blocking gaps | 修 `tasks.md` |
| generated entries drift | 执行 `sdd update` |

### 4.3 不要手改 generated entries

`.claude/commands` 和 `.claude/skills` 是 managed generated entries。要刷新用：

```bash
sdd update
sdd update --check
```

不要把它们当作长期手写文档维护。

---

## 5. 场景 D：编写 spec / plan / tasks

### 5.1 spec.md 写什么

`spec.md` 描述需求目标、范围、非目标和验收标准。

示例：

```markdown
# Spec: Demo Service Quick Start

## Goal

Add a Quick Start section to README and make the SDD workflow clear.

## Acceptance

- README contains a Quick Start section.
- README states that sdd do task is the main workflow entrypoint.
```

### 5.2 plan.md 写什么

`plan.md` 描述实现策略、影响面、风险和验证方式。

示例：

```markdown
# Plan: Demo Service Quick Start

## Approach

Update README only.

## Validation

- test -f README.md
- grep -q "Quick Start" README.md
- grep -q "sdd do task" README.md
```

### 5.3 tasks.md 写什么

先看标准格式：

```bash
sdd tasks format
```

最小可执行 task 示例：

````markdown
# Tasks: Demo Service Quick Start

### T001: Add README quick start

```sdd-task
id: T001
title: Add README quick start
status: pending
priority: medium
owner: claude
wave: 1
depends_on: []
affected_files:
  - README.md
validation:
  - test -f README.md
  - grep -q "Quick Start" README.md
  - grep -q "sdd do task" README.md
risk: []
```

#### Boundary

- Modify README.md only.

#### Acceptance

- README contains a Quick Start section.
- README states that sdd do task is the main workflow entrypoint.

#### Implementation Notes

Reserved for sync-back notes.
````

### 5.4 task 格式关键规则

`#### Boundary`、`#### Acceptance`、`#### Implementation Notes` 是 companion sections，必须放在 `sdd-task` fenced block 外部。

fenced block 内只放 metadata，例如：

```text
id
status
title
priority
owner
wave
depends_on
affected_files
validation
risk
```

如果把 `#### Boundary` / `#### Acceptance` 放进 fenced block 内，parser 会把它们当作 metadata 内容，导致：

```text
Task has no Boundary section.
Task has no acceptance items.
```

### 5.5 检查 task 是否可执行

```bash
sdd tasks list --branch master
sdd tasks inspect T001 --branch master
sdd tasks gaps --branch master
```

如果有 blocking gaps，先修 `tasks.md`，不要进入 `do`。

---

## 6. 场景 E：主路径执行一个任务

这是 Phase 3.15 后的推荐主路径。

### 6.1 查看当前状态

```bash
sdd status --branch master
```

看到推荐命令后，检查 task：

```bash
sdd tasks inspect T001 --branch master
```

确认：

- task id 唯一。
- status 是 `pending`。
- Boundary 明确。
- Acceptance 可验证。
- affected_files 不为空。
- validation 不为空。
- 没有 blocking gaps。

### 6.2 创建 run

```bash
sdd run create
```

记录输出中的 `<run_id>`。task id 会在后续 `sdd do task <task_id> --run <run_id>` 时写入 run state。

### 6.3 实现代码或文档变更

在 task Boundary 内完成变更。例如只允许改 README，就不要改其他文件。

SDD runtime 不会替你判断业务代码正确性；你需要执行 task 的 validation commands，并把证据写入 artifact。

### 6.4 生成 result artifacts

推荐用模板，不要手写 `sdd-result` block：

```bash
sdd artifact template artifacts/implement-T001.md --task T001 --agent implementer --branch master \
  > .sdd/runs/<run_id>/artifacts/implement-T001.md

sdd artifact template artifacts/review-T001.md --task T001 --agent reviewer --branch master \
  > .sdd/runs/<run_id>/artifacts/review-T001.md

sdd artifact template artifacts/validation-T001.md --task T001 --agent validator --branch master \
  > .sdd/runs/<run_id>/artifacts/validation-T001.md
```

然后在每个 artifact 后追加 `## Evidence`。

实现 artifact 示例：

```markdown
## Evidence

- Updated README.md with Quick Start.
- `test -f README.md` passed.
```

review artifact 示例：

```markdown
## Evidence

- Confirmed only README.md changed.
- Confirmed acceptance wording is present.
```

validation artifact 示例：

```markdown
## Evidence

- `test -f README.md` passed.
- `grep -q "Quick Start" README.md` passed.
- `grep -q "sdd do task" README.md` passed.
```

### 6.5 artifact 规则

`sdd-result.artifacts` 只放 run-relative artifact 路径，例如：

```text
artifacts/implement-T001.md
artifacts/review-T001.md
artifacts/validation-T001.md
```

不要把业务源码或测试文件写进 `sdd-result.artifacts`。这些应该写在 `## Evidence`。

validator artifact 必须包含 exact Acceptance text。`sdd artifact template --agent validator` 会自动把 task Acceptance 复制到 `## Acceptance Mapping`，不要改写成同义句。

### 6.6 校验 artifacts

```bash
sdd artifact validate <run_id> artifacts/implement-T001.md --task T001 --agent implementer
sdd artifact validate <run_id> artifacts/review-T001.md --task T001 --agent reviewer
sdd artifact validate <run_id> artifacts/validation-T001.md --task T001 --agent validator
```

全部 valid 后再进入 `do`。

### 6.7 执行 `sdd do task`

```bash
sdd do task T001 \
  --branch master \
  --run <run_id> \
  --implement-artifact artifacts/implement-T001.md \
  --review-artifact artifacts/review-T001.md \
  --validation-artifact artifacts/validation-T001.md
```

成功结果：

```text
status: completed
message: Task loop completed through Phase 3 executor artifact ingestion.
gaps: []
```

Phase 3.15 后，这一步会生成 artifact ingestion records：

```bash
sdd artifact ingestions <run_id> --json
```

期望：

```text
valid: true
records: implementer / reviewer / validator
```

---

## 7. 场景 F：验证任务并写回 tasks.md

### 7.1 goal-level verify

```bash
sdd verify task T001 \
  --branch master \
  --run <run_id> \
  --review-artifact artifacts/review-T001.md \
  --validation-artifact artifacts/validation-T001.md
```

成功后：

```text
status: PASS
message: Goal-level verify passed with explicit acceptance coverage.
```

生成：

```text
.sdd/runs/<run_id>/artifacts/acceptance-coverage-T001.md
.sdd/runs/<run_id>/artifacts/sync-back-proposal.md
```

### 7.2 sync-back inspect

```bash
sdd sync-back inspect <run_id> --branch master --task T001
```

如果 ready，会同时输出 `apply_policy`：

- `direct`：简单/direct-safe 任务，可以直接 apply。
- `confirm`：复杂或高风险任务，需要人工确认后带 `--approved` apply。

如果 blocked，不要 apply，先看 reasons。

常见 blocked 原因：

- run status 不是 completed。
- validation status 不是 pass。
- 有 blocking gaps。
- task 不能唯一定位。
- proposal 不存在。

### 7.3 sync-back apply

简单/direct-safe 任务：

```bash
sdd sync-back apply <run_id> --branch master --task T001
```

复杂/高风险任务，人工确认后：

```bash
sdd sync-back apply <run_id> --branch master --task T001 --approved
```

成功后：

- `tasks.md` 中对应 task 的 `status` 变成 `completed`。
- `#### Implementation Notes` 追加 run/proposal/artifact 链接。
- run state 中 `syncBack.status` 变成 `applied`。
- event log 追加 `sync_back_applied`。

### 7.4 最终检查

```bash
sdd status --branch master
sdd run inspect <run_id>
sdd run index rebuild --json
sdd doctor --latest-only
```

期望：

```text
tasks pending=0 completed=1 gaps=0
run status=completed validation=pass sync_back=applied
doctor PASS
```

---

## 8. 场景 G：把任务交给 AI 代办

快速入口已经放在本指南开头。这里作为补充提醒：你作为用户主要看结果和确认点，不需要审查 AI 内部每条 `/sdd:*` 指令。

每次代办结束，至少应能看到：

- 当前 `run_id` 和 `task_id`。
- task 状态、verify 结果和 sync-back 状态。
- 生成或消费的 artifact 路径。
- blocking gaps 或需要你确认的原因。
- 下一步推荐命令。

如果你要配置 Claude Code、审查 `/sdd` 入口行为，或让 AI 严格遵守 status-first / artifact / sync-back 策略，请阅读 [`AI README`](ai-readme.md)。

---

## 9. 场景 H：只做状态检查或审计

### 9.1 看项目整体状态

```bash
sdd status --branch master
```

### 9.2 看一个 task

```bash
sdd tasks inspect T001 --branch master
```

### 9.3 看一个 run

```bash
sdd run inspect <run_id> --json
```

### 9.4 看 run 列表

```bash
sdd run list --json
```

### 9.5 重建和查询本地 run index

```bash
sdd run index rebuild --json
sdd run index inspect --json
sdd run index query --task T001 --json
```

run index 是 derived view，可以重建；真实证据仍在 `.sdd/runs/<run_id>/`。

---

## 10. 场景 I：doctor、失败 run 和 archive

### 10.1 正常健康检查

```bash
sdd doctor
```

检查：

- git repo
- `.sdd/project.yml`
- `.sdd/runs`
- run evidence
- local run index
- specs dir
- generated AI entries
- Phase 3 contracts

### 10.2 只检查最新 run

```bash
sdd doctor --latest-only
```

适合日常开发，避免旧 run 噪声干扰。

### 10.3 检查所有 run，包括 archived

```bash
sdd doctor --all-runs
```

适合历史审计。

### 10.4 归档失败探索 run

如果一个失败 run 是探索或废弃路径，不要删除 `.sdd/runs` 证据。使用 archive：

```bash
sdd run archive <run_id> --reason "exploratory run superseded"
sdd doctor
```

archive 会：

- 保留 state/events/artifacts。
- 将仍在 `RUNNING` 的 delegation 标记为 `CANCELLED`。
- 让默认 doctor 跳过 archived run。
- `--all-runs` 仍可审计历史证据。

---

## 11. 场景 J：artifact 常见问题

### 11.1 artifact 路径写错

错误示例：

```yaml
artifacts:
  - README.md
  - src/app.ts
```

正确做法：

```yaml
artifacts:
  - artifacts/validation-T001.md
```

源码、测试文件、命令输出写在：

```markdown
## Evidence

- README.md was updated.
- `npm test` passed.
```

### 11.2 artifact 没有引用自身

每个 artifact 的 `artifacts:` 至少应包含当前 artifact 自己：

```text
artifacts/review-T001.md
```

### 11.3 validator 没有 exact Acceptance text

`verify` 是确定性匹配。validator artifact 必须包含 task Acceptance 原文。

推荐始终用：

```bash
sdd artifact template artifacts/validation-T001.md --task T001 --agent validator --branch master
```

模板会生成 `## Acceptance Mapping`。

### 11.4 先 validate 再 do

```bash
sdd artifact validate <run_id> artifacts/validation-T001.md --task T001 --agent validator
```

不要等 `do` 或 `verify` 才发现 artifact contract 错误。

---

## 12. 场景 K：任务图、wave、background、worktree 高级能力

普通用户主路径不需要这些命令。它们用于平台化扩展、调试或高级编排。

### 12.1 任务图

```bash
sdd graph inspect --branch master --json
```

用于查看：

- depends_on
- affected_files overlap
- missing dependency
- cycle diagnostics

### 12.2 wave planner

```bash
sdd wave inspect --branch master --json
```

用于查看 task dependency waves 和 gate。

### 12.3 wave executor

```bash
sdd wave run --branch master --strategy fast-stop
sdd wave executor <run_id> --json
```

用于 planner-driven wave execution。它不会自动 `sync-back apply`。

### 12.4 background executor

```bash
sdd background run T001 --run <run_id> --agent implementer --artifact artifacts/implement-T001.md
sdd background inspect <run_id> --json
```

Phase 3.15 后，普通用户不需要把它当主路径；`sdd do task` 已经会走 ingestion-aware path。

### 12.5 worktree lifecycle

```bash
sdd worktree create <run_id> <task_id>
sdd worktree inspect <run_id> --json
sdd worktree keep <run_id> <worktree_id>
sdd worktree remove <run_id> <worktree_id>
```

用于隔离执行和生命周期记录。默认用户主路径不自动创建 worktree。

---

## 13. 场景 L：治理和风险确认

### 13.1 查看治理策略

```bash
sdd governance inspect --json
```

### 13.2 评估操作是否需要确认

```bash
sdd governance evaluate background_executor --json
sdd governance evaluate destructive_git --json
sdd governance evaluate destructive_git --approved --json
```

治理策略会处理：

- 并发上限
- destructive/shared-state action confirmation
- risky operation escalation
- background executor gate

平台默认不会替你绕过 Claude Code permission prompt，也不会自动批准危险操作。

---

## 14. 场景 M：常见状态与处理方式

### 14.1 `sdd status` 推荐 inspect task

```text
next sdd tasks inspect T001 --branch master
```

处理：

```bash
sdd tasks inspect T001 --branch master
```

确认 Boundary/Acceptance/gaps 后再进入 `do`。

### 14.2 `tasks gaps` 报缺 Boundary 或 Acceptance

原因通常是 companion sections 写错位置。

检查 `tasks.md`：

````markdown
```sdd-task
id: T001
...
```

#### Boundary

- ...

#### Acceptance

- ...
````

不要把 `#### Boundary` / `#### Acceptance` 放进 fenced block 内。

### 14.3 `do` blocked before implementation

先看 gaps：

```bash
sdd tasks inspect <task_id> --branch <branch>
sdd tasks gaps --branch <branch>
```

不要通过 artifact 绕过 task blocking gaps。

### 14.4 `artifact validate` invalid

常见原因：

- artifact path 没以 `artifacts/` 开头。
- `artifacts:` 没包含当前 artifact 自己。
- task/agent/status 不匹配。
- `sdd-result` fenced block 缺字段。

处理：重新生成模板：

```bash
sdd artifact template artifacts/review-T001.md --task T001 --agent reviewer --branch master
```

### 14.5 `verify` BLOCKED

常见原因：

- validator artifact 没有 exact Acceptance text。
- validation evidence 不足。
- task 本身仍有 blocking gaps。

处理：

```bash
sdd run inspect <run_id>
sdd artifact validate <run_id> artifacts/validation-T001.md --task T001 --agent validator
sdd tasks inspect T001 --branch master
```

### 14.6 latest run PASS 但 tasks.md 仍 pending

这是正常状态，说明还没写回。

```bash
sdd sync-back inspect <run_id> --branch master --task T001
sdd sync-back apply <run_id> --branch master --task T001
```

如果 inspect 输出 `approval_required=true`，第二条命令需要追加 `--approved`，且应先完成复杂任务的人为确认。

### 14.7 doctor 报 generated entry drift

```bash
sdd update
sdd update --check
sdd doctor
```

### 14.8 doctor 报 local run index stale

```bash
sdd run index rebuild --json
sdd doctor --latest-only
```

---

## 15. 推荐使用模式

### 15.1 小改动：direct

如果边界非常清楚，可以走轻量模式：

```text
status -> task inspect -> implement -> artifact template/validate -> do -> verify -> sync-back inspect -> direct apply
```

不要为了很小的改动强行扩展成复杂多阶段计划。

### 15.2 中等改动：compact

推荐完整写一个 task：

```text
intent/mini-spec -> task boundary -> do -> verify -> sync-back inspect -> apply_policy
```

如果 `sync-back inspect` 判断为 direct，就可以直接 apply；如果判断为 confirm，需要人工确认后 `--approved`。

### 15.3 大改动：full

推荐拆成多个 graph-ready tasks：

```text
spec -> plan -> tasks(multiple waves) -> graph inspect -> wave inspect -> task-by-task do/verify -> sync-back
```

这是大任务生命周期，不是每次人机协作都必须完整走一遍。

如果存在高风险共享状态、数据库、CI/CD、外部系统或 destructive action，应先明确 human checkpoint。

### 15.4 平台能力验证

推荐用临时仓库跑 full-chain smoke：

```text
npm install -g sdd-agent-platform@latest -> target git init -> sdd init -> write specs -> run workflow -> doctor -> npm uninstall -g
```

---

## 16. 安全边界

默认不做：

- 自动 commit / push。
- 自动 force push。
- 自动创建 PR / issue / comment。
- 自动修改共享基础设施。
- 未经确认就对复杂任务执行 `sync-back apply --approved`。
- 自动 worktree。
- 自动 background write agent。
- 自动跨 wave 并发执行所有任务。

必须显式确认：

- `sync-back inspect` 输出 `approval_required=true` 后写回 `tasks.md`。
- 刷新真实目标仓库 `.claude` entries。
- 修改依赖、CI/CD、部署配置。
- destructive git 操作。
- 对外可见操作。

---

## 17. 命令速查

```bash
# install / update
sdd --version
sdd --help
sdd init [--force] [--ai auto|claude-code|none] [--branch <branch>] [--no-scaffold-docs]
sdd update [--check] [--ai auto|claude-code]

# status / doctor
sdd status [--branch <branch>] [--json]
sdd doctor [--latest-only] [--all-runs]

# instructions
sdd instructions [overview|init|doctor|update|spec|plan|tasks|do|verify|run-task|verify-task] [--json]

# tasks
sdd tasks format
sdd tasks list [--branch <branch>]
sdd tasks inspect <task_id> [--branch <branch>]
sdd tasks gaps [--branch <branch>]

# run
sdd run create
sdd run status <run_id>
sdd run list [--json]
sdd run inspect <run_id> [--json]
sdd run archive <run_id> [--reason <text>]
sdd run index rebuild|inspect|query [options]

# artifact
sdd artifact template <artifacts/path.md> --task <task_id> --agent <agent> [--branch <branch>] [--status <status>]
sdd artifact validate <run_id> <artifacts/path.md> [--task <task_id>] [--agent <agent>] [--json]
sdd artifact ingestions <run_id> [--json]

# main workflow
sdd do task <task_id> [--branch <branch>] [--run <run_id>] \
  [--implement-artifact <path>] \
  --review-artifact <path> \
  --validation-artifact <path>

sdd verify task <task_id> --branch <branch> --run <run_id> \
  [--review-artifact <path>] \
  [--validation-artifact <path>]

sdd sync-back inspect <run_id> [--branch <branch>] [--task <task_id>] [--json]
sdd sync-back apply <run_id> [--branch <branch>] [--task <task_id>] [--approved] [--json]

# advanced
sdd graph inspect [--branch <branch>] [--json]
sdd wave inspect [--branch <branch>] [--json]
sdd wave run [options]
sdd background run <task_id> [options]
sdd governance inspect|evaluate [options]
sdd worktree create|inspect|keep|remove [options]
```

---

## 18. 最短成功路径示例

```bash
sdd init --ai claude-code
sdd status --branch master

# Replace specs/master/spec.md, plan.md, tasks.md with real content.
sdd tasks inspect T001 --branch master
sdd tasks gaps --branch master

sdd run create

sdd artifact template artifacts/implement-T001.md --task T001 --agent implementer --branch master \
  > .sdd/runs/<run_id>/artifacts/implement-T001.md
sdd artifact template artifacts/review-T001.md --task T001 --agent reviewer --branch master \
  > .sdd/runs/<run_id>/artifacts/review-T001.md
sdd artifact template artifacts/validation-T001.md --task T001 --agent validator --branch master \
  > .sdd/runs/<run_id>/artifacts/validation-T001.md

# Append Evidence sections to artifacts, then validate.
sdd artifact validate <run_id> artifacts/implement-T001.md --task T001 --agent implementer
sdd artifact validate <run_id> artifacts/review-T001.md --task T001 --agent reviewer
sdd artifact validate <run_id> artifacts/validation-T001.md --task T001 --agent validator

sdd do task T001 --branch master --run <run_id> \
  --implement-artifact artifacts/implement-T001.md \
  --review-artifact artifacts/review-T001.md \
  --validation-artifact artifacts/validation-T001.md

sdd artifact ingestions <run_id> --json
sdd verify task T001 --branch master --run <run_id> \
  --review-artifact artifacts/review-T001.md \
  --validation-artifact artifacts/validation-T001.md

sdd sync-back inspect <run_id> --branch master --task T001
sdd sync-back apply <run_id> --branch master --task T001

# If sync-back inspect prints approval_required=true, confirm first and use:
# sdd sync-back apply <run_id> --branch master --task T001 --approved
sdd run index rebuild --json
sdd doctor --latest-only
```

成功标准：

```text
sdd do task -> completed
sdd artifact ingestions -> valid=true, 3 records
sdd verify task -> PASS
sdd sync-back apply -> applied=true, or approval_required=true before confirmed complex write-back
sdd doctor --latest-only -> PASS
```
