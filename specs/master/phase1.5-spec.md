# Phase 1.5 Spec — SDD Parser / Task Model

## 1. 目标

在 Phase 1.2 runtime skeleton 和 Phase 1.3 contracts/templates 之上，实现最小 SDD Markdown 读取能力，让 runtime 能把 `tasks.md` / retained phase task docs 中的 `sdd-task` fenced block 转为结构化 task model。

本阶段只负责读取、解析、inspect 和 gap report，不执行 task、不调度 agent、不改写 SDD Markdown。

## 2. 范围

- 解析 `specs/<branch>/spec.md`、`plan.md`、`tasks.md` 的存在性。
- 解析 `sdd-task` fenced block。
- 提取 `id`、`status`、`wave`、`depends_on`、`affected_files`、`validation`、`risk`。
- 提取 task companion sections：`Boundary`、`Acceptance`、`Implementation Notes`。
- 输出 task list / task inspect / task gap report 的 runtime API。
- 提供最小 CLI inspection command：`sdd tasks list|inspect|gaps`。
- 支持当前仓库 retained phase docs：当顶层 `tasks.md` 只是索引时，可回退读取 `phase*-tasks.md`。

## 3. 非目标

- 不实现完整 Markdown AST。
- 不自动改写 `spec.md` / `plan.md` / `tasks.md`。
- 不执行 validation command。
- 不执行 task、agent、workflow、lifecycle gate。
- 不实现 artifact/delegation runtime、single task loop、doctor hardening。
- 不做 dependency wave 并发调度或 overlap gate。

## 4. 依赖

- `specs/master/phases/phase-1.5-sdd-parser-task-model.md`
- `schemas/contracts/sdd-task-contract.md`
- `templates/tasks-template.md`
- `packages/core/src/index.ts`
- `packages/cli/src/main.ts`

## 5. 验收标准

- 能列出当前 branch 下所有已解析 task。
- 能 inspect 单个 task 的边界、依赖、验证命令、影响文件、风险和验收项。
- metadata 缺失或依赖不存在时输出明确 Task Gap / Dependency Gap。
- 文档缺失时输出 Document Gap。
- 不执行任何 task、command、agent、workflow 或 validator。
- TypeScript typecheck、tests、build 通过。
