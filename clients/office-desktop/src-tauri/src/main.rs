// Agent Office — desktop client (Tauri v2).
//
// Why a desktop app at all: a public-https page CANNOT reach a local http server
// (docs finding A — verified). A native process can. So this app does the three
// things the web can't, all independently proven in sibling crates:
//   1. stream the local agent-office SSE natively      (proven: ../sse-probe)
//   2. boot the server itself — zero user setup         (proven: ../spawn-check)
//   3. read transcripts for fine-grained per-sub data   (proven: tools/agent-office tail)
// Plus desktop-only UX: system tray, close-to-tray, native notifications on
// fail/blocked, and an always-on-top mini-window (global shortcut).
//
// The office window loads http://localhost:4500/nook?room=office — the agent-office
// server serves the built nook site, so the page and the SSE stream are SAME-ORIGIN.
// office_agents.ts then connects EventSource directly (a Tauri webview on a localhost
// URL still gets __TAURI__ injected, but an EXTERNAL-url window can't invoke commands,
// so the direct-SSE path is the one that actually works here). The Rust bridge below
// is the secondary consumer: it streams the same SSE for the tray title + native
// fail/blocked notifications, independent of whatever the webview is doing.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashSet;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

// The office window loads the LOCAL nook build (localhost:4321) so its hostname is
// "localhost" → office_agents.ts connects to localhost:4500 SSE → the pretty office
// renders the REAL agents. This init script (runs before the page) pre-seeds nook's
// onboarding localStorage so the species-picker / name / tour don't block the view.
const OFFICE_URL: &str = "http://localhost:4500/nook?room=office";
const SKIP_ONBOARDING: &str = r#"
try {
  localStorage.setItem('lounge_species_v1','bear');
  localStorage.setItem('lounge_display_name','Airing');
  localStorage.setItem('lounge_name_prompted','1');
  localStorage.setItem('lounge_onboarding_done_v1','1');
} catch (e) {}
"#;
use tauri_plugin_notification::NotificationExt;

const SSE_ADDR: &str = "127.0.0.1:4500";

static BRIDGE_STARTED: Mutex<bool> = Mutex::new(false);

/// Frontend calls this; we stream localhost SSE → `office-state` events (broadcast
/// to all windows), notify on fail/blocked, and keep the tray title live. Idempotent
/// — pet + office windows both call it but only one bridge thread runs.
#[tauri::command]
fn start_office_bridge(app: AppHandle) {
    if let Ok(mut started) = BRIDGE_STARTED.lock() {
        if *started {
            return;
        }
        *started = true;
    }
    std::thread::spawn(move || stream_office(app));
}

/// The pet's entrance action: show/hide the office window.
#[tauri::command]
fn toggle_office(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.set_focus();
        }
    }
}

/// Toggle the mini always-on-top mode (small office in the corner while you code).
#[tauri::command]
fn toggle_always_on_top(app: AppHandle) -> bool {
    if let Some(w) = app.get_webview_window("main") {
        let next = !ALWAYS_ON_TOP.lock().map(|g| *g).unwrap_or(false);
        let _ = w.set_always_on_top(next);
        if let Ok(mut g) = ALWAYS_ON_TOP.lock() {
            *g = next;
        }
        return next;
    }
    false
}

static ALWAYS_ON_TOP: Mutex<bool> = Mutex::new(false);

fn stream_office(app: AppHandle) {
    // agents we've already notified about, so a notification fires once per event
    let mut notified: HashSet<String> = HashSet::new();
    loop {
        if let Ok(mut s) = TcpStream::connect(SSE_ADDR) {
            let _ = s.write_all(
                b"GET /events HTTP/1.1\r\nHost: localhost\r\nAccept: text/event-stream\r\n\r\n",
            );
            let mut buf = [0u8; 8192];
            let mut acc = String::new();
            loop {
                match s.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        acc.push_str(&String::from_utf8_lossy(&buf[..n]));
                        while let Some(i) = acc.find("\n\n") {
                            let frame: String = acc.drain(..i + 2).collect();
                            if let Some(d) = frame.lines().find_map(|l| l.strip_prefix("data: ")) {
                                let _ = app.emit("office-state", d.to_string());
                                react_to_snapshot(&app, d, &mut notified);
                            }
                        }
                    }
                }
            }
        }
        std::thread::sleep(Duration::from_secs(2)); // server not up yet / dropped → retry
    }
}

/// Parse a snapshot, update the tray title (agent count), and notify on the
/// first sight of a failed / blocked agent. Lightweight serde-free parse.
fn react_to_snapshot(app: &AppHandle, data: &str, notified: &mut HashSet<String>) {
    let agents = data.matches("\"id\":").count();
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_title(Some(format!("🐻 {agents}")));
    }
    // crude per-agent scan: split on agent boundaries
    for chunk in data.split("\"id\":").skip(1) {
        let id: String = chunk
            .trim_start_matches('"')
            .chars()
            .take_while(|c| *c != '"')
            .collect();
        let failed = chunk.contains("\"state\":\"life_failed\"");
        let blocked = chunk.contains("\"cat\":\"blocked\"");
        if failed && notified.insert(format!("fail:{id}")) {
            notify(app, "subAgent failed ✗", &format!("{id} 干崩了，去看看"));
        } else if blocked && notified.insert(format!("block:{id}")) {
            notify(app, "等你授权 ✋", &format!("{id} 卡在权限确认上"));
        }
    }
}

fn notify(app: &AppHandle, title: &str, body: &str) {
    let _ = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}

/// Zero-config: spawn the bundled agent-office server so the user never runs npm.
/// Dev: point at the repo via OFFICE_SERVER_DIR. (Proven in ../spawn-check.)
fn spawn_office_server() {
    let dir = std::env::var("OFFICE_SERVER_DIR")
        .unwrap_or_else(|_| "../../tools/agent-office".into());
    let _ = Command::new("node")
        .arg("server.js")
        .current_dir(&dir)
        .env("PORT", "4500")
        .env("OFFICE_TAIL_TRANSCRIPTS", "1") // fine-grained subAgent actions
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![start_office_bridge, toggle_office, toggle_always_on_top])
        .setup(|app| {
            spawn_office_server();

            // the office window: local nook build + onboarding pre-seeded, hidden
            // until the pet summons it (double-click → toggle_office → show). WKWebView
            // defers loading a hidden window's page until first show, so office_agents
            // connects SSE on the first summon. (Created here, not in conf, so we can
            // set the initialization_script.)
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(OFFICE_URL.parse().unwrap()))
                .title("Agent Office")
                .inner_size(960.0, 680.0)
                .min_inner_size(640.0, 480.0)
                .visible(false)
                .initialization_script(SKIP_ONBOARDING)
                .build()?;

            // system tray with a small menu
            let show = MenuItem::with_id(app, "show", "显示办公室", true, None::<&str>)?;
            let top = MenuItem::with_id(app, "top", "置顶小窗", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &top, &quit])?;
            TrayIconBuilder::with_id("main")
                .title("🐻")
                .menu(&menu)
                .on_menu_event(|app, e| match e.id().as_ref() {
                    "show" => toggle_office(app.clone()),
                    "top" => {
                        toggle_always_on_top(app.clone());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // global shortcut: Cmd/Ctrl+Shift+O toggles always-on-top
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            let app2 = app.handle().clone();
            let _ = app.global_shortcut().on_shortcut("CmdOrCtrl+Shift+O", move |_, _, _| {
                toggle_always_on_top(app2.clone());
            });
            Ok(())
        })
        // close button hides to tray instead of quitting
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Agent Office");
}
