# Phase 7.4 Plan — Verification Contract Architecture

## 1. Implementation plan

### Step 1 — Extend semantic document model

- Add `verify.md` paths and document state to `SddTaskModel`.
- Hash `verify.md` and compare `based_on_tasks_hash` to current `tasks.md` hash.
- Emit a document gap when `verify.md` is stale.

### Step 2 — Add verification contract core API

- Add `VERIFY_DOCUMENT_CONTRACT_VERSION`.
- Create `packages/core/src/verification/verify-contract.ts`.
- Export the contract API through `@sdd-agent-platform/core/verification`.
- Implement inspect/write/render helpers.

### Step 3 — Add CLI command family

- Add `packages/cli/src/commands/verifies.ts`.
- Route `sdd verifies` before the existing `sdd verify` command family.
- Support text and JSON output.
- Add CLI regression coverage for inspect/write/json.

### Step 4 — Wire status, doctor, instructions, and AI projection

- Render verify document state in status output.
- Add document-chain doctor checks for verify contract issues.
- Add `verifies` to the instruction API.
- Add `.claude/commands/sdd/verifies.md` to managed AI entries.

### Step 5 — Add init scaffold and tests

- Generate starter `verify.md` during `sdd init` when document scaffolding is enabled.
- Preserve/force/skip behavior must include `verify.md`.
- Add core contract tests and update affected existing tests.

### Step 6 — Validate and close out

- Run focused Phase 7.4 tests.
- Run full build/typecheck/test/pack gates.
- Run CLI smoke for verifies/status/doctor.
- Refresh managed AI entries with `sdd update` if doctor reports drift.
- Record Phase 7.4 validation and update phase status.

## 2. Boundary decisions

- `verify.md` is a workflow contract document, not runtime evidence.
- `verify.md` can guide validators, but PASS still requires policy-backed runtime evidence.
- Existing `sdd verify task` remains the runtime verification command.
- `/sdd:verifies` may read semantic docs and write `verify.md`; it must not execute validations, mutate runtime state, or sync back tasks.

## 3. Risk controls

- Keep contract writing deterministic and task-derived.
- Fail closed when `tasks.md` is missing or contract version is wrong.
- Warn, rather than overwrite, when an existing `verify.md` differs and `--force` is absent.
- Keep generated starter `verify.md` from declaring a fixed task hash so new init scaffolds are not immediately stale.
