---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-ship
sdd_source: sdd-agent-platform
sdd_hash: sha256:de748b08b65acf0bc125193dc6ae7e05c95fae706a7a56437227a3e1b9b6a364
---

Run release-readiness checks against checklist.md. This command is a preflight gate; it does not authorize npm publish, git push, git tag, or external release creation.

Run:

```bash
sdd status --branch <branch>
sdd instructions ship --json
```

Workflow:

1. Read `checklist.md` and use it as the release checklist.
2. Resolve the target branch/partition from `sdd status` or the user's explicit branch.
3. Confirm workflow tasks are complete or intentionally deferred, and that verified work has no unapplied sync-back proposal.
4. Run generated-entry drift, current-run health, typecheck, test, build, and package dry-run gates from the checklist.
5. Report PASS/BLOCKED by checklist section with failed commands and remaining manual confirmations.
6. Stop before publish, push, tag, or external release creation unless the user explicitly approves that separate action.

Do not skip failed gates, do not treat historical doctor debt as a release blocker unless it affects current evidence, and do not mutate release state from this preflight command.
