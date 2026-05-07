# Phase 3.13 Local Run Index

## 定位

Phase 3.13 为 `.sdd/runs` 建立可重建的本地索引，改善长运行查询、列表和诊断效率。索引是派生视图，不替代 state/events/artifacts 文件事实源。

## 依赖

- Phase 3.11 Background Executor。
- Phase 3.12 Wave Executor。
- Phase 2.11 run archive / doctor scope controls。

## 范围

- 定义 local run index schema 和 rebuild 规则。
- 索引 run、task、delegation、artifact、wave summary 和 terminal state。
- 提供 index rebuild/query/doctor check。
- 明确索引损坏时可删除重建。

## 非目标

- 不把 SQLite/DB 作为唯一事实源。
- 不删除 `.sdd/runs` 历史。
- 不实现 dashboard。
- 不改变 artifact contract。

## 交付物

- `phase3.13-spec.md`、`phase3.13-plan.md`、`phase3.13-tasks.md`、`phase3.13-validation.md`。
- Local index API/CLI/doctor check。
- Rebuild/query tests。

## 验收标准

- Index 能从 `.sdd/runs` 完整重建。
- Index drift 可被 doctor 发现并给出 rebuild action。
- Query 能按 run/task/status/artifact 查询。
- 删除 index 不影响事实源。

## 下游引用

- Phase 3.14 Governance Policy 使用 index 做长期运行治理和历史审计。
