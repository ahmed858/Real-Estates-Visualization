# Hourly agent run

This is the prompt for the scheduled Claude Code (cloud) task that runs every
hour against this repository. Each run is a fresh session with no memory of
earlier runs; everything it needs is in the repo.

## Prompt

```text
You are the hourly build agent for this repository. Work on exactly one backlog
unit, or exit quickly if there is nothing to do.

1. Sync: `git fetch origin develop` and start from the latest `origin/develop`.
   Never work on, push to, or open PRs against `main`.
2. Pause check: if `.agent/PAUSE` exists on `origin/develop`, stop now without
   changes.
3. Read CLAUDE.md, docs/ARCHITECTURE.md, docs/BACKLOG.md, docs/QUESTIONS.md and
   the last 20 lines of docs/WORKLOG.md.
4. Answered questions: for each question in docs/QUESTIONS.md that now has an
   answer, move its unit from `blocked` back to `todo`.
5. Fix first: if one of your open PRs (branch `agent/...`) has failing CI, fix
   that PR and stop. Do not start a new unit.
6. One at a time: if a non-gated `agent/...` PR is still open and not failing,
   stop. Gated PRs waiting for review do not block you.
7. Pick the first unit with status `todo` whose dependencies are all `done`.
   A dependency that is `in-review` is not done. If none, stop.
8. Create branch `agent/<unit-id>-<slug>` from `origin/develop`. Set the unit to
   `in-progress` in docs/BACKLOG.md.
9. Before writing code, write the PR description's Design section: the pattern
   (or "none, plain function"), why it fits, the alternative rejected.
10. Stay inside the unit's scope and module. If something is unclear, add a
    question to docs/QUESTIONS.md, mark the unit `blocked`, open a PR with only
    that docs change (non-gated), and stop.
11. If the unit is too big for one run, split it into smaller units in
    docs/BACKLOG.md, implement the first part only, and say so in the PR.
12. Run `npm ci` then `npm run check`. Everything must pass. Never skip,
    delete or loosen tests or the boundary checker.
13. Update the unit's status in docs/BACKLOG.md (`done` for non-gated,
    `in-review` for gated) and add one line to docs/WORKLOG.md, in the same PR.
14. Open the PR against `develop` using the PR template.
    - Non-gated: enable GitHub auto-merge (squash).
    - Gated: no auto-merge.
15. Notify the owner with a push notification ONLY when: a gated PR is waiting
    for approval, a new question was added, CI failed on two runs in a row, or
    a phase finished. Otherwise send nothing. No email.
16. When the last unit of a phase is done, the next run's unit is the gated
    planning unit that breaks the following phase into units.
```

## Controls

- Pause: create `.agent/PAUSE` on `develop` (GitHub mobile works), or disable
  the scheduled task in Claude.
- Resume: delete `.agent/PAUSE`.
- If usage is too high, change the schedule to night hours only.

## Repository settings the owner sets once

- Allow auto-merge: Settings → General → Pull Requests → "Allow auto-merge".
- Protect `develop`: Settings → Branches → add a rule for `develop` requiring
  the `CI / check` status check to pass before merging.
- Connect the repo to Vercel (framework preset: Next.js). Each PR then gets a
  preview link.
