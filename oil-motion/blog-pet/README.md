# Blog Pet (SHU-818) — oil-motion Pilot

Ink-wash panda desktop pet for article pages. Product lock + Pilot hard-gate for [oil-motion](https://github.com/oil-oil/oil-motion).

## Product lock

See [design spec](PRODUCT.md) and Linear SHU-818.

- Character: comics panda (Airing)
- Surface: `/posts/*` (not homepage — avoids IslandWidget)
- V1: pointer look · V2: scroll companion

## Layout

```
source/     concept-contract.yaml · motion-brief.yaml · identity-bible.md
pilot/      keyframes · video · approval.json · look-atlas.png
qa/         pilot-gate.md
```

Runtime: `src/components/BlogPetWidget.astro`  
Public assets: `/oil-motion/blog-pet/`

## Pilot artifacts

| Artifact | Path |
|---|---|
| K0 idle | `pilot/keyframes/K0-idle-front.png` |
| K1 look-left | `pilot/keyframes/K1-look-left.png` |
| K2 look-right | `pilot/keyframes/K2-look-right.png` |
| Atlas | `public/oil-motion/blog-pet/look-atlas.webp` |
| Morph clip | `public/oil-motion/blog-pet/pilot-K0-to-K1.mp4` |
| Approval | `pilot/approval.json` |

## Next (post-pilot)

1. Denser azimuth samples / true oil-motion video chain (Minimax) before calling V1 ship-complete
2. V2 scroll-progress pose track on the same identity
3. Decide fate of homepage pixel bear vs this panda as sole “main” pet
