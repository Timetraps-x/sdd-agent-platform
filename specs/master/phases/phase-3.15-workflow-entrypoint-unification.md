# Phase 3.15 Workflow Entrypoint Unification

## 定位

Phase 3.15 收束真实全链路验证中暴露的主路径断点：用户自然入口 `sdd do task` 必须与 Phase 3.6 artifact ingestion、Phase 3.11 background executor、Phase 3.13 local run index 和 doctor evidence 保持一致。

## 依赖

- Phase 3.6 Artifact Result Ingestion。
- Phase 3.11 Background Executor。
- Phase 3.13 Local Run Index。
- Phase 3.14 Governance Policy。
- Phase 2.11 Artifact UX and Run Hygiene Hardening。

## 范围

- 将 `sdd do task` 对应的 single-task loop 改为 ingestion-aware workflow facade。
- 让 supplied artifacts 通过 Phase 3 executor ingestion path 接受，生成 artifact ingestion records。
- 保持 `sdd background run` 作为底层执行/诊断能力，而不是让最终用户主路径绕开 `sdd do task`。
- 增加测试，证明 `sdd do task` 产生 ingestion records，并能通过 `doctor --latest-only`。
- 用真实安装到卸载 full-chain smoke 验证主路径。

## 非目标

- 不引入新的 worker runtime。
- 不启动自动后台写代码 agent。
- 不改变 `sync-back apply` 的显式用户控制。
- 不降低 Phase 3.6 ingestion contract 的严格性。
- 不把 terminal delegation 做 retroactive ingestion。

## 交付物

- `phase3.15-spec.md`、`phase3.15-plan.md`、`phase3.15-tasks.md`、`phase3.15-validation.md`。
- `runSingleTaskLoop` ingestion-aware facade runtime change。
- `runSingleTaskLoop` ingestion/doctor regression test。
- Full install-to-uninstall smoke evidence showing `sdd do task` writes ingestion records and doctor passes。

## 验收标准

- `sdd do task` 使用 supplied artifacts 完成任务时，terminal delegations 必须有 Phase 3.6 artifact ingestion records。
- `sdd artifact ingestions` 对主路径 run 返回 valid=true。
- `sdd verify task` 在主路径 run 上通过 acceptance coverage。
- `sdd doctor --latest-only` 不再因为 `sdd do task` 缺 ingestion ledger 而失败。
- Typecheck、tests、build 和真实 full-chain smoke 均通过。

## 下游引用

- 后续用户指南、Claude Code workflow command 和 Phase 4 平台化能力应把 `sdd do task` 视为用户主入口。
- `sdd background run` 应作为 executor-level 能力保留给高级调试、队列/波次执行和内部编排。
