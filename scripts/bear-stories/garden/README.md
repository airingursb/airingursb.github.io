# Garden acceptance runtime

Run from the repository root with Node 22. The preview is intentionally independent of the production `services/blog-api` checkout.

```sh
node scripts/bear-stories/garden/server.mjs
```

The API listens on `0.0.0.0:4410`. The parent preview site runs on port 4406. Exact browser origins allowed by the API are `http://localhost:4406`, `http://127.0.0.1:4406`, and `http://100.93.37.97:4406`. The browser calls port 4410 on its current hostname, with credentials included.

Routes:

- `GET /health`: process health and namespace.
- `GET /api/preview/garden`: issue or reuse a signed anonymous browser cookie; return shared state.
- `POST /api/preview/garden/water`: accept one watering per signed browser identity and Singapore calendar day. Requires an allowed Origin and an established cookie. Retries return the same total with `accepted: false`.

The default persistent database is `output/bear-stories/garden/state/garden.sqlite`. Its sibling `.secret` file signs browser cookies. Keep the database and secret together across restarts. Both the persistent runtime directory and the isolated QA directory are ignored by Git. The secret is generated on first boot; it is not a production credential and should not be committed or copied into public assets.

The database stores opaque HMAC visitor hashes, dates and timestamps. The unique `(namespace, visitor_hash, garden_day)` key plus a transaction enforce daily idempotency. Stage thresholds count real saved watering events: 0 seed, 1 sprout, 3 bud, 6 bloom. They do not represent people. Namespace is `bear-garden-preview-v1`.

## Isolated QA

```sh
node --test scripts/bear-stories/garden/*.test.mjs
```

The tests create and remove their own temporary databases. HTTP tests use the exported `createGardenPreviewServer({ store, secret, now, origins })` on ephemeral ports. Browser tests may use this export with an isolated `openGardenStore(':memory:')` instance on 4411 and route only the preview API requests to that real service. Do not run acceptance mutations against the persistent handoff database.

For manual work on port 4410, first stop the persistent service, then explicitly select a separate file:

```sh
GARDEN_PREVIEW_DB=output/bear-stories/garden/qa/runtime/garden.sqlite node scripts/bear-stories/garden/server.mjs
```

Restore the default service afterward. Changing the file does not migrate or reset the original database. The acceptance page's stage inspector is read-only and can demonstrate every growth still without recording an event.

## Rebuild the delivered atlas

The source video and generated artwork are retained in `output/bear-stories/garden/`. Runtime does not load the source MP4. Extract and register the selected video, then bake the transparent delivery assets:

```sh
ffmpeg -i output/bear-stories/garden/h3-v2/video-1.mp4 -vf fps=10 -frames:v 150 output/bear-stories/garden/h3-v2/frame-%03d.png
uv run scripts/bear-stories/garden/stabilize.py
node scripts/bear-stories/garden/bake.mjs
```

Registration follows the stationary canopy to remove the generated camera zoom. Baking retains the first-frame environment and the authored moving area, removes the white matte, and makes a 150-frame atlas. Body motion and water remain H3 footage; no procedural body animation replaces them. Generated growth sprites are composited at the soil anchor. Asset metadata is written to `src/components/bear-stories/garden/frames.json`.

See `output/bear-stories/garden/REPORT.md` for provenance, evidence and the production activation boundary.

## Revision 3: the original reading footer

The active scene now embeds `BearFooterScene`. Its single canvas renders the original
reading/greeting atlas and one temporary physical care action on the original fixed
stage. The original `/bear-footer/{poster,background,actions}.webp` files are unchanged.
The four added `garden-*.webp` resources are the poster, empty-actor fixed stage, resting
can, and care atlas. `GardenScene` requires `preview` to opt into the isolated API.
The API also allows 4407 and 4408 for the same three local/preview hostnames.

The new source take is `output/bear-stories/revision-3/garden/h3/video-1.mp4`, task
`task_01M2MM7ZS0CTRZ5C0ZNM5JQBY9`. It closes and sets down the book, climbs down,
waters, replaces the can, returns and reopens the book. No second take was submitted.
The source's duplicate resting bench-book is excluded after pickup; the fixed pot
and original stage are never taken from the moving frames. Production data is not
connected to this acceptance implementation.

Rebuild these current assets after the source frames have been extracted to
`h3/raw/frame-001.png` through `frame-150.png` at 10fps:

```sh
node scripts/bear-stories/garden/footer-reference.mjs
uv run scripts/bear-stories/garden/footer-register.py
uv run scripts/bear-stories/garden/footer-mask.py
node scripts/bear-stories/garden/footer-bake.mjs
node scripts/bear-stories/garden/qa-footer.mjs
```

The last command requires the parent development preview on 4408. It creates a real
isolated in-memory SQLite API on 4411 and routes all browser mutations there. It
covers three breakpoints, original controls, all stages, care/return, daily replay,
offscreen pause, reduced motion, failed media, delayed stage resources, offline
truthfulness, the default production boundary and homepage language switching.
The persistent acceptance database on 4410 is not mutated or reset by these checks.
