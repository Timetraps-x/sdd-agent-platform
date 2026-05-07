# Phase 1.3 Spec - Contract / Templates / Adapters Pack

## Contract Header

- phase: `1.3`
- phase artifact: `specs/master/phases/phase-1.3-contract-templates-adapters.md`
- status: `completed`
- owner: platform static asset pack
- upstream dependencies:
  - `docs/architecture/sdd-agent-platform-architecture.md`
  - `docs/architecture/lifecycle-decision-model.md`
  - `schemas/phase-1.2-*.md`

## Goal

固化后续 parser、validator、command、doctor 和真实项目接入共同依赖的静态契约资产，使平台不依赖聊天上下文理解关键格式。

## Scope

本阶段交付静态资产：

- `schemas/contracts/` 下的 Phase 1.3 contract 文档。
- `templates/` 下的 spec / plan / tasks / project / sync-back 模板。
- `adapters/generic.yml` 与 `adapters/java-maven.yml`。
- doctor 对静态资产存在性、版本头和 contract 标识的只读检查规则。
- Phase 1.3 执行文档与索引同步。

## Non-goals

- 不实现 Phase 1.4 command / agent / workflow 资产。
- 不实现 Phase 1.5 parser。
- 不实现 Phase 1.6 artifact validator 或 delegation runtime。
- 不实现 Phase 1.7 command gate。
- 不实现 Phase 1.8 single task loop。
- 不引入 JSON Schema 校验器或动态 plugin loader。

## Acceptance Criteria

- 每个 schema/template/adapter 都有 `contract` 或 `template` 标识和 `version`。
- `sdd-task`、`sdd-result`、delegation liveness 等 contract 为后续 parser/validator/runtime 提供稳定边界。
- templates 生成的 Markdown/YAML 包含可被后续解析的结构化 block。
- adapters 声明项目类型、默认验证命令和关键目录，但不执行命令。
- doctor 静态检查规则能检查资产存在性、版本和 contract 标识，不做 auto-fix。
- 验证证据写入 `phase1.3-validation.md` 后，`PHASE_STATUS.md` 才标记为 completed。
