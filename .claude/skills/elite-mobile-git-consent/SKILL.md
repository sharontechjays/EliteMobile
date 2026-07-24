---
name: elite-mobile-git-consent
description: Use before any git commit, push, branch creation/deletion, or PR action in this repo — never run one without the user's explicit, in-the-moment consent for that specific action.
---

# Never Commit Without Consent

**Never run `git commit` in this repo unless the user has explicitly asked for a commit in this
turn.** Finishing a feature, fixing a bug, or passing all tests is not consent to commit — only the
user directly asking is.

## What counts as consent

✅ Counts:

- "commit this"
- "commit and push"
- "create a PR"
- A request that explicitly describes a commit as part of the deliverable (e.g. "fix the bug and
  commit it")

❌ Does not count:

- The work being finished, tested, and verified
- A prior turn's approval of a _different_ commit/push — each commit/push needs its own fresh ask
- Silence, or the user moving on to a different topic
- "looks good" / "nice" / general positive feedback with no explicit commit instruction
- Inferring consent because a similar action was approved earlier in the session

## Scope

This applies to every action that changes the repo's committed history or its visibility to others:

- `git commit` (including `--amend`)
- `git push` (including to any branch — dev/stg/main or a feature branch)
- `git branch -d`/`-D` (deleting a branch)
- `git checkout -b` / creating a new branch — lower stakes, but confirm the branch name/base if it
  wasn't explicitly specified
- Opening, merging, or closing a PR (`gh pr create`/`merge`/`close`)
- Any destructive git operation (`reset --hard`, `clean -f`, force-push) — these need consent even
  more explicitly than a normal commit, per the standing "risky actions" guidance

## Why

Standing project practice, and the general rule this session has followed throughout: work gets
implemented, verified (typecheck/lint/tests), and left as clean uncommitted changes (or changes
staged for review) until the user says to commit. This project in particular has an active
Conventional Commits convention, protected files, and real pushed branches/PRs — an unwanted commit
here isn't just noise, it's real shared history that then needs a revert or force-push to undo.

## How to apply

1. Finish and verify the work (typecheck/lint/tests/manual check) — this is always fine to do
   without asking.
2. Stop. Report what's done and that it's ready to commit, but don't commit it.
3. Wait for an explicit "commit this" / "push it" / equivalent before running any command from the
   Scope list above.
4. If a task naturally involves several commits (e.g. splitting unrelated changes into separate
   logical commits), one "commit and push" instruction covers that whole described batch — but a
   _new_ round of changes discovered afterward (like a follow-up fix) still needs its own ask.

## Related

`.claude/settings.json` already has a `PreToolUse` hook (`require-git-approval.sh`) that
deterministically enforces this for `git commit *` and `git push *` specifically — those two are
covered mechanically, not just by judgment. The rest of the Scope list above (branch creation/
deletion, PR open/merge/close, destructive git ops) has **no matching hook today** and relies on
this skill being followed by judgment alone — worth closing that gap with additional hook entries
if stronger guarantees are wanted for those actions too.
