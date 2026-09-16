# Shared footer garden — acceptance preview

## 1. Scope and references

Extends root `DESIGN.md` and the existing `BearGardenFooter` composition. The supplied
`public/bear-study/poster.png` and `public/bear-footer/poster.webp` are the identity and
scene references. This is an acceptance preview at `/previews/bear-garden/`, not a
production rollout. Keep the existing brown pixel bear, cream muzzle, coral cheeks,
dark stepped outline, sage objects, small bird, leafy tree, wooden bench and mailbox.

The memorable action is physical: the bear hauls an overfull watering can, its body
leans against the weight, a splash startles a bird, and the bear catches the tipping
flowerpot. H3 authors the body and liquid performance. DOM/TypeScript own controls,
network state and garden growth. No CSS-shake substitute.

## 2. Tokens

Inherit all site canvas/text/border/accent and font tokens. Scene art uses the root
bear palette: outline #48382d, sage #91ac89, cream #f4e2b9, coral #d89987, water
#88a6b2, wood #cba574. No new chrome colors. Existing 4px spacing grid; practical
gaps 8/16/24/32px. Frame 340×240 logical pixels, displayed at at most 340px desktop
and 300px mobile, with pixelated rendering and no enclosing card. Preview shell
1200px, gutters 48px desktop / 20px mobile. Footnote 12px/1.5; body 16px/1.8;
heading 28px/1.35. Footer title follows the current 24px footprint.

## 3. Composition and material

Use BaseLayout and SiteHeader. A short article-like introduction leads to a footer
with quiet existing-style text at left and the garden at right. On small screens,
copy stacks above the right-aligned scene. The canopy and ground remain a complete
illustration; no scores, invented people counts, badges, play controls, sound or
instruction bubbles inside it. A single discreet line below the scene describes
the actual shared preview state.

## 4. Primitives and states

- `GardenScene`: complete still, loading atlas, watering, resting, reduced-motion
  still, failed-media still. Same dimensions in every state.
- `WateringHotspot`: native 44px minimum button over the visible can; keyboard and
  touch activate the same action, visible accent focus ring, accessible localized
  name. Pending submissions coalesce. A repeated daily visit may replay the motion
  without adding a second watering.
- `GardenStatus`: visually hidden localized polite live region, truthful pending/
  recorded/already-watered/offline outcomes. Technical feedback is mirrored only
  into acceptance details. No success before a server response.
- `StageInspector`: native details outside the scene, labeled acceptance-only;
  switches seed/sprout/bud/bloom art without changing shared persistence.

The footer preview itself is the state harness for these primitives. Central QA
must exercise mobile/tablet/desktop before parent integration.

## 5. Interaction and motion

Read beui.dev `button` source on 2026-09-16. Adapt its explicit idle/loading/success/
error contract and reduced-motion branch, without its React dependency or label
morph. The authored character sequence is a novel sprite mechanism documented here:
pointer/keyboard activation starts one 15-second H3 clip; duplicate actions never
queue. Pause elapsed time when hidden or offscreen, then continue the same frame.
Reduced motion selects a static reaction and the persisted resting stage immediately.
Asset failure retains the complete still and usable watering action. No autoplay
ambience or audio. Stage changes settle at the next authored resting boundary.
Each image decode has an 8-second bound. The first shared-state request is reused
when a visitor clicks before it resolves, preserving one signed-cookie session.

V2 H3 camera drift is removed offline by SIFT correspondences on the stationary
tree canopy (at least 246 inliers per frame). The fixed first-frame environment
is restored around the genuine 232×124 moving region. Runtime frames are 340×240
at 10 fps for 15 seconds. Generated alpha plant sprites use a 72×72 cell anchored
at soil position (230,190), logical placement (194,128). Their stem follows the
authored flowerpot wobble at seconds 6.7–9.6; no body reaction is procedural.

## 6. Shared persistence

Acceptance API is isolated on port 4410, namespace `bear-garden-preview-v1`, backed
by SQLite in `output/bear-stories/garden/state/`. A signed HttpOnly cookie identifies
the browser; a unique namespace/visitor/day key and transaction enforce one accepted
watering per Singapore day. Stage thresholds are 0 seed, 1 sprout, 3 bud, 6 bloom.
Counts are real stored actions and remain out of the illustration. They are not
people counts. GET state is shared across browsers. Cookie rejection/unavailable
API reports the issue and never claims persistence. Stage-inspector actions write
nothing. No production API, migration or deployment is changed in this preview.

## 7. Accessibility and personas

Sighted touch visitor: can discover and activate the visible can, no timed failure.
Keyboard visitor: reaches the can and all preview controls with named focus targets.
Screen-reader visitor: hears accepted versus already-watered versus retry status.
Motion-sensitive visitor: complete still interaction with the same persisted result.
Chinese and English copy share all controls and states. Every image has empty alt
inside the named scene; useful controls and status remain HTML. No overflow at
375/768/1280px, no white matte on dark theme, all action extremes remain in frame.

## 8. Accepted preview limits and handoff

The SQLite service is a local acceptance runtime, not production persistence. Final
activation requires a server route plus transactional database migration and deploy
after user acceptance. Production daily identity is anonymous browser-level, not a
claim of verified human identity. Parent owns root design/checklist, full build and
cross-story QA. No shared manifest or production footer edits are made here.

## Revision 2 — matte and actual footer composition

The preview now mounts the real `BearGardenFooter` with a `scene` slot, not a copied footer. Exactly one garden is rendered. Its mailbox opens the same subscription details; the preview slot links to the live subscription form without sending preview email requests. Default slots preserve the production reading scene and form. The new watering art replaces the right-hand scene in this preview; a seamless reading-to-watering character transition is not yet implemented and is not claimed.

Neutral white-matte fringes are unmixed in a narrow band while retaining cream details and spatially supported cyan water highlights. The atlas uses one fixed RGB grid for all frames (maximum channel error 2/255, exact alpha), then lossless WebP. It is 2.72 MB and loads only after watering; the initial poster is 55 KB. Growth sprites keep their alpha and original warm flowers. Temporal screenshots, unit regression and real browser evidence are under `output/bear-stories/revision-2/garden/`. Aggregate grey-pixel counts are diagnostic only: protected water highlights and encoding palette differences make raw counts incomparable with the former lossy atlas.

A shared pot → seasonal keepsake → separate small garden is a proposal only. No farm, personal inventory or postcard feature is implemented.

## Revision 3 — original stage and a temporary care activity

The original `public/bear-footer/poster.webp` is now the locked composition contract.
Keep its tree, bench and mailbox coordinates and 340×240 frame. The pot sits on the
existing ground at (291,214), and its plant stem is anchored at (291,204). The can
rests beside the bench around (244,211). Generated props are isolated before reuse;
the original canopy, bench outline and mailbox remain source pixels. Only the area
previously hidden by the seated bear needs an empty-bench repair.

`GardenScene` now owns the original `BearFooterScene`, including its greeting,
reading-book and mailbox hotspots. One canvas and one fixed stage render both the
existing daily reading/greeting atlases and the new temporary watering atlas. The
new physical sequence closes the book, leaves it on the bench, climbs down, waters,
replaces the can, returns to the same seat, then opens the same book. It must end at
reading; no two-bear overlay or stage crossfade is an acceptable implementation.
The shared plant remains rooted in the same pot while reading and watering.

The original atlases are immutable. Garden assets use `public/bear-footer/garden-*`
paths. The optional `preview` prop explicitly enables shared API requests on 4410;
without that flag no shared activity is requested or implied. Motion and saving
are independent: reduced motion/media failure keep the original still and truthful
server feedback. Root integration/build and cross-scene QA remain parent-owned.
