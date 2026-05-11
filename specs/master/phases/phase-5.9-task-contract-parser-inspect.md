# Phase 5.9 Task Contract Parser / Inspect

## Metadata

- phase_id: `5.9`
- name: `Task Contract Parser / Inspect`
- status: `completed`
- depends_on: `5.8`
- blocks: `5.10`

## 1. 定位

让 Phase 5.8 中进入 `tasks.md` 的执行证据字段进入平台语义模型，而不是停留在模板文本。

## 2. 依赖

- Phase 5.8 三层文档契约已落地。

## 3. 范围

- 确认或增强 parser 对 `acceptance_refs`、`plan_refs`、`agent_fit`、`allowed_agents`、`required_artifacts`、`verification_availability`、`autonomy` 的支持。
- 增强 `sdd tasks inspect` 输出，让 task 的需求追踪、方案追踪、agent 要求、artifact 要求和验证可用性可见。
- 补充 parser / inspect 测试。

## 4. 非目标

- 不做完整 Markdown AST 重写。
- 不实现跨文档强校验；跨文档校验放入 Phase 5.10 doctor/verify。

## 5. 交付物

- `packages/core/src/index.ts`
- `packages/cli/src/main.ts`
- `packages/core/src/index.test.ts`

## 6. 验收标准

- `sdd tasks inspect <task_id>` 显示 acceptance refs、plan refs、allowed agents、required artifacts、verification availability、autonomy。
- 新字段不会破坏已有 task 文档兼容性。
- Repository tests/build pass.

## 7. 可被下游引用的产物

- Task execution/evidence contract 的 runtime-visible fields。
