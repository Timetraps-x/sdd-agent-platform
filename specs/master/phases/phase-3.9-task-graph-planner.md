# Phase 3.9 Task Graph Planner

## 定位

Phase 3.9 从 `sdd-task` metadata 构建 task graph，解析 depends_on、affected_files、risk 和 validation 关系。它只产出 graph plan，不调度执行。

## 依赖

- Phase 1.5 parser/task model。
- Phase 3.7 Worktree Isolation Contract。
- Phase 3.1 capability registry。

## 范围

- 构建 task node/edge/risk/file impact graph。
- 校验 depends_on 引用、环、缺失 task 和不可解析 metadata。
- 标记 overlap、risk 和 validation requirements。
- 提供 graph inspect API/CLI 和 JSON 输出。

## 非目标

- 不规划 wave。
- 不执行 task。
- 不创建 worktree。
- 不进行 background delegation。

## 交付物

- `phase3.9-spec.md`、`phase3.9-plan.md`、`phase3.9-tasks.md`、`phase3.9-validation.md`。
- Task graph planner API/CLI/doctor check。
- Tests 覆盖 dependency graph、cycle、missing dependency、file overlap。

## 验收标准

- Valid tasks 能生成稳定 graph。
- Cycle/missing dependency 产生 blocking diagnostic。
- Graph 输出包含 task、edge、affected_files、risk 和 validation summary。
- 不产生执行副作用。

## 下游引用

- Phase 3.10 Wave Planner 使用本 graph 生成 wave plan。
- Phase 3.12 Wave Executor 使用本 graph 验证执行前置条件。
