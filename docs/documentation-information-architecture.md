# 文档信息架构基线

## 目标

本文件是 Phase 6.6 后的 reference-aware 文档信息架构基线。它把用户文档、AI/tool 入口说明、架构文档、研究历史、runtime contract assets、SDD execution archive、generated AI entries 分开，避免把可执行合同、生成文件或历史证据当成普通 Markdown 迁移。

## 当前入口地图

| 入口 | 面向对象 | 当前职责 |
|---|---|---|
| `README.md` | 新用户 / 维护者 | 项目定位、快速开始、文档地图、当前主线状态。 |
| `docs/user-guide.md` | 人类用户 | 安装、初始化、branch/partition、任务执行、verify、sync-back、常见问题。 |
| `docs/ai-readme.md` | Claude Code / AI 操作者 | status-first 执行规则、task boundary、artifact、sync-back 策略。 |
| `docs/architecture/sdd-agent-platform-architecture.md` | 平台维护者 | 当前架构、contract 分层、Phase 7 core modularization 与 Phase 8 graph handoff。 |
| `docs/architecture/command-information-architecture.md` | 平台维护者 | CLI 命令分层、用户入口和 advanced/runtime 命令边界。 |
| `specs/master/phases/PHASE_STATUS.md` | 平台维护者 | 阶段完成状态事实源；当前主线到 Phase 6.10 completed，Phase 7.0 core modularization planned，Phase 8.0 code graph planned。 |

## 目标分类

| 分类 | 推荐位置 | 当前处理策略 | 说明 |
|---|---|---|---|
| 公共入口文档 | repository root | 保持稳定 | `README.md` 保持简洁；只有能持续维护时才增加 `CONTRIBUTING.md`、`SECURITY.md`、`CHANGELOG.md`。 |
| 用户指南 | `docs/user/`，短期可保留 `docs/user-guide.md` | 先标记再迁移 | 面向人类使用者，避免混入 Claude Code 内部执行机制。 |
| AI/tool adapter 文档 | `docs/ai/`，短期可保留 `docs/ai-readme.md` | 先标记再迁移 | 解释 generated entries、adapter 行为和 host 集成边界，不复制 CLI 源码事实。 |
| 当前架构文档 | `docs/architecture/` | 保持作为当前设计事实 | 只放仍然有效的架构合同、阶段 handoff 和当前决策。 |
| 研究与历史分析 | `docs/research/` 或 `docs/research/archive/` | 保留 provenance，显式标记历史性 | 调研、对比、脑暴结论可以保留，但不能覆盖当前 runtime/source facts。 |
| Runtime contract assets | `commands/`、`agents/`、`templates/`、`workflows/` | 本阶段不移动 | 这些是可执行或被投影的 contract assets，不是普通 docs；迁移必须同步代码、测试、package contents 和 generated entries。 |
| SDD execution archive | `specs/master/phase*.md`、`specs/master/phases/`、`.sdd/runs/**` | 保持命名和路径稳定 | 这是 spec/plan/tasks/artifacts/run evidence 的 provenance；除非有兼容迁移，否则不改名。 |
| Generated AI entries | `.claude/**` | 作为 managed output 验证 | 由 `sdd init/update` 生成或更新，用 `sdd update --check` 验证漂移，不作为 source docs 手工重排。 |

## 迁移风险等级

| 风险 | 路径 / 内容 | 必要门禁 |
|---|---|---|
| 高 | `.claude/**`、`commands/**`、`agents/**`、`templates/**`、`workflows/**`、被源码/测试/package 引用的 docs | 先 grep 引用；同任务更新代码、测试、workflow、package contents；跑 full validation；必要时补兼容迁移。 |
| 中 | `specs/master/phase*.md`、`specs/master/phases/*.md`、架构/研究互链 | 更新索引与交叉链接；跑 document-chain、doctor、status、link/reference 检查。 |
| 低 | 纯导航或说明性 docs，且无源码、测试、workflow 引用 | 可在后续迁移任务中移动；同步 README 导航与引用检查。 |

## 推荐落地策略

1. 本基线已作为 Phase 6.6 documentation IA 的后续维护入口。
2. 在迁移前生成 reference inventory：路径、引用方、package 可见性、是否 generated、是否 runtime contract asset。
3. 第一批只移动低风险导航文档，并同步 README / docs index。
4. 高风险资产默认保持原位；确需迁移时，必须把代码、测试、workflow、generated projection、package contents 更新放入同一个任务。
5. 对研究材料只做 archive 标记和索引，不把历史结论当成当前实现事实。
6. Phase 8 code graph 消费本 IA 的分类和边界，把 runtime/generated/archive 的语义保留下来；Phase 7 先收敛 core 模块边界，避免图谱阶段继续扩张 `packages/core/src/index.ts`。

## 验证门禁

| 场景 | 必跑检查 |
|---|---|
| 任意文档移动 | reference grep、README/docs index 检查、`sdd status --branch master`；`sdd doctor --latest-only` 只在当前任务声明健康检查为验收范围时作为门禁 |
| generated AI entry 相关变更 | `sdd update --check`、generated manifest/drift 检查 |
| runtime contract asset 迁移 | `npm run typecheck`、`npm test`、`npm run build`、CLI focused smoke、package contents 检查 |
| package 可见文档变更 | `npm pack --dry-run --json` |
| SDD archive/phase 文档变更 | task inspect/route、document-chain doctor、run-index rebuild |

## 当前阶段不移动的路径

- `.claude/**`
- `commands/**`
- `agents/**`
- `templates/**`
- `workflows/**`
- `.sdd/runs/**`
- `specs/master/phases/**`
- `specs/master/phase*.md`

这些路径进入未来迁移时应被当作 contract / evidence / generated boundary，而不是普通 Markdown 文件。

## 后续可拆任务

| 后续任务 | 建议优先级 | 说明 |
|---|---|---|
| README 与 user guide 导航收敛 | 高 | 面向使用者，低风险但收益高。 |
| `docs/user/` 与 `docs/ai/` 分层 | 中 | 先拆 human-facing guide 与 AI adapter guide。 |
| research archive 标记 | 中 | 给历史调研加 archive/index 语义，避免误用旧结论。 |
| runtime asset 迁移评估 | 低 | 只有当 package/runtime 引用可以一次性迁移时再做。 |
