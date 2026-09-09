# Trail editor

An in-app, drag-to-place editor for the Levels map's stones, curve shape, and
biome-transition seams — everything that used to be hand-tuned `[x%, y%]`
tuples in `LevelsView.tsx` is now data the app reads, and this tool is how
you edit that data without guessing at coordinates.

It's also meant to be the first of several: see [Future: a general game
editor](#future-a-general-game-editor) at the bottom before building the
next one.

## Quick start

```bash
npm run dev
```

Open `http://localhost:1420/?trailEditor=true`, or from a running dev build
open the [debug panel](../../INSTALL.md#debug-panel) (`?debug=true`) and
click **Open Trail Editor** under its "Trail editor" section. Like the debug
panel, this only exists in dev builds — see [Production
footprint](#production-footprint).

The toolbar (top-left, drag its title bar to move it out of the way) gives
you:

- **View** — Portrait/Landscape, independent of your actual window
  orientation, so you can edit either without resizing anything.
- **Jump** — pick a region and tile and scroll straight to it.
- **Snap** — drags jump in fixed pixel steps (default 25px) instead of
  smooth/free movement, for lining stones up deliberately.
- **Selection info** — coordinates of whatever's selected, a mist-color
  swatch when a seam is selected, and add/remove-point buttons.
- **Reset region / Reset all** — discard edits back to what's on disk.
- **Save to disk** — see [Saving](#saving).

## What you can edit

| Thing | How | Notes |
|---|---|---|
| A stone (level marker) | Drag it, or arrow keys to nudge (Shift = snap size) | Locked levels are draggable in edit mode even though they're `disabled` for real play |
| The curve through a point | Drag its two Bezier tangent handles (shown when the point is selected) | Handles start mirrored (drag one, the other follows) for a smooth point. **Alt-drag** breaks the mirror into an independent "corner" handle, same convention as Illustrator/Figma's pen tool |
| Curve resolution between two stones | Select a stone → **+ Add point after** inserts a path-only waypoint (shapes the curve, isn't a level) → drag it, give it its own handles, or **Remove point** | |
| A biome-transition seam | Drag its orange center handle to shift it, its green edge handle to resize it, or set its mist color | Both are pixel deltas layered on the seam's geometric midpoint, not absolute positions — they stay registered as the layout reflows with window size |

Everything reuses the same live map players see — there's no separate mock
canvas, so what you see while editing is exactly what ships.

## Data model

Everything lives in [`src/data/trailLayout.json`](../../src/data/trailLayout.json),
shaped by [`src/data/trailLayout.ts`](../../src/data/trailLayout.ts):

```
{
  stones:       { portrait: {...}, landscape: {...} }  // per-region [x%, y%] per level
  stoneHandles: { portrait: {...}, landscape: {...} }  // sparse: only points you've dragged
  pathPoints:   { portrait: {...}, landscape: {...} }  // curve-only points, keyed by region
  transitions:  [ { id, mistColor, imageLandscape?, landscape?, portrait? } ]
}
```

Anything absent (no explicit handle, no override) falls back to the same
auto-computed default the *original* hardcoded version used, so loading a
region you've never touched renders pixel-identical to before this tool
existed. `src/trail/trailEditing.ts` holds every pure function behind that —
tile expansion, percent↔pixel conversion, the Bezier path builder, transition
span/center resolution — each covered in `trailEditing.test.ts` specifically
so the "no edits = identical output" guarantee has a test, not just a
comment.

One data-model detail worth knowing: a region with more levels than one tile
normally *loops* the same 10 stone positions across every tile (see
`expandToTileCount`). The moment you edit anything in that region, the editor
materializes explicit positions for every tile so your edit only affects the
tile you're looking at — it won't silently reappear elsewhere.

## Saving

There's no "export" step. A dev-only Vite middleware
(`trailEditorSavePlugin` in [`vite.config.ts`](../../vite.config.ts),
`apply: "serve"` so it's absent from `build`/`build:web` entirely) exposes
`POST /__ws-trail-editor/save`. **Save to disk** posts the full layout there,
it's validated and written straight to `trailLayout.json`, and Vite's own
watcher hot-reloads it back into the page. Review the diff and commit it
like any other source change when you're happy — there's no other database
or export format to keep in sync.

## Production footprint

Like the [debug panel](../../INSTALL.md#debug-panel), the trail editor is
fully dead-code-eliminated from production builds — `LevelsView.tsx` only
ever holds the always-needed read-only rendering path (stones, handles,
path-points, and transitions all still flow through it, since edits there
affect what every player sees); the entire interaction layer (drag state,
`TrailEditorToolbar`, every handle marker) lives in `TrailEditorOverlay.tsx`,
lazily imported behind the same `import.meta.env.DEV ? lazy(...) : null`
shape the debug panel uses. That's what lets Rollup drop the chunk
outright rather than just skip rendering it: `npm run build:web` produces
no `TrailEditorOverlay`-anything file at all, and grepping every production
JS/CSS chunk for `TrailEditor`, `__ws-trail-editor`, or any editor-only
class name comes back empty. `LevelsView`'s own chunk actually shrank
slightly versus its pre-editor baseline (data-driven rendering plus a tiny
`Suspense` mount point is less code than the original hardcoded constants).

`TrailEditorOverlay` talks back to `LevelsView` through a portal: the two
components share the same `stones`/`stoneHandles`/`pathPoints`/`transitions`
state (owned by `LevelsView`, passed down with its setters) and the same
computed `waypoints`, but the overlay's actual DOM — drag handles, curve
guides, seam controls — is portaled into `LevelsView`'s own `.ws-trail__map`
node (via a ref) so it shares that element's exact scroll-relative
coordinate space. Only `TrailEditorToolbar` (a fixed-position panel, not
map content) renders directly in the overlay's own React position.

## Future: a general game editor

This was scoped narrowly (stones, curve, seams) but the pieces are already
generic enough to reuse for other hand-tuned data in the game — garden plant
layout, achievement banner staging, category theme art placement, anything
else currently expressed as a hardcoded constant a human eyeballed into
place. The reusable shape, if you're building the next one:

1. A JSON data file + typed wrapper under `src/data/`, with every field
   optional and defaulting to today's hardcoded behavior — so shipping the
   file never changes anything until someone actually edits it.
2. Pure, tested editing helpers in a `src/<domain>/` module — no React, no
   DOM — the same way `trailEditing.ts` has zero framework coupling and is
   trivial to unit-test in isolation from drag/pointer mechanics.
3. A `?xEditor=true`-style flag in `src/debug/debugMode.ts`, gated the same
   way as everything else there.
4. A dev-only save endpoint. If a second editor shows up, promote
   `trailEditorSavePlugin`'s single-purpose middleware into one generic
   `POST /__ws-editor/save/:target` in `vite.config.ts` rather than
   hand-rolling a new route per tool.
5. The always-shipped/lazy-overlay split from [Production
   footprint](#production-footprint): keep the read-only data flow (the
   part every player's bundle needs) in the host component, and put the
   entire interaction layer — drag state, toolbar, handle markers — behind
   its own `import.meta.env.DEV ? lazy(...) : null` component, portaled
   back into the host's DOM node where it needs to render. `LevelsView` /
   `TrailEditorOverlay` is the reference example; copy that shape rather
   than re-deriving it.

A single **Editor** entry point that lists every registered `?xEditor`
module (this one included) is the natural next step once there's a second
one to list.
