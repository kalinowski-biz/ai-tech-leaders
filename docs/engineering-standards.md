# TripSalesAgent – Engineering Standards

- **Date:** 2026-10-13
- **Status:** active
- **Spec:** [`.ai/specs/implemented/2026-10-13-engineering-standards.md`](../.ai/specs/implemented/2026-10-13-engineering-standards.md)
- **Product:** agency sales portal MVP – [`.ai/mockups/2026-10-13-agency-sales-portal-mvp/`](../.ai/mockups/2026-10-13-agency-sales-portal-mvp/README.md) (`00` scope and use cases, `01` screens, routes, statuses and API catalog, `02` shared UI patterns and screen cards)

`AGENTS.md` holds the short, binding version of these rules. This document is the full rationale: what the rule is, where the code lives, and why. The stack itself (Nuxt 4, Vue 3, MikroORM v7, Awilix, Tailwind v4, shadcn-vue, pnpm) is fixed by `AGENTS.md` and not repeated here.

Decisions taken with the project owner (2026-10-13): **domain concept folders inside the existing three packages** (no module runtime), **Polish user-facing routes with `agent` and `office` layouts**, **zod 4 allowed in `core`**, **opaque DB-backed sessions**, **quote expiry evaluated on read and persisted by a scheduled Nitro task**, **MikroORM default (singular) table names**, **Prettier**.

---

## 1. Naming

### 1.1 Domain glossary (PL → EN)

UI text is Polish. Every identifier – code, database, API paths, query parameters, error codes – is English. Use exactly these words; do not invent synonyms (`order`, `request`, `offerRequest`, `reservation`, `fee`…).

| PL (UI) | EN (code) | Notes |
| --- | --- | --- |
| Biuro / Pracownik biura | `office` / `OfficeUser` | role `OFFICE`; every office user may do every office action |
| Agent | `agent` / `Agent` | role `AGENT`; one login = one settlement entity; `INVITED → ACTIVE → DEACTIVATED` |
| Klient (nauczyciel) | `client` / `Client` | belongs to one agent; has no account |
| Oferta | `offer` / `Offer` | `DRAFT → PUBLISHED → WITHDRAWN` |
| Migawka oferty | `OfferSnapshot` | copy of the offer embedded in the inquiry at submission |
| Zapytanie | `inquiry` / `Inquiry` | the central aggregate; number `ZAP-RRRR-NNNN` |
| Wycena (wersja N) | `quote` / `Quote` (`version`) | at most one `ACTIVE` per inquiry |
| Link do wyceny | public quote token / `QuoteLink` | page `/w/{token}`, API `/public/quotes/{token}` |
| Prośba o zmianę | change request (`InquiryMessage` of kind `change-request`) | |
| Wątek / wiadomość | `InquiryMessage` | kinds `message`, `change-request`, `system` |
| Historia | `InquiryHistoryEntry` | who, when, channel, comment |
| Decyzja klienta (kanał) | `QuoteDecision` (`channel: 'link' \| 'agent'`) | |
| Rezerwacja | booking – a state of the inquiry (`BOOKING_CONFIRMED`, `contractNumber`) | not a separate aggregate in the MVP |
| Realizacja / wartość końcowa | completion / `finalValue` | |
| Prowizja | `commission` / `Commission` | `FORECAST → DUE → PAID`, or `CANCELLED` |
| Stawka prowizji | `commissionRate` (basis points) | frozen at acceptance |
| Do rozliczenia | settlement due | |
| Wymaga akcji | action items | |
| Kolejka | (office) queue | |
| Liczniki w menu | counters | `GET /me/counters` |
| Szkic | draft | |

Status codes are exactly those in `01` §4 (`NEW`, `QUOTING`, `QUOTE_READY`, …; `ACTIVE`, `SUPERSEDED`, …; `FORECAST`, `DUE`, …).

### 1.2 Naming table

| Element | Convention | Example |
| --- | --- | --- |
| Package | `packages/<name>`, `@tripsalesagent/<name>` | `@tripsalesagent/core` |
| Concept folder | plural, kebab-case, the same name in every layer | `inquiries`, `commissions` |
| Entity | PascalCase singular, MikroORM `defineEntity`, file `<name>.entity.ts` | `database/src/entities/inquiries/inquiry.entity.ts` |
| DB table / column | MikroORM default `UnderscoreNamingStrategy`: singular snake_case table, snake_case columns | table `inquiry_history_entry`, column `created_at` |
| Service | PascalCase + `Service`, file `<name>.service.ts` | `core/src/inquiries/inquiry.service.ts` → `InquiryService` |
| Port | PascalCase interface, file `<name>.port.ts`; in the concept that needs it, or `core/src/shared/` when cross-cutting | `Mailer` → `core/src/shared/mailer.port.ts` |
| Repository (port) | `<Entity>Repository` interface in `core` | `core/src/inquiries/inquiry-repository.port.ts` |
| Adapter | technology + port name, in the package that owns the technology | `database/src/repositories/inquiries/mikro-orm-inquiry-repository.ts` → `MikroOrmInquiryRepository`, `ConsoleMailer` |
| Cradle key | camelCase of the class | `inquiryService`, `inquiryRepository` |
| Validation schema | camelCase + `Schema`, file `<name>.schema.ts` | `core/src/inquiries/inquiry-create.schema.ts` → `inquiryCreateSchema` |
| Status / enum | `UPPER_SNAKE` string values; `as const` array + derived union | `INQUIRY_STATUSES`, `type InquiryStatus` |
| Domain error | PascalCase + `Error`, extends `DomainError` (`core/src/shared/errors.ts`) | `InvalidTransitionError` |
| Error code | `UPPER_SNAKE`, stable once shipped | `VERSION_CONFLICT`, `INQUIRY_NOT_FOUND` |
| Field error code | `snake_case` | `invalid_nip`, `too_small` |
| API route file | `server/api/v1/<concept>/…/<name>.<method>.ts`; paths and action names as in `01` §5 | `server/api/v1/inquiries/[inquiryId]/take-over.post.ts` |
| Route params | camelCase, as in `01` §5 | `[inquiryId]`, `[offerId]` |
| Page | Polish user-facing route from `01` §2, file under the zone folder | `pages/agent/zapytania/[inquiryId].vue` |
| Screen ID | the `01` ID in a comment at the top of every page/modal | `<!-- A-06 Karta zapytania (agent) -->` |
| Component | PascalCase file; Nuxt prefixes the folder path, so choose names that read well | `components/inquiries/StatusBadge.vue` → `<InquiriesStatusBadge>` |
| Composable | `useXxx`, `app/composables/` | `useApi`, `useMutation` |
| Unit test | `<file>.test.ts` next to the code | `inquiry-state-machine.test.ts` |
| Integration test | `packages/<pkg>/test/**/*.test.ts` | `database/test/inquiry-repository.test.ts` |

---

## 2. Architecture

### 2.1 Packages and dependency direction

`app → core`, `app → database`, `database` implements ports declared in `core`. This is enforced by ESLint (`no-restricted-imports` in `eslint.config.mjs`):

- `core` must not import `@tripsalesagent/database`, `@tripsalesagent/app`, `@mikro-orm/*`, `nuxt`, `vue`, `h3`, `nitropack`.
- `database` must not import the app or any framework.
- Client code (`packages/app/app/**`) must not import `@tripsalesagent/database`, `@mikro-orm/*` or `awilix`, and must not call `$fetch`, `fetch`, `useFetch` or `useLazyFetch` directly (only `useApi`/`useApiQuery` do).
- Client code imports from `core` only through **subpath exports that are free of `awilix`** – today `@tripsalesagent/core/shared`. When a concept's schemas are needed by forms, add a subpath export for them (e.g. `"./inquiries/schemas"`) rather than importing the package root.

Allowed dependencies of `core`: `awilix` (for `registerCore`) and `zod`. Anything else needs a spec.

### 2.2 Domain concept folders

There is no `modules/` directory and no module runtime. A concept is a same-named folder repeated in each layer that needs it:

- `packages/core/src/<concept>/` – services, ports (incl. repository interfaces), schemas, state machines, pure domain functions.
- `packages/database/src/entities/<concept>/` – entities (registered in `entities/index.ts`).
- `packages/database/src/repositories/<concept>/` – MikroORM adapters of the concept's repository ports.
- `packages/app/server/api/v1/<concept>/` – route handlers.
- `packages/app/app/components/<concept>/` – components tied to the concept.
- Pages under the zone folders (`pages/agent/…`, `pages/biuro/…`, public pages).

Rules:

- Create a concept folder **only with its first file** – never scaffold empty ones.
- Every service, repository and adapter is registered by an **explicit line** in the package's `register*` function (no `loadModules`, no folder scanning) – every binding stays greppable.
- A concept calls another concept only through its service's public methods, never through its repository or entity internals.

### 2.3 Target layout for the MVP

```
packages/
  core/src/
    shared/            errors, clock, money, ids, validation, actor (exists)
                       mailer.port, file-storage.port, password-hasher.port, token-generator.port, unit-of-work.port (with first use)
    auth/              session + activation + password reset (S-01…S-04)
    agents/            agent accounts and rates (UC-B1)
    offers/            offer catalogue (UC-B2, UC-A2)
    clients/           agent's clients (UC-A3)
    inquiries/         inquiry.service, inquiry-state-machine, quotes, messages, history (UC-A4…A8, B3…B7, K1, S1)
    commissions/       commission lifecycle and payouts (UC-B9, A9 §4)
    reports/           agent report (UC-B8) – read-only queries, no entities
    notifications/     counters and action items (UC-A9 §1, 02 §1.5) – read models
    health.ts, container.ts, index.ts
  database/src/
    entities/<concept>/*.entity.ts
    repositories/<concept>/mikro-orm-*.ts
    config.ts, orm.ts, container.ts
  app/
    shared/types/api.ts                 # wire types shared by server and client (#shared)
    server/
      api/v1/<concept>/...              # mirrors 01 §5
      middleware/csrf.ts
      utils/{container,api-handler,actor,input,versioning}.ts
      tasks/                            # scheduled tasks (quote expiry)
    app/
      layouts/{default,agent,office}.vue
      pages/{logowanie,aktywacja,reset-hasla,w}/…   # public (Tailwind only)
      pages/agent/…                                 # A-01…A-09
      pages/biuro/…                                 # B-01…B-11
      components/ui/                                # shadcn-vue primitives (generated)
      components/app/                               # generic building blocks (<App…>)
      components/<concept>/                         # concept components
      composables/{useApi,useApiQuery,useMutation,useApiForm,useConfirm,useUnsavedChangesGuard}.ts
      utils/{api-error,messages,format,form-schema}.ts
```

### 2.4 Repositories, transactions and the ORM boundary

- Services in `core` depend on repository **interfaces** declared in `core`; `database` implements them with MikroORM and the request-scoped `em`. `core` never sees an `EntityManager`.
- A use case that changes state is atomic. It runs through a `UnitOfWork` port (`transactional(fn)`), implemented in `database` with `em.transactional`. Check-then-act (status check, then write) is never split across two transactions.
- Entities are defined with MikroORM `defineEntity` (no decorators); they are persistence models. Business rules live in `core` functions and services, not in entity hooks.

### 2.5 The inquiry state machine

- `core/src/inquiries/inquiry-state-machine.ts` declares **every** transition of `00` §7 as one table: from, action, actor, to, effect on the active quote, effect on the commission.
- Services call `transition(inquiry, action, actor)`; nothing else assigns `inquiry.status`. An action that is not in the table for the current status throws `RuleConflictError('INVALID_TRANSITION', …)` (409).
- Every transition appends an `InquiryHistoryEntry` in the **same transaction** (rule `00` §8.7).
- The table is unit-tested row by row, including the rejected combinations.

### 2.6 Optimistic locking (`ETag` / `If-Match`)

- Versioned entities (offer, client, inquiry, agent) have a MikroORM `version` property.
- Reads return it as `ETag: "<version>"` – the handler calls `setVersionTag(event, version)` explicitly.
- Mutations of a versioned resource call `requireIfMatch(event)` (missing → **428** `PRECONDITION_REQUIRED`) and pass the version to the service, which throws `VersionConflictError` (409 `VERSION_CONFLICT`) on mismatch.
- Business-rule conflicts use `RuleConflictError` with a domain code (409), so the UI can tell "someone edited this" from "this is no longer allowed" (`02` §1.2).

### 2.7 Time

- `core` never calls `new Date()` or `Date.now()`; it receives `clock: Clock` (`core/src/shared/clock.ts`, registered as a singleton `systemClock`). Tests use `FixedClock`.
- Calendar dates (departure, return, quote validity) are `YYYY-MM-DD` strings in the domain and `date` columns in PostgreSQL. Instants are `timestamptz`, UTC.
- Business days are evaluated in **Europe/Warsaw** (`BUSINESS_TIME_ZONE`): a quote valid until `2026-11-20` is valid through 23:59 Warsaw time that day (`isBusinessDatePast`). "Expires within 3 days" uses `businessDaysUntil`.
- Quote expiry (UC-S1): every read and every mutation of an inquiry evaluates expiry against the clock, and a Nitro scheduled task (hourly) persists `EXPIRED` + history for quotes nobody touched.

### 2.8 Money

- Amounts are **integer grosze** (`Grosze`), commission rates are **integer basis points** (`BasisPoints`, 500 = 5 %). Never floats, never strings with currency.
- All arithmetic goes through `core/src/shared/money.ts`: `multiply` (price × participants), `applyRate` (commission – rounds **half up to 1 grosz, once**), `zlotyToGrosze` (form input), `percentToBasisPoints`, `isValidCommissionRate` (0–30 %, step 0.5 %).
- Quote value, forecast and due commission are computed on the server only (§4).
- The mockup computes money with floats (`mockup/src/store.ts`); that code is a prototype and must not be copied.

### 2.9 External effects through ports

`Mailer` (invitation, password reset – the only e-mails in the MVP), `FileStorage` (offer photos and PDF, message attachments), `PasswordHasher`, `TokenGenerator`, `UnitOfWork`. MVP adapters: a console mailer, local-disk storage. No vendor SDK in `core`. Ports are added with their first use, not ahead of it.

### 2.10 No event bus, no queue

Notifications (menu counters, unread badges, action items) are **read models** computed from history entries and per-user read markers – not side effects of events. Add an in-process event bus only when a second real side effect of the same domain event appears; a queue is out of scope.

### 2.11 Lifetimes

| Registration | Lifetime | Why |
| --- | --- | --- |
| `orm`, `clock`, `mailer`, `fileStorage`, `passwordHasher`, `tokenGenerator` | `SINGLETON` | stateless or process-wide |
| `em`, repositories, services, `unitOfWork` | `SCOPED` | hold the request's `EntityManager` fork |

Resolve from the container only in route handlers, middleware, plugins and tasks (`useScope(event).cradle.…`).

---

## 3. Reusable server layer

Every endpoint is built from the same pieces in `packages/app/server/utils/` (auto-imported in server code). Re-implementing any of them inline is a review blocker.

| Piece | File | Purpose |
| --- | --- | --- |
| `DomainError` & subclasses | `core/src/shared/errors.ts` | `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404, `VersionConflictError` / `RuleConflictError` 409, `GoneError` 410, `ValidationError` 422, `UnavailableError` 503. Services throw only these. |
| `defineApiHandler` | `server/utils/api-handler.ts` | Wraps every `/api/v1` handler; maps domain errors to status + body `{ code, message, fields? }` (in h3 `data`); logs unexpected errors and answers a generic 500 `INTERNAL_ERROR`. **No handler has its own `try/catch`.** |
| `requireActor`, `requireRole` | `server/utils/actor.ts` | Who is calling (`Actor { userId, role, agentId }`); 401 / 403. Fail closed: until the session middleware sets `event.context.actor`, everything protected is 401. |
| `readValidBody`, `getValidQuery`, `getValidParams` | `server/utils/input.ts` | The only way to read input: through a zod schema → 422 `[{ field, code }]`. |
| `setVersionTag`, `requireIfMatch` | `server/utils/versioning.ts` | `ETag` / `If-Match` (§2.6). |
| CSRF middleware | `server/middleware/csrf.ts` | State-changing `/api/v1` requests need the `x-requested-with: tripsalesagent` header (set by `useApi`) and a same-host `Origin`; otherwise 403 `CSRF_REJECTED`. |
| Wire types | `shared/types/api.ts` (`#shared/types/api`) | `ApiErrorBody`, header constants – shared by server and client. Always import via `#shared`, never by relative path (breaks the Nitro build). |

A handler is a few lines – actor, input, service, result:

```ts
// server/api/v1/inquiries/[inquiryId]/take-over.post.ts  (B-02, UC-B3)
export default defineApiHandler(async (event) => {
  const actor = requireRole(event, 'OFFICE')
  const { inquiryId } = getValidParams(event, inquiryParamsSchema)
  const version = requireIfMatch(event)
  const inquiry = await useScope(event).cradle.inquiryService.takeOver(actor, inquiryId, version)
  setVersionTag(event, inquiry.version)
  return inquiry
})
```

Business rules in a handler (status checks, amounts, ownership filters) are a review blocker – they belong in the service. Success responses are plain JSON (no envelope); the HTTP status carries success or failure.

The reference example is `server/api/v1/health.get.ts`.

---

## 4. Reusable client layer

| Piece | File | Use it for |
| --- | --- | --- |
| `useApi()` | `app/composables/useApi.ts` | The **only** caller of `/api/v1`: base URL, CSRF header, `If-Match` from `version`, cookie forwarding during SSR, every failure → `ApiError`. |
| `useApiQuery(key, path, { query })` | `app/composables/useApiQuery.ts` | Every read: `useAsyncData` underneath (SSR, dedupe by key, refetch on path/query change); exposes `data`, `version`, `error: ApiError`, `status`, `refresh`. |
| `useMutation(action, { success, refresh, onSuccess })` | `app/composables/useMutation.ts` | Every state change: ignores repeated clicks while pending, success toast (perfective verb: "Opublikowano"), refreshes the given query keys and the menu counters, 401 → `/logowanie?redirect=…`. |
| `useApiForm(schema, action, options)` | `app/composables/useApiForm.ts` | Every create/edit form: vee-validate with the **same zod schema** as the server (`toFormSchema`), server 422 field errors merged into the form, focus on the first invalid field, `bannerError` for anything else; values are kept on failure. |
| `useConfirm()` | `app/composables/useConfirm.ts` | Every confirmation (one `AppConfirmDialog` in `app.vue`). |
| `useUnsavedChangesGuard(isDirty)` | `app/composables/useUnsavedChangesGuard.ts` | Forms and modals with unsaved changes ("Masz niezapisane zmiany. Odrzucić je?"). |
| `ApiError`, `toApiError` | `app/utils/api-error.ts` | The normalized error; `isVersionConflict`. |
| `apiErrorMessage`, `fieldErrorMessage` | `app/utils/messages.ts` | Polish texts by error code, falling back to HTTP status (`02` §1.2). The server's `message` is for developers, never shown as is. New codes are added here. |
| formatters | `app/utils/format.ts` | Exactly `02` §1.4: `formatMoney` (grosze; `compact`), `formatDate`, `formatDateRange`, `formatDateTime`, `formatRelativeAge`, `formatPhone`, `formatNip`, `formatRate`. Non-breaking spaces inside amounts. |
| `<AppDataTable>` | `components/app/DataTable.vue` | Every list: TanStack column config, loading / error / empty / filtered-empty states, sorting, row click, highlighted (unread) rows, refresh bar. |
| `<AppLoadingSkeleton>` | `components/app/LoadingSkeleton.vue` | Layout-shaped skeleton (`table`, `cards`, `form`), shown after 150 ms. |
| `<AppEmptyState>` | `components/app/EmptyState.vue` | Empty list with its main action; `filtered` → "Wyczyść filtry". |
| `<AppErrorBanner>` | `components/app/ErrorBanner.vue` | Every error: Polish message, code, "Spróbuj ponownie" or – for `VERSION_CONFLICT` – "Wczytaj aktualną wersję". |
| `<AppActionButton>` | `components/app/ActionButton.vue` | Mutation buttons: disabled + progressive label ("Publikowanie…") while pending. |
| `<AppPanelShell>` | `components/app/PanelShell.vue` | Shell of the `agent` and `office` layouts (rail, mobile tab bar). |

Status labels and colors (`01` §4) live in one map per status family (added with the inquiries concept); components never hard-code a status label or color.

---

## 5. Frontend conventions

### 5.1 Zones

| Zone | Routes | Layout | UI |
| --- | --- | --- | --- |
| Public – account | `/logowanie`, `/aktywacja/{token}`, `/reset-hasla[/{token}]` (S-01…S-04) | own card layout, no menu | Tailwind utilities only |
| Public – quote | `/w/{token}` (K-01) | no menu, mobile first | Tailwind utilities only |
| Agent | `/agent/**` (A-01…A-09) | `agent` – rail on desktop, bottom tabs on phone | shadcn-vue |
| Office | `/biuro/**` (B-01…B-11) | `office` – rail, dense, desktop first | shadcn-vue |

Route guards are one global middleware based on `GET /auth/me` (added with the auth concept): role → allowed zone; an agent on an office route is redirected to `A-01`. The demo `/admin` page is removed when the first zone page lands.

### 5.2 Where a new component goes

1. **shadcn primitive** → `components/ui/`, only via `pnpm dlx shadcn-vue@latest add <name>` (run in `packages/app`), never hand-written. After adding, check `package.json`: the CLI may add or downgrade dependencies (it once replaced zod 4 with zod 3).
2. **Generic, concept-agnostic building block** (a field type, a table cell, a state renderer, a page header) → `components/app/` (flat, so Nuxt names it `<App…>`).
3. **Tied to one concept's data** (quote ticket, inquiry status badge, offer card, commission summary) → `components/<concept>/`.
4. **Used by exactly one screen** → `components/<concept>/<screen>/` (e.g. `components/inquiries/agent-card/`); promote it one level up when a second screen needs it. Never put a non-route `.vue` file in `pages/` – Nuxt turns it into a route.

Before writing a component, check `components/app/` and `components/<concept>/` – write a new one only when neither has it.

### 5.3 Theme

The mockup's visual direction ("zeszyt i bilet") is implemented as tokens in `app/assets/css/tailwind.css`: shadcn-vue semantic variables (`--primary` = ink, `--destructive` = margin red, `--ring` = sky, sidebar = ink with marker highlight) and domain colors as Tailwind colors (`bg-marker`, `text-pine`, `bg-margin-red-soft`, …), fonts Bricolage Grotesque (headings), Schibsted Grotesk (text), IBM Plex Mono (`font-mono`: numbers, amounts), and the `bg-paper-grid` utility. Change colors there only; no hex values in components, no custom CSS classes.

### 5.4 Accessibility minimum

Every control has a label; focus is visible; dialogs trap focus (Reka UI); status is never conveyed by color alone (the label text is always present); tables use `aria-sort`; loading states are `role="status"`, errors `role="alert"`.

---

## 6. Engineering principles

When two principles pull in different directions, prefer the one that keeps the change **smaller and more explicit**.

- **SRP – one file, one reason to change.** An entity file maps columns; a service owns one concept's rules; a handler owns HTTP wiring (actor → input → service → result); a component renders. `inquiry.service.ts` decides whether a quote can be issued; `quotes.post.ts` never checks the status itself.
- **DRY – one definition, every call site imports it.** One zod schema per input, used by the handler and the form; one `useApi`; one state-machine table; one money module; one message catalog. About to copy a `try/catch`, a status check or a formatter? Extract or reuse instead.
- **Separation of concerns.** Persistence in `database`, rules in `core`, HTTP and rendering in `app`. `core` never imports Nuxt, Vue or MikroORM (enforced); a page never sees an entity.
- **Dependency inversion.** `core` depends on ports (`InquiryRepository`, `Mailer`, `FileStorage`, `Clock`); adapters are wired by Awilix in the composition root. Swapping the console mailer for SMTP touches one registration.
- **Explicit over implicit.** Hand-written `register*` lines, explicit `setVersionTag`, explicit `requireRole` at the top of every handler.
- **Convention over configuration, narrowly.** The concept-folder convention replaces a module system; it works only if every concept follows it.
- **YAGNI.** No roles inside the office, no multi-person agencies, no e-mail notifications, no payments, no event bus, no pagination before a list needs it – all excluded by `00` §1. Ports and folders appear with their first use.
- **Composition over inheritance.** Small services and pure functions composed together; no base `Service` / `Repository` class with template methods.
- **Fail closed.** Any error or ambiguity in an access check denies (401/403/404), never allows.
- **Idempotency where retries happen.** A public accept/reject clicked twice, a retried mutation, the expiry task running twice: the second call returns the recorded result (UC-K1 W2) and creates no second commission or history entry. Version checks and unique constraints back this, not only application logic.

---

## 7. Security and data – minimum requirements

1. **Passwords:** argon2id (memory ≥ 19 MiB, iterations ≥ 2, parallelism 1) behind `PasswordHasher`; length and rules in the activation/reset schema.
2. **Sessions:** opaque random id (≥ 32 bytes) in an `httpOnly`, `secure` (production), `sameSite=lax` cookie; sessions stored (hashed) in PostgreSQL; rotated on login; deleted on logout, password reset and agent deactivation (UC-B1 PA3), so revocation is immediate; idle and absolute timeouts.
3. **One-time and public tokens** (activation, password reset, public quote): ≥ 32 random bytes, base64url, stored **hashed**, with expiry. Activation and reset are single-use and invalidated when re-issued (UC-B1 PA2). A quote token works only while its quote is `ACTIVE`; otherwise 410 (UC-K1 W1). Token pages send `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`.
4. **CSRF:** `sameSite` cookie + required client header + `Origin` check (`server/middleware/csrf.ts`).
5. **Rate limiting:** login, password-reset request, activation, public quote accept/reject – per IP + identifier, with a cooldown. MVP-grade (in-process); note it as a production limitation.
6. **Generic auth messages:** login and reset never reveal whether an e-mail exists.
7. **Authorization:** role in the handler (`requireRole`), ownership in the service/repository. Agent queries are always filtered by `actor.agentId` (rule `00` §8.6); a record the agent may not see is **404**, not 403. A missing ownership check is a blocker, like a missing auth check.
8. **Mass assignment:** only parsed schema output reaches services. Input schemas never accept `id`, `status`, `agentId`, `version`, computed amounts or commission fields.
9. **Money is server-side:** quote value = `multiply(price, paidParticipants)`, commissions = `applyRate(…)` in `core`. The client sends only true inputs (price per participant, final value) and never a total or a commission.
10. **Concurrency:** state changes run in a transaction with the version check; inquiry numbers come from a DB-side counter (no `max() + 1`).
11. **Injection:** persistence only through MikroORM APIs / parameterized queries; no SQL built from strings.
12. **Uploads:** allow-listed MIME types verified by content, size limits, random storage names, served only through an authorized endpoint.
13. **Personal data (RODO):** client name/phone/e-mail and agent NIP/e-mail are personal data – never in logs, error messages or URLs. Logs carry ids, not payloads.
14. **Secrets and configuration:** environment variables only, validated at startup by one schema, documented in `.env.example`; `.env` is git-ignored.
15. **IDs:** UUID primary keys; human-readable numbers (`ZAP-2026-0142`) for display only.
16. **Dependencies:** `pnpm audit --prod` before release; no dependency for what ~20 lines of local code cover.

---

## 8. Code quality, tests and review

### 8.1 Code quality

- No `any` (ESLint error); narrow `unknown` at runtime. The one allowed exception is library-idiomatic, with an `eslint-disable` comment saying why.
- Self-documenting code; comments explain a non-obvious *why*.
- Early returns instead of nested `if`s; one level of abstraction per function.
- No empty `catch`; handle, rethrow, or log with context.
- Named constants for business values, with the reason: 14-day default quote validity, 3-day expiry warning, 7-day "sent without decision", 60 s counter polling, 150 ms skeleton delay, 5 s toast.
- Positive booleans (`isExpired`, not `isNotValid`); no bare `true`/`false` arguments – use an options object.
- No dead code, commented-out code or `console.log` (ESLint allows only `console.warn`/`console.error`).
- A PR's diff traces entirely to its purpose: no drive-by renames or reformatting.
- Formatting is Prettier's job (`pnpm format`); Markdown is not auto-formatted.

### 8.2 Tests (Vitest)

| Layer | What | Where |
| --- | --- | --- |
| `core` unit | every state-machine row (allowed and rejected), money and commission (incl. `00` §6: 5 % × 23 140 zł = 1 157 zł; 5 % × 24 030 zł = 1 201,50 zł), validators, expiry with `FixedClock` | next to the code |
| `database` integration | against a real PostgreSQL: optimistic locking, inquiry-number counter under concurrency, agent-isolation queries, migrations apply | `packages/database/test/` |
| API | per handler: 401/403/404 (ownership), 422, 409, 428 | `packages/app/server/**` |
| client utilities | formatters against every `02` §1.4 example, error mapping, form adapter | next to the code |
| E2E (later) | path P1 once it exists (Playwright) | – |

A behavior change ships with a test that fails without it; a bug fix ships a regression test.

### 8.3 Quality gate

```bash
pnpm check   # lint + format:check + typecheck + test + build
```

A change is not done until `pnpm check` passes.

### 8.4 Review checklist

**Structure & conventions**

- [ ] Names follow §1 (glossary words, concept folder in every layer, file suffixes).
- [ ] No import breaks the package boundaries (ESLint passes) and no concept reaches into another concept's repository or entities.
- [ ] Handlers use `defineApiHandler`, `requireRole`/`requireActor`, the `read/getValid*` helpers; the client uses `useApi`/`useApiQuery`/`useMutation`/`useApiForm`, `AppDataTable`, the state components – or the PR says why not.
- [ ] Status changes go through the state machine; every transition writes a history entry in the same transaction.
- [ ] Versioned mutations require `If-Match`; reads set `ETag`.
- [ ] Money in grosze/basis points via `money.ts`; time via `Clock`.
- [ ] Each new page/modal carries its screen ID comment.
- [ ] `pnpm check` passes.

**Security fundamentals**

- [ ] Auth enforced **server-side** on every non-public route – a hidden button is not enforcement. *(blocker)*
- [ ] Authorization checks the **specific record** (this agent's client/inquiry/commission); others' records are 404. *(blocker)*
- [ ] Check-then-act on an inquiry/quote/commission runs in a transaction with a version check or unique constraint. *(blocker)*
- [ ] No secret, token, password, session id or personal data in logs, error responses or URLs. *(blocker)*
- [ ] No untrusted input reaches a query, shell or file path unparameterized. *(blocker)*
- [ ] Write endpoints parse an explicit schema; no raw body reaches `em.create()`/`em.assign()`. *(blocker)*
- [ ] Amounts and commissions are computed server-side. *(blocker)*
- [ ] Access-check error handling fails closed. *(blocker)*
- [ ] Cookie flags preserved whenever session code is touched. *(major)*
- [ ] Token endpoints: hashed storage, expiry, single use / `ACTIVE` only, 410 otherwise. *(major)*
- [ ] Rate limiting present on login/reset/activation/public decision endpoints touched by the change. *(major)*
- [ ] A security fix ships with a regression test. *(major)*

**Correctness & tests**

- [ ] Tests from §8.2 for the touched layer exist and fail without the change.
- [ ] Concurrent/idempotent cases (double accept, version conflict) are tested where the flow allows retries.

---

## 9. How to add a domain concept

Example: "add clients" (UC-A3, screens A-07, A-08, M-A1).

1. **Spec:** a spec in `.ai/specs/` referencing the use cases and screen IDs; a run log.
2. **Core** (`packages/core/src/clients/`): `client.schema.ts` (create/update schemas reusing `phoneSchema`, `emailSchema`), `client-repository.port.ts`, `client.service.ts` (receives `actor`, enforces ownership, throws domain errors). Register the service in `registerCore` (`SCOPED`) and extend `CoreCradle`/`CoreRequiredCradle`. If forms need the schemas, add a subpath export (`"./clients/schemas"`). Unit tests.
3. **Database** (`packages/database/src/`): `entities/clients/client.entity.ts` (`defineEntity`, `version`), add it to `entities/index.ts`; `repositories/clients/mikro-orm-client-repository.ts`; register it in `registerDatabase` (`SCOPED`); `pnpm db:migration:create`; integration tests.
4. **API** (`packages/app/server/api/v1/clients/`): one file per endpoint of `01` §5.4 (`index.get.ts`, `index.post.ts`, `[clientId].get.ts`, `[clientId].patch.ts`, `[clientId].delete.ts`), each built as in §3.
5. **UI:** pages under `pages/agent/klienci/` with `definePageMeta({ layout: 'agent' })` and the screen ID comment; data via `useApiQuery`, lists via `AppDataTable`, forms via `useApiForm` with the shared schema, mutations via `useMutation`; concept components in `components/clients/`; new error codes in `utils/messages.ts`.
6. **Never** create `modules/<concept>/`, per-concept setup/ACL files or auto-discovery.
7. **Done:** `pnpm check` green; run log finalized; lessons written; spec moved to `implemented/`.

The first concepts should be **auth + clients** – the reference vertical slice every later concept copies.
