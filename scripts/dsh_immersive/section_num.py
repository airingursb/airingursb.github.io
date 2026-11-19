"""Auto-number h3 body sections as C{chap}.{n}."""
from __future__ import annotations

import re

_H3_OPEN = re.compile(r"<h3 class=\"sub\">")


def number_body_sections(ch_num: str, body: str) -> str:
    n = 1

    def repl(_: re.Match[str]) -> str:
        nonlocal n
        label = f'<span class="sec-num">C{ch_num}.{n}</span> '
        n += 1
        return f'<h3 class="sub">{label}'

    return _H3_OPEN.sub(repl, body)
