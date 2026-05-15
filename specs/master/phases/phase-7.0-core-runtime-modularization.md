# Phase 7.0 Core Runtime Modularization

## 1. 定位

Phase 7.0 插入在 Phase 6.10 Context Budget Runtime and Non-authoritative Log Workers 与代码知识图谱阶段之间，专门解决 core runtime 边界长期扩张的问题。

本阶段不是最小化 helper 抽取，也不是恢复旧 `packages/core/src/index.ts` barrel；目标是把 core 收敛为 **package-local build + explicit subpath exports + domain façade + internal responsibility split**。CLI 必须通过 `@sdd-agent-platform/core/<domain>` 使用 core，不允许穿透 `packages/core/src`，代码知识图谱顺延到 Phase 8.0，在 Phase 7.0 完成稳定模块边界后再接入。

## 2. 依赖

- depends_on: Phase 6.10 Context Budget Runtime and Non-authoritative Log Workers
- blocks: Phase 8.0 Code Knowledge Graph Baseline
- required_by: Phase 8.0 Code Knowledge Graph Baseline

## 3. 当前路线

Phase 7.0 采用 B/C 收口路线：

1. **B：package boundary**
   - 使用 package-local build output：`packages/core/dist`、`packages/cli/dist`。
   - `packages/core/package.json` 只暴露明确 domain subpath exports。
   - 不恢复 root `@sdd-agent-platform/core` import，不暴露内部深路径。
   - CLI 禁止 `../../core/src` / `../../../core/src` import。
2. **C：internal responsibility cleanup**
   - `status`、`runtime-analysis`、`router`、`doctor`、CLI registry 等热点按领域收口。
   - public subpath façade 保持稳定，内部文件可以继续拆分。
   - 行为冻结：不改 CLI 命令语义、JSON contract、run state、artifact contract、route decision、doctor check 语义。
   - 当前代码 gate 已完成：doctor check-family、router routing、CLI registry command/renderer、doctor terminal renderer ownership 均已拆分。

## 4. 范围

- 建立并维护 core public façade：`status`、`run-state`、`sdd-docs`、`context`、`artifacts`、`governance`、`verification`、`sync-back`、`lifecycle`、`execution`、`planning`、`worktree`、`delegation`、`registries`、`router`、`doctor`、`runtime-analysis`、`test-support` 等 subpath。
- 将 `project-status` 从 config 语义中移到 status 领域。
- 将 `runtime-analysis` 拆成 model/findings/build，保持 `@sdd-agent-platform/core/runtime-analysis` 稳定。
- 将 `route-sdd-task` 收敛为 façade，并把 runtime registry、inspection、validation、routing、team-mode 分开；继续拆分 profile selection、routing rules、capability selection、tool permissions、route sources。
- 将 `doctor` 收敛为 orchestrator，并把 check family 拆到 `doctor/checks/*`；doctor terminal renderer 迁到 CLI renderer 层。
- 将 CLI registry command/renderer 按 workflow、agents、runtime、capabilities、delegation、tools、learning 等命令族拆分，保持输出不变。
- 最后同步 Phase status、架构文档、README/user guide，避免中间态文档漂移。

## 5. 非目标

- 不改变 SDD workflow 行为。
- 不改变 CLI 输出格式、JSON contract、run state/event/artifact/schema、sync-back 语义。
- 不恢复 `@sdd-agent-platform/core` root barrel。
- 不暴露 `@sdd-agent-platform/core/<folder>/<file>` 内部深路径。
- 不引入 ESLint、bundler、新构建系统或 unrelated tooling。
- 不把 Phase 8.0 code graph、embedding store、graph database、AST/LSP 索引提前做进 Phase 7.0。
- 不为了“兼容旧路径”保留膨胀重导出层；内部旧路径只能作为短期迁移过渡，不能作为 public contract。

## 6. Gate 顺序

### Gate 0：package/export/dist 护栏
Status: completed.

- 加固 CLI/core import boundary test。
- 验证 core package exports 每个 subpath 都有 source façade 和 built dist targets。
- 验证 root package 发布 package-local CLI/core build outputs。

### Gate 1：doctor 职责收口

目标形态：

```text
packages/core/src/doctor/
  doctor.ts
  model.ts
  summary.ts
  checks/
    project.ts
    document-chain.ts
    ai-entries.ts
    run-evidence.ts
    run-trust.ts
    run-records.ts
    runtime-contracts.ts
    registries.ts
    local-run-index.ts
```

Status: completed.

`doctor.ts` 只负责调度各 check family 和汇总状态，不直接承载所有检查细节。

### Gate 2：router/routing 职责收口

目标形态：

```text
packages/core/src/router/
  route-sdd-task.ts
  runtime-registry.ts
  runtime-inspection.ts
  runtime-validation.ts
  team-mode.ts
  routing.ts
  profile-resolution.ts
  routing-rules.ts
  risk-policy.ts
  route-projection.ts
```

Status: completed.

`routing.ts` 只负责 route orchestration；profile、rule、risk/autonomy、capability、permission、source attribution 分离。

### Gate 3：CLI registry command/renderer 拆分

目标形态：

```text
packages/cli/src/commands/registry.ts
packages/cli/src/commands/registry/*.ts
packages/cli/src/renderers/registry.ts
packages/cli/src/renderers/registry-*.ts
packages/cli/src/renderers/router.ts
```

Status: completed.

顶层文件保留稳定 façade，具体命令族和渲染族下沉；非 registry 的 task router renderer 已从 registry façade 移到 `renderers/router.ts`。

### Gate 4：renderer ownership 清理

Status: completed for doctor renderer.

原则：core 保留 structured result、contract/artifact/template rendering；CLI 负责 terminal human text rendering 和 text/json switch。当前已将 `renderDoctorReport` 从 core 迁到 `packages/cli/src/renderers/doctor.ts`，并删除 core doctor render 残留。

### Gate 5：文档/status 同步

Status: completed. Phase status、架构文档、README、phase7.0 spec/plan/tasks/validation 和 Phase 8 handoff 均已同步。

## 7. 交付物

- package-local build configuration and package exports。
- core domain façade files and package export map。
- CLI import boundary regression。
- package/export/dist smoke regression。
- doctor check-family split。
- router routing strategy split。
- CLI registry command/renderer split。
- doctor terminal renderer ownership cleanup。
- Phase 7 architecture/status/docs sync。

## 8. 验收标准

- CLI 中没有 `../../core/src`、`../../../core/src` 或 root `@sdd-agent-platform/core` import。
- `packages/core/package.json` 没有 root `.` export，所有 public subpath 都指向 package-local `dist` target。
- `packages/core/src/index.ts` 不再作为旧 mixed API barrel。
- `doctor.ts` 只做 orchestration，check family 位于 `doctor/checks/*`。
- `route-sdd-task.ts` 是 façade，`routing.ts` 不再承载所有策略细节。
- CLI registry command/renderer 按命令族拆分，输出不漂移。
- core 不再导出 doctor terminal renderer；doctor human text output 位于 CLI renderer 层。
- `npm run build`、`npm run typecheck`、`npm test`、`npm pack --dry-run --json` 通过。
- `npm run sdd -- status --branch master`、`npm run sdd -- tasks list --branch master`、`npm run sdd -- doctor --latest-only --branch master` 通过或仅保留已知非阻塞 WARN。
- Phase 8.0 code graph 的入口不再依赖继续扩张 core root index。

## 9. 可被下游引用的产物

- `specs/master/phases/phase-7.0-core-runtime-modularization.md`
- `specs/master/phase7.0-spec.md`
- `specs/master/phase7.0-plan.md`
- `specs/master/phase7.0-tasks.md`
- `specs/master/phase7.0-validation.md`
