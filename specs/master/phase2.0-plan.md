# Phase 2.0 AI 工具入口投影执行基线 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.0-ai-tool-entry-projection.md` 的执行 plan。

本阶段只拆分 Phase 2 小阶段并冻结可执行 contract，不实现代码。

## 1. 执行原则

```text
Phase 1 SDD closed loop
  -> Phase 2.0 execution baseline
  -> Phase 2.1 install/package hardening
  -> Phase 2.2 AI tool adapter registry
  -> Phase 2.3 init/update generated entries
  -> Phase 2.4 instruction API + thin entries
  -> Phase 2.5 detector registry
  -> Phase 2.6 doctor drift checks
  -> Phase 2.7 E2E install/init/trigger/update/doctor/uninstall
```

关键约束：

- CLI/core 保留 workflow brain。
- generated Claude Code files 只能是薄入口。
- 不覆盖 foreign files。
- 不把 Phase 3 的 worktree/concurrency/plugin loader 提前做进 Phase 2。
- 不把 Phase 4 npm distribution、Phase 5 harness engineering、Phase 6 agent/skill runtime harness 或 Phase 7 代码知识图谱提前做进 Phase 2。

## 2. 输入文档

- `specs/master/phases/phase-2.0-ai-tool-entry-projection.md`
- `docs/architecture/sdd-agent-platform-architecture.md`
- `docs/research/自建_SDD_subagent_工作流平台方案.md`
- `README.md`
- `package.json`
- `packages/cli/src/main.ts`
- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`

## 3. 更新策略

### 3.1 Phase artifacts

新增：

- `specs/master/phases/phase-2.1-global-cli-install.md`
- `specs/master/phases/phase-2.2-ai-tool-adapter-registry.md`
- `specs/master/phases/phase-2.3-init-update-generated-entries.md`
- `specs/master/phases/phase-2.4-instruction-api-thin-entries.md`
- `specs/master/phases/phase-2.5-detector-registry.md`
- `specs/master/phases/phase-2.6-doctor-drift-check.md`
- `specs/master/phases/phase-2.7-entry-projection-e2e.md`

### 3.2 Phase 2.0 retained docs

新增：

- `specs/master/phase2.0-spec.md`
- `specs/master/phase2.0-plan.md`
- `specs/master/phase2.0-tasks.md`
- `specs/master/phase2.0-validation.md`

### 3.3 索引与状态

更新：

- `specs/master/phases/README.md`
- `specs/master/phases/PHASE_STATUS.md`
- `specs/master/spec.md`
- `specs/master/plan.md`
- `specs/master/tasks.md`
- `specs/master/validation.md`

Phase 2.0 validation 写入证据后，才允许将 Phase 2.0 标记为 completed，并打开 Phase 2.1。

## 4. 手工验证方式

本阶段只做 manual doc review：

- 检查 Phase 2.1~2.7 artifact 是否具备必备结构。
- 检查依赖链是否线性且无倒置。
- 检查安装策略、init 产物、entry metadata、update/doctor/instructions/detector/E2E 是否有明确归属 phase。
- 检查非目标是否继续排除 Phase 3/4 能力。
- 检查顶层索引和 phase status 是否一致。

不运行项：

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm pack`
- `npm link`
- 目标仓库 E2E

原因：Phase 2.0 只修改 Markdown 文档，没有修改 TypeScript、配置、依赖、接口契约或构建脚本。

## 5. 风险处理

### 阶段过粗

用 2.1~2.7 拆分安装、adapter、generated entries、instruction API、detector、doctor drift 和 E2E，避免一个 Phase 2.0 同时承载所有实现。

### 最小补丁倾向

每个实现小阶段都必须先有 contract 和测试验收，不允许只把 `.claude` 文件写出来就算完成。

### 入口 prompt 膨胀

所有 generated entry 都必须调用 CLI/core instructions，不能复制完整 workflow。
