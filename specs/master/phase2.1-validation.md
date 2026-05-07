# Phase 2.1 全局 CLI 安装与 package/bin 硬化 Validation

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.1-global-cli-install.md` 的验证记录。

## 1. 验证清单

| Check | Expected | Result | Evidence |
|---|---|---|---|
| Typecheck | TypeScript strict check passes | pass | `npm run typecheck` passed. |
| Tests | Runtime tests pass | pass | `npm test` passed: 35 tests, 35 pass. |
| Build | Runtime-only dist emits CLI/core | pass | `npm run build` passed with `tsconfig.build.json`. |
| Version | Dist CLI has stable version output | pass | `node ./dist/packages/cli/src/main.js --version` -> `0.1.0`. |
| Pack contents | Tarball excludes compiled tests | pass | `npm pack --dry-run` total files 15; no `*.test.js` files. |
| Tarball install | Isolated global prefix binary works | pass | `npm install -g --prefix <tmp> ./sdd-agent-platform-0.1.0.tgz`; `sdd --version` -> `0.1.0`. |
| Uninstall | Isolated global prefix binary removed | pass | `npm uninstall -g --prefix <tmp> sdd-agent-platform`; binary absence verified. |

## 2. 验收结论

```yaml
phase: phase-2.1-global-cli-install
status: completed
validation_method: typecheck-tests-build-pack-tarball-smoke
completion_evidence:
  - package.json
  - tsconfig.build.json
  - packages/cli/src/main.ts
next_gate: phase-2.2-ai-tool-adapter-registry completed in same implementation sequence
open_gaps: []
```
