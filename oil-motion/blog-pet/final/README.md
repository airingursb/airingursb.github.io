# Panda circular Oil Motion asset

This package replaces eight independently generated radial clips with one closed circular atlas.

Files:

- `panda-circular.webp`: 54-frame, 8×7 Alpha WebP atlas, 480×480 per cell.
- `panda-circular.json`: circular manifest; frame 0 maps to screen top-left (`-135°`).
- `panda-motion.js`: pointer-angle runtime with shortest-path circular smoothing and a center dead zone.
- `panda-center-fallback.png`: reduced-motion/mobile fallback.
- `panda-circular-master.mp4`: generated 768p loop master for review and future recompilation.
- `preview.html`: standalone bottom-right integration example.

Serve this directory over HTTP and open `preview.html`. Import `mountPandaMotion()` in the blog and pass the pet element. Do not combine this package with `pickDirection` or the old eight-video switcher.
