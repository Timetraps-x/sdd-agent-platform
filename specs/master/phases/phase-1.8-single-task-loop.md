# Phase 1.8 单 Task 执行闭环

## 1. 定位

Phase 1.8 在 runtime、command assets、parser、artifact/delegation contract 和 command integration 完成后，跑通一个 task 从选择、实现、审查、验证到 sync-back proposal 的最小闭环。

本阶段仍只做单 task、前台串行执行，不做多 task 并发、自动 commit/push 或自动写回 SDD 文档。

## 2. 依赖

```yaml
depends_on:
  - phase-1.2-runtime-skeleton
  - phase-1.4-commands-agents-workflows
  - phase-1.5-sdd-parser-task-model
  - phase-1.6-artifact-delegation-contract
  - phase-1.7-claude-code-command-integration
blocks:
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```

## 3. 范围

- task selection。
- 以 supplied artifact 形式接入 implementer / reviewer / optional debugger / validator evidence。
- implementer 前台串行写代码仍由 Claude Code 主会话执行；runtime 不发明外部 agent API。
- review 或 validation 失败时 debugger 最多通过一个显式 debug artifact 接入。
- 生成 task result、delegation state、gap report。
- 生成 sync-back proposal。

## 4. 非目标

- 不并发执行多个 task。
- 不自动写回 `tasks.md`。
- 不自动 commit / push。
- 不实现 worktree isolation。
- 不实现 dashboard 或 run database。
- 不实现 Phase 1.9 goal-level verifier / doctor hardening。
- 不执行真实项目试跑，Phase 1.10 再验收。

## 5. 交付物

- 单 task 执行 runtime flow。
- `/sdd-do` / `sdd do task` 最小闭环行为。
- implement / review / validation / debug artifact contract 接入。
- delegation liveness state transitions。
- gap report。
- sync-back proposal。

## 6. 验收标准

- 一个 artifact-mode synthetic/demo task 能通过显式 supplied reviewer / validator artifacts 完成 loop、state/events 和 proposal。
- 失败时能产出 gap report，不硬标完成。
- debugger 只介入一次。
- sync-back proposal 只提出写回建议，不自动改写上游 Markdown。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.8-single-task-loop.md
required_by:
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```
