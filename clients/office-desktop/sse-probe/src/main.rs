// Native SSE probe — connects to the local agent-office server over raw TCP and
// streams its snapshots. This is exactly what the desktop client's Rust backend
// does, and exactly what a public-https browser page is BLOCKED from doing
// (docs/task-2026-05-31-office-client-findings.md, finding A). std-only.
use std::io::{Read, Write};
use std::net::TcpStream;

fn main() {
    let addr = std::env::args().nth(1).unwrap_or_else(|| "127.0.0.1:4500".into());
    let mut stream = TcpStream::connect(&addr).expect("connect localhost:4500");
    stream
        .write_all(b"GET /events HTTP/1.1\r\nHost: localhost\r\nAccept: text/event-stream\r\n\r\n")
        .unwrap();
    println!("[sse-probe] connected to {addr} — streaming office state…");
    let mut buf = [0u8; 4096];
    let mut acc = String::new();
    let mut snapshots = 0;
    loop {
        let n = match stream.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => n,
            Err(_) => break,
        };
        acc.push_str(&String::from_utf8_lossy(&buf[..n]));
        while let Some(idx) = acc.find("\n\n") {
            let frame: String = acc.drain(..idx + 2).collect();
            if let Some(data) = frame.lines().find_map(|l| l.strip_prefix("data: ")) {
                let agents = data.matches("\"id\":").count();
                snapshots += 1;
                println!("[sse-probe] snapshot #{snapshots}: {agents} agent(s) in the office");
                if snapshots >= 2 {
                    println!("[sse-probe] ✅ native localhost SSE works (browser-from-public-https cannot do this)");
                    return;
                }
            }
        }
    }
}
