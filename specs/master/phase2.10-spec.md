# Phase 2.10 Spec

## Problem

Phase 2 已完成安装、初始化、Claude Code entries 和 status-first workflow，但 `sdd init` 仍只生成 runtime 与 AI entries。新项目接入后还需要依赖后续 slash command 或用户手动创建 `spec.md`、`plan.md`、`tasks.md`，首次体验不完整。

## Goal

`init` 时一次性生成完整 onboarding artifact set：runtime 事实源、starter semantic docs、Claude Code managed entries。

## Requirements

- `sdd init --ai claude-code` 默认创建 `specs/master/spec.md`、`plan.md`、`tasks.md`。
- `tasks.md` 包含合法 starter `sdd-task` block：`ONBOARDING-1`。
- 支持 `--branch <branch>` 控制生成路径。
- 支持 `--no-scaffold-docs` 跳过 starter semantic docs。
- 默认保留已有 semantic docs。
- `--force` 可覆盖已有 semantic docs。
- Generated entries 和 instruction payload 必须反映 init 默认 scaffold 行为。

## Acceptance

- 空 Git 仓库 init 后 `sdd status` 可看到 semantic docs present。
- `sdd tasks inspect ONBOARDING-1` 可读。
- 测试覆盖 default/preserve/force/branch/skip。
- 文档说明 starter docs 是 onboarding placeholder，真实实现前应替换/细化。
