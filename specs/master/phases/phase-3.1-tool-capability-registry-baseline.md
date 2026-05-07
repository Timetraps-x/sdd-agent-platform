# Phase 3.1 Tool / Capability Registry Baseline

## 定位

Phase 3.1 是平台化扩展的第一个实现阶段。目标是把工具与能力边界从自然语言 prompt 中提升为 core 可读取、CLI 可查询、doctor 可检查的静态 capability registry，为后续 plugin loader、background delegation、worktree isolation 和 dependency wave scheduler 提供稳定前置 contract。

## 依赖

- Phase 3.0 Platform Extension Baseline。
- Phase 2.11 artifact/run hygiene。
- Phase 2 generated entry 和 instruction API 稳定。

## 范围

- 在 core 中定义内置 tool/capability registry。
- 每个 capability 声明：id、title、category、summary、side effect level、default availability、allowed stages、required evidence、forbidden uses。
- 提供 core API：list/inspect capability registry。
- 提供 CLI：`sdd capabilities list [--json]`、`sdd capabilities inspect <capability_id> [--json]`。
- `sdd doctor` 增加 capability registry visibility check。
- 增加测试覆盖 registry、CLI help、doctor check。
- 更新 Phase 3.1 retained docs 和 indexes。

## 非目标

- 不实现 plugin loader。
- 不动态加载外部工具或 MCP server。
- 不注入工具权限。
- 不启动 background write agents。
- 不创建 worktree。
- 不实现 dependency wave scheduler。
- 不修改 Claude Code 原生权限模型。

## 交付物

- Core capability registry types and APIs。
- CLI capability list/inspect commands。
- Doctor capability registry check。
- Tests for registry API, CLI help and doctor visibility。
- Phase 3.1 spec/plan/tasks/validation docs and phase indexes。

## 验收标准

- `listToolCapabilities(projectRoot)` 返回稳定、非空、排序后的 capability set。
- `inspectToolCapability(projectRoot, id)` 能返回单个 capability，不存在时返回 null。
- `sdd capabilities list` 可读输出 capability id/category/side-effect。
- `sdd capabilities list --json` 输出机器可读 JSON。
- `sdd capabilities inspect <id>` 可读输出边界、证据和禁用项。
- `sdd doctor --latest-only` 包含 capability registry PASS check。
- 不引入任何动态工具加载、后台写、worktree 或并发执行行为。
