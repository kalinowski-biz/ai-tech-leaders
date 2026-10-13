# Lessons

Long-term memory for AI agents working in this repository. **Read this before starting any task.**

Detailed entries live in [`lessons/`](lessons/) as `YYYY-MM-DD-slug.md`. When you add one, add a line to the index below (newest first). See `AGENTS.md` for when and how to write lessons.

## Key lessons

<!-- Short, curated list of the most important takeaways. Keep it scannable. -->

- TypeScript must be the `@typescript/typescript6` alias (binary `tsc6`) – `vue-tsc` (nuxt typecheck) breaks on TS 7.
- MikroORM CLI scripts need `MIKRO_ORM_CLI_TS_LOADER=tsx`.
- Docker is not usable in this WSL setup (no daemon, no `docker compose` plugin); verify DB features against a throwaway local PostgreSQL (`/usr/lib/postgresql/14/bin`) instead.

## Index

<!-- Format: - [Title](lessons/YYYY-MM-DD-slug.md) – one-sentence takeaway -->

- [MikroORM CLI needs an explicit TypeScript loader](lessons/2026-10-13-mikro-orm-cli-needs-ts-loader.md) – install `tsx` and set `MIKRO_ORM_CLI_TS_LOADER=tsx`, else `migration:up` fails with "MigrationClass is not a constructor".
- [vue-tsc (nuxt typecheck) breaks with TypeScript 7](lessons/2026-10-13-vue-tsc-needs-typescript-5.md) – use `typescript` = `npm:@typescript/typescript6` (bin `tsc6`) until vue-tsc supports TS 7.
