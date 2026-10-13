# CI pipeline, unit-test coverage and agent-browser integration tests

- **Date:** 2026-10-13
- **Agent/model:** Claude Code, claude-opus-5-5
- **Spec:** [.ai/specs/implemented/2026-10-13-ci-and-test-frameworks.md](../specs/implemented/2026-10-13-ci-and-test-frameworks.md)
- **Status:** completed

## Goal

GitHub CI for every PR (build, lint, typecheck, unit tests with 100 % coverage, integration tests with Testcontainers PostgreSQL + agent-browser), the 100 %-coverage rule in `AGENTS.md`, and tests bringing existing code to 100 % plus basic browser tests for the home page and admin panel.

## Plan

1. Spec + run log.
2. Tooling: `@vitest/coverage-v8`, `@nuxt/test-utils` + `@vue/test-utils` + `happy-dom`, `testcontainers` + `@testcontainers/postgresql`, `agent-browser`.
3. Vitest projects (node vs nuxt) + coverage thresholds; separate integration config with global setup.
4. Unit tests for every uncovered file.
5. Integration tests: database health probe, home page, admin panel, health API.
6. `.github/workflows/ci.yml`.
7. Docs: `AGENTS.md`, `docs/engineering-standards.md`, `README.md`, lessons.
8. `pnpm check` + `pnpm test:integration`.

## Log

- Read `.ai/lessons.md`; no spec covered CI/testing, wrote the spec.
- Docker **is** reachable in this WSL session now (`docker ps` works), contrary to the existing lesson – Testcontainers can be verified locally; lesson to be updated.

- Installed `@vitest/coverage-v8`, `@nuxt/test-utils`, `@vue/test-utils`, `happy-dom`, `testcontainers` + `@testcontainers/postgresql` (pinned `~12.2.0`: 12.2.1 was published today and pnpm's minimum-release-age would have needed exclusions), `agent-browser@0.39.0`. `allowBuilds`: all new build scripts denied (agent-browser ships its binaries in `bin/`; ssh2/cpu-features/protobufjs are optional).
- `vitest.config.ts`: projects `core`, `database`, `app` (node) and `app-nuxt` (`*.nuxt.test.ts`, `@nuxt/test-utils` env). The nuxt project failed with "Failed to resolve import ./diagnostics/core.js" until it was rooted at `packages/app` (`root: APP_ROOT`) – lesson written.
- Coverage: v8, 100 % thresholds on all metrics, include all hand-written source incl. `.vue`; exclude `components/ui/**`, tests, `.d.ts`. Baseline was ~36 % statements.
- Moved database tests out of the unit project's `test/` glob: `packages/database/test/` is now integration-only (needs Docker).
- **Bugs found by the new tests (fixed):**
  - `AppDataTable` decided "clickable" via `'onRowClick' in useAttrs()`, but listeners of declared emits never appear in attrs → rows were never styled clickable. Now an optional `onRowClick` prop.
  - `AppConfirmDialog`: reka's `AlertDialogAction` (a `DialogClose`) runs its own close before the fall-through `@click`, so `update:open(false)` → `settle(false)` ran first and **every confirmation resolved `false`**. The confirm is now a plain `Button` calling `settle(true)`.
- Simplifications to remove untestable environment branches: `useApi` calls `useRequestHeaders(['cookie'])` unconditionally (Nuxt returns `{}` on the client); `useUnsavedChangesGuard` uses VueUse's SSR-safe default `window` target; `DataTable` uses TanStack's `functionalUpdate`; `ErrorBanner` imports `apiErrorMessage` explicitly (an auto-imported function called in a template compiles to an unreachable fallback branch); `ConfirmDialog` settles on any `update:open` (no trigger → only closing can be requested).
- Test gotchas: async helper returning a pending promise gets flattened (wrap it); `$fetch` retries GET once on 503; `useAsyncData` caches by key – unmount the page before `clearNuxtData`; mounted harnesses leak window listeners → `enableAutoUnmount(afterEach)` in `test/setup.nuxt.ts`.
- `pnpm test:coverage`: 198 tests, 100 % statements/branches/functions/lines.
- Integration suite (`vitest.integration.config.ts`): project `database-integration` (global setup: Testcontainers `postgres:17-alpine` + migrations; `TEST_DATABASE_URL` fallback) and `e2e` (same DB + production build started on a free port; `Browser` wrapper around the agent-browser CLI with `--json`, one named session per file, screenshot of failed tests to `test-results/e2e/`). 13 tests passed first time; a deliberate wrong assertion was caught and produced a screenshot.
- Verified the build does not pick up test files from `pages/`, `layouts/`, `server/**` (Nuxt's default `ignore` covers `*.test.ts`).
- `packages/database/tsconfig.json` now includes `test/` so integration tests are typechecked.
- `.github/workflows/ci.yml`: jobs Lint (+format), Typecheck, Unit tests (coverage gate, report artifact), Build (`.output` artifact, `include-hidden-files`), Integration tests (needs Build; `agent-browser install --with-deps`; failure screenshots artifact). Validated with actionlint 1.7.7.
- Docs: `AGENTS.md` (stack rows, new mandatory "Testing" section with the 100 % rule, commands, constraints), `CLAUDE.md` reminder, `docs/engineering-standards.md` §1.2/§8.2/§8.3/§8.4/§9, `README.md`.

## Result

- **CI:** `.github/workflows/ci.yml` (lint, typecheck, unit + coverage gate, build, integration).
- **Unit testing:** `@vitest/coverage-v8` with 100 % thresholds; `app-nuxt` project with `@nuxt/test-utils`; 198 unit tests, coverage 100 % on all metrics. Two real bugs fixed (`AppConfirmDialog` always answered "no"; `AppDataTable` never styled rows clickable).
- **Integration testing:** Testcontainers PostgreSQL + production build + agent-browser; 13 tests (DB health probe/migrations; home page; admin panel healthy and with the database down; health API; CSRF).
- **Rules:** 100 % unit coverage for every feature and e2e tests for pages are mandatory (`AGENTS.md` "Testing (mandatory)").
- **Verification:** `pnpm check` exit 0; `pnpm test:integration` exit 0 (Docker available locally); actionlint OK.
- **Left for the owner:** push the branch and confirm the first GitHub Actions run; then make the five jobs required status checks in branch protection for `main` (repo admin setting).

## Lessons

- [lessons/2026-10-13-nuxt-vitest-project-root.md](../lessons/2026-10-13-nuxt-vitest-project-root.md)
- [lessons/2026-10-13-reka-dialog-close-runs-before-click.md](../lessons/2026-10-13-reka-dialog-close-runs-before-click.md)
- [lessons/2026-10-13-declared-emits-not-in-attrs.md](../lessons/2026-10-13-declared-emits-not-in-attrs.md)
- [lessons/2026-10-13-nuxt-unit-test-gotchas.md](../lessons/2026-10-13-nuxt-unit-test-gotchas.md)
- Updated the Docker key lesson in `.ai/lessons.md` (Docker now works in this WSL setup).
