# Phase 6.6 Documentation Information Architecture

## 1. 定位

Phase 6.6 插入在 Phase 6.5 Parallel Branch Run Isolation 和后续 core modularization / code graph 阶段之间。

本阶段目标是在进入代码知识图谱前，先把项目文档的信息架构边界定清楚：区分用户文档、AI/tool 入口说明、架构文档、研究历史、runtime contract assets、SDD execution archive 和 generated AI entries，避免后续重构把可执行 contract、生成文件或历史证据当成普通 Markdown 随意移动。

核心原则：先建立 reference-aware 的文档 IA 和迁移门禁，再移动文件；高风险路径必须和代码、测试、workflow 引用一起迁移。

## 2. 依赖

- depends_on: Phase 6.5 Parallel Branch Run Isolation
- blocks: Phase 7.0 Core Runtime Modularization; Phase 8.0 Code Knowledge Graph Baseline
- required_by: Phase 7.0 Core Runtime Modularization; Phase 8.0 Code Knowledge Graph Baseline

## 3. 范围

- 建立 Phase 6.6 的 spec / plan / tasks / validation 执行文档。
- 新增 `docs/documentation-information-architecture.md`，作为文档目录、迁移规则、风险分类和验证门禁的目标提案。
- 明确普通文档与 runtime contract assets 的边界。
- 标记 `.claude/**`、`commands/**`、`agents/**`、`templates/**`、`workflows/**`、code-referenced docs、`specs/master/**` 等路径的迁移风险。
- 通过真实安装后的 SDD workflow 执行本阶段任务，记录 implementer / reviewer / validator evidence。
- 使用 sync-back 更新任务完成状态。
- 在完成后记录真实安装、真实使用、真实卸载的可用性评分和调优机会。

## 4. 非目标

- 不在本阶段批量移动现有文档文件。
- 不移动 `.claude/**`、`commands/**`、`agents/**`、`templates/**`、`workflows/**` 等 runtime contract assets。
- 不发布 npm 包。
- 不提交或推送 Git 变更。
- 不导入或执行第三方 prompt pack。
- 不实现 Phase 8.0 code graph。

## 5. 交付物

- `specs/master/phases/phase-6.6-documentation-information-architecture.md`
- `specs/master/phase6.6-spec.md`
- `specs/master/phase6.6-plan.md`
- `specs/master/phase6.6-tasks.md`
- `specs/master/phase6.6-validation.md`
- `docs/documentation-information-architecture.md`
- 更新后的 `specs/master/phases/README.md`
- 更新后的 `specs/master/phases/PHASE_STATUS.md`
- 更新后的 `specs/master/phases/phase-8.0-code-knowledge-graph-baseline.md`
- 真实安装 / workflow / sync-back / 卸载证据

## 6. 验收标准

- Phase 6.6 出现在 phase index/status 中，并明确阻塞 Phase 7.0 Core Runtime Modularization 和 Phase 8.0 Code Knowledge Graph Baseline。
- `docs/documentation-information-architecture.md` 定义目标分类、推荐位置、迁移风险等级、落地策略和验证门禁。
- 文档 IA 明确区分普通 Markdown 文档、runtime contract assets、SDD execution archive 和 generated AI entries。
- 高风险迁移必须要求 reference grep、代码/测试/workflow 同步更新和完整验证。
- 使用真实打包安装后的 CLI 完成 `sdd status`、`sdd tasks inspect`、`sdd tasks route`、`sdd run create`、`sdd artifact template --write`、`sdd artifact validate`、`sdd do task`、`sdd verify task`、`sdd sync-back inspect/apply`、`sdd run index rebuild/inspect/query`、`sdd doctor --latest-only`。
- 卸载安装包后记录最终可用性评分和调优机会。

## 7. 可被下游引用的产物

- Phase 8.0 可消费文档 IA 作为 graph input 的文档分类、archive 边界和 generated/runtime asset 边界。
- 后续真实文档迁移 phase 可复用迁移风险分类和验证门禁。
- 用户指南与 README 重构可复用目标分类，避免把 Claude Code 执行机制混入 human-facing guide。
