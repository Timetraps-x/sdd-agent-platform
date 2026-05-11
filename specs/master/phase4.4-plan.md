# Phase 4.4 Plan

## Approach

Treat real publish as an external, user-approved release event. Do not proceed unless Phase 4.3 dry-run is clean and the user approves the exact command.

## Steps

1. Present go/no-go checklist.
2. Confirm exact package name/version/account.
3. Ask user to approve real publish.
4. Run `npm publish --access public` or scoped equivalent.
   - If npm returns `EOTP`, have the publisher run `! npm publish --access public` locally, open the full `https://www.npmjs.com/auth/cli/...` URL, complete security key / passkey / Windows Hello / browser authentication, then rerun the publish command if the first invocation exited.
   - Do not wait for a Google Authenticator QR code in the publish flow; QR setup only appears in npm account security settings when adding or resetting authenticator app 2FA.
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
- Recovery codes cannot be converted into Google Authenticator OTP values; use them only for npm account recovery/reset flows.
- Long-lived npm tokens, `.npmrc`, recovery codes, and OTP values must not be committed or recorded in project docs.