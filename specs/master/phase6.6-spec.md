# Phase 6.6 Spec: Documentation Information Architecture

## Goal

Create a reference-aware documentation information architecture before moving documentation files, and validate the SDD workflow through a real package install, real task execution, sync-back, and uninstall cycle.

## Problem

The repository contains human-facing docs, research notes, architecture contracts, SDD execution archives, generated Claude Code entries, and runtime contract assets that are all represented as Markdown or text files. A naive documentation cleanup could break CLI/package references, generated assets, workflow contracts, or historical execution evidence.

## Scope

- Add a Documentation IA proposal under `docs/documentation-information-architecture.md`.
- Define target document categories and recommended locations.
- Define migration risk classes and validation gates.
- Keep runtime contract assets stable unless a future migration updates code, tests, workflows, and package contents together.
- Run this documentation IA task through the SDD task workflow using a locally packed and installed CLI.
- Record implementer, reviewer, validator, sync-back, run-index, doctor, uninstall, score, and tuning evidence.

## Non-goals

- No bulk file moves in this phase.
- No npm publish.
- No Git commit or push.
- No prompt-pack import or third-party agent execution.
- No Phase 8 code graph implementation.

## Acceptance criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-1 | Packed CLI is installed in an isolated prefix and reports version `0.2.0`. | `sdd --version` | Must |
| AC-2 | `docs/documentation-information-architecture.md` defines target categories, migration rules, and validation gates. | File inspection / reviewer artifact | Must |
| AC-3 | SDD workflow commands complete without blocking errors: status, inspect, route, run create, artifact template write, artifact validate, do, verify, sync-back, run-index, doctor. | CLI output / artifacts | Must |
| AC-4 | Package uninstall completes and final report includes usability score plus tuning opportunities. | uninstall evidence / final summary | Must |

## Validation commands

```powershell
npm run typecheck
npm test
npm run build
npm pack
sdd --version
sdd status --branch master
sdd tasks inspect PHASE6.6-1 --branch master --json
sdd tasks route PHASE6.6-1 --branch master --json
sdd run create --id <run_id>
sdd artifact template artifacts/implement-PHASE6.6-1.md --task PHASE6.6-1 --agent implementer --run <run_id> --write
sdd artifact validate <run_id> artifacts/implement-PHASE6.6-1.md --task PHASE6.6-1 --agent implementer --json
sdd do task PHASE6.6-1 --run <run_id> --implement-artifact artifacts/implement-PHASE6.6-1.md --review-artifact artifacts/review-PHASE6.6-1.md --validation-artifact artifacts/validation-PHASE6.6-1.md
sdd verify task PHASE6.6-1 --branch master --run <run_id>
sdd sync-back inspect <run_id> --task PHASE6.6-1 --branch master
sdd sync-back apply <run_id> --task PHASE6.6-1 --branch master --approved
sdd run index rebuild
sdd doctor --latest-only
npm uninstall -g sdd-agent-platform --prefix <isolated_prefix>
```
