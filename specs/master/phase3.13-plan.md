# Phase 3.13 Plan

## Approach

1. 增加 `LOCAL_RUN_INDEX_CONTRACT_VERSION` 和 local run index 类型：
   - `LocalRunIndex`
   - `LocalRunIndexTaskEntry`
   - `LocalRunIndexArtifactEntry`
   - `LocalRunIndexWaveSummary`
   - `LocalRunIndexInspection`
2. 增加 `getLocalRunIndexPath(projectRoot)`，固定派生索引路径为 `.sdd/run-index.json`。
3. 实现 `rebuildLocalRunIndex(projectRoot)`：
   - 读取 `.sdd/runs/*/state.json`。
   - 派生 run summaries、runtime task entries、delegation queue items、artifact entries。
   - 读取 run events，提取 `wave_executor_*` wave summary。
   - 写入 `.sdd/run-index.json`。
4. 实现 `readLocalRunIndex(projectRoot)` 和 `queryLocalRunIndex(projectRoot, query)`：
   - 支持 run id、task id、run status、artifact path 过滤。
   - 返回同 schema 的 filtered derived view。
5. 实现 `inspectLocalRunIndex(projectRoot)`：
   - 缺失索引返回 invalid + rebuild recommendation。
   - 无法读取或 contract mismatch 返回 issue。
   - 与重新构建的内存 snapshot 比较 runs/tasks/delegations/artifacts/waves，发现 drift。
6. Doctor 接入：
   - `local_run_index` evidence check：缺失/漂移为 WARN，提示 rebuild；current 为 PASS。
   - `local_run_index_contract` visibility check。
7. CLI 增加：
   - `sdd run index rebuild [--json]`
   - `sdd run index inspect [--json]`
   - `sdd run index query [--run <run_id>] [--task <task_id>] [--status <status>] [--artifact <path>] [--json]`
8. Tests 覆盖：
   - rebuild/query derived evidence。
   - doctor drift + rebuild action。
   - CLI rebuild/inspect/query。
   - help visibility。
9. 更新 retained docs/index/status 并执行 typecheck/test/build/doctor/CLI smoke。

## Safety

- Index 是派生 JSON 视图，不是事实源。
- 不删除 `.sdd/runs` 历史、不修改 artifacts、不改变 run state contract。
- 不引入 SQLite/DB 或远端服务。
- Doctor 对缺失索引只给 WARN 和 rebuild action，不把事实源判为不可用。
- 不自动 sync-back apply。
