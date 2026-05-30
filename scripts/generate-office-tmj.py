#!/usr/bin/env python3
"""Generate the office room: a tileset PNG from the delivered 16px tiles + office.tmj.

Office = a 40×26 tile (640×416 px) clean modern startup office. Layout mirrors
office-studio/FLOOR_PLAN.md. Floor/walls are real pixel tiles (A01/A03/A04); the
furniture (desks, monitors, whiteboard, couch, plants…) is placed as sprites by
src/lounge/office_decor.ts so we get transparency + depth ordering.

Outputs:
  public/lounge/assets/tilesets/office_v1/tiles.png   (packed 16px tileset)
  public/lounge/assets/rooms/office.tmj               (Tiled JSON map)

Re-run after layout edits:  python3 scripts/generate-office-tmj.py
"""
import json, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TILES = os.path.join(ROOT, 'public/lounge/assets/office/tiles')
TS_DIR = os.path.join(ROOT, 'public/lounge/assets/tilesets/office_v1')
ROOMS = os.path.join(ROOT, 'public/lounge/assets/rooms')

TILE = 16
W, H = 40, 26                 # map size in tiles
WPX, HPX = W * TILE, H * TILE

# ── build the tileset PNG: [floor, accent, wall, partition, window_top, window_bot] ──
def build_tileset():
    os.makedirs(TS_DIR, exist_ok=True)
    floor = Image.open(f'{TILES}/A01-floor.png').convert('RGBA')
    accent = Image.open(f'{TILES}/A02-floor-accent.png').convert('RGBA')
    wall = Image.open(f'{TILES}/A03-wall.png').convert('RGBA')
    part = Image.open(f'{TILES}/A05-partition.png').convert('RGBA')
    win = Image.open(f'{TILES}/A04-window.png').convert('RGBA')   # 16×32
    win_top = win.crop((0, 0, 16, 16))
    win_bot = win.crop((0, 16, 16, 32))
    cells = [floor, accent, wall, part, win_top, win_bot]
    sheet = Image.new('RGBA', (TILE * len(cells), TILE), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.paste(c.resize((TILE, TILE)), (i * TILE, 0))
    sheet.save(f'{TS_DIR}/tiles.png')
    return len(cells)

GID_FLOOR, GID_ACCENT, GID_WALL, GID_PART, GID_WIN_T, GID_WIN_B = 1, 2, 3, 4, 5, 6

# meeting/collab zone accent patch (cols 4..11, rows 18..23) — see FLOOR_PLAN
ACCENT = (4, 18, 12, 24)

def floor_layer():
    d = []
    for r in range(H):
        for c in range(W):
            inside = (ACCENT[0] <= c < ACCENT[2] and ACCENT[1] <= r < ACCENT[3])
            d.append(GID_ACCENT if inside else GID_FLOOR)
    return d

def walls_layer():
    d = [0] * (W * H)
    def put(c, r, g): d[r * W + c] = g
    for c in range(W):                 # top wall + bottom edge
        put(c, 0, GID_WALL)
        put(c, H - 1, GID_WALL)
    for r in range(H):                 # left/right edges
        put(0, r, GID_WALL)
        put(W - 1, r, GID_WALL)
    # windows along the top wall (skip the corners + the door gap)
    for c in range(4, W - 4, 6):
        put(c, 0, GID_WIN_T)
        put(c, 1, GID_WIN_B)
    return d

def tilelayer(name, data):
    return {'type': 'tilelayer', 'name': name, 'width': W, 'height': H,
            'x': 0, 'y': 0, 'opacity': 1, 'visible': True, 'data': data}

def rect(name, x, y, w, h):
    return {'name': name, 'x': x, 'y': y, 'width': w, 'height': h, 'visible': True, 'rotation': 0}

def point(name, x, y):
    return {'name': name, 'x': x, 'y': y, 'width': 0, 'height': 0, 'point': True, 'visible': True, 'rotation': 0}

def build_tmj(ntiles):
    door_cx = (W // 2) * TILE   # bottom-center door
    collision = [
        rect('wall_top', 0, 0, WPX, TILE),
        rect('wall_bottom_l', 0, HPX - TILE, door_cx - 24, TILE),
        rect('wall_bottom_r', door_cx + 24, HPX - TILE, WPX - door_cx - 24, TILE),
        rect('wall_left', 0, 0, TILE, HPX),
        rect('wall_right', WPX - TILE, 0, TILE, HPX),
    ]
    spawns = [point('default', door_cx, HPX - TILE * 3), point('from_lobby', door_cx, HPX - TILE * 3)]
    portals = [rect('to_lobby', door_cx - 24, HPX - TILE, 48, TILE)]
    tmj = {
        'compressionlevel': -1, 'infinite': False, 'orientation': 'orthogonal',
        'renderorder': 'right-down', 'tiledversion': '1.10', 'type': 'map', 'version': '1.10',
        'width': W, 'height': H, 'tilewidth': TILE, 'tileheight': TILE,
        'tilesets': [{
            'firstgid': 1, 'name': 'office_v1', 'image': '../tilesets/office_v1/tiles.png',
            'imagewidth': TILE * ntiles, 'imageheight': TILE, 'tilewidth': TILE, 'tileheight': TILE,
            'tilecount': ntiles, 'columns': ntiles, 'margin': 0, 'spacing': 0,
        }],
        'layers': [
            tilelayer('floor', floor_layer()),
            tilelayer('furniture_below', walls_layer()),
            tilelayer('furniture_above', [0] * (W * H)),
            {'type': 'objectgroup', 'name': 'collision', 'objects': collision, 'opacity': 1, 'visible': True, 'x': 0, 'y': 0},
            {'type': 'objectgroup', 'name': 'spawn_points', 'objects': spawns, 'opacity': 1, 'visible': True, 'x': 0, 'y': 0},
            {'type': 'objectgroup', 'name': 'portals', 'objects': portals, 'opacity': 1, 'visible': True, 'x': 0, 'y': 0},
        ],
    }
    os.makedirs(ROOMS, exist_ok=True)
    with open(f'{ROOMS}/office.tmj', 'w') as f:
        json.dump(tmj, f, indent=1)

if __name__ == '__main__':
    n = build_tileset()
    build_tmj(n)
    print(f'office: tileset ({n} tiles) + office.tmj ({W}×{H}) written')
