# Phase 3.11 Spec

## Problem

Phase 3.10 已能生成只读 dependency wave plan，但执行层仍缺少一个可审计的单 task background delegation 闭环。如果直接进入 wave executor，会把 claim、state transition、worker adapter、artifact ingestion 和 failure diagnostics 混在并发调度里。

## Goal

实现 Phase 3.11 Background Executor：受控 claim 一个 background delegation，并在提供 artifact 时通过 Phase 3.6 ingestion 进入 terminal state，为 Phase 3.12 wave executor 提供稳定的单 task 执行基线。

## Requirements

- Core 提供 Phase 3.11 background executor contract/version、run options、result、inspection 类型。
- Executor 必须复用 Phase 3.3 delegation queue、Phase 3.4 state machine、Phase 3.5 worker adapter contract、Phase 3.6 artifact ingestion。
- Executor 必须检查 task、worker adapter、capability/isolation decision，不越过 manual/blocked gates。
- Executor 默认只 claim 一个 delegation；没有 artifact 时保持 claimed/running state 并提示提供 artifact。
- Executor 在提供 artifact 时必须通过 `ingestArtifactResult` 进入 completed/failed/blocked，不静默完成。
- Executor 必须拒绝 terminal delegation id reopen。
- CLI 提供 `sdd background run <task_id> [options]` 和 `sdd background inspect <run_id> [--json]`。
- Doctor 必须报告 background executor contract visibility。

## Acceptance

- 单 task background delegation 能被 claim 并持久化 run/delegation state。
- 有效 artifact 能被 ingestion 并使 delegation/run 进入 terminal completed state。
- 无效 artifact 或 manual/blocked worker/isolation gate 产生明确 issue/action，不静默通过。
- CLI 能运行 human-readable 和 JSON background run/inspect smoke。
- Doctor 能检查 background executor contract visibility。
- Phase 3.11 不执行 dependency wave、不自动 sync-back apply、不绕过 Claude Code 或本地命令权限边界。
