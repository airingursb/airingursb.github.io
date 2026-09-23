# Shared tree lamps: H3 motion

The new gesture occupies the original footer's one actor track. The tree, bench, mailbox, pot and watering can retain their existing assets. The lamp controller commits shared state independently; only an accepted new light requests the performance. No audio ships.

- Model: `minimax-h3-max-turbo`
- Task: `task_01M37FQS0KYGBWMRCDM806K356`
- Source: `output/tree-lamps-motion/v1/video-1.mp4`, 15.104 seconds, 1024×768 (source has an unused audio track).
- Reference: original `public/bear-footer/garden-poster.webp`, nearest-neighbor scaled 4× and padded to 4:3.
- Prompt/request/task/status: `output/tree-lamps-motion/v1/` (request embeds the reference; no credential is stored).
- Registration: `uv run scripts/bear-stories/lamps/register.py`
- Actor masks: `uv run scripts/bear-stories/lamps/mask.py`
- Matte and bake: `node scripts/bear-stories/lamps/bake.mjs`
- Regression checks: `node --test scripts/bear-stories/lamps/assets.test.mjs scripts/bear-stories/garden/footer-assets.test.mjs`

Extract at 10 fps to `output/tree-lamps-motion/v1/raw/frame-%03d.png` first. Registration matches only the fixed canopy; the smallest frame had 393 feature inliers. The public atlas contains 150 RGBA frames. Static environment pixels are never copied from H3. Small warm ear/muzzle interiors are restored only with nearby fur support so the neutral matte does not punch holes through them.

The controller calls `mountTreeLampMotion(scene)` and dispatches `bear-footer-lamp-request` after acceptance. One pending lighting action waits for an existing activity, then a full close-book/reach/pull/return-to-book sequence plays. Additional requests during its performance coalesce. Reduced-motion requests do not download this atlas. Hidden/offscreen pause behavior comes from the existing footer player. Asset failure changes `data-lamp-media` to `error`, without undoing the confirmed shared lamp.

`data-lamp-pull="true"` covers frames 64–82; the SVG switch is normally at (222,143) and moves down about ten logical pixels. The renderer retains the static watering can using `keepStaticProps`; the activity state is `lighting`. On completion `bear-footer-lamp-complete` lets the controller clear its temporary contribution emphasis.

Evidence: `output/tree-lamps-motion/v1/processed/contact-dark.png`, `contact-light.png`, individual dark/light stills and `bake-report.json`. The `output/tree-lamps-motion/qa/` standalone fixture imports the real footer player, garden activity and new adapter; its buttons never write shared state. Production integration QA is performed by the parent task on its preview server.
