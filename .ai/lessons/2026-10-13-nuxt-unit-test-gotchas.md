# Unit-testing Nuxt components and composables: gotchas

- **Date:** 2026-10-13
- **Source:** run [2026-10-13-ci-and-test-frameworks](../runs/2026-10-13-ci-and-test-frameworks.md)

## What happened

Reaching 100 % coverage of components, composables and pages in the `app-nuxt` project surfaced several non-obvious behaviors that cost debugging time.

## Root cause / insight

1. **`$fetch` retries a failed GET once** on 408/409/425/429/500/502/503/504. A `registerEndpoint` mock with a sequence of responses loses one response to the automatic retry.
2. **`useAsyncData` caches by key** for the whole test file. Unmount the component first, then `clearNuxtData(key)`; otherwise the next mount reuses stale data.
3. **Mounted components leak** (window listeners, teleports) into later tests. `packages/app/test/setup.nuxt.ts` enables `enableAutoUnmount(afterEach)` for the whole project.
4. **An `async` helper that returns a pending promise is flattened**: `await open()` then waits for the inner promise (deadlock when the test is supposed to settle it). Return `{ answer }`.
5. **Coverage of templates:** an auto-imported *function* called in a template (`{{ apiErrorMessage(error) }}`) compiles to a fallback expression with a branch no test can hit. Import such helpers explicitly in `<script setup>`. Likewise `import.meta.server/client` ternaries are unreachable in a client-side test environment – prefer APIs that are already SSR-safe (`useRequestHeaders` returns `{}` on the client; VueUse `useEventListener('beforeunload', …)` defaults to an SSR-safe `window`).
6. **Test files inside `pages/`, `layouts/`, `server/api|middleware|plugins/` are safe**: Nuxt's default `ignore` contains `**/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}`, and the built `.output` contains no test files. Keep the `.test.ts` suffix exactly.
7. Server files that use Nitro auto-imports (`defineApiHandler`, `useScope`, `defineNitroPlugin`) are tested in the plain `app` project by `vi.stubGlobal(...)` + dynamic `import()`.
8. Generic SFCs (`<script setup generic="T">`) cannot be passed to `mountSuspended` with inferred props; cast the component to `Component` and type the props locally.

## What to do (or avoid) next time

Follow the patterns in the existing `*.nuxt.test.ts` files (`withSetup` harness, `registerEndpoint` with `unregister`, `mockNuxtImport` + `vi.hoisted`). If a branch seems untestable, simplify the code rather than excluding it.
