# SDD Agent Platform

SDD Agent Platform 是一个本地优先的规格驱动开发（SDD）与 Claude Code subagent workflow 平台。它把需求、计划、任务边界、运行状态、agent 证据、验证结果和 sync-back 写回串成一条可审计的本地证据链。

它不是 Spec Kit、GSD、OpenSpec、BMAD 或 Oh My OpenCode 的封装，而是吸收这些工具的共同机制后，为 Claude Code 工作流设计的一套 CLI/core harness。

核心目标：

```text
Controlled phase transitions, automated intra-phase orchestration.
阶段推进可控，阶段内编排自动化。
```

同时坚持：

```text
Sufficient SDD, not maximum SDD.
只做足以安全完成当前需求的规格化，不多做，不少做。
```

## 适合解决什么问题

普通 agent 可以直接改代码，但在高风险任务里容易把需求边界、状态流转、并发、数据库、审查、验证和写回混在主会话里。SDD Agent Platform 在 Claude Code 外增加一层可检查的工程约束：

| 维度 | 普通 agent 直接执行 | SDD Agent Platform |
|---|---|---|
| 路径选择 | 依赖 prompt 判断 | lifecycle decision 选择 direct / compact / full / research |
| 任务边界 | 容易随实现扩大 | `sdd tasks inspect` 固定 Boundary / Acceptance / affected files |
| agent 参与 | 证据混在主会话 | implementer / reviewer / validator 输出 run-relative artifacts |
| 验收 | 自然语言总结 | `.sdd/runs/<run_id>/artifacts` + acceptance coverage |
| 写回 | 人工记得改状态 | `sync-back inspect/apply` 显式回流到 `tasks.md` |
| 健康检查 | 临时脚本 | `sdd doctor` 检查配置、run evidence、generated entry drift |

## 5 分钟快速开始

### 1. 安装 CLI

普通用户不需要 clone 本仓库：

```bash
npm install -g sdd-agent-platform@latest
sdd --version
sdd --help
```

卸载：

```bash
npm uninstall -g sdd-agent-platform
```

平台开发者本地验证可使用构建后的 dist CLI：

```bash
npm run build
node ./dist/packages/cli/src/main.js --help
```

### 2. 在目标项目初始化

在目标 Git 仓库中执行：

```bash
sdd init --ai claude-code
sdd status
sdd doctor
```

初始化后会稳定出现：

```text
.sdd/project.yml
.sdd/runs/
.claude/commands/...      # managed generated entries
.claude/skills/sdd/...    # managed generated skill
```

`sdd init` 是项目级接入，不是每个 branch 都要重复执行的 workflow 入口。具体需求进入哪个 workflow partition，由当前 Git branch 或显式 `--branch` 决定；`specs/<partition>/spec.md`、`plan.md`、`tasks.md` 通常由 `/sdd:spec`、`/sdd:plan`、`/sdd:tasks` 逐步建立，或在显式 `--scaffold-docs` 时生成 starter docs。

### 3. 在 Claude Code 里继续

如果已经生成 Claude Code 入口，在项目里输入：

```text
/sdd
```

`/sdd` 会先读取 `sdd status`，再根据 CLI/core 的 recommended next command 判断下一步是补 spec、写 plan、拆 tasks、执行 task、verify，还是处理 sync-back。

## 主工作流

常见单任务路径如下：

```bash
# 读状态和任务边界
sdd status --branch master
sdd tasks inspect <task_id> --branch master
sdd tasks route <task_id> --branch master

# 创建 run
sdd run create

# 用真实 run 写入 artifacts 模板
sdd artifact template artifacts/implement-<task_id>.md --task <task_id> --agent implementer --branch master --run <run_id> --write
sdd artifact template artifacts/review-<task_id>.md --task <task_id> --agent reviewer --branch master --run <run_id> --write
sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator --branch master --run <run_id> --write

# 填写 Evidence 后先校验 artifact
sdd artifact validate <run_id> artifacts/implement-<task_id>.md --task <task_id> --agent implementer
sdd artifact validate <run_id> artifacts/review-<task_id>.md --task <task_id> --agent reviewer
sdd artifact validate <run_id> artifacts/validation-<task_id>.md --task <task_id> --agent validator

# 执行、验证、写回
sdd do task <task_id> --branch master --run <run_id> \
  --implement-artifact artifacts/implement-<task_id>.md \
  --review-artifact artifacts/review-<task_id>.md \
  --validation-artifact artifacts/validation-<task_id>.md

sdd verify task <task_id> --branch master --run <run_id>
sdd sync-back inspect <run_id> --task <task_id> --branch master
sdd sync-back apply <run_id> --task <task_id> --branch master
```

复杂或高风险任务如果 `sync-back inspect` 输出 `approval_required=true`，必须人工确认后才使用 `--approved`。

## 核心事实源

| 事实源 | 含义 |
|---|---|
| `specs/<branch>/spec.md` | 需求、范围、验收标准 |
| `specs/<branch>/plan.md` | 设计方案、风险控制、验证矩阵 |
| `specs/<branch>/tasks.md` | 可执行 task、边界、artifact 要求 |
| `.sdd/runs/<run_id>/state.json` | 运行状态 |
| `.sdd/runs/<run_id>/events.jsonl` | 运行事件 |
| `.sdd/runs/<run_id>/artifacts/*.md` | implement/review/validation/coverage 证据 |
| `.claude/**` | managed AI entry projection，不是手写事实源 |

## 文档地图

| 文档 | 面向对象 | 用途 |
|---|---|---|
| [用户指南](docs/user-guide.md) | 人类用户 | 安装、初始化、执行任务、verify、sync-back、doctor、常见问题 |
| [AI README](docs/ai-readme.md) | Claude Code / AI 操作者 | status-first、artifact、task boundary、sync-back 策略 |
| [文档信息架构](docs/documentation-information-architecture.md) | 维护者 | Markdown 分类、迁移风险、当前入口地图 |
| [命令信息架构](docs/architecture/command-information-architecture.md) | 平台维护者 | CLI 命令分层、入口职责和用户路径 |
| [架构设计](docs/architecture/sdd-agent-platform-architecture.md) | 平台维护者 | 平台架构和核心设计 |
| [Lifecycle Decision Model](docs/architecture/lifecycle-decision-model.md) | 平台维护者 | direct / compact / full / research 的决策模型 |
| [Phase artifacts index](specs/master/phases/README.md) | 平台维护者 | 本仓库 SDD phase 归档入口 |
| [Phase status](specs/master/phases/PHASE_STATUS.md) | 平台维护者 | 当前阶段状态；截至 Phase 7.0 core modularization completed，Phase 8.0 code graph planned |

研究与历史分析材料保留在 `docs/research/`；runtime contract assets 保留在 `commands/`、`agents/`、`templates/`、`workflows/` 等目录，不作为普通 Markdown 文档搬迁。

## 项目结构

```text
packages/          TypeScript runtime 与 CLI
commands/          Claude Code 命令入口说明源材料
agents/            SDD lifecycle agent contract
templates/         spec / plan / tasks / project / sync-back 模板
workflows/         阶段 workflow contract
adapters/          项目适配模板
schemas/           runtime、artifact 与 contract pack
docs/              用户、AI、架构、研究文档
specs/             本项目自身的 SDD 文档
.sdd/              本地运行状态和证据
context/           项目记忆与决策上下文
```

## 本地开发

```bash
npm run typecheck
npm test
npm run build
npm pack --dry-run --json
```

常用只读 CLI smoke：

```bash
npm run sdd -- status --branch master
npm run sdd -- instructions overview --json
npm run sdd -- tasks list --branch master
```

健康检查按需要单独运行 `sdd doctor --latest-only`；如果本地 generated entries 或历史 run evidence 有已知漂移，应先判断是否属于当前验证范围。

## npm 发布维护速查

普通安装路径是：

```bash
npm install -g sdd-agent-platform@latest
```

平台维护者发布新版本时，先完成本地验证和 dry-run：

```bash
npm whoami
npm publish --dry-run
```

真实发布必须显式确认后执行：

```bash
npm publish --access public
```

如果真实发布返回 `EOTP` 并提示打开 `https://www.npmjs.com/auth/cli/...`，这是 npm security-key/browser authentication 流程，不是 Google Authenticator 扫码页。发布人应在本机终端或 Claude Code prompt 中执行 `! npm publish --access public`，打开终端里完整的 npm auth URL，按页面完成 security key / passkey / Windows Hello / browser authentication；如果命令已经退出，认证后重新执行 `npm publish --access public`。

发布成功后验证：

```bash
npm view sdd-agent-platform name version --json
npm install -g sdd-agent-platform@latest
sdd --version
# clean Git repo
sdd init --ai claude-code
sdd status
sdd doctor
```

不要把长期 npm token、`.npmrc`、recovery code 写入仓库、文档或对话。recovery code 不能转换成 Google Authenticator OTP；已经发布过的版本不能覆盖，后续发包必须先 bump version。

## 安全边界

默认不做：

- 自动 commit / push / force push。
- 自动创建 PR、issue、外部评论或修改共享系统。
- 自动执行 destructive git、清理未提交变更或删除历史 run evidence。
- 未经确认对复杂任务执行 `sync-back apply --approved`。
- 把 `.claude/**`、`commands/**`、`agents/**`、`templates/**`、`workflows/**` 当作普通文档随意搬迁。

已有未提交变更不应阻塞 SDD workflow；正确做法是通过 branch/partition、run evidence、artifact 和 sync-back 策略隔离风险，而不是要求工作树必须干净。

## 当前状态

截至当前主线文档，Phase 1~6 已完成到 Phase 6.10：全局安装、project init/update、Claude Code entry projection、artifact UX、run index、governance、wave/background/worktree contracts、agent/skill/team runtime、resident worker、声明式 runtime registry、`/sdd:spec` 分区入口、多分支 run 隔离、runtime trust、context budget 和 non-authoritative log worker boundary 已进入主路径。Phase 7.0 正在执行 Core Runtime Modularization：以 package-local build、explicit core subpath exports、domain façade 和 CLI/core import boundary 收敛 core，并继续拆分 doctor、router/routing、CLI registry 职责；原代码知识图谱顺延为 Phase 8.0 planned。