# AGENTS.md

Instructions for AI coding agents working in this repository. These rules are mandatory.

This project uses **Spec-Driven Development (SDD)**: work starts from a spec, every autonomous run is logged, and what we learn is written down. All of that lives in the `.ai/` folder.

## Project: TripSalesAgent – technical assumptions

**TripSalesAgent** is a web application built as a TypeScript monorepo: an agency sales portal for school trips (product: `.ai/mockups/2026-10-13-agency-sales-portal-mvp/`). These assumptions are binding; do not swap a technology or bypass a convention without a spec that says so (see `README.md` for the architecture narrative and **`docs/engineering-standards.md`** for the full coding standards and their rationale).

### Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Nuxt** (latest major, currently 4.x) + **Vue 3** + **TypeScript** | Strict TS. Use Composition API and `<script setup lang="ts">`. |
| Database | **PostgreSQL** | Local dev DB via `docker-compose.yml` (`pnpm db:up`). |
| ORM | **MikroORM** (v7, `@mikro-orm/postgresql`) | Migrations (`@mikro-orm/migrations`) and connection pooling are mandatory; schema changes **only** via migrations. |
| DI container | **Awilix** | See "Dependency injection" below. |
| Public pages CSS | **Tailwind CSS** (v4, `@tailwindcss/vite`) | Utility classes in templates; no custom CSS frameworks. |
| Panel pages UI (agent and office zones) | **shadcn-vue** (`shadcn-nuxt`, Reka UI) on top of Tailwind | Components live in `packages/app/app/components/ui` and are added with `pnpm dlx shadcn-vue@latest add <component>` (run in `packages/app`); check `package.json` afterwards – the CLI may add or downgrade dependencies. |
| Validation | **zod 4** | Schemas live in `core` and are shared by Nitro handlers and forms (vee-validate via `toFormSchema`). |
| Quality tooling | **ESLint** (`@nuxt/eslint-config`, flat), **Prettier**, **Vitest** (+ `@vitest/coverage-v8`) | ESLint enforces package boundaries; Markdown is not auto-formatted. |
| Unit testing | **Vitest** + **`@nuxt/test-utils`** (`@vue/test-utils`, happy-dom) | **100 % coverage gate** – see "Testing" below. |
| Integration testing | **Testcontainers** (`@testcontainers/postgresql`) + **agent-browser** | Ephemeral PostgreSQL + the production build driven in a headless browser. |
| CI | **GitHub Actions** (`.github/workflows/ci.yml`) | Every PR: lint, typecheck, unit tests with coverage gate, build, integration tests. |
| Package manager | **pnpm** workspaces | Never use npm/yarn; never commit another lockfile. |
| Runtime | Node.js >= 22 | |

### Monorepo layout

All sub-packages live in `packages/` and are named `@tripsalesagent/<name>`. Internal packages are consumed as **TypeScript sources** (`exports` -> `./src/index.ts`, no build step); the app transpiles/inlines them (see `packages/app/nuxt.config.ts`).

| Package | Role | May depend on |
| --- | --- | --- |
| `packages/app` | **Integration package** – the Nuxt app (public pages, agent and office panel pages, Nitro API). Owns the **composition root** (`server/utils/container.ts`) where all packages are wired together. | `core`, `database` |
| `packages/core` | Framework-free domain/business logic: services and the **ports** (interfaces) they need. | `awilix` (for `register*`), `zod` |
| `packages/database` | MikroORM config, entities, migrations, pooling, `registerDatabase()`; implements ports from `core`. | `@mikro-orm/*`, `awilix` |

Rules:
- Dependency direction is `app -> core`, `app -> database`. `core` must **not** import `database` or `app`; it depends on ports, and `database` provides the adapters.
- New package? Create `packages/<name>` with `@tripsalesagent/<name>`, a `typecheck` script and a `register<Name>(container)` function if it contributes services; wire it in the composition root only.
- Domain logic never lives in Vue components or Nitro route handlers: handlers resolve a service from the request scope and delegate.
- Client code imports `core` only through awilix-free subpath exports (today `@tripsalesagent/core/shared`), never the package root.
- These boundaries are enforced by `no-restricted-imports` in `eslint.config.mjs`; do not loosen them.

### Domain concept convention

Domain code is not organized into `modules/`. Each concept (`auth`, `agents`, `offers`, `clients`, `inquiries`, `commissions`, `reports`, `notifications`) is a same-named, plural, kebab-case folder repeated in the layers that need it:

- `packages/core/src/<concept>/` – services, ports (incl. `<Entity>Repository`), zod schemas, state machines
- `packages/database/src/entities/<concept>/<name>.entity.ts` (`defineEntity`) and `packages/database/src/repositories/<concept>/`
- `packages/app/server/api/v1/<concept>/…/<name>.<method>.ts` (paths as in the API catalog, `01` §5)
- `packages/app/app/components/<concept>/` and pages under the zone folders

Create a concept folder only with its first file. Register every service/repository with an explicit line in `register*` (no auto-discovery). Identifiers are English, UI text Polish – use the glossary in `docs/engineering-standards.md` §1.1 (inquiry, quote, offer, client, commission, …). Put the screen ID from `01` (e.g. `<!-- A-06 … -->`) at the top of every page/modal.

### Reusable server & client layer

Never re-implement these inline:

- **Server** (`packages/app/server/utils/`, auto-imported): every `/api/v1` handler is wrapped in `defineApiHandler` (maps `DomainError`s from `core/src/shared/errors.ts` to status + `{ code, message, fields? }`; no `try/catch` in handlers); `requireActor`/`requireRole`; input only via `readValidBody`/`getValidQuery`/`getValidParams` (zod → 422); `setVersionTag`/`requireIfMatch` for versioned resources; CSRF middleware in `server/middleware/csrf.ts`. Wire types in `shared/types/api.ts` – import as `#shared/types/api`, never by relative path.
- **Client** (`packages/app/app/`): `useApi` is the only caller of `/api/v1` (ESLint forbids `$fetch`/`fetch`/`useFetch` elsewhere); `useApiQuery` for reads, `useMutation` for writes, `useApiForm` for forms (same zod schema as the server), `useConfirm`, `useUnsavedChangesGuard`; Polish texts in `utils/messages.ts`; formats only via `utils/format.ts`; lists via `<AppDataTable>`; states via `<AppLoadingSkeleton>`, `<AppEmptyState>`, `<AppErrorBanner>`; mutation buttons via `<AppActionButton>`.

### Component placement

1. shadcn primitive → `components/ui/` (CLI only, never hand-written).
2. Generic, concept-agnostic building block → `components/app/` (flat; Nuxt names it `<App…>`).
3. Tied to one concept's data → `components/<concept>/`.
4. Used by one screen only → `components/<concept>/<screen>/`; promote when a second screen needs it. Never put non-route `.vue` files in `pages/`.

### Money, time and state

- Money is integer **grosze**, commission rates integer **basis points** (500 = 5 %); all arithmetic via `core/src/shared/money.ts` (`applyRate` rounds half up once). Amounts and commissions are computed server-side only.
- No `new Date()`/`Date.now()` in `core` – inject `clock` (`FixedClock` in tests). Calendar dates are `YYYY-MM-DD` / `date`; business days are Europe/Warsaw.
- Inquiry status changes only through the state-machine table in `core/src/inquiries/`; every transition writes a history entry in the same transaction.
- Versioned resources: reads send `ETag`, mutations require `If-Match` (missing → 428, mismatch → 409 `VERSION_CONFLICT`).
- An agent only ever sees its own clients/inquiries/commissions; someone else's record is 404.

### Dependency injection (Awilix)

- One root container (`useRootContainer()`), created lazily in `packages/app/server/utils/container.ts`, `InjectionMode.PROXY`, `strict: true`. Dependencies are received as one destructured object: `constructor({ healthProbe }: Deps)`.
- Packages expose `register*(container)` and a `*Cradle` interface; the app's `Cradle` type is the intersection of them. Packages never import the container from the app.
- **Lifetimes:** infrastructure (ORM, config) = `SINGLETON`; anything holding per-request state (EntityManager fork, services using it) = `SCOPED`. Avoid `TRANSIENT` unless stateless and cheap.
- **One scope per request:** in Nitro handlers get it with `useScope(event)` (created lazily, disposed on response close). Never share a scoped `EntityManager` across requests; never call `orm.em` directly in request code – use the scoped `em` (a `fork()`).
- Resolve from the container only at the edges (route handlers, plugins). Do not use the container as a service locator inside services.

### Database conventions

- Config comes from environment variables (`DATABASE_URL`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`, `DATABASE_DEBUG`); document new variables in `.env.example`. Never commit `.env`.
- Entities live in `packages/database/src/entities` and must be added to the registry in `entities/index.ts`.
- Migrations: `pnpm db:migration:create` (add `--blank` for hand-written SQL), `pnpm db:migration:up|down|pending`. Commit generated migrations; never edit an applied migration – add a new one.

### Frontend conventions

- Public pages (account `/logowanie`…, public quote `/w/{token}`): Tailwind utilities only, no panel menu.
- Panel pages use the Polish routes from `01` §2: agent zone `pages/agent/**` with `definePageMeta({ layout: 'agent' })`, office zone `pages/biuro/**` with `definePageMeta({ layout: 'office' })`, built from shadcn-vue components. The demo `pages/admin/` (layout `admin`) is removed when the first zone page lands.
- Colors, fonts and radii come from the theme tokens in `app/assets/css/tailwind.css` (mockup direction "zeszyt i bilet"); no hex values or custom CSS classes in components.
- Do not hand-edit generated shadcn-vue components unless customizing deliberately; prefer composing them.

### Testing (mandatory)

- **Every new feature or behavior change ships with unit tests that keep coverage at 100 %** – statements, branches, functions and lines, for every hand-written source file in `core`, `database` and `app` (`app/`, `server/`, `shared/`, including `.vue` files). `pnpm test:coverage` enforces the thresholds in `vitest.config.ts` and fails the build otherwise. Only generated shadcn-vue primitives (`components/ui/**`), type declarations and tests are excluded.
- Do **not** lower the thresholds, widen the coverage `exclude` list or add `/* v8 ignore */` comments to get green. A branch you cannot reach from a test is dead code – remove or simplify it (e.g. let a library helper own the branch). A coverage exception needs a spec that says why.
- Tests assert behavior (inputs → outputs, rendered text, emitted events, HTTP status/body), not implementation details; a test must fail without the change it covers. Bug fixes ship a regression test.
- **Where tests go:** `<file>.test.ts` next to the code runs in plain Node (core, database, server utilities, pure client utilities); `<file>.nuxt.test.ts` next to components, composables, layouts and pages runs inside the Nuxt runtime (`mountSuspended`, `mockNuxtImport`, `registerEndpoint` from `@nuxt/test-utils/runtime`; `withSetup` in `packages/app/test/helpers/harness.ts` for composables). Shared test helpers live in `packages/<pkg>/test/`, never in auto-imported folders.
- **Unit tests never need Docker, a database or a browser.** Anything that does is an integration test.
- **Integration tests** (`pnpm test:integration`, config `vitest.integration.config.ts`): `packages/database/test/**` runs against an ephemeral PostgreSQL (Testcontainers, `postgres:17-alpine`); `packages/app/test/e2e/**` starts the **production build** against that database and drives it with **agent-browser** through the `Browser` wrapper (`packages/app/test/e2e/support/browser.ts`, one isolated session per file via `useBrowser()`). Every new page or user-visible flow gets an e2e test; every new repository/migration gets a database integration test. Without Docker, set `TEST_DATABASE_URL` to a disposable database.
- **CI** (`.github/workflows/ci.yml`) runs on every pull request: Lint (+ format), Typecheck, Unit tests (coverage gate), Build, Integration tests. A PR is mergeable only when all jobs are green; never skip or disable a job to merge.

### Commands

```bash
npm run setup               # first-time / re-runnable local setup (scripts/setup.mjs; not `pnpm setup`)
pnpm install                # install (runs `nuxt prepare`)
pnpm dev                    # Nuxt dev server (reads the repo-root .env)
pnpm build                  # production build
pnpm typecheck              # tsc for scripts/ and packages + nuxt typecheck (vue-tsc) for the app
pnpm lint / lint:fix        # ESLint (incl. package boundaries)
pnpm format / format:check  # Prettier
pnpm test / test:watch      # Vitest unit tests (projects: core, database, app, app-nuxt)
pnpm test:coverage          # unit tests + 100 % coverage gate (report in coverage/)
pnpm test:integration       # build + integration tests (Docker: Testcontainers; browser: agent-browser)
pnpm test:integration:run   # integration tests against the existing build
pnpm check                  # lint + format:check + typecheck + test:coverage + build
pnpm db:up / db:down        # local PostgreSQL via docker compose
pnpm db:migration:create | up | down | pending
```

A change is not done until `pnpm check` passes (and `pnpm test:integration` when it touches pages, API handlers or the database) – CI runs both.

### Known constraints

- **TypeScript is 6.x via an alias**: the root `package.json` has `"typescript": "npm:@typescript/typescript6@^6"`, because `vue-tsc` (used by `nuxt typecheck`) does not work with TypeScript 7 yet. That package ships the binary as `tsc6` (not `tsc`), so package scripts use `tsc6 --noEmit`. Do not move to TypeScript 7 until `vue-tsc` supports it and `pnpm typecheck` passes.
- The MikroORM CLI needs an explicit TypeScript loader; the scripts set `MIKRO_ORM_CLI_TS_LOADER=tsx`.
- The ORM is created synchronously and connects lazily, so the app boots without a database and `/api/v1/health` answers 503 `{ code: 'DATABASE_UNAVAILABLE' }`.
- The `app-nuxt` Vitest project must be rooted at `packages/app` (`root` in `vitest.config.ts`), otherwise Vite cannot resolve Nuxt's runtime entry.
- agent-browser runs the system Chrome when present; otherwise run `pnpm exec agent-browser install` once (CI does `--with-deps`).

## The `.ai/` structure

```
.ai/
├── specs/                      # Specifications (SDD) – work to be done
│   ├── YYYY-MM-DD-slug.md      #   active / pending specs live in the root of specs/
│   ├── implemented/            #   specs that have been fully implemented
│   │   └── YYYY-MM-DD-slug.md
│   └── archive/                #   abandoned, superseded or obsolete specs
│       └── YYYY-MM-DD-slug.md
├── runs/                       # Logs of autonomous AI runs
│   └── YYYY-MM-DD-slug.md
├── lessons.md                  # Index + distilled long-term memory for LLMs
├── lessons/                    # Detailed lesson entries
│   └── YYYY-MM-DD-slug.md
└── skills/<om-skill>/SKILL.md  # Repo-local extensions of the vendored om-* skills (not dated)
```

### Naming convention (applies to every file in `specs/`, `runs/`, `lessons/`)

`YYYY-MM-DD-slug.md`

- `YYYY-MM-DD` – the date the file was **created** (not edited). Use the current date; never guess it.
- `slug` – short, lowercase, `kebab-case`, ASCII only, describing the topic (e.g. `2026-10-13-add-user-auth.md`).
- If two files would share the same date and slug, make the slug more specific; never overwrite an existing file by accident.
- Files keep their name for life. Moving a spec between folders does **not** rename it.

### `specs/` – specifications

- A spec describes **what** and **why** (goal, scope, requirements, acceptance criteria), and where useful the **how**.
- New specs go in the root of `.ai/specs/`. Presence there means "not yet implemented".
- When a spec is fully implemented and verified, move it (`git mv`) to `.ai/specs/implemented/`.
- When a spec is abandoned, superseded or obsolete, move it to `.ai/specs/archive/` and add a line at the top saying why (and the superseding spec, if any).
- Do not edit the requirements of an implemented/archived spec. If requirements change, write a new spec that references the old one.
- Suggested spec layout:

  ```markdown
  # <Title>

  - **Status:** draft | ready | in-progress | implemented | archived
  - **Created:** YYYY-MM-DD
  - **Related:** <links to other specs / runs / lessons>

  ## Goal
  ## Context
  ## Requirements
  ## Acceptance criteria
  ## Out of scope
  ## Open questions
  ```

### `runs/` – autonomous run logs

- **Every autonomous AI run** (a task you carry out with significant independence: multi-step implementation, refactor, investigation, spec execution) **must** produce exactly one log file in `.ai/runs/`.
- Create the file at the **start** of the run and keep it updated as you go; finalize it at the end. Don't reconstruct it from memory afterwards.
- Do not edit logs of past runs (other than finalizing your own). Corrections go in a new run or a lesson.
- Exception: the `om-*` agent pipeline (`.ai/agentic.config.json`, process in `SDLC.md`) also writes run **folders** `.ai/runs/YYYY-MM-DD-slug/` (`PLAN.md`, `HANDOFF.md`, …). They follow the same naming rule and count as the run's log; don't add a second `.md` log for the same run.
- Suggested run layout:

  ```markdown
  # <Run title>

  - **Date:** YYYY-MM-DD
  - **Agent/model:** <tool and model name>
  - **Spec:** <path to the spec, or "none">
  - **Status:** in-progress | completed | partial | failed | aborted

  ## Goal
  ## Plan
  ## Log
  <chronological notes: what was done, decisions made and why, commands run, problems hit>
  ## Result
  <what changed, files touched, how it was verified, what is left>
  ## Lessons
  <links to any files added to .ai/lessons/, or "none">
  ```

### `lessons.md` + `lessons/` – long-term memory

- `lessons.md` is the **entry point**: a short, curated, scannable list of the most important lessons, plus an index of every file in `lessons/`.
- `lessons/YYYY-MM-DD-slug.md` holds the detail of a single lesson (context, root cause, fix, how to avoid it).
- **Write a lesson when** you: fix a bug (root cause and prevention), discover a non-obvious fact about the codebase, tools or environment, find a better way of doing something, get corrected by the user, or want something to be remembered across sessions.
- **Add to the index** in `lessons.md` whenever you create a file in `lessons/` – one line: `- [Title](lessons/YYYY-MM-DD-slug.md) – one-sentence takeaway`.
- Keep lessons factual, specific and actionable. Don't record things already obvious from the code or git history. Update or delete a lesson that turns out to be wrong instead of adding a contradicting one.
- Suggested lesson layout:

  ```markdown
  # <Lesson title>

  - **Date:** YYYY-MM-DD
  - **Source:** <run / spec / bug / user feedback>

  ## What happened
  ## Root cause / insight
  ## What to do (or avoid) next time
  ```

## Required workflow

1. **Before starting**: read `.ai/lessons.md` and open any lesson relevant to the task. Look in `.ai/specs/` for a spec covering the task; if the task is non-trivial and has no spec, propose or write one (ask the user when scope is unclear) rather than improvising.
2. **At the start of an autonomous run**: create `.ai/runs/YYYY-MM-DD-slug.md` and link the spec.
3. **While working**: implement against the spec's acceptance criteria; log notable decisions and problems in the run file.
4. **After a bug fix or a surprising finding**: add a lesson in `.ai/lessons/` and update the index in `.ai/lessons.md`.
5. **When done**: finalize the run log (status, result, verification). If a spec was fully implemented, move it to `.ai/specs/implemented/`.

## Working principles

Distilled from [Boris Cherny's Claude Code tips](https://gitlab.novelvista.com/agentic-workflow-repos/ykdojo-claude-code-tips/-/blob/4f3b725558bd7f93f081b98daae289b63afbc4e1/content/boris-claude-code-tips.md) and adapted to this repo:

1. **Plan before you build; re-plan when it goes wrong.** For any non-trivial task, start with a plan (the spec) and refine it until implementation can be done in one pass. If the work goes sideways, stop and re-plan rather than pushing through.
2. **Every correction becomes a rule.** When the user corrects you or you hit a mistake, record it immediately in `.ai/lessons/` (or in this file if it is a general rule) so it is not repeated. The goal is a measurably falling mistake rate.
3. **Challenge your own work before handing it over.** Before opening a PR, review the change critically as a staff engineer would: be ready to justify every change. If a fix is mediocre, discard it and implement the elegant solution.
4. **Own the problem end to end.** Given a bug report, failing CI or a pasted thread, investigate and fix it autonomously without needing step-by-step instructions; ask only when genuinely blocked.
5. **Automate repetition and keep context clean.** Anything done more than once a day becomes a committed skill or command; delegate side investigations to subagents so the main context stays focused.
6. **Report incidental bugs; don't fix them in passing.** A defect noticed outside the scope of the current change (while implementing, reviewing, QA-ing or stabilizing CI) is not fixed in this PR. File it via `om-prepare-issue` (dedupe, SDLC labels; plain `gh issue create` only if the skill is unavailable) with location, observed vs. expected behavior and evidence, then link the issue in the PR summary comment and the run log. If it makes the validation gate fail on this branch (e.g. it is broken on the base branch too), still file it and report it as the blocker in the PR summary comment rather than widening the PR – only humans set the `blocked` label (`SDLC.md`). This applies to every `om-*` skill, including those that only "document" out-of-scope findings in a comment.

## Rules

- Never create files in `.ai/` that don't follow the structure and naming convention above.
- Never delete specs, runs or lessons; move specs to `archive/` instead. Lessons may only be deleted if factually wrong.
- Use real dates (`date +%F`), not placeholders or guessed dates.
- Write `.ai/` files in English, in Markdown.
- Keep `.ai/` changes in the same commit/PR as the work they describe.
- If this document and the user's explicit instruction conflict, follow the user and note it in the run log.
