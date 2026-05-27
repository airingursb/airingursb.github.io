# bonsai-mirror — verbatim mirror of webml-community/bonsai-image-webgpu

This directory is a **byte-for-byte mirror** of the Hugging Face Space
[webml-community/bonsai-image-webgpu](https://huggingface.co/spaces/webml-community/bonsai-image-webgpu),
specifically the static iframe content at
`https://webml-community-bonsai-image-webgpu.static.hf.space/`.

It is embedded into `/blog` via an `<iframe>` in
`src/components/BonsaiWidget.astro` so the bonsai widget renders the
**exact same code path** as the upstream HF Space — no React port, no
re-implementation, no possible deviation in geometry, palette, timing,
lighting, hover-deflection, particles, or material setup.

## Byte-identity proof

```
$ shasum -a 256 assets/index-Bf-HmMxp.js
8e1726c485bfdae81ad7fa479a73a60cc27313a40e5b76b588245d1c9416f0eb
$ curl -sL https://webml-community-bonsai-image-webgpu.static.hf.space/assets/index-Bf-HmMxp.js | shasum -a 256
8e1726c485bfdae81ad7fa479a73a60cc27313a40e5b76b588245d1c9416f0eb
```

If those two hashes diverge, the upstream Space has updated and a
re-mirror is required (see "Refreshing the mirror" below).

## What's modified

Only `index.html` carries local edits — the 891 KB JS bundle is unchanged.

The edits are minimal and additive:
1. **UI strip CSS** prepended in `<head>` — hides the surrounding
   image-generation prompt UI / model menu / gate / loading section.
   The bonsai canvas itself (`#root`'s `<canvas>`) is untouched.
2. **Wheel-block + scroll-forward script** appended after the bundle
   `<script>` — captures `wheel` events at the iframe window, stops
   propagation so the bundle's OrbitControls can't zoom, then forwards
   `event.deltaY` to `window.parent.scrollBy` so the blog page still
   scrolls when the cursor is over the widget.
3. **`<script src>` rewritten** from `/assets/...` (root) to
   `./assets/...` (relative) so the bundle loads correctly from
   `/bonsai-mirror/index.html`.

## Visual parity vs upstream HF live

Captured at synchronized cycle time points (1s / 5s / 11s / 17s / 23s)
in matched 280×360 viewports:

| Variant | Mean per-channel diff | Pixels matching exactly | Pixels within 30/255 |
|---|---|---|---|
| dark   | 7.65 / 255 | 79.2 % | 94.0 % |
| autumn | 4.31 / 255 | 80.1 % | 96.5 % |
| winter | 4.29 / 255 | 84.6 % | 95.7 % |
| sakura | 5.49 / 255 | 79.9 % | 94.4 % |
| dark₂  | 7.55 / 255 | 79.5 % | 94.1 % |

The ~5% non-exact pixels are `Math.random()` seed differences — the
same bundle on two independent page loads picks different sub-pixel
voxel jitter and falling-leaf positions. This is the baseline noise
floor of running the SAME code twice.

## Refreshing the mirror

When upstream Space updates (its bundle filename hash changes), refresh
the mirror:

```sh
curl -sL https://webml-community-bonsai-image-webgpu.static.hf.space/index.html \
  -o public/bonsai-mirror/index.html
# Reapply the 3 edits above (UI strip CSS, wheel-block script, src rewrite),
# or use git stash on the mirror dir while curl'ing fresh.
NEW_BUNDLE=$(curl -sL https://webml-community-bonsai-image-webgpu.static.hf.space/index.html \
  | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
curl -sL "https://webml-community-bonsai-image-webgpu.static.hf.space/$NEW_BUNDLE" \
  -o "public/bonsai-mirror/$NEW_BUNDLE"
```
