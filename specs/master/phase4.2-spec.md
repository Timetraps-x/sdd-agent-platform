# Phase 4.2 Spec

## Goal

Prove the npm package artifact works locally before any npm registry publish interaction.

## Requirements

1. Audit `npm pack --dry-run` output.
2. Ensure package contents include runtime assets and exclude private/local evidence.
3. Install generated tarball globally.
4. Run clean target repository smoke.
5. Uninstall after smoke.

## Acceptance

- Package contents audit is recorded.
- Local tarball global install works.
- Clean target repo smoke passes.

## Non-goals

- No npm login.
- No publish dry-run.
- No real publish.