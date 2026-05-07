# Phase 3.2 Spec

## Problem

Phase 3.1 已经把 tool/capability 边界提升为 core 可读取的静态 registry，但后续 plugin loader、background delegation、worktree 和 dependency wave 仍缺少插件资产层的机器可读 contract。若直接进入动态加载，平台无法先判断插件资产版本是否兼容、插件声明是否引用已知 capability、加载边界是否只读、是否存在禁止行为。

## Goal

建立静态 tool/plugin loading contract baseline，让平台能查询、展示并检查内置插件资产声明、版本兼容性和只读加载边界，但不执行动态加载、不扫描外部插件目录、不改变权限模型。

## Requirements

- Core 提供稳定 plugin loading contract 类型。
- Contract 至少覆盖当前内置能力对应的本地资产类别：SDD CLI/runtime、hashline/native editing adapter、git inspection、validation command、artifact/run hygiene、browser UI check。
- 每个 plugin contract 必须声明 version、compatible capability id、asset path、load mode、required evidence 和 forbidden uses。
- CLI 提供 `plugins list/inspect` 两类命令。
- Doctor 能检查 plugin contracts 是否可读取，且引用的 capability id 均存在。
- Tests 覆盖 API、CLI help/list/inspect、doctor check。

## Acceptance

- `sdd plugins list` 输出稳定 plugin contract 列表。
- `sdd plugins inspect sdd-cli-runtime` 输出版本、capability mapping、资产路径和禁用项。
- `sdd doctor --latest-only` 出现 `plugin_loading_contract` PASS。
- Phase 3.2 不引入 dynamic plugin loader、external plugin scan、permission injection、background write、worktree、dependency wave。
