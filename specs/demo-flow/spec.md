# Demo Flow Spec

## Problem

需要用平台仓库自身演示一次完整 SDD workflow，验证 Phase 2.9 的 status-first 入口能驱动 task inspect、do、verify、sync-back inspect/apply。

## Goals

- 创建一个隔离 demo task，不修改平台功能代码。
- 通过 CLI 完成 run/do/verify/sync-back 全链路。
- 验证 `tasks.md` 默认不被 do/verify 修改，只由显式 sync-back apply 写回。

## Non-goals

- 不修改业务逻辑代码。
- 不影响 `specs/master` phase 状态。
- 不提交或推送 git。

## Acceptance

- Demo task 能被 `sdd tasks inspect` 识别。
- Demo run 能完成 do 和 verify。
- `sync-back inspect` 能报告 ready。
- `sync-back apply` 能将 demo task 标记为 completed。
