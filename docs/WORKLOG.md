# Work log

One line per agent run, newest last:
`<YYYY-MM-DD HH:MM UTC> | <unit-id or "-"> | <outcome> | <PR link or note>`

2026-11-26 07:40 UTC | Phase 0 | Foundation: Next.js app, module boundaries, CI, CLAUDE.md, backlog for Phases 1-2 | set up interactively with the owner
2026-11-26 08:12 UTC | U-101 | Project config schema (Zod), tree rules, tests, docs/data-format.md; gated, waiting for owner | https://github.com/ahmed858/Real-Estates-Visualization/pull/3
2026-11-26 08:15 UTC | U-102 | Units sheet schema: fixed columns, Arabic/English status, row+column errors, docs; gated, waiting for owner | https://github.com/ahmed858/Real-Estates-Visualization/pull/4
2026-11-26 08:26 UTC | U-105 | UnitSource interface, XlsxFileSource (read-excel-file), xlsx fixtures and tests | https://github.com/ahmed858/Real-Estates-Visualization/pull/6
2026-11-26 08:28 UTC | U-103 | SceneTree index: lookup, children, parent, breadcrumbs, typical floor expansion, unit codes | https://github.com/ahmed858/Real-Estates-Visualization/pull/7
2026-11-26 08:33 UTC | U-106 | npm run validate: config, sheet, unit codes both ways, referenced files, warnings | https://github.com/ahmed858/Real-Estates-Visualization/pull/11
2026-11-26 08:39 UTC | U-104 | Scene stats by status with price/area ranges rolled up the tree; pure unit filter | https://github.com/ahmed858/Real-Estates-Visualization/pull/12
2026-11-26 09:31 UTC | U-107 | Collection guide in Arabic and English, units-template.xlsx, template and parity tests; gated | https://github.com/ahmed858/Real-Estates-Visualization/pull/14
2026-11-26 09:33 UTC | U-201 | Villa geometry: plot, courtyard split, 5 units, rooms, merged walls, doors and windows; deterministic | https://github.com/ahmed858/Real-Estates-Visualization/pull/15
2026-11-26 09:37 UTC | U-202 | Floor plan SVGs: rooms, walls, doors/windows, bilingual labels, north arrow, scale bar; file snapshots | https://github.com/ahmed858/Real-Estates-Visualization/pull/16
2026-11-26 09:40 UTC | U-203 | Facade SVG: south elevation, one band per floor, band polygons as hotspots, file snapshot | https://github.com/ahmed858/Real-Estates-Visualization/pull/17
2026-11-26 09:42 UTC | U-204 | npm run generate:demo writes projects/demo-villa (config, SVGs, deterministic units.xlsx); validator clean | https://github.com/ahmed858/Real-Estates-Visualization/pull/18
2026-11-26 09:46 UTC | U-205 | npm run check:demo (regenerate, validate, no-diff) in npm run check and CI | https://github.com/ahmed858/Real-Estates-Visualization/pull/19
2026-11-26 09:47 UTC | U-206 | Phase 3 broken into U-301..U-311 (loader, image route, component tests, renderer Strategy, layout, legend, hover card, side panel, navigation, typical floors, plan Phase 4); gated | https://github.com/ahmed858/Real-Estates-Visualization/pull/20
2026-11-26 09:49 UTC | U-301 | ProjectSource adapter + FileProjectSource with typed not-found/invalid errors | https://github.com/ahmed858/Real-Estates-Visualization/pull/21
2026-11-26 09:51 UTC | U-302 | /files/<slug>/<path> serves project images (svg/png/jpg/webp), traversal-safe, traced for Vercel | https://github.com/ahmed858/Real-Estates-Visualization/pull/22
2026-11-26 09:53 UTC | U-303 | Vitest node + dom projects, @testing-library/react + happy-dom, ViewerMessage sample; gated | https://github.com/ahmed858/Real-Estates-Visualization/pull/23
2026-11-26 09:55 UTC | U-304 | SceneRenderer Strategy registry, SceneView, Image2DScene with status-coloured focusable hotspots; gated | https://github.com/ahmed858/Real-Estates-Visualization/pull/24
2026-11-26 10:33 UTC | U-305 | /p/<slug>[/<sceneId>] viewer layout: branded header, scene stage, side panel, status legend, RTL per defaultLocale; gated | https://github.com/ahmed858/Real-Estates-Visualization/pull/25
2026-11-26 10:33 UTC | U-306 | Status palette (3:1+ contrast), dashed outline for reserved, hatch for sold, legend swatches and per-scene counts | https://github.com/ahmed858/Real-Estates-Visualization/pull/26
2026-11-26 10:36 UTC | U-307 | Hover/focus card: unit facts with price in project currency, scene title with status counts; onHover on the renderer contract | https://github.com/ahmed858/Real-Estates-Visualization/pull/27
2026-11-26 10:39 UTC | U-308 | Side panel: unit details with plan image and notes from ?unit=, scene summary otherwise; URL-backed selection hook | https://github.com/ahmed858/Real-Estates-Visualization/pull/28
2026-11-26 10:43 UTC | U-309 | Scene hotspots navigate, breadcrumbs back up, bilingual not-found page for unknown project/scene | https://github.com/ahmed858/Real-Estates-Visualization/pull/29
2026-11-26 10:46 UTC | U-310 | Typical floor picker: ?floor= in the URL, unit codes/statuses/cards/selection follow the floor; tower fixture | https://github.com/ahmed858/Real-Estates-Visualization/pull/30
2026-11-26 10:48 UTC | U-311 | Phase 4 broken into U-401..U-408 (locale switch, WhatsApp, units table, filters, scene highlight, mobile, a11y, plan Phase 5); Phase 3 finished; gated | https://github.com/ahmed858/Real-Estates-Visualization/pull/31
2026-11-26 10:50 UTC | U-401 | Locale switch: ?lang= read on the server, header toggle keeps scene/floor/unit, scene links carry lang; gated | https://github.com/ahmed858/Real-Estates-Visualization/pull/32
2026-11-26 17:58 UTC | U-409 | in progress | -
