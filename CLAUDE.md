# CLAUDE.md

@AGENTS.md

The file above is the single source of truth for the `.ai/` metadata structure (specs, runs, lessons) and the required workflow. Everything in it applies to Claude Code in full.

## Claude Code reminders

- **Start of every session/task:** read `.ai/lessons.md`, then check `.ai/specs/` for a relevant spec.
- **Every autonomous run** (including subagent- and workflow-driven work) gets a log in `.ai/runs/YYYY-MM-DD-slug.md`, created at the start and finalized at the end.
- **After fixing a bug or learning something non-obvious:** write `.ai/lessons/YYYY-MM-DD-slug.md` and add it to the index in `.ai/lessons.md`. This is the project's long-term memory – prefer it over Claude Code's private auto-memory for anything that is useful to other agents or teammates.
- **Specs:** active in `.ai/specs/`, finished in `.ai/specs/implemented/`, dead in `.ai/specs/archive/`. Move with `git mv`; never rename.
- **File naming:** always `YYYY-MM-DD-slug.md`; get the date from `date +%F`.
- When delegating to subagents, tell them to follow these rules and to report lessons back, or write them yourself.
