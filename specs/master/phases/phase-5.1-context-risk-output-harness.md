# Phase 5.1 Context / Risk / Output Harness

## 1. 定位

Phase 5.1 实现 SDD Harness Engineering 的第一组 runtime contracts：`ContextResolverContract`、`LifecycleRiskGateContract`、`OutputQualityContract`。

本阶段优先修复真实 trial 中最直接影响用户信任的三类问题：branch/project context 不准、lifecycle hard gate 漏判、`/sdd:*` 输出啰嗦且像源文档转写。

## 2. 依赖

- depends_on: Phase 5.0 SDD Harness Engineering Reframe and Contract Freeze
- blocks: Phase 5.2 Workflow / Agent Registry Harness

## 3. 范围

- Context resolver fallback：explicit branch > project config branch > current git branch > configured default。
- status / generated entry / lifecycle / tasks 等入口输出 branch source。
- lifecycle risk extraction 支持 `--from-file` / `--from-text`。
- deterministic risk signals：state-machine、concurrency、database/data-loss、security、SQL、API/schema、CI/build、external unknown。
- hard gate 命中时不得回落到 compact。
- 输出结构统一为 changed / decision / evidence / gaps / next。
- 输出优先表达平台新增判断，不复述源文档。

## 4. 非目标

- 不实现 workflow/agent registry。
- 不实现 task graph/run evidence。
- 不实现 managed asset manifest。
- 不实现 eval runner 或 Project Context Pack runtime。
- 不建设 OS、scheduler、plugin runtime、OpenCode clone。

## 5. 验收标准

- branch source 在 status 和相关入口中可见。
- lifecycle risk 可从文本/文件 deterministic 提取。
- hard gate 输出 reason、required stages、autonomy ceiling。
- 关键输出符合 changed / decision / evidence / gaps / next。
- `npm test`、`npm run build` 通过。
