# Phase 6.2 Spec: RC Stabilization

## Goal

将当前已经可运行的 SDD Agent Platform 收口为更适合 1.0 release candidate 的工程形态。Phase 6.2 聚焦稳定性、可维护性、CLI UX 一致性、package hygiene 和可重复验证，不扩展新产品能力。

## Problem

Phase 1.0~6.1 已经形成完整闭环，但核心实现和测试集中在少数大文件中：

- `packages/core/src/index.ts`
- `packages/cli/src/main.ts`
- `packages/core/src/index.test.ts`

这会提高后续 Phase 7.0 code graph 的接入风险，也会让 CLI UX、doctor/verify/sync-back、agent/runtime evidence 的修改更容易互相影响。

## Scope

- 插入 Phase 6.2 文档和状态链路。
- 稳定 core public export 与内部模块边界。
- 稳定 CLI command / option / renderer / help 边界。
- 强化 Phase 6/6.1 相关 regression tests。
- 固化 RC validation checklist。
- 检查 package contents 和 local dist smoke。

## Non-goals

- 不实现 Phase 7.0 graph baseline。
- 不新增 daemon / tmux / remote worker fleet。
- 不改变 SDD completion gate。
- 不破坏已有 CLI command contract。
- 不做无法验证的大规模重写。

## Acceptance Criteria

| ID | Acceptance |
|---|---|
| AC-6.2-1 | Phase 6.2 文档存在，并在 phase status/index 中插入 6.1 和 7.0 之间。 |
| AC-6.2-2 | Core 低风险模块边界得到收口，`packages/core/src/index.ts` 继续作为兼容 public export 面。 |
| AC-6.2-3 | CLI command / option / renderer / help 组织更清晰，命令名、flag、exit behavior 保持兼容。 |
| AC-6.2-4 | Phase 6/6.1 相关测试覆盖没有下降，并能覆盖 agent/team/background/worker-runtime/doctor/run inspect 关键路径。 |
| AC-6.2-5 | CLI text / JSON / usage / next-action 输出规则更一致。 |
| AC-6.2-6 | RC checklist 通过：typecheck、test、build、package dry-run、local dist smoke。 |
| AC-6.2-7 | Package dry-run 不包含临时 smoke 目录、run state、local settings、日志或凭据。 |

## Validation Commands

```powershell
npm run typecheck
npm test
npm run build
npm pack --dry-run
node ./dist/packages/cli/src/main.js status
```

Focused regression:

```powershell
node --test --import tsx --test-name-pattern "Phase 6|resident worker|worker-runtime|background executor|doctor|run inspect|branch" "packages/**/*.test.ts"
```
