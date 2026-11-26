# Data format

Every client project lives in `projects/<slug>/` and has a project config, its
images and a units sheet. The project config is defined in U-101.

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
