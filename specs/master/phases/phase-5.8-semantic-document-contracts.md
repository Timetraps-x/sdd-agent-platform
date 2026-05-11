# Phase 5.8 Semantic Document Contracts

## Metadata

- phase_id: `5.8`
- name: `Semantic Document Contracts`
- status: `completed`
- depends_on: `5.7`
- blocks: `5.9`

## 1. 定位

将 `spec.md / plan.md / tasks.md` 固化为 SDD Harness 的三层语义契约：需求契约、技术方案契约、执行证据契约。

## 2. 依赖

- Phase 5.7 已完成 hardening / regression gate。
- 现有 `plan.md` 已升级为交付级技术方案文档。

## 3. 范围

- 升级 `templates/spec-template.md` 为轻量 PRD / requirement contract。
- 升级 `templates/tasks-template.md` 为 execution / evidence contract。
- 升级 `sdd init` starter `spec.md` 与 `tasks.md`。
- 升级 `sdd instructions spec/tasks` 和 generated `/sdd:spec`、`/sdd:tasks`。
- 同步用户文档中的三层契约定位。

## 4. 非目标

- 不实现新的项目管理系统字段，例如 sprint、assignee、estimate、milestone。
- 不把 `spec.md` 扩展为完整 PRD 平台。
- 不在本 phase 实现 verify/doctor 语义门禁。

## 5. 交付物

- `templates/spec-template.md`
- `templates/tasks-template.md`
- `packages/core/src/index.ts`
- `packages/core/src/instructions.ts`
- `packages/core/src/ai-tools.ts`
- generated `.claude/commands/sdd/{spec,tasks}.md`
- docs / tests updates

## 6. 验收标准

- `sdd init` 生成的 `spec.md` 包含 Objective、scenarios、AC IDs、assumptions/dependencies、risks/hard gates。
- `sdd init` 生成的 `tasks.md` 包含 Delivery Map、Wave Plan、acceptance_refs、plan_refs、agent/artifact/verification/autonomy、Definition of Done。
- Dynamic instructions and generated entries explain the three-layer contract boundaries.
- Repository tests/build pass.

## 7. 可被下游引用的产物

- 三层文档契约模板和 init scaffold。
- `/sdd:spec` 与 `/sdd:tasks` 的文档生成语义。
