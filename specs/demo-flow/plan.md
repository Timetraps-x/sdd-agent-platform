# Demo Flow Plan

## Approach

1. 在 `specs/demo-flow/tasks.md` 定义一个 no-op 演示任务。
2. 创建 run，并写入符合 `sdd-result-v1` 的 implement/review/validation artifacts。
3. 运行 `sdd do task DEMO-T1 --branch demo-flow`，传入 artifact paths。
4. 运行 `sdd verify task DEMO-T1 --branch demo-flow`，默认按 partition + taskId 解析 latest eligible run。
5. 运行 `sdd sync-back inspect` 和显式 `sdd sync-back apply`。

## Risk Controls

- 只写 `specs/demo-flow` 与 `.sdd/runs/<run_id>`。
- 不修改平台功能代码。
- 不对真实目标仓库运行任何写操作。

## Validation

- `sdd status --branch demo-flow`
- `sdd tasks inspect DEMO-T1 --branch demo-flow`
- `sdd do task DEMO-T1 --branch demo-flow ...`
- `sdd verify task DEMO-T1 --branch demo-flow`
- `sdd sync-back inspect --branch demo-flow --task DEMO-T1`
- `sdd sync-back apply --branch demo-flow --task DEMO-T1`
