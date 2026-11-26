# Test fixtures

- `valid-project/`: a complete small project (config, images, `units.xlsx`)
  that passes `npm run validate`. Its `units.xlsx` is a copy of
  `src/modules/data-sources/__fixtures__/units-english.xlsx`.

The failure cases in `validate-project.test.ts` copy this project to a
temporary folder and change one thing each.
