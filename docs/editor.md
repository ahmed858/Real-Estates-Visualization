# Editor guide (owner)

The editor is an internal tool for turning a client's images into a
`project.json`: you draw the unit and floor shapes on the real images, pick
what each shape opens, check the project, and download the file. It runs on
your computer only; the editor never writes to the server and is off on
Vercel.

## 1. Prepare the project folder

1. Start the folder from the root image (the facade or masterplan photo):

   ```bash
   npm run new:project -- palm-towers ~/Downloads/facade.jpg
   ```

   This creates `projects/palm-towers/` with the image copied into
   `images/`, a `units.xlsx` copied from the collection guide's template and
   a starter `project.json` whose root scene already has the image size. The
   slug is lowercase letters, digits and dashes. It refuses a folder that
   already exists.
2. Replace the placeholders in `project.json`: the Arabic name
   (`اسم المشروع`), the WhatsApp number (`+200000000000`), the currency and
   the two brand colours; check the English name and titles.
3. Put the logo at `images/logo.svg` and every other image in `images/`:
   each floor plan, any unit plans. PNG, JPEG, SVG and WebP work. You never
   type image sizes; the editor reads them.
4. Replace the template rows in `units.xlsx` with the client's units, or
   point the `units` block at the client's Google Sheet (see
   [data-format.md](data-format.md#units-source) and the
   [collection guide](collection-guide/)).

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
