# Write the engineering standards spec

- **Date:** 2026-10-13
- **Agent/model:** Claude Code (claude-opus-5-5)
- **Spec:** [.ai/specs/2026-10-13-engineering-standards.md](../specs/2026-10-13-engineering-standards.md) (created in this run)
- **Status:** completed

## Goal
Write a spec for preparing TripSalesAgent's coding standards for the agency sales portal MVP described in `.ai/mockups/2026-10-13-agency-sales-portal-mvp/`, modelled on `local/2026-09-01-engineering-standards-ai-tech-leaders.md` (DevMentor standards, Next.js/React stack).

## Plan
1. Read `.ai/lessons.md`, existing specs, the reference standards document and the MVP documents (scope, screen map + API catalog, shared screen patterns, mockup source).
2. Read the current code (composition root, packages, Nuxt config) so the spec is grounded in what exists.
3. Translate every section of the reference into the Nuxt/Nitro/Vue/MikroORM/Awilix stack and the portal's domain; write the spec.

## Log
- Reference document is written for Next.js App Router + React + `ui` package + ESLint; this repo is Nuxt 4 + Nitro + Vue + shadcn-vue, with no ESLint, Prettier or test runner yet. Things that do not translate 1:1 were adapted rather than copied:
  - `route.ts` + `makeCrudRoute` → Nitro file routing (`<name>.<method>.ts`), one thin handler per file; no CRUD generator (YAGNI, file routing already gives one file per method).
  - JSON success envelope → plain data on success, h3 errors with a typed `data` payload on failure (idiomatic for `$fetch`/`useFetch`); the API catalog's 409/410/422 contract is kept.
  - "Colocate next to `page.tsx`" → not possible in Nuxt (every `.vue` under `pages/` is a route); placement tree adjusted.
- Domain-specific rules derived from the MVP documents: inquiry state machine as one transition table, optimistic locking (`ETag`/`If-Match`), money in integer grosze (the mockup uses floats – explicitly not to be copied), frozen commission rate, public quote token handling, agent data isolation returning 404, Europe/Warsaw business day for expiry, `Clock` port (the mockup has a "system date" switch).
- Decisions that belong to the user are listed under "Open questions" with a recommended default, instead of being silently assumed (zone naming `/admin` vs `/agent` + `/biuro`, Zod in `core`, session strategy, expiry mechanism, language of the standards document).
- User answered the open questions: Q2 (zod in `core`) – yes, the rest – recommended defaults. Spec section "Open questions" replaced by "Decisions", status set to `ready`.
- `.ai/docs/` (used by the reference) is not part of the `.ai/` structure in `AGENTS.md`, so the deliverable is placed at `docs/engineering-standards.md`.

## Result
- Added `.ai/specs/2026-10-13-engineering-standards.md` (status: ready, decisions recorded).
- No code changed; `pnpm typecheck`/`pnpm build` not applicable.
- Next step: implementation run following R11.

## Lessons
none
