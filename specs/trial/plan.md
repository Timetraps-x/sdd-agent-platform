# Trial Plan — Synthetic Real Project Task

## Scope

本 trial 使用当前 `sdd-agent-platform` 仓库作为真实项目工作树；任务为合成验收任务，不修改生产代码。

## Runtime Boundaries

- 使用 `.sdd/project.yml` 中的 current worktree / sync_back_mode: proposal。
- 不使用外部 agent API；reviewer/validator 以预置 `sdd-result` artifact 模拟已完成 agent 输出。
- 不执行 commit / push / PR。
- 不自动写回 `specs/trial/tasks.md`；只检查 `.sdd/runs/<run_id>/artifacts/sync-back-proposal.md`。

## Validation Strategy

- 平台自身验证：`npm run typecheck`、`npm test`、`npm run build`。
- CLI trial：`run create`、`lifecycle decide`、`tasks list`、`tasks inspect`、`do task`、`verify task`、`doctor`。
