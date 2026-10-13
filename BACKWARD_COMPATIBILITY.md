# Backward compatibility

The surfaces below are contracts: something outside the changed code depends on them – the browser client of an already-open tab, a link in a client's inbox, a deployed database, an operator's `.env`. Review skills check every PR against this file, and implementation skills warn when a change breaks one of them.

The product is pre-release (MVP, no production data yet). Until the first production deploy, the "required path" for HTTP and DB surfaces may be shortened to "update every consumer in the same PR and say so in the PR body"; the rest of this file applies in full from the first deploy on.

## Protected surfaces

### 1. HTTP API `/api/v1`

Routes under `packages/app/server/api/v1/**` (catalog: `01` §5 in `.ai/mockups/2026-10-13-agency-sales-portal-mvp/`), today `GET /api/v1/health`.

- **Breaking:** removing or renaming a route or method; removing a response field or changing its type/meaning; making an optional request field required; tightening validation on existing input; changing a status code for an existing outcome.
- **Not breaking:** new routes, new optional request fields, new response fields.
- **Required path:** a new route or field alongside the old one, the client (`useApi` callers) migrated in the same PR, the old one removed in a later PR. A truly incompatible redesign goes to `/api/v2` with a spec.

### 2. Error contract

`ApiErrorBody { code, message, fields? }` in `packages/app/shared/types/api.ts`, the `DomainError` → status mapping in `server/utils/api-handler.ts`, and every error `code` (`VERSION_CONFLICT`, `PRECONDITION_REQUIRED`, `CSRF_REJECTED`, `DATABASE_UNAVAILABLE`, `<RESOURCE>_NOT_FOUND`, `VALIDATION_FAILED`, …). The UI branches on `code`.

- **Breaking:** renaming or removing a code, changing its status, changing the shape of `fields`.
- **Required path:** add the new code, update every client branch in the same PR, keep the old code until no caller emits or handles it.

### 3. Optimistic locking and CSRF headers

`ETag` on reads / `If-Match` on mutations of versioned resources (428 when missing, 409 `VERSION_CONFLICT` on mismatch); the `x-requested-with: tripsalesagent` header and same-host `Origin` required by `server/middleware/csrf.ts`.

- **Breaking:** dropping `ETag` from a versioned read, dropping the `If-Match` requirement, changing the header name/value.
- **Required path:** a spec; the server accepts both old and new headers for one release.

### 4. Public URLs

Polish routes from `01` §2: `/logowanie`, links sent by e-mail (invitation, password reset) and the public quote page `/w/{token}`. Links in clients' inboxes outlive deploys.

- **Breaking:** renaming a path, changing the token format so existing tokens stop resolving, changing a link's meaning.
- **Required path:** keep a redirect from the old path; existing tokens resolve until they expire by their own rules.

### 5. Database schema and migrations

MikroORM entities in `packages/database/src/entities/**` and migrations in `packages/database/migrations/`.

- **Breaking:** editing an applied migration; dropping or renaming a column/table; changing a column type or nullability in place; changing money columns away from integer grosze or rates away from basis points.
- **Required path:** a new migration only; expand → migrate data → contract across separate PRs for renames/drops; a down migration and a migration integration test; rollback plan in the PR body (`risk-high`).

### 6. Configuration

Environment variables documented in `.env.example` (`DATABASE_URL`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`, `DATABASE_DEBUG`) and the repo's npm scripts used by CI (`.github/workflows/ci.yml`).

- **Breaking:** renaming/removing a variable or script, changing a default's meaning.
- **Required path:** read the old name as a fallback for one release, update `.env.example`, CI and `AGENTS.md` in the same PR.

### 7. Domain invariants

Inquiry state machine (`core/src/inquiries/`), money rounding (`applyRate` rounds half up once), quote expiry in Europe/Warsaw business days. Changing them changes amounts and statuses users have already seen.

- **Required path:** a spec that states the change and how existing records are treated.

## Not protected

- Internal package APIs (`@tripsalesagent/core`, `@tripsalesagent/database`): consumed as sources inside this monorepo only; change them freely as long as every caller is updated in the same PR and the package boundaries in `AGENTS.md` hold.
- Vue component props/events, composables, and `pages/admin/` (demo, removed when the first zone page lands).
- Test helpers and `.ai/` files.
