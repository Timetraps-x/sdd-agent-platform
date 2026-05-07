# Phase 2.3 Init / Update Generated Entries 闭环 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.3-init-update-generated-entries.md` 的执行 spec。

## 1. 目标

把 AI entry projection 接入 `sdd init`，并新增 `sdd update`，形成 generated entries 创建、检查、修复闭环。

## 2. 范围

- `sdd init [--force] [--ai auto|claude-code|none]`。
- 默认 `--ai auto` 生成 Claude Code entries。
- `sdd update [--check] [--ai auto|claude-code]`。
- `--check` 只检查不写入，发现 missing/drifted/foreign/conflict 返回非 0。
- update 写入 missing/drifted managed entries。
- foreign/conflict 不自动覆盖。

## 3. 非目标

- 不修改用户业务源码。
- 不自动提交 git。
- 不执行 Phase 3 worktree/background write。

## 4. 验收标准

- init 返回 `aiTools` projection summary。
- init 创建 `.sdd/project.yml`、`.sdd/runs/` 和 Claude Code entries。
- update check 能发现 drift。
- update 能修复 drift。
- foreign 文件保持原样。
