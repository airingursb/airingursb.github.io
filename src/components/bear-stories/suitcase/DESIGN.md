# The suitcase — acceptance preview

## Reference and scope

This is idea 5 of the root `DESIGN.md` Four bear stories contract. The original
`public/bear-study/poster.png` and `public/photo-motion/photographer-poster.png`
are the character reference: stepped dark-brown outline, warm fur, cream muzzle,
coral cheeks, no clothing except a small sage accessory. The scene belongs in
the existing neutral Photos page. No production route is changed.

The complete destination is the catalogued `2024 New Zealand` album (19 photos).
Shanghai has only one photo and no album, so using New Zealand preserves the
real album flow. The model creates only a fictional miniature town; photographs
and exact catalog metadata remain original DOM images and links.

## Atmosphere and material

A compact well-travelled sage case is waiting beside the brown bear. On opening,
the bear tugs twice at its stiff clasp; a paper-and-wood miniature town rises from
inside: folded roofs, a red autumn tree, a blue shore and a small train. Its
material transformation is authored by MiniMax H3, never simulated with CSS boxes.
The restful open still is the exploration surface. Selecting a quiet object
reveals a real photo below it. Packing away folds the world back into the case.

## Tokens

Site chrome uses root `--c-bg`, `--c-bg-alt`, `--c-text`, `--c-text-muted`,
`--c-text-dim`, `--c-border`, `--accent`, and `--font-mono` only. Art palette:
outline #48382d, fur #a77448, sage #91ac89, cream #f4e2b9, cheek #d89987,
water #88a6b2, autumn #a9654b. An opaque neutral bounded art background is allowed
only if alpha extraction harms character edges; preferred output uses clean alpha.
Spacing: 4/8/12/16/20/24/32/40/48/64px. Type: inherited site sans; heading
40px desktop / 32px mobile, body 16px, actions 14px, metadata 12px mono.

## Layout and primitives

- Reuse `BaseLayout` and `SiteHeader`; noindex acceptance route. Page shell 1200px,
  48px desktop and 20px mobile gutters. Bilingual path-based routes: `/previews/bear-suitcase/` and `/en/previews/bear-suitcase/`.
- Case entry: 280px by 158px framed-by-whitespace illustration, semantic single
  button over the case clasp and bear. No border, playback UI or caption overlay.
- Expanded world: native dialog, maximum 880px; central 640px by 360px stage.
  16px mobile insets; scene scales to available width. Scene objects have separate
  44px minimum buttons, visible keyboard focus and no hovering requirement.
- Photo detail: original responsive image; title only if catalogued; exact date,
  camera and place metadata; direct photo link. The same stable region changes
  selected photo without nesting a modal.
- Album action: native anchor to `/photos/albums/2024-new-zealand/`.
- Pack action and Escape return to the compact case; Escape is always immediate.
- Reviewer explanation stays outside the artwork and out of production behavior.

## Motion and state

Interaction reference: read beui.dev `center-morph-modal` source on 2026-09-16.
Adapt its center-origin presence, focus return and reduced-motion path to native
dialog. Native dialog supplies focus containment. Opening chrome uses 200ms
opacity/scale, micro feedback uses 150ms color. H3 owns the folding performance.
Scene states: closed → opening → open → closing → closed. One-shot actions do
not queue. All controls to exit remain operable during loading or playback.
H3 frame atlases are decoded only on request and stop offscreen or in a background
tab. No autoplay on page load, no sound, no video controls, no perpetual loops.
Reduced motion opens directly on the complete still; all photos remain usable.
Media errors also use the complete still; no broken image state blocks content.

## Accessibility and content

All scene targets are native buttons with localized accessible names; touch
targets never overlap at 375px. The dialog has a labelled heading, close button,
live status, keyboard photo selection and focus return. Original photographs
retain their catalog image URLs. Missing titles use the catalog slug rather than
inventing a caption. Date formatting retains catalog UTC times explicitly.
Both light and dark modes must show complete artwork without white matte halos.
No-JS visitors can open the real album from the ordinary page link.

## Verification and accepted scope

Inspect first, middle and last motion frames, transparency against white and
#0d1117, and image extremities. Exercise open → each object → photo link → album
link → pack; Escape while opening and while a photo is selected; keyboard, touch,
375/768/1280px, reduced motion and image failure. Parent owns the shared build,
preview server and root checklist integration. This preview adds one complete
destination; further destinations are future authored stories, not fake options.
