# Phase 7.3 Tasks — Workflow State Resolver and Performance Read Path

## Completed

- [x] Gate 0：完成 Phase 7.3 read-path 调研，确认 resolver/fast-path/deep-path 边界。
- [x] Gate 1：新增 Workflow State Resolver contract、facade 和 core subpath export。
- [x] Gate 2：将 status 默认读路径切到 resolver，并写入 `workflow_state` runtime projection。
- [x] Gate 3：将 sync-back 隐式 run lookup 和 affected-file conflicts 切到 resolver/SQLite-first 路径。
- [x] Gate 4：将 doctor latest-only 切到 resolver fast path，保留 all-runs/deep evidence diagnostics。
- [x] Gate 5：运行 Phase 7.3 相关测试和 typecheck。

## Implementation notes

- Resolver projection是派生视图，不取代 `runtime.sqlite` 中的结构化 runtime source of truth。
- `doctor --latest-only` 默认避免 deep evidence scan；`--all-runs` 继续用于历史/深度诊断。
- Phase 7.3 未实现 `verify.md`、`/sdd:test`、command-scoped team runtime 或 ship readiness。
