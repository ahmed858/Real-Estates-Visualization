# Test fixtures

Small `.xlsx` files read by `xlsx-file-source.test.ts`:

- `units-english.xlsx`: two sheets; the first (`Units`) has three valid units and a blank row, the second must be ignored.
- `units-arabic-status.xlsx`: Arabic statuses, numeric codes, Arabic-Indic digits, a thousands separator, columns in another order and case, no optional columns.
- `units-invalid-row.xlsx`: row 3 has a non-numeric `area_m2` and an unknown status.

They were written once with `write-excel-file@4.1.1` (not a project dependency) by this script, run as `node gen.mjs <this folder>`:

```js
import writeExcelFile from 'write-excel-file/node'
const out = process.argv[2]
const H = ['code','scene','floor','type','bedrooms','bathrooms','area_m2','price','status','plan_image','notes']
await writeExcelFile([
  { sheet: 'Units', data: [H,
   ['G-01','ground',0,'Apartment',3,2,145.5,4250000,'available','images/type-a.svg','Garden view'],
   ['G-02','ground',0,'Apartment',3,2,150,4400000,'reserved',null,null],
   [null,null,null,null,null,null,null,null,null,null,null],
   ['F-01','first',1,'Duplex',4,3,210,6100000,'sold',null,'Corner unit']] },
  { sheet: 'Other', data: [['code'],['not-read']] },
]).toFile(`${out}/units-english.xlsx`)
await writeExcelFile([
  ['Status','Code','Scene','Floor','Type','Bedrooms','Bathrooms','Area_m2','Price'],
  ['متاح',101,'typical',1,'شقة',2,1,'٩٥',1500000],
  ['محجوزة',102,'typical',1,'شقة',3,2,120,'1,900,000'],
  ['مباع',201,'typical',2,'شقة',2,1,95,1550000],
]).toFile(`${out}/units-arabic-status.xlsx`)
await writeExcelFile([
  H,
  ['G-01','ground',0,'Apartment',3,2,145.5,4250000,'available',null,null],
  ['G-02','ground',0,'Apartment',3,2,'big',4400000,'on hold',null,null],
]).toFile(`${out}/units-invalid-row.xlsx`)
```

CSV files in `google-sheet/`, as Google Sheets' CSV export would return them,
read by `google-sheet-csv-source.test.ts` (hand-written):

- `units.csv`: UTF-8 with a byte order mark and CRLF rows; Arabic type and
  statuses, a quoted price with thousands separators, a quoted note with a
  comma and one with a line break, Arabic-Indic digits.
- `units-invalid-row.csv`: row 3 has a non-numeric `area_m2` and an unknown status.
