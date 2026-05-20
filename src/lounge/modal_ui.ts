// V3.0-A.8 — Wooden modal helpers replacing native window.confirm / alert.
//
// Native browser dialogs break the cozy game aesthetic. This module
// provides showConfirm() + showAlert() that render in-keeping with the
// V23.34 toolbar + V3.0-A overlay styles (parchment fill, dark outline,
// drop shadow). All modals are dismissible by:
//   - Clicking the primary / secondary button
//   - Pressing Esc (resolves to false)
//   - Clicking the backdrop (resolves to false — match window.confirm
//     "click outside to cancel" expectation)

import { playSfx } from './audio'

export type ConfirmOptions = {
  title: string
  message?: string
  primaryLabel?: string    // default 'Confirm'
  secondaryLabel?: string  // default 'Cancel'
  danger?: boolean         // primary button styled red
}

/** Resolves true on primary click, false on cancel / esc / backdrop. */
export function showConfirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const root = buildModal({
      title: opts.title,
      message: opts.message,
      primaryLabel: opts.primaryLabel ?? 'Confirm',
      secondaryLabel: opts.secondaryLabel ?? 'Cancel',
      danger: !!opts.danger,
      onResolve: resolve,
    })
    document.body.appendChild(root)
    playSfx('menu_open')
    // Focus primary button so Enter confirms, Tab navigates
    setTimeout(() => root.querySelector<HTMLButtonElement>('.nk-modal-primary')?.focus(), 50)
  })
}

/** OK-only dialog. Resolves on dismiss. */
export function showAlert(message: string, title = 'Notice'): Promise<void> {
  return new Promise((resolve) => {
    const root = buildModal({
      title,
      message,
      primaryLabel: 'OK',
      secondaryLabel: null,
      danger: false,
      onResolve: () => resolve(),
    })
    document.body.appendChild(root)
    playSfx('menu_open')
    setTimeout(() => root.querySelector<HTMLButtonElement>('.nk-modal-primary')?.focus(), 50)
  })
}

function buildModal(o: {
  title: string
  message?: string
  primaryLabel: string
  secondaryLabel: string | null
  danger: boolean
  onResolve: (v: boolean) => void
}): HTMLElement {
  const root = document.createElement('div')
  root.className = 'auth-overlay nk-modal-root'
  root.style.zIndex = '500' // above other overlays

  const backdrop = document.createElement('div')
  backdrop.className = 'auth-backdrop'

  const card = document.createElement('div')
  card.className = 'auth-card auth-card-small'

  const title = document.createElement('h3')
  title.className = 'auth-title'
  title.textContent = o.title
  card.appendChild(title)

  if (o.message) {
    const blurb = document.createElement('p')
    blurb.className = 'auth-blurb'
    blurb.textContent = o.message
    card.appendChild(blurb)
  }

  const actions = document.createElement('div')
  actions.className = 'auth-actions'

  const primary = document.createElement('button')
  primary.type = 'button'
  primary.className = `auth-primary-btn nk-modal-primary ${o.danger ? 'auth-danger-btn' : ''}`
  primary.textContent = o.primaryLabel
  actions.appendChild(primary)

  let secondary: HTMLButtonElement | null = null
  if (o.secondaryLabel) {
    secondary = document.createElement('button')
    secondary.type = 'button'
    secondary.className = 'auth-secondary-btn'
    secondary.textContent = o.secondaryLabel
    actions.appendChild(secondary)
  }

  card.appendChild(actions)
  root.appendChild(backdrop)
  root.appendChild(card)

  // Wiring
  const close = (value: boolean) => {
    document.removeEventListener('keydown', onKey)
    root.remove()
    playSfx('menu_close')
    o.onResolve(value)
  }
  primary.addEventListener('click', () => close(true))
  secondary?.addEventListener('click', () => close(false))
  backdrop.addEventListener('click', () => close(false))

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(false) }
    else if (e.key === 'Enter' && document.activeElement === primary) {
      e.preventDefault(); close(true)
    }
  }
  document.addEventListener('keydown', onKey)

  return root
}
