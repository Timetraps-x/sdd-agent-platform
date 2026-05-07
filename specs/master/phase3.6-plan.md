# Phase 3.6 Plan

## Approach

1. 增加 `ARTIFACT_RESULT_INGESTION_CONTRACT_VERSION` 和 artifact ingestion record/result/inspection 类型。
2. 在 `RunState` 增加 `artifactIngestions` ledger，新建 run 默认初始化为空对象。
3. 实现 `ingestArtifactResult`：
   - 读取 run state 和 delegation。
   - 规范化 artifact path 为 `artifacts/<file>`。
   - 若同一 `delegationId:artifactPath` 已登记，幂等返回 existing record。
   - 复用 `validateSddResultArtifact` 校验 expected task/agent/self artifact path。
   - valid artifact 映射为 accepted record、artifact index、delegation terminal status 和 terminal event。
   - invalid artifact 映射为 rejected record；若 delegation 仍 RUNNING，则标记 RECOVERABLE 并记录 `artifact_invalid`。
4. 实现 `inspectArtifactResultIngestions`，校验 accepted record 与 delegation expectedArtifact/status、artifact index 和 artifact 文件有效性保持一致。
5. Doctor run evidence 检查接入 ingestion inspection，输出 `artifact_result_ingestion` FAIL。
6. `inspectRun` 展示 artifact ingestion records。
7. CLI 增加：
   - `sdd artifact ingest <run_id> <delegation_id> <artifacts/path.md> [--json]`
   - `sdd artifact ingestions <run_id> [--json]`
8. Tests 覆盖 valid、invalid、duplicate、doctor mismatch、CLI help。
9. 更新 retained docs/index/status 并执行 typecheck/test/build/doctor/CLI smoke。

## Safety

- Phase 3.6 只读取已存在 artifact，不启动 worker 或 adapter。
- Ingestion 只修改 `.sdd/runs/<run_id>/state.json` 和 `events.jsonl`，不修改 specs/tasks。
- Invalid artifact 不进入 accepted artifact index。
- Duplicate ingestion 不重复写 terminal event，避免污染 runtime audit。
- Sync-back 仍保持 proposal/apply 分离，Phase 3.6 不自动 apply。
