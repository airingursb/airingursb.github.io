// V15.5 — Paired bubble exchanges between two co-present NPCs. Fires every
// 60-120s when there are ≥2 idle NPCs in the room, so the world feels
// populated even when no players are around.
//
// Most exchanges are generic (work for any pair of NPCs). A few are
// "ID-conditioned" — they only fire when both named NPCs are present —
// so iconic recurring duos (Mox + Halle, Iris + Sora) have flavor without
// needing N² pairwise scripting.
//
// Each exchange returns { a, b } — A says their line first, B replies ~2.5s
// later. The bubbles use the standard 'npc_'+id key so they replace cleanly
// if the player clicks one of them mid-exchange.

export type Exchange = {
  /** When defined, exchange only fires if both NPCs are present in any order */
  pair?: [string, string]
  a: string
  b: string
}

const GENERIC: Exchange[] = [
  { a: 'Long day, huh?',                          b: '*nods* Long week.' },
  { a: 'You see the sky earlier?',                b: 'Mm. Pink kind of pink.' },
  { a: 'Coffee?',                                 b: 'Already on my third.' },
  { a: 'Lobby\'s quiet today.',                   b: 'Quiet\'s nice. I like the quiet.' },
  { a: 'New face came through earlier.',          b: 'I waved. They waved back.' },
  { a: 'Forgot to eat lunch again.',              b: 'Same. The day eats the day.' },
  { a: 'You hear the rain last night?',           b: 'Slept right through it.' },
  { a: 'Pebble harvest looks good this week.',    b: 'Two glow ones already.' },
  { a: 'Did the kitchen run out of bread again?', b: 'Cole was muttering about it.' },
  { a: 'I should reorganize my corner.',          b: 'You said that last week.' },
  { a: 'Music\'s nice today.',                    b: 'Ren\'s been at it since dawn.' },
  { a: 'Saw a kid running through here earlier.', b: 'They\'re fast, those ones.' }
]

const SPECIFIC: Exchange[] = [
  // Mox + Halle — engineer vs. librarian
  { pair: ['npc_mox', 'npc_halle'], a: 'I broke a thing today.', b: 'You break a thing every day.' },
  { pair: ['npc_mox', 'npc_halle'], a: 'You have a book about brass?', b: 'I have books about everything.' },
  // Iris + Sora — gardener vs. astronomer
  { pair: ['npc_iris', 'npc_sora'], a: 'Moonflower\'s opening tonight.', b: 'Good — there\'s a meteor shower at 11.' },
  { pair: ['npc_iris', 'npc_sora'], a: 'Plants like the new moon better.', b: 'So do telescopes. We\'re aligned.' },
  // Cole + Mio — cook vs. fisher
  { pair: ['npc_cole', 'npc_mio'], a: 'Bring me anything good today?', b: 'Two squid. Big ones. Stew weather.' },
  { pair: ['npc_cole', 'npc_mio'], a: 'I need salt.', b: 'Always. Salt-bag\'s by the back door.' },
  // Marin + Ren — guitarist vs. DJ
  { pair: ['npc_marin', 'npc_ren'], a: 'You ever mix in a live string section?', b: 'Once. The crowd cried. I think in a good way.' },
  { pair: ['npc_marin', 'npc_ren'], a: 'My guitar\'s out of tune again.', b: 'My turntable\'s out of beat. We\'re a band.' },
  // Theo + Wren — writer vs. illustrator
  { pair: ['npc_theo', 'npc_wren'], a: 'Need an illustration for chapter three.', b: 'Two crows or one fox?' },
  { pair: ['npc_theo', 'npc_wren'], a: 'You drew me holding a pen yesterday.', b: 'You\'re always holding a pen.' },
  // Kai + Pip — fitness vs. trickster
  { pair: ['npc_kai', 'npc_pip'], a: 'You should lift sometime.', b: 'I\'m lifting your wallet right now. Different muscles.' }
]

export function pickExchange(idsPresent: string[]): Exchange | null {
  if (idsPresent.length < 2) return null
  // 50% of the time try a specific pair if any apply
  if (Math.random() < 0.5) {
    const eligible = SPECIFIC.filter(e =>
      e.pair && idsPresent.includes(e.pair[0]) && idsPresent.includes(e.pair[1])
    )
    if (eligible.length > 0) return eligible[Math.floor(Math.random() * eligible.length)]
  }
  return GENERIC[Math.floor(Math.random() * GENERIC.length)]
}

/** Caller picks two distinct ids from present NPCs. If a SPECIFIC exchange
 *  was picked, the caller should use the pair's order (a → b). Otherwise
 *  the caller just picks any two present NPCs. */
export function pickPairFromPresent(idsPresent: string[], exchange: Exchange): [string, string] | null {
  if (exchange.pair) return exchange.pair
  if (idsPresent.length < 2) return null
  const shuffled = [...idsPresent].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1]]
}
