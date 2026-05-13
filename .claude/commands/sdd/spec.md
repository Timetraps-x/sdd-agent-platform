---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-spec
sdd_source: sdd-agent-platform
sdd_hash: sha256:97cc673cf87ca247f4dccbc5af10bdce615727864f13efb0762b020c3ac62f40
---

Create or refine the SDD spec document as the workflow partition entry, not a technical design. Omit --branch to use the current Git branch partition; pass --branch <name> only when intentionally writing another partition. Agent visibility: scout may gather bounded context; spec-reviewer may review objective, scope, acceptance, and risk gates; evidence lands in spec review artifacts.

Run:

```bash
sdd status
sdd instructions spec --json
```

Then create or refine `specs/<partition>/spec.md` with objective/customer value, problem/intent, users/actors, user stories or scenarios, in-scope/out-of-scope boundaries, functional and non-functional requirements, acceptance criteria with stable IDs such as AC-1, assumptions/dependencies, risks/hard gates, open questions, and lifecycle decision reference.

Repeated /sdd:spec calls represent requirement revisions. If plan/tasks/run evidence already exists, status must expose stale downstream hash state before plan/tasks/do continues.

Do not design implementation in `spec.md`; stop before plan work when requirements, acceptance IDs, or risk gates are unclear.
