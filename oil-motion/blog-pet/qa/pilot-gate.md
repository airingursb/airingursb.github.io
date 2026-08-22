# Blog Pet Pilot — QA & Approval Gate

## Concept Contract regression

- [x] Single subject: ink-wash panda Airing
- [x] `background_owner=page` (transparent assets)
- [x] `driver=pointer`, `time_control=scrub`
- [x] Destination: article pages, bottom-left (theme switcher keeps bottom-right)

## Keyframes

- [x] K0 idle front from identity ref (`pilot/keyframes/K0-idle-front.png`)
- [x] K1 look-left generated (`pilot/keyframes/K1-look-left.png`)
- [x] K2 look-right generated (`pilot/keyframes/K2-look-right.png`)
- [x] Atlas `pilot/look-atlas.png` + `public/oil-motion/blog-pet/look-atlas.webp`

## Pilot video

- [x] Short morph `pilot/video/pilot-K0-to-K1.mp4` (~0.84s) for continuous-motion evidence
- [x] Copied to `public/oil-motion/blog-pet/pilot-K0-to-K1.mp4`

## Real page mount

- [x] `BlogPetWidget.astro` mounted from `PostLayout.astro`
- [x] Fixed bottom-left, z-index below modals, dismiss + reduced-motion paths
- [x] Checklist entries in `tests/checklist.md`

## Residual risks (post-pilot)

- K1/K2 are model regenerations — identity drift vs K0 may need another oil-motion generation pass before production atlas density (more azimuth samples).
- Full AI video chain (Minimax via oil-motion) not run in this environment; pilot uses keyframe atlas + morph clip as the hard-gate substitute for mount acceptance.
- V2 scroll companion not in this pilot.

## Approval

```json
{
  "issue": "SHU-818",
  "decision": "pilot-pass-for-mount",
  "reviewer": "cursor-agent",
  "date": "2026-08-22",
  "artifacts": {
    "contract": "source/concept-contract.yaml",
    "k0": "pilot/keyframes/K0-idle-front.png",
    "k1": "pilot/keyframes/K1-look-left.png",
    "k2": "pilot/keyframes/K2-look-right.png",
    "atlas": "public/oil-motion/blog-pet/look-atlas.webp",
    "video": "public/oil-motion/blog-pet/pilot-K0-to-K1.mp4",
    "runtime": "src/components/BlogPetWidget.astro"
  },
  "notes": "Approve mount + product lock. Re-run denser oil-motion video pipeline before calling V1 ship-complete."
}
```
