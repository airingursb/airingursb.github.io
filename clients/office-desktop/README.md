# Agent Office — Desktop Client (Tauri v2 · spike)

The desktop client exists because of **finding A** (`docs/task-2026-05-31-office-client-findings.md`):

> A public **https** page (ursb.me) **cannot** reach a local **http** server. The
> browser blocks it client-side, before the request is even sent (verified — the
> request never reaches the server). So "open ursb.me and see your real local
> agents" does **not** work in a browser.

A **native** process has no such restriction. This client's Rust backend streams
the local agent-office SSE and feeds it to the office scene — giving you the one
thing the web can't: **your real, local Claude Code agents, live in the office.**

## Architecture

```
Claude Code (hooks + transcripts)  →  agent-office server  :4500 (SSE)
                                              │  native TCP (no browser block)
                                              ▼
                          src-tauri  Rust bridge (main.rs)
                                              │  app.emit("office-state", snapshot)
                                              ▼
                   webview = https://ursb.me/nook?room=office
                   office_agents.ts detects __TAURI__ → listens to the event
                   (instead of EventSource) → drives the Bears
```

- The localhost-streaming logic is the **same std-only TCP read proven in
  `../sse-probe`** (`cargo run` it — it streams the live office state today, the
  exact thing the browser was blocked from).
- The webview loads the deployed office; `dangerousRemoteDomainIpcAccess` in
  `tauri.conf.json` lets ursb.me use the Tauri IPC/events. `office_agents.ts`
  already has the `window.__TAURI__` branch (`setupOfficeAgents`).

## Run (spike)

Needs Rust (have: cargo 1.95) + the Tauri CLI:

```bash
cargo install tauri-cli --version "^2"      # one-time
cd clients/office-desktop
cargo tauri dev                              # opens the window, starts the Rust bridge
# in another terminal: start your local office server so it has something to stream
cd ../../tools/agent-office && OFFICE_TAIL_TRANSCRIPTS=1 npm start
```

No local server running? The office shows the demo (same as web). Start it +
run Claude Code with hooks installed → your agents appear.

## What the desktop client unlocks (vs web)

1. **Reaches localhost** — the whole point; web can't (finding A).
2. **Reads transcripts** — `OFFICE_TAIL_TRANSCRIPTS=1` tails
   `~/.claude/projects/**/subagents/agent-*.jsonl` for fine-grained per-sub
   actions (browsers can't read local files).
3. **Background + tray, native notifications, always-on-top mini-window** —
   web tabs get throttled/closed; a desktop window keeps the office alive.
4. **Auto-install hooks / launch on SessionStart** — deeper Claude Code
   integration than a web page can do.

## Status

Spike. The Rust SSE bridge logic is **proven** (`../sse-probe` compiles + runs
against the live server). The Tauri shell (`src-tauri/`) is scaffolded; building
the GUI needs `cargo tauri cli` + an app icon and may want minor v2-config
tweaks per platform. Next: build the window, verify the remote-IPC event path,
then add tray + transcript-tail auto-start.
