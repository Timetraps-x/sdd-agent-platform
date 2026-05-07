# Phase 4.3 Spec

## Goal

Validate npm publish readiness with dry-run and produce a first-time-publisher runbook without performing real publish.

## Requirements

1. Explain npm account/login/whoami flow.
2. Explain 2FA/OTP expectations.
3. Run `npm publish --dry-run` after local package smoke passes.
4. Classify warnings.
5. Stop before real publish.

## Acceptance

- Human runbook exists.
- npm account assumptions are explicit.
- Publish dry-run passes or produces actionable blockers.
- Real publish remains blocked until Phase 4.4.

## Non-goals

- No real publish.
- No token/secret storage.
- No CI/CD automation.