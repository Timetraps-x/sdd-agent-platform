---
contract: sdd-verify-doc-v1
version: 1.0.0
branch: phase7-e2e-readiness
based_on_tasks_hash: 1fa831ae12f11f81b83ee78777b1212e9e7d20787f69b11fa41b8e5107db608d
created_at: 2026-05-16T01:31:55.960Z
updated_at: 2026-05-16T01:31:55.960Z
---

# Verify Contract: phase7-e2e-readiness

## 1. Purpose

This document maps executable SDD tasks to verification expectations. It is derived from specs/phase7-e2e-readiness/tasks.md and is not runtime evidence.

## 2. Task Verification Matrix

| Task | Acceptance refs | Validation commands | Required artifacts | Verification availability |
|---|---|---|---|---|
| PHASE7E2ER-1 | AC-1<br>AC-2<br>AC-3<br>AC-4<br>AC-5<br>AC-6<br>AC-7<br>AC-8 | npm run sdd -- statusline --branch phase7-e2e-readiness --compact-json<br>npm run sdd -- doctor fast --branch phase7-e2e-readiness<br>npm run sdd -- ship --branch phase7-e2e-readiness --dry-run | none | none |

## 3. Verification Rules

- Reviewer and validator evidence must use run-relative artifacts/<file> paths.
- Physical evidence files live under branch evidence .sdd/runs/<branchSlug>/evidence/artifacts/.
- Goal-level verify must resolve the latest eligible run by branch and task unless --run is explicitly supplied for replay.
- PASS requires policy-backed acceptance evidence, not mention-only acceptance text.
- Sync-back must inspect the generated proposal before applying task status changes.

## 4. Out of Scope

- This document does not replace runtime.sqlite, branch evidence artifacts, validator reports, or sync-back proposals.
- This document does not authorize publish, push, tag, release, or source changes outside the selected task boundary.
