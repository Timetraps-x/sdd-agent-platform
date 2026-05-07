# Phase 1.3 Plan - Contract / Templates / Adapters Pack

## Contract Header

- phase: `1.3`
- phase artifact: `specs/master/phases/phase-1.3-contract-templates-adapters.md`
- status: `completed`
- owner: platform static asset pack

## Approach

1. 继承 Phase 1.1 架构边界和 Phase 1.2 runtime skeleton，不重新定义 lifecycle algorithm。
2. 将 Phase 1.3 contract 以 Markdown/YAML 静态资产形式固化，优先可读、可版本化、可被 doctor 检查。
3. templates 保持 Spec Kit-compatible 的 `spec.md / plan.md / tasks.md` 阶段语言，并加入最小结构化 metadata。
4. adapters 只声明项目差异和验证命令，不执行验证、不加载 plugin。
5. doctor 静态规则仅定义检查项和结果语义，真实执行加固留给 Phase 1.9。

## Asset Layout

```text
schemas/contracts/
  project-yml-contract.md
  run-state-contract.md
  event-log-contract.md
  lifecycle-decision-contract.md
  sdd-task-contract.md
  sdd-result-contract.md
  delegation-liveness-contract.md
  doctor-static-assets-contract.md

templates/
  spec-template.md
  plan-template.md
  tasks-template.md
  project-template.yml
  sync-back-proposal-template.md

adapters/
  generic.yml
  java-maven.yml
```

## Compatibility Rules

- Contract identifiers use stable kebab-case ids and semantic-ish Phase 1 version `1.3.0`.
- Existing Phase 1.2 contracts remain available as runtime skeleton history; Phase 1.3 assets are the retained static pack for downstream phases.
- New fields must be additive by default.
- Deleting or changing field semantics requires a new contract version.

## Validation Strategy

- Manual static asset review for required identifiers and version headers.
- Verify asset paths exist under `schemas/contracts`, `templates`, and `adapters`.
- No TypeScript code or package config changed, so backend/package build is not required by the project verification policy.
