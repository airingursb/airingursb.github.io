// V11.6 — Stir-fry Timing mini-game.
//
// V11.8-review C2 fix: rewritten as a single state machine because the
// earlier addEventListener + .onclick-mutation pattern collided after
// attempt 1 and the player got stuck mid-sweep.
//
// A horizontal bar fills left→right and bounces back. Player clicks Stop
// to lock the marker. Score 0-200 based on distance from the green zone
// center. Two attempts → best wins.

type CookState = 'sweep' | 'between' | 'done'

export function runCook(stage: HTMLElement, onFinish: (score: number) => void) {
  stage.innerHTML = `
    <div class="mg-cook-meta">Stop inside the green zone. Closer to center = higher score.</div>
    <div class="mg-cook-bar">
      <div class="mg-cook-zone" id="mg-cook-zone"></div>
      <div class="mg-cook-marker" id="mg-cook-marker"></div>
    </div>
    <div class="mg-cook-stats">Attempts left: <span id="mg-cook-left">2</span> · best: <strong id="mg-cook-best">0</strong></div>
    <button type="button" id="mg-cook-stop" class="mg-primary">Stop ⏹</button>
  `

  const zone = stage.querySelector('#mg-cook-zone') as HTMLElement
  const marker = stage.querySelector('#mg-cook-marker') as HTMLElement
  const leftEl = stage.querySelector('#mg-cook-left') as HTMLElement
  const bestEl = stage.querySelector('#mg-cook-best') as HTMLElement
  const stopBtn = stage.querySelector('#mg-cook-stop') as HTMLButtonElement

  let zoneCenter = 30 + Math.random() * 40
  const zoneHalf = 10
  const placeZone = () => {
    zone.style.left = (zoneCenter - zoneHalf) + '%'
    zone.style.width = (zoneHalf * 2) + '%'
  }
  placeZone()

  let attempts = 2
  let bestScore = 0
  let raf = 0
  let pos = 0
  let dir = 1
  let state: CookState = 'sweep'
  const SPEED = 0.012

  function tick() {
    if (state !== 'sweep') return
    pos += dir * SPEED
    if (pos > 1) { pos = 1; dir = -1 }
    if (pos < 0) { pos = 0; dir =  1 }
    marker.style.left = (pos * 100) + '%'
    raf = requestAnimationFrame(tick)
  }
  tick()

  // Single handler that branches by state — no .onclick mutation, no
  // listener stacking, no leftover scoring after attempts exhausted.
  stopBtn.addEventListener('click', () => {
    if (state === 'sweep') {
      state = 'between'
      cancelAnimationFrame(raf)
      const dist = Math.abs(pos * 100 - zoneCenter)
      let score = 0
      if (dist <= zoneHalf) score = Math.round(200 * (1 - dist / zoneHalf))
      if (score > bestScore) { bestScore = score; bestEl.textContent = String(bestScore) }
      attempts--
      leftEl.textContent = String(attempts)
      if (attempts > 0) { stopBtn.textContent = 'Try again' }
      else { state = 'done'; stopBtn.textContent = 'Finish' }
    } else if (state === 'between') {
      zoneCenter = 30 + Math.random() * 40
      placeZone()
      state = 'sweep'
      stopBtn.textContent = 'Stop ⏹'
      tick()
    } else if (state === 'done') {
      onFinish(bestScore)
    }
  })
}
