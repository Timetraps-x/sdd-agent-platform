# Phase 3.6 Spec

## Problem

Phase 3.5 定义了 worker adapter contract，但 worker 完成后的 result artifact 还缺少统一 ingestion 边界。如果后续 executor 直接改 delegation、artifact index 和 events，会把 artifact 校验、状态映射、重复提交、gap 记录和 doctor consistency 混在执行器里。

## Goal

建立 Artifact Result Ingestion：读取已存在的 run-relative `sdd-result-v1` artifact，校验后以幂等方式登记 ingestion ledger，并将有效结果映射为 delegation terminal evidence、artifact index 和 runtime event。

## Requirements

- Core 提供 Phase 3.6 artifact result ingestion contract/version、record/result/inspection 类型。
- `ingestArtifactResult(projectRoot, runId, { delegationId, artifactPath })` 必须复用 `validateSddResultArtifact` 和 run-relative artifact path 规则。
- Valid artifact 必须写入 accepted ingestion record、artifact index、delegation terminal status 和 terminal event。
- Invalid artifact 必须写入 rejected ingestion record 和明确 issues，不写入 accepted artifact index。
- Duplicate ingestion 必须幂等返回既有 record，不重复写 artifact index 或 terminal event。
- `inspectArtifactResultIngestions` 必须检查 ingestion ledger、delegation state 和 artifact index 是否一致。
- CLI 提供 `sdd artifact ingest` 与 `sdd artifact ingestions` 可见性。
- Doctor 必须报告 accepted ingestion 与 delegation/artifact index 不一致。

## Acceptance

- Valid artifact 能被映射为 delegation terminal evidence。
- Invalid artifact 产生明确 gap/action，不污染 completed evidence。
- Duplicate ingestion 幂等。
- Doctor 能发现 state 与 artifact evidence 不一致。
- Phase 3.6 不启动 worker、不执行 adapter、不自动修改 specs/tasks、不自动 sync-back apply、不实现 local run index。
