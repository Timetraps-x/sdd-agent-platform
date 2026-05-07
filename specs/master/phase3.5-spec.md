# Phase 3.5 Spec

## Problem

Phase 3.3/3.4 已建立 delegation queue 与 state machine，但后台 executor 还没有统一 worker adapter contract。若直接进入执行器，会把 queue input、adapter capability、plugin contract、permission prompt、output artifact 和 forbidden uses 混在 executor 内部，难以验证兼容性。

## Goal

建立只读 Worker Adapter Contract Registry：声明 worker adapter manifest、输入 payload、输出 artifact/status/events、capability/plugin 引用、permission prompt 和 forbidden uses，为后续 background executor 提供静态 adapter 边界，不执行 adapter。

## Requirements

- Core 定义 Phase 3.5 worker adapter contract version、adapter manifest 类型和 registry 类型。
- 内置 adapter manifest 必须声明 input、output、status、required evidence、permission prompt 和 forbidden uses。
- 每个 adapter 必须引用 Phase 3.1 capability registry 中存在的 capability。
- 每个 adapter 必须引用 Phase 3.2 plugin contract registry 中存在的 plugin contract。
- Adapter input 必须引用 Phase 3.4 state machine version。
- CLI 提供 `sdd workers list [--json]` 与 `sdd workers inspect <id> [--json]`。
- Doctor 包含 `worker_adapter_contract` PASS/FAIL compatibility check。
- Tests 覆盖 API、doctor、CLI help/list/inspect。

## Acceptance

- Adapter contract 能表达 input/output/status/evidence/forbidden uses。
- Adapter contract 能表达 Claude Code subagent、SDD CLI task、manual handoff 三类边界。
- 每个 adapter 引用已存在 capability 和 plugin contract。
- CLI 能 list/inspect worker adapter。
- Doctor 能报告 worker adapter compatibility PASS。
- Phase 3.5 不执行 adapter、不生成 background process、不绕过 Claude Code permission prompt、不实现 wave executor。
