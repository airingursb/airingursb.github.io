#!/usr/bin/env python3
"""Generate Pi Agent immersive HTML article."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PKG = ROOT / "pi_agent_immersive"
sys.path.insert(0, str(PKG))

from chapters import build_all_chapters  # noqa: E402
from deep_dive import deepen  # noqa: E402
from expand import expand_chapter  # noqa: E402
from meta import CHAPTERS  # noqa: E402
from shell import (  # noqa: E402
    chapter_section,
    footer,
    head,
    hero,
    interactive_footer,
    lang_toggle_and_back,
    scripts,
    side_toc,
    toc_v2,
)

OUT = Path(__file__).resolve().parents[1] / "public/immersive/pi-agent/index.html"


def generate() -> str:
    chapters = build_all_chapters()
    parts = [
        head(),
        lang_toggle_and_back(),
        side_toc(),
        '<div class="container">',
        hero(),
        toc_v2(),
    ]
    for cid, *_ in CHAPTERS:
        body = deepen(cid, expand_chapter(cid, chapters[cid]))
        parts.append(chapter_section(cid, body))
    parts.extend([
        footer(),
        "</div>",
        scripts(),
        interactive_footer(),
        "</body>\n</html>",
    ])
    return "\n\n".join(parts)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = generate()
    OUT.write_text(html, encoding="utf-8")
    lines = html.count("\n") + 1
    print(f"Wrote {OUT}")
    print(f"Lines: {lines}")
    print(f"Bytes: {OUT.stat().st_size}")


if __name__ == "__main__":
    main()
