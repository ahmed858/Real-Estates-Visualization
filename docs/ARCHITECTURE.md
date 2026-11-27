# Architecture

One Next.js app (App Router, TypeScript, Tailwind) split into modules with
strict boundaries. Not a monorepo: it keeps setup and every CI run light. If
the viewer later needs to ship as an embeddable widget, `viewer` is extracted
into a package at that point.

## Modules (`src/modules/<name>`)

Each module has one job and one public entry point, `index.ts`. Nothing outside
a module imports its internal files.

| Module | Job | May depend on |
| --- | --- | --- |
| `schema` | Data shapes for project config and the units sheet, and their validation. | nothing |
| `domain` | Pure logic: scene tree, typical-floor expansion, floor stats, filters, colour contrast and the status palette, project validation checks (shared by `npm run validate` and the editor). No React, no I/O. | `schema` |
| `data-sources` | Read unit rows from a spreadsheet behind one `UnitSource` interface (.xlsx file now, Google Sheets later), and whole projects (config + units) behind `ProjectSource`. | `schema`, `domain` |
| `viewer` | React components: scene image, coloured polygons, hover card, side panel, navigation. | `schema`, `domain` |
| `editor` | Internal polygon drawing tool for real client images. | `schema`, `domain`, `viewer` |
| `tools` | Node scripts: validate a project, generate the demo villa. | `schema`, `domain`, `data-sources` |

`src/app` (routes) wires modules together and may import any module's public
index. The table is enforced by `scripts/check-boundaries.mjs`, run by
`npm run lint`. Adding a module means adding it to `ALLOWED` there and to this
table in the same PR.

## Project data (`projects/<slug>/`)

Each client project is a folder: a config file (scene tree, hotspots, branding),
its images, and a units sheet. The exact format is defined in Phase 1 and
documented in the collection guide.

## Core patterns

- **Composite** for the scene tree: every scene is an image with hotspots; a
  hotspot targets a child scene or a unit. Works for a single villa, a tower,
  a compound or a mix. A "typical floor" lets one plan serve a range of floors.
- **Strategy** for scene rendering: `Image2DScene` now; `Rotation360Scene` and
  `Model3DScene` later, without changing the tree or the data.
- **Adapter** for unit sources: `XlsxFileSource` (demo) and
  `GoogleSheetSource` (clients) implement the same `UnitSource` interface.
