# Backlog

Ordered work units. The hourly agent takes the **first** unit whose status is
`todo`, whose dependencies are all `done`, and that has no open `[agent]` PR.
Only Phases 1 and 2 are broken down; later phases stay as headlines until the
agent proposes their breakdown in a gated planning unit.

**Statuses** (as they read on `develop`): `todo` · `done` · `blocked` (question
in `docs/QUESTIONS.md`).

A unit's PR sets its status to `done`, so the unit only reads `done` on
`develop` once that PR is merged. While the PR is open (a draft means a run is
working on it; a gated PR waits for the owner), the unit is taken: no other
run picks it, and units that depend on it wait.

**Gated** units change something the rest of the project builds on. Their PR is
opened **without auto-merge**, and every unit that depends on them waits until
the owner merges. Non-gated PRs use GitHub auto-merge and merge when CI passes
(if auto-merge is unavailable, the next run merges them once CI is green). A PR
that changes `CLAUDE.md`, `.github/` or the module rules is always gated.

Each unit lists: phase, module, dependencies, gated, acceptance criteria and
verification commands. `npm run check` must pass for every unit.

## Roadmap

| Phase | Name | Outcome |
| --- | --- | --- |
| 0 | Foundation | App skeleton, rules, CI, this backlog. **done** |
| 1 | Data shape | Project and sheet formats, validator, collection guide. |
| 2 | Demo villa | Generator for a 3-storey villa with courtyard and its units sheet. |
| 3 | Viewer | Image + coloured shapes, hover cards, side panel, villa → floor → unit navigation. |
| 4 | Sales tools | Units table with filters, WhatsApp button with unit code, Arabic/English, mobile. |
| 5 | Live status | Site re-reads the sheet continuously (Google Sheets for clients). |
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
- Phase 1 · Module `domain` · Depends on: U-102, U-103 · Gated: no · Status: `todo`
- Join units to scenes; per-scene counts by status (rolled up the tree), price
  and area ranges; pure filter function (status, type, bedrooms, price range,
  area range, floor).
- Acceptance: unit tests including roll-up from floors to facade.
- Verify: `npm test`.

### U-105 UnitSource interface and .xlsx reader
- Phase 1 · Module `data-sources` · Depends on: U-102 · Gated: no · Status: `todo`
- `UnitSource` interface (Adapter) with `load(): Promise<UnitRow[]>`.
  `XlsxFileSource` reads the first sheet of a local `.xlsx` and returns rows
  validated by the U-102 schema. Choose a maintained xlsx library and justify it.
- Acceptance: tests read a small `.xlsx` fixture committed under
  `src/modules/data-sources/__fixtures__/`, including a sheet with Arabic
  status values and a sheet with an invalid row.
- Verify: `npm test`.

### U-106 Project validator CLI
- Phase 1 · Module `tools` · Depends on: U-101, U-102, U-105 · Gated: no · Status: `todo`
- `npm run validate -- <slug>` checks `projects/<slug>/`: config valid, sheet
  valid, every hotspot unit code exists in the sheet and every sheet unit is
  placed on some scene, every referenced image exists, polygons lie inside
  their image bounds and have at least 3 points. Prints a readable report;
  exits non-zero on errors, zero with warnings only.
- Acceptance: tests on small fixture projects for each failure type.
- Verify: `npm test`, run the CLI on a fixture.

### U-107 Collection guide (Arabic and English)
- Phase 1 · Docs · Depends on: U-101, U-102 · **Gated: yes** · Status: `todo`
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
- Phase 2 · Module `tools` · Depends on: U-101 · Gated: no · Status: `todo`
- Deterministic geometry for the villa: plot, courtyard split, walls, rooms
  and unit outlines per floor, in a shared coordinate system. Output is plain
  data (no SVG yet).
- Acceptance: tests that unit outlines on a floor do not overlap, lie inside
  the plot, and that running twice gives identical output.
- Verify: `npm test`.

### U-202 Floor plan SVG renderer
- Phase 2 · Module `tools` · Depends on: U-201 · Gated: no · Status: `todo`
- Render each floor (with courtyard on the ground floor) to SVG: walls, room
  labels, doors/windows as simple symbols, a north arrow and scale bar.
- Acceptance: snapshot tests of the SVG; files open in a browser.
- Verify: `npm test`.

### U-203 Facade SVG renderer
- Phase 2 · Module `tools` · Depends on: U-201 · Gated: no · Status: `todo`
- Simple front elevation of the villa with one band per floor; the band
  outlines become the facade hotspots.
- Acceptance: snapshot test; band polygons line up with the drawing.
- Verify: `npm test`.

### U-204 Emit the demo-villa project
- Phase 2 · Module `tools` · Depends on: U-202, U-203, U-105 · Gated: no · Status: `todo`
- `npm run generate:demo` writes `projects/demo-villa/`: config (facade →
  3 floors → units), SVG images, and `units.xlsx` with the 5 units and mixed
  statuses. Hotspot polygons come straight from the geometry.
- Acceptance: output passes the U-106 validator; regenerating produces no
  diff.
- Verify: `npm run generate:demo && npm run validate -- demo-villa && git diff --exit-code projects/demo-villa`.

### U-205 Demo villa in CI
- Phase 2 · CI · Depends on: U-106, U-204 · Gated: no · Status: `todo`
- Add `npm run validate -- demo-villa` and the generator no-diff check to
  `npm run check` and CI.
- Verify: `npm run check`.

### U-206 Plan Phase 3 (viewer)
- Phase 2 · Docs · Depends on: U-205 · **Gated: yes** · Status: `todo`
- Break Phase 3 into units in this file, using what Phases 1 and 2 actually
  produced. Include the Strategy-based scene renderer and the first viewer
  layout (the first viewer layout unit is gated).
- Verify: `npm run check`.
