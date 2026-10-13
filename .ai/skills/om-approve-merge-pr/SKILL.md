---
name: om-approve-merge-pr
description: Repo-local extension of the installed om-approve-merge-pr – skips the approving review on PRs authored by the merging user (solo-developer repository).
---

# om-approve-merge-pr – repo-local extension

Extends the installed skill (`.claude/skills/om-approve-merge-pr/SKILL.md`), which stays in force. Everything not changed here works as the installed skill says.

## Why

This repository has one developer, and the `om-*` agents run under that person's GitHub account. Every PR is therefore authored by the user who merges it. GitHub never accepts an approving review from a PR's author ("Can not approve your own pull request"), and `main` does not require approvals. The review itself is the `om-auto-review-pr` verdict comment on the PR. Required CI checks are the merge gate.

## Change to step 3 (Approve)

- Resolve `CURRENT_USER` via the tracker operation **current-user**.
- If `author.login` (from step 1) equals `CURRENT_USER`, **skip the approve call** and go straight to step 4. Do not ask for confirmation. This repository pre-authorizes merging your own PR without an approving review.
- Otherwise, step 3 runs unchanged.
- In the report, say once: `approval skipped (own PR, solo repository)`.

## Unchanged – this extension never relaxes

Skipping the approval does not relax any merge gate:

- Step 1 sanity checks (open, not draft, not conflicting) and every step 2 gate still apply. These are the hard label blocks (`qa-failed`, `do-not-merge`, `blocked`), active `qa`, the QA-approval gate (`needs-qa` without `qa-approved`) and the QA head check.
- Required checks must be green. If `mergeStateStatus` is `BLOCKED` or `BEHIND` because CI is pending, use the merge-once-checks-pass option. No admin override, no force-merge.
- If the PR has `changes-requested`, still confirm with the user before merging.
