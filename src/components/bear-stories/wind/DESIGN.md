# A gust at the desk

## Contract and reference

This acceptance preview follows the root `DESIGN.md` Four bear stories contract.
The identity reference is `public/bear-study/poster.png`: stepped dark brown
outline, warm brown fur, cream muzzle, coral cheeks, sage objects, pale wooden
desk. The scene remains a compact object inside the homepage's editorial shell.
The memorable moment is the bear choosing between a falling cup and fluttering
pages, then finding its own small solution if nobody helps.

## Tokens and geometry

- Use existing `--c-bg`, `--c-text`, `--c-text-muted`, `--c-border`, `--accent`,
  and `--font-mono`; no new page palette or typeface.
- Scene logical grid: 320 × 192. Desktop width 288px, mobile width 248px.
  The original bear/desk retains approximately the 232/200px homepage scale;
  extra width belongs to the small window and flying-paper clearance. Keep the
  window behind-right, matching the homepage's established window side.
- Shell maximum 1200px, 20px mobile gutters, 4px spacing grid.
- Review-only title: 24px/1.5 serif; instructions: 12px/1.8 mono.
- Frame rate 12 fps. Scene motion is authored H3 performance, never CSS body
  transforms. Pixel edges use nearest-neighbor scaling.

## Primitives and states

`WindStory`: transparent atlas canvas plus a complete transparent poster.
States: entrance, gust, weighted, closed, self-resolved, resting, failed.
`SceneHotspot`: native transparent button, minimum 44px, named in Chinese and
English, 2px accent keyboard outline at 4px offset; no hover outline or tooltip.
`ReviewShell`: SiteHeader plus homepage-like location metadata and article rules,
with small instructions outside the scene. It is not a playback toolbar.

## Story and interaction

The entrance shows reading, a gust lifts loose pages, and the bear scrambles to
hold the book while protecting its cup. An actionable hold follows. The reader
may press the paperweight: the bear places it on the book and catches the cup.
Pressing the window closes the breeze: the bear relaxes, collects the page and
returns to reading. With no input, the bear resolves the mishap itself.

Interactions choose one outcome and coalesce repeated input. Once an outcome is
settled, the window may reopen to begin another small gust; no separate replay
control appears. Closing the window remains available to end the breeze.
The paperweight hit target follows its settled position on the book after that
outcome, including the reduced-motion and failed-media stills.

The beui.dev switch source was read on 2026-09-16. Reuse its semantic checked
state and immediate reduced-motion updates. This story's atlas branching is a
novel mechanism recorded here; no Motion dependency is needed.

## Accessibility and runtime

Completed outcomes remain alive using only their settled H3 tail: gust frames
166–179 (after the page lands), paperweight 151–179, closed window 150–179
(after the sigh disappears). At 12 fps, traverse the tail backwards from the
ending, hold the relaxed pose for 3 seconds, then forwards; every seam joins
adjacent source frames. This is quiet breathing/gaze motion, not event replay.
The window and paperweight keep their outcome and interactive hit targets.
No added images, CSS body scaling, timers that run offscreen, or automatic gusts.
The existing reduced-motion still and media-failure fallback take precedence.

Screen-reader visitors get native named buttons and a visually hidden polite
outcome announcement. Touch users have the same untimed choices as keyboard
users. Reduced motion retains still poses and usable choices, with no autoplay.
Pause authored time while outside the viewport or in a hidden tab. Atlas failure
retains the complete poster and semantic controls after at most 8 seconds. No audio or network generation
occurs in the browser. Cache is bounded to this story's three atlases.

## QA and accepted limits

Verify 375/768/1280px, light/dark matte edges and all extremities, both outcomes,
no-input resolution, Enter/Space, reduced motion, offscreen/background pause,
and failed asset fallback. Original site production components are untouched.
The preview has `/en/previews/bear-wind/`; its Astro component also has a lang prop.
This local Astro/canvas feature does not introduce React or modify shared tooling.
Generated motion quality and branch continuity require contact-sheet inspection
before acceptance; record any remaining limitations in the evidence report.


## Revision 2: repaired standalone scene

This route remains the original three-branch standalone scene. It does not reuse
`BearHomeStudy`, and it does not claim the homepage lamp, laptop, or curtain
interactions. Those production components remain untouched. The review copy
states this boundary explicitly in both languages.

The matte flood accepts only near-neutral, bright background pixels. Cream
paper, pot, muzzle, and speech-bubble interiors remain opaque. Two boundary passes
remove codec-colored fringe by recovering adjacent outline colors. Final atlas
encoding uses 256 palette entries followed by lossless WebP; decoded alpha is
verified against every processed frame.

Only the right-window strip (x=242..283, y=38..107) is repaired after keying. A
source-derived closed curtain stays indoors, in front of a separate pixel pane.
The pane's far edge is shorter than its hinge edge, indicating outward opening.
The window response closes this pane over frames 37..49 (3.0..4.0 seconds).
Connected fur and neighboring outline pixels preserve the reaching paw during
this change. All pixels outside the repair strip stay byte-identical to the
keyed source; H3 still owns the character and paper choreography.

Directly shifting the old actor into the homepage cuts the reaching arm or leaves
curtain fragments. Two new H3 event attempts also failed fixed-camera/matte QC.
Their source, prompt, task IDs, offline adapter, and comparison images are retained
under `output/bear-stories/revision-2/wind`; none is used by this route. Future
integration requires an isolated actor/paper pass made against the exact original
desk geometry, including a clean desk plate where the original bear/cup stood.

## Revision 3: one curtain and a visible casement hinge

Supersedes the revision-2 right-window geometry. The right curtain is removed;
the original left curtain remains the authored moving cloth. A fixed wooden
frame occupies x=197..259, y=42..103. Its right jamb is exposed. The open sash
projects left into the opening: right hinge x=257, y=48..97; shorter free edge
x=242, y=53..92. Closing brings that free edge to x=205, y=48..97 over source
frames 43..50, following the original reaching/pulling gesture. It never grows
outside the frame. Source-derived wood, sky and reflected-glass textures retain
the existing warm wood / dark brown contour / pale blue palette.

The repair bounds are x=194..283, y=38..107. Connected foreground masks retain
the moving left cloth, bear silhouette and foreground paper, including dark
contour and enclosed cream/coral details. Small cloth fragments separated by the
bear ear stay attached to the left-cloth mask; paper passing across the repair
region stays in front of the window. Everything outside these bounds stays identical to the
keyed source. Review all 540 frames, all three actual browser outcomes, light
and dark surfaces, and native and 3× pixel views before freezing the assets.
The parent integration owns any homepage scene selection; this art layer adds
no separate scene, controls, or video generation.
