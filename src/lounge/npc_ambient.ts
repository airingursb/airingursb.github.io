// V15.2 — Unprompted NPC thought bubbles. Every 45-90s an idle NPC has a
// chance to pop a low-key bubble (`*hums*`, `*shuffles cards*`) without
// any player interaction. Builds the illusion that they exist between
// visits instead of waiting for the player like quest-givers in an empty
// MMO town.
//
// Per-NPC overrides exist for the iconic recurring characters (Mox, Iris,
// Halle, etc.) so the lines feel role-appropriate. NPCs without an
// override fall back to GENERIC_LINES, which are written to fit any cozy
// lounge bear.

const GENERIC_LINES = [
  '*hums quietly*',
  '*stretches*',
  '*looks out the window*',
  '*flips a small stone in hand*',
  '*sips something warm*',
  '*adjusts scarf*',
  '*watches the dust*',
  '*counts to ten under breath*',
  '*pats own knees absently*',
  '*tilts head, listening*'
]

const PER_NPC_LINES: Record<string, string[]> = {
  npc_mox: [
    '*tinkering*',
    '*tightens a tiny screw*',
    '*"hm — not that one"*',
    '*sketches a gear on her palm*',
    '*pockets a copper fitting*'
  ],
  npc_iris: [
    '*humming to the leaves*',
    '*plucks a dead petal*',
    '*sniffs the soil*',
    '*"good morning, little one"*',
    '*ties a stem with twine*'
  ],
  npc_halle: [
    '*turns a page*',
    '*marks her place with a finger*',
    '*"hmm — that\'s a fine line"*',
    '*adjusts glasses*',
    '*re-reads a paragraph*'
  ],
  npc_pip: [
    '*counts coins quietly*',
    '*shuffles a deck*',
    '*restacks a pile*',
    '*whistles two notes*'
  ],
  npc_mio: [
    '*braids a tiny rope*',
    '*hums a sea shanty*',
    '*checks a knot*',
    '*"the tide knows things"*'
  ],
  npc_kai: [
    '*stretches arms wide*',
    '*shadowboxes briefly*',
    '*touches toes*',
    '*"deep breaths"*'
  ],
  npc_ren: [
    '*folds a paper crane*',
    '*"patience first"*',
    '*sips tea*',
    '*adjusts sleeves*'
  ],
  npc_sora: [
    '*looks at the sky*',
    '*counts stars under breath*',
    '*"there — that one moved"*',
    '*draws a constellation in the air*'
  ],
  npc_theo: [
    '*flips through a small ledger*',
    '*scribbles a quick note*',
    '*"interesting, interesting"*',
    '*taps pen against chin*'
  ],
  npc_marin: [
    '*tunes a string*',
    '*hums a chord*',
    '*"almost in tune"*',
    '*strums softly*'
  ],
  npc_cole: [
    '*wipes hands on apron*',
    '*"yes, yes, almost ready"*',
    '*tastes a spoon*',
    '*adjusts a flame*'
  ],
  npc_wren: [
    '*sketches in a small book*',
    '*holds up a thumb to measure*',
    '*"the shadow goes this way"*',
    '*smudges with a finger*'
  ]
}

export function pickAmbientLine(npcId: string): string {
  const override = PER_NPC_LINES[npcId]
  const pool = override && override.length > 0 ? override : GENERIC_LINES
  return pool[Math.floor(Math.random() * pool.length)]
}

// V15.3 — Said unprompted right after the player enters the NPC's room.
// Kept short on purpose; the full conversation only kicks in when the
// player actually clicks them.
const GENERIC_NOTICE = [
  '*looks up*',
  'Oh — hi.',
  'There you are.',
  '*nods*',
  'Welcome.',
  '*smiles briefly*'
]

const PER_NPC_NOTICE: Record<string, string[]> = {
  npc_mox:   ['Hey. Don\'t touch the bench.', '*sets down a tool*', 'Look who it is.'],
  npc_iris:  ['Mind the seedlings.', 'You smell like outside. Good.', '*waves a leafy hand*'],
  npc_halle: ['*marks her page*', 'Shh — kidding. Hi.', '*looks up over glasses*'],
  npc_pip:   ['Want a card trick?', '*pockets the coins*', 'Hey hey.'],
  npc_mio:   ['The water\'s loud today.', '*pauses mid-knot*', 'You came back.'],
  npc_kai:   ['You should stretch.', '*pauses mid-set*', 'Strong day, huh?'],
  npc_ren:   ['Tea?', '*bows slightly*', 'You\'re early.'],
  npc_sora:  ['Look up later. It\'s clear.', '*points at the ceiling*', 'You see it too?'],
  npc_theo:  ['*flips a page*', 'Notes, notes.', '*clicks a pen*'],
  npc_marin: ['Listen — almost in tune.', '*plucks a string*', 'You\'re just in time.'],
  npc_cole:  ['Hungry?', '*wipes hands*', 'Two minutes on this.'],
  npc_wren:  ['Stand still — just a sec.', '*sketches you in two strokes*', 'There you are. In ink.']
}

export function pickNoticeLine(npcId: string): string {
  const override = PER_NPC_NOTICE[npcId]
  const pool = override && override.length > 0 ? override : GENERIC_NOTICE
  return pool[Math.floor(Math.random() * pool.length)]
}
