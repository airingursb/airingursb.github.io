#!/usr/bin/env python3
"""Generate public/lounge/assets/rooms/gallery.tmj.

The gallery is an 80×60 tile (1280×960 px) plus-shape museum:

  - North Hall  (32..48, 0..20)  — Networks exhibits (A05, A11)
  - Rotunda     (24..56, 20..44) — centerpiece + columns + statues + info desk
  - East Wing   (56..80, 20..44) — Web Internals (A01, A02, A10, A14, A13, A06)
  - West Wing   (0..24,  20..44) — Performance/Memory (A03, A04, A07, A08, A09, A12)
  - South Pav   (24..56, 44..60) — Comics + Grove portal

One single .tmj. Walking between zones = no scene transition. Floor tiles
only present inside zones (transparent corners outside the plus).

Re-run after layout edits:  `python3 scripts/generate-gallery-tmj.py`
"""

import json
import os
import sys

TILE = 16
W_TILES = 80  # map width in tiles
H_TILES = 60  # map height in tiles
W_PX = W_TILES * TILE
H_PX = H_TILES * TILE

# Zone bboxes in TILE coords: (col_min, row_min, col_max, row_max) — half-open
ZONES = {
    'north':   (32,  0, 48, 20),
    'rotunda': (24, 20, 56, 44),
    'east':    (56, 20, 80, 44),
    'west':    ( 0, 20, 24, 44),
    'south':   (24, 44, 56, 60),
}

# Tile GIDs (use indoor_2f_v0: gid 1 = light floor, gid 2 = darker edge tile)
FLOOR_GID = 1
EMPTY_GID = 0


def in_any_zone(c: int, r: int) -> bool:
    for (c0, r0, c1, r1) in ZONES.values():
        if c0 <= c < c1 and r0 <= r < r1:
            return True
    return False


def build_floor_layer() -> list[int]:
    data = []
    for r in range(H_TILES):
        for c in range(W_TILES):
            data.append(FLOOR_GID if in_any_zone(c, r) else EMPTY_GID)
    return data


def build_empty_layer() -> list[int]:
    return [0] * (W_TILES * H_TILES)


# ── Collision walls (px coords).
# Outer building perimeter + rotunda inner walls (with doorway gaps).
DOOR_PX = 64   # 4-tile-wide doorways
DOOR_TILES = 4

# Rotunda center for doorway alignment
ROT_CX_PX = ((ZONES['rotunda'][0] + ZONES['rotunda'][2]) / 2) * TILE  # 640
ROT_CY_PX = ((ZONES['rotunda'][1] + ZONES['rotunda'][3]) / 2) * TILE  # 512

# Doorway positions (centered on rotunda's center-line)
NORTH_DOOR_X0 = int(ROT_CX_PX - DOOR_PX / 2)        # 608
NORTH_DOOR_X1 = NORTH_DOOR_X0 + DOOR_PX             # 672
SIDE_DOOR_Y0 = int(ROT_CY_PX - DOOR_PX / 2)         # 480
SIDE_DOOR_Y1 = SIDE_DOOR_Y0 + DOOR_PX               # 544

LOBBY_PORTAL_X0 = NORTH_DOOR_X0   # align with rotunda center
LOBBY_PORTAL_X1 = NORTH_DOOR_X1


def make_collision_rects() -> list[dict]:
    rects = []
    next_id = [1]
    def push(name: str, x: int, y: int, w: int, h: int):
        rects.append({
            "id": next_id[0], "name": name,
            "x": x, "y": y, "width": w, "height": h,
            "rotation": 0, "visible": True, "properties": [],
        })
        next_id[0] += 1

    # ── Outer building walls (perimeter of plus-shape, NOT bordering rotunda)
    # North Hall outer
    n_x0, n_y0, n_x1, n_y1 = (ZONES['north'][0]*TILE, ZONES['north'][1]*TILE,
                              ZONES['north'][2]*TILE, ZONES['north'][3]*TILE)
    push("wall_north_top",   n_x0,         n_y0,             n_x1 - n_x0, TILE)
    push("wall_north_left",  n_x0,         n_y0,             TILE,        n_y1 - n_y0)
    push("wall_north_right", n_x1 - TILE,  n_y0,             TILE,        n_y1 - n_y0)

    # West Wing outer
    w_x0, w_y0, w_x1, w_y1 = (ZONES['west'][0]*TILE, ZONES['west'][1]*TILE,
                              ZONES['west'][2]*TILE, ZONES['west'][3]*TILE)
    push("wall_west_top",    w_x0,         w_y0,             w_x1 - w_x0, TILE)
    push("wall_west_left",   w_x0,         w_y0,             TILE,        w_y1 - w_y0)
    push("wall_west_bottom", w_x0,         w_y1 - TILE,      w_x1 - w_x0, TILE)

    # East Wing outer
    e_x0, e_y0, e_x1, e_y1 = (ZONES['east'][0]*TILE, ZONES['east'][1]*TILE,
                              ZONES['east'][2]*TILE, ZONES['east'][3]*TILE)
    push("wall_east_top",    e_x0,         e_y0,             e_x1 - e_x0, TILE)
    push("wall_east_right",  e_x1 - TILE,  e_y0,             TILE,        e_y1 - e_y0)
    push("wall_east_bottom", e_x0,         e_y1 - TILE,      e_x1 - e_x0, TILE)

    # South Pavilion outer (with lobby portal gap in bottom)
    s_x0, s_y0, s_x1, s_y1 = (ZONES['south'][0]*TILE, ZONES['south'][1]*TILE,
                              ZONES['south'][2]*TILE, ZONES['south'][3]*TILE)
    push("wall_south_left",   s_x0,        s_y0,             TILE,        s_y1 - s_y0)
    push("wall_south_right",  s_x1 - TILE, s_y0,             TILE,        s_y1 - s_y0)
    # Bottom wall split for lobby portal
    push("wall_south_bot_l",  s_x0,        s_y1 - TILE,      LOBBY_PORTAL_X0 - s_x0, TILE)
    push("wall_south_bot_r",  LOBBY_PORTAL_X1, s_y1 - TILE,  s_x1 - LOBBY_PORTAL_X1, TILE)

    # ── Rotunda inner walls (with doorway gaps to each connecting zone)
    r_x0, r_y0, r_x1, r_y1 = (ZONES['rotunda'][0]*TILE, ZONES['rotunda'][1]*TILE,
                              ZONES['rotunda'][2]*TILE, ZONES['rotunda'][3]*TILE)
    # Rotunda north wall (border with north hall): gap at NORTH_DOOR_X0..NORTH_DOOR_X1
    push("rot_n_l", r_x0,         r_y0,         NORTH_DOOR_X0 - r_x0, TILE)
    push("rot_n_r", NORTH_DOOR_X1, r_y0,        r_x1 - NORTH_DOOR_X1, TILE)
    # Rotunda south wall (border with south pavilion): gap at NORTH_DOOR_X0..NORTH_DOOR_X1
    push("rot_s_l", r_x0,         r_y1 - TILE,  NORTH_DOOR_X0 - r_x0, TILE)
    push("rot_s_r", NORTH_DOOR_X1, r_y1 - TILE, r_x1 - NORTH_DOOR_X1, TILE)
    # Rotunda west wall (border with west wing): gap at SIDE_DOOR_Y0..SIDE_DOOR_Y1
    push("rot_w_t", r_x0,         r_y0,         TILE, SIDE_DOOR_Y0 - r_y0)
    push("rot_w_b", r_x0,         SIDE_DOOR_Y1, TILE, r_y1 - SIDE_DOOR_Y1)
    # Rotunda east wall (border with east wing): gap at SIDE_DOOR_Y0..SIDE_DOOR_Y1
    push("rot_e_t", r_x1 - TILE,  r_y0,         TILE, SIDE_DOOR_Y0 - r_y0)
    push("rot_e_b", r_x1 - TILE,  SIDE_DOOR_Y1, TILE, r_y1 - SIDE_DOOR_Y1)

    return rects


def make_spawns() -> list[dict]:
    """Spawns: default and from_lobby both at the south pavilion bottom door,
    just inside. Player arrives in the south pavilion and walks UP through the
    gallery toward the rotunda centerpiece — narrative approach to the museum."""
    out = []
    next_id = [100]
    def push(name: str, x: int, y: int):
        out.append({
            "id": next_id[0], "name": name, "x": x, "y": y,
            "width": 0, "height": 0, "rotation": 0, "visible": True,
            "properties": [],
        })
        next_id[0] += 1

    spawn_x = int((LOBBY_PORTAL_X0 + LOBBY_PORTAL_X1) / 2)   # 640
    spawn_y = (ZONES['south'][3] - 2) * TILE                 # 928 — 2 tiles above bottom

    push("default",    spawn_x, spawn_y)
    push("from_lobby", spawn_x, spawn_y)
    return out


def make_portals() -> list[dict]:
    return [{
        "id": 200, "name": "to_lobby",
        "x": LOBBY_PORTAL_X0, "y": (ZONES['south'][3] - 1) * TILE,
        "width": LOBBY_PORTAL_X1 - LOBBY_PORTAL_X0, "height": TILE,
        "rotation": 0, "visible": True,
        "properties": [
            {"name": "target_room",  "type": "string", "value": "room_lobby"},
            {"name": "target_spawn", "type": "string", "value": "from_gallery"},
        ],
    }]


# ── Exhibit interactables.
# Each exhibit object positions the picture frame visually (x, y, w, h) and
# the player approach anchor (anchor_x, anchor_y) — frame sits flush with the
# wall, anchor 1-2 tiles into the walkway.

EXHIBITS = [
    # ────── NORTH HALL (Networks) — 2 paintings on long walls
    {
        "name": "exhibit_http3", "rect": (528, 80, 48, 64),
        "anchor": (560, 144), "facing": "left",
        "type": "immersive", "url": "/immersive/http3/",
        "label": "HTTP/3", "title": "一次请求的一生 · HTTP/3 协议全景",
        "asset": "A05-http3", "emoji": "📡",
    },
    {
        "name": "exhibit_tls", "rect": (704, 80, 48, 64),
        "anchor": (688, 144), "facing": "right",
        "type": "immersive", "url": "/immersive/tls-handshake/",
        "label": "TLS", "title": "一次 TLS 握手的一生 · TLS 1.3 协议全景",
        "asset": "A11-tls-handshake", "emoji": "🔐",
    },

    # ────── WEST WING (Performance & Memory) — 6 paintings
    {
        "name": "exhibit_gc", "rect": (16, 384, 48, 64),
        "anchor": (88, 416), "facing": "left",
        "type": "immersive", "url": "/immersive/gc/",
        "label": "GC", "title": "一段内存的多重死亡 · 11 个 GC 家族",
        "asset": "A03-gc", "emoji": "🗑️",
    },
    {
        "name": "exhibit_helio", "rect": (320, 384, 48, 64),
        "anchor": (296, 416), "facing": "right",
        "type": "immersive", "url": "/immersive/helio/",
        "label": "Helio", "title": "Helio · 高性能小游戏容器",
        "asset": "A04-helio", "emoji": "☀️",
    },
    {
        "name": "exhibit_jank", "rect": (16, 480, 48, 64),
        "anchor": (88, 512), "facing": "left",
        "type": "immersive", "url": "/immersive/jank-stutter/",
        "label": "Jank", "title": "测量「流畅」 · Jank & Stutter",
        "asset": "A07-jank-stutter", "emoji": "🎞️",
    },
    {
        "name": "exhibit_llm", "rect": (320, 480, 48, 64),
        "anchor": (296, 512), "facing": "right",
        "type": "immersive", "url": "/immersive/llm-inference-life/",
        "label": "LLM", "title": "一次 LLM 推理的一生 · 28 个站",
        "asset": "A08-llm-inference-life", "emoji": "🧠",
    },
    {
        "name": "exhibit_quickjs", "rect": (16, 576, 48, 64),
        "anchor": (88, 608), "facing": "left",
        "type": "immersive", "url": "/immersive/quickjs/",
        "label": "QuickJS", "title": "一行 JS 的一生 · QuickJS 源码",
        "asset": "A09-quickjs", "emoji": "📜",
    },
    {
        "name": "exhibit_v8", "rect": (320, 576, 48, 64),
        "anchor": (296, 608), "facing": "right",
        "type": "immersive", "url": "/immersive/v8-fast-js/",
        "label": "V8", "title": "V8 优化 · 一段热点函数的重生",
        "asset": "A12-v8-fast-js", "emoji": "🚀",
    },

    # ────── EAST WING (Web Internals) — 6 paintings
    {
        "name": "exhibit_chromium", "rect": (912, 384, 48, 64),
        "anchor": (984, 416), "facing": "left",
        "type": "immersive", "url": "/immersive/chromium-renderer/",
        "label": "渲染", "title": "字节码到像素的一生 · Chromium 渲染",
        "asset": "A01-chromium-renderer", "emoji": "🎨",
    },
    {
        "name": "exhibit_css", "rect": (1216, 384, 48, 64),
        "anchor": (1192, 416), "facing": "right",
        "type": "immersive", "url": "/immersive/css-engine/",
        "label": "CSS", "title": "一段 CSS 的一生 · 样式引擎",
        "asset": "A02-css-engine", "emoji": "💧",
    },
    {
        "name": "exhibit_react", "rect": (912, 480, 48, 64),
        "anchor": (984, 512), "facing": "left",
        "type": "immersive", "url": "/immersive/react-internals/",
        "label": "React", "title": "一次 setState 的一生",
        "asset": "A10-react-internals", "emoji": "⚛️",
    },
    {
        "name": "exhibit_webgpu", "rect": (1216, 480, 48, 64),
        "anchor": (1192, 512), "facing": "right",
        "type": "immersive", "url": "/immersive/webgpu/",
        "label": "WebGPU", "title": "一次 dispatch 的八重翻译",
        "asset": "A14-webgpu", "emoji": "🖥️",
    },
    {
        "name": "exhibit_wasm", "rect": (912, 576, 48, 64),
        "anchor": (984, 608), "facing": "left",
        "type": "immersive", "url": "/immersive/webassembly/",
        "label": "WASM", "title": "从 Rust 到 SIMD · WebAssembly",
        "asset": "A13-webassembly", "emoji": "🦀",
    },
    {
        "name": "exhibit_image_formats", "rect": (1216, 576, 48, 64),
        "anchor": (1192, 608), "facing": "right",
        "type": "immersive", "url": "/immersive/image-formats/",
        "label": "图片", "title": "沉积的像素 · 50+ 图片格式",
        "asset": "A06-image-formats", "emoji": "🖼️",
    },

    # ────── NORTH HALL — Curated long-form essays (notes wall, top edge)
    {
        "name": "exhibit_note_bezier", "rect": (528, 24, 36, 48),
        "anchor": (546, 88), "facing": "up",
        "type": "notes", "url": "/notes/bezier-curves",
        "label": "曲线", "title": "Bezier 曲线 · 几何之美",
        "asset": "", "emoji": "📐",
    },
    {
        "name": "exhibit_note_memory_system", "rect": (608, 24, 36, 48),
        "anchor": (626, 88), "facing": "up",
        "type": "notes", "url": "/notes/claude-code-memory-system",
        "label": "记忆", "title": "Claude Code 记忆系统",
        "asset": "", "emoji": "🧠",
    },
    {
        "name": "exhibit_note_cybernetics", "rect": (664, 24, 36, 48),
        "anchor": (682, 88), "facing": "up",
        "type": "notes", "url": "/notes/cybernetics-and-ai-coding",
        "label": "控制论", "title": "Cybernetics · AI 编程",
        "asset": "", "emoji": "🔄",
    },
    {
        "name": "exhibit_note_feedback", "rect": (720, 24, 36, 48),
        "anchor": (702, 88), "facing": "up",
        "type": "notes", "url": "/notes/feedback-control-loop",
        "label": "反馈", "title": "Feedback Control Loop",
        "asset": "", "emoji": "🌀",
    },

    # ────── ROTUNDA — Centerpiece (the 3D Grove)
    {
        "name": "exhibit_grove_centerpiece",
        "rect": (608, 480, 64, 64),
        "anchor": (640, 560), "facing": "up",
        "type": "centerpiece", "url": "mochi-grove",
        "label": "Grove", "title": "Mochi 的小园子 · 中庭焦点",
        "asset": "B01-grove-sakura", "emoji": "🌸",
    },

    # ────── SOUTH PAVILION — Grove arch portal (lower-priority alt entry)
    # + comics frames (loaded dynamically at runtime, not in .tmj)

    # ────── EASTER EGG — tiny "About Airing" plaque behind the centerpiece
    {
        "name": "exhibit_about_airing",
        "rect": (628, 376, 24, 16),
        "anchor": (640, 400), "facing": "up",
        "type": "notes", "url": "/",
        "label": "Airing", "title": "策展人 · About",
        "asset": "", "emoji": "✒️",
    },
]


def make_interactables() -> list[dict]:
    out = []
    for i, e in enumerate(EXHIBITS, start=1000):
        x, y, w, h = e["rect"]
        ax, ay = e["anchor"]
        out.append({
            "id": i, "name": e["name"],
            "x": x, "y": y, "width": w, "height": h,
            "rotation": 0, "visible": True,
            "properties": [
                {"name": "kind",         "type": "string", "value": "exhibit"},
                {"name": "anchor_x",     "type": "int",    "value": ax},
                {"name": "anchor_y",     "type": "int",    "value": ay},
                {"name": "facing",       "type": "string", "value": e["facing"]},
                {"name": "exhibit_type", "type": "string", "value": e["type"]},
                {"name": "exhibit_url",  "type": "string", "value": e["url"]},
                {"name": "exhibit_label","type": "string", "value": e["label"]},
                {"name": "exhibit_title","type": "string", "value": e["title"]},
                {"name": "exhibit_emoji","type": "string", "value": e["emoji"]},
                {"name": "exhibit_asset","type": "string", "value": e["asset"]},
            ],
        })
    return out


def make_tmj() -> dict:
    return {
        "compressionlevel": -1,
        "width":  W_TILES,
        "height": H_TILES,
        "infinite": False,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tileheight": TILE, "tilewidth": TILE,
        "tiledversion": "1.10.2", "type": "map", "version": "1.10",
        "nextlayerid": 8, "nextobjectid": 2000,
        "tilesets": [{
            "columns": 4, "firstgid": 1,
            "image": "../tilesets/indoor_2f_v0/tiles.png",
            "imageheight": 64, "imagewidth": 64,
            "margin": 0, "name": "indoor_2f_v0",
            "spacing": 0, "tilecount": 16,
            "tileheight": TILE, "tilewidth": TILE,
        }],
        "layers": [
            {"id": 1, "name": "floor", "type": "tilelayer",
             "width": W_TILES, "height": H_TILES, "x": 0, "y": 0,
             "opacity": 1, "visible": True,
             "data": build_floor_layer()},
            {"id": 2, "name": "furniture_below", "type": "tilelayer",
             "width": W_TILES, "height": H_TILES, "x": 0, "y": 0,
             "opacity": 1, "visible": True,
             "data": build_empty_layer()},
            {"id": 3, "name": "furniture_above", "type": "tilelayer",
             "width": W_TILES, "height": H_TILES, "x": 0, "y": 0,
             "opacity": 1, "visible": True,
             "data": build_empty_layer()},
            {"id": 4, "name": "collision", "type": "objectgroup",
             "opacity": 1, "visible": True, "x": 0, "y": 0,
             "objects": make_collision_rects()},
            {"id": 5, "name": "spawn_points", "type": "objectgroup",
             "opacity": 1, "visible": True, "x": 0, "y": 0,
             "objects": make_spawns()},
            {"id": 6, "name": "portals", "type": "objectgroup",
             "opacity": 1, "visible": True, "x": 0, "y": 0,
             "objects": make_portals()},
            {"id": 7, "name": "interactables", "type": "objectgroup",
             "opacity": 1, "visible": True, "x": 0, "y": 0,
             "objects": make_interactables()},
        ],
    }


def main():
    out_path = os.path.join(
        os.path.dirname(__file__), '..',
        'public', 'lounge', 'assets', 'rooms', 'gallery.tmj',
    )
    out_path = os.path.abspath(out_path)
    tmj = make_tmj()
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(tmj, f, ensure_ascii=False, indent=2)
    size = os.path.getsize(out_path)
    print(f"✓ wrote {out_path}")
    print(f"  size: {size:,} bytes")
    print(f"  map: {W_TILES}×{H_TILES} tiles ({W_PX}×{H_PX} px)")
    print(f"  zones: {len(ZONES)}, exhibits: {len(EXHIBITS)}")


if __name__ == '__main__':
    main()
