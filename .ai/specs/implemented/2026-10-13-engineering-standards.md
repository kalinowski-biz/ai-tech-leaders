# Engineering standards for the agency sales portal (TripSalesAgent MVP)

- **Status:** implemented
- **Created:** 2026-10-13
- **Related:**
  - Product: [`.ai/mockups/2026-10-13-agency-sales-portal-mvp/`](../../mockups/2026-10-13-agency-sales-portal-mvp/README.md) (`00-zakres-funkcjonalny.md` – scope and use cases, `01-mapa-ekranow-i-nawigacji.md` – screens, routes, statuses, API catalog, `02-specyfikacja-ekranow.md` – shared UI patterns and screen cards)
  - Model document: `local/2026-09-01-engineering-standards-ai-tech-leaders.md` (DevMentor standards, Next.js stack; git-ignored)
  - Bootstrap: [`implemented/2026-10-13-init-tripsalesagent-monorepo.md`](2026-10-13-init-tripsalesagent-monorepo.md)
  - Run: [`runs/2026-10-13-spec-engineering-standards.md`](../../runs/2026-10-13-spec-engineering-standards.md) · implementation: [`runs/2026-10-13-implement-engineering-standards.md`](../../runs/2026-10-13-implement-engineering-standards.md)

## Goal

Before the first domain feature is written, agree on and document **one** way of writing code in TripSalesAgent, so that ~11 domain concepts (auth, agents, offers, clients, inquiries, quotes, messages, bookings, commissions, reports, notifications) arrive consistently, whether written by a person or an agent.

Deliverables:

1. `docs/engineering-standards.md` – the standards document, with the same sections as the model document, adapted to this stack and domain (content defined in "Requirements" below).
2. `AGENTS.md` updated with the short, binding version of the conventions (sections listed in R9).
3. Tooling that enforces what can be enforced: ESLint (incl. package boundaries), formatting, a test runner, a single quality gate command.
4. The cross-cutting **shared layers** (server HTTP layer, client API layer, feedback/form/table building blocks, formatters, `Clock`) – built once, before the first concept, and proven on the existing `/api/health` endpoint.

## Context

- **Stack is fixed** by `AGENTS.md`: Nuxt 4 + Vue 3 + strict TS, Nitro API, PostgreSQL + MikroORM v7, Awilix (`PROXY`, `strict`, one scope per request), Tailwind v4 for public pages, shadcn-vue for panel pages, pnpm workspaces, packages `app` / `core` / `database` with direction `app → core`, `app → database`, `database` implements ports from `core`.
- **What exists:** composition root `packages/app/server/utils/container.ts`, `useScope(event)`, `HealthService` + `HealthProbe` port, empty entity registry, shadcn primitives `badge`, `button`, `card`, `input`, `separator`. No ESLint, no formatter, no tests, no auth, no validation library.
- **Model document vs. this repo.** The model is written for Next.js App Router + React + a separate `ui` package. The parts that are stack-neutral (naming table, principles, security minimums, review checklist, placement decision tree, incremental migration) are kept. The parts that do not translate are adapted (see "Mapping of the model document").
- **Product facts that drive the rules** (from the MVP documents):
  - One central aggregate – the **inquiry** – with an 11-status lifecycle, versioned quotes (at most one active), a thread, a history of every transition (§7 and rules §8 of `00`).
  - Two authenticated roles (`AGENT`, `OFFICE`) with **data isolation** for agents, plus an anonymous client acting through a **public token link** (`/w/{token}`).
  - Money: quote value = price × paid participants; commission = value × rate **frozen at acceptance**; final value at completion.
  - API contract already designed: prefix `/api/v1`, cookie session, `ETag` + `If-Match` with 409 on conflict, 422 with `[{ field, code }]`, 410 for stale public tokens, 404 for records the agent may not see (`01` §5, `02` §1.2).
  - Shared UI patterns already designed: skeleton after 150 ms, empty vs. filtered-empty, error banner with retry, success toast, mutation buttons with in-progress labels, unsaved-changes guard, Polish formats (`02` §1).
  - Time matters: quote expiry (UC-S1), "expires within 3 days", "settlement due after return date". The mockup has a "system date" switch – production code needs the same seam.
  - The mockup (`mockup/src/store.ts`) stores money as JS floats and rounds with `Math.round(x * rate) / 100`. That is acceptable for a prototype and **must not** be carried over.

## Mapping of the model document

| Model (DevMentor, Next.js) | TripSalesAgent (Nuxt) | Why |
| --- | --- | --- |
| `packages/db`, `packages/ui` | `packages/database`; UI lives in `packages/app/app` | Package set fixed by `AGENTS.md`; no separate UI package until a second consumer exists. |
| `api/<concept>/route.ts` exporting `GET/POST` | `server/api/v1/<concept>/.../<name>.<method>.ts` (Nitro file routing) | One file per method is the Nitro convention. |
| `makeCrudRoute` | **Not adopted** | File routing already splits per method; a generator would hide logic for ~4 genuinely CRUD resources. Handlers stay thin instead (R4). |
| `apiHandler` + `{ ok, data }` envelope | `defineApiHandler` wrapper; success = plain JSON, error = h3 error with typed `data` | Idiomatic for `$fetch`/`useFetch`; keeps the 409/410/422 contract from `01` §5. |
| `core/src/http/errors.ts` | `core/src/errors.ts` (framework-free) + mapping in `app/server/utils` | `core` must not know HTTP; the app maps domain errors to status codes. |
| `apiCall` / `apiCallOrThrow` | `useApi()` (`$fetch.create` wrapper) + `useApiQuery()` (on `useAsyncData`) | Nuxt SSR-aware data fetching. |
| `CrudForm`, `DataTable`, `feedback/*` (React) | `components/app/form/*` (shadcn-vue Form + vee-validate), `components/app/DataTable.vue` (TanStack Table), `components/app/state/*` | shadcn-vue equivalents. |
| Colocate one-page components next to `page.tsx` | Not possible – every `.vue` in `pages/` is a route | Placement tree adjusted (R5). |
| JWT in cookie, bcrypt ≥ 12 | Opaque DB-backed session, argon2id (Decision 3) | Agent deactivation (UC-B1 PA3) must revoke sessions immediately. |
| Typed event bus | **Not in MVP** | Notifications are read models (history + read markers), not side effects; add a bus when a second side effect appears. |
| `export const dynamic = "force-dynamic"` | Already solved: ORM connects lazily, app boots without DB | Keep the guarantee. |

## Requirements

Each requirement R1–R8 is a section of `docs/engineering-standards.md`; the bullets are the **minimum content** of that section. Wording may be improved; substance may not be dropped without updating this spec.

### R1. Naming and domain glossary

1. **Glossary PL → EN** is mandatory and is the first table in the document. UI text is Polish; every identifier (code, DB, API, routes of the API) is English. Minimum entries:

   | PL (UI) | EN (code) | Notes |
   | --- | --- | --- |
   | Biuro / Pracownik biura | `office` / `OfficeUser` | role `OFFICE` |
   | Agent | `agent` / `Agent` | role `AGENT`; one login = one settlement entity |
   | Klient (nauczyciel) | `client` / `Client` | no account |
   | Oferta | `offer` / `Offer` | `DRAFT → PUBLISHED → WITHDRAWN` |
   | Migawka oferty | `OfferSnapshot` | embedded in inquiry |
   | Zapytanie | `inquiry` / `Inquiry` | central aggregate |
   | Wycena (wersja) | `quote` / `Quote` (`version`) | at most one `ACTIVE` |
   | Link do wyceny | public quote token / `QuoteLink` | `/w/{token}` |
   | Prośba o zmianę | `ChangeRequest` (message kind) | |
   | Wątek / wiadomość | `InquiryMessage` | kinds `message`, `change-request`, `system` |
   | Historia | `InquiryHistoryEntry` | who, when, channel, comment |
   | Rezerwacja | booking (state of inquiry, `contractNumber`) | not a separate aggregate in MVP |
   | Prowizja | `commission` / `Commission` | `FORECAST → DUE → PAID`, `CANCELLED` |
   | Do rozliczenia | settlement due | |
   | Wymaga akcji | action items | |
   | Kolejka | (office) queue | |

2. **Naming table** (the model's table, adapted):

   | Element | Convention | Example |
   | --- | --- | --- |
   | Package | `packages/<name>`, `@tripsalesagent/<name>` | `@tripsalesagent/core` |
   | Concept folder | plural, kebab-case, identical in every layer | `inquiries`, `commissions` |
   | Entity | PascalCase singular, MikroORM `defineEntity`, `<name>.entity.ts` | `database/src/entities/inquiries/inquiry.entity.ts` |
   | DB table / column | snake_case via MikroORM `UnderscoreNamingStrategy` (default); singular table names (Decision 5) | `inquiry_history_entry.created_at` |
   | Service | PascalCase + `Service`, `<name>.service.ts` | `core/src/inquiries/inquiry.service.ts` |
   | Port | PascalCase interface, `<name>.port.ts`, in the concept that needs it (or `core/src/shared/` when cross-cutting) | `Mailer` → `core/src/shared/mailer.port.ts` |
   | Adapter | implementation name + port name, in the package that owns the technology | `MikroOrmInquiryRepository`, `ConsoleMailer` |
   | Repository (port) | `<Entity>Repository` interface in `core`, implemented in `database` | `InquiryRepository` |
   | Cradle key | camelCase of the class | `inquiryService` |
   | Validation schema | camelCase + `Schema`, `<name>.schema.ts` | `inquiryCreateSchema` |
   | Status / enum | `UPPER_SNAKE` string values (as in `01` §4), `as const` array + derived union type | `INQUIRY_STATUSES`, `InquiryStatus` |
   | Domain error | PascalCase + `Error`, extends `DomainError` | `InvalidTransitionError` |
   | API route file | `server/api/v1/<concept>/[<id>]/<action>.<method>.ts`, kebab-case actions as in `01` §5 | `inquiries/[inquiryId]/take-over.post.ts` |
   | Page | Polish user-facing route from `01` §2, file under the zone folder | `pages/agent/zapytania/[inquiryId].vue` |
   | Screen ID | keep the IDs from `01` (`A-06`, `B-03`, `M-A2`) in a `<!-- A-06 -->`-style comment at the top of the page/modal | traceability to the spec |
   | Component | PascalCase file, Nuxt path-prefixed name must read well | `components/inquiries/StatusBadge.vue` → `<InquiriesStatusBadge>` |
   | Composable | `useXxx`, `app/composables/` | `useApi`, `useMutation` |
   | Test | `<file>.test.ts` next to the code (unit), `test/` folder per package (integration) | `inquiry-state-machine.test.ts` |

### R2. Architecture and package layout

1. **Domain concept folders inside the existing packages** (model's decision kept): `core/src/<concept>/`, `database/src/entities/<concept>/` (+ `database/src/repositories/<concept>/`), `app/server/api/v1/<concept>/`, `app/app/components/<concept>/`, pages under the zone folders. No `modules/`, no per-concept setup files, no auto-discovery; each new service is one explicit line in a `register*` function.
2. A concept folder is created **only with its first file**.
3. **Target tree** for the MVP is part of the document (core: `shared/` (errors, clock, ids, money, ports), `auth/`, `agents/`, `offers/`, `clients/`, `inquiries/` (incl. state machine, quotes, messages, history), `commissions/`, `reports/`, `notifications/` (counters, action items); database: entities and repositories per concept; app: `server/api/v1/...` mirroring `01` §5, `server/utils/` HTTP layer, pages per zone, components per concept).
4. **Repositories as ports.** Services in `core` depend on repository interfaces declared in `core` and implemented in `database` with MikroORM. `core` never imports `@mikro-orm/*`. Transactions are expressed by a `UnitOfWork`/`transactional(fn)` port so that state-changing use cases are atomic without leaking the ORM. (Alternative – `core` receiving the `EntityManager` – is explicitly rejected because it breaks the dependency direction in `AGENTS.md`.)
5. **Inquiry state machine is one table.** `core/src/inquiries/inquiry-state-machine.ts` declares every transition from `00` §7 (from, action, actor, to, effect on quote, effect on commission). Services call `transition(inquiry, action, actor)`; no service writes `inquiry.status = ...` directly. Every transition appends an `InquiryHistoryEntry` in the same transaction (rule §8.7). The table is unit-tested row by row.
6. **Optimistic locking.** Versioned entities (offer, client, inquiry, agent) have a MikroORM `version` property; the API returns it as `ETag`, mutations require `If-Match`; mismatch → `ConflictError` (409, code `VERSION_CONFLICT`). Business-rule conflicts use a different code (`RULE_CONFLICT`), matching `02` §1.2.
7. **Time via `Clock` port.** No `new Date()` / `Date.now()` in `core`; inject `clock`. Business dates (departure, return, quote validity) are `date` in the DB; instants are `timestamptz` in UTC; "end of day" for validity is evaluated in `Europe/Warsaw`.
8. **External effects via ports:** `Mailer` (invitation, password reset – the only e-mails in MVP), `FileStorage` (offer photos/PDF, message attachments), `PasswordHasher`, `TokenGenerator`. MVP adapters: console/log mailer, local-disk storage. No vendor SDK in `core`.
9. **No event bus, no queue in MVP.** Notifications (counters, badges, action items) are computed from history entries and per-user read markers. Quote expiry (UC-S1): Decision 4.
10. **Lifetimes:** repositories and services `SCOPED` (they use the scoped `em`); `clock`, `mailer`, `fileStorage`, `passwordHasher` `SINGLETON`. Resolve only in handlers/plugins.

### R3. Reusable server layer (`packages/app/server/utils/`, auto-imported)

1. `core/src/shared/errors.ts`: `DomainError` base with a stable `code`; subclasses `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError` (with `fields: { field, code }[]`), `ConflictError` (`VERSION_CONFLICT` | `RULE_CONFLICT` + domain code), `GoneError`. Services throw only these.
2. `defineApiHandler(fn)` wraps `defineEventHandler`: maps `DomainError` → status (404/403/401/422/409/410) with body `{ code, message, fields? }` in h3 `data`; logs unexpected errors with request id and returns a generic 500 without stack; sets `ETag` when the result carries a version. **Every** handler under `server/api/v1` uses it; no handler has its own `try/catch`.
3. `requireActor(event)` (401), `requireRole(actor, 'OFFICE')` (403), returning an `Actor` value object (`{ id, role, agentId? }`) that is passed to services. Ownership is enforced **in the service/repository** (agent queries always filtered by `agentId`), and a record the agent may not see is reported as **404**, not 403 (`02` §1.2).
4. Input: `readValidatedBody` / `getValidatedQuery` / `getValidatedRouterParams` with the shared schema; `requireIfMatch(event)` for versioned mutations (428 or 409 when missing – decided in the doc).
5. A handler is ≤ ~15 lines: actor → validate → resolve service from `useScope(event)` → call → return. Business rules in handlers are a review blocker.

### R4. Reusable client layer (`packages/app/app/`)

1. `useApi()` – the **only** place that calls `/api/v1` (`$fetch.create` with base URL, CSRF header, `If-Match` from the last read version, normalization to `ApiError { status, code, message, fields }`). No `$fetch('/api/...')`/`fetch` in components or pages.
2. `useApiQuery(key, path, opts)` on top of `useAsyncData` for reads (SSR-safe, refresh, `pending` → skeleton with the 150 ms delay).
3. `useMutation(fn, { pendingLabel, successToast })` – disables the button, ignores double clicks, shows the toast in the perfective form, refreshes affected queries and the menu counters (`02` §1.3, §1.5), maps 401 → login redirect with return path, 409 → conflict banner with "Wczytaj aktualną wersję", 422 → field errors and focus on the first one.
4. Forms: shadcn-vue `Form` (vee-validate) bound to the **same schema** as the server; field errors from 422 are merged into the form; warnings (non-blocking, yellow) are a separate channel from errors; `useUnsavedChangesGuard()` for modals and pages.
5. Lists: one `DataTable` component (shadcn-vue + TanStack Table) with loading/empty/filtered-empty/error states, sorting, row actions, unread badge slot.
6. States: `components/app/state/{LoadingSkeleton,EmptyState,ErrorBanner,ConflictBanner}.vue` are the only sanctioned renderers.
7. Formatters in one module (`app/utils/format.ts`, pure, unit-tested) implementing `02` §1.4 exactly: money, dates, date ranges, relative age, phone, NIP, commission rate, inquiry number.
8. Status labels and colors (`01` §4) in one map per status family; components never hard-code a status label.

### R5. Frontend conventions and component placement

1. Zones: public account pages (S-01…S-04) and the public quote page (K-01) – Tailwind only, mobile first, own layout without menu; agent zone and office zone – shadcn-vue, own layouts (`agent`, `office`) with the menus from `01` §3. Zone/route naming: Decision 1.
2. Route guards in one global middleware based on `/auth/me` (role → allowed zone; agent on office route → redirect to `A-01`).
3. Placement decision tree for a new component:
   1. shadcn primitive → `components/ui/`, only via `pnpm dlx shadcn-vue@latest add`, never hand-written.
   2. Generic, concept-agnostic building block (form field type, table cell, state renderer, page header) → `components/app/<category>/`.
   3. Tied to one concept's data shape (quote ticket, inquiry status badge, offer card, commission summary) → `components/<concept>/`.
   4. Used by exactly one screen → `components/<concept>/<screen>/` (e.g. `components/inquiries/agent-card/`), promoted one level up when a second screen needs it. Never put non-route `.vue` files in `pages/`.
4. Visual direction of the mockup ("zeszyt i bilet": colors, fonts) is implemented as **theme tokens** (CSS variables in `assets/css/tailwind.css` consumed by shadcn-vue and Tailwind), not as custom CSS classes.
5. Accessibility minimum: every form control has a label, focus is visible, modals trap focus (Reka UI default), status is never conveyed by color alone (label text always present).

### R6. Engineering principles

Keep the model's list, each with a TripSalesAgent example: SRP (entity / service / handler / component), DRY (one schema, one `useApi`, one state machine table), separation of concerns (no MikroORM in `core`, no rules in Vue), dependency inversion (`Mailer`, `FileStorage`, repositories), explicit over implicit (hand-written `register*`, no `loadModules`), convention over configuration (concept folders), YAGNI (no RBAC inside office, no multi-agent agencies, no e-mail notifications, no event bus – all excluded by `00` §1), composition over inheritance, **fail closed** (any error in an access check denies), **idempotency** (public accept/reject clicked twice, retried mutations – second call returns the recorded decision, no second commission).

### R7. Security and data minimums

1. **Passwords:** argon2id (m ≥ 19 MiB, t ≥ 2, p = 1) behind `PasswordHasher`; minimum length and rules in the activation/reset schema.
2. **Sessions:** DB-backed opaque session id (Decision 3); `httpOnly`, `secure` in production, `sameSite=lax`, rotated on login, invalidated on logout, on password reset and on agent deactivation.
3. **One-time and public tokens** (activation, password reset, public quote): ≥ 32 random bytes, base64url, stored **hashed**, with expiry; activation/reset single-use and invalidated on re-issue (UC-B1 PA2); quote token valid only while the quote is `ACTIVE` (410 otherwise). Token pages send `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`.
4. **CSRF:** `sameSite` cookie + required custom header (set by `useApi`) + `Origin` check on every state-changing route.
5. **Rate limiting:** login, password reset request, activation, public quote accept/reject – per IP + identifier, documented as MVP-grade.
6. **Generic auth messages** – never reveal whether an e-mail exists (S-01, S-03).
7. **Authorization:** role check in the handler, ownership in the service; agent sees only own clients/inquiries/commissions (rule §8.6); IDOR = blocker.
8. **Mass assignment:** only parsed schema output reaches services; schemas never accept `id`, `status`, `agentId`, `value`, `commission*`, `version` from the body.
9. **Money is server-side:** quote value, forecast and due commission are computed in `core`; client-sent amounts other than explicit inputs (price per participant, final value) are ignored. Money stored as **integer grosze** (`bigint`/`integer`), commission rate in **basis points** (500 = 5 %), rounding half-up to 1 grosz once, at commission computation; a `Money` helper in `core/src/shared/money.ts`.
10. **Concurrency:** every check-then-act on the inquiry runs in a transaction with the version check; inquiry numbers `ZAP-RRRR-NNNN` from a DB-side counter (no `max()+1`).
11. **Uploads:** allow-listed MIME types verified by content, size limits, random storage names, served only through an authorized endpoint.
12. **Personal data (RODO):** client phone/e-mail/name and agent NIP are personal data – never in logs, error messages or URLs; logger with redaction of `password`, `token`, `cookie`, `authorization`, `email`, `phone`.
13. **Secrets/config:** all env variables validated at startup by one schema; new variables documented in `.env.example`.
14. **IDs:** UUID primary keys; human-readable numbers only for display.
15. **Dependencies:** `pnpm audit --prod` in the quality gate; no dependency for what ~20 lines cover.

### R8. Code quality, testing and review checklist

1. Code quality rules from the model (no `any`, narrow `unknown`; early returns; no empty `catch`; named constants with the *why* – 14-day validity, 3-day warning, 7-day "no decision", 60 s counter polling, 150 ms skeleton delay; positive booleans; no dead/commented code or `console.log`; diff traces to its purpose).
2. **Tests (Vitest):**
   - `core` unit tests: every row of the state machine, money/commission calculation (including the `00` §6 numbers: 5 % × 23 140 zł = 1 157 zł, 5 % × 24 030 zł = 1 201,50 zł), NIP checksum, expiry with a fake `Clock`.
   - `database` integration tests against a real PostgreSQL (not Docker-dependent; see lesson about the local PostgreSQL in WSL), at least: optimistic locking, inquiry number counter under concurrency, agent isolation queries.
   - API tests for each handler's auth/ownership/422/409 paths once the handler exists.
   - Formatters unit-tested against `02` §1.4 examples.
   - A bug fix ships with a regression test.
3. **Review checklist** – the model's structure (structure & conventions, security fundamentals with blocker/major marks, correctness & tests), adapted: shared layers used (`defineApiHandler`, `useApi`, `useMutation`, form, `DataTable`, state components) or a stated reason; no direct status assignment outside the state machine; history entry on every transition; `If-Match` on versioned mutations; agent isolation and 404; money in grosze; no PII in logs; screen ID comment present; quality gate green.
4. **Quality gate:** `pnpm check` = `lint` + `format:check` + `typecheck` + `test` + `build`. A change is not done until it passes (extends the rule in `AGENTS.md`).

### R9. `AGENTS.md` changes

Add, in the same PR as the standards document:

- "Domain concept convention" (concept folders per layer, created on first file, no module runtime, glossary pointer).
- "Reusable server & client layer" (R3, R4 in five lines each, with file paths).
- "Component placement" (R5.3).
- "Money, time and state" (grosze/basis points, `Clock`, state machine table, history, `If-Match`).
- Update "Commands" with `lint`, `format`, `test`, `check`; update "A change is not done until…" to `pnpm check`.
- Update the stack table: validation library (`zod`, Decision 2), `core` allowed dependencies, ESLint/Prettier/Vitest.
- Link to `docs/engineering-standards.md` as the full rationale.

### R10. Tooling

1. ESLint flat config (`@nuxt/eslint` for the app + `typescript-eslint` for packages) with **`no-restricted-imports` boundaries**: `core` cannot import `@tripsalesagent/database`, `@tripsalesagent/app`, `@mikro-orm/*`, `h3`, `nuxt`, `vue`; `database` cannot import the app; files under `app/app/**` cannot import `@tripsalesagent/database` or server utils; components cannot import `$fetch` directly (enforced by a restricted-syntax rule or review).
2. Prettier (single config at the root, Decision 7).
3. Vitest workspace config covering `core`, `database`, `app`.
4. Root scripts: `lint`, `lint:fix`, `format`, `format:check`, `test`, `check`. Keep the `tsc6` constraint from `AGENTS.md`.

### R11. Foundations and incremental rollout

Implement in this order, each step buildable (`pnpm check` green) and committed separately:

1. Tooling (R10) with the current code passing lint/format.
2. `docs/engineering-standards.md` + `AGENTS.md` changes (R1–R9).
3. `core/src/shared/` (`errors`, `clock`, `money`, `ids`) with unit tests; register `clock` in `registerCore`.
4. Server layer (R3) – migrate `/api/health` to `server/api/v1/health.get.ts` via `defineApiHandler` (keep `/api/health` working or redirect; decide in the run log) as the reference example.
5. Client layer and building blocks (R4): `useApi`, `useApiQuery`, `useMutation`, state components, formatters (+ tests), `DataTable` and form wrappers (add the needed shadcn primitives: `form`, `table`, `dialog`, `sonner`/toast, `skeleton`, `alert`, `select`, `label`).
6. Theme tokens from the mockup's visual direction; `agent` and `office` layouts with the menus (no domain data yet).
7. Verify: `pnpm check` green; `/api/v1/health` returns the documented error shape when the DB is down (503 + `{ code, message }`).

## Acceptance criteria

- `docs/engineering-standards.md` exists and contains R1–R8 at least at the level of detail above, including the glossary, the naming table, the target tree, the placement decision tree, the security minimums and the review checklist.
- `AGENTS.md` contains the R9 sections and links to the document; nothing in `AGENTS.md` contradicts it.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm check` pass on a clean checkout.
- A deliberate import of `@tripsalesagent/database` from `packages/core` (or of `@mikro-orm/core`) fails `pnpm lint`.
- `core/src/shared` has unit tests for money rounding (incl. the two `00` §6 examples) and a fake `Clock`.
- `/api/v1/health` is implemented with `defineApiHandler`; the handler contains no `try/catch`.
- `useApi`, `useApiQuery`, `useMutation`, the state components, `DataTable`, the form wrapper and the formatters exist, formatters are unit-tested against every example in `02` §1.4.
- No domain entity, endpoint or screen is added by this spec.

## Out of scope

- Any domain concept implementation (auth, agents, offers, clients, inquiries, …) – each gets its own spec; the first one should be **auth + clients** as the reference vertical slice that every later concept copies.
- CI pipeline, deployment, observability stack.
- E2E browser tests (Playwright) – add with the first full user path (P1).
- i18n framework – UI is Polish only in MVP; labels live in the status/label maps.

## Decisions (resolved open questions, 2026-10-13)

All questions were answered by the user on 2026-10-13: question 2 explicitly "yes", the rest "use the defaults".

1. **Zones and routes:** keep the Polish routes from `01` §2 (`/agent/...`, `/biuro/...`), layouts `agent` and `office`, shadcn-vue in both; the "admin pages" rule in `AGENTS.md` becomes "panel pages". The demo `/admin` page is removed when the first zone page lands.
2. **Validation:** `zod` (v4) is allowed in `core`; schemas are shared by Nitro handlers and vee-validate forms. `AGENTS.md` is updated accordingly (allowed dependencies of `core`: `awilix`, `zod`).
3. **Sessions:** opaque random session id in an httpOnly cookie, sessions table in PostgreSQL (immediate revocation on deactivation, password reset and logout).
4. **Quote expiry (UC-S1):** evaluated on read and before every mutation (via `Clock`) and persisted by a Nitro scheduled task (`nitro.experimental.tasks` + `nitro.scheduledTasks`, hourly; verify the API with context7 before implementing).
5. **DB table names:** MikroORM default naming strategy (singular snake_case, e.g. `inquiry`).
6. **Language of `docs/engineering-standards.md`:** English; the glossary keeps the Polish terms.
7. **Formatter:** Prettier (not ESLint Stylistic).
