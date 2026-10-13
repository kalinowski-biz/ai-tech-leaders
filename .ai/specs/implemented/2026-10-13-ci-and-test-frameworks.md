# CI pipeline, unit-test coverage gate and browser integration tests

- **Status:** implemented
- **Created:** 2026-10-13
- **Related:** [engineering standards](2026-10-13-engineering-standards.md), run [2026-10-13-ci-and-test-frameworks](../../runs/2026-10-13-ci-and-test-frameworks.md)

## Goal

Every pull request is checked automatically on GitHub: the app builds, the code lints, unit tests pass with **100 % coverage**, and an integration suite boots the real app against an ephemeral PostgreSQL and drives it in a real browser.

## Context

Until now quality was only enforced locally (`pnpm check`). Unit tests existed for `core` and a few client utilities, without coverage measurement; components, composables and most server code were untested. `docs/engineering-standards.md` §8.2 planned "E2E (later)" with Playwright; the project owner chose **agent-browser** (Vercel's browser-automation CLI) as the browser driver and **Testcontainers** for the database.

## Requirements

1. **GitHub Actions workflow** `.github/workflows/ci.yml`, triggered on `pull_request` (and on `push` to `main`), with separate, individually visible jobs:
   - **Lint** – `pnpm lint` and `pnpm format:check`.
   - **Typecheck** – `pnpm typecheck`.
   - **Unit tests** – `pnpm test:coverage` (fails below 100 %), coverage report uploaded as an artifact.
   - **Build** – `pnpm build`; the `.output` bundle is uploaded for the integration job.
   - **Integration tests** – runs the built app against a Testcontainers PostgreSQL and drives it with agent-browser.
   - pnpm version from `packageManager`, dependency cache, concurrency group cancelling superseded runs, read-only `contents` permission.
2. **Unit tests (Vitest)**
   - `@vitest/coverage-v8` with a **100 % threshold** for lines, statements, functions and branches.
   - Coverage includes all hand-written source in `core`, `database` and `app` (`app/`, `server/`, `shared/`, incl. `.vue` files). Excluded only: generated shadcn-vue primitives (`components/ui/**`), type-only declaration files, tests, and the MikroORM CLI entry point.
   - Vue components and composables run in the Nuxt test environment (`@nuxt/test-utils`, happy-dom), in a separate Vitest project (`app-nuxt`); pure functions stay in fast `node` projects.
   - Unit tests never need Docker or a running database.
3. **Integration tests** (`pnpm test:integration`, config `vitest.integration.config.ts`)
   - Global setup starts `postgres:17-alpine` via `@testcontainers/postgresql` (or uses `TEST_DATABASE_URL` when set, for machines without Docker), applies migrations, starts the **built** server (`.output/server/index.mjs`) on a free port with that `DATABASE_URL`, waits for `/api/v1/health`, and tears everything down afterwards.
   - Browser tests use agent-browser (`agent-browser` devDependency, pinned) through a small typed helper with an isolated session per test file.
   - `database` integration tests (`packages/database/test/`) run in the same suite against the same container.
   - Coverage of the basics: home page (content, navigation to the admin panel) and admin panel (renders, reports healthy database through the request-scoped container, refresh works), plus the health API.
4. **Rules** – `AGENTS.md` and `docs/engineering-standards.md` state that every new feature/change ships with unit tests keeping coverage at 100 %, and that a change is done only when CI is green (`pnpm check`, incl. the coverage gate; integration tests when touching pages/API/DB).
5. Existing code reaches 100 % unit coverage.

## Acceptance criteria

- `pnpm test:coverage` passes locally with 100 % on all four metrics and fails if a branch is left untested.
- `pnpm test:integration` passes locally (Docker available) – home page and admin panel tests green.
- `pnpm check` passes.
- The workflow file is valid and its jobs mirror the local commands.

## Out of scope

- Branch protection rules on GitHub (must be configured by a repo admin: require the CI jobs).
- Coverage of generated shadcn-vue primitives.
- Full user-journey E2E (path P1) – added with the features.

## Open questions

- none
