# Phase 5.4 Spec

## Metadata

- phase_id: `5.4`
- title: `Managed Assets / Query Status Harness`
- status: `completed`
- depends_on: `5.3`
- blocks: `5.5`
- source_artifact: `specs/master/phases/phase-5.4-managed-assets-query-status-harness.md`

## Problem / Intent

入口投影、doctor、status、run inspect 和 debug command 容易输出重叠，generated entries 的 ownership 也需要可追踪。Phase 5.4 统一 managed assets 和 query/status 边界。

## Requirements

- FR-1: manifest 必须记录 path、artifact id、tool、version、hash、ownership、drift status、source contract、last projected time。
- FR-2: doctor 必须区分 current / drifted / user-modified / foreign。
- FR-3: update 默认只修 managed drift，不覆盖用户改动。
- FR-4: `QueryStatusContract` 必须保持 status/doctor/run inspect/debug 的职责边界。
- FR-5: `docs/architecture/command-information-architecture.md` 必须作为输出边界依据。

## Out of Scope

- dashboard database。
- debug command 默认暴露给主路径用户。
- generated command 直接写核心状态。

## Acceptance Criteria

- AC-1: managed manifest 可解释生成资产所有权。
- AC-2: doctor drift 分类可测试。
- AC-3: status/doctor/run inspect/debug 无明显重复输出。
- AC-4: `npm test`、`npm run build` 通过。
