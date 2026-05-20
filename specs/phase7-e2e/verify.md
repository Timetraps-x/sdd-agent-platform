---
contract: sdd-verify-doc-v1
version: 1.0.0
branch: phase7-e2e
based_on_tasks_hash: 815b3e3b2f377634fc4abb48f002cacb0f5a60b602978956650cc315d0dd16e3
created_at: 2026-05-16T01:12:05.457Z
updated_at: 2026-05-16T01:12:05.457Z
---

# Verify Contract: phase7-e2e

## 1. Purpose

This document maps executable SDD tasks to verification expectations. It is derived from specs/phase7-e2e/tasks.md and is not runtime evidence.

## 2. Task Verification Matrix

| Task | Acceptance refs | Validation commands | Required artifacts | Verification availability |
|---|---|---|---|---|
| PHASE7E2E-1 | AC-1<br>AC-2<br>AC-3<br>AC-4<br>AC-5<br>AC-6<br>AC-7<br>AC-8 | node --version<br>npm run sdd -- statusline --branch phase7-e2e<br>npm run sdd -- doctor fast --branch phase7-e2e | none | none |

## 3. Verification Rules

- Reviewer and validator evidence must use run-relative artifacts/<file> paths.
- Physical evidence files live under branch evidence .sdd/runs/<branchSlug>/evidence/artifacts/.
- Goal-level verify must resolve the latest eligible run by branch and task unless --run is explicitly supplied for replay.
- PASS requires policy-backed acceptance evidence, not mention-only acceptance text.
- Sync-back must inspect the generated proposal before applying task status changes.

## 4. Out of Scope

- This document does not replace runtime.sqlite, branch evidence artifacts, validator reports, or sync-back proposals.
- This document does not authorize publish, push, tag, release, or source changes outside the selected task boundary.
