# Phase 7.2 Tasks — Runtime Storage v2 Implementation

## Completed

- [x] Gate 0：完成 Phase 7.2 调研，冻结 SQLite-first runtime、branch evidence 和 legacy compatibility 范围。
- [x] Gate 1：新增 branch-scoped evidence path API，并保留旧 run-id path API 作为兼容/迁移入口。
- [x] Gate 2：扩展 Runtime Store v2 API，补齐 SQLite-first runs/events/activities/artifacts/evidence/projections 读写能力。
- [x] Gate 3：调整 run-state、events、invocation ledger，使新核心路径以 SQLite 为 source of truth。
- [x] Gate 4：实现 evidence attachment writer/reader/indexing，并迁移 artifact/source-ref 语义到 branch evidence。
- [x] Gate 5：将 run-index/projection、status、doctor、sync-back 最小路径切到 SQLite-first。
- [x] Gate 6：运行 build/typecheck/test/pack 和 SDD smoke，记录 Phase 7.2 validation evidence。

## Implementation notes

- Legacy `.sdd/runs/<runId>` 文件树只能作为兼容导入来源，不应继续作为新运行时权威状态。
- 新 raw evidence 默认进入 `.sdd/runs/<branchSlug>/evidence/`。
- `specs/<branch>` 继续承载正式 workflow docs。
- Phase 7.2 不实现 verification contract、test runtime、team runtime 或 ship/release readiness。
