# Phase 3.13 Spec

## Problem

Phase 3.11/3.12 已经把 background execution 和 wave execution evidence 写入 `.sdd/runs/<run_id>/state.json`、`events.jsonl` 和 artifacts，但长期运行后 `run list`、run evidence doctor 和后续治理策略需要一个更便于查询的本地视图。如果直接引入数据库或把索引作为事实源，会破坏当前文件化 runtime contract 和可审计性。

## Goal

实现 Phase 3.13 Local Run Index：为 `.sdd/runs` 建立可删除、可重建的派生 JSON 索引，覆盖 run、task、delegation、artifact 和 wave summary 查询，并提供 rebuild/query/inspect CLI 与 doctor drift check。

## Requirements

- Core 提供 Phase 3.13 local run index contract/version、index schema、inspection 类型。
- Index 必须从 `.sdd/runs` 完整重建，不替代 state/events/artifacts 事实源。
- Index 必须包含 run summary、task entry、delegation queue item、artifact entry 和 wave summary。
- Index query 必须支持按 run id、task id、run status、artifact path 过滤。
- Index inspect 必须检测缺失、无法读取、contract mismatch 和与 `.sdd/runs` 的漂移。
- Doctor 必须报告 local run index 缺失/漂移，并给出 rebuild action；缺失索引不应否定 `.sdd/runs` 事实源。
- CLI 提供 `sdd run index rebuild|inspect|query [options]`。
- Phase 3.13 不引入 SQLite/DB、dashboard、远端服务、历史删除或自动 sync-back apply。

## Acceptance

- `rebuildLocalRunIndex` 能从 `.sdd/runs` 生成 `.sdd/run-index.json`。
- `queryLocalRunIndex` 能按 task/status/artifact 查询派生视图。
- `inspectLocalRunIndex` 能发现索引漂移并提示 rebuild。
- Doctor 能检查 local run index evidence 和 contract visibility。
- CLI 能执行 human-readable 和 JSON rebuild/inspect/query smoke。
- 删除或漂移索引不影响 `.sdd/runs` 事实源。
