# SDD Agent Platform

自建的 SDD + subagent workflow 平台，用于把规格驱动开发、Claude Code subagent 编排、运行状态、审查验证和项目适配沉淀为一套可持续迭代的个人 AI 开发平台。

本项目不是对 Spec Kit、GSD、BMAD、OpenSpec 或 Oh My OpenCode 的直接封装，而是吸收它们的关键机制后，设计一套适合 Claude Code 工作流的本地平台。

## 核心思想

```text
SDD 文档定义“应该做什么”
Runtime state/events/artifacts 定义“实际做到了哪里”
Agent contract 定义“谁能做什么、产出什么证据”
Project adapter 定义“不同项目如何验证”
Lifecycle decision 定义“当前需求需要多少 SDD”
AI tool entry projection 定义“如何把 CLI/core 能力投影成 Claude Code 等工具的薄入口”
```

平台遵循：

```text
Controlled phase transitions, automated intra-phase orchestration.
阶段推进可控，阶段内编排自动化。
```

同时遵循：

```text
Sufficient SDD, not maximum SDD.
只做足以安全完成当前需求的规格化，不多做，不少做。
```

## 生命周期决策

`/sdd-*` 命令是智能入口，不是固定流程入口。Phase 1.0 已完成 lifecycle decision model 调研、对比与定稿；当前以 `docs/architecture/lifecycle-decision-model.md` 的 canonical model 为准，根据需求规模、风险、不确定性和规格完整度判断最短安全路径：

```text
direct    intent -> implement -> minimal validation
compact   intent/mini-spec -> task boundary -> implement -> validation
full      spec -> plan -> tasks -> do -> verify -> sync-back
research  research -> options -> decision -> architecture artifact -> implementation spec
```

小改即使从 SDD 入口进入，也应该快速完成；复杂任务会升级到更完整的生命周期。当前 profile 已是 canonical model 的路径词汇，后续 phase 只消费该模型并落地 runtime record、command gate 与验证证据，不再重新定义算法。


## 设计原则

- Spec Kit-compatible，而不是 Spec Kit-based。
- Markdown 是 SDD 语义事实源。
- `.sdd/runs` 是 runtime 执行事实源。
- Claude Code command / skill 保持薄入口。
- TypeScript runtime 承载状态、事件、artifact、doctor、validation 等核心逻辑。
- Agent 输出优先沉淀为 artifact，而不是堆在主会话上下文中。
- 高风险操作继续交由 Claude Code 原生权限、settings、hooks 和用户确认管理。
- 平台从第一天预留未来代码知识图谱所需的 metadata。
- 命令入口先经过调研验证后的生命周期决策模型，再选择最短安全路径。
- Phase 2 命名为 AI 工具入口投影：这是 Spec Kit、GSD、OpenSpec、Oh My OpenCode/OpenAgent 共同采用的 CLI 到 AI 工具入口投影模式。

## 文档入口

- [用户使用指南（人类用户）](docs/user-guide.md)
- [AI / Claude Code README](docs/ai-readme.md)
- [架构设计方案](docs/architecture/sdd-agent-platform-architecture.md)
- [总体方案](docs/research/自建_SDD_subagent_工作流平台方案.md)
- [Lifecycle Decision Model](docs/architecture/lifecycle-decision-model.md)
- [Lifecycle Decision Model Research](docs/research/lifecycle-decision-model-research.md)
- [支持 subagent 的 SDD 工作流深度分析报告](docs/research/支持_subagent_的_SDD_工作流深度分析报告.md)
- [支持 subagent 的 SDD 工作流调研](docs/research/支持_subagent_的_SDD_工作流调研.md)

## SDD 文档

当前平台自身也使用 SDD 文档推进：

- [Phase artifacts index](specs/master/phases/README.md)
- [Phase status](specs/master/phases/PHASE_STATUS.md)
- [Phase 1.0 Lifecycle Decision Model 调研、对比与定稿](specs/master/phases/phase-1.0-lifecycle-research.md)
- [Phase 1.0 spec](specs/master/phase1.0-spec.md)
- [Phase 1.0 plan](specs/master/phase1.0-plan.md)
- [Phase 1.0 tasks](specs/master/phase1.0-tasks.md)
- [Phase 1.0 validation](specs/master/phase1.0-validation.md)
- [Phase 1.1 Architecture Baseline](specs/master/phases/phase-1.1-architecture-baseline.md)
- [Phase 1.1 spec](specs/master/phase1.1-spec.md)
- [Phase 1.1 plan](specs/master/phase1.1-plan.md)
- [Phase 1.1 tasks](specs/master/phase1.1-tasks.md)
- [Phase 1.1 validation](specs/master/phase1.1-validation.md)
- [Phase 1.2 Runtime Skeleton](specs/master/phases/phase-1.2-runtime-skeleton.md)
- [Phase 1.2 spec](specs/master/phase1.2-spec.md)
- [Phase 1.2 plan](specs/master/phase1.2-plan.md)
- [Phase 1.2 tasks](specs/master/phase1.2-tasks.md)
- [Phase 1.2 validation](specs/master/phase1.2-validation.md)
- [Phase 1.3 Contract / Templates / Adapters Pack](specs/master/phases/phase-1.3-contract-templates-adapters.md)
- [Phase 1.3 spec](specs/master/phase1.3-spec.md)
- [Phase 1.3 plan](specs/master/phase1.3-plan.md)
- [Phase 1.3 tasks](specs/master/phase1.3-tasks.md)
- [Phase 1.3 validation](specs/master/phase1.3-validation.md)
- [Phase 1.4 Commands / Agents / Workflows Pack](specs/master/phases/phase-1.4-commands-agents-workflows.md)
- [Phase 1.4 spec](specs/master/phase1.4-spec.md)
- [Phase 1.4 plan](specs/master/phase1.4-plan.md)
- [Phase 1.4 tasks](specs/master/phase1.4-tasks.md)
- [Phase 1.4 validation](specs/master/phase1.4-validation.md)
- [Phase 1.5 SDD Parser / Task Model](specs/master/phases/phase-1.5-sdd-parser-task-model.md)
- [Phase 1.5 spec](specs/master/phase1.5-spec.md)
- [Phase 1.5 plan](specs/master/phase1.5-plan.md)
- [Phase 1.5 tasks](specs/master/phase1.5-tasks.md)
- [Phase 1.5 validation](specs/master/phase1.5-validation.md)
- [Phase 1.6 Artifact / Delegation Contract](specs/master/phases/phase-1.6-artifact-delegation-contract.md)
- [Phase 1.6 spec](specs/master/phase1.6-spec.md)
- [Phase 1.6 plan](specs/master/phase1.6-plan.md)
- [Phase 1.6 tasks](specs/master/phase1.6-tasks.md)
- [Phase 1.6 validation](specs/master/phase1.6-validation.md)
- [Phase 1.7 Claude Code Command Integration](specs/master/phases/phase-1.7-claude-code-command-integration.md)
- [Phase 1.7 spec](specs/master/phase1.7-spec.md)
- [Phase 1.7 plan](specs/master/phase1.7-plan.md)
- [Phase 1.7 tasks](specs/master/phase1.7-tasks.md)
- [Phase 1.7 validation](specs/master/phase1.7-validation.md)
- [Phase 1.8 Single-task Loop](specs/master/phases/phase-1.8-single-task-loop.md)
- [Phase 1.8 spec](specs/master/phase1.8-spec.md)
- [Phase 1.8 plan](specs/master/phase1.8-plan.md)
- [Phase 1.8 tasks](specs/master/phase1.8-tasks.md)
- [Phase 1.8 validation](specs/master/phase1.8-validation.md)
- [Phase 1.9 Goal-level Verify / Doctor](specs/master/phases/phase-1.9-goal-verify-doctor.md)
- [Phase 1.9 spec](specs/master/phase1.9-spec.md)
- [Phase 1.9 plan](specs/master/phase1.9-plan.md)
- [Phase 1.9 tasks](specs/master/phase1.9-tasks.md)
- [Phase 1.9 validation](specs/master/phase1.9-validation.md)
- [Phase 1.10 Real/Synthetic Project Trial](specs/master/phases/phase-1.10-real-project-trial.md)
- [Phase 1.10 spec](specs/master/phase1.10-spec.md)
- [Phase 1.10 plan](specs/master/phase1.10-plan.md)
- [Phase 1.10 tasks](specs/master/phase1.10-tasks.md)
- [Phase 1.10 validation](specs/master/phase1.10-validation.md)
- [Phase 2.0 AI 工具入口投影与全局安装接入](specs/master/phases/phase-2.0-ai-tool-entry-projection.md)
- [Phase 4.0 NPM Package Distribution Baseline](specs/master/phases/phase-4.0-npm-package-distribution.md)
- [Phase 4.1 Package Metadata Hardening](specs/master/phases/phase-4.1-package-metadata-hardening.md)
- [Phase 4.2 Package Contents and Install Smoke](specs/master/phases/phase-4.2-package-contents-install-smoke.md)
- [Phase 4.3 NPM Publish Dry-run and Human Runbook](specs/master/phases/phase-4.3-npm-publish-dry-run-runbook.md)
- [Phase 4.4 Public Publish and Adoption](specs/master/phases/phase-4.4-public-publish-adoption.md)

## CLI 命令

> Phase 2 已完成 AI 工具入口投影与全局安装接入，Phase 4 已完成 npm published package 分发主路径：`sdd` 可直接从 npm 安装，`sdd init` 可一次性生成 `.sdd`、starter `specs/<branch>/spec.md|plan.md|tasks.md` 与 Claude Code managed entries，`sdd update` 可检查/修复漂移，`sdd instructions` 提供动态薄入口指令，`sdd artifact template/validate` 和 `sdd run archive` 降低真实工作流摩擦。

```text
sdd --version
sdd init [--force] [--ai auto|claude-code|none] [--branch <branch>] [--no-scaffold-docs]
sdd update [--check] [--ai auto|claude-code]
sdd instructions [overview|init|doctor|update|run-task|verify-task] [--json]
sdd doctor [--latest-only] [--all-runs]
sdd run create
sdd run status <run_id>
sdd run archive <run_id> [--reason <text>]
sdd lifecycle decide [options]
sdd tasks list|inspect|gaps [--branch <branch>]
sdd artifact template <artifacts/path.md> --task <task_id> --agent <agent> [--branch <branch>] [--status <status>]
sdd artifact validate <run_id> <artifacts/path.md> [--task <task_id>] [--agent <agent>] [--json]
sdd do task <task_id> [--branch <branch>] [--run <run_id>] --review-artifact <path> --validation-artifact <path>
sdd verify task <task_id> --branch <branch> --run <run_id> --review-artifact <path> --validation-artifact <path>
```

CLI 是本地 runtime 入口；长期状态和执行事实源由 `.sdd/runs/<run_id>/state.json`、`events.jsonl` 和 `artifacts/` 管理。

## 安装态全链路使用示例

下面流程对应公开 npm 包安装后的端到端路径。普通用户不需要先 clone 平台仓库，直接安装 `sdd-agent-platform` 即可。

### 1. 从 npm 安装 CLI

```bash
npm install -g sdd-agent-platform@latest
sdd --version
```

如果你需要验证 GitHub 源码安装路径，也可以使用：

```bash
npm install -g git+ssh://git@github.com/Timetraps-x/sdd-agent-platform.git
sdd --version
```

平台开发时才需要 clone 仓库并直接运行 dist CLI：

```bash
node ./dist/packages/cli/src/main.js --help
node ./dist/packages/cli/src/main.js --version
```

卸载：

```bash
npm uninstall -g sdd-agent-platform
```

### 2. 初始化项目

`sdd doctor` 要求在 Git 仓库中运行；非 Git 目录会返回 `git_repo` failure。

```bash
git init
sdd init --ai claude-code
sdd status
sdd update --check
sdd doctor
```

首次 init 会默认生成 starter SDD 文档：`specs/master/spec.md`、`plan.md`、`tasks.md`。这些是 onboarding placeholder，真实实现前应替换/细化；已有语义文档默认保留，只有显式 `--force` 才覆盖。首次 init 后还没有 run 时，doctor 可能返回 `WARN run_evidence`，这是正常状态；创建 run 后会消失。

### 3. 准备 SDD 文档

按 branch 名放置：

```text
specs/case/spec.md
specs/case/plan.md
specs/case/tasks.md
```

最小 `tasks.md` 示例：

````markdown
# Case Tasks

### CASE-T1: Implement calculator addition

```sdd-task
id: CASE-T1
status: pending
wave: 1
depends_on: []
affected_files:
  - src/calculator.js
  - test/calculator.test.js
validation:
  - npm test
risk:
  - local-runtime
```

#### Boundary

Only validate local calculator addition behavior. Do not commit, push, or call external services.

#### Acceptance

- Calculator add returns the sum of two positive numbers.
- Calculator add handles negative and positive operands.
- Calculator add coerces numeric strings consistently.
````

Note: `#### Boundary`, `#### Acceptance`, and `#### Implementation Notes` are companion sections and must stay outside the `sdd-task` fenced block. Keep only metadata inside the fence.

### 4. 创建 run 并记录 lifecycle decision

```bash
sdd run create > run-create.json
RUN_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('run-create.json','utf8')).runId)")

sdd lifecycle decide \
  --run "$RUN_ID" \
  --intent high \
  --acceptance high \
  --size small \
  --tasks 1 \
  --files 2 \
  --layer runtime \
  --risk local-runtime \
  --impact-confidence high \
  --validation clear \
  --validation-available \
  --validation-cost cheap \
  --fanout local \
  --reversibility reversible \
  --source-artifact specs/case/spec.md \
  --source-artifact specs/case/tasks.md \
  --json
```

该命令只做 lifecycle gate 和 run record，不执行 task loop，也不启动 agent。

### 5. 检查 task parser

```bash
sdd tasks list --branch case
sdd tasks inspect CASE-T1 --branch case
sdd tasks gaps --branch case
```

期望：`gaps=0`，`tasks gaps` 输出 `PASS`。

### 6. 准备 reviewer / validator artifacts

`do` 和 `verify` 消费显式 artifact；真实执行、review、validation 可以由主会话或外部流程完成后写入 artifact。推荐先生成合法模板，再补充 Evidence。

```bash
mkdir -p ".sdd/runs/$RUN_ID/artifacts"

sdd artifact template artifacts/review-CASE-T1.md --task CASE-T1 --agent reviewer --branch case \
  > ".sdd/runs/$RUN_ID/artifacts/review-CASE-T1.md"
sdd artifact template artifacts/validation-CASE-T1.md --task CASE-T1 --agent validator --branch case \
  > ".sdd/runs/$RUN_ID/artifacts/validation-CASE-T1.md"
```

在生成文件中补充 `## Evidence`：

```markdown
## Evidence

- Calculator add returns the sum of two positive numbers: PASS.
- Calculator add handles negative and positive operands: PASS.
- Calculator add coerces numeric strings consistently: PASS.
- Commands run: npm test.
```

validator template 会生成 `## Acceptance Mapping` 并复制 exact Acceptance text；不要把 Acceptance 改写成同义句，否则 goal-level verify 会 deterministic block。`sdd-result.artifacts` 只放 `artifacts/<file>` run-relative artifact 路径，源码和测试文件引用放在 `## Evidence`。

先单独校验 artifact contract：

```bash
sdd artifact validate "$RUN_ID" artifacts/review-CASE-T1.md --task CASE-T1 --agent reviewer
sdd artifact validate "$RUN_ID" artifacts/validation-CASE-T1.md --task CASE-T1 --agent validator
```

### 7. 执行 single-task loop 和 goal-level verify

```bash
sdd do task CASE-T1 \
  --branch case \
  --run "$RUN_ID" \
  --review-artifact artifacts/review-CASE-T1.md \
  --validation-artifact artifacts/validation-CASE-T1.md

sdd verify task CASE-T1 \
  --branch case \
  --run "$RUN_ID" \
  --review-artifact artifacts/review-CASE-T1.md \
  --validation-artifact artifacts/validation-CASE-T1.md

sdd run status "$RUN_ID"
sdd doctor --latest-only
sdd doctor
```

期望：

- `do task` 返回 `status: completed`。
- `verify task` 返回 `status: PASS`，并生成 `artifacts/acceptance-coverage-CASE-T1.md`。
- `run status` 显示 `status: completed`、`phase: verify`。
- `doctor` 输出 `PASS`，没有 stale delegation、invalid artifact 或 terminal event gap。
- `doctor --latest-only` 只检查最新非归档 run；需要历史审计时可运行 `sdd doctor --all-runs`。

### 8. 卸载

```bash
npm uninstall sdd-agent-platform
test ! -e node_modules/.bin/sdd
```

卸载只移除 CLI 包，不会删除目标项目中的 `specs/`、源码或 `.sdd/runs` 证据。

## 项目结构

```text
packages/          TypeScript runtime 与 CLI
commands/          Claude Code 命令入口说明
agents/            SDD lifecycle agent contract
templates/         spec / plan / tasks / project / sync-back 模板
workflows/         阶段 workflow contract
adapters/          项目适配模板
schemas/           runtime、artifact 与 Phase 1.3 contract pack
docs/              架构与研究文档
specs/             本项目自身的 SDD 文档
context/           项目记忆与决策上下文
```

## 本地开发

```bash
npm run typecheck
npm test
npm run build
```

## 非目标

第一阶段不做：

- plugin loader
- tool registry
- background write agents
- 默认 worktree
- dependency wave 并发执行
- 自动 commit / push / merge
- dashboard / run database
- doctor auto-fix

第二阶段不做：

- background write agents
- per-task worktree
- dependency wave 并发执行
- plugin loader
- dashboard / run database
- 代码知识图谱
- fuzzy acceptance matching
- 自动 `sync-back apply`

Phase 2 优先解决全局安装、目标仓库 init、AI 工具入口投影、update/doctor 漂移检查、instruction API、artifact UX 和 run hygiene；平台化扩展顺延到 Phase 3；npm published package 分发主路径已在 Phase 4 完成；代码知识图谱顺延到 Phase 5。
