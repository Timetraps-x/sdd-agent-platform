# Phase 3.7 Worktree Isolation Contract

## 定位

Phase 3.7 定义什么时候必须进入 worktree、什么时候禁止进入 worktree、以及文件 overlap/risk 如何影响隔离 gate。它只定义隔离决策 contract，不创建或删除 worktree。

## 依赖

- Phase 3.1 capability registry。
- Phase 3.5 worker adapter contract。
- Phase 1/2 task metadata：`affected_files`、`risk`、validation。

## 范围

- 定义 isolation decision 输入：task id、affected_files、risk、capability side effect、wave context。
- 定义 isolation mode：none、required、blocked、manual。
- 定义 files overlap gate 和 unsafe concurrency gate。
- 提供 dry-run inspect API/CLI。

## 非目标

- 不创建 worktree。
- 不清理 worktree。
- 不执行 task。
- 不进行 merge/reconcile。
- 不实现 wave planner。

## 交付物

- `phase3.7-spec.md`、`phase3.7-plan.md`、`phase3.7-tasks.md`、`phase3.7-validation.md`。
- Isolation contract 类型、decision API、CLI inspect 和 doctor visibility。

## 验收标准

- 同一文件 overlap 的写任务不能被判定为可安全并发。
- Read-only task 不强制 worktree。
- High-risk local write task 能被标记为 isolation required 或 manual gate。
- Doctor 能检查 isolation contract 可读取。

## 下游引用

- Phase 3.8 按本 contract 实现 worktree lifecycle。
- Phase 3.10/3.12 使用本 contract 规划和执行 wave。
