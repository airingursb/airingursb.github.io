// V7.4 — Quest line system. Client-only for now (progress persists in localStorage).
// Future V7.4.1 will sync progress to Supabase so quests resume across devices.

export type QuestStep = {
  id: string                       // step id, unique within a quest
  description: string              // shown in quest panel
  trigger:                          // what counts as "step complete"
    | { kind: 'collect_pebble'; count: number }
    | { kind: 'visit_room'; room: string }
    | { kind: 'gift_received'; from_npc?: string }
    | { kind: 'wave_npc'; npc_id: string }
    | { kind: 'manual' }            // player clicks "I did it" in UI
}

export type QuestDef = {
  id: string
  giver_npc: string                // npc_id of the giver
  title: string
  blurb: string                    // shown when quest is accepted
  prereq_heart?: number            // min friendship to unlock from giver
  steps: QuestStep[]
  reward: string                   // free-form text describing the unlock
}

export const QUESTS: QuestDef[] = [
  {
    id: 'pip_first_friend',
    giver_npc: 'npc_pip',
    title: "Pip's Tour",
    blurb: "Pip wants to show you around. Visit every static room.",
    prereq_heart: 0,
    steps: [
      { id: 'visit_balcony',  description: 'Step onto the Balcony', trigger: { kind: 'visit_room', room: 'room_balcony' } },
      { id: 'visit_library',  description: 'Browse the Library',    trigger: { kind: 'visit_room', room: 'room_library' } },
      { id: 'visit_dj',       description: 'Pop into the DJ Floor', trigger: { kind: 'visit_room', room: 'room_dj_floor' } },
      { id: 'visit_grove',    description: 'Find the Grove',        trigger: { kind: 'visit_room', room: 'room_grove' } }
    ],
    reward: 'Pip unlocks insider tips (heart 1 dialog)'
  },
  {
    id: 'mio_three_pebbles',
    giver_npc: 'npc_mio',
    title: "Mio's Brew",
    blurb: 'Mio is brewing a one-off blend. Bring 3 pebbles of any kind.',
    prereq_heart: 1,
    steps: [
      { id: 'collect3', description: 'Collect 3 pebbles', trigger: { kind: 'collect_pebble', count: 3 } }
    ],
    reward: "Mio's Brew dialog unlocks + +1 friendship"
  },
  {
    id: 'theo_garden_walk',
    giver_npc: 'npc_theo',
    title: "Garden Walk",
    blurb: 'Theo wants to show you the Grove. Wave at him in the Grove.',
    prereq_heart: 0,
    steps: [
      { id: 'visit_grove', description: 'Visit the Grove', trigger: { kind: 'visit_room', room: 'room_grove' } },
      { id: 'wave_theo',   description: 'Wave at Theo',    trigger: { kind: 'wave_npc',   npc_id: 'npc_theo' } }
    ],
    reward: "Theo opens up about his seeds"
  },
  {
    id: 'halle_bookshelf',
    giver_npc: 'npc_halle',
    title: "The Top Shelf",
    blurb: 'Halle hinted there is something on the Library top shelf. Investigate.',
    prereq_heart: 2,
    steps: [
      { id: 'visit_library', description: 'Visit the Library', trigger: { kind: 'visit_room', room: 'room_library' } },
      { id: 'wave_halle',    description: 'Wave at Halle',     trigger: { kind: 'wave_npc',  npc_id: 'npc_halle' } }
    ],
    reward: 'Halle reveals a hidden first edition'
  },
  {
    id: 'dane_jam_marathon',
    giver_npc: 'npc_dane',
    title: "Jam Marathon",
    blurb: 'Dane wants to feel the bass. Trigger a Full Jam together.',
    prereq_heart: 1,
    steps: [
      { id: 'visit_dj',  description: 'Get to the DJ Floor', trigger: { kind: 'visit_room', room: 'room_dj_floor' } },
      { id: 'full_jam',  description: 'Hit the FULL JAM',    trigger: { kind: 'manual' } }
    ],
    reward: 'Dane unlocks late-night dialog'
  }
]

type QuestState = {
  accepted: boolean
  completedSteps: string[]   // step ids done
  completed: boolean
  acceptedAt?: number         // ms timestamp
  completedAt?: number
}

const STORAGE_KEY = 'lounge_quests_v1'

type QuestStateMap = Record<string, QuestState>

function loadAll(): QuestStateMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed as QuestStateMap : {}
  } catch { return {} }
}

function saveAll(map: QuestStateMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)) } catch {}
}

export function getQuestState(quest_id: string): QuestState {
  const all = loadAll()
  return all[quest_id] ?? { accepted: false, completedSteps: [], completed: false }
}

export function acceptQuest(quest_id: string) {
  const all = loadAll()
  if (all[quest_id]?.accepted) return
  all[quest_id] = { accepted: true, completedSteps: [], completed: false, acceptedAt: Date.now() }
  saveAll(all)
}

export function markStepDone(quest_id: string, step_id: string) {
  const all = loadAll()
  const s = all[quest_id]
  if (!s || !s.accepted || s.completed) return
  if (s.completedSteps.includes(step_id)) return
  s.completedSteps.push(step_id)
  const def = QUESTS.find(q => q.id === quest_id)
  if (def && def.steps.every(step => s.completedSteps.includes(step.id))) {
    s.completed = true
    s.completedAt = Date.now()
  }
  saveAll(all)
}

// Triggers that should drive step completion. Called from RoomScene at the
// relevant moments. Each one walks active quests, finds matching steps, marks them.
export function onPebbleCollected(_pebbleId: string) {
  const all = loadAll()
  for (const def of QUESTS) {
    const st = all[def.id]
    if (!st || !st.accepted || st.completed) continue
    let progressed = false
    for (const step of def.steps) {
      if (st.completedSteps.includes(step.id)) continue
      if (step.trigger.kind === 'collect_pebble') {
        // Count pebbles total since accept. Simpler MVP: assume each call is +1
        // until count hit. We persist count under a step-private key.
        const key = `__count__${def.id}__${step.id}`
        const next = (Number(localStorage.getItem(key) || '0') + 1)
        try { localStorage.setItem(key, String(next)) } catch {}
        if (next >= step.trigger.count) {
          markStepDone(def.id, step.id)
          progressed = true
        }
      }
    }
    if (progressed) showQuestToast(`Quest progress: ${def.title}`)
  }
}

export function onRoomVisited(roomId: string) {
  const all = loadAll()
  for (const def of QUESTS) {
    const st = all[def.id]
    if (!st || !st.accepted || st.completed) continue
    for (const step of def.steps) {
      if (st.completedSteps.includes(step.id)) continue
      if (step.trigger.kind === 'visit_room' && step.trigger.room === roomId) {
        markStepDone(def.id, step.id)
        showQuestToast(`Quest progress: ${def.title}`)
      }
    }
  }
}

export function onWaveAt(npcId: string) {
  const all = loadAll()
  for (const def of QUESTS) {
    const st = all[def.id]
    if (!st || !st.accepted || st.completed) continue
    for (const step of def.steps) {
      if (st.completedSteps.includes(step.id)) continue
      if (step.trigger.kind === 'wave_npc' && step.trigger.npc_id === npcId) {
        markStepDone(def.id, step.id)
        showQuestToast(`Quest progress: ${def.title}`)
      }
    }
  }
}

// Cheap UI toast — non-blocking. Floats top-right.
function showQuestToast(text: string) {
  const id = 'lounge-quest-toast-' + Date.now()
  const el = document.createElement('div')
  el.id = id
  el.textContent = '📋  ' + text
  el.style.cssText = [
    'position:fixed', 'top:80px', 'right:24px',
    'background:rgba(80,60,160,.92)', 'color:#fff',
    'padding:8px 14px', 'border-radius:8px',
    'font-family:ui-monospace, monospace', 'font-size:12px',
    'z-index:9999', 'pointer-events:none',
    'box-shadow:0 3px 12px rgba(0,0,0,.4)',
    'opacity:0', 'transition:opacity .25s ease'
  ].join(';')
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '1' })
  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, 2400)
}

export function listAcceptedQuests(): Array<{ def: QuestDef; state: QuestState }> {
  const all = loadAll()
  return QUESTS.filter(q => all[q.id]?.accepted).map(q => ({ def: q, state: all[q.id] }))
}
