# Phase 3.10 Wave Planner

## 定位

Phase 3.10 将 task graph 规划为安全 dependency wave。它只产出 wave plan 和 blocking reasons，不执行 wave。

## 依赖

- Phase 3.9 Task Graph Planner。
- Phase 3.7 Worktree Isolation Contract。
- Phase 3.1 capability registry。

## 范围

- 根据 depends_on、affected_files overlap、risk 和 isolation decision 生成 wave。
- 区分 parallel-safe、manual-gate、blocked tasks。
- 输出 wave plan artifact/JSON。
- 提供 CLI inspect 和 doctor visibility。

## 非目标

- 不执行 wave。
- 不启动 background worker。
- 不创建 worktree。
- 不自动修改 task status。

## 交付物

- `phase3.10-spec.md`、`phase3.10-plan.md`、`phase3.10-tasks.md`、`phase3.10-validation.md`。
- Wave planner API/CLI/doctor check。
- Tests 覆盖 dependency order、overlap blocking、manual gates。

## 验收标准

- Wave plan 尊重 depends_on 拓扑顺序。
- Overlap/risk 不安全 task 不会进入同一 parallel wave。
- Planner 输出解释每个 blocked/manual task 的原因。
- Planner 不产生执行副作用。

## 下游引用

- Phase 3.12 Wave Executor 使用本 phase 的 wave plan 执行多 task。
- Phase 3.14 Governance Policy 使用本 phase 的 gate reasons 制定策略。
