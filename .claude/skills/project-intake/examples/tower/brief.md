# Brief: Nile Tower (example)

**What the client sent**

- `facade.jpg` (1600 x 2400): the tower from the street, 12 storeys.
- `floor-0.png`, `typical.png`, `floor-11.png` (2000 x 1400 each): plans of
  the ground floor, the repeated floor and the penthouse floor.
- Type plans: `shop.png`, `type-01.png` … `type-04.png`, `penthouse.png`.
- A price list: 2 shops, 4 apartments on each of floors 1 to 10, 2 penthouses.

**What the client said**

> Ground floor is two shops. Floors 1 to 10 are identical, four apartments
> each, numbered floor + 01..04 (e.g. 701). Floor 11 has two penthouses,
> PH-1 and PH-2.

**Navigation path (confirmed)**

```text
Tower → click the band of floors 1-10 → pick floor 7 in the floor picker → click 703
Tower → click the ground floor → click S-01
Tower → click the top floor → click PH-2
```

**How it maps**

- Root: `tower`, kind `building`, three hotspots (penthouse band, one band
  covering floors 1 to 10, ground band).
- `typical`: one `floor` scene with `floors: { from: 1, to: 10, unitCode: "{floor}{suffix}" }`
  and hotspots targeting `unitSuffix` `01` … `04`. 40 units, one scene.
- `ground` and `penthouse`: ordinary floors with fixed `unit` targets.
- `units.csv`: 44 rows; the typical units list `typical` as their scene.
