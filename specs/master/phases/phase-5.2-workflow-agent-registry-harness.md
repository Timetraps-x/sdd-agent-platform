# Phase 5.2 Workflow / Agent Registry Harness

## 1. 定位

Phase 5.2 将静态 `workflows/*.yml` 和 `agents/*.md` 升级为 Claude Code 等 AI tool harness 可见、可 inspect、可 validate 的 SDD contract。

## 2. 依赖

- depends_on: Phase 5.1 Context / Risk / Output Harness
- blocks: Phase 5.3 Task Graph / Run Evidence Harness

## 3. 范围

- `WorkflowGateContract`：required inputs、allowed agents、required artifacts、gate conditions、gap closure behavior、next action。
- `AgentRegistryContract`：agent id、role、allowed stage、capabilities、read/write boundary、tool allowlist、required artifact、verification expectation、autonomy ceiling、stop condition。
- `/sdd:spec`、`/sdd:plan`、`/sdd:tasks`、`/sdd:do` 能说明 agent 参与点和 evidence 落点。
- core/CLI 提供 workflow / agent inspect 或 validate 能力。

## 4. 非目标

- 不实现 run evidence 写入闭环。
- 不实现 task graph parser 的完整 runtime。
- 不绕过 Claude Code 权限模型。
- 不引入后台自主执行内核。

## 5. 验收标准

- workflow contract 可 inspect / validate。
- agent registry 字段完整且可被 CLI 或 generated entry 消费。
- slash commands 能说明 agent 使用边界。
- `npm test`、`npm run build` 通过。
