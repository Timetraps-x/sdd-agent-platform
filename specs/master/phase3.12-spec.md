# Phase 3.12 Spec

## Problem

Phase 3.10 已能生成只读 dependency wave plan，Phase 3.11 已能完成单 task background delegation claim/run/ingest，但平台仍缺少一个受控的 wave executor，把 planner 判定为安全的 wave task 串接到 background executor，并把每个 task 的 execution evidence 汇总到同一个 run 中。

## Goal

实现 Phase 3.12 Wave Executor：基于 Phase 3.10 wave plan 和 Phase 3.11 background executor 执行 planner-safe waves，支持明确的停止策略、manual/blocked gate 报告、wave execution inspection 和 doctor visibility，为 Phase 3.13 run index 提供可索引的 multi-task execution history。

## Requirements

- Core 提供 Phase 3.12 wave executor contract/version、run options、result、inspection 类型。
- Executor 必须复用 Phase 3.10 `inspectWavePlan`，不重新计算或绕过 planner safety decision。
- Executor 必须复用 Phase 3.11 `runBackgroundExecutor` 执行每个 task delegation。
- Executor 在 plan invalid、manual gate 或 blocked task 存在时必须在执行前 blocked，并写入可审计 event。
- Executor 支持 `fast-stop` 和 `safe-continue` 两种显式策略。
- `safe-continue` 只能完成当前 safe wave 内已独立的 task，不能跨越未完成依赖进入下游 wave。
- Executor 必须记录 wave started/completed/stopped/blocked events，并聚合 task results。
- CLI 提供 `sdd wave run [options]` 和 `sdd wave executor <run_id> [--json]`。
- Doctor 必须报告 wave executor contract visibility。

## Acceptance

- Planner-safe wave tasks 能通过 background executor 被执行，并聚合每个 task 的 artifact ingestion/delegation result。
- Manual gate、blocked task 或 graph diagnostics 会在执行前阻断并输出明确 issue/action。
- `fast-stop` 遇到第一个 non-completed task 立即停止。
- `safe-continue` 遇到 non-completed task 后完成当前 wave 内其它安全 task，但不进入下游依赖 wave。
- CLI 能运行 human-readable 和 JSON wave run/inspect smoke。
- Doctor 能检查 wave executor contract visibility。
- Phase 3.12 不重新计算 planner、不自动 sync-back apply、不 merge worktree、不绕过权限边界。
