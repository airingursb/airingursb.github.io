// V8.7 — Progress / "grandfather's evaluation"-style readout.
// Pulls from localStorage signals across all the systems built up to here.
// No score, no rank — just a snapshot of your time in the lounge.

import { QUESTS, getQuestState } from './quests'
import { FESTIVALS } from './festivals'
import { listMemories } from './memories'
import { getShells } from './shells'
import { listMail } from './mailbox'
import { getEnergy } from './energy'
import { getEquippedTool } from './memories'

export type ProgressMetric = {
  label: string
  value: string                  // human-readable
  ratio?: { have: number; need: number }
  hint?: string
}

export function buildProgress(opts: {
  pebblesCollected: number
  pebblesTotal: number
  friendships: Array<{ level: number; display_name?: string | null }>
  totalNpcs: number
}): { metrics: ProgressMetric[]; summary: string } {
  const memories = listMemories()
  const mail = listMail()
  const questsCompleted = QUESTS.filter(q => getQuestState(q.id).completed).length
  const questsAccepted  = QUESTS.filter(q => getQuestState(q.id).accepted).length
  const heartedNpcs     = opts.friendships.filter(f => f.level >= 2).length
  const friendsLv1Plus  = opts.friendships.filter(f => f.level >= 1).length

  const festivalsCount = FESTIVALS.length
  const festivalsAttended = (() => {
    // approximate from mail with kind 'festival'
    return mail.filter(m => m.kind === 'festival').length
  })()

  const metrics: ProgressMetric[] = [
    { label: 'Pebbles collected',
      value: `${opts.pebblesCollected} / ${opts.pebblesTotal}`,
      ratio: { have: opts.pebblesCollected, need: opts.pebblesTotal } },
    { label: 'NPCs at heart 2+',
      value: `${heartedNpcs} / ${opts.totalNpcs}`,
      ratio: { have: heartedNpcs, need: opts.totalNpcs },
      hint: 'Visit often, gift, sit together.' },
    { label: 'Friendships at lv 1+',
      value: `${friendsLv1Plus}`,
      hint: 'Counts NPCs and human visitors alike.' },
    { label: 'Quests completed',
      value: `${questsCompleted} / ${questsAccepted}` + (questsAccepted < QUESTS.length ? ` (${QUESTS.length - questsAccepted} not started)` : '') },
    { label: 'Festivals attended',
      value: `${festivalsAttended} / ${festivalsCount}` + (festivalsAttended === 0 ? ' (this year)' : ''),
      hint: 'Each festival fires once a year.' },
    { label: 'Memories captured',
      value: `${memories.length} / 36`,
      hint: 'Equip 📷 and click any moment.' },
    { label: 'Shells balance',
      value: `🐚 ${getShells()}`,
      hint: 'Spent at Mio\'s Shop.' },
    { label: 'Mailbox',
      value: `${mail.length} letters (${mail.filter(m => !m.read).length} unread)` },
    { label: 'Energy right now',
      value: `${getEnergy()} / 100` },
    { label: 'Current tool',
      value: getEquippedTool() === 'camera' ? '📷 Camera' : '— none —' }
  ]

  const summary = buildSummaryLine(opts, heartedNpcs, memories.length, questsCompleted)
  return { metrics, summary }
}

function buildSummaryLine(
  opts: { pebblesCollected: number; pebblesTotal: number; friendships: Array<{ level: number }>; totalNpcs: number },
  hearted: number, memCount: number, questsDone: number
): string {
  const lines: string[] = []
  if (opts.pebblesCollected === opts.pebblesTotal && opts.pebblesTotal > 0) {
    lines.push('Every pebble found.')
  } else if (opts.pebblesCollected > opts.pebblesTotal / 2) {
    lines.push('Most of the pebbles are home with you.')
  } else if (opts.pebblesCollected > 0) {
    lines.push('You\'ve started a collection.')
  }
  if (hearted >= opts.totalNpcs / 2) lines.push('The regulars know your name.')
  else if (hearted > 0) lines.push('A few NPCs warm up when you walk in.')
  if (memCount >= 12) lines.push('Your camera is well-used.')
  if (questsDone >= 3) lines.push('You finish what you start.')
  if (lines.length === 0) return 'Welcome — your story is just beginning.'
  return lines.join(' ')
}
