# Phase 3.2 Plan

## Approach

1. 在 `packages/core/src/index.ts` 增加 plugin loading contract 类型和内置 contract 常量。
2. 增加 `listToolPluginContracts(projectRoot)` 与 `inspectToolPluginContract(projectRoot, pluginId)`。
3. 让 plugin contract 引用 Phase 3.1 capability id，并在 API/doctor 中检查 capability compatibility。
4. 在 `doctor` 中加入 `plugin_loading_contract` PASS/FAIL check。
5. 在 `packages/cli/src/main.ts` 增加 `sdd plugins list [--json]` 与 `sdd plugins inspect <id> [--json]`。
6. 更新 CLI help。
7. 在 `packages/core/src/index.test.ts` 增加 API/CLI/doctor 测试。
8. 更新 Phase 3.2 retained docs/indexes。
9. 运行 typecheck/test/build/doctor latest-only 和 plugin CLI smoke。

## Baseline plugin contracts

- `sdd-cli-runtime`：映射 `sdd-cli` capability，本地 CLI/runtime asset contract。
- `hashline-edit-adapter`：映射 `hashline-edit` capability，UTF-8 anchor edit adapter contract。
- `native-file-edit-adapter`：映射 `native-file-edit` capability，native file edit fallback contract。
- `git-local-inspection`：映射 `git-local` capability，本地 git read-only inspection contract。
- `validation-command-runner`：映射 `validation-command` capability，项目验证命令执行边界 contract。
- `artifact-run-hygiene-tools`：映射 `artifact-run-hygiene` capability，artifact template/validate 与 run archive/doctor scope contract。
- `browser-ui-check-adapter`：映射 `browser-ui-check` capability，browser/manual UI check contract。

## Safety

- Plugin contract 是声明层，不执行插件。
- Phase 3.2 不扫描外部目录，不下载、不安装、不启动任何 plugin asset。
- Plugin contract 不授予权限，不绕过 Claude Code permission prompt。
- Load mode 只用于 future loader/scheduler 判断，不自动加载。
- Forbidden uses 必须明确禁止 dynamic execution、external plugin scan、permission injection、background write、worktree 和 dependency wave。
