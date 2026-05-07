# Phase 2.0 AI 工具入口投影执行基线 Validation

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.0-ai-tool-entry-projection.md` 的验证记录。

Phase 2.0 验证通过后，更新 `specs/master/phases/PHASE_STATUS.md`，并保留本文件作为 phase 命名验证文档。

## 1. 验证范围

本阶段只验证 Phase 2 拆分和执行基线文档，不验证 runtime 代码。

验证对象：

- `specs/master/phases/phase-2.0-ai-tool-entry-projection.md`
- `specs/master/phases/phase-2.1-global-cli-install.md`
- `specs/master/phases/phase-2.2-ai-tool-adapter-registry.md`
- `specs/master/phases/phase-2.3-init-update-generated-entries.md`
- `specs/master/phases/phase-2.4-instruction-api-thin-entries.md`
- `specs/master/phases/phase-2.5-detector-registry.md`
- `specs/master/phases/phase-2.6-doctor-drift-check.md`
- `specs/master/phases/phase-2.7-entry-projection-e2e.md`
- `specs/master/phase2.0-spec.md`
- `specs/master/phase2.0-plan.md`
- `specs/master/phase2.0-tasks.md`
- `specs/master/phase2.0-validation.md`
- `specs/master/phases/README.md`
- `specs/master/phases/PHASE_STATUS.md`
- `specs/master/spec.md`
- `specs/master/plan.md`
- `specs/master/tasks.md`
- `specs/master/validation.md`

## 2. 验证清单

| Check | Expected | Result | Evidence |
|---|---|---|---|
| Phase 2 split | Phase 2.1~2.7 artifact 存在且职责单一 | pass | `specs/master/phases/phase-2.1-global-cli-install.md` 到 `phase-2.7-entry-projection-e2e.md` 已创建，分别覆盖安装、adapter、init/update、instructions、detector、doctor drift、E2E。 |
| Install strategy | local dist、npm link、npm pack tarball 验证形态明确 | pass | `phase2.0-spec.md` §4 FR-2 与 `phase-2.1-global-cli-install.md` 明确 dist CLI、npm link、packed tarball 和未来 npm 发布边界。 |
| Init artifacts | `.sdd` 与 `.claude` generated paths 明确 | pass | `phase2.0-spec.md` §4 FR-3 和 `phase-2.3-init-update-generated-entries.md` 明确 `.sdd/project.yml`、`.sdd/runs/`、`.claude/skills/sdd/SKILL.md` 与 `.claude/commands/sdd*.md`。 |
| Generated metadata | `sdd-ai-entry-v1` metadata/hash/drift/foreign conflict 明确 | pass | `phase2.0-spec.md` §4 FR-4、`phase-2.2-ai-tool-adapter-registry.md` 和 `phase-2.6-doctor-drift-check.md` 明确 managed metadata、hash、drift、foreign/conflict。 |
| Thin entry | generated skill/command 不承载 workflow brain | pass | `phase2.0-spec.md` §4 FR-5 与 `phase-2.4-instruction-api-thin-entries.md` 明确 generated entries 通过 `sdd instructions <action> --json` 获取动态指令。 |
| Detector registry | evidence/confidence/mixed-stack 归属明确 | pass | `phase-2.5-detector-registry.md` 明确 `ProjectDetector`、candidate、evidence、confidence、mixed stack 和 validation recommendation。 |
| E2E | install -> init -> trigger -> update -> doctor -> uninstall 归属明确 | pass | `phase-2.7-entry-projection-e2e.md` 明确本机安装、目标仓库 init、Claude `/sdd` trigger 模拟、update、doctor 和 uninstall/cleanup 验收。 |
| Indexes updated | 顶层索引和 phase status 包含 Phase 2.0~2.7 | pass | `specs/master/phases/README.md`、`PHASE_STATUS.md` 和顶层 `spec.md`/`plan.md`/`tasks.md`/`validation.md` 已纳入 Phase 2.0；Phase 2.1~2.7 已进入 phase status。 |

## 3. 不运行项

本阶段不运行：

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm pack`
- `npm link`
- 目标仓库 E2E

原因：Phase 2.0 只修改 Markdown 文档，没有修改 TypeScript runtime、CLI、schema、配置、依赖、接口契约或构建脚本。

## 4. 验收结论

```yaml
phase: phase-2.0-ai-tool-entry-projection
status: completed
validation_method: manual-doc-review
completion_evidence:
  - specs/master/phases/phase-2.1-global-cli-install.md
  - specs/master/phases/phase-2.2-ai-tool-adapter-registry.md
  - specs/master/phases/phase-2.3-init-update-generated-entries.md
  - specs/master/phases/phase-2.4-instruction-api-thin-entries.md
  - specs/master/phases/phase-2.5-detector-registry.md
  - specs/master/phases/phase-2.6-doctor-drift-check.md
  - specs/master/phases/phase-2.7-entry-projection-e2e.md
  - specs/master/phase2.0-spec.md
  - specs/master/phase2.0-plan.md
  - specs/master/phase2.0-tasks.md
  - specs/master/phase2.0-validation.md
next_gate: phase-2.1-global-cli-install starts after Phase 2.0 validation passes
open_gaps:
  - Phase 2.1 must implement and verify package/bin/global install hardening before generated entry E2E.
  - Phase 2.2 must implement adapter registry before init/update writes `.claude` files.
```
