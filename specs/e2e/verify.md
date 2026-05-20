---
contract: sdd-verify-doc-v1
version: 1.0.0
branch: e2e
based_on_tasks_hash: 7097fd7c2a1f64e8f70c34722425e112d7edc292d8ae470a989dd95e7fe62230
author_role: verification-designer
independent_from_roles:
  - task-planner
  - implementer
created_at: 2026-05-19T05:57:54.724Z
updated_at: 2026-05-19T05:57:54.724Z
---

# Verify Contract: e2e

## 1. Purpose

This document maps executable SDD tasks to verification expectations. It is derived from specs/e2e/tasks.md and is not runtime evidence. It is owned by the verification-designer role and must remain independent from task planning and implementation authority.

## 2. Task Verification Matrix

| Task | Acceptance refs | Validation commands | Required artifacts | Verification availability |
|---|---|---|---|---|
| T1 | AC-1<br>AC-2<br>AC-3<br>AC-4 | node --version | none | none |

## 3. Verification Rules

- The agent that creates tasks.md must not be the same authority that owns verify.md.
- The implementer must not own verify.md or perform authoritative goal verification.
- Reviewer and validator evidence must use run-relative artifacts/<file> paths.
- Physical evidence files live under branch evidence .sdd/runs/<branchSlug>/evidence/artifacts/.
- Goal-level verify must resolve the latest eligible run by branch and task unless --run is explicitly supplied for replay.
- PASS requires policy-backed acceptance evidence, not mention-only acceptance text.
- Sync-back must inspect the generated proposal before applying task status changes.

## 4. Out of Scope

- This document does not replace runtime.sqlite, branch evidence artifacts, validator reports, or sync-back proposals.
- This document does not authorize publish, push, tag, release, or source changes outside the selected task boundary.
