// V6.0 — Minimap. Pure UI module, renders an SVG diagram of the world.
// Coordinates are abstract diagram-space (0..140 × 0..100, the SVG viewBox),
// not real room coordinates.

export type MapRoom = {
  id: string
  label: string
  x: number  // center x in viewBox
  y: number  // center y in viewBox
  w: number  // half-width
  h: number  // half-height
}

export type MapEdge = { a: string; b: string }

export const MAP_ROOMS: MapRoom[] = [
  { id: 'room_grove',    label: 'Grove',    x: 20,  y: 12, w: 16, h: 7 },
  { id: 'room_library',  label: 'Library',  x: 70,  y: 12, w: 18, h: 7 },
  { id: 'room_balcony',  label: 'Balcony',  x: 20,  y: 38, w: 16, h: 7 },
  { id: 'room_lobby',    label: 'Lobby',    x: 70,  y: 38, w: 22, h: 10 },
  { id: 'room_dj_floor', label: 'DJ Floor', x: 120, y: 38, w: 16, h: 7 },
  { id: 'room_beach',    label: 'Beach',    x: 20,  y: 68, w: 16, h: 7 },
  { id: 'room_home',     label: 'Home',     x: 70,  y: 68, w: 22, h: 7 }
]

export const MAP_EDGES: MapEdge[] = [
  { a: 'room_library',  b: 'room_lobby'    },
  { a: 'room_lobby',    b: 'room_balcony'  },
  { a: 'room_lobby',    b: 'room_dj_floor' },
  { a: 'room_lobby',    b: 'room_home'     },
  { a: 'room_balcony',  b: 'room_beach'    },
  { a: 'room_balcony',  b: 'room_grove'    }
]

const ROOM_BY_ID = new Map(MAP_ROOMS.map(r => [r.id, r]))

let titleEl: HTMLElement | null = null
let svgEl: SVGSVGElement | null = null
let panelEl: HTMLElement | null = null
const SVG_NS = 'http://www.w3.org/2000/svg'

function ensure() {
  if (panelEl) return
  panelEl = document.getElementById('lounge-minimap')
  titleEl = document.getElementById('lounge-mm-room-name')
  svgEl = document.getElementById('lounge-mm-svg') as unknown as SVGSVGElement | null
}

function isHomeRoom(id: string): boolean {
  return /^room_home_[0-9a-f]{8}$/.test(id)
}

function mapKeyFor(roomId: string): string {
  return isHomeRoom(roomId) ? 'room_home' : roomId
}

function labelFor(roomId: string): string {
  const key = mapKeyFor(roomId)
  return ROOM_BY_ID.get(key)?.label ?? roomId
}

export function renderMinimap(currentRoomId: string, npcRoomIds: string[]) {
  ensure()
  if (!panelEl || !svgEl || !titleEl) return

  panelEl.hidden = false
  titleEl.textContent = labelFor(currentRoomId)

  // Clear
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild)

  // Edges
  for (const e of MAP_EDGES) {
    const a = ROOM_BY_ID.get(e.a); const b = ROOM_BY_ID.get(e.b)
    if (!a || !b) continue
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('class', 'mm-edge')
    line.setAttribute('x1', String(a.x))
    line.setAttribute('y1', String(a.y))
    line.setAttribute('x2', String(b.x))
    line.setAttribute('y2', String(b.y))
    svgEl.appendChild(line)
  }

  const currentKey = mapKeyFor(currentRoomId)
  const npcKeys = new Set(npcRoomIds.map(mapKeyFor))

  // Rooms
  for (const r of MAP_ROOMS) {
    const rect = document.createElementNS(SVG_NS, 'rect')
    let cls = 'mm-room'
    if (r.id === currentKey) cls += ' here'
    else if (npcKeys.has(r.id)) cls += ' has-npc'
    rect.setAttribute('class', cls)
    rect.setAttribute('x', String(r.x - r.w))
    rect.setAttribute('y', String(r.y - r.h))
    rect.setAttribute('width', String(r.w * 2))
    rect.setAttribute('height', String(r.h * 2))
    rect.setAttribute('rx', '2')
    svgEl.appendChild(rect)

    const label = document.createElementNS(SVG_NS, 'text')
    label.setAttribute('class', 'mm-room-label' + (r.id === currentKey ? ' here' : ''))
    label.setAttribute('x', String(r.x))
    label.setAttribute('y', String(r.y + 2))
    label.textContent = r.label
    svgEl.appendChild(label)

    // NPC dots: small filled circle inside the room rect
    if (npcKeys.has(r.id)) {
      const dot = document.createElementNS(SVG_NS, 'circle')
      dot.setAttribute('class', 'mm-npc-dot')
      dot.setAttribute('cx', String(r.x + r.w - 3))
      dot.setAttribute('cy', String(r.y - r.h + 3))
      dot.setAttribute('r', '1.8')
      svgEl.appendChild(dot)
    }
  }
}

export function hideMinimap() {
  ensure()
  if (panelEl) panelEl.hidden = true
}

// Door labels (floating "→ DJ Floor" near portal)
let doorLabelEl: HTMLElement | null = null
export function showDoorLabel(text: string, screenX: number, screenY: number) {
  if (!doorLabelEl) doorLabelEl = document.getElementById('lounge-door-label')
  if (!doorLabelEl) return
  doorLabelEl.textContent = text
  doorLabelEl.style.left = `${screenX}px`
  doorLabelEl.style.top = `${screenY}px`
  doorLabelEl.hidden = false
}
export function hideDoorLabel() {
  if (!doorLabelEl) doorLabelEl = document.getElementById('lounge-door-label')
  if (!doorLabelEl) return
  doorLabelEl.hidden = true
}
