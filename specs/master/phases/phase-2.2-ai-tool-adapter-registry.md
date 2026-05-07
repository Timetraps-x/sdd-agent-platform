# Phase 2.2 AI Tool Adapter Registry 与 Claude Code Adapter

## 1. 定位

Phase 2.2 建立 AI 工具入口投影的 adapter registry，先实现 Claude Code adapter contract，为后续 `sdd init/update/doctor` 生成和检查 `.claude` entries 提供稳定抽象。

## 2. 依赖

```yaml
depends_on:
  - phase-2.0-ai-tool-entry-projection
  - phase-2.1-global-cli-install
blocks:
  - phase-2.3-init-update-generated-entries
  - phase-2.4-instruction-api-thin-entries
  - phase-2.6-doctor-drift-check
  - phase-2.7-entry-projection-e2e
```

## 3. 范围

- 新增 AI tool adapter registry contract。
- 新增 Claude Code adapter。
- 定义 generated artifact model：path、kind、id、contract、content、hash。
- 定义 frontmatter metadata：`sdd_managed`、`sdd_contract`、`sdd_version`、`sdd_tool`、`sdd_artifact_kind`、`sdd_artifact_id`、`sdd_source`、`sdd_hash`。
- 定义 drift 状态：created、unchanged、updated、missing、drifted、foreign、conflict、skipped。
- 新增 projection render/hash/check 的 core tests。

## 4. 非目标

- 不接入 `sdd init` 写文件流程。
- 不实现 `sdd update` CLI。
- 不扩展 doctor。
- 不实现 OpenCode/Cursor adapter，只保留接口扩展点。

## 5. 交付物

- `packages/core/src/ai-tools.ts`。
- Claude Code adapter 的 artifact template。
- projection/hash/drift unit tests。
- `specs/master/phase2.2-{spec,plan,tasks,validation}.md`。

## 6. 验收标准

- 可以在内存中生成 Claude Code entry artifact 列表。
- 生成 artifact 路径与 Phase 2.0 contract 一致。
- metadata 和 body hash 可稳定校验。
- foreign file 不被误判为可覆盖 managed file。
- Typecheck/tests/build 通过。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-2.2-ai-tool-adapter-registry.md
required_by:
  - phase-2.3-init-update-generated-entries
  - phase-2.4-instruction-api-thin-entries
  - phase-2.6-doctor-drift-check
  - phase-2.7-entry-projection-e2e
```
