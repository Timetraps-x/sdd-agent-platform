# Phase 5.4 Managed Assets / Query Status Harness

## 1. 定位

Phase 5.4 实现 managed entry manifest、doctor drift 和 `QueryStatusContract`，统一 status、doctor、run inspect、debug drill-down 的读取模型和输出边界。

## 2. 依赖

- depends_on: Phase 5.3 Task Graph / Run Evidence Harness
- blocks: Phase 5.5 Eval / Learning / Context Pack Harness

## 3. 范围

- managed asset manifest 字段：path、artifact id、tool、version、hash、ownership、drift status、source contract、last projected time。
- doctor 区分 current / drifted / user-modified / foreign。
- update 默认只修 managed drift，不覆盖用户改动。
- `status = next action`。
- `doctor = health audit`。
- `run inspect = run evidence`。
- debug commands = drill-down。

## 4. 非目标

- 不建设 dashboard database。
- 不把 debug/platform commands 平铺给普通用户。
- 不让 generated command 承担核心 workflow brain。

## 5. 验收标准

- managed assets 可被 manifest 跟踪。
- doctor drift 分类清晰。
- status/doctor/run inspect/debug 输出边界清晰。
- `npm test`、`npm run build` 通过。
