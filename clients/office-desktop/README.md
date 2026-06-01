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

## Auto-update

Wired via **`tauri-plugin-updater`** (+ `tauri-plugin-process` for relaunch). On
launch Den silently checks GitHub Releases for a newer **signed** build; the tray
menu **检查更新…** triggers the same check interactively. If a newer version is
found it downloads, verifies the minisign signature against the pubkey baked into
`tauri.conf.json`, swaps the `.app` in place, and relaunches.

- **Endpoint** (`plugins.updater.endpoints`): `releases/latest/download/latest.json`
  on this repo. Swap to a self-hosted URL (e.g. `https://ursb.me/den/latest.json`)
  by editing that one line.
- **Signing keys**: `src-tauri/.tauri-keys/den.key{,.pub}` (gitignored). Public key
  is in `tauri.conf.json`; the private key signs each release.
- Updates only apply to **bundled/installed** builds — `cargo tauri dev` and the
  raw `target/debug/Den` binary no-op the check.

### Cutting a release (pushes an update to every installed Den)

One-time, add the private key as a repo secret:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < src-tauri/.tauri-keys/den.key
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --body ""   # key has no password
```

Then per release: bump `version` in `tauri.conf.json`, commit, and push a matching
tag — `.github/workflows/den-release.yml` builds a signed universal macOS app,
publishes the GitHub Release, and uploads `latest.json` (which the endpoint serves):

```bash
# after bumping tauri.conf.json version to 0.1.1
git tag den-v0.1.1 && git push origin den-v0.1.1
```

> **macOS Gatekeeper caveat**: the minisign signature is the updater's integrity
> check, *not* Apple notarization. Without an Apple Developer ID cert + notarize
> step, a freshly-downloaded update is quarantined and may need a one-time
> right-click → Open. Add codesigning/notarization to the workflow to remove that.

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
