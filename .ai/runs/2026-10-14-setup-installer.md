# One-command idempotent installer (`npm run setup`)

- **Date:** 2026-10-14
- **Agent/model:** Claude Code (claude-opus-5-5), skill `om-fix`
- **Spec:** none – guidance in issue #9 (implementation notes; both assumptions confirmed by the maintainer)
- **Status:** completed

## Goal

Issue #9: `npm run setup` performs the README Quick start steps (install, `.env`, DB, migrations), is safe to re-run (skips done steps), and README documents it with the manual steps kept as an alternative.

## Plan

1. Dependency-free Node script `scripts/setup.mjs` with injectable `exec`/`fs`, pure step functions.
2. `setup` script in root `package.json`; README Quick start update.
3. Unit tests at 100 % coverage – new `scripts` Vitest project, `scripts/**/*.mjs` in `coverage.include`.
4. Full validation gate.

## Log

- Claimed #9, branched `feat/9-setup-installer` off `main`. No `om-root-cause` brief in context; used the issue's implementation notes as the brief.
- Wrote `scripts/setup.mjs` (entry) + `scripts/setup/setup.mjs` (steps, pure, injected `sys`) + `scripts/setup/system.mjs` (spawnSync/fs, no shell). Steps: Node >= 22 → pnpm or `corepack pnpm` → `pnpm install` (always; up-to-date install is a ~0.5 s no-op, and `node_modules/.pnpm/lock.yaml` is not byte-equal to `pnpm-lock.yaml`, so it can't be used as a skip marker) → copy `.env` only if missing (`COPYFILE_EXCL`) → DB: skip when `.env` DATABASE_URL differs from `.env.example`'s (confirmed assumption), else require `docker compose`, skip if `db` running, else `pnpm db:up --wait` (waits for the healthcheck) → `pnpm db:migration:up` (itself idempotent). Does not start `pnpm dev` (confirmed assumption).
- Coverage: new `scripts` Vitest project; `scripts/**/*.mjs` added to `coverage.include` (include widened, exclude untouched). Entry file tested with `vi.mock`.
- Lint: `@typescript-eslint/no-unused-vars` false-positives on every JS file → added the `tripsalesagent/quality/js` block (core `no-unused-vars`) in `eslint.config.mjs`. Lesson written.
- README Quick start: installer first, manual steps kept as "Manual setup"; note on `pnpm setup` being a pnpm built-in. AGENTS.md command list gained `npm run setup`.
- Smoke test (no Docker/Compose in this WSL): run 1 created `.env` and stopped with the Compose hint, exit 1; run 2 skipped `.env`. With `.env` pointing at a throwaway PostgreSQL 14 (TCP-only, scratchpad): two runs both exit 0, the second skipping `.env` and the container; migrations succeeded (repo has none yet). Temp DB and `.env` removed afterwards.

- Review (PR #10, `om-code-review`, approve with 3 minors + 2 nits); the maintainer asked to fix all of them:
  - quoted `DATABASE_URL` is unquoted like `process.loadEnvFile` does;
  - the Compose path always runs `pnpm db:up --wait` (no-op on a healthy container), so migrations never race a container that is still starting;
  - pnpm hint no longer assumes corepack (not bundled from Node 25);
  - new `scripts/tsconfig.json` typechecked by `pnpm typecheck` (`tsc6 -p scripts`) – it immediately caught a bad `as NodeJS.WriteStream` cast in a test, fixed with a JSDoc type on `createSystem`;
  - README says Windows users run the installer in WSL.
- Docker became available mid-run (see the WSL Docker lesson). Re-run of `npm run setup` against the maintainer's running `db` container: skips `.env` and container, migrations OK, exit 0, `.env` byte-identical. A fresh container start was not exercised (would have meant stopping the maintainer's container).

## Result

Files: `scripts/tsconfig.json`, `scripts/setup.mjs`, `scripts/setup.test.ts`, `scripts/setup/setup.mjs`, `scripts/setup/setup.test.ts`, `scripts/setup/system.mjs`, `scripts/setup/system.test.ts`, `package.json`, `vitest.config.ts`, `eslint.config.mjs`, `README.md`, `AGENTS.md`.
Validation gate: `pnpm lint`, `format:check`, `typecheck`, `test:coverage` (100 %), `build` – all green.
Docker re-run path verified on a live container; the fresh-container start (`pnpm db:up --wait` on a stopped container) is covered by unit tests only. PR #10.

## Lessons

- [`@typescript-eslint/no-unused-vars` misfires on plain JS files](../lessons/2026-10-14-eslint-ts-unused-vars-on-js.md)
