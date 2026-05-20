# Phase 7.8 Research — Sync-back, Ship and Observability

## Research scope

Phase 7.8 closes the Phase 7 runtime repair line by adding human review, release readiness, and observability surfaces on top of the stable runtime/state/verify/test/agent/team foundation.

## Local findings

- `sdd sync-back inspect` already exposes most approval-card inputs: run/task status, proposal path, proposal digest validity, apply policy, stale reasons, affected-file conflicts, artifacts, and gaps.
- `/sdd:ship` already exists as generated Claude command guidance and `InstructionAction`, but there is no first-class `sdd ship` CLI handler.
- `release.md` is intentionally referenced as semantic branch output, but no starter/template/generator exists yet.
- Status and run inspection already expose runtime evidence counts, route preflight, agent executions, team sessions, worker runtimes, and artifact ingestions.
- Doctor already has a fast/deep mechanic through `--latest-only` and `--all-runs`, but it is not productized as an explicit fast/deep surface.
- Recover guidance exists in doctor actions and command-team runtime profiles, but there is no compact recover/reconcile suggestion surface.

## External mechanism translation

- Claude Code statusline favors compact event-refreshed status that is readable by humans and stable enough for tooling. Phase 7.8 should expose compact local status/progress rather than persistent audit in the statusline itself.
- Claude Code context and cost guidance supports showing context pressure, duration, and evidence/ref counts as operational signals, while keeping large material out of active context.
- Terraform, GitHub deployment approvals, npm publish dry-runs, Kubernetes status, Temporal history, Nx repair, and Expo Doctor reinforce a split between readiness checks, approval proposals, durable event history, and explicit deep diagnostics.

## Decision

Implement Phase 7.8 as lightweight contracts and CLI surfaces:

- sync-back approval card embedded in `sdd sync-back inspect` output and JSON;
- `sdd ship` as a release-readiness/release-document command, not a deployment/publish command;
- `specs/<branch>/release.md` as semantic branch output;
- observability projection for statusline/progress consumers;
- named doctor fast/deep aliases while preserving existing flags;
- recover guidance as deterministic recommendations, not hidden auto-retry.

## Boundary decisions

- Release summary belongs under `specs/<branch>/release.md`, not `.sdd/runs`.
- Approval card remains compact and auditable; it does not become a long report.
- Subagents may produce evidence or recommendations but cannot approve or mutate workflow state.
- Doctor defaults remain fast; deep scans must be explicit.
- Statusline/progress output is a projection, not the audit source of truth.
