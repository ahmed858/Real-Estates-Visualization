# Brief: Oasis Compound (example)

**What the client sent**

- `masterplan.jpg` (2400 x 1600): aerial view of the site with two blocks.
- `block-a.jpg` (1500 x 1600): aerial view of block A, four villas.
- `block-b.jpg` (1500 x 1000): block B, two apartment buildings.
- `b1-facade.jpg`, `b2-facade.jpg` (1200 x 1500): the two buildings.
- `apartment-floor-0.png`, `apartment-floor-1.png` (1800 x 1200): the floor
  plans, the same in both buildings.
- Villa plans `villa-standalone.png`, `villa-twin.png`; apartment plan
  `apartment-type-a.png`.
- A units sheet: villas A-01 … A-04, apartments B1-01 … B2-12.

**What the client said**

> Block A is villas: two standalone and one twin house (A-03, A-04). Block B
> is two small buildings of two floors, two apartments per floor.

**Navigation path (confirmed)**

```text
Masterplan → click Block A → click villa A-02 → villa card with its plan
Masterplan → click Block B → click Building B2 → click First floor → click B2-12
```

**How it maps**

- Branches have different depths: block A opens units directly (villas are
  units, their plans are `plan_image` in the sheet); block B goes through
  `building` and `floor` scenes.
- Both buildings reuse the same floor plan images in separate scenes
  (`b1-ground`, `b2-ground`, …), because each scene holds its own units.
- The buildings have only two floors each, so no typical floor is needed.
- `units.csv`: `scene` is `block-a` for villas and the floor scene id for
  apartments.
