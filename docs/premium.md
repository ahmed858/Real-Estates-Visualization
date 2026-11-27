# Premium scenes guide (owner)

Two premium views can sit next to the 2D scenes of a project:

- **360° rotation** (`rotation-360`): a turntable of the building, a series of
  pictures taken or rendered around it. The visitor drags (or uses the
  slider) to turn it, and the units are shapes drawn on the frames.
- **3D model** (`model-3d`): a model the visitor orbits. Each unit is a named
  part of the model, coloured by its status.

Both keep the scene's normal picture as the **poster**: it shows while the
premium view loads, on devices that cannot show it, in link previews and in
the editor's scene list. A premium scene is always also a working 2D scene.
The field reference is in [data-format.md](data-format.md#premium-scenes);
this guide is the order of work.

## 1. What to ask for

### 360° rotation

Ask the client (or their renderer / photographer) for:

- **Frames**: 24 or 36 pictures around the building at equal steps (every
  15° or 10°), all from the same height and distance, the building centred,
  in turning order. 2 to 360 frames are accepted; 24 to 36 turn smoothly.
- **Size**: every frame the same size, 1600 to 2000 px wide, JPG (WebP also
  works). Each frame must be **2 MB or less**; the site does not serve larger
  files.
- **Naming**: numbered in order, e.g. `frame-01.jpg` … `frame-36.jpg`. The
  number is zero-padded to the digits of the count (`01` for 24 or 36 frames,
  `001` for 120 frames).
- **Poster**: one picture for the scene image, usually a copy of the first
  frame (any size; its shapes are drawn separately).

### 3D model

Ask the 3D artist for:

- **Format**: one glTF binary file (`.glb`), **30 MB or less**. Textures
  embedded, compressed if possible.
- **One named node per unit**: every unit the visitor can open is its own
  object (node) in the model, named after the unit code, e.g. `Unit_G-01` or
  `G-01`. Parts of a unit (glass, balcony) may sit under that node. Floors or
  buildings that open another scene can be named nodes too.
- **Polygon budget**: about 100,000 triangles for the whole model, so it
  turns smoothly on phones; no hidden interior detail.
- **Scale and orientation**: real-world metres, Y up, the building standing
  on the origin. The viewer frames the camera on the whole model.
- **Poster**: a render of the model from the main angle, for the scene image.

## 2. Put the files in the project folder

```
projects/<slug>/
  images/tower-poster.jpg         poster (scene image)
  rotations/tower/frame-01.jpg    rotation frames (any folder under rotations/)
  …
  models/tower.glb                3D models (only under models/)
```

## 3. Add the scene

Open the parent scene in the editor and use the **Child scenes** form
([editor.md](editor.md#3-add-the-child-scenes)):

- **Shown as** `360° rotation`: pick the frames folder under `rotations/`.
  The editor fills `frames`, `count` and the frame size from the files and
  refuses a folder whose frames are not numbered 1 to n (zero-padded to the
  digits of n: `frame-01` .. `frame-36`), use more than one name pattern, or
  differ in size.
- **Shown as** `3D model`: pick the `.glb` file under `models/`.
- In both cases the picked image is the scene's poster.

Then draw a hotspot on the parent scene that opens the new scene (target
**Scene**). The hand-written form of these scenes is in
[data-format.md](data-format.md#premium-scenes).

Then open the scene in the editor
(`EDITOR_ENABLED=true npm run dev`, `/editor/<slug>?scene=<id>`):

- **Rotation**: use the frame strip. Draw each unit on the first frame where
  it shows, then **Copy to next frame** and nudge it with the arrow keys
  (Shift for 10 px), frame by frame. Leave a unit out of the frames where it
  is hidden (**Remove from this frame**). Draw the poster shapes on
  **Poster**. Details: [editor.md](editor.md#rotation-360-scenes).
- **Model**: the **Model meshes** list shows the node names from the file.
  **Link** each unit's node and pick its unit in the target picker. Redraw
  the placeholder square on the poster around the unit if you want it on the
  poster too. Details: [editor.md](editor.md#3d-model-scenes).

Download `project.json` and replace the project's file, as for any edit.

## 4. Check it

- The editor's **Problems** panel, then `npm run validate -- <slug>`: missing
  frames or model, files over 2 MB / 30 MB, polygons on frames that do not
  exist, points outside a frame, and units that are not in the sheet.
- Open the scene on the site (`npm run dev`, `/p/<slug>/<scene-id>`):
  - Rotation: drag across the picture and use the slider; every frame shows
    and the units follow the building. `?frame=12` in the link opens that
    frame.
  - Model: it loads, units are green / orange / red by status, clicking one
    opens its panel, and the unit list under the view works with the
    keyboard. On a phone, check that it turns smoothly.
- Try a link with the poster only: a device without WebGL (or a failed model
  load) must still show the poster and the unit list.

The demo project has a generated turntable to try: open `/p/demo-villa`,
then **360° view**.
