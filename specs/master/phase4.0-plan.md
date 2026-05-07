# Phase 4.0 Plan

## Approach

Use Phase 4.0 as the distribution planning gate, not the publishing implementation phase. Split the work by risk and reversibility:

1. Decisions and docs only.
2. Local package metadata changes.
3. Local package artifact validation.
4. Registry dry-run and human runbook.
5. Real public publish.

## Recommended split

| Phase | Name | Why separate |
|---|---|---|
| 4.0 | NPM Package Distribution Baseline | Low-risk planning and route decision only. |
| 4.1 | Package Metadata Hardening | Local code/package metadata changes can be reviewed independently. |
| 4.2 | Package Contents and Install Smoke | Packaging can fail even when metadata compiles; validate tarball behavior separately. |
| 4.3 | NPM Publish Dry-run and Runbook | npm registry interaction, account state and 2FA need their own checkpoint. |
| 4.4 | Public Publish and Adoption | Real external publish and documentation default switch must be explicit and reversible only by follow-up release. |

## Package identity recommendation

Current evidence suggests both `sdd-agent-platform` and `@timetraps/sdd-agent-platform` are not visible as public packages in npm registry. The practical recommendation is:

- Use unscoped `sdd-agent-platform` if the user wants simplest install and accepts global namespace risk.
- Use scoped `@<owned-scope>/sdd-agent-platform` if the user wants namespace control and owns or can create the npm scope.

Phase 4.1 should not hardcode the final name until this is confirmed.

## Concrete next phase boundaries

### Phase 4.1

Change package metadata only. No pack, no publish.

### Phase 4.2

Run local package artifact validation only. No registry publish interaction.

### Phase 4.3

Run npm publish dry-run and write human publish instructions. No real publish.

### Phase 4.4

Run real publish only after explicit user approval, then verify public install and switch docs.

## Validation Plan

```bash
node ./dist/packages/cli/src/main.js status --branch master
node ./dist/packages/cli/src/main.js tasks gaps --branch master
```

Phase 4.0 does not need package build validation because it is a planning/docs split phase. Build/package validation starts in Phase 4.1 and Phase 4.2.

## Risks

- If Phase 4.0 tries to do metadata and publish validation together, review becomes noisy and unsafe.
- If real publish stays in the same phase as dry-run, Claude Code may appear to have permission to publish after dry-run passes.
- If docs switch default install before Phase 4.4, onboarding breaks for users.