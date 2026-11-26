# Collection guide

What to collect from a client (a real estate developer) to build their Unit
Explorer project, and in what form. The Arabic version is
[ar.md](ar.md); both say the same thing. The exact data format the project is
built from is described in [../data-format.md](../data-format.md).

## What to collect

| # | Item | Form | Notes |
| --- | --- | --- | --- |
| 1 | Facade render (or masterplan for a compound) | Image | The first screen the buyer sees. One image per building for a compound, plus the masterplan. |
| 2 | Plan of every floor | Image or PDF | One plan per floor. A typical floor (the same plan on many floors) needs one plan and the floor range, e.g. floors 2 to 12. |
| 3 | Plan of every unit type | Image or PDF | Optional but recommended: shown when the buyer opens a unit. One plan per type, not per unit. |
| 4 | Units sheet | `.xlsx` from the template | One row per unit. Start from [units-template.xlsx](units-template.xlsx). |
| 5 | Logo | SVG, or PNG with a transparent background | At least 512 px wide for PNG. |
| 6 | Brand colours | Two hex codes | A primary and an accent colour, e.g. `#1a6b4f` and `#c89b3c`. Ask for the brand guide if there is one. |
| 7 | Sales WhatsApp number | International form | `+` then the country code and number, e.g. `+201001234567`. |
| 8 | Project name | Arabic and English | As it should appear on the site. |
| 9 | Currency | 3-letter code | e.g. `EGP`, `SAR`, `AED`. |

## Images

- **Format**: PNG or JPG for renders and scanned plans; SVG when the architect
  can export vector plans. A PDF plan is accepted; we convert it to an image.
- **Size**: at least 2400 px on the long side for the facade and floor plans,
  at least 1600 px for unit plans. Larger is fine; we compress for the web.
- **One image per file**: do not put several floors on one page or sheet.
- **Plans seen from above, straight**: no perspective, no rotation, with the
  same orientation (north up if possible) on every floor.
- **Clean**: no watermarks, no phone screenshots, no photos of printed paper.
- **Facade**: the floors must be visible and not hidden by trees or effects,
  because each floor becomes a clickable area.

## Units sheet

- Use [units-template.xlsx](units-template.xlsx). Keep the column names in row
  1 exactly as they are. Delete the two example rows before filling it in.
- One row per unit. Every unit drawn on a plan must have a row, and every row
  must be drawn on a plan.
- `code` is unique, and is the code written on the plan (e.g. `G-01` or `101`).
  The buyer sends it in the WhatsApp message.
- `status` is `available`, `reserved` or `sold`; the Arabic `متاح`, `محجوز`
  and `مباع` are accepted too.
- Numbers only in `floor`, `bedrooms`, `bathrooms`, `area_m2` and `price`: no
  units or currency signs (`145`, not `145 m²`).
- The client keeps editing the status in this sheet; the site follows it.

| Column | Required | Example |
| --- | --- | --- |
| `code` | yes | `G-01` |
| `scene` | yes | `ground` (the floor plan the unit is drawn on) |
| `floor` | yes | `0` for ground, `1` for first, `-1` for basement |
| `type` | yes | `Apartment`, `Duplex`, `Annex` |
| `bedrooms` | yes | `3` |
| `bathrooms` | yes | `2` |
| `area_m2` | yes | `145.5` |
| `price` | yes | `4250000` |
| `status` | yes | `available` |
| `plan_image` | no | `images/type-a.svg` |
| `notes` | no | `Garden view` |

## Naming rules

- File names in lowercase English letters, digits and dashes, no spaces or
  Arabic letters: `facade.jpg`, `floor-0.png`, `floor-1.png`,
  `type-a.pdf`, `logo.svg`.
- Floors are numbered: `floor-0` is the ground floor, `floor-1` the first,
  `floor-b1` the first basement, `roof` the roof.
- Unit type plans are named after the type: `type-a`, `type-b`, `duplex`.
- Unit codes in the sheet match the codes written on the plans exactly.

## How to send

- One shared folder (Google Drive, Dropbox or a zip file) per project, with
  every file at the top level, named by the rules above.
- The units sheet as a `.xlsx` file, not a photo or a PDF.

## Checklist

- [ ] Facade render (or masterplan), at least 2400 px
- [ ] A plan for every floor, or for each typical floor with its floor range
- [ ] A plan for every unit type (recommended)
- [ ] Units sheet filled in from the template, one row per unit
- [ ] Logo as SVG or transparent PNG
- [ ] Primary and accent brand colours
- [ ] Sales WhatsApp number in international form
- [ ] Project name in Arabic and English
- [ ] Currency
- [ ] Files named by the naming rules
