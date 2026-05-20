# Phase 7.2 Runtime Storage v2 Implementation

## 1. 定位

Phase 7.2 根据 Phase 7.1 的架构结论实施 Runtime Storage v2。优先级高于 verification、agent 能力和 team mode，因为后续能力必须建立在稳定 runtime source of truth 上。

本阶段先调研 Phase 7.1 产物、当前代码切面、真实项目 runtime 数据，以及 SQLite-first / evidence / checkpoint 相关 GitHub/open-source 参考项目，再使用 0.3.0 SDD 链路生成本 phase 的 spec/plan/tasks/validation，之后实现。

## 2. 依赖

- depends_on: Phase 7.1 Runtime Architecture and Storage v2 Research
- blocks: Phase 7.3 Workflow State Resolver and Performance Read Path
- required_by: Phase 7.3 Workflow State Resolver and Performance Read Path

## 3. 范围

- 将 runtime source of truth 从 run directory 文件树收敛到 `runtime.sqlite`。
- 建立 branch-scoped evidence 目录：`.sdd/runs/<branchSlug>/evidence/`。
- 调整 run/state/event/artifact API，使结构化状态写入 SQLite，原始证据附件按 evidence ref 关联。
- 保留 `specs/<branch>` 作为正式 workflow 文档位置。
- 将旧 `state.json`、`events.jsonl`、`invocations.jsonl`、`result.json` 从新核心路径中移除。
- 为后续 test/verify/sync-back/team/ship 预留 schema 扩展点，但不提前实现业务语义。

## 4. 非目标

- 不做 `/sdd:verifies` 和 `verify.md`。
- 不做 `/sdd:test`。
- 不做 command-scoped team runtime。
- 不把所有日志写入 evidence。
- 不做深层 `.sdd/runs/<branch>/<task>/<phase>/<runId>` 目录。
- 不做 hash store + branch views。

## 5. 交付物

- Runtime Store schema v2。
- Branch evidence path API。
- Evidence ref writer / reader。
- SQLite-first command run / checkpoint / decision state。
- 迁移后的 status/doctor/sync-back 最小兼容读路径。
- Phase 7.2 validation evidence。

## 6. 验收标准

- 新 runtime 状态以 SQLite 为准。
- 新 evidence 文件进入 `.sdd/runs/<branchSlug>/evidence/` 并被 SQLite 索引。
- 常用命令不依赖全量扫描旧 runs 文件树。
- `npm run build`、`npm run typecheck`、`npm test`、`npm pack --dry-run --json` 通过。
- `npm run sdd -- status --branch master`、`npm run sdd -- tasks list --branch master`、`npm run sdd -- doctor --latest-only --branch master` 通过。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-7.2-runtime-storage-v2-implementation.md`
- Runtime Store v2 schema and path APIs
