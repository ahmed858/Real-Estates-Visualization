# Release notes: merging `develop` into `main`

`main` is production and only the owner merges into it. This file lists what
`develop` has that `main` does not yet have, so the owner knows what a merge
ships. Agent runs add a line under **Since the last release** for each unit
they merge; after the owner merges `main`, the next run moves those lines
under a dated heading in **Released** (or clears them) and starts again.

Last merge into `main`: PR #33 (up to U-401, the Arabic / English switch).

## Since the last release

### What a visitor sees

- **Showcase look:** edge-to-edge dark stage, floor glow and a floor card on
  hover (U-409, U-411), and a photo-based second demo, `demo-residence`.
- **Units table** at `/p/<slug>/units` with filters by status, type,
  bedrooms, floor, price and area; filtered units are highlighted on the
  scene too (U-403, U-404, U-405).
- **Phones:** responsive layout, tap to show a unit card, pinch-zoom and pan
  (U-406, U-412, U-413). Keyboard and screen reader pass (U-407).
- **Contact:** WhatsApp enquiry button (U-402) and an "Ask about this unit"
  lead form in the unit panel (U-805, U-810).
- **Sharing and comparing:** share link for a unit, compare up to 3 units
  side by side (U-801, U-802, U-808).
- **Unit photos** with a lightbox, and the project address with an "Open in maps" link
  (U-803, U-809, U-804).
- **Premium scenes:** 360° turntable with a slider and drag (U-903, U-910),
  3D model view with an image fallback when WebGL is missing (U-906). The
  demo villa has both: "360° view" and "3D model" buttons on its facade
  (U-904, U-1002).

### What a client gets

- **Live statuses from a Google Sheet** shared by link; the site refreshes
  every 60 seconds by default and keeps the last good data if the sheet
  breaks (U-501, U-502, U-504, U-505, U-508), with a bilingual client guide
  (U-506). Private sheets (service account) still wait on question Q-2.
- **Their own domain** opening only their project (U-706), their own page
  title, description and icon (U-702), and brand colours kept readable
  (U-703).
- **Hidden until ready:** a project can be `published: false` and shown only
  on preview deployments (U-704).
- **Leads** forwarded to the client's CRM webhook (U-805, docs/leads.md).

### What the owner gets

- **Project intake skill** (`.claude/skills/project-intake/`): hand an AI
  agent the client's images and description and it builds the project in any
  shape (tower, compound of blocks and villas, phases), asks the client what
  is missing, and validates the result. New scene kinds `phase`, `block`,
  `cluster`; `npm run units:from-csv` turns a CSV into `units.xlsx` (U-1201).
- **Editor** at `/editor/<slug>` (only with `EDITOR_ENABLED=true`, never on
  production): draw unit shapes, pick targets, add scenes (2D, 360° rotation
  or 3D model), live validation, undo and redo, download `project.json`
  (U-601 to U-611, U-905, U-907, U-1001; docs/editor.md, docs/premium.md).
- **`npm run new:project`** to start a client project (U-701), and a project
  directory on the home page (U-705).
- **Checks:** browser smoke tests in CI on every PR (U-1003), covering both
  demos, Arabic and English layouts and the compare page (U-1101), and the
  editor end to end, plus a check that it stays hidden on visitor servers
  (U-1102).

## Environment variables for production

Set these in Vercel (Project → Settings → Environment Variables) for the
Production environment before or right after merging. Details are in
`.env.example`.

| Variable | Production value |
| --- | --- |
| `EDITOR_ENABLED` | Leave **unset**. The editor must never be public. |
| `PREVIEW_PROJECTS` | Leave **unset** on production, so hidden projects answer 404. Set `true` only on a preview you share with a client. |
| `PROJECT_DOMAINS` | `host=slug` pairs for each client domain, e.g. `units.client.com=client-towers`. Add each domain to the Vercel project first. Empty if no client has a domain yet. |
| `LEAD_WEBHOOKS` | `slug=https-url` pairs for projects whose leads go to a CRM. A project without an entry shows no lead form. Secret: only in Vercel. |

## Checklist for the merge

1. Open the stable `develop` preview and click through: the demo villa's
   facade, a floor, a unit panel, the units table, "360° view" and
   "3D model"; switch to English and back.
2. Check the environment variables above in Vercel for Production.
3. Merge `develop` into `main` on GitHub (a merge commit, as for PR #33).
4. When Vercel has deployed `main`, open the production link and repeat a
   short version of step 1.
5. Tell the next agent run by noting the PR number here under "Last merge
   into `main`" (or leave it; the run reads `git log origin/main`).

## Released

Nothing since PR #33 yet.
