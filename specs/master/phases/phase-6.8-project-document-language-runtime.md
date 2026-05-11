# Phase 6.8 Project Document Language Runtime

## 1. 定位

Phase 6.8 在 Phase 6.7 output profile 收敛后，补齐 SDD 文档 prose 的项目级语言偏好。runtime、CLI、JSON、contract 默认英文；`spec.md`、`plan.md`、`tasks.md`、`validation.md` 以及 phase 执行文档的说明性 prose 使用同一个项目级 `docs_language` 参数。

## 2. 依赖

- depends_on: Phase 6.7 Token Budget and Output Dedup Runtime
- blocks: Phase 7.0 Code Knowledge Graph Baseline
- required_by: Phase 7.0

## 3. 范围

- 明确 `docs_language` 是项目级文档 prose 语言参数。
- `init`、config、chat、workflow 入口都只能设置同一个项目偏好，不形成 per-run、per-task 或 per-document 临时语言层。
- `docs_language: zh-CN` 时，生成的 SDD 文档 prose 可为中文或中英并列标题。
- 保留英文 contract 标识、metadata key、status enum、fenced block 名称、task id、artifact path、command 名称和阿拉伯数字。
- 保证 runtime 输出不因 `docs_language` 改为中文。

## 4. 非目标

- 不本地化 CLI runtime 输出。
- 不本地化 JSON key、contract id、status enum、artifact path。
- 不引入 run-level language override。
- 不让同一项目的 SDD 文档在不同 run 间随机切换语言。
- 不改变 task parser 对 `sdd-task` block 和 metadata key 的稳定依赖。

## 5. 交付物

- `schemas/contracts/project-yml-contract.md` 中 `docs_language` 语义澄清。
- `templates/project-template.yml`、`adapters/generic.yml`、`adapters/java-maven.yml` 中项目级文档语言说明。
- `packages/core/src/index.ts` 中 project config round-trip 和 init scaffold 语言选择。
- `templates/spec-template.md`、`templates/plan-template.md`、`templates/tasks-template.md` 文档 prose 语言边界。
- Phase 6.8 spec/plan/tasks/validation 与运行证据。

## 6. 验收标准

- `docs_language` round-trip 保持项目级配置语义。
- `zh-CN` 文档生成会产生中文 prose，同时保留 `sdd-task`、metadata key、`AC-*`、status enum、artifact path 和 command 名称。
- `en-US` 或未支持语言会生成英文 prose 或安全 fallback。
- runtime CLI 输出仍为英文。
- installed CLI workflow 完成 inspect/route/do/verify/sync-back/run-index/update/doctor/package dry-run/uninstall 证据。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-6.8-project-document-language-runtime.md`
- `specs/master/phase6.8-spec.md`
- `specs/master/phase6.8-plan.md`
- `specs/master/phase6.8-tasks.md`
- `specs/master/phase6.8-validation.md`
