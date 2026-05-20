---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-ship
sdd_source: sdd-agent-platform
sdd_hash: sha256:61eecbd5070e9b0165c7e41c4ae49a5f383cd1d06932c06a3b5b6cc381db332c
---

Run local release-readiness checks and optionally write `specs/<branch>/release.md`. This command is a preflight/release-summary gate; it does not authorize npm publish, git push, git tag, deploy, or external release creation.

Run:

```bash
sdd ship --branch <branch> --dry-run
sdd instructions ship --json
```

Workflow:

1. Resolve the target branch/partition from `sdd status` or the user's explicit branch.
2. Run `sdd ship --branch <branch> --dry-run` first; inspect PASS/BLOCKED readiness and next actions without writing `release.md`.
3. If the readiness output is acceptable, run `sdd ship --branch <branch>` to write `specs/<branch>/release.md`.
4. Use `sdd statusline --branch <branch>` for compact runtime/test/team/token/evidence health when reporting progress.
5. Run generated-entry drift, current-run health, typecheck, test, build, and package dry-run gates when preparing a real package release.
6. Stop before publish, push, tag, deploy, or external release creation unless the user explicitly approves that separate action.

Do not skip failed gates, do not treat historical doctor debt as a release blocker unless it affects current evidence, and do not mutate external release state from this preflight command.
