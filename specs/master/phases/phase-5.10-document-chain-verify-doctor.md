# Phase 5.10 Document Chain Verify / Doctor

## Metadata

- phase_id: `5.10`
- name: `Document Chain Verify / Doctor`
- status: `completed`
- depends_on: `5.9`
- blocks: `6.0`

## 1. 定位

将 `spec acceptance -> plan design -> tasks execution -> artifacts -> verify/doctor` 串成可检查的 SDD Harness 质量链路。

## 2. 依赖

- Phase 5.8 三层文档契约。
- Phase 5.9 task contract parser / inspect 可见性。

## 3. 范围

- `verify task` 优先使用 task `acceptance_refs` 做 acceptance coverage。
- `doctor` 增加轻量三层文档链路检查。
- 对高风险 task 检查 reviewer/validator artifacts、required artifacts、acceptance refs。
- 增加 ERP 高风险 case regression，验证三层链路和手动 gate 仍有效。

## 4. 非目标

- 不实现企业级文档审计系统。
- 不阻断所有低风险轻量任务。
- 不替代人工评审和业务验收。

## 5. 交付物

- `packages/core/src/index.ts`
- `packages/cli/src/main.ts`
- `packages/core/src/index.test.ts`
- Phase 5.10 regression report

## 6. 验收标准

- `verify task` 可以按 AC ID 输出 coverage。
- `doctor` 可以发现缺失 AC ID、断裂 acceptance_refs、高风险 task 缺 artifact 要求等问题。
- ERP regression 证明普通 agent vs SDD Harness 差异仍然清晰，manual gate 不被 artifact 绕过。
- Repository tests/build pass.

## 7. 可被下游引用的产物

- 三层文档链路 doctor/verify checks。
- Phase 6 可消费的更稳定 spec/plan/task trace metadata。
