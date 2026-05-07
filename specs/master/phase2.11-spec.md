# Phase 2.11 Spec

## Problem

Phase 2.10 后，`sdd init` 已能完成 onboarding scaffold，但真实全链路 smoke 暴露了 artifact 和 run hygiene 的使用摩擦：用户容易把业务源码路径写进 `sdd-result.artifacts`，容易忘记 artifact 自引用路径，也容易遗漏 validator artifact 中的 Acceptance 原文；同时失败探索 run 会持续影响正常 `doctor`。

## Goal

在不放松 contract、不中断审计链路的前提下，提供 artifact 模板、校验建议和 run archive/doctor scope 控制，让 Phase 2 工作流更适合普通用户稳定执行。

## Requirements

- 提供 `sdd artifact template <artifacts/path.md> --task <task_id> --agent <agent> [--branch <branch>] [--status <status>]`。
- Artifact template 必须输出合法 `sdd-result-v1` fenced block，并包含当前 artifact run-relative self path。
- Validator template 必须复制 exact Acceptance text，供 goal-level verify deterministic matching。
- `sdd artifact validate` 默认输出 human-readable report，`--json` 保持机器可读输出。
- Artifact validation recommendation 必须说明业务源码/测试文件应写入 `## Evidence`，不是 `sdd-result.artifacts`。
- 提供 `sdd run archive <run_id> [--reason <text>]`，归档 run、取消 running delegation、保留 evidence。
- `sdd doctor` 支持默认跳过 archived runs，支持 `--latest-only` 和 `--all-runs`。
- Generated Claude Code entries 和 instruction payload 必须推荐 artifact template/validate 与 exact Acceptance mapping。

## Acceptance

- Reviewer template 可直接通过 `validateSddResultArtifact` 结构校验。
- Validator template 包含任务 Acceptance 原文。
- Goal-level verify 在 exact Acceptance mapping 存在时 PASS，在 paraphrase evidence 下仍 BLOCKED。
- Archived run 不污染默认 doctor。
- `doctor --latest-only` 忽略旧失败 run，`doctor --all-runs` 保留历史审计能力。
- README 和用户指南描述新的 artifact/run hygiene 路径。
