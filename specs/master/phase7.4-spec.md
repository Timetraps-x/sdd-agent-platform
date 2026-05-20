# Phase 7.4 Spec — Verification Contract Architecture

## 1. Goal

Introduce `specs/<branch>/verify.md` and `sdd verifies` / `/sdd:verifies` as the task-derived verification contract layer between semantic tasks and runtime evidence execution.

## 2. Scope

Phase 7.4 includes:

- `verify.md` as a formal branch document alongside `spec.md`, `plan.md`, and `tasks.md`.
- `sdd verifies inspect` to detect missing, stale, invalid, or incomplete verification contracts.
- `sdd verifies write` to create or refresh task-derived verification contracts.
- `sdd verifies format` to explain the contract shape.
- status and doctor visibility for verify existence/hash/staleness.
- init scaffold support for starter `verify.md`.
- generated `/sdd:verifies` entry and dynamic instruction payload.

## 3. Non-goals

Phase 7.4 does not include:

- executing tests or validation commands;
- collecting runtime evidence;
- changing Runtime Storage v2 schemas;
- marking task verification PASS from `verify.md` alone;
- changing sync-back apply semantics;
- implementing release/ship readiness.

## 4. Functional requirements

### FR1 — Verify document chain

`parseSddBranch()` must expose `verifyPath`, `verifyExists`, `verifyHash`, `verifyBasedOnTasksHash`, and `verifyStale` in the semantic document model.

### FR2 — Verify contract inspection

`inspectVerifyContract()` must return PASS/WARN/BLOCKED with actionable issues for missing tasks, missing `verify.md`, wrong contract version, stale task hash, and missing task coverage.

### FR3 — Verify contract writing

`writeVerifyContract()` must render `verify.md` from the current task model, preserve existing files unless explicitly forced, and include the current `tasks.md` hash.

### FR4 — CLI and generated entry

The CLI must expose `sdd verifies inspect|write|format`, and managed AI projection must include `/sdd:verifies` with explicit side-effect boundaries.

### FR5 — Status and doctor visibility

`status` and `doctor` must surface verify contract state so stale/missing contracts are visible before Phase 7.5 runtime execution.

## 5. Acceptance criteria

- `sdd verifies inspect --branch master` reports missing `verify.md` as WARN and generated contract as PASS.
- `sdd verifies write --branch master` creates `specs/master/verify.md` with `contract: sdd-verify-doc-v1`.
- `sdd status --branch master` shows `verify=true` and no verify stale gap after write.
- `sdd doctor --latest-only --branch master` passes after generated `/sdd:verifies` projection is refreshed.
- `npm run build`, `npm run typecheck`, `npm test`, and `npm pack --dry-run --json` pass.
