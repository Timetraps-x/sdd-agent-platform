# Phase 4.2 Plan

## Approach

Use local packaging to catch missing files and broken global install behavior before touching npm registry publish flows.

## Steps

1. Run `npm pack --dry-run`.
2. Review included files.
3. Run `npm pack`.
4. Install generated tarball globally.
5. Create a clean temporary Git repo.
6. Run SDD init/status/doctor smoke.
7. Uninstall package.
8. Record evidence.

## Validation

```bash
npm pack --dry-run
npm pack
npm install -g ./<generated-tarball>.tgz
sdd --version
# in clean temp git repo
sdd init --ai claude-code
sdd status
sdd doctor
npm uninstall -g <confirmed-package-name>
```

## Risks

- `files` may omit runtime assets not covered by typecheck/tests.
- Global install may behave differently from local dist CLI.