import { getOrCreateVisitorId } from './config'

const STORAGE_KEY_NAME = 'lounge_display_name'
const STORAGE_KEY_PROMPTED = 'lounge_name_prompted'

export type Identity = {
  visitor_id: string
  display_name: string | null
}

export function getIdentity(): Identity {
  let display_name: string | null = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAME)
    if (raw != null && raw !== '') display_name = raw
  } catch {}
  return {
    visitor_id: getOrCreateVisitorId(),
    display_name
  }
}

export function setLocalDisplayName(name: string | null): void {
  try {
    if (name == null || name === '') localStorage.removeItem(STORAGE_KEY_NAME)
    else localStorage.setItem(STORAGE_KEY_NAME, name)
  } catch {}
}

/** True if the user has never seen the first-visit name modal. */
export function isFirstVisit(): boolean {
  try { return localStorage.getItem(STORAGE_KEY_PROMPTED) !== '1' }
  catch { return true }
}

export function markNameChoicePrompted(): void {
  try { localStorage.setItem(STORAGE_KEY_PROMPTED, '1') } catch {}
}
