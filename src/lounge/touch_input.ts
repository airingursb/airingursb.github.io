// V11.1 — On-screen D-pad + action button input state.
//
// The D-pad sets four direction booleans that RoomScene.applyKeyboard OR-s
// with the keyboard cursor state. The action button latches a single-tap
// flag that the scene reads + consumes once per tap (so holding doesn't
// machine-gun interact prompts).

export const touchInput = {
  left: false,
  right: false,
  up: false,
  down: false
}

let actionPending = false

/** Returns true exactly once per tap (consumes the latch). */
export function consumeActionTap(): boolean {
  if (actionPending) { actionPending = false; return true }
  return false
}

let bound = false

export function initTouchInput() {
  if (bound) return
  bound = true
  const bindDir = (id: string, dir: 'left' | 'right' | 'up' | 'down') => {
    const el = document.getElementById(id)
    if (!el) return
    const set = (v: boolean) => () => { touchInput[dir] = v }
    // pointerdown + touch-cancel for safety
    el.addEventListener('pointerdown', set(true))
    el.addEventListener('pointerup', set(false))
    el.addEventListener('pointercancel', set(false))
    el.addEventListener('pointerleave', set(false))
    // Suppress 300ms tap delay + double-tap zoom on iOS
    el.addEventListener('touchstart', (e) => { e.preventDefault(); set(true)() }, { passive: false })
    el.addEventListener('touchend', (e) => { e.preventDefault(); set(false)() }, { passive: false })
  }
  bindDir('lounge-dpad-left',  'left')
  bindDir('lounge-dpad-right', 'right')
  bindDir('lounge-dpad-up',    'up')
  bindDir('lounge-dpad-down',  'down')

  const action = document.getElementById('lounge-action-btn')
  if (action) {
    const fire = (e: Event) => { e.preventDefault(); actionPending = true }
    action.addEventListener('pointerdown', fire)
    action.addEventListener('touchstart', fire, { passive: false })
  }
}
