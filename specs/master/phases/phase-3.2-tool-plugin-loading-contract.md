# Phase 3.2 Tool / Plugin Loading Contract

## 定位

Phase 3.2 在 Phase 3.1 capability registry 之后，建立 tool/plugin loading 的静态 contract baseline。目标是让平台能读取、展示并检查插件资产声明、版本兼容性和只读加载边界，为后续 background delegation、worktree isolation 和 dependency wave scheduler 提供安全前置 contract。

## 依赖

- Phase 3.0 Platform Extension Baseline。
- Phase 3.1 Tool / Capability Registry Baseline。
- Phase 2 generated entry、instruction API、doctor 和 artifact/run hygiene 稳定。

## 范围

- 在 core 中定义 plugin manifest / loading contract 类型。
- 声明内置 plugin asset baseline，不读取外部插件目录。
- 每个 plugin manifest 声明：id、title、version、compatible capability id、entry kind、asset path、load mode、checksum/evidence、forbidden uses。
- 提供 core API：list/inspect plugin loading contracts。
- 提供 CLI：`sdd plugins list [--json]`、`sdd plugins inspect <plugin_id> [--json]`。
- `sdd doctor` 增加 plugin loading contract visibility / compatibility check。
- 增加测试覆盖 API、CLI help/list/inspect、doctor check。
- 更新 Phase 3.2 retained docs 和 indexes。

## 非目标

- 不实现动态 plugin loader。
- 不扫描用户或第三方插件目录。
- 不执行插件入口、脚本或 MCP server。
- 不安装、更新或下载插件资产。
- 不注入工具权限。
- 不启动 background write agents。
- 不创建 worktree。
- 不实现 dependency wave scheduler。
- 不修改 Claude Code 原生权限模型。

## 交付物

- Core plugin loading contract types and APIs。
- Built-in static plugin contract declarations mapped to Phase 3.1 capabilities。
- CLI plugin list/inspect commands。
- Doctor plugin contract compatibility check。
- Tests for plugin contract API, CLI help/list/inspect and doctor visibility。
- Phase 3.2 spec/plan/tasks/validation docs and phase indexes。

## 验收标准

- `listToolPluginContracts(projectRoot)` 返回稳定、非空、排序后的 plugin contract set。
- `inspectToolPluginContract(projectRoot, id)` 能返回单个 contract，不存在时返回 null。
- 每个 plugin contract 引用的 capability id 必须存在于 Phase 3.1 capability registry。
- `sdd plugins list` 可读输出 plugin id/capability/load-mode。
- `sdd plugins list --json` 输出机器可读 JSON。
- `sdd plugins inspect <id>` 可读输出版本、兼容 capability、资产路径、边界和禁用项。
- `sdd doctor --latest-only` 包含 plugin loading contract PASS check。
- 不引入任何动态工具加载、插件执行、后台写、worktree 或并发执行行为。
