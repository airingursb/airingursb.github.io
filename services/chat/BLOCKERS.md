# Deployment Blockers

Items below require manual input before the chat service can be deployed.

---

## 1. Supabase Credentials

- **SUPABASE_URL** — your project's REST URL (e.g. `https://xxxx.supabase.co`)
- **SUPABASE_SERVICE_KEY** — service-role key (found under Project Settings → API)
- After setting credentials, run `sql/init.sql` against the database:

```
psql "$DATABASE_URL" -f sql/init.sql
```

or paste the contents into the Supabase SQL Editor.

---

## 2. HMAC Secret

Generate a strong secret and add it to `.env`:

```bash
openssl rand -hex 32
```

Set the result as `HMAC_SECRET`.

---

## 3. OpenClaw Configuration

- **OPENCLAW_URL** — base URL of your OpenClaw instance
- **OPENCLAW_TOKEN** — bearer token for the API
- **OPENCLAW_AGENT_ID** — the agent/persona ID to use for blog chat
- Ensure the agent has **chat completions** enabled in the OpenClaw dashboard.

---

## 4. LocalCan Domain + CORS + Frontend Base URL

1. Assign a LocalCan (or other reverse-proxy) domain to the service container.
2. Add that domain to `ALLOWED_ORIGINS` in `.env` (comma-separated).
3. Update the frontend constant `CHAT_API_BASE` in `index.html` (or wherever it is
   set) to point to the new domain.

---

## 5. OpenClaw Docker Setup

Decide on container topology:

- **Option A** — OpenClaw and this service run in **separate containers**,
  communicating over a shared Docker network.
- **Option B** — A single `docker-compose.yml` spins up both services together.

Document the chosen approach and update `OPENCLAW_URL` accordingly (e.g.
`http://openclaw:8080` for a named service on a compose network).

---

## 6. Blog Content Mount

The Dockerfile declares `VOLUME /app/blog`.  At runtime, bind-mount your built
blog output so the agent can read it:

```bash
docker run -v /path/to/built/blog:/app/blog ...
```

Confirm the mount path matches whatever OpenClaw uses to serve blog content.

---

## 7. CORS Domain Finalization

Once the production domain is known:

1. Set `ALLOWED_ORIGINS=https://your-blog.com` (remove localhost entries).
2. Verify that the `Origin` header sent by the browser matches exactly (scheme +
   host + port).
3. If running behind a CDN/proxy, ensure the `Origin` header is forwarded
   unchanged.
