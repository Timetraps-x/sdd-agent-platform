---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-plan
sdd_source: sdd-agent-platform
sdd_hash: sha256:ac2607b3058e141993fb89c9a4bb25cec75edcd97de2986fcba66632e2a45e46
---

Refine the existing SDD plan document as a deliverable technical solution, not a lightweight approach summary. Include based_on_spec_hash from status so later /sdd:spec revisions can mark this plan stale. Agent visibility: scout/planner/spec-reviewer may participate; evidence lands in plan or review artifacts.

Run:

```bash
sdd instructions plan --json
```

Then write or refine `specs/<branch>/plan.md` as the technical bridge from approved spec to task-ready execution. Include background, goals/non-goals, current state, target design, architecture/component impact, interaction/sequence design, state/data design, API/schema design, concurrency/transaction/consistency design, key decisions, alternatives, risk control, rollout/rollback, validation matrix, and task breakdown rationale.

Use PlantUML fences for diagrams when useful: component diagrams for impact surface, sequence/activity diagrams for workflows and concurrency, state diagrams for state-machine risk, and deployment/data diagrams when release or data topology matters. Apply risk-driven requirements before task writing: state-machine risk needs a state diagram; concurrency risk needs sequence/activity plus consistency design; database risk needs data/transaction/rollback design; api_schema risk needs interface/schema compatibility; security/sql risk needs explicit risk controls.

Stop before creating tasks when the technical solution is incomplete or has unresolved design gaps.
