# Phase 3.5 Plan

## Approach

1. 在 `packages/core/src/index.ts` 增加 `WORKER_ADAPTER_CONTRACT_REGISTRY_VERSION`。
2. 定义 worker adapter kind、exit status、input/output contract、adapter manifest 和 registry 类型。
3. 增加内置 worker adapter manifests：Claude Code subagent、SDD CLI task、manual handoff。
4. 实现 `listWorkerAdapterContracts(projectRoot)` 与 `inspectWorkerAdapterContract(projectRoot, adapterId)`。
5. 在 doctor 中增加 `worker_adapter_contract` compatibility check，验证 adapter id、capability、plugin contract、state machine version 和 terminal output status。
6. 在 `packages/cli/src/main.ts` 增加 `sdd workers list/inspect`。
7. 更新 CLI help。
8. 在 `packages/core/src/index.test.ts` 增加 API、doctor、CLI 和 help 覆盖。
9. 创建 retained Phase 3.5 docs 并更新 indexes/status。
10. 运行 typecheck/test/build/doctor/workers CLI smoke。

## Safety

- Worker adapter contract 是静态只读 manifest，不执行 adapter。
- Phase 3.5 不启动长期 worker，不 claim queue item，不生成 background process。
- Adapter permission prompt 是声明字段，不绕过 Claude Code permission prompt。
- Adapter forbidden uses 明确禁止 dynamic plugin execution、silent sync-back apply、background wave execution 和 terminal delegation reopen。
