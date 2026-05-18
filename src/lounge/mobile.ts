// V11.0 — Mobile / touch device detection.
//
// Single source of truth: media-query check for coarse pointer + small width.
// Other modules import isTouchDevice() / isNarrowViewport(); UI then opts in
// (e.g. RoomScene renders the D-pad only when isTouchDevice()).
//
// Why both: a tablet has coarse pointer + wide viewport (use touch controls
// but full panel widths); a desktop with touchscreen has both pointer kinds
// (we treat as desktop unless coarse is the primary).

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

export function isNarrowViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 600
}

/** True when both: phone-sized AND coarse pointer. Used for hardcore mobile
 *  adaptations like the on-screen D-pad. */
export function isMobile(): boolean {
  return isTouchDevice() && isNarrowViewport()
}

/** Subscribe to viewport-resize so callers can re-render adaptive UI. */
export function onViewportChange(fn: () => void): () => void {
  const mq = window.matchMedia('(max-width: 600px)')
  const handler = () => fn()
  mq.addEventListener?.('change', handler)
  window.addEventListener('resize', handler, { passive: true })
  window.addEventListener('orientationchange', handler, { passive: true })
  return () => {
    mq.removeEventListener?.('change', handler)
    window.removeEventListener('resize', handler)
    window.removeEventListener('orientationchange', handler)
  }
}
