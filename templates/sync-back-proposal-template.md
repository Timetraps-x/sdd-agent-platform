---
template: sdd-sync-back-proposal-template-v1
version: 1.3.0
contract: sdd-sync-back-proposal-v1
owner: platform-assets/templates
readers:
  - user
  - command gate
  - task parser
  - future graph
---

# Sync-back Proposal: <run-id>

## Metadata

- run_id: `<run-id>`
- spec_id: `<spec-id>`
- task: `<task-id or all>`
- status: `proposed | applied | rejected`
- created_at: `<ISO-8601>`

## Summary

Short summary of what should be written back to semantic SDD docs.

## Proposed Task Updates

### <Task ID>

- status: `<old> -> <new>`
- artifacts:
  - `.sdd/runs/<run_id>/artifacts/<artifact>.md`
- implementation_notes:
  - Note proposed for task notes.
- validation:
  - Evidence or command summary.
- gaps:
  - `None` or gap reference.

## Artifact Path Notes

- This proposal is a Markdown document outside the run record, so artifact links here should use repo-relative form: `.sdd/runs/<run_id>/artifacts/<artifact>.md`.
- Run-local records such as `state.json`, `events.jsonl`, delegation records, and `sdd-result.artifacts` should use run-relative form: `artifacts/<artifact>.md`.
- Runtime helper inputs under an already selected artifact root should use artifact-root-relative form: `<artifact>.md`.
- Do not concatenate these forms together; avoid paths like `artifacts/artifacts/<artifact>.md` or `.sdd/runs/<run_id>/artifacts/artifacts/<artifact>.md`.
## Open / Deferred Gaps

- Gap id, type, blocking status, and recommended follow-up.

## Not Allowed in This Proposal

- Do not silently change spec requirements.
- Do not silently change plan architecture.
- Do not change task boundary without returning to the tasks checkpoint.
- Do not delete unfinished tasks.

## Approval

- approved_by: `<user | main session | pending>`
- approved_at: `<ISO-8601 | pending>`
