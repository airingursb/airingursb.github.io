// V7.7 — Cutscene engine. Minimal sequence executor: a Step is one of
//   { type: 'say', npc_id, text, duration_ms }
//   { type: 'wait', ms }
//   { type: 'camera_pan', x, y, duration_ms }
//   { type: 'camera_zoom', zoom, duration_ms }
//   { type: 'move_npc', npc_id, x, y, duration_ms }
//   { type: 'fade', alpha, duration_ms }    // dim a 1000-depth overlay
//   { type: 'shake', duration_ms, intensity }
//
// Cutscenes are gated by triggers (room entry + condition). At most one runs
// per scene boot. Progress is persisted in localStorage so the same cutscene
// only fires once unless reset (e.g., new visitor).

export type CutsceneStep =
  | { type: 'say';        npc_id: string; text: string; duration_ms?: number }
  | { type: 'wait';       ms: number }
  | { type: 'camera_pan'; x: number; y: number; duration_ms: number }
  | { type: 'camera_zoom'; zoom: number; duration_ms: number }
  | { type: 'move_npc';   npc_id: string; x: number; y: number; duration_ms: number }
  | { type: 'fade';       alpha: number; duration_ms: number; color?: number }
  | { type: 'shake';      duration_ms: number; intensity?: number }

export type CutsceneTrigger = {
  room?: string                                // must be in this room
  time_min?: string                            // "HH:MM"
  time_max?: string                            // "HH:MM"
  heart_min?: number                           // requires friendship with giver_npc
  heart_npc_id?: string                        // who the friendship is with
  event?: string                               // active festival id required
  bundle?: string                              // N5: Community Hall bundle reward_unlock_id required
}

export type CutsceneDef = {
  id: string
  trigger: CutsceneTrigger
  steps: CutsceneStep[]
  /** if true, can replay on every entry; default false = once per visitor. */
  replay?: boolean
}

export const CUTSCENES: CutsceneDef[] = [
  {
    id: 'first_arrival_pip',
    trigger: { room: 'room_lobby' },  // any time, fires on first visit
    steps: [
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_pip', text: '👋 Oh hey! Welcome to the lounge.', duration_ms: 2500 },
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_pip', text: 'Wander around. Click anything. We have all day.', duration_ms: 2800 }
    ]
  },
  {
    id: 'sunset_at_grove',
    trigger: { room: 'room_grove', time_min: '17:30', time_max: '19:30' },
    replay: false,
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_theo', text: 'Watch the light hit the pond at this hour.', duration_ms: 3000 },
      { type: 'camera_pan', x: 320, y: 224, duration_ms: 1800 },
      { type: 'wait', ms: 1500 },
      { type: 'say', npc_id: 'npc_theo', text: 'I planted those lilies the year I arrived.', duration_ms: 3000 },
      { type: 'wait', ms: 1500 },
      { type: 'camera_pan', x: 200, y: 144, duration_ms: 1800 }
    ]
  },
  {
    id: 'midnight_jam_kai',
    trigger: { room: 'room_dj_floor', time_min: '00:00', time_max: '02:00' },
    replay: false,
    steps: [
      { type: 'wait', ms: 500 },
      { type: 'say', npc_id: 'npc_kai', text: '🎧 Look who showed up.', duration_ms: 2200 },
      { type: 'shake', duration_ms: 400, intensity: 0.008 },
      { type: 'say', npc_id: 'npc_kai', text: 'This next track is dedicated. Stay on the floor.', duration_ms: 3000 }
    ]
  },

  // ─── P4 — One heart event per remaining NPC ────────────────────────
  // Each requires heart_min: 2 with that NPC and a contextual room/time.

  {
    id: 'mio_brew_reveal',
    trigger: { room: 'room_lobby', heart_npc_id: 'npc_mio', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_mio', text: "Let me show you something. Sit.", duration_ms: 2400 },
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_mio', text: "This is the cold-brew I never put on the menu.", duration_ms: 2800 },
      { type: 'say', npc_id: 'npc_mio', text: "First taste is yours. Tell me what you think.", duration_ms: 3000 }
    ]
  },
  {
    id: 'pip_keys',
    trigger: { room: 'room_lobby', heart_npc_id: 'npc_pip', heart_min: 3 },
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_pip', text: "Hold up.", duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_pip', text: "I want you to have this — set of keys to the back office.", duration_ms: 3000 },
      { type: 'say', npc_id: 'npc_pip', text: "Doesn't unlock anything important. But you're family now.", duration_ms: 3200 }
    ]
  },
  {
    id: 'ren_playlist',
    trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_ren', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 700 },
      { type: 'say', npc_id: 'npc_ren', text: "Wait — I made you something.", duration_ms: 2200 },
      { type: 'camera_pan', x: 152, y: 224, duration_ms: 1500 },
      { type: 'say', npc_id: 'npc_ren', text: "A mixtape. 47 minutes. No skips.", duration_ms: 2800 },
      { type: 'wait', ms: 800 },
      { type: 'camera_pan', x: 240, y: 160, duration_ms: 1500 }
    ]
  },
  {
    id: 'halle_first_edition',
    trigger: { room: 'room_library', heart_npc_id: 'npc_halle', heart_min: 3 },
    steps: [
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_halle', text: "Shh. Come closer.", duration_ms: 2000 },
      { type: 'camera_pan', x: 96, y: 144, duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_halle', text: "A first edition. I've been waiting to give it to someone careful.", duration_ms: 3200 },
      { type: 'say', npc_id: 'npc_halle', text: "Don't fold the pages. Don't even bookmark them. Just read.", duration_ms: 3200 }
    ]
  },
  {
    id: 'sora_named_shell',
    trigger: { room: 'room_beach', heart_npc_id: 'npc_sora', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_sora', text: "Hey! Look at this one.", duration_ms: 2200 },
      { type: 'camera_pan', x: 240, y: 200, duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_sora', text: "Iridescent. Pearly. I named it after you.", duration_ms: 3000 }
    ]
  },
  {
    id: 'theo_seed_gift',
    trigger: { room: 'room_grove', heart_npc_id: 'npc_theo', heart_min: 3 },
    steps: [
      { type: 'wait', ms: 700 },
      { type: 'say', npc_id: 'npc_theo', text: "Take this.", duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_theo', text: "A seed from a tree my grandfather planted.", duration_ms: 2800 },
      { type: 'say', npc_id: 'npc_theo', text: "Plant it anywhere. It'll take three years to wake up. Worth the wait.", duration_ms: 3400 }
    ]
  },
  {
    id: 'marin_acknowledgment',
    trigger: { room: 'room_lobby', heart_npc_id: 'npc_marin', heart_min: 3 },
    steps: [
      { type: 'wait', ms: 700 },
      { type: 'say', npc_id: 'npc_marin', text: "Finished a draft. Want to see?", duration_ms: 2400 },
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_marin', text: "Page one: acknowledgments. Page two: your name.", duration_ms: 3200 }
    ]
  },
  {
    id: 'cole_print',
    trigger: { room: 'room_library', heart_npc_id: 'npc_cole', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_cole', text: "Printed this last week.", duration_ms: 2200 },
      { type: 'camera_pan', x: 304, y: 224, duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_cole', text: "You. By the fireplace. 7:14pm. You didn't notice.", duration_ms: 3200 }
    ]
  },
  {
    id: 'wren_book_club',
    trigger: { room: 'room_library', heart_npc_id: 'npc_wren', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_wren', text: "Tuesday. 7pm. You're in.", duration_ms: 2200 },
      { type: 'say', npc_id: 'npc_wren', text: "Don't read the book. The point is the talking.", duration_ms: 2800 },
      { type: 'say', npc_id: 'npc_wren', text: "I'll save you the good chair.", duration_ms: 2200 }
    ]
  },
  {
    id: 'dane_dedicated_set',
    trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_dane', heart_min: 3, time_min: '00:00', time_max: '03:00' },
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_dane', text: "🎧 Last track of the night. Listen.", duration_ms: 2600 },
      { type: 'shake', duration_ms: 600, intensity: 0.008 },
      { type: 'say', npc_id: 'npc_dane', text: "This one's for you. Don't sit down.", duration_ms: 3000 }
    ]
  },

  // N5: bundle-gated cutscenes — fire once when the player enters the right
  // room after completing the Community Hall bundle that unlocks them.
  {
    id: 'sora_sea_lore_cutscene',
    trigger: { room: 'room_beach', bundle: 'sora_sea_lore' },
    steps: [
      { type: 'wait', ms: 700 },
      { type: 'say', npc_id: 'npc_sora', text: '🔥 The bonfire kit you stocked is lit. Sit with me?', duration_ms: 2800 },
      { type: 'camera_pan', x: 240, y: 200, duration_ms: 1800 },
      { type: 'say', npc_id: 'npc_sora', text: 'You see that line out past the shore? That\'s where the old wreck sits.', duration_ms: 3200 },
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_sora', text: 'My grandmother said her grandmother dove there. Found things. Lost things.', duration_ms: 3400 },
      { type: 'say', npc_id: 'npc_sora', text: 'Some nights the wind makes it sing. That\'s the sea lore. Listen.', duration_ms: 3500 }
    ]
  },
  {
    id: 'halle_winter_reading_cutscene',
    trigger: { room: 'room_library', bundle: 'halle_winter_reading' },
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_halle', text: '❄️ The songbook is shelved. Pull a chair.', duration_ms: 2400 },
      { type: 'camera_pan', x: 96, y: 144, duration_ms: 1500 },
      { type: 'say', npc_id: 'npc_halle', text: 'Winter carols, hand-copied. I started this in my twenties.', duration_ms: 3200 },
      { type: 'wait', ms: 700 },
      { type: 'say', npc_id: 'npc_halle', text: 'Read aloud whichever page falls open. Tradition.', duration_ms: 3000 }
    ]
  },

  // ─── V10.1 — Deep heart events (4 / 6 / 8 / 10) for all 11 NPCs ─────
  // These are gated by getNpcHeartLevel() (npc_hearts.ts), not player↔player
  // friendships. Each arc deepens: 4=personal reveal, 6=vulnerable, 8=future,
  // 10=peak intimacy. 11 NPCs × 4 events = 44 cutscenes.

  // Mio (lobby barista) — speciality coffee, family bakery, retirement plan
  { id: 'mio_h4', trigger: { room: 'room_lobby', heart_npc_id: 'npc_mio', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_mio', text: "I learned to roast from my mother. She still calls Sundays.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_mio', text: "Coffee is family for me. I forget that some days.", duration_ms: 3000 }
  ]},
  { id: 'mio_h6', trigger: { room: 'room_lobby', heart_npc_id: 'npc_mio', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_mio', text: "Bad day yesterday. Burned a whole batch. Slept on the storeroom floor.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_mio', text: "Don't tell Pip. Some days the lounge holds me up.", duration_ms: 3000 }
  ]},
  { id: 'mio_h8', trigger: { room: 'room_lobby', heart_npc_id: 'npc_mio', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_mio', text: "I want to open a bakery one day. Small. Window seats.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_mio', text: "If I do, you get a key.", duration_ms: 2400 }
  ]},
  { id: 'mio_h10', trigger: { room: 'room_lobby', heart_npc_id: 'npc_mio', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_mio', text: "Sit. I made you something off-menu.", duration_ms: 2400 },
    { type: 'camera_zoom', zoom: 1.15, duration_ms: 1200 },
    { type: 'say', npc_id: 'npc_mio', text: "Cardamom, dark chocolate, a hint of orange. I call it 'yours'.", duration_ms: 3500 },
    { type: 'camera_zoom', zoom: 1.0, duration_ms: 1200 }
  ]},

  // Pip (lobby host / founder) — lounge origin story
  { id: 'pip_h4', trigger: { room: 'room_lobby', heart_npc_id: 'npc_pip', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_pip', text: "Did I ever tell you why I opened the lounge? Probably not.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_pip', text: "Twelve years ago I had nowhere to go after work. So I made somewhere.", duration_ms: 3400 }
  ]},
  { id: 'pip_h6', trigger: { room: 'room_lobby', heart_npc_id: 'npc_pip', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_pip', text: "Some nights I lock up alone and the room still feels full.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_pip', text: "I think that's what 'home' means. Don't quote me.", duration_ms: 3000 }
  ]},
  { id: 'pip_h8', trigger: { room: 'room_lobby', heart_npc_id: 'npc_pip', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_pip', text: "I've been thinking about retiring. Quietly. Not yet.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_pip', text: "If the day comes — would you take the front desk for a week?", duration_ms: 3400 }
  ]},
  { id: 'pip_h10', trigger: { room: 'room_lobby', heart_npc_id: 'npc_pip', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_pip', text: "Pull up a chair. I want to show you something.", duration_ms: 2800 },
    { type: 'camera_pan', x: 240, y: 110, duration_ms: 1500 },
    { type: 'say', npc_id: 'npc_pip', text: "The first ledger. The original guest list. Twelve names.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_pip', text: "Your name goes on the last page. With the founders.", duration_ms: 3200 }
  ]},

  // Ren (DJ floor mixer)
  { id: 'ren_h4', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_ren', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_ren', text: "I started mixing at 14. In a closet. Headphones too big.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_ren', text: "Music kept me out of trouble. Mostly.", duration_ms: 2800 }
  ]},
  { id: 'ren_h6', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_ren', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_ren', text: "Track I can't finish. Started it five years ago. About my brother.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_ren', text: "Bring me your shells next week. I might play you the unfinished part.", duration_ms: 3400 }
  ]},
  { id: 'ren_h8', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_ren', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_ren', text: "Demo's done. Sending it to a label tomorrow.", duration_ms: 2800 },
    { type: 'say', npc_id: 'npc_ren', text: "You're the only one who's heard the full thing.", duration_ms: 3000 }
  ]},
  { id: 'ren_h10', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_ren', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_ren', text: "🎧 Listen to the bassline. Hear it?", duration_ms: 2400 },
    { type: 'shake', duration_ms: 500, intensity: 0.01 },
    { type: 'say', npc_id: 'npc_ren', text: "That sample. It's your name. I recorded you saying it. Spliced it in.", duration_ms: 3800 }
  ]},

  // Halle (librarian)
  { id: 'halle_h4', trigger: { room: 'room_library', heart_npc_id: 'npc_halle', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_halle', text: "I was a teacher. Twenty years. Quit on a Tuesday.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_halle', text: "Books were quieter. Books still are.", duration_ms: 2800 }
  ]},
  { id: 'halle_h6', trigger: { room: 'room_library', heart_npc_id: 'npc_halle', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_halle', text: "Lost someone twelve years back. Stopped reading for a year.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_halle', text: "Started again with the worst novel I've ever read. Saved me anyway.", duration_ms: 3600 }
  ]},
  { id: 'halle_h8', trigger: { room: 'room_library', heart_npc_id: 'npc_halle', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_halle', text: "I'm writing one. Memoir. Sixty pages so far. Slow going.", duration_ms: 3000 },
    { type: 'say', npc_id: 'npc_halle', text: "Want to read chapter one? Only you.", duration_ms: 2800 }
  ]},
  { id: 'halle_h10', trigger: { room: 'room_library', heart_npc_id: 'npc_halle', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_halle', text: "Come behind the desk.", duration_ms: 2000 },
    { type: 'camera_pan', x: 80, y: 144, duration_ms: 1500 },
    { type: 'say', npc_id: 'npc_halle', text: "Look. I kept the index card with your first checkout. 'A Wizard of Earthsea'.", duration_ms: 3800 },
    { type: 'say', npc_id: 'npc_halle', text: "I knew right then. The lounge had a quiet one.", duration_ms: 3200 }
  ]},

  // Sora (beach forager)
  { id: 'sora_h4', trigger: { room: 'room_beach', heart_npc_id: 'npc_sora', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_sora', text: "My grandmother taught me which shells to keep and which to give back.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_sora', text: "She died the year I moved here. The beach still feels like her.", duration_ms: 3400 }
  ]},
  { id: 'sora_h6', trigger: { room: 'room_beach', heart_npc_id: 'npc_sora', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_sora', text: "Sometimes I dream I'm swimming and can't find shore.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_sora', text: "Then I wake and the lounge is right here. So is the beach.", duration_ms: 3400 }
  ]},
  { id: 'sora_h8', trigger: { room: 'room_beach', heart_npc_id: 'npc_sora', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_sora', text: "Saving up for a dive trip. South coast. Wreck site.", duration_ms: 3000 },
    { type: 'say', npc_id: 'npc_sora', text: "If I bring back something old, it's yours first.", duration_ms: 3000 }
  ]},
  { id: 'sora_h10', trigger: { room: 'room_beach', heart_npc_id: 'npc_sora', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_sora', text: "Walk with me to the wreck line.", duration_ms: 2400 },
    { type: 'camera_pan', x: 240, y: 240, duration_ms: 2000 },
    { type: 'say', npc_id: 'npc_sora', text: "Here. A pearl. I've been holding onto it for the right person.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_sora', text: "Don't say anything. Just keep it.", duration_ms: 2800 }
  ]},

  // Theo (grove caretaker)
  { id: 'theo_h4', trigger: { room: 'room_grove', heart_npc_id: 'npc_theo', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_theo', text: "Each tree in the grove I planted with a person in mind.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_theo', text: "The new oak by the pond? That one's yours.", duration_ms: 3000 }
  ]},
  { id: 'theo_h6', trigger: { room: 'room_grove', heart_npc_id: 'npc_theo', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_theo', text: "Caretaker is a quiet job. Most of what I do, nobody sees.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_theo', text: "I'm OK with that. Some days I'm not.", duration_ms: 2800 }
  ]},
  { id: 'theo_h8', trigger: { room: 'room_grove', heart_npc_id: 'npc_theo', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_theo', text: "I want to leave the grove a forest, not a garden, when I'm done.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_theo', text: "Help me plan the next ten years?", duration_ms: 2800 }
  ]},
  { id: 'theo_h10', trigger: { room: 'room_grove', heart_npc_id: 'npc_theo', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_theo', text: "Sit by your oak.", duration_ms: 2000 },
    { type: 'camera_pan', x: 200, y: 144, duration_ms: 1800 },
    { type: 'say', npc_id: 'npc_theo', text: "Carved your initials below the bark. Won't show until the trunk widens.", duration_ms: 3600 },
    { type: 'say', npc_id: 'npc_theo', text: "Forty years from now someone will find them. They won't know who. We will.", duration_ms: 4000 }
  ]},

  // Kai (DJ floor headliner)
  { id: 'kai_h4', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_kai', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_kai', text: "Headphones came before the friends. Always have.", duration_ms: 3000 },
    { type: 'say', npc_id: 'npc_kai', text: "You ruined that pattern. Thanks for that.", duration_ms: 2800 }
  ]},
  { id: 'kai_h6', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_kai', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_kai', text: "I drink to play. Trying to quit. Both ends.", duration_ms: 3000 },
    { type: 'say', npc_id: 'npc_kai', text: "Hold me to it. Out loud. I need a witness.", duration_ms: 3000 }
  ]},
  { id: 'kai_h8', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_kai', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_kai', text: "Booked Berlin next month. First gig outside the lounge in six years.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_kai', text: "Come with. I'll cover your ticket.", duration_ms: 2600 }
  ]},
  { id: 'kai_h10', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_kai', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_kai', text: "🎧 Closing track tonight.", duration_ms: 2200 },
    { type: 'shake', duration_ms: 600, intensity: 0.012 },
    { type: 'say', npc_id: 'npc_kai', text: "It's called 'For the One Who Stayed'. Wrote it after you started showing up.", duration_ms: 3800 }
  ]},

  // Marin (writer in lobby)
  { id: 'marin_h4', trigger: { room: 'room_lobby', heart_npc_id: 'npc_marin', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_marin', text: "Wrote a story about you. Burned it. Wrote another.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_marin', text: "That one I kept. The protagonist is barely you. Sort of.", duration_ms: 3200 }
  ]},
  { id: 'marin_h6', trigger: { room: 'room_lobby', heart_npc_id: 'npc_marin', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_marin', text: "Got rejected by my dream press last week. Cried in the bathroom.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_marin', text: "Then I wrote 2,000 words out of spite. Best thing I've made.", duration_ms: 3400 }
  ]},
  { id: 'marin_h8', trigger: { room: 'room_lobby', heart_npc_id: 'npc_marin', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_marin', text: "Manuscript's done. I'm querying agents on Tuesday.", duration_ms: 3000 },
    { type: 'say', npc_id: 'npc_marin', text: "If it ever publishes, the dedication is one line. 'For you, who was here.'", duration_ms: 3800 }
  ]},
  { id: 'marin_h10', trigger: { room: 'room_lobby', heart_npc_id: 'npc_marin', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_marin', text: "Got the call. They want the book.", duration_ms: 2600 },
    { type: 'say', npc_id: 'npc_marin', text: "I told them I wasn't writing for them. I was writing for one person.", duration_ms: 3600 },
    { type: 'say', npc_id: 'npc_marin', text: "They said: keep the dedication.", duration_ms: 2600 }
  ]},

  // Cole (photographer)
  { id: 'cole_h4', trigger: { room: 'room_library', heart_npc_id: 'npc_cole', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_cole', text: "I shot weddings for ten years. Quit at the peak.", duration_ms: 3000 },
    { type: 'say', npc_id: 'npc_cole', text: "Strangers in suits. Beautiful, but I wasn't seeing anyone.", duration_ms: 3200 }
  ]},
  { id: 'cole_h6', trigger: { room: 'room_library', heart_npc_id: 'npc_cole', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_cole', text: "Lost the lens my father gave me. Three years ago. Still grieve it.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_cole', text: "His photos are how I remember his face now. That terrifies me a little.", duration_ms: 3600 }
  ]},
  { id: 'cole_h8', trigger: { room: 'room_library', heart_npc_id: 'npc_cole', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_cole', text: "Putting on a solo show next year. 'Lounge People.' You're in it.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_cole', text: "Front wall. Largest print. Don't argue.", duration_ms: 2800 }
  ]},
  { id: 'cole_h10', trigger: { room: 'room_library', heart_npc_id: 'npc_cole', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_cole', text: "Show opened last night. I want to give you a print.", duration_ms: 3000 },
    { type: 'camera_zoom', zoom: 1.1, duration_ms: 1200 },
    { type: 'say', npc_id: 'npc_cole', text: "Not of you. Of the chair you always pick. Empty. Lighting at 5pm.", duration_ms: 3800 },
    { type: 'say', npc_id: 'npc_cole', text: "It's how I missed you when you weren't here.", duration_ms: 3200 },
    { type: 'camera_zoom', zoom: 1.0, duration_ms: 1200 }
  ]},

  // Wren (reader / book-club host)
  { id: 'wren_h4', trigger: { room: 'room_library', heart_npc_id: 'npc_wren', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_wren', text: "Reading is the only place I'm patient. Don't ask my partner.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_wren', text: "We broke up last spring. Reading still works though.", duration_ms: 3000 }
  ]},
  { id: 'wren_h6', trigger: { room: 'room_library', heart_npc_id: 'npc_wren', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_wren', text: "I never finished college. Library is my degree.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_wren', text: "Some days that feels like a flex. Some days a wound.", duration_ms: 3200 }
  ]},
  { id: 'wren_h8', trigger: { room: 'room_library', heart_npc_id: 'npc_wren', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_wren', text: "Going back to school next fall. Comparative lit. Late but going.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_wren', text: "Will you read my application essay? Honestly?", duration_ms: 2800 }
  ]},
  { id: 'wren_h10', trigger: { room: 'room_library', heart_npc_id: 'npc_wren', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_wren', text: "Got in. Full scholarship.", duration_ms: 2400 },
    { type: 'say', npc_id: 'npc_wren', text: "Reading 'Earthsea' tonight to celebrate. Same chair. Same hour. Same friend.", duration_ms: 3800 },
    { type: 'say', npc_id: 'npc_wren', text: "Stay. Read with me.", duration_ms: 2200 }
  ]},

  // Dane (dancer)
  { id: 'dane_h4', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_dane', heart_min: 4 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_dane', text: "I dance because if I stop I think. Don't tell the wellness people.", duration_ms: 3400 },
    { type: 'say', npc_id: 'npc_dane', text: "It's worked for ten years. Don't fix what's working.", duration_ms: 3200 }
  ]},
  { id: 'dane_h6', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_dane', heart_min: 6 }, steps: [
    { type: 'wait', ms: 600 },
    { type: 'say', npc_id: 'npc_dane', text: "Knee surgery in spring. Six months no dancing. Terrifying.", duration_ms: 3200 },
    { type: 'say', npc_id: 'npc_dane', text: "Will you come visit during recovery? Bring bad music.", duration_ms: 3000 }
  ]},
  { id: 'dane_h8', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_dane', heart_min: 8 }, steps: [
    { type: 'wait', ms: 700 },
    { type: 'say', npc_id: 'npc_dane', text: "Teaching a class next month. Beginners. I'm so nervous.", duration_ms: 3000 },
    { type: 'say', npc_id: 'npc_dane', text: "Front row. Free seat. Just sit. Don't dance unless you want to.", duration_ms: 3400 }
  ]},
  { id: 'dane_h10', trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_dane', heart_min: 10 }, steps: [
    { type: 'wait', ms: 800 },
    { type: 'say', npc_id: 'npc_dane', text: "Track switching now. This one — I dance this one only with people I trust.", duration_ms: 3600 },
    { type: 'shake', duration_ms: 400, intensity: 0.006 },
    { type: 'say', npc_id: 'npc_dane', text: "Floor's empty. Just you and me. Come on.", duration_ms: 3000 }
  ]}
]

const STORAGE_KEY = 'lounge_cutscenes_v1'

type FiredMap = Record<string, number>  // cutscene_id → timestamp

function loadFired(): FiredMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as FiredMap : {}
  } catch { return {} }
}

function saveFired(map: FiredMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)) } catch {}
}

export function hasFired(cutsceneId: string): boolean {
  return !!loadFired()[cutsceneId]
}

export function markFired(cutsceneId: string) {
  const m = loadFired()
  m[cutsceneId] = Date.now()
  saveFired(m)
}

function parseHHMM(s: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s)
  if (!m) return NaN
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

/** Find the first cutscene whose trigger matches, that hasn't fired yet. */
import { getGameNow } from './gametime'
import { getNpcHeartLevel } from './npc_hearts'
export function findCutsceneForRoom(roomId: string, now: Date = getGameNow(), opts: {
  friendships?: Map<string, { level: number }>,
  activeEvent?: string | null
} = {}): CutsceneDef | null {
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (const c of CUTSCENES) {
    if (c.trigger.room && c.trigger.room !== roomId) continue
    if (c.trigger.time_min) {
      const t = parseHHMM(c.trigger.time_min)
      if (!isNaN(t) && minutes < t) continue
    }
    if (c.trigger.time_max) {
      const t = parseHHMM(c.trigger.time_max)
      if (!isNaN(t) && minutes > t) continue
    }
    if (c.trigger.event && c.trigger.event !== opts.activeEvent) continue
    if (c.trigger.heart_min !== undefined && c.trigger.heart_npc_id) {
      // V10.1 — NPC hearts come from per-NPC heart points (talking, gifting,
      // quest completion), not from player-↔-player friendships. Earlier
      // versions looked up the NPC id in opts.friendships which is keyed by
      // player visitor_id, so the gate never opened.
      const lv = getNpcHeartLevel(c.trigger.heart_npc_id)
      if (lv < c.trigger.heart_min) continue
    }
    // N5: bundle gate
    if (c.trigger.bundle) {
      try {
        const raw = localStorage.getItem('lounge_bundle_unlocks_v1') || '{}'
        const unlocks = JSON.parse(raw)
        if (!unlocks[c.trigger.bundle]) continue
      } catch { continue }
    }
    if (!c.replay && hasFired(c.id)) continue
    return c
  }
  return null
}
