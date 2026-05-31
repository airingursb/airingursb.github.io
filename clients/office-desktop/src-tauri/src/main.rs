// Agent Office — desktop client (Tauri v2 spike).
//
// The whole reason this exists: a public-https browser page CANNOT reach a local
// http server (docs/task-2026-05-31-office-client-findings.md, finding A —
// verified: the request is blocked client-side before it's even sent). A native
// process has no such restriction. So here the Rust backend streams the local
// agent-office SSE (localhost:4500) and re-emits each snapshot as an
// `office-state` Tauri event; the webview (which loads ursb.me/nook?room=office)
// listens to that instead of EventSource (see src/lounge/office_agents.ts).
//
// The localhost streaming logic is the same std-only TCP read proven in
// clients/office-desktop/sse-probe (which compiles + runs today).

use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const OFFICE_SSE_ADDR: &str = "127.0.0.1:4500";

/// Frontend calls this once; we stream localhost SSE → `office-state` events.
#[tauri::command]
fn start_office_bridge(app: AppHandle) {
    std::thread::spawn(move || stream_office(app));
}

fn stream_office(app: AppHandle) {
    loop {
        if let Ok(mut s) = TcpStream::connect(OFFICE_SSE_ADDR) {
            let _ = s.write_all(
                b"GET /events HTTP/1.1\r\nHost: localhost\r\nAccept: text/event-stream\r\n\r\n",
            );
            let mut buf = [0u8; 8192];
            let mut acc = String::new();
            loop {
                match s.read(&mut buf) {
                    Ok(0) | Err(_) => break, // disconnected → reconnect below
                    Ok(n) => {
                        acc.push_str(&String::from_utf8_lossy(&buf[..n]));
                        while let Some(i) = acc.find("\n\n") {
                            let frame: String = acc.drain(..i + 2).collect();
                            if let Some(d) = frame.lines().find_map(|l| l.strip_prefix("data: ")) {
                                let _ = app.emit("office-state", d.to_string());
                            }
                        }
                    }
                }
            }
        }
        // local server not up yet / dropped — retry. (The webview shows the demo
        // office until real snapshots arrive, same as the web build.)
        std::thread::sleep(Duration::from_secs(2));
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_office_bridge])
        .run(tauri::generate_context!())
        .expect("error while running Agent Office");
}
