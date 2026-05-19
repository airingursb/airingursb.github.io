#!/usr/bin/env python3
"""Generate 24x24 pixel-art toolbar icons for the lounge UI.

Palette matches the indoor_lobby_v1 tileset (wood + brass tones) so the
buttons feel like part of the world, not floating browser chrome.

Output: public/lounge/assets/icons/{travel,backpack,social,settings}.png
"""
from PIL import Image
from pathlib import Path

# Palette (R, G, B, A)
T = (0, 0, 0, 0)                   # transparent
DARK = (42, 24, 16, 255)           # outline
BROWN = (106, 58, 40, 255)         # frame
WOOD_MID = (138, 90, 58, 255)      # mid wood
WOOD_HI = (200, 144, 96, 255)      # highlight wood
GOLD = (216, 192, 152, 255)        # brass/cream
GOLD_HI = (240, 220, 180, 255)     # bright cream
PAPER = (232, 216, 176, 255)       # paper
BRASS = (200, 144, 48, 255)        # gear body
BRASS_HI = (240, 184, 80, 255)     # gear highlight
SOCIAL_GREEN = (130, 168, 88, 255) # speech bubble tint

SIZE = 24
SCALE = 8  # save at 24x24, also preview at 192x192 if needed


def make_icon(grid: list[str], palette: dict[str, tuple]) -> Image.Image:
    """Build a 24×24 image from a 24-row grid of single-char cells."""
    img = Image.new('RGBA', (SIZE, SIZE), T)
    pixels = img.load()
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch in palette:
                pixels[x, y] = palette[ch]
    return img


# ─── Travel: wooden signpost with two arrow signs pointing opposite ─
# Post in center, top sign points right, bottom sign points left.
# o = dark outline, P = post (mid wood), W = sign body (paper),
# H = sign highlight, A = arrow tip dark
TRAVEL = [
    "........................",
    "........................",
    "..oooooooooooooo....o...",
    ".oWHHHHHHHHHHHHWo...o...",
    ".oWoooooooooooWWAo..o...",
    ".oWHHHHHHHHHHHWWWAo.o...",
    ".oWHHHHHHHHHHHWWWWAo....",
    ".oWHHHHHHHHHHHWWWAo.....",
    ".oWoooooooooooWWAo......",
    ".oWHHHHHHHHHHHWAo.......",
    "..oooooooooooooo........",
    "........oPPPo...........",
    "........oPPPo...........",
    "..oooooooPPPoooooo......",
    ".oWWWWWWWoPPPHHHHHWo....",
    "AWWWWWWWWoPPPHHHHHWo....",
    "AWWWWWWWWoPPPHHHHHWo....",
    "AAWWWWWWWoPPPHHHHHWo....",
    "AAAWWWWWWoPPPHHHHHWo....",
    "AAWWWWWWWoPPPHHHHHWo....",
    "AWWWWWWWWoPPPHHHHHWo....",
    ".oooooooooPPPooooooo....",
    "........oPPPo...........",
    "........oooo............",
]
TRAVEL_PAL = {'o': DARK, 'P': WOOD_MID, 'W': PAPER, 'H': GOLD_HI, 'A': DARK}


# ─── Backpack: trapezoid body with strap + front pocket ─────────────
# o = dark outline, B = brown body, H = highlight, p = pocket dark, s = strap
BACKPACK = [
    "........................",
    "........oooooooo........",
    "........oBBBBBBHo........"[:24],
    ".......oBBBBBBBBHo......",
    "......oBssssssssBBo.....",
    ".....oBssssssssssBBo....",
    "....oBBssssssssssBBHo...",
    "....oBBBBBBBBBBBBBBBHo..",
    "...oBHBBBBBBBBBBBBBBBHo.",
    "...oBHBBBBBBBBBBBBBBBHo.",
    "...oBHBBoooooooooBBBBHo.",
    "...oBHBBoppppppppoBBBHo.",
    "...oBHBBoppppppppoBBBHo.",
    "...oBHBBoppppppppoBBBHo.",
    "...oBHBBoppppppppoBBBHo.",
    "...oBHBBoppppppppoBBBHo.",
    "...oBHBBooooooooooBBBHo.",
    "...oBHBBBBBBBBBBBBBBBHo.",
    "...oBHBBBBBBBBBBBBBBBHo.",
    "...oBHBBBBBBBBBBBBBBBHo.",
    "...oBBBBBBBBBBBBBBBBBHo.",
    "...oBBBBBBBBBBBBBBBBBHo.",
    "...ooooooooooooooooooo..",
    "........................",
]
BACKPACK_PAL = {'o': DARK, 'B': WOOD_MID, 'H': WOOD_HI, 'p': BROWN, 's': GOLD}


# ─── Social: rounded speech bubble with dots inside + tail ──────────
SOCIAL = [
    "........................",
    "...oooooooooooooooo.....",
    "..oPPPPPPPPPPPPPPPPo....",
    ".oPPPPPPPPPPPPPPPPPPo...",
    ".oPPPPPPPPPPPPPPPPPPo...",
    "oPPPPPPPPPPPPPPPPPPPPo..",
    "oPPPPPPPPPPPPPPPPPPPPo..",
    "oPPPoooPPPoooPPPoooPPo..",
    "oPPoBBoPPoBBoPPoBBoPPo..",
    "oPPoBBoPPoBBoPPoBBoPPo..",
    "oPPPoooPPPoooPPPoooPPo..",
    "oPPPPPPPPPPPPPPPPPPPPo..",
    "oPPPPPPPPPPPPPPPPPPPPo..",
    ".oPPPPPPPPPPPPPPPPPPo...",
    ".oPPPPPPPPPPPPPPPPPPo...",
    "..oPPPPPPPPPPPPPPPPo....",
    "...ooooooooPPPPPPo......",
    ".........oPPPPPPo.......",
    "..........oPPPPo........",
    "...........oPPo.........",
    "............oo..........",
    "........................",
    "........................",
    "........................",
]
SOCIAL_PAL = {'o': DARK, 'P': PAPER, 'B': BROWN}


# ─── Settings: 8-tooth gear with center hole ────────────────────────
GEAR = [
    "........................",
    "........oo.....oo.......",
    "........oBo...oBo.......",
    "...o....oBo...oBo....o..",
    "..oBo..oBBBoooBBBo..oBo.",
    "..oBoooBBBBBBBBBBoooBo..",
    "...oBBBBHHHHHHHHBBBBo...",
    "....oBBHHHHHHHHHHHBBo...",
    "....oBBHHHHHHHHHHHBBo...",
    "..oBBBBHHHHooooHHHBBBBo.",
    ".oBBBBHHHHoo..ooHHHBBBBo",
    ".oBBBBHHHHo....oHHHBBBBo",
    ".oBBBBHHHHo....oHHHBBBBo",
    ".oBBBBHHHHoo..ooHHHBBBBo",
    "..oBBBBHHHHooooHHHBBBBo.",
    "....oBBHHHHHHHHHHHBBo...",
    "....oBBHHHHHHHHHHHBBo...",
    "...oBBBBHHHHHHHHBBBBo...",
    "..oBoooBBBBBBBBBBoooBo..",
    "..oBo..oBBBoooBBBo..oBo.",
    "...o....oBo...oBo....o..",
    "........oBo...oBo.......",
    "........oo.....oo.......",
    "........................",
]
GEAR_PAL = {'o': DARK, 'B': BRASS, 'H': BRASS_HI}


def main():
    out_dir = Path(__file__).resolve().parent.parent / 'public' / 'lounge' / 'assets' / 'icons'
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, grid, pal in [
        ('travel', TRAVEL, TRAVEL_PAL),
        ('backpack', BACKPACK, BACKPACK_PAL),
        ('social', SOCIAL, SOCIAL_PAL),
        ('settings', GEAR, GEAR_PAL),
    ]:
        img = make_icon(grid, pal)
        out = out_dir / f'{name}.png'
        img.save(out, optimize=True)
        print(f'  ✓ {out.relative_to(out_dir.parent.parent.parent.parent)} ({out.stat().st_size}B)')


if __name__ == '__main__':
    main()
