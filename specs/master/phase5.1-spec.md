# Phase 5.1 Spec

## Metadata

- phase_id: `5.1`
- title: `Context / Risk / Output Harness`
- status: `completed`
- depends_on: `5.0`
- blocks: `5.2`
- source_artifact: `specs/master/phases/phase-5.1-context-risk-output-harness.md`

## Problem / Intent

真实 trial 暴露的第一批高痛点是 branch context 错误、risk hard gate 漏判和输出质量差。Phase 5.1 先把 SDD harness 的入口判断能力做实：先知道在哪个项目/分支，先判断风险和 autonomy ceiling，再用稳定结构输出。

## Requirements

- FR-1: `ContextResolverContract` 必须统一 explicit branch、project config branch、current git branch、configured default 的 fallback。
- FR-2: status 和关键命令必须输出 branch source。
- FR-3: `LifecycleRiskGateContract` 必须支持 `--from-file` 和 `--from-text`。
- FR-4: risk extraction 必须覆盖 state-machine、concurrency、database/data-loss、security、SQL、API/schema、CI/build、external unknown。
- FR-5: hard gate 命中时必须输出 reason、required stages、autonomy ceiling，不得回落到 compact。
- FR-6: `OutputQualityContract` 必须约束关键输出为 changed / decision / evidence / gaps / next。

## Out of Scope

- workflow/agent registry。
- task graph/run evidence。
- managed asset manifest。
- eval/learning/context pack。

## Acceptance Criteria

- AC-1: status 能说明 branch 和 branch source。
- AC-2: lifecycle decide 能从文本和文件识别 hard gate signals。
- AC-3: hard gate 不再静默降级。
- AC-4: `/sdd:*` 和核心 CLI 输出边界更短、更结构化。
- AC-5: `npm test`、`npm run build` 通过。
