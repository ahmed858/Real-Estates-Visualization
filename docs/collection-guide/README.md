# Collection guide

- [ar.md](ar.md): Arabic guide, sent to clients.
- [en.md](en.md): English guide, the same content.
- [units-template.xlsx](units-template.xlsx): the units sheet with the fixed
  columns and two example rows.

The "Live units sheet" section links to a Google Sheets copy of the template
through a placeholder, `https://docs.google.com/spreadsheets/d/TEMPLATE_SHEET_ID/copy`.
Before sending the guide, the owner uploads `units-template.xlsx` to Google
Sheets, shares it as "Anyone with the link can view" and replaces
`TEMPLATE_SHEET_ID` in both guides with its id. The `/copy` ending makes
Google offer "Make a copy" straight away.

`scripts/collection-guide.test.ts` checks that the template passes the units
sheet schema and that both guides have the same structure (headings, table
rows, list and checklist items). Change both guides in the same PR.

The template was written once with `write-excel-file@4.1.1` (not a project
dependency) by this script, run as `node gen.mjs <this folder>`:

```js
import writeExcelFile from 'write-excel-file/node'
const H = ['code','scene','floor','type','bedrooms','bathrooms','area_m2','price','status','plan_image','notes']
await writeExcelFile([
  H,
  ['G-01','ground',0,'Apartment',3,2,145.5,4250000,'available','images/type-a.svg','Example row, delete before filling in'],
  ['F-01','first',1,'Duplex',4,3,210,6100000,'محجوز',null,'Example row, delete before filling in'],
], { sheet: 'Units' }).toFile(`${process.argv[2]}/units-template.xlsx`)
```
