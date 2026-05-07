# Phase 1.10 Plan — 真实项目验收试跑

## 执行策略

1. 读取 Phase 1.10 artifact 与 phase index，确认只做真实项目试跑。
2. 使用当前项目作为真实工作树，创建 `specs/trial/` 合成 trial SDD 文档。
3. 运行平台自身验证命令。
4. 创建 clean run，记录 lifecycle decision。
5. 运行 task parsing CLI。
6. 准备本地 reviewer/validator `sdd-result-v1` artifacts。
7. 运行 single-task loop 与 goal-level verify。
8. 运行 doctor，记录只读 gap report。
9. 更新 retained docs、indexes 与 `PHASE_STATUS.md`。

## Trial Run

最终有效 run：`20260501-020`

有效 artifacts：

- `.sdd/runs/20260501-020/state.json`
- `.sdd/runs/20260501-020/events.jsonl`
- `.sdd/runs/20260501-020/artifacts/review-P1.10-T1.md`
- `.sdd/runs/20260501-020/artifacts/validation-P1.10-T1.md`
- `.sdd/runs/20260501-020/artifacts/acceptance-coverage-P1.10-T1.md`
- `.sdd/runs/20260501-020/artifacts/sync-back-proposal.md`

试跑中间 run：`20260501-019`

- 用于暴露 artifact contract 写法错误。
- 结果：blocked。
- 处理：不改平台代码；修正本地 artifact contract 后创建 clean run `20260501-020` 重跑。

## Commands

```text
npm run typecheck
npm test
npm run build
npm run sdd -- run create
npm run sdd -- lifecycle decide --run 20260501-020 --intent high --acceptance high --size small --tasks 1 --files 3 --layer docs --layer runtime --risk state-machine --impact-confidence high --validation clear --validation-available --validation-cost cheap --fanout local --reversibility reversible --requires-agents --checkpoint --source-artifact specs/trial/spec.md --source-artifact specs/trial/tasks.md --json
npm run sdd -- tasks list --branch trial
npm run sdd -- tasks inspect P1.10-T1 --branch trial
npm run sdd -- tasks gaps --branch trial
npm run sdd -- do task P1.10-T1 --branch trial --run 20260501-020 --review-artifact artifacts/review-P1.10-T1.md --validation-artifact artifacts/validation-P1.10-T1.md
npm run sdd -- verify task P1.10-T1 --branch trial --run 20260501-020 --review-artifact artifacts/review-P1.10-T1.md --validation-artifact artifacts/validation-P1.10-T1.md
npm run sdd -- doctor
```

## Implementation / Code Fix Policy

本阶段未修改 TypeScript 实现代码。试跑发现的 blocker 是 trial artifact contract 填写错误，属于试跑输入问题，不需要平台修复。
