# Phase 7.4 Research — Verification Contract Architecture

## 1. Research scope

Phase 7.4 researched how to introduce a task-derived verification contract before runtime evidence execution.

The implementation target is a formal workflow artifact:

```text
specs/<branch>/verify.md = tasks.md-derived verification expectations, not runtime evidence
```

This phase sits between the Phase 7.3 Workflow State Resolver and the Phase 7.5 Test Runtime. It must make verification expectations visible to status/doctor before any future `/sdd:test` execution path records evidence.

## 2. Local code findings

Reusable foundations already existed in:

- `packages/core/src/sdd-docs/task-parser.ts`
  - parses `spec.md`, `plan.md`, and `tasks.md` with document hashes and stale downstream state.
- `packages/core/src/verification/*`
  - owns existing task verification and single-task loop semantics.
- `packages/core/src/doctor/checks/document-chain.ts`
  - already checks semantic document consistency.
- `packages/core/src/instructions.ts` and `packages/core/src/ai-tools.ts`
  - provide dynamic instruction payloads and generated Claude Code command entries.
- `packages/cli/src/dispatch.ts`
  - routes workflow command families without requiring a root core barrel.

The missing boundary was that validation expectations lived only inside tasks or runtime evidence. There was no stable document that mapped executable tasks to expected validation commands, artifacts, and inspection targets before runtime execution.

## 3. External mechanism findings

External SDD/spec workflow references converged on three useful mechanisms:

- acceptance and verification contracts should be explicit before execution;
- generated workflow commands should state side-effect boundaries;
- runtime evidence should remain separate from planning/contract documents.

Claude Code command and context guidance also supports keeping generated command entries thin: agents should inspect the contract and invoke explicit CLI commands instead of embedding large prompt-only verification rules.

## 4. Implementation decision

Phase 7.4 implements a minimal but enforceable verification contract layer:

1. Add `verify.md` to the formal branch document chain.
2. Generate `verify.md` from `tasks.md` with `sdd verifies write`.
3. Inspect missing/stale/invalid contracts with `sdd verifies inspect`.
4. Expose verify document state in status and doctor.
5. Add `/sdd:verifies` as a generated Claude Code entry with read/write-only contract side effects.
6. Preserve the existing runtime verification command boundary; `verify.md` does not replace validator artifacts or `sdd verify task`.

## 5. Non-goals confirmed

- No `/sdd:test` execution runtime.
- No runtime evidence ingestion from `verify.md`.
- No replacement of `runtime.sqlite`, validator reports, run artifacts, or sync-back proposals.
- No change to existing `sdd verify task` runtime PASS semantics.
- No broad implementation of release-level verification scoring in this slice.
