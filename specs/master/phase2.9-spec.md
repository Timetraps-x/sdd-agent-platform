# Phase 2.9 Spec

## Problem

Phase 2.8 已经补齐项目状态、run inspect 与 sync-back inspect/apply，但 Claude Code generated entries 仍偏静态命令说明。用户在 Claude Code 里触发 `/sdd`、`/sdd:do`、`/sdd:verify` 时，入口应直接使用 Phase 2.8 状态源推动下一步，而不是让用户自己理解 CLI help 和 run 文件结构。

## Goals

- 让 `/sdd` 成为 status-first 工作流入口。
- 让 `/sdd:do` 能围绕 selected task boundary 引导 do flow。
- 让 `/sdd:verify` 能围绕 latest/selected run 引导 verify 与 sync-back inspect。
- 保持 generated entries 为薄入口，动态状态仍来自 CLI/core。
- 明确 `sync-back apply` 必须用户显式批准。

## Non-goals

- 不新增 runtime API 或 CLI command surface。
- 不实现 background write agent、worktree、并发调度或 plugin loader。
- 不自动执行 sync-back apply。
- 不改变 Phase 2.8 sync-back 安全门禁。

## Acceptance

- `/sdd`、`/sdd:do`、`/sdd:verify` 的 generated command body 均以 `sdd status` 或 run/status 状态源作为入口。
- `sdd instructions overview|do|verify --json` 返回的 required commands 与 forbidden side effects 与 generated entries 一致。
- generated entries 刷新后 `sdd doctor` 不报告平台仓库 drift。
- 自动化测试覆盖新增 workflow command 文案与 instruction payload。
