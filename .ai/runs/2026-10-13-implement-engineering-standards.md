# Implement the engineering standards spec

- **Date:** 2026-10-13
- **Agent/model:** Claude Code (claude-opus-5-5)
- **Spec:** [.ai/specs/implemented/2026-10-13-engineering-standards.md](../specs/implemented/2026-10-13-engineering-standards.md)
- **Status:** completed

## Goal
Implement the spec's R11 rollout: tooling (lint, format, test, check), `docs/engineering-standards.md` + `AGENTS.md` changes, `core/src/shared`, the server HTTP layer proven on `/api/v1/health`, the client layer and building blocks, theme tokens and zone layouts.

## Plan
1. Baseline `pnpm typecheck` / `pnpm build`.
2. Tooling (R10).
3. Docs (R1–R9).
4. `core/src/shared` + tests.
5. Server layer + `/api/v1/health`.
6. Client layer, components, formatters + tests.
7. Theme tokens, `agent` / `office` layouts.
8. `pnpm check`, finalize.

## Log
- Baseline: `pnpm typecheck` and `pnpm build` green before any change.
- Tooling: ESLint 10 (`@nuxt/eslint-config` flat, standalone at the repo root, `eslint-config-prettier`), Prettier 3, Vitest 5 (projects `core`, `database`, `app`), root scripts `lint`, `lint:fix`, `format`, `format:check`, `test`, `test:watch`, `check`.
  - `pnpm add` failed with `ERR_PNPM_IGNORED_BUILDS` for `unrs-resolver` (pulled by the import plugin); its binary ships prebuilt, so it is set to `false` in `allowBuilds`.
  - typescript-eslint reported a bogus "assigned a value but only used as a type" for a `const` object passed to calls in `eslint.config.mjs`; turned it into a function.
  - Boundary rules verified with a probe file importing `@tripsalesagent/database`, `@mikro-orm/core` and `vue` from `core`: three errors.
  - Prettier ignores `*.md`: run logs must not be rewritten and Markdown tables are hand-formatted.
- Docs were written after the code (spec R11 order was tooling → docs → code) so the document names the real files; noted here as a deliberate deviation.
- `core/src/shared`: `errors` (`DomainError` + kinds), `clock` (`Clock`, `systemClock`, `FixedClock`, Warsaw business dates), `money` (grosze, basis points, half-up once), `ids`, `validation` (zod 4 NIP/phone/e-mail schemas, `parseInput`, `issueCode`), `actor`. `HealthService` uses `clock` and throws `UnavailableError`. New subpath export `@tripsalesagent/core/shared` so client code can import schemas without pulling in `awilix`.
- Server layer: `defineApiHandler` + `toHttpError`, `requireActor`/`requireRole` (fail closed: 401 until the auth concept sets `event.context.actor`), `readValidBody`/`getValidQuery`/`getValidParams`, `setVersionTag`/`requireIfMatch` (missing `If-Match` → 428), CSRF middleware (custom header + `Origin`), `/api/health` → `/api/v1/health` (old route removed, docs updated). ETag is set explicitly by the handler (`setVersionTag`) instead of being inferred from the result – explicit over implicit.
- Client layer: `useApi`, `useApiQuery`, `useMutation`, `useApiForm`, `useConfirm`, `useUnsavedChangesGuard`; `ApiError`/`toApiError`, Polish message catalog, formatters, zod 4 → vee-validate adapter.
  - `shadcn-vue add form` installed `@vee-validate/zod` and **downgraded zod to 3.x** in the app; reverted to zod 4 and wrote `toFormSchema` (vee-validate `TypedSchema`) instead.
  - `@tanstack/vue-table` latest is 9.x; pinned to 8.x (the version shadcn-vue's data table targets).
  - Components live flat in `components/app/` (`<AppDataTable>`, `<AppErrorBanner>` …) because Nuxt prefixes names with every folder (`components/app/state/EmptyState.vue` → `AppStateEmptyState`). The separate `ConflictBanner` from the spec was merged into `AppErrorBanner` (it shows "Wczytaj aktualną wersję" for `VERSION_CONFLICT`).
  - Build broke with a relative import of `packages/app/shared/...` ("Could not resolve … from node_modules/.cache/nuxt/…"); fixed by using the `#shared` alias.
  - SSR rendered `NETWORK_ERROR` instead of `DATABASE_UNAVAILABLE`: `useRequestFetch()` on the server is Nitro's `event.$fetch` without `.raw`, and `toApiError` disguised the resulting `TypeError` as a network error. Fixed both: `useApi` uses `$fetch` + `useRequestHeaders(['cookie'])`, `toApiError` only maps real `FetchError`s to `NETWORK_ERROR` and logs anything else as `CLIENT_ERROR`.
  - Literal NBSP characters ended up in sources where ` ` was intended; caught by `no-irregular-whitespace`, replaced with the escape.
- Runtime check (`node .output/server/index.mjs`): no DB → `GET /api/v1/health` 503 `{ code: 'DATABASE_UNAVAILABLE' }`, `/admin` SSR shows the Polish banner with the code; `POST` without the client header → 403 `CSRF_REJECTED`; throwaway PostgreSQL 14 on port 54329 → 200 `{ status: 'ok', database: 'up' }`.
- Theme: mockup tokens mapped onto shadcn-vue variables + domain colors as Tailwind colors (`bg-marker`, `text-pine`, …), fonts Bricolage Grotesque / Schibsted Grotesk / IBM Plex Mono, `bg-paper-grid` utility; dark-mode tokens removed (no dark mode in the MVP). `AppPanelShell` + `agent` / `office` layouts with the menus of `01` §3; verified by SSR-rendering two temporary probe pages (deleted afterwards).
  - `nuxt typecheck` failed with "TS2321: Excessive stack depth" for `$fetch(path)` with a `string` path (Nitro typed routes); `useApi` now calls `$fetch` through a local untyped interface.
  - `pkill -f ".output/server/index.mjs"` inside a compound command matched and killed its own shell, so the following `rm -rf` of the probe pages never ran; caught by `pnpm format:check`. Stop servers by PID instead.
- Docs: `docs/engineering-standards.md` (glossary, naming, architecture, server/client layers, frontend, principles, security, quality/tests/review, how to add a concept); `AGENTS.md` (stack table, package deps, new sections "Domain concept convention", "Reusable server & client layer", "Component placement", "Money, time and state", frontend zones, commands, `pnpm check`); `README.md` (health path, zones, quality gate).
- Added `formatInquiryNumber` test after checking the acceptance criteria against every `02` §1.4 example.
- The earlier run log `2026-10-13-spec-engineering-standards.md` still links the spec at its old path; left unchanged per the rule on past run logs – the spec now lives in `specs/implemented/`.

## Result
Status: completed. Every acceptance criterion of the spec is met:
- `docs/engineering-standards.md` written; `AGENTS.md` and `README.md` updated and consistent with it.
- Tooling: `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, root scripts; `pnpm-workspace.yaml` (`unrs-resolver: false`).
- `packages/core`: `src/shared/{errors,clock,money,ids,validation,actor,index}.ts` + tests, `health.ts` (clock, `UnavailableError`) + test, `container.ts` (`clock`), `index.ts`, `package.json` (`zod`, `./shared` export).
- `packages/app`: `shared/types/api.ts`; `server/utils/{api-handler,actor,input,versioning}.ts` + test, `server/middleware/csrf.ts`, `server/api/v1/health.get.ts` (old `server/api/health.get.ts` removed), `server/types.d.ts`; `app/composables/*`, `app/utils/*` + tests, `app/components/app/*`, shadcn primitives (`alert`, `alert-dialog`, `form`, `label`, `skeleton`, `sonner`, `table`), `layouts/{agent,office}.vue`, theme in `assets/css/tailwind.css`, `app.vue` (toaster, confirm dialog), `pages/admin/index.vue` on the new client layer; deps `zod` 4, `h3`, `vee-validate`, `vue-sonner`, `@tanstack/vue-table` 8.
- Verification: `pnpm check` (lint, format:check, typecheck, 41 tests, build) green; `pnpm install --frozen-lockfile` OK; boundary probe rejected by ESLint; runtime checks of `/api/v1/health` (503 without DB, 200 with a throwaway PostgreSQL), CSRF rejection (403), `/admin` SSR error banner, agent/office layouts render.
- Not done (out of scope, per spec): any domain concept, auth/session middleware (so `requireActor` answers 401 everywhere), route guard middleware, `/me/counters`, the quote-expiry task, `database` integration tests (no entities yet). Next: spec "auth + clients" as the reference vertical slice.

## Lessons
- [shadcn-vue CLI can silently change dependencies](../lessons/2026-10-13-shadcn-cli-changes-dependencies.md)
- [Import `packages/app/shared` via `#shared`](../lessons/2026-10-13-nuxt-shared-dir-use-alias.md)
- [SSR fetch: no `.raw` on `useRequestFetch()`, typed `$fetch` on dynamic paths](../lessons/2026-10-13-ssr-fetch-raw-and-typed-routes.md)
