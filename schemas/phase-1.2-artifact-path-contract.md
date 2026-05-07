# Phase 1.2 Artifact Path Contract

## Contract

- contract id: `phase-1.2-artifact-path-contract`
- storage root: `.sdd/runs/<run_id>/artifacts/`
- owner: `packages/core` artifact path module
- writer: runtime and future agents
- readers: validator, sync-back, doctor, future graph

## Rules

- Artifact paths are relative to `.sdd/runs/<run_id>/artifacts/` when passed to core path helpers.
- Resolved artifact paths must not escape the run artifacts directory.
- Events should store summaries and paths; large content belongs in artifact files.
- Phase 1.2 creates the directory and path resolver only. It does not validate `sdd-result` blocks or agent output content.
