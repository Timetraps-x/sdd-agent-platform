# Phase 7.4 Tasks — Verification Contract Architecture

## Task list

| Task | Status | Acceptance refs | Notes |
|---|---|---|---|
| PHASE7.4-1 | completed | AC-1 | Extend branch document model with `verify.md` path, hash, stale state, and gaps. |
| PHASE7.4-2 | completed | AC-2 | Implement verify contract inspect/write/render core API. |
| PHASE7.4-3 | completed | AC-3 | Add `sdd verifies inspect|write|format` CLI command family with JSON support. |
| PHASE7.4-4 | completed | AC-4 | Wire status, doctor, dynamic instructions, and generated `/sdd:verifies` entry. |
| PHASE7.4-5 | completed | AC-5 | Add starter `verify.md` scaffold and update init behavior/tests. |
| PHASE7.4-6 | completed | AC-6 | Validate build, typecheck, tests, pack, CLI smoke, and phase closeout. |

## Acceptance criteria

- AC-1: `parseSddBranch()` exposes `verify.md` state and stale hash comparison against `tasks.md`.
- AC-2: Missing, stale, wrong-contract, and incomplete task coverage are reported with actionable contract issues.
- AC-3: CLI supports text and JSON output for `sdd verifies` without breaking existing `sdd verify` commands.
- AC-4: `status` and `doctor` expose verify contract health, and managed AI entries include `/sdd:verifies`.
- AC-5: `sdd init` scaffolds `verify.md` consistently with create/preserve/force/skip behavior.
- AC-6: Validation gates pass and `specs/master/verify.md` is created for the active master partition.

## Evidence links

- Core contract: `packages/core/src/verification/verify-contract.ts`
- CLI command: `packages/cli/src/commands/verifies.ts`
- Contract tests: `packages/core/src/verification/verify-contract.test.ts`
- CLI regression: `packages/cli/src/commands/cli-regression.test.ts`
- Master contract: `specs/master/verify.md`
