# Phase 4.3 Plan

## Approach

Treat npm registry publish as a rehearsed external operation. Dry-run can be executed after user account state is clear, but real publish is deferred.

## Steps

1. Write or update runbook for npm account/login/whoami/2FA.
2. Ask user to run or authorize `npm login` if needed.
3. Verify intended account with `npm whoami`.
4. Run `npm publish --dry-run`.
5. Record output and warnings.
6. Prepare Phase 4.4 publish checkpoint.

## Validation

```bash
npm whoami
npm publish --dry-run
```

## Risks

- `npm whoami` depends on local user auth state.
- 2FA may require interactive OTP.
- Dry-run success does not mean real publish should be automatic.