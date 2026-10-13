# Upgrade TypeScript 5.9 -> 6.x

- **Date:** 2026-10-13
- **Agent/model:** Claude Code (claude-sonnet-5-5)
- **Spec:** none (small change requested directly by the user; follows lesson `2026-10-13-vue-tsc-needs-typescript-5`)
- **Status:** completed

## Goal
Move from TypeScript 5.9 to 6.x. TS 7 is blocked by `vue-tsc`; `vue-tsc` supports `typescript` aliased to `@typescript/typescript6`.

## Plan
1. Alias `typescript` -> `npm:@typescript/typescript6` in root `package.json`, install.
2. Verify `pnpm typecheck` and `pnpm build`; fix any TS6 breakage.
3. Update lesson, AGENTS.md, README.

## Log
- Set `typescript` to `npm:@typescript/typescript6@^6.0.2` (resolved 6.0.2). `pnpm install` OK.
- Problem: the alias package ships bin `tsc6`, not `tsc`; `tsc --noEmit` in `core`/`database` resolved a Windows global shim (`node: 1: This: not found`). Switched both `typecheck` scripts to `tsc6 --noEmit`.
- No TS 6 deprecation/breakage errors in our code or tsconfigs.
- Docker check requested mid-run: `docker compose` plugin now works (v5.6.0), but the daemon is still unreachable (`/var/run/docker.sock` missing; Docker Desktop WSL integration / dockerd not running). `docker-compose.yml` unverified at that point.
- Retry after the user enabled Docker (daemon 29.8.2 reachable): `pnpm db:up` -> container healthy; `db:migration:create --blank`/`up`/`down` OK; `pnpm dev` -> `/api/health` 200 `ok`/`up` against the container. Cleaned up (`db:down`, volume removed, temporary `.env` and test migration deleted).

## Result
`typescript` -> 6.0.2 via alias. Files: root `package.json`, `packages/{core,database}/package.json`, `AGENTS.md`, `README.md`, `.ai/lessons.md`, updated lesson `2026-10-13-vue-tsc-needs-typescript-5`. Verified: `pnpm install`, `pnpm typecheck` (tsc6 x2 + nuxt typecheck), `pnpm build` pass. Nothing committed. TS 7 remains blocked by `vue-tsc`. `docker-compose.yml` now verified.

## Lessons
- Updated [vue-tsc needs TypeScript 5](../lessons/2026-10-13-vue-tsc-needs-typescript-5.md) (alias + `tsc6` caveat).
