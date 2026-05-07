# Phase 1.5 Plan — SDD Parser / Task Model

## 1. 实施策略

以 `packages/core` 为 parser/model 事实源，`packages/cli` 只提供轻量 inspection 入口。

实现顺序：

1. 在 core 中定义 task model / gap model 类型。
2. 实现 `sdd-task` fenced block 的轻量 YAML-like 解析。
3. 提取 companion sections：Boundary / Acceptance / Implementation Notes。
4. 校验 task metadata 完整性与依赖引用。
5. 提供 `parseSddBranch`、`inspectSddTask`、render helpers。
6. 在 CLI 增加只读 inspection：`tasks list`、`tasks inspect`、`tasks gaps`。
7. 增加 parser happy path、gap path、branch doc path 测试。
8. 更新 retained docs、README、top-level indexes、PHASE_STATUS。

## 2. 设计约束

- Parser 只消费 Markdown，不写回 Markdown。
- YAML-like parser 只支持 Phase 1.3 task contract 当前需要的 scalar / list 格式，不引入额外依赖。
- `risk` 可为空；`affected_files`、`validation`、`Boundary`、`Acceptance` 缺失视为 blocking Task Gap。
- `depends_on` 引用不存在 task 时视为 blocking Dependency Gap。
- 顶层 `tasks.md` 是索引时，当前项目可回退读取 `phase*-tasks.md`，用于满足 retained short docs 的索引规则。

## 3. API / CLI

Core API：

- `parseSddBranch(projectRoot, branch)`
- `parseSddTasksMarkdown(raw, options)`
- `inspectSddTask(model, taskId)`
- `renderTaskList(model)`
- `renderTaskInspect(task, gaps)`
- `renderTaskGapReport(model)`

CLI：

- `sdd tasks list [--branch <branch>]`
- `sdd tasks inspect <task_id> [--branch <branch>]`
- `sdd tasks gaps [--branch <branch>]`

## 4. 验证计划

本阶段修改 TypeScript runtime / CLI，因此运行：

- `npm run typecheck`
- `npm test`
- `npm run build`

同时执行 parser CLI smoke：

- `npm run sdd -- tasks list --branch master`
- `npm run sdd -- tasks inspect P1.4-T1 --branch master`
