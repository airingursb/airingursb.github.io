"""HTML builder helpers for Pi Agent immersive chapters."""
from __future__ import annotations


def join(*parts: str) -> str:
    return "\n\n".join(parts)


def p(zh: str, en: str) -> str:
    return f"""    <div class="lang-zh-only"><p>{zh}</p></div>
    <div class="lang-en-only"><p>{en}</p></div>"""


def h3(zh: str, en: str) -> str:
    return f'    <h3 class="sub"><span class="lang-zh-only">{zh}</span><span class="lang-en-only">{en}</span></h3>'


def h4(zh: str, en: str) -> str:
    return f'    <h4 class="sub2"><span class="lang-zh-only">{zh}</span><span class="lang-en-only">{en}</span></h4>'


def src(tag: str, path: str, lines: list[str]) -> str:
    body = "\n".join(f'      <span class="src-line">{line}</span>' for line in lines)
    return f"""    <div class="src-stack">
      <div class="src-h">
        <span>SOURCE &nbsp;·&nbsp; {path}</span>
        <span class="src-tag">{tag}</span>
      </div>
{body}
    </div>"""


def sp(rows: list[tuple[str, str, str, str]]) -> str:
    rs = []
    for kz, ke, vz, ve in rows:
        rs.append(
            f"""      <div class="sp-row">
        <div class="sp-key"><span class="lang-zh-only">{kz}</span><span class="lang-en-only">{ke}</span></div>
        <div class="sp-val"><span class="lang-zh-only">{vz}</span><span class="lang-en-only">{ve}</span></div>
      </div>"""
        )
    return "    <div class=\"stage-purpose\">\n" + "\n".join(rs) + "\n    </div>"


def note(zh: str, en: str, copper: bool = False) -> str:
    cls = "note copper" if copper else "note"
    return f"""    <div class="{cls}">
      <span class="lang-zh-only">{zh}</span>
      <span class="lang-en-only">{en}</span>
    </div>"""


def formula(tz: str, te: str, lines: list[str], oz: str, oe: str) -> str:
    conds = "\n".join(f'      <span class="cond">{line}</span>' for line in lines)
    return f"""    <div class="formula">
      <div class="ftitle"><span class="lang-zh-only">{tz}</span><span class="lang-en-only">{te}</span></div>
{conds}
      <div class="out"><span class="lang-zh-only">{oz}</span><span class="lang-en-only">{oe}</span></div>
    </div>"""


def ladder(items: list[tuple[str, str]]) -> str:
    steps = []
    for i, (z, e) in enumerate(items, 1):
        steps.append(
            f"""      <div class="ladder-step">
        <div class="ladder-num">{i:02d}</div>
        <div class="ladder-body"><span class="lang-zh-only">{z}</span><span class="lang-en-only">{e}</span></div>
      </div>"""
        )
    return "    <div class=\"ladder\">\n" + "\n".join(steps) + "\n    </div>"


def keynums(items: list[tuple[str, str, str, str, str]]) -> str:
    ks = []
    for n, lz, le, dz, de in items:
        ks.append(
            f"""      <div class="keynum">
        <div class="kn-val">{n}</div>
        <div class="kn-label"><span class="lang-zh-only">{lz}</span><span class="lang-en-only">{le}</span></div>
        <div class="kn-desc"><span class="lang-zh-only">{dz}</span><span class="lang-en-only">{de}</span></div>
      </div>"""
        )
    return "    <div class=\"keynum-row\">\n" + "\n".join(ks) + "\n    </div>"


def pull(zh: str, en: str) -> str:
    return f"""    <blockquote class="pull copper">
      <span class="lang-zh-only">{zh}</span>
      <span class="lang-en-only">{en}</span>
      <cite>Field Note · 10</cite>
    </blockquote>"""


def cmp(headers: list[str], rows: list[list[str]]) -> str:
    ths = "".join(f"<th>{h}</th>" for h in headers)
    trs = []
    for row in rows:
        tds = "".join(f"<td>{c}</td>" for c in row)
        trs.append(f"      <tr>{tds}</tr>")
    return f"""    <table class="cmp">
      <thead><tr>{ths}</tr></thead>
      <tbody>
{chr(10).join(trs)}
      </tbody>
    </table>"""


def fig(zh: str, en: str, inner: str = '<div class="fig-placeholder">diagram</div>') -> str:
    return f"""    <figure>
      <div class="figbox">{inner}</div>
      <figcaption>
        <span class="figid">FIG</span>
        <span class="lang-zh-only">{zh}</span>
        <span class="lang-en-only">{en}</span>
      </figcaption>
    </figure>"""
