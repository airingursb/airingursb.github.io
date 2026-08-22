#!/usr/bin/env python3
"""Generate chapters_content.py with all 26 chapter bodies."""
from __future__ import annotations

from pathlib import Path
from textwrap import dedent

OUT = Path(__file__).parent / "chapters_content.py"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def emit_file(chapters: dict[str, str]) -> None:
    lines = [
        '"""Rich HTML chapter bodies for the Pi Agent immersive article."""',
        "",
        "from __future__ import annotations",
        "",
        "_CHAPTERS: dict[str, str] = {",
    ]
    for cid in sorted(chapters, key=lambda x: int(x[1:])):
        body = chapters[cid]
        lines.append(f'    "{cid}": dedent("""\\')
        lines.append(body.rstrip())
        lines.append('""").strip(),')
    lines += [
        "}",
        "",
        "",
        "def get_chapter_body(chapter_id: str) -> str:",
        '    """Return rich HTML body (no outer section tags) for chapter c1-c26."""',
        "    try:",
        "        return _CHAPTERS[chapter_id]",
        "    except KeyError as exc:",
        '        raise ValueError(f"Unknown chapter: {chapter_id!r}") from exc',
        "",
    ]
    header = "\n".join(lines[:5])
    footer = "\n".join(lines[-10:])
    mid_parts = []
    for cid in sorted(chapters, key=lambda x: int(x[1:])):
        body = chapters[cid]
        mid_parts.append(f'    "{cid}": dedent("""\n{body}""").strip(),')
    content = header + "\n" + "\n".join(mid_parts) + "\n}\n\n\n" + footer.split("}\n\n\n", 1)[1]
    OUT.write_text(content, encoding="utf-8")
    print(f"Wrote {OUT} ({len(chapters)} chapters, {OUT.stat().st_size} bytes)")


# Import chapter definitions from companion module
from _chapter_defs import ALL_CHAPTERS  # noqa: E402

if __name__ == "__main__":
    emit_file(ALL_CHAPTERS)
