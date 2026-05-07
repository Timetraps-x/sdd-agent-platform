# Phase 3.1 Plan

## Approach

1. 在 `packages/core/src/index.ts` 增加 capability registry 类型和内置 registry 常量。
2. 增加 `listToolCapabilities(projectRoot)` 与 `inspectToolCapability(projectRoot, capabilityId)`。
3. 在 `doctor` 中加入 `capability_registry` PASS/FAIL check，检查 baseline capabilities 存在。
4. 在 `packages/cli/src/main.ts` 增加 `sdd capabilities list [--json]` 与 `sdd capabilities inspect <id> [--json]`。
5. 更新 CLI help。
6. 在 `packages/core/src/index.test.ts` 增加 API/CLI/doctor 测试。
7. 更新 Phase 3.1 retained docs/indexes。
8. 运行 typecheck/test/build/doctor latest-only。

## Baseline capabilities

- `sdd-cli`：本地 SDD runtime/CLI 能力。
- `hashline-edit`：UTF-8 文本锚点编辑能力。
- `native-file-edit`：native Read/Edit/Write fallback 能力。
- `git-local`：本地 git 状态检查和非破坏性读操作。
- `validation-command`：项目验证命令执行能力。
- `artifact-run-hygiene`：artifact template/validate 与 run archive/doctor scope 能力。
- `browser-ui-check`：前端 UI 手动验证能力。

## Safety

- Registry 是声明层，不执行工具。
- Registry 不授予权限，不绕过 Claude Code permission prompt。
- Side-effect level 只用于 future scheduling/doctor visibility，不自动调度。
- Forbidden uses 必须明确禁止 destructive cleanup、force push、自动 sync-back apply、后台写和 worktree。 
