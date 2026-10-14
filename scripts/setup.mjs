// `npm run setup` – one-command, re-runnable version of README "Quick start".
// Runs before `pnpm install`, so it (and everything it imports) uses Node built-ins only.
import { runSetup } from './setup/setup.mjs'
import { createSystem } from './setup/system.mjs'

process.exitCode = runSetup(createSystem())
