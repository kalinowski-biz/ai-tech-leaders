# Code review rules

How changes to TripSalesAgent are reviewed – by humans and by `om-code-review` / `om-auto-review-pr`, which apply this file automatically. It complements, and does not repeat, the checklist in [`docs/engineering-standards.md` §8.4](docs/engineering-standards.md#84-review-checklist); that checklist is the source of truth for item-level checks and their severities. Binding conventions live in `AGENTS.md`.

## Review priorities

Read the diff in this order and stop treating anything as a nit until the earlier levels are clean:

1. **Correctness** – the change does what the spec (`.ai/specs/`) or issue asks; edge cases from the mockup spec (`.ai/mockups/2026-10-13-agency-sales-portal-mvp/02-specyfikacja-ekranow.md`) are handled.
2. **Security and data scoping** – auth enforced server-side, an agent sees only its own records (someone else's record is 404), no raw body into `em.create()`/`em.assign()`, no secrets or personal data in logs/errors/URLs.
3. **Contracts** – nothing in [`BACKWARD_COMPATIBILITY.md`](BACKWARD_COMPATIBILITY.md) changes without the path it prescribes.
4. **Architecture and conventions** – package boundaries, reusable layers, naming.
5. **Tests** – behavior-level, 100 % coverage kept honestly, e2e for new pages/flows.

## Repo-specific checks

**Packages and DI**
- `core` imports neither `database` nor `app`; client code imports `core` only via `@tripsalesagent/core/shared`. ESLint `no-restricted-imports` rules are never loosened.
- New services/repositories are registered explicitly in a `register*` function with the right lifetime (`SINGLETON` for infrastructure, `SCOPED` for anything holding the request `EntityManager`); no container used as a service locator inside services; no `orm.em` in request code.

**Server (`packages/app/server`)**
- Every `/api/v1` handler is wrapped in `defineApiHandler`, has no `try/catch`, resolves a service via `useScope(event)` and delegates – no domain logic in handlers.
- Input only through `readValidBody` / `getValidQuery` / `getValidParams` with a zod schema from `core`.
- Services throw only `DomainError` subclasses from `core/src/shared/errors.ts`; new error `code`s are stable, upper-snake-case identifiers.
- Versioned resources: reads call `setVersionTag`, mutations `requireIfMatch`.
- Wire types imported as `#shared/types/api`, never by relative path (breaks `pnpm build`).

**Domain (`packages/core`)**
- Money in integer grosze / basis points via `shared/money.ts` only; no floats.
- No `new Date()` / `Date.now()` – the injected `clock` (`FixedClock` in tests); business days in Europe/Warsaw.
- Inquiry status changes only via the state-machine table, each with a history entry in the same transaction.

**Database (`packages/database`)**
- Schema changes only via a new migration; applied migrations are never edited. Entities are added to `entities/index.ts`.
- Every new repository or migration has a database integration test (`packages/database/test/**`).
- New environment variables are documented in `.env.example`.

**Client (`packages/app/app`)**
- `/api/v1` is called only through `useApi` (`useApiQuery`, `useMutation`, `useApiForm`); lists via `<AppDataTable>`, states via `<AppLoadingSkeleton>` / `<AppEmptyState>` / `<AppErrorBanner>`, mutation buttons via `<AppActionButton>`.
- Polish UI text in `utils/messages.ts`, formatting via `utils/format.ts`, colors from theme tokens (no hex values or custom CSS classes).
- Components placed per the placement rules in `AGENTS.md`; shadcn primitives in `components/ui/` added by CLI only – after a CLI add, check `git diff packages/app/package.json` for silent dependency changes.
- Every page/modal starts with its screen-ID comment (e.g. `<!-- A-06 … -->`).

**Tests**
- Unit tests next to the code (`*.test.ts` in Node, `*.nuxt.test.ts` in the Nuxt runtime); no Docker, DB or browser in unit tests.
- No lowered thresholds, widened coverage `exclude`, or `/* v8 ignore */` – an unreachable branch is removed instead.
- New page or user-visible flow → agent-browser e2e test in `packages/app/test/e2e/`. Bug fix → regression test that fails without the fix.

**Process**
- Non-trivial work references a spec; the PR carries its `.ai/runs/` log and any new `.ai/lessons/` entries (indexed in `.ai/lessons.md`).

## Validation gate

`pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm build` (configured in `.ai/agentic.config.json`), plus `pnpm test:integration` in CI. A red gate is a blocker finding reported together with the rest of the review.

## Severity guidance

| Severity | Use for | Effect |
| --- | --- | --- |
| **blocker** | Security/data-scoping holes, wrong money or status logic, broken contract without the required path, failing gate, coverage loss, missing tests for the change | `changes-requested` |
| **major** | Convention violations listed above (reusable layer bypassed, wrong DI lifetime, missing e2e for a new page), missing regression test, items marked *(major)* in §8.4 | `changes-requested` unless the PR explains why |
| **minor** | Naming, readability, small duplication, non-glossary identifiers | Approve; fix now or file a follow-up |
| **nit** | Style that Prettier/ESLint do not cover | Approve; optional |

`risk-high` areas (auth/sessions, data scoping, money, migrations, contract surfaces) need the evidence listed in `SDLC.md` ("Label state machine") before approval.
