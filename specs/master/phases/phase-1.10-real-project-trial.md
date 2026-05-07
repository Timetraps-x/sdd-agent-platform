# Phase 1.10 真实项目验收试跑

## 1. 定位

Phase 1.10 在 Phase 1.0~1.9 全部完成后，用当前 TypeScript/Node 平台仓库中的 synthetic trial branch 验证 Phase 1 是否具备端到端闭环能力。真实业务仓库 / Java-Spring-MyBatis 试跑不在本次已执行范围内，作为后续 Phase 2 readiness 或业务接入试点。

本阶段是 Phase 1 的验收试跑，不引入 Phase 2 的 worktree、tool registry、dashboard 或 run database。

## 2. 依赖

```yaml
depends_on:
  - phase-1.0-lifecycle-research
  - phase-1.1-architecture-baseline
  - phase-1.2-runtime-skeleton
  - phase-1.3-contract-templates-adapters
  - phase-1.4-commands-agents-workflows
  - phase-1.5-sdd-parser-task-model
  - phase-1.6-artifact-delegation-contract
  - phase-1.7-claude-code-command-integration
  - phase-1.8-single-task-loop
  - phase-1.9-goal-verify-doctor
blocks: []
```

## 3. 范围

- 在当前平台仓库使用已有 `.sdd/project.yml`。
- 使用 `specs/trial/spec.md` / `plan.md` / `tasks.md` 描述一个 synthetic trial task。
- 通过 CLI 覆盖 lifecycle decide、task parsing、single-task loop、goal-level verify 和 doctor。
- 以显式 supplied reviewer / validator artifacts 验证 artifact contract、state/events、acceptance coverage 和 sync-back proposal。
- 记录并修复 doctor 对历史 smoke runs 的 housekeeping gaps。
- 生成 Phase 1 completion checkpoint。

## 4. 非目标

- 不并发执行多个 task。
- 不自动 commit / push / PR。
- 不要求 Phase 2 的 worktree、tool registry、dashboard。
- 不用试跑结果反向静默改写上游 spec/plan/tasks。

## 5. 交付物

- Synthetic trial run 目录：`.sdd/runs/20260501-020/`。
- review / validation / acceptance-coverage / sync-back proposal artifacts。
- Phase 1 completion checkpoint：clean `PASS`。
- Phase 2 readiness / open gaps 结论，包括真实业务仓库试点和 external-agent coverage；doctor housekeeping 已修复。

## 6. 验收标准

- 一个 synthetic trial task 能完成 lifecycle decision、task parsing、single-task loop、goal-level validation 和 sync-back proposal。
- Doctor 对历史 run 的 housekeeping gaps 先明确暴露，再经历 evidence repair，并通过 clean rerun。
- 未解决问题进入 gap report / validation limitation，而不是硬标完成。
- Runtime 不自动 commit / push / PR，不调用外部 agent API，不自动改写上游 spec/plan/tasks。
- 阶段 checkpoint 能明确判断 Phase 1 是否可收口，以及哪些事项进入 Phase 2 readiness backlog。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.10-real-project-trial.md
required_by: []
next_phase_candidate: phase-2
```
