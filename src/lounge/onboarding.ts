// V11.2 — First-visit onboarding tour. 5 interactive tooltips that highlight
// the key affordances new players miss. Skippable, fires once per visitor
// (gated by lounge_onboarding_done_v1), survives progress-sync.

const DONE_KEY = 'lounge_onboarding_done_v1'

export type OnboardingStep = {
  /** Selector to highlight; null = no spotlight (full-screen welcome). */
  target: string | null
  title: string
  body: string
  /** Where the tooltip sits relative to the spotlighted element. */
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: null,
    title: 'Welcome to the lounge ☕',
    body: 'A small persistent place where the people online right now are hanging out. Quick tour?',
    placement: 'center'
  },
  {
    target: '#lounge-mount',
    title: 'Walk around',
    body: 'On desktop: WASD or arrow keys. On phone: the D-pad in the bottom-left. Tap doors to travel between rooms.',
    placement: 'center'
  },
  {
    target: '.ui-info-btn',
    title: 'Action buttons',
    // V11.9c — wording works for both desktop (top-right) and mobile
    // (bottom strip). Spotlight calc auto-flips placement on mobile.
    body: 'ⓘ profile · 📦 inventory · ✉ messages · 🐾 pet · 🏆 achievements · 🖼 photos · 🎮 games.',
    placement: 'bottom'
  },
  {
    target: '#lounge-minimap',
    title: 'World map',
    body: 'Green dot = you. Yellow dots = NPCs in that room. Tap a room name to know who lives where.',
    placement: 'top'
  },
  {
    target: '#lounge-messages-btn',
    title: 'Mailbox',
    body: 'NPC letters, festival invites, and (new!) friend-online notifications land here. Check it often.',
    placement: 'bottom'
  }
]

export function isDone(): boolean {
  try { return localStorage.getItem(DONE_KEY) === '1' } catch { return false }
}
export function markDone() {
  try { localStorage.setItem(DONE_KEY, '1') } catch {}
}
/** Force the tour to replay (info-panel option, useful for QA). */
export function reset() {
  try { localStorage.removeItem(DONE_KEY) } catch {}
}
