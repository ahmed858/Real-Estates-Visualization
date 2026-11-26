# Data format

Every client project lives in `projects/<slug>/` and has:

- `project.json`: the project config described below (validated by
  `parseProjectConfig` in `@/modules/schema`).
- Images referenced by the config (paths are relative to the project folder).
- A units sheet (format defined in U-102).

Unknown fields are rejected, so a typo such as `hotspot` instead of `hotspots`
is reported instead of silently ignored. Every error has a **path** from the
config root (for example `root.children[0].hotspots[1].target.scene`) and a
**reason**.

## Project config

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Format version. Always `1` for now. |
| `project` | object | yes | Project information, see below. |
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

## Units sheet

Defined in U-102.
