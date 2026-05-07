# Phase 3.14 Spec

## Problem

Phase 3.10/3.11/3.12/3.13 已经具备 wave planning、background execution、wave execution 和 local run index，但长期运行时仍缺少一个静态、可审计的治理 gate 来解释哪些操作可以直接执行、哪些必须阻塞、哪些必须等待用户确认。如果 executor 只依赖调用方自律，后续并发、危险操作、清理、重试和外部交互会难以治理。

## Goal

实现 Phase 3.14 Governance Policy：定义内置治理策略 contract，覆盖并发上限、manual confirmation、archive-only cleanup、retry 边界、stop conditions 和 audit evidence，并将 policy gate 接入 background/wave executor、doctor 和 CLI。

## Requirements

- Core 提供 Phase 3.14 governance policy contract/version、policy schema 和 decision schema。
- Policy 必须能解释 operation 是 allow、block 还是 confirm。
- Policy 必须覆盖 background executor、wave executor、sync-back apply、destructive git、external interaction 和 cleanup 操作。
- Policy 必须定义 background delegation 与 wave executor 并发上限。
- Destructive/shared-state/external/permission-sensitive 操作默认要求显式确认。
- Cleanup policy 必须保持 archive-only，不删除 run history。
- Retry policy 不允许重新打开 terminal delegation。
- Background executor 和 wave executor 必须在执行前评估 governance gate。
- Doctor 必须展示 governance policy contract visibility。
- CLI 提供 `sdd governance inspect|evaluate [options]`。
- Phase 3.14 不自动批准 destructive action，不绕过 Claude Code permission prompt，不引入远端 dashboard/cloud queue，不改变用户对 sync-back apply/commit/push 的显式控制。

## Acceptance

- `inspectGovernancePolicy` 返回内置 Phase 3.14 policy contract。
- `evaluateGovernancePolicy` 能对允许、阻塞和确认场景给出 reasons/issues/recommendations。
- Background executor 在达到并发上限时被 policy gate 阻塞并写入 governance event。
- Wave executor 在并发或风险 gate 命中时被 policy gate 阻塞并写入 governance event。
- Doctor 能报告 `governance_policy_contract` PASS。
- CLI 能 inspect policy，并 evaluate allow/confirm decisions。
