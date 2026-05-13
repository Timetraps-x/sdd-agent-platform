---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-tasks
sdd_source: sdd-agent-platform
sdd_hash: sha256:43098eda4818f94cf96101e91440cc12c621fe1d870a1071ad7bd361b172a62b
---

Refine the existing SDD tasks document as an executable evidence contract, not a plain TODO list or project-management backlog. Include based_on_plan_hash from status so later plan/spec revisions can mark these tasks stale. Agent visibility: planner/reviewer may participate; execution evidence later lands in implement/review/validation artifacts.

Run:

```bash
sdd instructions tasks --json
sdd tasks format
```

Then write or refine `specs/<branch>/tasks.md` from the approved spec and plan. Include Delivery Map, Wave Plan, task blocks with acceptance_refs and plan_refs, affected_files, validation, risk, agent_fit, allowed_agents, required_artifacts, verification_availability, autonomy, plus companion sections for Boundary, Acceptance, Definition of Done, Evidence Expectations, and Implementation Notes.

Keep metadata inside the ```sdd-task fenced block and companion sections outside it. Stop before `sdd do task` when task boundary, acceptance refs, plan refs, or evidence requirements are unclear.
