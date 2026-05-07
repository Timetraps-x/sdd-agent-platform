# Phase 4.4 Spec

## Goal

Publish the package publicly only after explicit human approval, then adopt npm install as the default documented path after smoke verification.

## Requirements

1. Confirm user approval for the exact publish command.
2. Confirm intended npm account with `npm whoami`.
3. Execute real publish.
4. Install package from public npm registry.
5. Run clean target repo smoke.
6. Update docs after success.

## Acceptance

- Publish confirmation is recorded.
- Public publish succeeds.
- Public install smoke passes.
- README/user-guide default install path is updated only after smoke.

## Non-goals

- No publish without explicit approval.
- No CI/CD automation.
- No secret/token management.