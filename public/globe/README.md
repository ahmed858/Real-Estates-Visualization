# Globe data

`countries-110m.json` is the country shapes of the globe intro
(`/p/<slug>/explore`): Natural Earth 1:110m Admin 0 countries as TopoJSON,
copied unchanged from the `world-atlas` npm package, version 2.0.2.

- Natural Earth data is in the public domain (naturalearthdata.com, "No
  permission is needed to use Natural Earth").
- `world-atlas` is published under the ISC licence, Copyright 2013-2019
  Michael Bostock:

  > Permission to use, copy, modify, and/or distribute this software for any
  > purpose with or without fee is hereby granted, provided that the above
  > copyright notice and this permission notice appear in all copies.

The globe texture is painted in the browser from these shapes
(`src/modules/viewer/globe/world-texture.ts`); no map imagery or tiles are
used. About 108 KB, 39 KB gzipped, loaded only by the intro after first paint.

To update: `npm pack world-atlas@<version>`, extract it and copy
`package/countries-110m.json` here.
