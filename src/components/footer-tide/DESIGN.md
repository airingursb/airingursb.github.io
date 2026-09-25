# Blog shoreline

## Reference and scope

Preserve the Blog's existing ArchiveBookcart, years and footer links. This is a
small closing illustration beneath the links on `/blog/` and `/en/blog/`, not a
second feature section or a replacement for the personal homepage garden.
The generated shoreline uses the original `public/bear-study/poster.png` brown
bear identity. Reference art and H3 provenance live in
`output/h3-blog-delights-20260924/tide/`.

## Tokens and composition

Maximum 300px wide, about 100px high; center it with 16px top margin and retain
the footer's existing gutters. No card, border, caption, visible controls or
status bubble. Stepped dark-brown outline #48382d, warm fur #a77448, cream
#f4e2b9, coral #d89987, muted water #88a6b2 and sand #c6ad81. Production frames
have clean alpha on both white and #0d1117; no blend mode or white matte.

## Interaction contract

After 1.8 seconds of visible dwell, play one complete H3 wave and reveal its
shell. The shell is a native 44px minimum transparent button. Activation plays
H3's stand, walk, pick up, listen, replace and return-to-rock performance once;
ignore repeated presses while busy. The original shell remains in place after
the action. No artificial perpetual loop or reversing the character performance.
Return to the authored calm seated pose, with small water/blink idle if available.

Consulted beui.dev `button` source on 2026-09-24: use native focus and reduced
motion, avoiding layout shift and hover dependence. The visible scene remains
unframed; keyboard focus uses the root `--accent`. Interaction is a novel staged
video performance, not a scaled button or a generic CSS ripple.

## Runtime and accessibility

Only load motion atlases near the footer. Pause time offscreen or in background
tabs; resume the exact gesture rather than reset its wait. Dispose observers and
animation frames on Astro navigation. Reduced motion stays on a calm poster and
uses a still listening pose for activation. Missing assets keep a coherent poster
and never block footer navigation. All decorative pixels are aria-hidden; the
shell has Chinese/English accessible names. No audio or video controls.

## Verification

Inspect first/middle/last frames, shell continuity and edges in light/dark themes;
verify wave→shell→listen→return and rapid taps, offscreen/background pausing,
375/768/1280 layouts and keyboard activation. No React hydration or new libraries.
Root owns shared build, real-browser final QA and tests/checklist integration.
