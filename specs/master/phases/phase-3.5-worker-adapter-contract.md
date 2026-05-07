# Phase 3.5 Worker Adapter Contract

## 定位

Phase 3.5 定义 worker adapter 的输入、输出、权限提示和执行边界。它只建立 adapter contract，不启动长期 worker，不进行后台写入。

## 依赖

- Phase 3.3 Delegation Queue Contract。
- Phase 3.4 Delegation State Machine。
- Phase 3.1 capability registry。
- Phase 3.2 plugin loading contract。

## 范围

- 定义 worker adapter manifest、输入 payload、输出 artifact reference 和 exit status。
- 定义 adapter 所需 capability、side effect、permission prompt 描述和 forbidden uses。
- 定义 adapter 与 Claude Code/subagent/CLI task 的边界。
- 提供只读 list/inspect API 和 CLI 可见性。

## 非目标

- 不执行 adapter。
- 不生成 background process。
- 不绕过 Claude Code permission prompt。
- 不注入外部 plugin 权限。
- 不实现 wave executor。

## 交付物

- `phase3.5-spec.md`、`phase3.5-plan.md`、`phase3.5-tasks.md`、`phase3.5-validation.md`。
- Worker adapter contract 类型和内置 adapter manifest。
- CLI/doctor visibility。

## 验收标准

- Adapter contract 明确 input/output/status/evidence/forbidden uses。
- 每个 adapter 引用已存在 capability 和 plugin contract。
- CLI 能 list/inspect worker adapter。
- Doctor 能检查 adapter compatibility。

## 下游引用

- Phase 3.11 使用本 phase 的 adapter contract 执行单 task background delegation。
- Phase 3.12 使用本 phase 的 adapter contract 执行 wave 中的 task。
