# TripSalesAgent

A web application for travel sales, built as a TypeScript monorepo on **Nuxt + Vue**, **PostgreSQL + MikroORM**, **Awilix** dependency injection, **Tailwind CSS** (public pages) and **shadcn-vue** (agent and office panel pages). Coding standards: [`docs/engineering-standards.md`](docs/engineering-standards.md).

> AI coding agents: read [`AGENTS.md`](AGENTS.md) first – it holds the binding technical assumptions and the spec-driven workflow (`.ai/`).

## Quick start

Requirements: Node.js >= 22, pnpm 11 (`corepack enable`), Docker (or any PostgreSQL).

```bash
pnpm install
cp .env.example .env          # adjust DATABASE_URL if you don't use docker-compose
pnpm db:up                    # start local PostgreSQL
pnpm db:migration:up          # apply migrations
pnpm dev                      # http://localhost:3000  (admin demo: /admin, health: /api/v1/health)
```

| Script | What it does |
| --- | --- |
| `pnpm dev` / `build` / `preview` | Run, build and preview the Nuxt app (`packages/app`). |
| `pnpm typecheck` | `tsc6` for `core` and `database`, `nuxt typecheck` for the app. |
| `pnpm db:up` / `db:down` | Start / stop the local PostgreSQL container. |
| `pnpm db:migration:create` | Generate a migration from entity changes (`--blank` for an empty one). |
| `pnpm db:migration:up` / `down` / `pending` | Apply, revert or list migrations. |

Configuration is read from environment variables (see [`.env.example`](.env.example)): `DATABASE_URL`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`, `DATABASE_DEBUG`.

## Architecture

### Monorepo

```
.
├── packages/
│   ├── app/        @tripsalesagent/app       Nuxt app – the integration package
│   ├── core/       @tripsalesagent/core      domain / business logic (framework-free)
│   └── database/   @tripsalesagent/database  MikroORM, entities, migrations, pooling
├── .ai/            specs, run logs and lessons for AI agents (spec-driven development)
├── docker-compose.yml   local PostgreSQL
└── pnpm-workspace.yaml
```

Internal packages are plain TypeScript **sources** (`exports: ./src/index.ts`), with no per-package build. The app transpiles / inlines them (`build.transpile` and `nitro.externals.inline` in `packages/app/nuxt.config.ts`), so a change in `core` is picked up by `pnpm dev` immediately.

### Layering and dependency direction

```
            ┌──────────────────────────────────────────────┐
            │ packages/app  (integration / composition root)│
            │  Vue pages + Nitro API + Awilix wiring        │
            └───────────────┬───────────────┬───────────────┘
                            │               │
                            ▼               ▼
                 packages/core        packages/database
              services + ports  ◄──── adapters (implements ports)
                                      MikroORM · PostgreSQL
```

- **`core`** holds the business logic and declares the *ports* it needs (e.g. `HealthProbe`). It knows nothing about Nuxt, HTTP or the ORM.
- **`database`** owns persistence: ORM configuration, entities, migrations, pool settings. It provides *adapters* that satisfy `core`'s ports (e.g. `healthProbe` backed by `select 1`).
- **`app`** is the only package that sees both. It assembles them in the composition root and exposes the result over HTTP and as Vue pages. Route handlers stay thin: resolve a service, call it, return the result.

### Dependency injection

[Awilix](https://github.com/jeffijoe/awilix) with `InjectionMode.PROXY` and `strict: true`:

```
root container (server/utils/container.ts)
 ├─ registerDatabase()  → orm (SINGLETON, closed on shutdown)
 │                        em  (SCOPED, orm.em.fork())
 │                        healthProbe (SCOPED)
 └─ registerCore()      → healthService (SCOPED)

per request: useScope(event) → rootContainer.createScope()
             (created lazily, disposed when the response closes)
```

- Each package exposes `register*(container)` and a `*Cradle` type; the app's `Cradle` is the intersection. Packages never import the container.
- **SINGLETON** for infrastructure, **SCOPED** for anything that holds per-request state. Every request gets its own `EntityManager` fork, so identity maps are never shared between requests.
- Services take their dependencies as one destructured object, which keeps them testable without the container: `new HealthService({ healthProbe: fake })`.
- Nitro's `close` hook disposes the root container, which closes the ORM and its pool.

Example – a request through the stack (`GET /api/v1/health`):

```
server/api/v1/health.get.ts → defineApiHandler → useScope(event).cradle.healthService
  → HealthService.check()  →  healthProbe.ping()  →  em.getConnection().execute('select 1')
```

### Database

- **PostgreSQL** accessed through **MikroORM v7** (`@mikro-orm/postgresql`) with the `Migrator` extension.
- **Connection pooling** is configured in `packages/database/src/config.ts` (`DATABASE_POOL_MIN` / `DATABASE_POOL_MAX`, defaults 2 / 10).
- The ORM instance is created synchronously and connects **lazily**: the app starts without a database, and `/api/v1/health` returns `503 {"code":"DATABASE_UNAVAILABLE"}` (in h3's `data`) until PostgreSQL is reachable.
- **Migrations** live in `packages/database/migrations` and are run through the MikroORM CLI (`mikro-orm.config.ts`, loaded with `tsx`). Schema changes happen only through committed migrations.
- Entities are registered in `packages/database/src/entities/index.ts` (empty for now – the domain model is still to be designed).

### Frontend

| Area | Routes | Layout | Styling |
| --- | --- | --- | --- |
| Public | `/`, account pages, public quote `/w/{token}` | `layouts/default.vue` | Tailwind CSS utilities |
| Agent zone | `/agent/**` | `layouts/agent.vue` | shadcn-vue components (`app/components/ui`) + shared building blocks (`app/components/app`) |
| Office zone | `/biuro/**` | `layouts/office.vue` | as above |
| Admin demo (temporary) | `/admin` | `layouts/admin.vue` | removed when the first zone page lands |

Tailwind v4 is wired through the `@tailwindcss/vite` plugin (`app/assets/css/tailwind.css`); shadcn-vue is added with `shadcn-nuxt` and its design tokens live in the same stylesheet.

### Environment & tooling notes

- One `.env` at the **repo root** serves both the Nuxt app (`nuxt dev --dotenv ../../.env`) and the MikroORM CLI. In production, provide real environment variables.
- TypeScript 6 is installed through the `@typescript/typescript6` alias (binary `tsc6`), because `vue-tsc` does not support TypeScript 7 yet.
- Quality gate: `pnpm check` (ESLint with package-boundary rules, Prettier, typecheck, Vitest, build). See [`docs/engineering-standards.md`](docs/engineering-standards.md).

## Working with AI agents (spec-driven development)

Work starts from a spec in [`.ai/specs/`](.ai/specs), autonomous runs are logged in [`.ai/runs/`](.ai/runs), and non-obvious findings are recorded in [`.ai/lessons.md`](.ai/lessons.md). Details and rules are in [`AGENTS.md`](AGENTS.md).
