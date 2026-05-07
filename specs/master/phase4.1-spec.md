# Phase 4.1 Spec

## Goal

Make the local package metadata publish-ready without interacting with the npm registry.

## Requirements

1. Confirm final package name/scope/license/version before changing metadata.
2. Remove `private: true` only when publish readiness is intentional.
3. Add npm consumer metadata: `license`, `repository`, `bugs`, `homepage`, `keywords`, `engines`, `publishConfig`.
4. Preserve `bin.sdd` and built `dist` package shape.
5. Keep GitHub direct install working.

## Acceptance

- `package.json` is valid for public CLI package distribution.
- No runtime behavior changes are introduced.
- Build/typecheck/test remain green.

## Non-goals

- No `npm pack`.
- No npm registry login.
- No publish dry-run or real publish.