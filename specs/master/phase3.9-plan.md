# Phase 3.9 Plan

## Approach

1. 增加 `TASK_GRAPH_PLANNER_CONTRACT_VERSION` 和 graph node/edge/diagnostic/plan 类型。
2. 实现 `inspectTaskGraph(projectRoot, { branch })`：
   - 调用 `parseSddBranch` 读取 task model。
   - 将 task metadata 映射为 graph nodes。
   - 将现有 parser/dependency gaps 映射为 graph diagnostics。
   - 构建只连接唯一 task id 的 `depends_on` dependency edges。
   - 对 normalized `affected_files` 做两两 overlap 检测并输出 `file_overlap` edges。
   - 聚合 risk 和 validation summary。
3. 实现 cycle detection：
   - 跳过 duplicate task id，避免 ambiguous graph。
   - 仅遍历已存在且唯一的 dependency edge。
   - 发现 cycle 时输出 blocking diagnostic。
4. Doctor 增加 `task_graph_planner_contract` PASS/FAIL visibility。
5. CLI 增加：
   - `sdd graph inspect [--branch <branch>] [--json]`
6. Tests 覆盖：
   - valid graph dependency + file overlap。
   - missing dependency + cycle diagnostics。
   - doctor visibility。
   - CLI human/JSON output。
7. 更新 retained docs/index/status 并执行 typecheck/test/build/doctor/CLI smoke。

## Safety

- Phase 3.9 只读 specs 和 project config。
- 不执行 task、validation command、worker adapter 或 delegation。
- 不创建/删除 worktree。
- 不修改 run state、events、artifacts、sync-back state 或 tasks.md。
- `file_overlap` 和 diagnostics 只作为 Phase 3.10+ wave planning 的输入，不自动调度并发。
