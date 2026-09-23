# Tree lamps

The homepage mounts `TreeLamps` inside the existing tree/bench `BearFooterScene` via
`GardenScene lamps`. Six native targets and quiet pixel light layers share the
original stage. A confirmed save emits `bear-footer-lamp-request`; the H3 adapter
in `bear-footer/lamp-motion.ts` waits for any current garden activity and plays its
15-second close-book, pull-cord, return-to-reading performance.

## Isolated acceptance preview

- Start `node scripts/tree-lamps/server.mjs` (Node 22 with `node:sqlite`).
- API: port 4420, GET `/api/preview/tree-lamps`, POST `/api/preview/tree-lamps/light/0` … `/5`.
- `LAMP_PREVIEW_DB` optionally chooses a separate SQLite path; default
  `output/tree-lamps/state/lamps.sqlite`. The companion secret is private and local.
- UI: `/previews/tree-lamps/?scene=night`, `?scene=day`, or no query for the actual
  server clock. The English route is `/en/previews/tree-lamps/`.
- `scene` is accepted only by the preview server. It simulates 20:00 or 12:00
  Singapore time on the server's current Singapore date. These are shared saved
  actions in a local database, not fabricated visitor activity and not production.
- Allowed preview origins are the explicit localhost/127.0.0.1/Tailscale host list
  on ports 4321, 4418, 4419, 4421 and 4423. The preview cookie is HttpOnly with
  SameSite=Lax; production adds Secure.

## Production

Migration: `services/blog-api/supabase/migrations/20260923155704_bear_tree_lamps.sql`.
It has **not been applied**. The API router registers `/api/tree-lamps` and
`/api/tree-lamps/light/{0..5}`. Only the backend service role can call the RPC or
read/write its tables. All public and authenticated privileges are revoked and
RLS is enabled. No browser-facing service key exists.

A night starts at 18:00 Singapore time and ends at 06:00. One contribution per
signed anonymous browser per night; occupied choices do not consume it. The
per-night row lock serializes decisions; unique visitor and lamp constraints
independently prevent duplicate credits and overfilling. No client time enters
the RPC. Dawn returns an empty scene without deleting historical records.
Browser identity is a signed anonymous cookie, not a verified human identity.

## Verification

`node --test scripts/tree-lamps/store.test.mjs scripts/tree-lamps/server.test.mjs`
checks actual SQLite persistence and HTTP sessions, shared reads, parallel
idempotence, day/night boundaries, slot limits, invalid input and Origin checks.

`node --test services/blog-api/tests/tree-lamps.test.js` checks the real production
Supabase client's RPC contract, Secure cookie, ignored simulation parameters and
truthful persistence failure at its HTTP boundary.

Production SQL can be tested offline with PGlite:

```
npm install --prefix output/tree-lamps/sql-runtime --no-audit --no-fund @electric-sql/pglite@0.5.8
node --test scripts/tree-lamps/sql.test.mjs
```

The unmodified migration is executed first and permissions are checked. Only the
function clock is replaced inside this disposable test database for deterministic
midnight/dawn/evening assertions. PGlite serializes one connection, so this is not
an independent multi-connection Postgres lock-contention test.

The UI matrix harness is `output/tree-lamps/qa.mjs` with `BASE_URL` and `QA_OUTPUT`
overrides. It sends its writes to its own ephemeral in-memory SQLite servers and
never consumes the six lamps in the user-facing preview database.
