# Configure the om-* agent PR pipeline

- **Date:** 2026-10-13
- **Agent/model:** Claude Code, Opus 5.5 (`om-setup-agent-pipeline` skill)
- **Spec:** none (tooling setup driven by the skill)
- **Status:** completed

## Goal

Write `.ai/agentic.config.json`, install the tracker/browser descriptors, create the label taxonomy on GitHub and generate the missing process docs so the installed `om-*` skills can run in this repo.

## Plan

1. Detect repo shape (default branch, validation commands, tracker).
2. Interview the user; install `github` tracker + `agent-browser` browser descriptors.
3. Create missing labels; generate `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`.
4. Write the config, gitignore QA artifacts, verify skill coverage, commit.

## Log

- Started with the question why `om-fix` was not visible: the skills are symlinks `.claude/skills/om-* -> .agents/skills/om-*` created at 19:56 today, i.e. after the earlier session started. Claude Code loads skills at session start, so they appear only in new sessions.
- Detected: `origin` on GitHub, default branch `main`, pnpm, CI runs lint, format:check, typecheck, test:coverage, build, integration tests.
- User choices: validation = CI without integration tests; `paths.runs` = `.ai/runs` (pipeline run folders allowed next to run logs, noted in AGENTS.md); full label taxonomy + QA gate; generate SDLC.md, CODE_REVIEW.md, BACKWARD_COMPATIBILITY.md.
- Local `gh` is 2.4.0 (< 2.82.1 the tracker descriptor requires for `gh pr/issue edit`); the label guards use REST so they work, but read paths may hit the Projects (classic) error.

- `gh label create` failed (`unknown command "label"` on gh 2.4.0): created the 25 missing labels with `gh api -X POST .../labels` and patched `create-label` / `ensure-label-taxonomy` in `.ai/trackers/github.md` to REST. Existing labels (`bug`, `documentation`, …) left untouched.
- `SDLC.md` rendered from the skill template (labels on, QA gate on, no discovery block) plus a note that integration tests stay a CI gate.
- `CODE_REVIEW.md` derived from `AGENTS.md` and `docs/engineering-standards.md` §8.4 (links the checklist instead of copying it); `reviewChecklist` left `null`.
- `BACKWARD_COMPATIBILITY.md` inventories /api/v1, error codes, ETag/If-Match + CSRF headers, public URLs (`/logowanie`, `/w/{token}`), DB migrations, env vars, domain invariants.
- `closeKeywords` set to Polish `zamyka`, `naprawia`, `rozwiązuje` (additive to the English built-ins).
- Skill coverage check (`SKILLS_ROOT=.claude/skills`): `SKILL_COVERAGE_OK`.

## Result

Files: `.ai/agentic.config.json`, `.ai/trackers/github.md`, `.ai/browsers/agent-browser.md`, `.gitkeep` in `.ai/{analysis,specs,scripts,qa}`, `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `.gitignore` (QA artifacts), `AGENTS.md` (run-folder exception). GitHub: 25 labels created. Verified with `pnpm format:check` and the coverage script. Left: upgrade local `gh` to >= 2.82.1; restart Claude Code sessions to see the skills; commit/PR on branch `chore/agent-pipeline-setup`.

## Lessons

- [.ai/lessons/2026-10-13-om-skills-and-old-gh-cli.md](../lessons/2026-10-13-om-skills-and-old-gh-cli.md)
