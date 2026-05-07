# Phase 1.3 Contract / Templates / Adapters Pack

## 1. 定位

Phase 1.3 在 Phase 1.1 架构基线和 Phase 1.2 runtime skeleton 完成后，固化后续 parser、validator、command 和真实项目接入共同依赖的静态契约资产。

本阶段只做静态平台资产，不实现 command 交互、agent prompt、workflow runtime、parser 或 artifact validator。

## 2. 依赖

```yaml
depends_on:
  - phase-1.1-architecture-baseline
  - phase-1.2-runtime-skeleton
blocks:
  - phase-1.4-commands-agents-workflows
  - phase-1.5-sdd-parser-task-model
  - phase-1.6-artifact-delegation-contract
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```

## 3. 范围

- schemas/contracts：`project.yml`、`state.json`、`events.jsonl`、`lifecycle_decision`、`sdd-task`、`sdd-result`、delegation liveness 的最小契约。
- templates：`spec-template.md`、`plan-template.md`、`tasks-template.md`、`project-template.yml`、`sync-back-proposal-template.md`。
- adapters：`generic.yml`、`java-maven.yml`。
- contract id、version、owner、writer、reader、extension points 的统一标识规则。
- doctor 对静态平台资产存在性、版本和 contract 标识的只读检查规则。

## 4. 非目标

- 不实现 Claude Code slash command。
- 不编写完整 agent prompt。
- 不定义 workflow 编排顺序。
- 不实现 parser、artifact validator 或 delegation runtime。
- 不引入 JSON Schema 校验器，仍以 Markdown/YAML contract 文档为主。

## 5. 交付物

- `schemas/` 下的 Phase 1.3 静态 contract 文档。
- `templates/` 下的 spec / plan / tasks / project / sync-back 模板。
- `adapters/generic.yml`
- `adapters/java-maven.yml`
- doctor 静态资产检查规则说明。

## 6. 验收标准

- 每个 schema/template/adapter 都有版本头或 contract 标识。
- templates 生成的文档能被后续 Phase 1.5 parser 和 Phase 1.6 artifact validator 识别。
- adapter 能声明项目类型、默认验证命令和关键目录，但不执行验证。
- doctor 能检查静态平台资产是否存在、版本是否完整、contract 是否缺失。
- 静态资产能作为后续命令、agent、workflow 的稳定边界，而不是依赖聊天上下文。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.3-contract-templates-adapters.md
required_by:
  - phase-1.4-commands-agents-workflows
  - phase-1.5-sdd-parser-task-model
  - phase-1.6-artifact-delegation-contract
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```
