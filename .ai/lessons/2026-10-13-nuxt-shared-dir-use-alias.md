# Import `packages/app/shared` via `#shared`, never by relative path

- **Date:** 2026-10-13
- **Source:** run [2026-10-13-implement-engineering-standards](../runs/2026-10-13-implement-engineering-standards.md)

## What happened
`pnpm build` failed with `RollupError: Could not resolve "../../../../../../../../packages/app/shared/types/api.ts" from "node_modules/.cache/nuxt/.nuxt/dist/server/_nuxt/admin-….js"` after a composable imported `../../shared/types/api` (a value import). Typecheck, lint and Vitest were all green.

## Root cause / insight
Nitro bundles the Vite server build from `node_modules/.cache/nuxt/.nuxt/dist/…`; relative paths that leave the source tree are re-resolved from there and break. Type-only imports are erased, so they hide the problem until the first value import.

## What to do (or avoid) next time
Always import the Nuxt 4 `shared/` folder as `#shared/...` – in `app/` and in `server/` alike. Vitest resolves it for type-only imports (erased); if a tested module needs a value from `#shared`, add the alias to `vitest.config.ts`.
