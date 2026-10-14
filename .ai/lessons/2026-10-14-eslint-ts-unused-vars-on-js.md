# `@typescript-eslint/no-unused-vars` misfires on plain JS files

- **Date:** 2026-10-14
- **Source:** run `.ai/runs/2026-10-14-setup-installer.md` (issue #9)

## What happened

The first plain JavaScript sources in the repo (`scripts/setup.mjs` and `scripts/setup/*.mjs`) failed `pnpm lint`: every used variable was reported as "assigned a value but only used as a type". A two-line `.mjs`/`.js` file anywhere in the repo reproduced it, and `eslint.config.mjs` itself did not.

## Root cause / insight

The `tripsalesagent/quality` block configures `@typescript-eslint/no-unused-vars` for all files. JS files are parsed by espree, whose scope references lack the value/type flags the TS rule checks, so every reference looks type-only. Until now the repo had no linted JS sources, so nothing showed it.

## What to do (or avoid) next time

`eslint.config.mjs` now has a `tripsalesagent/quality/js` block for `**/*.{js,mjs,cjs}` that turns the TS rule off and enables core `no-unused-vars` with the same options. Keep that pair in sync when changing the unused-vars options, and don't silence the false positives with `_` prefixes or disable comments.
