# shadcn-vue CLI can silently change dependencies (zod 4 → 3)

- **Date:** 2026-10-13
- **Source:** run [2026-10-13-implement-engineering-standards](../runs/2026-10-13-implement-engineering-standards.md)

## What happened
`pnpm dlx shadcn-vue@latest add form` added `@vee-validate/zod` to `packages/app` and rewrote `zod` from `^4.6.7` to `^3.25.76`, because `@vee-validate/zod` 4.15 only supports zod 3. Nothing failed – the downgrade was only visible in `git diff package.json`.

## Root cause / insight
The CLI installs the registry item's dependencies at the versions the item declares, overriding what the project already has. vee-validate 4.15 itself accepts any object implementing its `TypedSchema` interface.

## What to do (or avoid) next time
- After every `shadcn-vue add`, run `git diff packages/app/package.json` and revert unwanted version changes.
- Do not install `@vee-validate/zod`; forms use `toFormSchema(schema)` from `packages/app/app/utils/form-schema.ts` (zod 4 → vee-validate adapter).
