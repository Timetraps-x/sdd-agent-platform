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
| 验收 | 自然语言总结 | `.sdd/runtime.sqlite` + branch evidence artifacts + acceptance coverage |
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
node ./packages/cli/dist/main.js --help
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

`/sdd` 会先读取 `sdd status`，再根据 CLI/core 的 recommended next command 判断下一步是补 spec、写 plan、拆 tasks、执行 task、运行 `/sdd:test`，还是处理 sync-back。

## 主工作流

常见单任务路径如下。`/sdd:test` 是当前主运行时门禁；`sdd verify task` 只保留给兼容诊断和旧 run replay。

```bash
# 读状态、任务边界和路由
sdd status --branch master
sdd tasks inspect <task_id> --branch master
sdd tasks route <task_id> --branch master

# 确保 verify contract 与 tasks.md 一致
sdd verifies inspect --branch master
sdd verifies write --branch master --force   # 仅在缺失或 stale 时刷新

# 执行 task。若 review-lite / validation gate 要求外部 artifacts，先用 artifact template/validate 补齐后重跑。
sdd do task <task_id> --branch master --approved \
  --review-artifact artifacts/review-<task_id>.md \
  --validation-artifact artifacts/validation-<task_id>.md

# 执行验证命令、生成 test evidence、判断 acceptance coverage
sdd test task <task_id> --branch master --run <run_id>

# 写回前先 inspect；复杂/跨 branch 场景按 approval card 决定是否加 --approved
sdd sync-back inspect <run_id> --task <task_id> --branch master
sdd sync-back apply <run_id> --task <task_id> --branch master [--approved]

# 可选：让前台 subagent 做观察/调研，主 agent 先消费 digest，需要时再 deep-read artifact
sdd subagents run <task_id> --branch master --run <run_id> --agent observer --json

# 出货前本地只读门禁
sdd ship --branch master --dry-run
```

subagent 输出的 `agents[].digest`、`summaryRefs` 和 `doNotReadUnlessNeededRefs` 用于主 agent 快速消费观察结果；它们始终是 non-authoritative guidance，不能替代 `/sdd:test`、sync-back、ship 或最终风险判断。

## 核心事实源

| 事实源 | 含义 |
|---|---|
| `specs/<partition>/spec.md` | 需求、范围、验收标准 |
| `specs/<partition>/plan.md` | 设计方案、风险控制、验证矩阵 |
| `specs/<partition>/tasks.md` | 可执行 task、边界、artifact 要求 |
| `specs/<partition>/verify.md` | 验证设计契约；独立于 task planning / implementation authority |
| `.sdd/runtime.sqlite` | runtime state、events、projections、evidence ledger 的事实源 |
| `.sdd/run-index.json` | 可重建的本地查询索引，不是权威事实源 |
| `.sdd/runs/<branchSlug>/evidence/artifacts/*` | branch-scoped review / validation / test / subagent artifacts |
| `.claude/**` | managed AI entry projection，不是手写事实源 |

## 文档地图

| 文档 | 面向对象 | 用途 |
|---|---|---|
| [用户指南](docs/user-guide.md) | 人类用户 | 安装、初始化、执行任务、`/sdd:test`、sync-back、subagent digest、doctor、常见问题 |
| [AI README](docs/ai-readme.md) | Claude Code / AI 操作者 | status-first、artifact、task boundary、sync-back 策略 |
| [文档信息架构](docs/documentation-information-architecture.md) | 维护者 | Markdown 分类、迁移风险、当前入口地图 |
| [命令信息架构](docs/architecture/command-information-architecture.md) | 平台维护者 | CLI 命令分层、入口职责和用户路径 |
| [架构设计](docs/architecture/sdd-agent-platform-architecture.md) | 平台维护者 | 平台架构和核心设计 |
| [Lifecycle Decision Model](docs/architecture/lifecycle-decision-model.md) | 平台维护者 | direct / compact / full / research 的决策模型 |
| [Phase artifacts index](specs/master/phases/README.md) | 平台维护者 | 本仓库 SDD phase 归档入口 |
| [Phase status](specs/master/phases/PHASE_STATUS.md) | 平台维护者 | 当前阶段状态；截至 Phase 8 coding runtime convergence completed，Phase 9 code graph signals planned |

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

健康检查按需要单独运行 `sdd doctor fast --branch master`；如果本地 run index 与 runtime.sqlite 漂移，先运行 `sdd run index rebuild`，再判断是否属于当前验证范围。

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

截至当前主线文档，Phase 1~7 已完成平台编排、入口投影、分发、harness engineering、agent/skill/team runtime、storage v2、verification/test、sync-back/ship 和 core modularization 等基础；Phase 8 已定稿为 Coding Runtime Convergence：围绕 verifies-centered lifecycle、`/sdd:test` 主运行时门禁、risk workflow gates、subagent 非授权边界、context offload、task-scoped sync-back readiness 和 ship diagnostics/readiness 语义收敛。代码知识图谱不再作为 Phase 8 当前目标，顺延为 Phase 9 Code Graph Signals，并只能作为可选风险、上下文、test-impact、status/doctor 信号源。