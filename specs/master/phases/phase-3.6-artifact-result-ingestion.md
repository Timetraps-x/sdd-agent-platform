# Phase 3.6 Artifact Result Ingestion

## 定位

Phase 3.6 定义后台 delegation 完成后如何读取、校验、归档和映射 result artifact。它只处理结果进入 run evidence 的规则，不执行 worker，也不自动 sync-back apply。

## 依赖

- Phase 3.4 Delegation State Machine。
- Phase 3.5 Worker Adapter Contract。
- Phase 2.11 artifact template/validate 与 run hygiene。

## 范围

- 定义 artifact result ingestion contract。
- 复用 `sdd-result-v1` 校验和 run-relative artifact path 规则。
- 定义 PASS/BLOCKED/FAIL artifact 如何映射到 delegation terminal state 和 gap report。
- 定义重复 ingestion、缺失 artifact、无效 artifact 的处理规则。

## 非目标

- 不启动 worker。
- 不自动修改 specs/tasks。
- 不自动执行 sync-back apply。
- 不做 fuzzy acceptance matching。
- 不实现 local run index。

## 交付物

- `phase3.6-spec.md`、`phase3.6-plan.md`、`phase3.6-tasks.md`、`phase3.6-validation.md`。
- Artifact ingestion API、CLI inspect/check 和 doctor check。
- Tests 覆盖 valid/invalid/duplicate/missing artifact ingestion。

## 验收标准

- Valid artifact 能被映射为 delegation terminal evidence。
- Invalid artifact 产生明确 gap/action，不污染 completed evidence。
- Duplicate ingestion 幂等。
- Doctor 能发现 state 与 artifact evidence 不一致。

## 下游引用

- Phase 3.11 background executor 使用本 phase 完成单 task result ingestion。
- Phase 3.12 wave executor 使用本 phase 聚合 wave result。
