# demo-villa

Generated project: a 3-storey villa with its courtyard (hosh), used for
development, tests and demos. Do not edit the files here by hand; change the
generator in `src/modules/tools/demo-villa/` and run:

```bash
npm run generate:demo            # writes project.json, units.xlsx, images/ and rotations/
npm run validate -- demo-villa   # must report no problems
```

Regenerating is deterministic, so `git diff projects/demo-villa` stays empty
unless the generator changed.

- Facade (south elevation) → ground, first and roof floors, and a "360° view"
  button that opens the turntable: a `rotation-360` scene of 24 generated
  frames (`rotations/turntable/`, one every 15°, frame 1 = south side, also
  the poster `images/turntable.svg`) with the four apartments drawn on every
  frame where their outer walls show.
- 5 units: `G-01`, `G-02` (ground, each with half of the courtyard), `F-01`,
  `F-02` (first), `R-01` (roof annex with terraces). Statuses are mixed:
  available, reserved and sold.
- The WhatsApp number `+201000000000` is a placeholder.
