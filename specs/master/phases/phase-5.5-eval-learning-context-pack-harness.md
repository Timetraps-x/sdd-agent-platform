# Phase 5.5 Eval / Learning / Context Pack Harness

## 1. 定位

Phase 5.5 实现 `SkillAgentEvalContract`、`HarnessLearningContract` 和 Project Context Pack，让真实 trial 和重复失败进入可评分、可沉淀的 harness learning loop。

## 2. 依赖

- depends_on: Phase 5.4 Managed Assets / Query Status Harness
- blocks: Phase 5.6 Phase 7 Graph Handoff Hardening

## 3. 范围

- 固定 `user_test/` ERP trial 为 eval baseline。
- eval 维度：新增判断、风险识别、任务切分、agent evidence、输出简洁度、验证可执行性、autonomy correctness、agent_fit、verification availability、gap closure。
- repeated failure 沉淀为 Project Context Pack、risk vocabulary、checklist、doctor check、eval assertion 或 generated-entry guidance。
- Project Context Pack 是 AGENTS.md-style durable context，不是执行 runtime。

## 4. 非目标

- 不做自修改 runtime。
- 不做隐藏后台自动化。
- 不绕过用户确认。
- 不替代 `.sdd/project.yml` / specs / runs 的事实源。

## 5. 验收标准

- ERP trial 可重复评分。
- learning output 只能进入允许的沉淀类型。
- Project Context Pack source-of-truth boundary 清晰。
- `sdd status --branch master` 无 route gaps。
