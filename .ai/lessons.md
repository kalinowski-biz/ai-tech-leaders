# Lessons

Long-term memory for AI agents working in this repository. **Read this before starting any task.**

Detailed entries live in [`lessons/`](lessons/) as `YYYY-MM-DD-slug.md`. When you add one, add a line to the index below (newest first). See `AGENTS.md` for when and how to write lessons.

## Key lessons

<!-- Short, curated list of the most important takeaways. Keep it scannable. -->

- TypeScript must be the `@typescript/typescript6` alias (binary `tsc6`) – `vue-tsc` (nuxt typecheck) breaks on TS 7.
- MikroORM CLI scripts need `MIKRO_ORM_CLI_TS_LOADER=tsx`.
- After `shadcn-vue add`, check `git diff packages/app/package.json` – the CLI downgraded zod 4 → 3; forms use `toFormSchema`, not `@vee-validate/zod`.
- Import the app's `shared/` folder only as `#shared/...` – relative paths break the Nitro build.
- API calls go through `useApi` (global `$fetch` + forwarded cookie); `useRequestFetch()` has no `.raw` on the server.
- Docker availability in the WSL setup varies: on 2026-10-13 it first had no daemon, later `docker ps` worked and Testcontainers ran. Check `docker ps` first; without Docker run integration tests with `TEST_DATABASE_URL` pointing at a throwaway local PostgreSQL (`/usr/lib/postgresql/14/bin`).
- Every feature keeps unit coverage at 100 % – simplify unreachable branches instead of excluding them; Nuxt component tests are `*.nuxt.test.ts` (see the gotchas lesson).
- Incidental bugs outside the current change are filed via `om-prepare-issue`, not fixed in passing – most `om-*` implementation skills don't do this on their own (AGENTS.md principle 6).
- Skills (`.claude/skills` -> `.agents/skills`) load at session start – restart Claude Code after installing them. Local `gh` must be >= 2.82.1 for the `om-*` pipeline.
- reka `AlertDialogAction`/`DialogClose` closes before your `@click`; declared emits never show up in `useAttrs()`.

## Index

<!-- Format: - [Title](lessons/YYYY-MM-DD-slug.md) – one-sentence takeaway -->

- [om-* skills don't file incidental bugs found during implementation](lessons/2026-10-13-om-skills-incidental-bugs-not-filed.md) – only `om-auto-fix-pr`/`om-pr-autopilot` file deferred review findings; everything else drops them, so file them yourself via `om-prepare-issue`.
- [om-* skills need a restart; local `gh` is too old](lessons/2026-10-13-om-skills-and-old-gh-cli.md) – skills installed mid-session appear only in a new Claude Code process; `gh 2.4` lacks `gh label`, use `gh api` and upgrade gh to >= 2.82.1.
- [Unit-testing Nuxt components and composables: gotchas](lessons/2026-10-13-nuxt-unit-test-gotchas.md) – `$fetch` retries GET on 503, `useAsyncData` caches per key, auto-unmount, and how to keep `.vue` branch coverage reachable.
- [reka-ui `AlertDialogAction` closes the dialog before your `@click`](lessons/2026-10-13-reka-dialog-close-runs-before-click.md) – every `useConfirm()` resolved `false`; decide the outcome with a plain `Button`.
- [Listeners of declared emits never appear in `useAttrs()`](lessons/2026-10-13-declared-emits-not-in-attrs.md) – make an optional `onX` prop when rendering depends on a listener being attached.
- [The Nuxt Vitest project must be rooted at the app](lessons/2026-10-13-nuxt-vitest-project-root.md) – set `root: packages/app` next to `environmentOptions.nuxt.rootDir`, or Nuxt's runtime entry fails to resolve.

- [shadcn-vue CLI can silently change dependencies](lessons/2026-10-13-shadcn-cli-changes-dependencies.md) – `add form` replaced zod 4 with zod 3 for `@vee-validate/zod`; diff `package.json` after every add.
- [Import `packages/app/shared` via `#shared`](lessons/2026-10-13-nuxt-shared-dir-use-alias.md) – a relative value import of `shared/` breaks `pnpm build` while typecheck and tests pass.
- [SSR fetch: no `.raw` on `useRequestFetch()`, typed `$fetch` on dynamic paths](lessons/2026-10-13-ssr-fetch-raw-and-typed-routes.md) – use the global `$fetch` via an untyped view + forwarded cookie; never map unknown errors to `NETWORK_ERROR`.

- [MikroORM CLI needs an explicit TypeScript loader](lessons/2026-10-13-mikro-orm-cli-needs-ts-loader.md) – install `tsx` and set `MIKRO_ORM_CLI_TS_LOADER=tsx`, else `migration:up` fails with "MigrationClass is not a constructor".
- [vue-tsc (nuxt typecheck) breaks with TypeScript 7](lessons/2026-10-13-vue-tsc-needs-typescript-5.md) – use `typescript` = `npm:@typescript/typescript6` (bin `tsc6`) until vue-tsc supports TS 7.
