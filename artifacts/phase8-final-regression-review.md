# Phase 8 Final Regression Review

## Scope

PHASE8-12 closes Phase 8 coding runtime convergence after the projection-first runtime models landed.

## Integrated Phase 8 concepts

- Lifecycle risk is independent from agent/team/subagent selection and remains tied to lifecycle policy.
- `/sdd:test` is the primary user-facing command execution plus acceptance evidence judgment gate.
- Stage runs and workflow handoffs are observable through status and doctor without replacing legacy next-command behavior yet.
- Work units represent main-agent, co-main-agent, and subagent work without transferring lifecycle authority to subagents.
- Subagent definitions, dispatches, and results are projection-only integration points; results are non-authoritative.
- Context load/offload is now visible through statusline and doctor as context pressure and dispatch/curation decisions, while token health remains a diagnostic guardrail.
- Phase 9 code graph work is explicitly deferred and absent-safe.

## Compatibility boundary

The existing workflow remains compatible during observe/compare:

- Missing lifecycle risk, handoff, context offload, and subagent projections are visible diagnostics, not automatic blockers.
- `sdd verify task` remains available for compatibility/diagnostic replay.
- Statusline and doctor expose the new Phase 8 state while preserving existing status and doctor behavior.
- Master smoke warnings/failures are caused by pre-existing stale verify/document gap state, not by Phase 8 enforcement.

## Regression coverage

The final validation matrix covered focused runtime tests, status/doctor integration tests, CLI regression tests, full test suite, build, typecheck, package dry-run, and SDD smoke commands.
