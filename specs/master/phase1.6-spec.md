# Phase 1.6 Spec — Artifact / Delegation Contract

## 1. 目标

在 Phase 1.2 runtime skeleton、Phase 1.3 static contracts 和 Phase 1.5 parser/task model 之上，实现最小 artifact / delegation contract 支持，让 agent 输出可以通过 `sdd-result` artifact 与 delegation liveness record 被校验、恢复和审计。

本阶段只负责 contract 表示、解析、校验和只读 CLI 验证；不启动 subagent，不执行 task loop，不接入 Claude Code command gate。

## 2. 范围

- 解析 Markdown artifact 内的 `sdd-result` fenced block。
- 校验 `contract`、`version`、`agent`、`task`、`status`、`artifacts`。
- 校验 run-relative artifact path 与 artifact-root-relative helper path 的边界。
- 提供安全 artifact write/read helper，限制在 `.sdd/runs/<run_id>/artifacts` 下。
- 表示 delegation liveness record：started / running / terminal / stale。
- 校验 delegation terminal event、RUNNING stale 和 COMPLETED expected artifact。
- 提供只读 artifact contract validation CLI：`sdd artifact validate`。

## 3. 非目标

- 不实现 Claude Code command integration 或 lifecycle gate execution。
- 不启动 Claude Code subagent，不做 agent dispatch 或实际 subagent execution。
- 不实现 single task loop、retry、background supervisor、worktree orchestration。
- 不实现 Phase 1.9 goal-level verifier 或 doctor hardening；仅做 artifact/delegation contract validation。
- 不执行 validation command，不做 sync-back writer，不自动改写上游 SDD Markdown。

## 4. 依赖

- `specs/master/phases/phase-1.6-artifact-delegation-contract.md`
- `schemas/contracts/sdd-result-contract.md`
- `schemas/contracts/delegation-liveness-contract.md`
- `packages/core/src/index.ts`
- `packages/cli/src/main.ts`

## 5. 验收标准

- 合法 `sdd-result` artifact 能通过校验。
- 缺失 artifact、空 artifact、格式错误、task mismatch 能被判定为 invalid。
- Artifact path canonicalization 能拒绝目录逃逸和错误 path scope。
- Delegation terminal state 与 stale RUNNING 能被 contract checks 检出。
- COMPLETED delegation 会校验 expected artifact 的 `sdd-result` contract。
- TypeScript typecheck、tests、build 和 artifact validation smoke 通过。
