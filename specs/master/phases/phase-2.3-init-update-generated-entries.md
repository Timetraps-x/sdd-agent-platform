# Phase 2.3 Init / Update Generated Entries 闭环

## 1. 定位

Phase 2.3 将 Phase 2.2 的 Claude Code adapter 接入 `sdd init` 与新增 `sdd update`，让目标仓库获得可刷新、可检查、不会覆盖用户手写文件的 generated entries。

## 2. 依赖

```yaml
depends_on:
  - phase-2.2-ai-tool-adapter-registry
blocks:
  - phase-2.4-instruction-api-thin-entries
  - phase-2.6-doctor-drift-check
  - phase-2.7-entry-projection-e2e
```

## 3. 范围

- 扩展 `sdd init [--force] [--ai auto|claude-code|none] [--json]`。
- `sdd init` 默认生成 `.sdd/project.yml`、`.sdd/runs/` 和 Claude Code entries。
- 新增 `sdd update [--ai auto|claude-code] [--check] [--json]`。
- `sdd update` 刷新 missing/drifted managed entries。
- `sdd update --check` 只检查并通过 exit code 报告 drift/conflict。
- foreign/conflict 默认不覆盖。

## 4. 非目标

- 不实现 instruction API 内容升级。
- 不扩展 doctor 报告。
- 不做 detector registry 迁移。
- 不做完整全局安装 E2E。

## 5. 交付物

- CLI `init` 参数扩展。
- CLI `update` 命令。
- generated entries 写入/检查/刷新实现。
- init/update unit tests 与 CLI smoke。
- `specs/master/phase2.3-{spec,plan,tasks,validation}.md`。

## 6. 验收标准

- fresh `sdd init` 在临时目标仓库生成 `.sdd` 和 `.claude` entries。
- 删除 managed entry 后，`sdd update` 可恢复。
- 修改 managed entry 后，`sdd update --check` 返回非 0，`sdd update` 可刷新。
- foreign file 不被覆盖，并给出可操作错误。
- Typecheck/tests/build 通过。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-2.3-init-update-generated-entries.md
required_by:
  - phase-2.4-instruction-api-thin-entries
  - phase-2.6-doctor-drift-check
  - phase-2.7-entry-projection-e2e
```
