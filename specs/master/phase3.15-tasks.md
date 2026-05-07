# Phase 3.15 Tasks

## P3.15-T1: Design workflow entrypoint unification

status: completed

Clarify the difference between the three candidate solutions and choose option A: `sdd do task` becomes the ingestion-aware facade over Phase 3 executor behavior.

## P3.15-T2: Implement ingestion-aware single-task loop

status: completed

Route supplied artifacts from `runSingleTaskLoop` through `runBackgroundExecutor`, preserving existing task loop output and sync-back proposal behavior while producing artifact ingestion records.

## P3.15-T3: Add regression coverage

status: completed

Extend the single-task loop test so it validates ingestion records for the generated delegations and confirms `doctor(..., { latestOnly: true })` passes after local run index rebuild.

## P3.15-T4: Validate full workflow

status: completed

Run typecheck, test, build, and real install-to-uninstall full-chain smoke using the user-facing `sdd do task` path.

## P3.15-T5: Record retained phase documentation

status: completed

Create Phase 3.15 retained artifact/spec/plan/tasks/validation files and update phase indexes/status.
