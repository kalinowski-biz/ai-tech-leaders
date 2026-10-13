# om-* skills don't file incidental bugs found during implementation

- **Date:** 2026-10-13
- **Source:** user question – audit of the vendored `om-*` skills (`open-mercato/skills`)

## What happened

The user asked whether the `om-*` pipeline reports bugs found by the way, outside the scope of the current change. An audit of `.claude/skills/om-*` showed the coverage is partial and depends on the entry point.

## Root cause / insight

- **Covered:** `om-auto-fix-pr` step 5 (`references/pr-finalize.md`) and `om-pr-autopilot` (state 8) turn review findings that were deliberately left unfixed (nits, low severity, out of scope) into issues via `om-followup-issue-from-pr`. `stabilize-ci.md` does the same for confirmed flaky tests.
- **Partly covered:** `om-qa-buddy` writes out-of-scope bugs to local `bugs/*.md` files only (never the tracker). `om-root-cause` only lists them under "Risks".
- **Not covered:** the implementation skills (`om-auto-create-pr`, `-loop`, `om-auto-continue-pr*`, `om-fix`) only say "remove scope creep", so an unrelated bug noticed while coding is silently dropped. The review loops in `om-auto-create-pr*` and `om-auto-fix-issue` only *document* out-of-scope findings in the PR summary comment, with no issue. `om-code-review` reviews only the diff. `om-auto-qa-pr` has no rule.
- **Conflict:** `om-code-review` says a gate failure "pre-existing on the base branch" is no excuse and must be fixed or flagged as a blocker. `om-auto-fix-pr/references/stabilize-ci.md` says base-branch failures are out of scope and should only be reported.

## What to do (or avoid) next time

- Follow working principle 6 in `AGENTS.md`: file every incidental bug through `om-prepare-issue`, link it in the PR summary and the run log, and don't fix it in the current PR. If it breaks the gate, file it and report it as the PR's blocker in the summary comment; don't set `blocked` yourself – `SDLC.md` reserves that label for humans.
- Don't patch the vendored skills locally (`skills-lock.json` hashes; they are overwritten on upgrade). Propose the gap upstream to `open-mercato/skills` instead.
