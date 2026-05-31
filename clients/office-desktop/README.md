# Agent Office — Desktop Client (Tauri v2)

Exists because of **finding A** (`docs/task-2026-05-31-office-client-findings.md`):
a public **https** page **cannot** reach a local **http** server (verified — the
browser blocks it before it's even sent). A **native** process can. So the desktop
client is the only clean home for *your real, local Claude Code agents in the
office* — plus desktop-only UX the web can never do.

## What it does (P0 + P1)

| | Feature | Proven by |
|---|---|---|
| P0 | **Stream localhost SSE natively** (the web can't) | `sse-probe/` — `cargo run` streams the live office ✅ |
| P0 | **Boot the server itself** — zero `npm` setup | `spawn-check/` — spawns server, `/health`+`/state` ✅ |
| P0 | **System tray** + menu (显示/置顶/退出), **close-to-tray** | `src-tauri/main.rs` |
| P0 | Tray title shows live **agent count** (`🐻 3`) | `react_to_snapshot` |
| P1 | **Native notifications** on subAgent fail ✗ / blocked ✋ | `react_to_snapshot` → `notify` |
| P1 | **Always-on-top mini-window** + global shortcut `Cmd/Ctrl+Shift+O` | `toggle_always_on_top` |
| P1 | **Per-agent metrics** (tools/tokens/result) from transcripts | server `OFFICE_TAIL_TRANSCRIPTS=1` (auto-set) → office renders `⚙38 · 3.2M` |
| ✨ | **Desktop pet = the entrance** — a small bear sits in the corner (transparent, frameless, always-on-top, draggable); reflects live state (agent-count badge, green ring when working, red alert + bubble on fail); **double-click → opens the office** | `frontend/pet.html` (canvas bear, verified rendering) + `toggle_office` command; pet window shows on launch, office hidden until summoned |

## Architecture

```
Claude Code (hooks + transcripts)  →  agent-office server :4500
   the desktop app spawns this on launch ▲        │ SSE (native TCP — no browser block)
   + sets OFFICE_TAIL_TRANSCRIPTS=1               ▼
                              src-tauri  Rust backend (main.rs)
                                │ emit("office-state")        │ notifications, tray title
                                ▼
              webview = https://ursb.me/nook?room=office
              office_agents.ts sees __TAURI__ → listens to the event
```

The two hardest primitives (native SSE, zero-config spawn) are **independently
proven runnable** in `sse-probe/` and `spawn-check/` (`cargo run` either).

## Run

Have: cargo 1.95. One-time: `cargo install tauri-cli --version "^2"`.

```bash
cd clients/office-desktop
OFFICE_SERVER_DIR="$(pwd)/../../tools/agent-office" cargo tauri dev
# → opens the window, spawns the office server (with transcript tail),
#   streams it to the office. Run Claude Code with hooks installed and your
#   agents appear; no server running yet → demo office (same as web).
```

(`spawn_office_server` reads `OFFICE_SERVER_DIR`; a shipped build bundles the
server as a sidecar instead.)

## Layout

```
office-desktop/
├── src-tauri/        full Tauri v2 app (main.rs bridge+bootstrap+tray+notify, Cargo.toml, build.rs, capabilities, conf, icons)
├── sse-probe/        std-only proof: native localhost SSE works
├── spawn-check/      std-only proof: zero-config server spawn works
└── frontend/         placeholder (the real UI is the remote office)
```

## Still ahead (next on P0/P1)

- Build the GUI window once (`cargo tauri dev`) + verify the remote-IPC
  `office-state` event reaches the deployed page's `office_agents.ts`.
- **Bundle the office frontend locally** (drop `dangerousRemoteDomainIpcAccess`,
  offline, faster) — the recommended productionization.
- **Auto-install hooks** on first launch (logic exists as `install-hooks.mjs`;
  wire a Rust command — kept out of auto-run so it doesn't touch `~/.claude`
  without consent).
- Ship the Node server as a **Tauri sidecar** (no Node dependency on the user).
- Click an agent → deep-link to its file / transcript; agent task tree
  (transcript `parentUuid`); session history / replay.
