# The Nuxt Vitest project must be rooted at the app

- **Date:** 2026-10-13
- **Source:** run [2026-10-13-ci-and-test-frameworks](../runs/2026-10-13-ci-and-test-frameworks.md)

## What happened

The `app-nuxt` project in the root `vitest.config.ts` (created with `defineVitestProject` from `@nuxt/test-utils/config`, `environmentOptions.nuxt.rootDir: packages/app`) failed every test that mounted something:

```
Failed to resolve import "./diagnostics/core.js" from ".../nuxt/dist/app/nuxt-vitest-app-entry.js"
```

## Root cause / insight

With the Vitest root at the repo root but the Nuxt root at `packages/app`, Vite resolved `/node_modules/.pnpm/...` ids of Nuxt's runtime against the wrong root. Setting only `rootDir` is not enough.

## What to do (or avoid) next time

- Give the Nuxt project `root: <abs path of packages/app>` as well, and write its `include` globs relative to that root (`'{app,server,shared}/**/*.nuxt.test.ts'`).
- `setupFiles` of that project are relative to the app root too (`test/setup.nuxt.ts`).
