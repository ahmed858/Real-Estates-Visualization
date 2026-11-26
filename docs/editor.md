# Editor guide (owner)

The editor is an internal tool for turning a client's images into a
`project.json`: you draw the unit and floor shapes on the real images, pick
what each shape opens, check the project, and download the file. It runs on
your computer only; the editor never writes to the server and is off on
Vercel.

## 1. Prepare the project folder

1. Create `projects/<slug>/` (the slug is lowercase letters, digits and
   dashes, e.g. `palm-towers`).
2. Put every image in `projects/<slug>/images/`: the facade or masterplan,
   each floor plan, the logo, any unit plans. PNG, JPEG, SVG and WebP work.
   You never type image sizes; the editor reads them.
3. Add the units sheet: `units.xlsx` in the folder, or a `units` block that
   points at the client's Google Sheet (see
   [data-format.md](data-format.md#units-source) and the
   [collection guide](collection-guide/)).
4. Write a first `project.json` with the project block and only the root
   scene (no hotspots yet). The editor opens a project only when this file
   is valid:

   ```json
   {
     "schemaVersion": 1,
     "project": {
       "slug": "palm-towers",
       "name": { "ar": "أبراج النخيل", "en": "Palm Towers" },
       "defaultLocale": "ar",
       "currency": "EGP",
       "contact": { "whatsapp": "+201000000000" },
       "branding": { "logo": "images/logo.svg", "primaryColor": "#1a6b4f", "accentColor": "#c89b3c" }
     },
     "root": {
       "id": "facade",
       "kind": "facade",
       "title": { "ar": "الواجهة", "en": "Facade" },
       "image": { "path": "images/facade.jpg", "width": 1600, "height": 1200 }
     }
   }
   ```

   For this first file only, read the root image size from your image
   viewer; every later scene gets its size from the editor.

## 2. Start the editor

```bash
EDITOR_ENABLED=true npm run dev
```

Open `http://localhost:3000/editor/<slug>`. Without `EDITOR_ENABLED=true`
the page answers 404 (that is what Vercel does). If the project has a
problem the page lists it instead; fix it with `npm run validate -- <slug>`.

Edits live in the browser tab until you download them. Switching scenes in
the list keeps them; reloading or closing the tab loses them.

## 3. Add the child scenes

Under **Child scenes**, pick an image from the images folder, the kind
(`floor`, `building`, ...), the English and Arabic titles, and **Add scene**.
The id is suggested from the English title. For one plan that serves many
floors, tick **Typical floor** and give the floor range and the unit code
template, e.g. `{floor}{suffix}` makes floor 3, suffix `02` into unit `302`.
The new scene appears in the scene list; open it to draw on it.

## 4. Draw the shapes

- Click the image to place corners; click the first corner (or near it) to
  close the shape. Escape cancels the shape in progress.
- Click a shape to select it, drag a corner to move it, Delete removes the
  selected shape.
- Ctrl+Z / Cmd+Z undoes, Shift+Ctrl+Z / Shift+Cmd+Z redoes, across scenes.

## 5. Pick what each shape opens

Select a shape; under it, **Leads to** offers:

- **Scene**: a child scene of this scene (e.g. a floor band on the facade).
- **Unit**: a unit code from the units sheet. Units not yet drawn anywhere
  are listed first, so you can work down the list.
- **Unit suffix**: only on a typical floor; the suffixes come from the
  sheet's codes for that floor range.

The hotspot id is suggested from the target (`G-01` becomes `g-01`); you can
type your own. **Apply** sets both, as one undo step.

## 6. Check the project

The **Problems** panel shows what `npm run validate` would report, as you
edit: shapes without a target, units drawn but missing from the sheet,
sheet units not drawn, scenes no hotspot opens, missing images. Click a
problem to open its scene with its shape selected. Warnings are fine to
ship; errors are not.

## 7. Download and commit

When there are no errors, **Download project.json** is enabled. Replace
`projects/<slug>/project.json` with the downloaded file, then:

```bash
npm run validate -- <slug>
git checkout -b project/<slug> origin/develop
git add projects/<slug>
git commit -m "Add <slug> project"
git push -u origin project/<slug>
```

Open a pull request against `develop`. The file is formatted like the
other projects, so the diff shows only what you drew.
