# CLAUDE.md

Rules for every Claude session working in this repository, including the hourly
agent (see `docs/AGENT_RUN.md`). Read this file, `docs/ARCHITECTURE.md` and
`docs/BACKLOG.md` before writing code.

@AGENTS.md

## Product in one paragraph

Unit Explorer is a 2D interactive floor plan visualization for real estate
developers. A project is a tree of scenes (facade → floor → unit, or
masterplan → building → floor → unit). Each scene is an image with polygon
hotspots drawn on it. A hotspot opens another scene or a unit. Units are
coloured by their status (available / reserved / sold), which comes from a
spreadsheet the client edits. The same codebase serves many client projects,
each prepared by the owner from a fixed input format. 360° and 3D views are a
later premium layer and must plug in without changing the 2D core.

## Branches

- `main`: production. Only the owner merges into `main`. Never push, merge or
  open a PR against `main`.
- `develop`: integration branch. Every task starts from the latest
  `origin/develop` and its PR targets `develop`.
- Work branches: `agent/<unit-id>-<short-slug>` (e.g. `agent/U-101-project-schema`).
- Never deploy, and never touch client deployments.

## Engineering rules

1. **English only** for code, comments, commit messages, PR descriptions and
   docs. The only exception is the client collection guide, which is written
   in Arabic and English.
2. **SOLID.** One responsibility per file/class/function; depend on interfaces,
   not concrete implementations (e.g. viewer code depends on a `UnitSource`
   interface, not on the Excel reader).
3. **Pick the design pattern before building.** Every PR description starts
   with a short "Design" section: the pattern used (or "none, plain
   function"), why it fits, and what alternative was rejected. Known choices:
   Composite for the scene tree, Strategy for scene renderers (2D now,
   360°/3D later), Adapter for data sources.
4. **Module boundaries** (see `docs/ARCHITECTURE.md`) are enforced by
   `npm run lint`. Import another module only through its public index
   `@/modules/<name>`. Never weaken the checker to make a PR pass.
5. **Tests with every change.** Domain and schema logic gets unit tests
   (Vitest). Never skip, delete or loosen a test to get green.
6. **Small and complete.** A PR covers one backlog unit, leaves the site
   working, and passes `npm run check` (lint, typecheck, tests, build).
7. **No secrets** in the repo. Configuration that differs per environment goes
   in environment variables documented in `.env.example`.
8. **Original work only.** Take ideas from reference sites, never their code,
   images, text or branding.
9. Keep dependencies few; justify each new one in the PR's Design section.

## Commands

```bash
npm ci            # install
npm run dev       # local dev server
npm run lint      # eslint + module boundary check
npm run typecheck # route types + tsc
npm test          # vitest
npm run build     # production build
npm run generate:demo  # regenerate projects/demo-villa
npm run check:demo     # regenerate, validate, fail if projects/demo-villa changed
npm run check     # all of the above, what CI runs
npm run e2e       # browser smoke tests (Playwright) against the last build;
                  # CI runs them in a second job after `check`
```

## Where things live

- `docs/BACKLOG.md`: ordered work units and their status.
- `docs/QUESTIONS.md`: open questions for the owner.
- `docs/WORKLOG.md`: one line per agent run.
- `docs/ARCHITECTURE.md`: modules, dependencies and patterns.
- `docs/RELEASE.md`: what `develop` would ship to `main`. Every merged unit
  that a visitor, client or the owner would notice adds a line there.
- `projects/<slug>/`: data for one client project (first: `demo-villa`).
- `.agent/PAUSE`: if this file exists the hourly agent stops immediately.
