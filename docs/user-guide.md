# SDD Agent Platform 用户指南

这份指南面向人类用户：你想把一个项目接入 SDD，并在 Claude Code 里用 `/sdd` 系列入口推进需求。Claude Code 或其他 AI 操作者的执行约束见 [AI README](ai-readme.md)。

## 1. 最短成功路径

如果 `sdd` 已经可用，在目标 Git 仓库中执行：

```bash
sdd init --ai claude-code
sdd status
sdd doctor
```

然后打开 Claude Code，在项目里输入：

```text
/sdd
```

你不需要先记完整生命周期。`/sdd` 会读取当前状态，并告诉你下一步是补 spec、写 plan、拆 tasks、执行 task、验证，还是处理 sync-back。

成功接入后，项目里会稳定出现：

```text
.sdd/project.yml
.sdd/runs/
.claude/commands/...      # managed generated entries
.claude/skills/sdd/...    # managed generated skill
```

`specs/<partition>/spec.md`、`plan.md`、`tasks.md` 是 workflow 文档，通常在 `/sdd:spec`、`/sdd:plan`、`/sdd:tasks` 阶段逐步建立；只有显式 `--scaffold-docs` 或旧式 `--branch` starter-docs 路径才会在 init 时生成。

## 2. 安装、更新与卸载

### 2.1 安装

普通用户不需要 clone 平台仓库：

```bash
npm install -g sdd-agent-platform@latest
sdd --version
sdd --help
```

平台开发者本地调试才需要使用源码构建路径：

```bash
npm run build
node ./dist/packages/cli/src/main.js status
```

### 2.2 更新

```bash
npm install -g sdd-agent-platform@latest
sdd --version
```

### 2.3 卸载

```bash
npm uninstall -g sdd-agent-platform
```

卸载 CLI 不会删除目标项目中的 `specs/`、`.sdd/runs/`、源码或 artifacts。

## 3. 初始化项目

在目标 Git 仓库中执行：

```bash
sdd init --ai claude-code
sdd status
sdd doctor
```

`sdd init` 是项目级接入。它负责 `.sdd/project.yml`、`.sdd/runs/`、Claude Code managed entries。它不是每个 branch 都要重复执行的 workflow 入口，也不默认替每个 partition 写完整 `spec.md / plan.md / tasks.md`。

如果需要初始化时生成 starter docs：

```bash
sdd init --ai claude-code --scaffold-docs
```

如果要显式跳过 starter docs，可以写明：

```bash
sdd init --ai claude-code --no-scaffold-docs
```

如果已有 `specs/master/spec.md`、`plan.md`、`tasks.md`，默认不会覆盖；只有显式 `--force` 才覆盖。

## 4. Branch / partition 怎么理解

SDD workflow 文档按 partition 存放，通常对应 Git branch：

```text
specs/master/spec.md
specs/master/plan.md
specs/master/tasks.md

specs/feature-x/spec.md
specs/feature-x/plan.md
specs/feature-x/tasks.md
```

常用方式：

```bash
# 使用当前 Git branch 对应的 partition
sdd status

# 明确读取 master partition，即使当前工作树在其他 Git branch
sdd status --branch master
sdd tasks inspect <task_id> --branch master
```

当当前 Git branch 和你要执行的 SDD partition 不一致时，命令里显式加 `--branch <branch>`。已有未提交变更不应成为 SDD workflow 的阻塞条件；真正的安全边界来自 task boundary、run evidence、artifact、sync-back policy 和 destructive 操作确认。

## 5. 在 Claude Code 里怎么用

### 5.1 只先记住这 7 个入口

| 你想做什么 | 在 Claude Code 中输入 | 结果 |
|---|---|---|
| 不知道下一步 | `/sdd` | 读取状态并给出推荐下一步 |
| 新需求还没写清楚 | `/sdd:spec` | 帮你补 requirements / scope / acceptance |
| 需求清楚但方案未定 | `/sdd:plan` | 从 spec 推导方案、风险控制、验证矩阵 |
| 要拆任务 | `/sdd:tasks` | 生成或检查 graph-ready task blocks |
| 要执行一个任务 | `/sdd:do` | 围绕一个 task 生成证据并执行主路径 |
| 要验证任务完成情况 | `/sdd:verify` | 做 goal-level acceptance coverage verify |
| 只检查健康状态 | `/sdd:doctor` | 检查 run evidence、artifact、状态漂移 |

最常用的是 `/sdd`。不确定下一步时，不要猜命令，先让它读状态。

### 5.2 你需要关注的确认点

你不需要审查 AI 内部每条命令，但需要看这些结果：

1. **状态优先**：它有没有先读 `sdd status`。
2. **边界明确**：它是否只推进一个 task，并遵守 Boundary / Acceptance。
3. **证据足够**：implementer / reviewer / validator artifacts 是否存在并覆盖验收。
4. **写回安全**：`sync-back inspect` 的 `apply_policy` 是 direct 还是 confirm。
5. **外部影响**：是否涉及 commit、push、PR、数据库、CI/CD、共享系统或 destructive 操作。

## 6. 编写 spec / plan / tasks

### 6.1 spec.md 写什么

`spec.md` 是需求契约，不是技术方案。它说明为什么做、为谁做、做什么、不做什么、怎样验收，以及哪些风险会触发生命周期门禁。

建议包含：

- Objective / Customer Value
- Users / Actors
- User Stories / Scenarios
- Scope: in scope / out of scope
- Functional / Non-functional Requirements
- Acceptance Criteria，使用稳定 ID，例如 `AC-1`
- Assumptions / Dependencies
- Risks / Hard Gates
- Lifecycle Decision Reference

### 6.2 plan.md 写什么

`plan.md` 是从 spec 到 tasks 的交付级方案文档。它说明当前状态、目标设计、组件影响、关键决策、风险控制、兼容/回滚、验证矩阵和任务拆分理由。

高风险场景要补充相应设计：

| 风险 | plan 中应补充 |
|---|---|
| state-machine | 状态设计、状态图、非法转移处理 |
| concurrency | 时序图、事务边界、一致性策略 |
| database | schema / migration / rollback / 数据修复 |
| api_schema | 兼容性、调用方影响、版本策略 |
| security / sql | 输入边界、权限、注入风险控制 |

### 6.3 tasks.md 写什么

`tasks.md` 是执行证据契约，不是普通 TODO list。每个 task 应包含 metadata block 和 companion sections。

先查看标准格式：

```bash
sdd tasks format
```

最小结构：

````markdown
### T001: Add README quick start

```sdd-task
id: T001
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
plan_refs:
  - "§13 Validation Plan"
affected_files:
  - README.md
validation:
  - sdd status --branch master
risk: []
agent_fit:
  - implementer
  - reviewer
allowed_agents:
  - implementer
  - reviewer
required_artifacts:
  - artifacts/implement-T001.md
  - artifacts/review-T001.md
  - artifacts/validation-T001.md
verification_availability:
  - inspect:README.md
autonomy: direct_execution_allowed
```

#### Boundary

Allowed:

- Modify README.md only.

Forbidden:

- Do not change CLI behavior.

#### Acceptance

- AC-1: README contains a Quick Start section.

#### Definition of Done

- Boundary respected.
- Validation evidence is available.
````

`#### Boundary`、`#### Acceptance`、`#### Definition of Done`、`#### Evidence Expectations`、`#### Implementation Notes` 必须放在 fenced block 外。

检查任务是否可执行：

```bash
sdd tasks list --branch master
sdd tasks inspect T001 --branch master
sdd tasks gaps --branch master
```

如果有 blocking gaps，先修 `tasks.md`，不要进入 `do`。

## 7. 执行一个任务

这是普通用户最常用的单任务主路径。

### 7.1 查看状态和任务

```bash
sdd status --branch master
sdd tasks inspect T001 --branch master
sdd tasks route T001 --branch master
```

确认：

- task status 是 `pending`。
- Boundary 明确。
- Acceptance 可验证。
- affected_files 不为空。
- validation 不为空。
- gaps 为 0。

### 7.2 创建 run

```bash
sdd run create
```

记录输出中的 `<run_id>`。

### 7.3 在 task Boundary 内完成变更

例如 task 只允许改 README，就不要改源码、配置、模板或 `.claude` generated entries。

SDD runtime 不会替你判断业务代码正确性；你需要执行 task 的 validation commands，并把证据写入 artifacts。

### 7.4 生成 result artifacts

推荐使用 `--run <run_id> --write`，让 CLI 直接把合法模板写到 run artifact 目录：

```bash
sdd artifact template artifacts/implement-T001.md --task T001 --agent implementer --branch master --run <run_id> --write
sdd artifact template artifacts/review-T001.md --task T001 --agent reviewer --branch master --run <run_id> --write
sdd artifact template artifacts/validation-T001.md --task T001 --agent validator --branch master --run <run_id> --write
```

然后在每个 artifact 里补充 `## Evidence`。

规则：

- `sdd-result.artifacts` 只放 run-relative artifact 路径，例如 `artifacts/validation-T001.md`。
- 源码、测试文件、命令输出写进 `## Evidence`。
- validator artifact 必须包含 exact Acceptance text。模板会自动复制，不要改写成同义句。

### 7.5 校验 artifacts

```bash
sdd artifact validate <run_id> artifacts/implement-T001.md --task T001 --agent implementer
sdd artifact validate <run_id> artifacts/review-T001.md --task T001 --agent reviewer
sdd artifact validate <run_id> artifacts/validation-T001.md --task T001 --agent validator
```

全部 valid 后再进入 `do`。

### 7.6 执行 do

```bash
sdd do task T001 --branch master --run <run_id> \
  --implement-artifact artifacts/implement-T001.md \
  --review-artifact artifacts/review-T001.md \
  --validation-artifact artifacts/validation-T001.md
```

成功时会看到 task loop completed，并在 run state 中记录 artifact ingestion。

## 8. 验证并写回

### 8.1 goal-level verify

```bash
sdd verify task T001 --branch master --run <run_id>
```

成功后会生成：

```text
.sdd/runs/<run_id>/artifacts/acceptance-coverage-T001.md
.sdd/runs/<run_id>/artifacts/sync-back-proposal.md
```

### 8.2 sync-back inspect

```bash
sdd sync-back inspect <run_id> --branch master --task T001
```

如果输出：

```text
apply_policy=direct approval_required=false
```

说明是简单/direct-safe 任务，可以写回：

```bash
sdd sync-back apply <run_id> --branch master --task T001
```

如果输出：

```text
apply_policy=confirm approval_required=true
```

说明是复杂或高风险任务。必须先人工确认，再执行：

```bash
sdd sync-back apply <run_id> --branch master --task T001 --approved
```

写回成功后：

- `tasks.md` 中对应 task 的 `status` 变成 `completed`。
- `#### Implementation Notes` 追加 run/proposal/artifact 链接。
- run state 中 `syncBack.status` 变成 `applied`。
- event log 追加 `sync_back_applied`。

## 9. 健康检查和审计

常用检查：

```bash
sdd status --branch master
sdd doctor --latest-only
sdd run index rebuild --json
sdd update --check
```

查看 run：

```bash
sdd run inspect <run_id> --json
sdd run list --json
sdd run index query --task T001 --json
```

失败探索 run 不要删除证据，使用 archive：

```bash
sdd run archive <run_id> --reason "exploratory run superseded"
```

archive 会保留 state/events/artifacts，只让默认 doctor 跳过该 run；需要历史审计时使用 `sdd doctor --all-runs`。

## 10. 常见问题

### 10.1 `sdd status` 显示 generated entry drift

处理：

```bash
sdd update
sdd update --check
sdd doctor
```

不要手改 `.claude/commands` 或 `.claude/skills` 作为长期维护方式。

### 10.2 `tasks gaps` 报缺 Boundary 或 Acceptance

通常是 companion sections 被写进了 `sdd-task` fenced block 内。把它们移到 fenced block 外：

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

### 10.3 `artifact validate` invalid

常见原因：

- artifact path 没以 `artifacts/` 开头。
- `artifacts:` 没包含当前 artifact 自己。
- task/agent/status 不匹配。
- `sdd-result` fenced block 缺字段。
- validator artifact 没有 exact Acceptance text。

处理：重新生成模板并补充 Evidence。

### 10.4 latest run PASS 但 tasks.md 仍 pending

这是正常状态，说明还没 sync-back：

```bash
sdd sync-back inspect <run_id> --branch master --task T001
sdd sync-back apply <run_id> --branch master --task T001
```

如果 inspect 输出 `approval_required=true`，需要人工确认后追加 `--approved`。

### 10.5 当前 Git branch 不是目标 SDD partition

显式传 `--branch`：

```bash
sdd status --branch master
sdd tasks inspect T001 --branch master
sdd do task T001 --branch master --run <run_id> ...
```

不要因为存在未提交改动就重置或清理工作树。

## 11. 高级能力边界

普通用户主路径不需要这些命令：

- `sdd graph inspect`
- `sdd wave inspect`
- `sdd wave run`
- `sdd background run`
- `sdd worktree create|keep|remove`
- `sdd governance evaluate`

只有在明确验证平台能力、wave/background/worktree 或治理策略时才使用。

## 12. 平台维护者：npm 发包速查

普通用户只需要 `npm install -g sdd-agent-platform@latest`。只有平台维护者发布新版本时才使用本节。

发布前：

```bash
npm whoami
npm publish --dry-run
```

确认账号、包名、版本和 dry-run 都正确后，再由维护者显式批准真实发布。真实发布命令是：

```bash
npm publish --access public
```

如果 npm 返回 `EOTP` 并提示打开 `https://www.npmjs.com/auth/cli/...`，不要等待 Google Authenticator 扫码页。`npm publish` 不会展示 authenticator app 的绑定二维码；二维码只会在 npm Account / Security / Two-Factor Authentication 里新增或重置 authenticator app 时出现。

security-key/browser authentication 的快速处理方式：

1. 让发布人自己在本机终端或 Claude Code prompt 中执行 `! npm publish --access public`，以便看到完整 npm browser auth URL。
2. 打开终端里的完整 `https://www.npmjs.com/auth/cli/...` 链接。
3. 按 npm 页面完成 security key、passkey、Windows Hello 或浏览器认证。
4. 如果 publish 命令已经退出，完成浏览器认证后重新执行 `npm publish --access public`。
5. 成功后验证公开包：`npm view sdd-agent-platform name version --json`、`npm install -g sdd-agent-platform@latest`、`sdd --version`。
6. 再在 clean Git repo 中验证：`sdd init --ai claude-code`、`sdd status`、`sdd doctor`。

注意：recovery code 不能转换成 Google Authenticator 的 6 位 OTP；长期 npm token、`.npmrc`、recovery code 都不要写入仓库、文档或对话。已发布过的版本不能覆盖，后续发包必须先 bump version。

## 13. 安全边界

默认不做：

- 自动 commit / push / force push。
- 自动创建 PR、issue、comment。
- 自动修改共享基础设施、CI/CD、数据库或外部系统。
- 自动执行 destructive git 或清理未提交变更。
- 未经确认就对复杂任务执行 `sync-back apply --approved`。
- 自动把多个 task、wave 或 background executor 当成默认主路径。

必须显式确认：

- `sync-back inspect` 输出 `approval_required=true` 后写回 `tasks.md`。
- 修改依赖、CI/CD、部署配置。
- 对外可见操作。
- destructive 操作。

## 14. 命令速查

```bash
# install / update
sdd --version
sdd --help
sdd init [--force] [--ai auto|claude-code|none] [--scaffold-docs] [--no-scaffold-docs]
sdd update [--check] [--ai auto|claude-code]

# status / doctor
sdd status [--branch <branch>] [--json|--compact-json]
sdd doctor [--latest-only] [--all-runs]

# tasks
sdd tasks format
sdd tasks list [--branch <branch>]
sdd tasks inspect <task_id> [--branch <branch>]
sdd tasks route <task_id> [--branch <branch>]
sdd tasks gaps [--branch <branch>]

# run
sdd run create
sdd run inspect <run_id> [--json|--compact-json]
sdd run list [--json]
sdd run archive <run_id> [--reason <text>]
sdd run index rebuild|inspect|query [options]

# artifact
sdd artifact template <artifacts/path.md> --task <task_id> --agent <agent> [--branch <branch>] [--run <run_id> --write]
sdd artifact validate <run_id> <artifacts/path.md> [--task <task_id>] [--agent <agent>] [--json]
sdd artifact ingestions <run_id> [--json]

# main workflow
sdd do task <task_id> [--branch <branch>] [--run <run_id>] \
  [--implement-artifact <path>] \
  --review-artifact <path> \
  --validation-artifact <path>

sdd verify task <task_id> [--branch <branch>] [--run <run_id>]

sdd sync-back inspect [<run_id>] [--branch <branch>] --task <task_id> [--json]
sdd sync-back apply [<run_id>] [--branch <branch>] --task <task_id> [--approved] [--json]
```