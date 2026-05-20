# Phase 6.6 Plan: Documentation Information Architecture

## Strategy

Treat documentation restructuring as a workflow validation target, not just a hand-written note. First define the IA contract and task boundary in retained SDD documents, then execute the task with a locally packed/installable CLI and record evidence through the normal artifact, verify, sync-back, run-index, doctor, and uninstall path.

## Work tracks

### 1. Phase docs and chain

- Add Phase 6.6 phase artifact and execution docs.
- Insert Phase 6.6 before Phase 7.0 core modularization and Phase 8.0 code graph.
- Update Phase 8.0 handoff to consume documentation IA evidence after Phase 7.0 core modularization.

### 2. Documentation IA proposal

- Add `docs/documentation-information-architecture.md`.
- Define categories for public docs, user guides, AI/tool adapter docs, architecture docs, research/history, runtime contract assets, SDD execution archive, and generated AI entries.
- Define migration risk classes and validation gates.

### 3. SDD workflow execution

- Build and pack the current package.
- Install the packed CLI into an isolated npm prefix.
- Use the installed `sdd` binary for status, task inspect, route, run create, artifact template write, artifact validate, do, verify, sync-back, run-index, and doctor.
- Keep existing uncommitted repository changes from blocking workflow operation.

### 4. Evidence and scoring

- Record implementer, reviewer, and validator artifacts under the selected run.
- Apply sync-back only after PASS.
- Uninstall the package from the isolated prefix.
- Score workflow usability and capture remaining tuning opportunities.

## Risk controls

- No bulk doc moves in this phase.
- Runtime contract assets stay in place.
- High-risk future moves require reference grep plus code/test/workflow updates.
- Generated Claude Code entries remain managed outputs, validated by `sdd update --check` rather than treated as source docs.
- Use isolated npm prefix for installation and uninstall.
- Do not publish, commit, or push.

## Implementation order

1. Add Phase 6.6 docs and status/index links.
2. Validate package tests/build after CLI tuning.
3. Pack and install CLI into an isolated prefix.
4. Use installed CLI to create a run and write artifact templates.
5. Add the documentation IA proposal.
6. Fill implementer/reviewer/validator artifacts with evidence.
7. Run do, verify, sync-back inspect/apply, run-index, and doctor.
8. Uninstall package and record final score/tuning evidence.
