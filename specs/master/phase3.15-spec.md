# Phase 3.15 Spec

## Goal

Unify the user-facing workflow entrypoint so `sdd do task` follows the Phase 3 executor ingestion path and remains compatible with doctor evidence checks.

## Problem

Real full-chain validation showed that users naturally run `sdd do task`, but the previous single-task loop terminalized delegations directly. That path completed `do` and `verify`, yet `doctor` failed because terminal delegations had no Phase 3.6 artifact ingestion records.

Manual post-hoc ingestion is not valid because Phase 3.6 intentionally accepts artifacts only while a delegation is `RUNNING`. The correct fix is to route acceptance through the executor ingestion path at the time artifacts are supplied.

## Requirements

1. `sdd do task` must remain the main workflow entrypoint.
2. Supplied implementer/reviewer/validator artifacts must be accepted through Phase 3 artifact ingestion.
3. Ingested delegations must use deterministic task/agent delegation ids for the single-task facade.
4. The result must preserve existing required artifact semantics and sync-back proposal output.
5. Doctor must pass for a clean run after local run index rebuild.
6. The lower-level `sdd background run` path must remain available and compatible.

## Acceptance

- `sdd do task` over valid artifacts returns completed.
- Artifact ingestion inspection returns valid=true with records for implementer, reviewer, and validator artifacts.
- `sdd verify task` returns PASS with explicit acceptance coverage.
- `sdd doctor --latest-only` returns PASS in the same full-chain scenario.
- Regression tests cover ingestion records and doctor compatibility for `runSingleTaskLoop`.

## Non-goals

- No retroactive ingestion into terminal delegations.
- No fuzzy acceptance matching.
- No new background write-agent runtime.
- No automatic `sync-back apply`.
