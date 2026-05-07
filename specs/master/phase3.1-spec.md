# Phase 3.1 Spec

## Problem

Phase 1/2 的工具使用规则主要存在于 Claude Code instructions、项目说明和人工约定中。进入 Phase 3 后，后续 plugin loader、background delegation、worktree 和 dependency wave 都需要可机器读取的能力边界，否则调度器和 doctor 无法判断一个能力是否可用、是否有写副作用、是否需要 evidence。

## Goal

建立静态 tool/capability registry baseline，让平台能查询、展示并检查内置能力声明，但不执行动态加载或权限变更。

## Requirements

- Core 提供稳定 capability registry 类型。
- Registry 至少覆盖当前 Phase 1/2 已依赖的能力类别：CLI/runtime、file editing、git、validation、browser/manual UI、artifact/run hygiene。
- 每个 capability 必须声明 side-effect level 和 forbidden uses。
- CLI 提供 list/inspect 两类命令。
- Doctor 能检查 registry 是否可读取且包含必需 baseline capabilities。
- Tests 覆盖 API、CLI help、doctor check。

## Acceptance

- `sdd capabilities list` 输出稳定能力列表。
- `sdd capabilities inspect sdd-cli` 输出能力边界和禁用项。
- `sdd doctor --latest-only` 出现 `capability_registry` PASS。
- Phase 3.1 不引入 plugin loader、background write、worktree、dependency wave。
