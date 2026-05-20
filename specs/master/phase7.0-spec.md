# Phase 7.0 Spec — Core Runtime Modularization

## Goal

将 Phase 1~6 累积的 core/CLI runtime 从源码级拆分推进到稳定 package boundary：core 只通过明确 domain subpath exports 暴露 public API，CLI 不再穿透 `packages/core/src`，并在边界稳定后收口 doctor、router/routing、CLI registry 和 terminal renderer ownership。

## In scope

- package-local build output：`packages/core/dist`、`packages/cli/dist`。
- explicit `@sdd-agent-platform/core/<domain>` subpath exports；不恢复 root barrel。
- CLI/core import boundary regression。
- doctor check-family split，`doctor.ts` 只保留 orchestration。
- router routing strategy split，`routing.ts` 只保留 orchestration。
- CLI registry command/renderer family split，顶层入口保留 façade。
- doctor human terminal renderer 迁到 CLI renderer 层。
- Phase 7 status、architecture、README 和 validation evidence 同步。

## Out of scope

- 不改变 CLI 命令语义、文本输出格式、JSON contract、run state、event、artifact、schema、sync-back 语义。
- 不暴露 `@sdd-agent-platform/core/<folder>/<file>` 内部深路径。
- 不引入 ESLint、bundler 或新构建系统。
- 不提前实现 Phase 8 code graph、embedding store、graph database、AST/LSP 索引。

## Acceptance

- `npm run build`、`npm run typecheck`、`npm test` 通过。
- `npm pack --dry-run --json` 通过且发布内容包含 package-local CLI/core dist。
- `sdd status`、`sdd tasks list`、`sdd doctor --latest-only` master smoke 通过。
- CLI 中没有 relative core/src import 或 root `@sdd-agent-platform/core` import。
- `packages/core/src/index.ts` 不作为旧 mixed API barrel。
