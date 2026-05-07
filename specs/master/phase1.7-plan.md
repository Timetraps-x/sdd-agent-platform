# Phase 1.7 Plan — Claude Code Command Integration

## 1. 实施策略

以 `packages/core` 作为 lifecycle decision gate 的事实源，`packages/cli` 只做信号收集、命令分发、输出和可选 run record 写入。

Slash command / skill 入口保持薄 contract：命令文档只说明先调用 `sdd lifecycle decide`，再根据 profile/checkpoint 决定后续阶段，不复制 runtime 状态机。

## 2. 实现顺序

1. 在 core 中补齐 lifecycle signal 与 decision gate 类型。
2. 实现 canonical hard gates、direct whitelist、profile routing、confidence 与 checkpoint 判断。
3. 实现 required/skipped stages、reasons、escalation triggers、command boundaries 输出。
4. 实现 `recordLifecycleDecision(projectRoot, runId, record)`，只写已有 run state/events。
5. 在 CLI 增加 `sdd lifecycle decide [options]`，支持 `--json` 与 `--run <run_id>`。
6. 更新 `commands/sdd-spec/plan/tasks/do/verify/doctor.md` gate contract。
7. 添加 lifecycle gate tests。
8. 更新 retained docs、README/top-level indexes/PHASE_STATUS。
9. 运行 typecheck、tests、build 与 smoke commands。

## 3. Core API

- `evaluateLifecycleDecisionGate(input, decidedAt?)`
- `recordLifecycleDecision(projectRoot, runId, record)`
- `renderLifecycleDecisionGate(result)`

## 4. CLI

```text
sdd lifecycle decide [options]
```

关键 options：

- `--direct-safe`
- `--risk <tag>`
- `--contract <name>`
- `--impact-confidence <high|medium|low>`
- `--acceptance <high|medium|low>`
- `--validation <clear|partial|unclear>`
- `--external-unknown`
- `--architecture`
- `--checkpoint`
- `--permission <name>`
- `--run <run_id>`
- `--json`

## 5. 边界控制

- Gate 可以执行 lifecycle decision；不能执行 task loop。
- Gate 可以记录到 existing run；不能自动创建完整执行 workflow。
- Gate 可以输出 command boundaries；不能调度 agents/workflows。
- `direct` 是白名单，不是默认路径。
- Hard gates 优先于 user preference、文件数量和时间压力。

## 6. 验证计划

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run sdd -- lifecycle decide --direct-safe`
- `npm run sdd -- lifecycle decide --risk database --json`
- `npm run sdd -- run create`
- `npm run sdd -- lifecycle decide --risk api --contract command-gate --run <run_id>`
- `npm run sdd -- run status <run_id>`
