---
contract: sdd-verify-doc-v1
version: 1.0.0
branch: master
based_on_tasks_hash: bb4181d0b50eca1f873e47703bf5382b9eee2bee80bc38cd2101fe82e1f3c5a0
created_at: 2026-05-18T07:37:45.773Z
updated_at: 2026-05-18T07:37:45.773Z
---

# Verify Contract: master

## 1. Purpose

This document maps executable SDD tasks to verification expectations. It is derived from specs/master/tasks.md and is not runtime evidence.

## 2. Task Verification Matrix

| Task | Acceptance refs | Validation commands | Required artifacts | Verification availability |
|---|---|---|---|---|
| PHASE6.10-1 | AC-1 | npm run typecheck<br>npm test -- --test-name-pattern "context budget" | artifacts/implement-PHASE6.10-1.md<br>artifacts/review-PHASE6.10-1.md<br>artifacts/validation-PHASE6.10-1.md | inspect:packages/core/src/context/build-package.ts<br>inspect:packages/core/src/context/context-build.test.ts |
| PHASE6.10-2 | AC-2<br>AC-3 | npm run typecheck<br>npm test -- --test-name-pattern "context profile|brief|forensic" | artifacts/implement-PHASE6.10-2.md<br>artifacts/review-PHASE6.10-2.md<br>artifacts/validation-PHASE6.10-2.md | inspect:packages/cli/src/main.ts<br>inspect:packages/core/src/context/command-summary.ts |
| PHASE6.10-3 | AC-4<br>AC-8 | npm run typecheck<br>npm test -- --test-name-pattern "evidence summary|derived summary" | artifacts/implement-PHASE6.10-3.md<br>artifacts/review-PHASE6.10-3.md<br>artifacts/validation-PHASE6.10-3.md | inspect:packages/core/src/context/evidence-summary.ts<br>inspect:packages/core/src/context/context-build.test.ts |
| PHASE6.10-4 | AC-5 | npm run typecheck<br>npm test -- --test-name-pattern "context build"<br>node ./dist/packages/cli/src/main.js context build --task PHASE6.10-4 --branch master --mode verify --json | artifacts/implement-PHASE6.10-4.md<br>artifacts/review-PHASE6.10-4.md<br>artifacts/validation-PHASE6.10-4.md | inspect:packages/core/src/context/build-package.ts<br>inspect:packages/cli/src/main.ts |
| PHASE6.10-5 | AC-6 | npm run typecheck<br>npm test -- --test-name-pattern "agent context package"<br>node ./dist/packages/cli/src/main.js context build --task PHASE6.10-5 --branch master --mode verify --agent validator --json | artifacts/implement-PHASE6.10-5.md<br>artifacts/review-PHASE6.10-5.md<br>artifacts/validation-PHASE6.10-5.md | inspect:packages/core/src/context/build-package.ts<br>inspect:packages/cli/src/main.ts |
| PHASE6.10-6 | AC-7<br>AC-8 | npm run typecheck<br>npm test -- --test-name-pattern "log worker|non-authoritative" | artifacts/implement-PHASE6.10-6.md<br>artifacts/review-PHASE6.10-6.md<br>artifacts/validation-PHASE6.10-6.md | inspect:packages/core/src/context/log-worker.ts<br>inspect:packages/core/src/context/context-build.test.ts |
| PHASE6.10-7 | AC-9 | npm run typecheck<br>npm test -- --test-name-pattern "budget" | artifacts/implement-PHASE6.10-7.md<br>artifacts/review-PHASE6.10-7.md<br>artifacts/validation-PHASE6.10-7.md | inspect:packages/core/src/context/context-build.test.ts |
| PHASE6.10-8 | AC-10 | npm run typecheck<br>npm test<br>npm run build<br>npm pack --dry-run --json<br>npm pack<br>npm install -g .\sdd-agent-platform-0.2.0.tgz<br>sdd --version<br>sdd status --branch master --compact-json<br>sdd context build --task PHASE6.10-8 --branch master --mode verify --json<br>sdd tasks inspect PHASE6.10-8 --branch master --json<br>sdd tasks route PHASE6.10-8 --branch master --json<br>sdd doctor --latest-only --branch master | artifacts/implement-PHASE6.10-8.md<br>artifacts/review-PHASE6.10-8.md<br>artifacts/validation-PHASE6.10-8.md | inspect:specs/master/phase6.10-validation.md<br>inspect:npm test<br>inspect:npm pack --dry-run --json |

## 3. Verification Rules

- Reviewer and validator evidence must use run-relative artifacts/<file> paths.
- Physical evidence files live under branch evidence .sdd/runs/<branchSlug>/evidence/artifacts/.
- Goal-level verify must resolve the latest eligible run by branch and task unless --run is explicitly supplied for replay.
- PASS requires policy-backed acceptance evidence, not mention-only acceptance text.
- Sync-back must inspect the generated proposal before applying task status changes.

## 4. Out of Scope

- This document does not replace runtime.sqlite, branch evidence artifacts, validator reports, or sync-back proposals.
- This document does not authorize publish, push, tag, release, or source changes outside the selected task boundary.
