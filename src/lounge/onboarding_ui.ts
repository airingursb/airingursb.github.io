// V11.2 — Onboarding overlay renderer.
//
// Single fixed overlay with a CSS spotlight (radial cutout via box-shadow)
// + a positioned tooltip card. Step navigation with Next/Skip; ESC closes.

import { ONBOARDING_STEPS, isDone, markDone } from './onboarding'

let overlayEl: HTMLElement | null = null
let spotlightEl: HTMLElement | null = null
let tooltipEl: HTMLElement | null = null
let titleEl: HTMLElement | null = null
let bodyEl: HTMLElement | null = null
let counterEl: HTMLElement | null = null
let nextBtnEl: HTMLButtonElement | null = null
let skipBtnEl: HTMLButtonElement | null = null
let currentIdx = 0

function ensure(): boolean {
  if (overlayEl) return true
  overlayEl    = document.getElementById('lounge-onboarding')
  spotlightEl  = document.getElementById('lounge-onboarding-spotlight')
  tooltipEl    = document.getElementById('lounge-onboarding-tooltip')
  titleEl      = document.getElementById('lounge-onboarding-title')
  bodyEl       = document.getElementById('lounge-onboarding-body')
  counterEl    = document.getElementById('lounge-onboarding-counter')
  nextBtnEl    = document.getElementById('lounge-onboarding-next') as HTMLButtonElement | null
  skipBtnEl    = document.getElementById('lounge-onboarding-skip') as HTMLButtonElement | null
  if (!overlayEl || !tooltipEl) return false
  nextBtnEl?.addEventListener('click', () => advance())
  skipBtnEl?.addEventListener('click', () => finish())
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayEl && !overlayEl.hidden) finish()
  })
  return true
}

export function maybeStartTour() {
  if (isDone()) return
  // Wait until the player has dismissed the species-picker + name modal.
  // Poll every 500ms and start once both are hidden (or absent).
  const poll = () => {
    if (isDone()) return
    const name = document.getElementById('lounge-name-modal')
    const picker = document.getElementById('lounge-species-picker')
    const blocking = (name && !name.hidden) || (picker && !picker.hidden)
    if (blocking) return setTimeout(poll, 500)
    setTimeout(() => { if (!isDone()) startTour() }, 800)
  }
  setTimeout(poll, 1500)
}

export function startTour() {
  if (!ensure() || !overlayEl) return
  currentIdx = 0
  overlayEl.hidden = false
  renderStep()
}

function advance() {
  currentIdx++
  if (currentIdx >= ONBOARDING_STEPS.length) finish()
  else renderStep()
}

function finish() {
  if (!overlayEl) return
  overlayEl.hidden = true
  markDone()
}

function renderStep() {
  if (!tooltipEl || !titleEl || !bodyEl || !counterEl || !spotlightEl) return
  const step = ONBOARDING_STEPS[currentIdx]
  titleEl.textContent = step.title
  bodyEl.textContent = step.body
  counterEl.textContent = `${currentIdx + 1} / ${ONBOARDING_STEPS.length}`
  if (nextBtnEl) nextBtnEl.textContent = currentIdx === ONBOARDING_STEPS.length - 1 ? 'Done' : 'Next →'

  // Resolve the target rect; null target = no spotlight, tooltip centered
  let rect: DOMRect | null = null
  if (step.target) {
    const el = document.querySelector(step.target)
    if (el) rect = (el as HTMLElement).getBoundingClientRect()
  }
  if (!rect) {
    spotlightEl.style.display = 'none'
    tooltipEl.style.left = '50%'
    tooltipEl.style.top = '50%'
    tooltipEl.style.transform = 'translate(-50%, -50%)'
    return
  }
  // Position spotlight (slight padding around target)
  const pad = 8
  spotlightEl.style.display = 'block'
  spotlightEl.style.left = `${rect.left - pad}px`
  spotlightEl.style.top = `${rect.top - pad}px`
  spotlightEl.style.width = `${rect.width + pad * 2}px`
  spotlightEl.style.height = `${rect.height + pad * 2}px`
  // Position tooltip around the rect by placement preference
  positionTooltip(rect, step.placement)
}

function positionTooltip(rect: DOMRect, placement: 'top'|'bottom'|'left'|'right'|'center') {
  if (!tooltipEl) return
  const t = tooltipEl
  t.style.transform = 'none'
  const tw = 280, th = 140  // approximate, used for off-screen guards
  const vw = window.innerWidth, vh = window.innerHeight
  let left = 16, top = 16
  switch (placement) {
    case 'bottom':
      left = Math.max(16, Math.min(vw - tw - 16, rect.left + rect.width / 2 - tw / 2))
      top  = Math.min(vh - th - 16, rect.bottom + 16)
      break
    case 'top':
      left = Math.max(16, Math.min(vw - tw - 16, rect.left + rect.width / 2 - tw / 2))
      top  = Math.max(16, rect.top - th - 16)
      break
    case 'right':
      left = Math.min(vw - tw - 16, rect.right + 16)
      top  = Math.max(16, Math.min(vh - th - 16, rect.top + rect.height / 2 - th / 2))
      break
    case 'left':
      left = Math.max(16, rect.left - tw - 16)
      top  = Math.max(16, Math.min(vh - th - 16, rect.top + rect.height / 2 - th / 2))
      break
    case 'center':
      left = vw / 2 - tw / 2
      top  = vh / 2 - th / 2
      break
  }
  t.style.left = `${left}px`
  t.style.top  = `${top}px`
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ensure())
  } else {
    ensure()
  }
}
