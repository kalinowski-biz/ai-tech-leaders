# om-* skills: visible only in a new session; local `gh` is too old for parts of the tracker descriptor

- **Date:** 2026-10-13
- **Source:** run `.ai/runs/2026-10-13-agent-pipeline-setup.md`

## What happened

- `om-fix` (and the other `om-*` skills) were "not visible" to Claude Code. They are installed as symlinks `.claude/skills/om-* -> ../../.agents/skills/om-*` (via `npx skills add`, see `skills-lock.json`) and were added while a session was already running.
- During `om-setup-agent-pipeline`, `gh label create` failed with `unknown command "label"`: the WSL machine has the Ubuntu-packaged `gh 2.4.0`.

## Root cause / insight

- Claude Code reads the skill list when a session starts; skills installed mid-session show up only after a restart (new session or `/clear` is not enough – start a new `claude` process).
- `gh label` exists only from gh 2.14; the tracker descriptor also expects gh >= 2.82.1 because older clients abort `gh pr edit` / `gh issue edit` on the Projects (classic) deprecation. REST calls (`gh api`) work on any version.

## What to do (or avoid) next time

- After installing or updating skills, restart Claude Code before using them.
- `.ai/trackers/github.md` creates labels via `gh api -X POST repos/{owner}/{repo}/labels` (patched locally); keep it that way.
- `apply_label` in the descriptor uses `gh api ... -f "labels[]=x"`; gh 2.4.0 sends that as a literal key and GitHub answers 422 (`"labels[]" is not a permitted key`). On old gh pass JSON instead: `echo '{"labels":["x"]}' | gh api -X POST repos/{owner}/{repo}/issues/{n}/labels --input -` (found while opening PR #4).
- Upgrade `gh` from GitHub's apt repo (https://github.com/cli/cli/blob/trunk/docs/install_linux.md) before running pipeline skills that read issues/PRs; distro packages lag years behind.
