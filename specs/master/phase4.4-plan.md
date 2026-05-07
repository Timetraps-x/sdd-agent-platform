# Phase 4.4 Plan

## Approach

Treat real publish as an external, user-approved release event. Do not proceed unless Phase 4.3 dry-run is clean and the user approves the exact command.

## Steps

1. Present go/no-go checklist.
2. Confirm exact package name/version/account.
3. Ask user to approve real publish.
4. Run `npm publish --access public` or scoped equivalent.
5. Install from npm public registry.
6. Run clean target repo smoke.
7. Update README/user-guide defaults.
8. Record validation.

## Validation

```bash
npm whoami
npm publish --access public
npm install -g <confirmed-package-name>@latest
sdd --version
# in clean temp git repo
sdd init --ai claude-code
sdd status
sdd doctor
npm uninstall -g <confirmed-package-name>
```

## Risks

- Wrong account/package/version is externally visible.
- Failed publish may require version bump before retry depending on registry state.
- Docs must not switch until public install is proven.