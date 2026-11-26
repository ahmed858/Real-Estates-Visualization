# Backlog

Ordered work units. The hourly agent takes the **first** unit whose status is
`todo`, whose dependencies are all `done`, and that has no open `[agent]` PR.
Phases 1 to 4 are broken down; later phases stay as headlines until the
agent writes their breakdown in a planning unit.

**Statuses** (as they read on `develop`): `todo` · `done` · `blocked` (question
in `docs/QUESTIONS.md`).

A unit's PR sets its status to `done`, so the unit only reads `done` on
`develop` once that PR is merged. While the PR is open (a draft means a run is
working on it), the unit is taken: no other run picks it, and units that
depend on it wait.

**Every** agent PR merges into `develop` as soon as CI is green (the owner's
decision, 2026-11-26). **Gated** units change something the rest of the
project builds on, so their PR adds a "Decisions for the owner" section that
the owner reviews after the merge. A PR that changes `CLAUDE.md`, `.github/` or
the module rules is always treated as gated.

Each unit lists: phase, module, dependencies, gated, acceptance criteria and
verification commands. `npm run check` must pass for every unit.

## Roadmap

| Phase | Name | Outcome |
| --- | --- | --- |
| 0 | Foundation | App skeleton, rules, CI, this backlog. **done** |
| 1 | Data shape | Project and sheet formats, validator, collection guide. |
| 2 | Demo villa | Generator for a 3-storey villa with courtyard and its units sheet. |
| 3 | Viewer | Image + coloured shapes, hover cards, side panel, villa → floor → unit navigation. **done** |
| 4 | Sales tools | Units table with filters, WhatsApp button with unit code, Arabic/English, mobile. **done** |
| 5 | Live status | Site re-reads the sheet continuously (Google Sheets for clients). **done** (U-503 waits for Q-2) |
| 6 | Drawing tool | Polygon editor for real client images. |
| 7 | Multi-client | A link per project, logo and colours per client. |
| 8 | Extras | Each on its own: gallery, compare, share, lead form to client CRM, location map. |
| later | Premium | 360° rotation and 3D model views. |

If a real client arrives early, Phase 6 may move ahead of Phase 4.

---

## Phase 1 · Data shape

### U-101 Project config schema
- Phase 1 · Module `schema` · Depends on: none · **Gated: yes** · Status: `done`
- Define the project config format and its validator (pick a schema library,
  e.g. Zod, and justify it).
  - `project`: slug, name (ar/en), default locale, currency, contact
    (WhatsApp number), branding (logo path, primary/accent colours).
  - `scenes`: a tree (Composite). Each scene has id, kind
    (`facade` | `masterplan` | `building` | `floor` | `unit-plan` | `other`),
    title (ar/en), image path and pixel size, and hotspots.
  - `hotspot`: id, polygon points as `[x, y]` in image pixels, and a target:
    either `{ scene: <id> }` or `{ unit: <code> }`.
  - Typical floor: a floor scene may declare `floors: { from, to }` so one plan
    serves many floors; unit codes are built from a template such as
    `{floor}{suffix}`.
  - Scene renderer `type` field defaulting to `image-2d` (Strategy hook for
    360°/3D later).
- Acceptance: exported TypeScript types inferred from the schema; tests for a
  valid minimal project, a nested compound, a typical floor, and clear error
  messages (path + reason) for invalid input; `docs/data-format.md` describes
  every field.
- Verify: `npm test`, `npm run check`.

### U-102 Units sheet schema
- Phase 1 · Module `schema` · Depends on: none · **Gated: yes** · Status: `done`
- Fixed columns, one row per unit: `code`, `scene` (floor scene id), `floor`,
  `type`, `bedrooms`, `bathrooms`, `area_m2`, `price`, `status`, `plan_image`
  (optional), `notes` (optional).
- `status` accepts English and Arabic spellings (e.g. `available`/`متاح`,
  `reserved`/`محجوز`, `sold`/`مباع`) and normalises to an enum.
- Row-level validation that reports sheet row number and column.
- Acceptance: tests for each column type, status normalisation, duplicates
  (same code twice) and missing required columns; columns added to
  `docs/data-format.md`.
- Verify: `npm test`, `npm run check`.

### U-103 Scene tree model
- Phase 1 · Module `domain` · Depends on: U-101 · Gated: no · Status: `done`
- Build an in-memory tree from a validated config: find scene by id, children,
  breadcrumbs (path from root), expand typical floors into concrete floors,
  list all unit codes referenced by hotspots.
- Acceptance: unit tests on a villa, a tower with a typical floor, and a
  compound with two buildings. No React, no I/O.
- Verify: `npm test`.

### U-104 Status stats and filters
- Phase 1 · Module `domain` · Depends on: U-102, U-103 · Gated: no · Status: `done`
- Join units to scenes; per-scene counts by status (rolled up the tree), price
  and area ranges; pure filter function (status, type, bedrooms, price range,
  area range, floor).
- Acceptance: unit tests including roll-up from floors to facade.
- Verify: `npm test`.

### U-105 UnitSource interface and .xlsx reader
- Phase 1 · Module `data-sources` · Depends on: U-102 · Gated: no · Status: `done`
- `UnitSource` interface (Adapter) with `load(): Promise<UnitRow[]>`.
  `XlsxFileSource` reads the first sheet of a local `.xlsx` and returns rows
  validated by the U-102 schema. Choose a maintained xlsx library and justify it.
- Acceptance: tests read a small `.xlsx` fixture committed under
  `src/modules/data-sources/__fixtures__/`, including a sheet with Arabic
  status values and a sheet with an invalid row.
- Verify: `npm test`.

### U-106 Project validator CLI
- Phase 1 · Module `tools` · Depends on: U-101, U-102, U-105 · Gated: no · Status: `done`
- `npm run validate -- <slug>` checks `projects/<slug>/`: config valid, sheet
  valid, every hotspot unit code exists in the sheet and every sheet unit is
  placed on some scene, every referenced image exists, polygons lie inside
  their image bounds and have at least 3 points. Prints a readable report;
  exits non-zero on errors, zero with warnings only.
- Acceptance: tests on small fixture projects for each failure type.
- Verify: `npm test`, run the CLI on a fixture.

### U-107 Collection guide (Arabic and English)
- Phase 1 · Docs · Depends on: U-101, U-102 · **Gated: yes** · Status: `done`
- `docs/collection-guide/ar.md` and `en.md`: what the owner collects from a
  client and in what form: facade render, a plan per floor (image or PDF),
  a plan per unit type, the units sheet, logo and brand colours, WhatsApp
  number. Image size and format recommendations, naming rules, and a
  checklist. Plus `docs/collection-guide/units-template.xlsx` with the fixed
  columns and two example rows.
- Acceptance: both languages say the same thing; the template passes the
  U-102 schema in a test.
- Verify: `npm test`.

---

## Phase 2 · Demo villa

The demo villa is generated by code, so the generator knows every unit's
boundary and no drawing tool is needed for it. Layout: 3 storeys with a
courtyard (hosh).
- Ground floor: 2 units, each with its own part of the courtyard.
- First floor: 2 units.
- Roof: 1 annex and a roof terrace.

That is 5 units with mixed statuses (available, reserved, sold). Drawings are
clean architectural SVG, not photos.

### U-201 Villa geometry model
- Phase 2 · Module `tools` · Depends on: U-101 · Gated: no · Status: `done`
- Deterministic geometry for the villa: plot, courtyard split, walls, rooms
  and unit outlines per floor, in a shared coordinate system. Output is plain
  data (no SVG yet).
- Acceptance: tests that unit outlines on a floor do not overlap, lie inside
  the plot, and that running twice gives identical output.
- Verify: `npm test`.

### U-202 Floor plan SVG renderer
- Phase 2 · Module `tools` · Depends on: U-201 · Gated: no · Status: `done`
- Render each floor (with courtyard on the ground floor) to SVG: walls, room
  labels, doors/windows as simple symbols, a north arrow and scale bar.
- Acceptance: snapshot tests of the SVG; files open in a browser.
- Verify: `npm test`.

### U-203 Facade SVG renderer
- Phase 2 · Module `tools` · Depends on: U-201 · Gated: no · Status: `done`
- Simple front elevation of the villa with one band per floor; the band
  outlines become the facade hotspots.
- Acceptance: snapshot test; band polygons line up with the drawing.
- Verify: `npm test`.

### U-204 Emit the demo-villa project
- Phase 2 · Module `tools` · Depends on: U-202, U-203, U-105 · Gated: no · Status: `done`
- `npm run generate:demo` writes `projects/demo-villa/`: config (facade →
  3 floors → units), SVG images, and `units.xlsx` with the 5 units and mixed
  statuses. Hotspot polygons come straight from the geometry.
- Acceptance: output passes the U-106 validator; regenerating produces no
  diff.
- Verify: `npm run generate:demo && npm run validate -- demo-villa && git diff --exit-code projects/demo-villa`.

### U-205 Demo villa in CI
- Phase 2 · CI · Depends on: U-106, U-204 · Gated: no · Status: `done`
- Add `npm run validate -- demo-villa` and the generator no-diff check to
  `npm run check` and CI.
- Verify: `npm run check`.

### U-206 Plan Phase 3 (viewer)
- Phase 2 · Docs · Depends on: U-205 · **Gated: yes** · Status: `done`
- Break Phase 3 into units in this file, using what Phases 1 and 2 actually
  produced. Include the Strategy-based scene renderer and the first viewer
  layout (the first viewer layout unit is gated).
- Verify: `npm run check`.

---

## Phase 3 · Viewer

Written by U-206 from what Phases 1 and 2 produced: `parseProjectConfig` and
`parseUnitsSheet` (`schema`), `createSceneTree`, scene stats and the unit
filter (`domain`), `UnitSource` / `XlsxFileSource` (`data-sources`), the
validator, and the generated `projects/demo-villa` (facade → 3 floors →
5 units, SVG images). The viewer is server-rendered Next.js pages with small
client components for interaction; project data is read on the server.

### U-301 Project loader
- Phase 3 · Module `data-sources` · Depends on: U-205 · Gated: no · Status: `done`
- `ProjectSource` interface (Adapter) with `load(slug)` returning the parsed
  config and unit rows; `FileProjectSource` reads `projects/<slug>/project.json`
  and its units through a `UnitSource`. Unknown slug and invalid data give a
  typed error, never a crash. Reused by the viewer pages and later by Google
  Sheets (Phase 5).
- Acceptance: tests on `projects/demo-villa` and on the `tools` fixtures
  (valid, missing slug, invalid config, invalid sheet).
- Verify: `npm test`.

### U-302 Serve project images
- Phase 3 · App route · Depends on: U-301 · Gated: no · Status: `done`
- Route handler `src/app/files/[slug]/[...path]` (kept outside `/p/` so it
  cannot clash with a scene id) that serves a project's
  images (`svg`, `png`, `jpg`, `webp`) with the right content type and cache
  headers. Rejects paths outside the project folder and other file types.
  Read the route handler guide in `node_modules/next/dist/docs/` first.
- Acceptance: tests for a served SVG, path traversal (`..`, encoded `%2e%2e`),
  an unknown slug and a disallowed extension.
- Verify: `npm test`, `npm run build`.

### U-303 Component test setup
- Phase 3 · Tooling · Depends on: none · **Gated: yes** · Status: `done`
- Add the minimum for React component tests (e.g. `@testing-library/react`
  with `jsdom` or `happy-dom`, justified in the PR) in `vitest.config.ts`,
  scoped so domain tests keep running in Node. One sample test in `viewer`.
- Acceptance: `npm test` runs both Node and DOM tests; CI time stays about the
  same.
- Verify: `npm run check`.

### U-304 Scene renderer Strategy and Image2DScene
- Phase 3 · Module `viewer` · Depends on: U-303 · **Gated: yes** · Status: `done`
- `SceneRenderer` interface and a registry keyed by the scene's `type`
  (`image-2d` now; `360` and `3d` plug in later without touching callers).
  `Image2DScene` draws the scene image with an SVG overlay in the image's
  pixel coordinates (`viewBox` = image size), so hotspots scale with the
  image. Unit hotspots are filled by status, scene hotspots by a neutral
  colour; both are focusable and expose `onSelect`.
- Acceptance: component tests: polygons match the config points, colour per
  status, unknown renderer type shows a clear fallback.
- Verify: `npm test`.

### U-305 First viewer layout
- Phase 3 · App + `viewer` · Depends on: U-301, U-302, U-304 · **Gated: yes** · Status: `done`
- Route `/p/[slug]` (root scene) and `/p/[slug]/[sceneId]`: header with logo
  and project name, the scene in the main area, a side panel area, a status
  legend. Arabic first (RTL) per `project.defaultLocale`. The home page links
  to `/p/demo-villa`. Desktop layout only; mobile comes in Phase 4.
- Acceptance: the demo villa facade renders with three floor hotspots in a
  production build; component tests for the layout pieces.
- Verify: `npm run check`, open the Vercel preview at `/p/demo-villa`.

### U-306 Status colours and legend
- Phase 3 · Module `viewer` · Depends on: U-304 · Gated: no · Status: `done`
- One palette for available / reserved / sold, readable on light images,
  with a legend that shows counts (from the U-104 stats) and does not rely on
  colour alone (labels and patterns or outlines).
- Acceptance: component tests for the legend counts; colour contrast noted in
  the PR.
- Verify: `npm test`.

### U-307 Hover card
- Phase 3 · Module `viewer` · Depends on: U-305 · Gated: no · Status: `done`
- On hover or keyboard focus: a unit hotspot shows code, type, bedrooms, area,
  price (project currency) and status; a scene hotspot shows the scene title
  and its available/reserved/sold counts.
- Acceptance: component tests for both card kinds and keyboard focus.
- Verify: `npm test`.

### U-308 Unit side panel
- Phase 3 · Module `viewer` · Depends on: U-305 · Gated: no · Status: `done`
- Clicking a unit opens its details in the side panel; the selection is in
  the URL (`?unit=G-01`) so it can be shared. Shows the plan image when the
  sheet has `plan_image`. With nothing selected, the panel shows the scene's
  summary (counts, price and area ranges).
- Acceptance: component tests; selecting and closing updates the URL.
- Verify: `npm test`.

### U-309 Scene navigation and breadcrumbs
- Phase 3 · App + `viewer` · Depends on: U-305 · Gated: no · Status: `done`
- Clicking a scene hotspot opens that scene; breadcrumbs (from
  `SceneTree.breadcrumbs`) lead back up. Unknown scene ids give a 404 page.
- Acceptance: facade → floor → unit and back works on the demo villa;
  component tests for breadcrumbs.
- Verify: `npm run check`, Vercel preview.

### U-310 Typical floor picker
- Phase 3 · Module `viewer` · Depends on: U-309 · Gated: no · Status: `done`
- For a typical floor scene, a floor selector (from the expanded floors) sets
  the concrete floor; unit codes and statuses follow the selected floor.
  Needs a small fixture project with a typical floor (not the demo villa).
- Acceptance: component tests on the fixture.
- Verify: `npm test`.

### U-311 Plan Phase 4 (sales tools)
- Phase 3 · Docs · Depends on: U-310 · **Gated: yes** · Status: `done`
- Break Phase 4 into units in this file, using what Phase 3 produced.
- Verify: `npm run check`.

---

## Phase 4 · Sales tools

Written by U-311 from what Phase 3 produced: routes `/p/<slug>` and
`/p/<slug>/<sceneId>` (`src/app/p/project-view.tsx`) that load a project
through `ProjectSource` and compose `ViewerLayout` slots (header, nav, scene,
legend, panel); `SceneStage` (client) with hover cards, unit selection in the
URL (`?unit=`) and the typical floor picker (`?floor=`) through
`useUrlParam`; `SidePanel` with unit details and the scene summary;
`computeSceneStats` and the pure `filterUnits` (`domain`); fixed ar/en wording
in `viewer/layout/viewer-text.ts`; `project.contact.whatsapp` in the config.
The viewer is desktop-only and uses the project's default locale.

### U-401 Locale switch (Arabic / English)
- Phase 4 · App + `viewer` · Depends on: U-310 · **Gated: yes** · Status: `done`
- A language toggle in the header. Pick how the locale is carried (e.g.
  `?lang=en` through `useUrlParam`, or a `/p/<slug>/en/...` segment) and say
  why in the PR. Default stays `project.defaultLocale`; `lang`/`dir` and every
  label, scene title and number format follow the chosen locale.
- Acceptance: component tests for both directions; switching keeps the
  current scene, floor and unit.
- Verify: `npm run check`, Vercel preview.

### U-409 Showcase scene styling (floor glow and floor card)
- Phase 4 · `viewer` · Depends on: U-310 · **Gated: yes** · Status: `done`
- The owner reviewed the viewer (2026-11-26): the flat look reads as a
  child's drawing. Clients expect a photoreal render with a polished overlay,
  so the next demo uses a real building photo (see U-410). This unit makes
  the overlay look premium on any image, photo or SVG:
  - The scene image fills the stage edge to edge on a dark page; header and
    breadcrumbs sit over it on a translucent bar.
  - Hotspots are invisible until hover or focus; the hovered shape gets a
    soft translucent fill in its status colour (scene hotspots use the brand
    colour) with a bright thin outline and a subtle glow.
  - The floor card (hover card for scene hotspots) is a dark rounded card:
    title, unit count, status chips with coloured dots (available /
    reserved / sold counts), a bedroom mix list (e.g. "2 bedrooms · 6
    units"), area range, price range, and a "click to view units" hint.
    The unit card uses the same style with the unit's own figures.
  - Bedroom mix comes from a pure `domain` function next to
    `computeSceneStats`, rolled up the tree like the status counts.
- Split (2026-11-26): the first bullet (edge-to-edge dark stage under a
  translucent bar) moved to U-411; this unit did the hotspots, the cards and
  the bedroom mix.
- Original styling only; take the idea from the reference, never its code.
  No new dependency unless the PR's Design section justifies it (plain
  SVG/CSS is expected to be enough; three.js is not needed for a 2D image).
- Acceptance: unit tests for the bedroom mix roll-up; component tests for
  the floor card content and hidden-until-hover hotspots; RTL and LTR.
- Verify: `npm run check`, Vercel preview.

### U-410 Photo demo project
- Phase 4 · `projects/demo-residence` · Depends on: none · Gated: no · Status: `done`
- A second demo, `projects/demo-residence`, built on a real building photo the
  owner picked from Pexels (free commercial licence, credited in its README):
  facade photo → 6 floors → 4 apartments per floor, 24 units. The landing page
  opens it. `demo-villa` stays as the generated test project. Never use
  images from reference sites.
- Done directly in the owner's project thread, ahead of U-409.
- Verify: `npm run validate -- demo-residence`, `npm run check`.

### U-402 WhatsApp enquiry button
- Phase 4 · Module `viewer` · Depends on: U-310 · Gated: no · Status: `done`
- In the unit details panel, a button that opens
  `https://wa.me/<number>?text=<message>` with `project.contact.whatsapp`
  (digits only) and a prefilled message in the current locale that names the
  project and the unit code (and floor for typical floors). A general
  "contact us" button in the header uses the same builder without a unit.
- Acceptance: unit tests for the link builder (encoding, Arabic text, number
  normalisation); component test that the panel button carries the unit code.
- Verify: `npm test`.

### U-411 Edge-to-edge dark stage
- Phase 4 · App + `viewer` · Depends on: U-409 · **Gated: yes** · Status: `done`
- Split from U-409. The scene image fills the stage edge to edge on a dark
  page; the project header and the breadcrumbs (with the floor picker) sit
  over the image on a translucent bar. The side panel and the status legend
  stay readable on the dark page (dark surface, the same contrast rules).
  `ViewerLayout` keeps its slots; only the frame and the styles change.
- Acceptance: component tests that the stage renders the scene full width
  with the header and nav inside the overlay bar, in RTL and LTR; the
  existing layout tests keep passing.
- Verify: `npm run check`, Vercel preview.

### U-403 Units table
- Phase 4 · App + `viewer` · Depends on: U-401 · Gated: no · Status: `done`
- Route `/p/<slug>/units`: every unit of the project in a sortable table
  (code, floor, type, bedrooms, area, price, status), with status shown as in
  the legend. A row links to the unit on its scene (`/p/<slug>/<sceneId>?unit=`
  plus `?floor=` for typical floors). Link to the table from the header.
- Acceptance: component tests for sorting and row links; works on the demo
  villa and the U-310 tower fixture.
- Verify: `npm run check`, Vercel preview.

### U-404 Table filters
- Phase 4 · Module `viewer` · Depends on: U-403 · Gated: no · Status: `done`
- Filter bar over the table using the `domain` `filterUnits` (status, type,
  bedrooms, price range, area range, floor). Filters live in the URL so a
  filtered list can be shared; "clear filters" resets them; an empty result
  says so.
- Acceptance: component tests for each filter and the URL round trip.
- Verify: `npm test`.

### U-405 Highlight filtered units on the scene
- Phase 4 · Module `viewer` · Depends on: U-404 · Gated: no · Status: `done`
- The same filters can be applied from the scene view: matching hotspots stay
  coloured, others are dimmed, and scene hotspots show how many matching
  units lie below them.
- Acceptance: component tests on the demo villa data.
- Verify: `npm test`.

### U-406 Mobile layout (responsive frame)
- Phase 4 · App + `viewer` · Depends on: U-401 · **Gated: yes** · Status: `done`
- Split in the run that took it: this unit is the frame; U-412 and U-413 do
  the touch interactions.
- Below the 768px breakpoint the side panel becomes a bottom sheet, the
  header compacts, the top bar sits above the scene instead of over it, the
  legend follows the scene and the page never scrolls sideways.
- Acceptance: component tests for the phone frame in RTL and LTR;
  Playwright check at phone width with no horizontal page scroll.
- Verify: `npm run check`, Vercel preview on a phone.

### U-412 Tap-to-show cards on touch screens
- Phase 4 · `viewer` · Depends on: U-406 · Gated: no · Status: `done`
- On touch input (pointer type `touch`), the first tap on a hotspot shows its
  card and marks it active; a second tap on the same hotspot opens it (scene
  or unit); a tap elsewhere hides the card. Mouse and keyboard keep today's
  behaviour.
- Acceptance: component tests for the tap sequence on a scene hotspot and a
  unit hotspot, and that mouse clicks still open on the first click.
- Verify: `npm test`.

### U-413 Pinch-zoom and pan of the scene on phones
- Phase 4 · `viewer` · Depends on: U-412 · Gated: no · Status: `done`
- Below the breakpoint the scene can be pinch-zoomed (1× to 3×) and panned,
  with hotspots and cards following the image; a reset button returns to 1×.
  No new dependency unless the PR's Design section justifies it.
- Acceptance: component tests for the zoom state (limits, reset) and that a
  hotspot tap still works after zooming; Playwright screenshot at phone width
  attached to the PR (not committed).
- Verify: `npm run check`, Vercel preview on a phone.

### U-407 Accessibility and keyboard pass
- Phase 4 · App + `viewer` · Depends on: U-413 · Gated: no · Status: `done`
- Keyboard order header → nav → scene → panel; visible focus on hotspots;
  Escape closes the unit panel; the hover card is announced; contrast of all
  text in both themes.
- Acceptance: component tests for Escape and focus order; findings and fixes
  listed in the PR.
- Verify: `npm test`.

### U-408 Plan Phase 5 (live status)
- Phase 4 · Docs · Depends on: U-407 · **Gated: yes** · Status: `done`
- Break Phase 5 into units in this file, using what Phase 4 produced. Phase 5
  needs a Google Sheets `UnitSource` and credentials; list in
  `docs/QUESTIONS.md` what the owner must provide (service account or
  published sheet, refresh interval).
- Verify: `npm run check`.

---

## Phase 5 · Live status

Written by U-408 from what Phase 4 produced: the viewer reads a project
through `ProjectSource` (`FileProjectSource` = `project.json` + an
`XlsxFileSource` for `units.xlsx`), and every view (scene, units table,
filters, cards, WhatsApp) only sees validated `UnitRow`s. Pages already
render per request inside Suspense (Cache Components is on). Phase 5 swaps
where the rows come from, without touching the viewer: a client edits a
Google Sheet and the site shows the new statuses shortly after.

### U-501 Units source in the project config
- Phase 5 · `schema` + `data-sources` · Depends on: U-407 · **Gated: yes** · Status: `done`
- Optional `units` block in `project.json`: `{ "source": "xlsx" }` (default,
  today's `units.xlsx`) or `{ "source": "google-sheet", "sheetId": "…",
  "gid": "0" }`. `FileProjectSource` picks the `UnitSource` from it through a
  small factory, so adding a source never changes the viewer.
- Acceptance: schema tests for both forms and bad input; factory tests;
  `docs/data-format.md` updated; demo projects unchanged.
- Verify: `npm run check`.

### U-502 Google Sheet source (shared by link)
- Phase 5 · `data-sources` · Depends on: U-501 · Gated: no · Status: `done`
- `GoogleSheetCsvSource` reads the sheet's CSV export
  (`https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=<gid>`)
  for a sheet shared as "anyone with the link can view", parses it with a
  small CSV reader (quotes, commas, newlines, UTF-8 Arabic) and validates the
  rows with the U-102 schema, reporting sheet row numbers like the xlsx source.
  Registered in `createUnitSource` (U-501); the validator CLI part is U-508.
- Acceptance: tests with a mocked `fetch` and CSV fixtures (Arabic statuses,
  quoted cells, an invalid row, HTTP error, a sheet that is not shared).
- Verify: `npm test`.

### U-508 Validator reads the configured units source
- Phase 5 · `tools` · Depends on: U-502 · Gated: no · Status: `done`
- Split from U-502. `npm run validate` picks its `UnitSource` from the
  config's `units` block through `createUnitSource` instead of always reading
  `units.xlsx`, and names the source in its findings (the file name for xlsx,
  "Google Sheet" for a sheet) instead of the fixed `units.xlsx` label.
  Read errors (`UnitSourceReadError`) become one finding.
- Acceptance: validator tests for an xlsx project (unchanged output), a
  Google Sheet project with an injected factory, and a sheet read error.
- Verify: `npm test`.

### U-503 Google Sheet source for private sheets (service account)
- Phase 5 · `data-sources` · Depends on: U-502 · **Gated: yes** · Status: `blocked`
- For clients who will not share the sheet by link: read it with the Google
  Sheets API v4 as a service account the client shares the sheet with.
  Credentials come from environment variables documented in `.env.example`,
  never from the repo.
- Blocked until the owner answers Q-2 in `docs/QUESTIONS.md`.
- Verify: `npm test`.

### U-504 Refresh interval and caching
- Phase 5 · App + `data-sources` · Depends on: U-502 · **Gated: yes** · Status: `done`
- Cache each project's unit rows for a refresh interval (default 60 seconds,
  overridable per project in `project.json`) with the Next.js cache APIs of
  this version (read `node_modules/next/dist/docs/` first), so visitors do not
  hit Google on every request and a status change shows within the interval.
  Uses 60 seconds until the owner answers Q-3.
- Acceptance: tests that rows are reused inside the interval and re-read
  after it (fake timers / injected clock).
- Verify: `npm run check`, Vercel preview.

### U-505 Keep the last good data when the sheet breaks
- Phase 5 · `data-sources` + `viewer` · Depends on: U-504 · Gated: no · Status: `done`
- If the sheet cannot be read or a client edit makes it invalid, keep serving
  the last valid rows and show a small "status may be out of date" note in the
  viewer; log the problems for the owner. Without any earlier good data, show
  the existing invalid-data message.
- Acceptance: tests for fetch failure, invalid edit after a good read, and
  first read failing.
- Verify: `npm test`.

### U-506 Client guide for the Google Sheet
- Phase 5 · Docs · Depends on: U-502 · **Gated: yes** · Status: `done`
- Add to `docs/collection-guide/ar.md` and `en.md`: how the client copies the
  units template into Google Sheets, shares it (per the Q-2 answer), which
  columns they may edit (status, price, notes) and which they must not
  (code, scene); and a ready-to-copy template link placeholder.
- Acceptance: both languages say the same thing (existing parity test).
- Verify: `npm test`.

### U-507 Plan Phase 6 (drawing tool)
- Phase 5 · Docs · Depends on: U-505, U-506 · **Gated: yes** · Status: `done`
- Break Phase 6 into units in this file, using what Phase 5 produced.
- Verify: `npm run check`.

---

## Phase 6 · Drawing tool

Written by U-507 from what Phase 5 produced: a project is `project.json`
(scene tree with polygon hotspots in image pixels, validated by
`parseProjectConfig`) plus images in `projects/<slug>/` and a units source
(`units.xlsx` or a Google Sheet) read through `createUnitSource`; the viewer
draws scenes with the `Image2DScene` Strategy and already zooms and pans
(`viewer/scene/zoom.ts`); `npm run validate` checks a whole project. Today the
owner writes hotspot points by hand. Phase 6 adds an internal editor in the
empty `editor` module to draw them on a real client image and export a valid
`project.json`, which the owner commits like any other project file. The
editor never writes to the server's disk and is off unless enabled.

### U-601 Editor route behind a switch
- Phase 6 · App + `editor` · Depends on: U-507 · **Gated: yes** · Status: `done`
- `/editor/<slug>` loads the project through `ProjectSource` and shows its
  scene list and the selected scene image (read-only for now). It answers 404
  unless `EDITOR_ENABLED=true`, documented in `.env.example`; Vercel leaves it
  unset, so the owner runs the editor locally with `npm run dev`.
- Acceptance: tests for the switch (enabled, disabled, unknown slug) and the
  scene list; the viewer routes are unchanged.
- Verify: `npm run check`.

### U-602 Polygon geometry helpers
- Phase 6 · `domain` · Depends on: U-507 · Gated: no · Status: `done`
- Pure functions the editor needs: clamp a point to the image, distance to
  the nearest vertex and edge, whether a click closes the polygon (near the
  first point), polygon area and self-intersection check, rounding points to
  whole pixels.
- Acceptance: unit tests for each, including degenerate polygons.
- Verify: `npm test`.

### U-603 Editor state with undo and redo
- Phase 6 · `editor` · Depends on: U-602 · **Gated: yes** · Status: `done`
- A pure reducer over an editable copy of the project config, with commands
  (Command pattern) for: start a hotspot, add a point, move a vertex, delete
  a vertex, close the polygon, delete a hotspot, set a hotspot target. Undo and
  redo replay the command history. No React in this unit.
- Acceptance: reducer tests for every command, undo/redo, and that a closed
  polygon has at least 3 points.
- Verify: `npm test`.

### U-604 Drawing canvas
- Phase 6 · `editor` · Depends on: U-601, U-603 · Gated: no · Status: `done`
- An SVG layer over the scene image: click to add points, click the first
  point to close, drag a vertex to move it, select a hotspot to delete it,
  Escape cancels the shape in progress, Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z undo
  and redo. Points are stored in image pixels whatever the zoom.
- Acceptance: component tests (testing-library) for drawing, closing,
  dragging, deleting and undo; existing hotspots render like the viewer.
- Verify: `npm run check`.

### U-605 Hotspot target picker
- Phase 6 · `editor` · Depends on: U-604 · Gated: no · Status: `done`
- For the selected hotspot, choose its target: a child scene, a unit code
  from the units source (listing units not yet drawn first), or a unit suffix
  on a typical floor. The hotspot id is suggested from the target.
- Acceptance: tests for each target form and for the "not yet drawn" list.
- Verify: `npm test`.

### U-606 Add a scene from a project image
- Phase 6 · `editor` · Depends on: U-605 · Gated: no · Status: `done`
- Add a child scene (kind, Arabic and English title, typical floor range)
  from an image already in `projects/<slug>/images/`; the editor reads the
  image width and height itself, so the owner never types them.
- Acceptance: tests for the scene form and image size reading (PNG, JPEG,
  SVG); the new scene passes `parseProjectConfig`.
- Verify: `npm run check`.

### U-610 Keep edits when switching scenes
- Phase 6 · `editor` · Depends on: U-606 · Gated: no · Status: `done`
- Added by U-606: today the scene list links reload `/editor/<slug>?scene=`
  and the workspace starts over from the saved config, so edits on one scene
  (and scenes added with U-606) are lost when the owner opens another. Keep
  one editor state for the whole session: the scene list switches scenes in
  the page (keeping `?scene=` in the URL), lists scenes from the edited
  config (new scenes included), and undo/redo spans scenes.
- Acceptance: component tests: draw on one scene, switch, come back, the
  shape is still there; an added scene appears in the list and opens.
- Verify: `npm run check`.

### U-607 Live validation in the editor
- Phase 6 · `domain` + `editor` · Depends on: U-610 · **Gated: yes** · Status: `done`
- Split by U-607's run: the export half is U-611.
- The editor shows the same problems `npm run validate` finds, as the owner
  edits, each linked to its scene and hotspot (a click opens the scene and
  selects the hotspot). The pure checks move from `tools` to `domain` so
  the CLI and the editor share one implementation.
- Acceptance: tests that the editor and `validateProject` report the same
  problems for the same data; tests for the links.
- Verify: `npm run check`.

### U-611 Download project.json from the editor
- Phase 6 · `editor` · Depends on: U-607 · **Gated: yes** · Status: `done`
- A "Download project.json" button that is enabled only when there are no
  errors. The file is formatted like the existing projects (defaults the
  schema fills in are left out) so diffs stay small.
- Acceptance: round-trip test (load the demo projects, export without edits,
  output equals the committed `project.json`); tests for blocked export.
- Verify: `npm run check`.

### U-608 Owner guide for the editor
- Phase 6 · Docs · Depends on: U-611 · Gated: no · Status: `done`
- `docs/editor.md`: from a client's images to a committed project with the
  editor (enable it, draw, pick targets, validate, download, commit).
- Verify: `npm test`.

### U-609 Plan Phase 7 (multi-client)
- Phase 6 · Docs · Depends on: U-608 · **Gated: yes** · Status: `todo`
- Break Phase 7 into units in this file, using what Phase 6 produced.
- Verify: `npm run check`.
