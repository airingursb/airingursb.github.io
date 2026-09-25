# Tide asset production

Reference: original pixel brown bear `public/bear-study/poster.png`.
Reference art was generated with built-in imagegen, saved under
`output/h3-blog-delights-20260924/tide/art/`. A magenta-flattened 1024×576 JPEG
was submitted as the first frame to `minimax-h3-max-turbo`.

H3 task: `task_01M3A22TZ5PAK03N6N5JMG70ND`.
Provenance (prompt/request/task/status/video) remains in
`output/h3-blog-delights-20260924/tide/h3/`. Do not resubmit this task.
The original video is 1344×768, 15.083 seconds and contains an AAC track.
Only silent RGBA atlases are served; source audio is not used or evaluated.

Extract and bake after download:

```sh
mkdir -p output/h3-blog-delights-20260924/tide/bake/raw
ffmpeg -y -v error -i output/h3-blog-delights-20260924/tide/h3/video-1.mp4 \
  -vf 'fps=12,crop=1344:336:0:256,scale=640:160:flags=lanczos' \
  -frames:v 181 output/h3-blog-delights-20260924/tide/bake/raw/%04d.png
node scripts/blog-delights/tide/bake.mjs
node --experimental-strip-types --test tests/footer-tide.test.mjs
```

The existing editorial matte removes the changing magenta exterior and repairs
edge contamination at 2× output resolution. RGB quantization uses a fixed 8-step
grid, alpha remains exact, and final WebP encoding is lossless.
Frames 0–39 are the tide reveal, 40–173 the complete pickup/listen/replace/return,
174–180 the natural resting-water loop. Character movement always runs forward.
The stage is 320×80, rendered 300×75, with no chroma spill or cropped edges in
the final atlas scan. Idle seam mean difference is about 3.42 / 255 per channel.

`matte-dark.png`, `matte-light.png` and `matte-report.json` in the evidence folder
record framing and matte inspection. Browser QA must additionally verify the
shell target, reduced motion, navigation cleanup and offscreen pausing.
