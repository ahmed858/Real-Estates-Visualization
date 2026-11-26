# Data format

Every client project lives in `projects/<slug>/` and has:

- `project.json`: the project config described below (validated by
  `parseProjectConfig` in `@/modules/schema`).
- Images referenced by the config (paths are relative to the project folder).
- A units sheet, described under [Units sheet](#units-sheet).

To draw the hotspots on real client images instead of typing points, use the
editor: see [editor.md](editor.md).

Unknown fields are rejected, so a typo such as `hotspot` instead of `hotspots`
is reported instead of silently ignored. Every error has a **path** from the
config root (for example `root.children[0].hotspots[1].target.scene`) and a
**reason**.

## Project config

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Format version. Always `1` for now. |
| `project` | object | yes | Project information, see below. |
| `units` | units source | no | Where unit rows come from, see [Units source](#units-source). Missing means the local `units.xlsx`. |
| `root` | scene | yes | The top scene of the tree (usually the facade or masterplan). |

### `project`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `slug` | id | yes | Folder name and URL part, e.g. `demo-villa`. |
| `name` | localized text | yes | Project name in Arabic and English. |
| `defaultLocale` | `ar` \| `en` | yes | Language shown first. |
| `currency` | string | yes | 3-letter ISO 4217 code, e.g. `EGP`, `SAR`, `AED`. |
| `contact.whatsapp` | string | yes | Sales WhatsApp number in international form: `+` then 8 to 15 digits, e.g. `+201001234567`. |
| `branding.logo` | file path | yes | Logo image, e.g. `images/logo.svg`. |
| `branding.primaryColor` | hex colour | yes | 6-digit hex, e.g. `#1a6b4f`. |
| `branding.accentColor` | hex colour | yes | 6-digit hex, e.g. `#c89b3c`. |

### Units source

The optional `units` block picks where unit rows are read from. Exactly one
of these forms:

| Form | Fields | Description |
| --- | --- | --- |
| `{ "source": "xlsx" }` | none | The `units.xlsx` in the project folder. Same as leaving `units` out. |
| `{ "source": "google-sheet", "sheetId": "…", "gid": "0" }` | `sheetId` (required): the id from the sheet link `docs.google.com/spreadsheets/d/<sheetId>/edit`, letters, digits, `-` and `_`, at least 20 characters. `gid` (optional, default `"0"`): the tab number from the link's `#gid=<number>`, as a string. `refreshSeconds` (optional, default `60`, whole seconds from 10 to 3600): how long the site reuses the rows before reading the sheet again. | A Google Sheet with the same columns as the [units sheet](#units-sheet), shared as "Anyone with the link can view". The site reads the tab's CSV export; row numbers in error messages are the sheet's row numbers. A sheet that is not shared is reported with how to share it. |

Paste the id, not the whole link: a full URL in `sheetId` is rejected.

A status change in the sheet shows on the site within `refreshSeconds`. Each
server instance keeps its own copy, so Google sees at most one read per tab
per interval per instance. A failed read is not kept; the next visitor's
request tries again. Meanwhile, if the sheet was read correctly before, the
site keeps showing those last good rows with a small "Unit status may be out
of date" note and logs the problems on the server (Vercel runtime logs). If
the sheet has never been read correctly, the invalid-data page lists the
problems.

### Scene

A scene is an image with hotspots drawn on it. Scenes nest: a scene's
`children` are the scenes its hotspots open (Composite pattern). The same shape
covers a single villa (facade → floors), a tower (building → typical floor) and
a compound (masterplan → buildings → floors → unit plans).

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | id | yes | Unique across the whole project. |
| `kind` | enum | yes | `facade`, `masterplan`, `building`, `floor`, `unit-plan` or `other`. |
| `type` | enum | no | Renderer. Defaults to `image-2d`, the only one in v1. 360° and 3D renderers will be added as new values. |
| `title` | localized text | yes | Shown in navigation and breadcrumbs. |
| `image.path` | file path | yes | The scene image. |
| `image.width` | positive integer | yes | Image width in pixels. Hotspot points use this coordinate system. |
| `image.height` | positive integer | yes | Image height in pixels. |
| `floors` | typical floors | no | Only on `kind: "floor"`. One plan that serves a range of floors, see below. |
| `hotspots` | hotspot[] | no | Defaults to none. |
| `children` | scene[] | no | Child scenes. Defaults to none. |

### Hotspot

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | id | yes | Unique within its scene. |
| `points` | `[x, y][]` | yes | Polygon in image pixels, at least 3 points, every point inside the image (`0 ≤ x ≤ width`, `0 ≤ y ≤ height`). |
| `target` | object | yes | Exactly one of the forms below. |

Target forms:

- `{ "scene": "<scene id>" }`: opens another scene. The scene must exist and
  must not be the hotspot's own scene.
- `{ "unit": "<unit code>" }`: opens a unit from the units sheet. Not allowed
  on a typical floor.
- `{ "unitSuffix": "<suffix>" }`: only on a typical floor. The unit code is
  built per floor from the floor's `unitCode` template.

### Typical floors

A tower often repeats one plan on many floors. Instead of one scene per floor,
a floor scene declares:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `floors.from` | integer | yes | First floor number (0 for ground, negative for basements). |
| `floors.to` | integer | yes | Last floor number, `≥ from`. |
| `floors.unitCode` | string | yes | Template containing `{floor}` and `{suffix}`, e.g. `{floor}{suffix}` gives `7A` for suffix `A` on floor 7. |

Its hotspots use `{ "unitSuffix": "A" }`. Expanding a typical floor into
concrete floors and unit codes is done by the `domain` module (U-103).

### Value formats

- **id**: lowercase letters, digits and single dashes, e.g. `ground-floor`.
- **localized text**: `{ "ar": "...", "en": "..." }`, both non-empty.
- **file path**: relative to the project folder, no leading `/` and no `..`.

## Example

```json
{
  "schemaVersion": 1,
  "project": {
    "slug": "demo-villa",
    "name": { "ar": "فيلا تجريبية", "en": "Demo Villa" },
    "defaultLocale": "ar",
    "currency": "EGP",
    "contact": { "whatsapp": "+201001234567" },
    "branding": { "logo": "images/logo.svg", "primaryColor": "#1a6b4f", "accentColor": "#c89b3c" }
  },
  "root": {
    "id": "facade",
    "kind": "facade",
    "title": { "ar": "الواجهة", "en": "Facade" },
    "image": { "path": "images/facade.svg", "width": 1600, "height": 1000 },
    "hotspots": [
      { "id": "ground", "points": [[100, 700], [1500, 700], [1500, 950], [100, 950]], "target": { "scene": "ground" } }
    ],
    "children": [
      {
        "id": "ground",
        "kind": "floor",
        "title": { "ar": "الدور الأرضي", "en": "Ground floor" },
        "image": { "path": "images/ground.svg", "width": 1600, "height": 1200 },
        "hotspots": [
          { "id": "g-01", "points": [[50, 50], [780, 50], [780, 1150], [50, 1150]], "target": { "unit": "G-01" } }
        ]
      }
    ]
  }
}
```

## Checking a project

`npm run validate -- <slug>` checks `projects/<slug>/` and prints every problem
with its file and location:

- `project.json` is valid (all rules above), and the units sheet is valid
  (rules below). The units are read from where the `units` block points:
  `units.xlsx`, or the Google Sheet (read over the network, so the sheet must
  be shared by link). Findings name it `units.xlsx` or `Google Sheet`.
- Every unit drawn by a hotspot exists in the sheet, and every sheet unit is drawn on a scene.
- Every referenced file exists: logo, scene images, `plan_image`.
- Warnings (do not fail): a child scene that no hotspot opens; a sheet `scene`
  that does not exist or differs from the scene the unit is drawn on.

It exits with code 1 when there are errors and 0 when there are only warnings.

## Units sheet

One spreadsheet (first sheet), one row per unit, validated by
`parseUnitsSheet` in `@/modules/schema`. Row 1 is the header. Every error
names the **sheet row number** and the **column**, e.g.
`row 4, price: must be a number`.

### Columns

Column names are fixed; their order and letter case do not matter.

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | text | yes | Unique unit code, e.g. `G-01` or `101`. Numbers are read as text. Used by hotspots and the WhatsApp message. |
| `scene` | scene id | yes | Id of the floor scene the unit is drawn on, e.g. `ground`. |
| `floor` | whole number | yes | Floor number: `0` ground, negative for basements. |
| `type` | text | yes | Unit type, e.g. `Apartment`, `Duplex`, `Annex`. |
| `bedrooms` | whole number ≥ 0 | yes | Number of bedrooms. |
| `bathrooms` | whole number ≥ 0 | yes | Number of bathrooms. |
| `area_m2` | number > 0 | yes | Area in square metres. |
| `price` | number ≥ 0 | yes | Price in the project currency. |
| `status` | status | yes | `available`, `reserved` or `sold`, in English or Arabic (see below). |
| `plan_image` | file path | no | Unit plan image, relative to the project folder, e.g. `images/type-a.svg`. |
| `notes` | text | no | Free text. |

### Value rules

- **Numbers** may be typed as numbers or as text. Thousands separators
  (`4,250,000`), spaces and Arabic-Indic digits (`١٤٥٫٥`) are accepted.
- **Scene id**: lowercase letters, digits and single dashes.
- **File path**: relative to the project folder, no leading `/` and no `..`.
- **Blank rows** are skipped.
- **Unknown columns** are ignored with a warning; a column that appears twice is
  an error.
- **Duplicate codes**: a code used twice is an error on the second row.

### Status spellings

Letter case, extra spaces, Arabic diacritics and tatweel are ignored.

| Status | Accepted spellings |
| --- | --- |
| `available` | `available`, `متاح`, `متاحة`, `متاحه` |
| `reserved` | `reserved`, `محجوز`, `محجوزة`, `محجوزه` |
| `sold` | `sold`, `مباع`, `مباعة`, `مباعه`, `تم البيع` |

### Example

| code | scene | floor | type | bedrooms | bathrooms | area_m2 | price | status | plan_image | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G-01 | ground | 0 | Apartment | 3 | 2 | 145.5 | 4250000 | متاح | images/type-a.svg | Garden view |
| G-02 | ground | 0 | Apartment | 3 | 2 | 150 | 4400000 | sold | | |
