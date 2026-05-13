# Phase 5.9 Spec

## Metadata

- phase_id: `5.9`
- artifact: `phases/phase-5.9-task-contract-parser-inspect.md`
- lifecycle_profile: `full`
- status: `planned`

## Objective / Customer Value

Make task evidence contract fields visible to the runtime so users can inspect why a task exists, which acceptance criteria it covers, which design sections it implements, and what evidence is required.

## Scope

### In Scope

- Parse or preserve task fields: `acceptance_refs`, `plan_refs`, `agent_fit`, `allowed_agents`, `required_artifacts`, `verification_availability`, `autonomy`.
- Improve `sdd tasks inspect` output.
- Add compatibility tests.

### Out of Scope

- Cross-document validation of referenced AC IDs.
- Doctor/verify semantic checks.

## Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-5.9-1 | Task parser exposes new execution/evidence fields without breaking old docs. | parser tests | Must |
| AC-5.9-2 | `sdd tasks inspect` prints acceptance refs, plan refs, agent/artifact/verification/autonomy evidence. | CLI tests | Must |

## Risks / Hard Gates

- parser-regression: do not reintroduce companion-section bleed.

## Lifecycle Decision Reference

- recommended_profile: `full`
- risk_signals: `parser-regression`
- autonomy_ceiling: `full_sdd_with_checkpoint`
