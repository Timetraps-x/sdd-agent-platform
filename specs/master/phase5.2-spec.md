# Phase 5.2 Spec

## Metadata

- phase_id: `5.2`
- title: `Workflow / Agent Registry Harness`
- status: `completed`
- depends_on: `5.1`
- blocks: `5.3`
- source_artifact: `specs/master/phases/phase-5.2-workflow-agent-registry-harness.md`

## Problem / Intent

当前 agents 和 workflows 仍偏静态资产，用户在真实流程中看不到 agent 何时参与、产出什么 evidence、受什么边界约束。Phase 5.2 先让 workflow/agent contract 可见、可审计、可验证。

## Requirements

- FR-1: `WorkflowGateContract` 必须定义 required inputs、allowed agents、required artifacts、gate conditions、gap closure behavior、next action。
- FR-2: `AgentRegistryContract` 必须定义 id、role、allowed stage、capabilities、read/write boundary、tool allowlist、required artifact、verification expectation、autonomy ceiling、stop condition。
- FR-3: core/CLI 必须提供 workflow/agent inspect 或 validate 入口。
- FR-4: generated slash commands 必须说明 agent 参与点和 evidence 落点。

## Out of Scope

- run evidence runtime。
- 自动调度所有 agents。
- 绕过用户确认或 Claude Code 权限。

## Acceptance Criteria

- AC-1: 每个 workflow 的进入/退出条件清晰。
- AC-2: 每个 agent 的读写边界和 autonomy ceiling 清晰。
- AC-3: 用户能从 command 输出看到 agent 参与点。
- AC-4: `npm test`、`npm run build` 通过。
