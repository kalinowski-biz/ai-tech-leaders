# AGENTS.md

Instructions for AI coding agents working in this repository. These rules are mandatory.

This project uses **Spec-Driven Development (SDD)**: work starts from a spec, every autonomous run is logged, and what we learn is written down. All of that lives in the `.ai/` folder.

## Project: TripSalesAgent – technical assumptions

**TripSalesAgent** is a web application built as a TypeScript monorepo. These assumptions are binding; do not swap a technology or bypass a convention without a spec that says so (see `README.md` for the architecture narrative).

### Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Nuxt** (latest major, currently 4.x) + **Vue 3** + **TypeScript** | Strict TS. Use Composition API and `<script setup lang="ts">`. |
| Database | **PostgreSQL** | Local dev DB via `docker-compose.yml` (`pnpm db:up`). |
| ORM | **MikroORM** (v7, `@mikro-orm/postgresql`) | Migrations (`@mikro-orm/migrations`) and connection pooling are mandatory; schema changes **only** via migrations. |
| DI container | **Awilix** | See "Dependency injection" below. |
| Public pages CSS | **Tailwind CSS** (v4, `@tailwindcss/vite`) | Utility classes in templates; no custom CSS frameworks. |
| Admin ("backend") pages UI | **shadcn-vue** (`shadcn-nuxt`, Reka UI) on top of Tailwind | Components live in `packages/app/app/components/ui` and are added with `pnpm dlx shadcn-vue@latest add <component>` (run in `packages/app`). |
| Package manager | **pnpm** workspaces | Never use npm/yarn; never commit another lockfile. |
| Runtime | Node.js >= 22 | |

### Monorepo layout

All sub-packages live in `packages/` and are named `@tripsalesagent/<name>`. Internal packages are consumed as **TypeScript sources** (`exports` -> `./src/index.ts`, no build step); the app transpiles/inlines them (see `packages/app/nuxt.config.ts`).

| Package | Role | May depend on |
| --- | --- | --- |
| `packages/app` | **Integration package** – the Nuxt app (public pages, `/admin` pages, Nitro API). Owns the **composition root** (`server/utils/container.ts`) where all packages are wired together. | `core`, `database` |
| `packages/core` | Framework-free domain/business logic: services and the **ports** (interfaces) they need. | `awilix` only (for `register*`) |
| `packages/database` | MikroORM config, entities, migrations, pooling, `registerDatabase()`; implements ports from `core`. | `@mikro-orm/*`, `awilix` |

Rules:
- Dependency direction is `app -> core`, `app -> database`. `core` must **not** import `database` or `app`; it depends on ports, and `database` provides the adapters.
- New package? Create `packages/<name>` with `@tripsalesagent/<name>`, a `typecheck` script and a `register<Name>(container)` function if it contributes services; wire it in the composition root only.
- Domain logic never lives in Vue components or Nitro route handlers: handlers resolve a service from the request scope and delegate.

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

- Public pages: `layouts/default.vue`, Tailwind utilities only. Admin pages: `definePageMeta({ layout: 'admin' })`, under `pages/admin/`, built from shadcn-vue components.
- Do not hand-edit generated shadcn-vue components unless customizing deliberately; prefer composing them.

### Commands

```bash
pnpm install                # install (runs `nuxt prepare`)
pnpm dev                    # Nuxt dev server (reads the repo-root .env)
pnpm build                  # production build
pnpm typecheck              # tsc for packages + nuxt typecheck (vue-tsc) for the app
pnpm db:up / db:down        # local PostgreSQL via docker compose
pnpm db:migration:create | up | down | pending
```

A change is not done until `pnpm typecheck` and `pnpm build` pass.

### Known constraints

- **TypeScript is 6.x via an alias**: the root `package.json` has `"typescript": "npm:@typescript/typescript6@^6"`, because `vue-tsc` (used by `nuxt typecheck`) does not work with TypeScript 7 yet. That package ships the binary as `tsc6` (not `tsc`), so package scripts use `tsc6 --noEmit`. Do not move to TypeScript 7 until `vue-tsc` supports it and `pnpm typecheck` passes.
- The MikroORM CLI needs an explicit TypeScript loader; the scripts set `MIKRO_ORM_CLI_TS_LOADER=tsx`.
- The ORM is created synchronously and connects lazily, so the app boots without a database and `/api/health` reports `degraded` (HTTP 503).

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
└── lessons/                    # Detailed lesson entries
    └── YYYY-MM-DD-slug.md
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

## Rules

- Never create files in `.ai/` that don't follow the structure and naming convention above.
- Never delete specs, runs or lessons; move specs to `archive/` instead. Lessons may only be deleted if factually wrong.
- Use real dates (`date +%F`), not placeholders or guessed dates.
- Write `.ai/` files in English, in Markdown.
- Keep `.ai/` changes in the same commit/PR as the work they describe.
- If this document and the user's explicit instruction conflict, follow the user and note it in the run log.
