# MikroORM CLI needs an explicit TypeScript loader

- **Date:** 2026-10-13
- **Source:** run `2026-10-13-init-tripsalesagent-monorepo`

## What happened
`mikro-orm migration:create` worked, but `migration:up` failed with `TypeError: MigrationClass is not a constructor` for the generated `.ts` migration.

## Root cause / insight
The v7 CLI auto-detects a TS loader (oxc, swc, tsx, jiti, ...). With none installed it imports the `.ts` file natively and the migration class is not found in the module. Installing `tsx` and selecting it fixes it. Note: the CLI binary is `mikro-orm` (there is no `mikro-orm-esm`).

## What to do (or avoid) next time
`tsx` is a devDependency of `@tripsalesagent/database` and every `migration:*` script sets `MIKRO_ORM_CLI_TS_LOADER=tsx`. New CLI-invoking scripts must do the same.
