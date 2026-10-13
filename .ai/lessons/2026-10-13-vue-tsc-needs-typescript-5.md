# vue-tsc (nuxt typecheck) breaks with TypeScript 7

- **Date:** 2026-10-13
- **Source:** run `2026-10-13-init-tripsalesagent-monorepo`

## What happened
`pnpm add -D typescript` installed TypeScript 7.0.x. `nuxt typecheck` then crashed with `ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './lib/tsc' is not defined by "exports"` from `vue-tsc`.

## Root cause / insight
`vue-tsc` 3.x patches `typescript/lib/tsc`, which TypeScript 7 (native port) no longer exposes.

## What to do (or avoid) next time
Originally pinned to `~5.9.x`; since run `2026-10-13-upgrade-typescript-6` the root `package.json` uses `"typescript": "npm:@typescript/typescript6@^6.0.2"`. `vue-tsc` has built-in support for this alias (it resolves the real `tsc` from the `@typescript/old` dependency). Caveat: that package exposes the binary as **`tsc6`**, not `tsc` – a script calling `tsc` silently falls back to whatever global `tsc` is on PATH (here a Windows shim: `node: 1: This: not found`). Use `tsc6` in package scripts. Before moving to TypeScript 7, check that `vue-tsc` supports it and `pnpm typecheck` passes. (The file name keeps "typescript-5" – files are never renamed.)
