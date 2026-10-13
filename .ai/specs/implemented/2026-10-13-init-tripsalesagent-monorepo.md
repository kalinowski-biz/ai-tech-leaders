# Initialize the TripSalesAgent monorepo

- **Status:** implemented
- **Created:** 2026-10-13
- **Related:** [run log](../../runs/2026-10-13-init-tripsalesagent-monorepo.md)

## Goal
Bootstrap **TripSalesAgent** as a pnpm monorepo with a Nuxt + TypeScript + Vue integration app, PostgreSQL via MikroORM, Awilix dependency injection, Tailwind CSS for public pages and shadcn-vue for admin ("backend") pages. Document the assumptions in `AGENTS.md` (so coding agents keep to them) and the architecture in `README.md`.

## Context
- The repo currently has a Nuxt 4 minimal app at the repo root (previous runs `install-nuxt`, `switch-to-pnpm`). It is untracked and moves into `packages/app`.
- Package manager: pnpm (workspaces).
- The original request was truncated after "app package – which is the main, integration package for h…"; the defaults below fill that gap (see Open questions).

## Requirements
1. **Monorepo** – pnpm workspace; sub-packages live in `packages/*`. Root `package.json` is private and only holds shared tooling and scripts.
2. **Packages (minimum structure)**
   - `packages/app` (`@tripsalesagent/app`) – the Nuxt app; the *integration* package. It owns pages, Nitro server routes and the **composition root** (the only place where Awilix registrations from all packages are assembled).
   - `packages/core` (`@tripsalesagent/core`) – framework-free domain/business logic (services, ports). No Nuxt, no direct DB access.
   - `packages/database` (`@tripsalesagent/database`) – MikroORM config, entities, migrations, pooling, `registerDatabase()` for the container.
3. **Stack** – latest Nuxt (4.x) + Vue 3 + strict TypeScript; PostgreSQL + MikroORM (migrations, pooling); Awilix DI; Tailwind CSS (v4) for public pages; shadcn-vue (`shadcn-nuxt`) for admin pages under `/admin`.
4. **DI** – one root container (singletons: ORM, services config), one **scope per request** (request-scoped `EntityManager` fork). Packages expose `register*(container)` functions and never import the container from the app.
5. **Database** – connection from `DATABASE_URL`; pool size configurable via env; migrations via MikroORM CLI scripts (`db:migration:create|up|down`); a first baseline entity is not required, but the migration tooling must work.
6. **Docs** – `AGENTS.md` gets a "Project assumptions" section; `README.md` gets architecture notes, setup and scripts. Existing SDD rules in `AGENTS.md` stay untouched.
7. `.env.example`, `docker-compose.yml` (local Postgres) for developer convenience.

## Acceptance criteria
- `pnpm install` succeeds from a clean checkout.
- `pnpm typecheck` and `pnpm build` pass.
- `pnpm dev` serves a public Tailwind-styled home page (`/`) and an admin page (`/admin`) using shadcn-vue components.
- A health endpoint (`/api/health`) resolves a service from the request-scoped Awilix container and checks the DB when it is reachable.
- `pnpm db:migration:create` / `up` run against the local Postgres.
- `AGENTS.md` and `README.md` describe the above.

## Out of scope
- Real domain model (trips, offers, customers), authentication, deployment/CI.

## Open questions
- Truncated request: confirm the intended role of the integration package ("…for h…") and any additional required packages.
- Whether public pages should also use shadcn-vue primitives (currently: Tailwind only).
