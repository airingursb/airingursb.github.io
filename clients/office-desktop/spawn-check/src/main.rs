// Zero-config bootstrap proof: the desktop client spawns the agent-office server
// itself (so the user never runs `npm start`), then confirms it's healthy.
// std-only; the Tauri app (../src-tauri) runs the same on launch.
use std::io::{Read, Write};
use std::net::TcpStream;
use std::process::{Command, Stdio};
use std::time::Duration;

fn http_get(path: &str) -> Option<String> {
    let mut s = TcpStream::connect("127.0.0.1:4500").ok()?;
    s.set_read_timeout(Some(Duration::from_secs(2))).ok()?;
    s.write_all(format!("GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n").as_bytes())
        .ok()?;
    let mut buf = String::new();
    s.read_to_string(&mut buf).ok()?;
    Some(buf)
}

fn main() {
    let server_dir = std::env::args().nth(1).unwrap_or_else(|| "../../tools/agent-office".into());
    println!("[spawn-check] launching agent-office server in {server_dir} …");
    let mut child = Command::new("node")
        .arg("server.js")
        .current_dir(&server_dir)
        .env("PORT", "4500")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("spawn node server.js (is Node installed?)");

    // wait for /health
    let mut ok = false;
    for _ in 0..20 {
        std::thread::sleep(Duration::from_millis(300));
        if let Some(resp) = http_get("/health") {
            if resp.contains("200") || resp.to_lowercase().contains("ok") || resp.contains("\"ok\"") {
                ok = true;
                break;
            }
        }
    }
    println!("[spawn-check] /health reachable: {ok}");
    // also confirm /state responds (the office data endpoint)
    let state_ok = http_get("/state").map(|r| r.contains("agents")).unwrap_or(false);
    println!("[spawn-check] /state has office data: {state_ok}");
    let _ = child.kill();
    if ok && state_ok {
        println!("[spawn-check] ✅ desktop can boot the server with zero user setup");
    } else {
        println!("[spawn-check] ⚠ check Node + server path");
        std::process::exit(1);
    }
}
