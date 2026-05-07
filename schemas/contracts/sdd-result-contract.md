# SDD Result Contract

## Header

- contract: `sdd-result-v1`
- version: `1.3.0`
- phase: `1.3`
- storage: artifact Markdown fenced block
- owner: `core/artifact`
- writer: agents/runtime outputs
- readers: artifact validator, doctor, sync-back, future graph

## Purpose

`sdd-result` is the structured result block embedded in agent and validation artifacts. It provides machine-readable evidence metadata while keeping the artifact human-readable.

## Required Block

````markdown
```sdd-result
contract: sdd-result-v1
version: 1.3.0
agent: reviewer
task: T1
status: PASS
artifacts:
  - artifacts/review-T1.md
```
````

## Status Values

```text
PASS
PASS_WITH_GAPS
FAIL
BLOCKED
TIMED_OUT
CANCELLED
```

## Recommended Artifact Sections

```markdown
## Status

PASS | PASS_WITH_GAPS | FAIL | BLOCKED | TIMED_OUT | CANCELLED

## Summary

Short conclusion.

## Evidence

Evidence paths, diff summary, command output summary, or observations.

## Acceptance Mapping

- [PASS|GAP|FAIL] acceptance item -> evidence

## Gaps

Open or deferred gaps, or `None`.
```

## Path Canonicalization

Use one canonical path scope per field to avoid duplicate prefixing:

| Field/context | Canonical form | Example |
|---|---|---|
| runtime core helper input for artifact create/read | artifact-root-relative | `review-T3.md` |
| `sdd-result.artifacts` and event/state artifact references inside a run | run-relative | `artifacts/review-T3.md` |
| Markdown references from documents outside the run directory | repo-relative | `.sdd/runs/<run_id>/artifacts/review-T3.md` |

Do not pass `artifacts/review-T3.md` to a helper that already receives `artifactRoot`; do not write `.sdd/runs/<run_id>/artifacts/...` inside run-local records unless the field explicitly asks for repo-relative output.

## Rules

- `agent`, `task`, `status`, `version`, and `artifacts` are required.
- Artifact paths in `artifacts` must stay under the current run artifact directory and should use run-relative form (`artifacts/<file>`).
- `PASS` requires evidence; absence of evidence should become `PASS_WITH_GAPS`, `FAIL`, or `BLOCKED`.
- Phase 1.3 defines the block only; validation implementation belongs to Phase 1.6/1.9.

## Extension Points

Add `acceptance`, `commands`, `gaps`, `durationSeconds`, or `agentVersion` fields as additive metadata.
