# Phase 5.5 Spec

## Metadata

- phase_id: `5.5`
- title: `Eval / Learning / Context Pack Harness`
- status: `completed`
- depends_on: `5.4`
- blocks: `5.6`
- source_artifact: `specs/master/phases/phase-5.5-eval-learning-context-pack-harness.md`

## Problem / Intent

如果没有 eval 和 learning loop，平台会反复修同类 prompt/output 问题。Phase 5.5 把真实 trial 变成 regression baseline，把重复失败沉淀成可审查的 harness 改进，而不是自修改 runtime。

## Requirements

- FR-1: `SkillAgentEvalContract` 必须使用 `user_test/` ERP trial 样本。
- FR-2: eval 必须覆盖新增判断、风险识别、任务切分、agent evidence、输出简洁度、验证可执行性、autonomy correctness、agent_fit、verification availability、gap closure。
- FR-3: `HarnessLearningContract` 必须限制 learning 输出类型：Project Context Pack、risk vocabulary、checklist、doctor check、eval assertion、generated-entry guidance。
- FR-4: Project Context Pack 必须明确 durable context 与 runtime source of truth 的边界。

## Out of Scope

- self-modifying runtime。
- hidden background automation。
- replacing structured source of truth。

## Acceptance Criteria

- AC-1: ERP trial eval baseline 可重复执行或人工复核。
- AC-2: repeated failure 有明确沉淀路径。
- AC-3: Project Context Pack 不成为执行 runtime。
- AC-4: `sdd status --branch master` 无 route gaps。
